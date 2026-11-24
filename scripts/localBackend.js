// Release C (design/day/DAY.md): runs a verification script against the LOCAL Supabase stack (supabase start, on
// Colima) instead of the production project, without changing the app or the script. Loaded with
//   VOX_BACKEND=local NODE_OPTIONS="--require <repo>/scripts/localBackend.js" node scripts/…
// (scripts/day-verify/checksC.sh does this for every step). It:
//   1. reads the local stack's URL and publishable key from `supabase status` (and refuses to run if the stack is down,
//      so a script never falls back to production silently);
//   2. patches playwright's chromium.launch so every browser context sends the production project's requests
//      (https://<ref>.supabase.co/…: auth, REST, the api Edge Function) to the local stack, with the production
//      publishable key swapped for the local one; any other *.supabase.co request is aborted;
//   3. patches Node's fetch the same way (scripts that call the api directly: live.js, protected-columns.js);
//   4. tells testAccounts.js to query the local database (`db query --local`), so sign-up clean-up and SQL checks run
//      there too.
//   5. (release H2) puts a proxy in front of the local stack that slows and shuffles its answers, so races show up
//      here before production: every answer is held a random 200–1500 ms after the stack has answered (the stack does
//      the work at once; only the delivery waits), and about one answer in four, when another request is out, waits
//      for the next answer and is delivered right after it (two answers swapped). On by default; VOX_SLOW=0 turns it
//      off. VOX_SLOW_SEED=<n> repeats a run's draws (each run prints its seed). CORS preflights (OPTIONS) go straight.
// Nothing here can reach production: requests for it are rewritten or aborted.
'use strict';
if (process.env.VOX_BACKEND === 'local' && !global.__voxLocalBackend) {
  global.__voxLocalBackend = true;
  const path = require('path'), { execFileSync } = require('child_process');
  const ROOT = path.resolve(__dirname, '..');
  const PROD = 'https://ccharikhpeqtzpobarxi.supabase.co', PROD_KEY = 'sb_publishable_hHDLaxAN4e9Yxg1jCfq8NA_V5WuBBwn';
  const cliBin = () => {
    for (const suffix of [`${process.platform}-${process.arch}`, `${process.platform}-${process.arch}-musl`]) {
      try { return path.join(path.dirname(require.resolve(`@supabase/cli-${suffix}/package.json`, { paths: [ROOT] })), 'bin', 'supabase'); } catch {}
    }
    throw new Error('localBackend: the supabase CLI binary was not found');
  };
  let st;
  try {
    st = process.env.VOX_LOCAL_STATUS ? JSON.parse(process.env.VOX_LOCAL_STATUS)
      // the CLI binary itself, with NODE_OPTIONS cleared: through npx (a node process) this file would load again
      : JSON.parse(execFileSync(cliBin(), ['status', '-o', 'json'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'],
          env: { ...process.env, NODE_OPTIONS: '' }, timeout: 30000 }));
  } catch (e) { throw new Error('VOX_BACKEND=local but the local Supabase stack is not running (supabase start): refusing to run'); }
  process.env.VOX_LOCAL_STATUS = JSON.stringify({ API_URL: st.API_URL, PUBLISHABLE_KEY: st.PUBLISHABLE_KEY, ANON_KEY: st.ANON_KEY });
  const STACK = st.API_URL.replace(/\/$/, ''), KEY = st.PUBLISHABLE_KEY || st.ANON_KEY;
  // 5. the slow, shuffled proxy (started on the first request; its port is this process's own)
  const SLOW = process.env.VOX_SLOW !== '0';
  let LOCAL = STACK, proxyReady = null;
  const startProxy = () => proxyReady || (proxyReady = new Promise((resolve, reject) => {
    const http = require('http');
    let seed = Number(process.env.VOX_SLOW_SEED) || (Date.now() % 2147483647) || 1;
    console.error(`[localBackend] slow, shuffled answers: 200–1500 ms, swaps; VOX_SLOW_SEED=${seed} (VOX_SLOW=0: off)`);
    const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
    const target = new URL(STACK);
    let out = 0, waiting = 0, held = null; // requests the stack hasn't answered yet; answers in their delay; the answer waiting to be swapped behind the next
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        const fwd = http.request({ host: target.hostname, port: target.port, method: req.method, path: req.url,
          headers: { ...req.headers, host: target.host } }, up => {
          const body = [];
          up.on('data', c => body.push(c));
          up.on('end', () => {
            out--;
            const deliver = () => { if (res.writableEnded) return; res.writeHead(up.statusCode, up.headers); res.end(Buffer.concat(body)); };
            if (req.method === 'OPTIONS') return deliver();
            waiting++;
            setTimeout(() => {
              waiting--;
              if (held) { const h = held; held = null; clearTimeout(h.timer); deliver(); h.deliver(); return; } // swapped: this one first
              if (out + waiting > 0 && rnd() < 0.25) { held = { deliver, timer: setTimeout(() => { if (held && held.deliver === deliver) held = null; deliver(); }, 1500) }; return; }
              deliver();
            }, 200 + Math.round(rnd() * 1300));
          });
        });
        fwd.on('error', e => { out--; if (!res.headersSent) { res.writeHead(502); res.end(String(e.message)); } });
        out++; fwd.end(Buffer.concat(chunks));
      });
    });
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => { server.unref(); LOCAL = `http://127.0.0.1:${server.address().port}`; resolve(LOCAL); });
  }));
  const ready = () => SLOW ? startProxy() : Promise.resolve(LOCAL);
  const swap = v => typeof v === 'string' ? v.split(PROD_KEY).join(KEY) : v;
  const swapHeaders = h => { const o = {}; for (const [k, v] of Object.entries(h || {})) o[k] = swap(v); return o; };
  module.exports = { get LOCAL() { return LOCAL; }, STACK, KEY, PROD, ready };

  // 2. the browser. Three layers, so a script's own route handlers can't send a request to production either:
  //   a. the context's own route (registered first, so it is the last handler): production → the local stack
  //   b. every route handler a script registers (context or page) is wrapped so Route.continue() on a *.supabase.co URL
  //      becomes fallback() (it reaches a), and Route.fetch() on one goes to the local stack
  //   c. the browser resolves the production host to 127.0.0.1:9 (nothing listens): a request that escaped a and b
  //      fails instead of leaving the machine
  const SUPA = /^https:\/\/[a-z0-9-]+\.supabase\.co\//;
  const toLocal = u => { if (!u.startsWith(PROD + '/')) throw new Error('localBackend: blocked ' + u); return LOCAL + u.slice(PROD.length); };
  const patchRoute = route => {
    const P = Object.getPrototypeOf(route); if (P.__voxLocal) return; P.__voxLocal = true;
    const cont = P.continue, fetch_ = P.fetch;
    P.continue = function (o = {}) { return SUPA.test(o.url || this.request().url()) ? this.fallback(o) : cont.call(this, o); };
    P.fetch = async function (o = {}) {
      const u = o.url || this.request().url();
      if (!SUPA.test(u)) return fetch_.call(this, o);
      await ready();
      return fetch_.call(this, { ...o, url: toLocal(u), headers: swapHeaders(o.headers || this.request().headers()) });
    };
  };
  const wrapRoute = target => {
    const route = target.route.bind(target);
    target.route = (url, handler, opts) => route(url, (r, req) => { patchRoute(r); return handler(r, req); }, opts);
  };
  const pw = require(require.resolve('playwright', { paths: [ROOT] }));
  if (!pw.chromium.__voxLocal) {
    const launch = pw.chromium.launch.bind(pw.chromium);
    pw.chromium.launch = async (opts = {}, ...rest) => {
      const host = new URL(PROD).host;
      const b = await launch({ ...opts, args: [...(opts.args || []), `--host-resolver-rules=MAP ${host} 127.0.0.1:9`] }, ...rest);
      const newContext = b.newContext.bind(b);
      b.newContext = async (...o) => {
        const c = await newContext(...o);
        await c.route(SUPA, async r => {
          patchRoute(r);
          const u = r.request().url();
          if (!u.startsWith(PROD + '/')) return r.abort();
          try {
            await ready();
            const resp = await r.fetch({ url: toLocal(u), headers: swapHeaders(r.request().headers()) });
            await r.fulfill({ response: resp });
          } catch (e) { await r.abort().catch(() => {}); }
        });
        wrapRoute(c);
        const newPage = c.newPage.bind(c);
        c.newPage = async (...a) => { const p = await newPage(...a); wrapRoute(p); return p; };
        return c;
      };
      b.newPage = async (...o) => { const c = await b.newContext(...o); const p = await c.newPage(); p.on('close', () => c.close().catch(() => {})); return p; };
      return b;
    };
    pw.chromium.__voxLocal = true;
  }

  // 3. Node's fetch
  if (typeof globalThis.fetch === 'function') {
    const f = globalThis.fetch;
    globalThis.fetch = (input, init = {}) => {
      let url = typeof input === 'string' ? input : input && input.url;
      if (url && /^https:\/\/[a-z0-9-]+\.supabase\.co\//.test(url)) {
        if (!url.startsWith(PROD + '/')) return Promise.reject(new Error('localBackend: blocked ' + url));
        const h = init.headers instanceof Headers ? Object.fromEntries(init.headers) : init.headers;
        return ready().then(L => f(L + url.slice(PROD.length), { ...init, headers: swapHeaders(h) }));
      }
      return f(input, init);
    };
  }
}
