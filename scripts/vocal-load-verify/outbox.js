// Scoring batch release A, A1 (SCORING_SURVEY.md R1): the vocal-load outbox.
// Part 1, the outbox on its own (deploy/vocal-load-store.js createOutbox), on a fake clock, fake timers and a shared fake
// storage: the back-off (2, 5, 15, 60 s, then every 5 min, each ±20 %), a network error, a 5xx, a 429 and a 401 retried,
// any other 4xx dropped, one send in flight per session (a newer payload goes once the first is answered), two tabs on one storage
// sending a session once, the 35 h drop, the gauge's pending load net of what the server confirmed, storage that throws.
// Part 2, the app (local build, production backend, a throwaway account deleted at exit): a session sung through the
// app's own load feed (vlFeed, 4 s of a C4 frame), ended by the idle timer, its end PUT failing:
//   a. with a 503: kept on the device, the gauge still counts it, retried, and stored once the server answers again
//   b. with the request aborted (no response): the same
//   c. a reload with an entry still waiting (the page closed while the server was failing): sent on sign-in
//   d. two tabs opened at once with an entry waiting: the session is stored once, both outboxes end empty
//   e. an entry whose session started 36 h ago: dropped on load, never sent, logged
// Usage: node scripts/vocal-load-verify/outbox.js [--only unit|app]
require('../runguard').auto();
const St = require('../../deploy/vocal-load-store.js');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = arg('--only');
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail !== undefined ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };

// ---------------- part 1
function rig({ storageThrows = false } = {}) {
  const w = { now: Date.parse('2026-11-15T10:00:00Z'), timers: [], store: {} };
  w.storage = storageThrows ? { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); }, removeItem() { throw new Error('denied'); } }
    : { getItem: k => (k in w.store ? w.store[k] : null), setItem: (k, v) => { w.store[k] = String(v); }, removeItem: k => { delete w.store[k]; } };
  w.setTimer = (fn, ms) => { const t = { at: w.now + ms, fn, ms, id: Math.random() }; w.timers.push(t); return t; };
  w.clearTimer = t => { w.timers = w.timers.filter(x => x !== t); };
  w.advance = async ms => { // run due timers in order, letting promises settle between
    const end = w.now + ms;
    for (;;) { w.timers.sort((a, b) => a.at - b.at); const t = w.timers[0]; if (!t || t.at > end) break; w.timers.shift(); w.now = t.at; t.fn(); await settle(); }
    w.now = end; await settle();
  };
  return w;
}
const settle = () => new Promise(r => setImmediate(r));
const payload = (o = {}) => ({ sessionId: '10000000-0000-4000-8000-000000000001', day: '2026-11-15', startedAt: '2026-11-15T09:59:00.000Z',
  activeSeconds: 10, load: 20, medianRms: 0.05, p5Midi: 58, p95Midi: 62, ended: false, ...o });
const err = status => { const e = new Error('x ' + status); if (status !== undefined) e.status = status; return e; };

async function unit() {
  console.log('\n== part 1: the outbox on its own');
  { // back-off schedule on a server answering 503
    const w = rig(), sends = [], logs = [];
    const box = St.createOutbox({ storage: w.storage, key: 'k', send: p => { sends.push(w.now); return Promise.reject(err(503)); }, nowMs: () => w.now, random: () => 0.5,
      setTimer: w.setTimer, clearTimer: w.clearTimer, log: (...a) => logs.push(a.join(' ')) });
    box.put(payload({ ended: true })); await settle();
    await w.advance(2 * 3600 * 1000);
    const gaps = sends.slice(1).map((t, i) => t - sends[i]);
    check('503: retried at 2, 5, 15, 60 s, then every 5 min (jitter 0 at random 0.5)', JSON.stringify(gaps.slice(0, 6)) === JSON.stringify([2000, 5000, 15000, 60000, 300000, 300000]), gaps.slice(0, 6).join(', ') + ' ms');
    check('503: still kept on the device after 2 h of failures', box.size() === 1 && !!JSON.parse(w.store.k).entries[payload().sessionId], `${box.size()} entry`);
  }
  { // jitter bounds
    const w = rig(), sends = []; let r = 0; const rs = [0, 0.999999, 0, 0.999999, 0, 0.999999];
    const box = St.createOutbox({ storage: w.storage, key: 'k', send: () => { sends.push(w.now); return Promise.reject(err()); }, nowMs: () => w.now, random: () => rs[r++ % rs.length],
      setTimer: w.setTimer, clearTimer: w.clearTimer });
    box.put(payload()); await settle(); await w.advance(30 * 60000);
    const gaps = sends.slice(1).map((t, i) => t - sends[i]), want = [1600, 6000, 12000, 72000, 240000, 360000];
    check('a network error (no status): retried, jitter within ±20 % (1.6, 6, 12, 72, 240, 360 s at the extremes)', gaps.slice(0, 6).every((g, i) => Math.abs(g - want[i]) <= 1), gaps.slice(0, 6).join(', '));
  }
  for (const [st, retried] of [[429, true], [500, true], [401, true], [400, false], [403, false], [422, false]]) {
    const w = rig(), logs = []; let n = 0;
    const box = St.createOutbox({ storage: w.storage, key: 'k', send: () => { n++; return Promise.reject(err(st)); }, nowMs: () => w.now, random: () => 0.5,
      setTimer: w.setTimer, clearTimer: w.clearTimer, log: (...a) => logs.push(a.join(' ')) });
    box.put(payload()); await settle(); await w.advance(60000);
    check(`${st}: ${retried ? 'retried, kept' : 'a refused payload: dropped, logged, not retried'}`, retried ? n > 1 && box.size() === 1 : n === 1 && box.size() === 0 && logs.some(l => /refused/.test(l)), `${n} send(s), ${box.size()} kept`);
  }
  { // one in flight; a newer payload goes after the first is answered; the entry is removed only when its latest is confirmed
    const w = rig(), sent = []; let release;
    const box = St.createOutbox({ storage: w.storage, key: 'k', send: p => { sent.push(p.activeSeconds); return new Promise(r => { release = r; }); }, nowMs: () => w.now,
      setTimer: w.setTimer, clearTimer: w.clearTimer });
    box.put(payload({ activeSeconds: 10, load: 20 })); await settle();
    box.put(payload({ activeSeconds: 20, load: 40 })); box.put(payload({ activeSeconds: 30, load: 60, ended: true })); await settle();
    check('one send in flight per session: three puts while the first is out, one send', sent.length === 1, `sent ${sent.join(', ')}`);
    release(); await settle(); await settle();
    check('the latest payload goes once the first is answered (not the one in between)', JSON.stringify(sent) === JSON.stringify([10, 30]), `sent ${sent.join(', ')}`);
    check('still kept until the latest is confirmed', box.size() === 1, `${box.size()}`);
    check('pending load meanwhile: net of the first confirmed (60 − 20)', box.pendingLoad('2026-11-15') === 40, box.pendingLoad('2026-11-15'));
    release(); await settle(); await settle();
    check('confirmed: removed, nothing pending', box.size() === 0 && box.pendingLoad('2026-11-15') === 0, `${box.size()} kept, pending ${box.pendingLoad('2026-11-15')}`);
  }
  { // two tabs on one storage, draining at once
    const w = rig(), sent = []; let release = [];
    const mk = tab => St.createOutbox({ storage: w.storage, key: 'k', tabId: tab, send: p => { sent.push(tab); return new Promise(r => release.push(r)); }, nowMs: () => w.now,
      setTimer: w.setTimer, clearTimer: w.clearTimer });
    w.store.k = JSON.stringify({ entries: { [payload().sessionId]: { payload: payload({ ended: true }), seq: 1, lease: null } }, confirmed: {} });
    const a = mk('A'), b = mk('B');
    await Promise.all([a.drain(), b.drain()].map(p => Promise.race([p, settle()])));
    check('two tabs draining at once: one sends, the other sees its lease', sent.length === 1, `sends by ${sent.join(', ')}`);
    release.forEach(r => r()); await settle(); await settle();
    check('then both tabs see the outbox empty', a.size() === 0 && b.size() === 0, `${a.size()} / ${b.size()}`);
    await w.advance(60000);
    check('and nobody sends it again', sent.length === 1, `${sent.length} send(s)`);
  }
  { // a lease left by a tab that died is waited out, then taken
    const w = rig(), sent = [];
    w.store.k = JSON.stringify({ entries: { [payload().sessionId]: { payload: payload(), seq: 1, lease: { tab: 'gone', until: w.now + 20000 } } }, confirmed: {} });
    const box = St.createOutbox({ storage: w.storage, key: 'k', tabId: 'new', send: () => { sent.push(w.now); return Promise.resolve(); }, nowMs: () => w.now, setTimer: w.setTimer, clearTimer: w.clearTimer });
    const t0 = w.now; await box.drain(); await w.advance(25000);
    check('a dead tab\'s lease (20 s) is waited out, then the entry is sent', sent.length === 1 && sent[0] - t0 >= 20000 && sent[0] - t0 <= 20100 && box.size() === 0, sent.map(t => t - t0).join(', ') + ' ms');
  }
  { // 35 h
    const w = rig(), logs = []; let n = 0;
    w.store.k = JSON.stringify({ entries: {
      a: { payload: payload({ sessionId: 'a', startedAt: new Date(w.now - 35.1 * 3600000).toISOString(), day: '2026-11-14' }), seq: 1 },
      b: { payload: payload({ sessionId: 'b', startedAt: new Date(w.now - 34.9 * 3600000).toISOString(), day: '2026-11-14' }), seq: 1 } }, confirmed: {} });
    const box = St.createOutbox({ storage: w.storage, key: 'k', send: p => { n++; return Promise.resolve(); }, nowMs: () => w.now, setTimer: w.setTimer, clearTimer: w.clearTimer, log: (...a) => logs.push(a.join(' ')) });
    check('35 h: an older session is not counted as pending', box.pendingLoad('2026-11-14') === 20, box.pendingLoad('2026-11-14'));
    await box.drain(); await settle();
    check('35 h: the older entry dropped and logged, the newer one sent', n === 1 && box.size() === 0 && logs.some(l => /older than 35 h/.test(l)), `${n} sent, ${box.size()} kept, log: ${logs.join(' | ')}`);
  }
  { // per day, per user key
    const w = rig();
    const box = St.createOutbox({ storage: w.storage, key: 'vl-outbox:u1', send: () => Promise.reject(err(503)), nowMs: () => w.now, setTimer: w.setTimer, clearTimer: w.clearTimer });
    box.put(payload({ sessionId: 's1', load: 30 })); box.put(payload({ sessionId: 's2', load: 12, day: '2026-11-14', startedAt: '2026-11-14T23:00:00.000Z' })); await settle();
    check('pending load counts only that day', box.pendingLoad('2026-11-15') === 30 && box.pendingLoad('2026-11-14') === 12, `${box.pendingLoad('2026-11-15')} / ${box.pendingLoad('2026-11-14')}`);
    const other = St.createOutbox({ storage: w.storage, key: 'vl-outbox:u2', send: () => Promise.resolve(), nowMs: () => w.now, setTimer: w.setTimer, clearTimer: w.clearTimer });
    check('another user\'s outbox (its own key) sees none of it', other.size() === 0 && other.pendingLoad('2026-11-15') === 0, `${other.size()}`);
  }
  { // storage that throws
    const w = rig({ storageThrows: true }); let n = 0;
    const box = St.createOutbox({ storage: w.storage, key: 'k', send: () => (++n < 2 ? Promise.reject(err(503)) : Promise.resolve()), nowMs: () => w.now, random: () => 0.5, setTimer: w.setTimer, clearTimer: w.clearTimer });
    box.put(payload()); await settle(); await w.advance(3000);
    check('storage that throws: kept in memory, retried, sent', n === 2 && box.size() === 0, `${n} sends`);
  }
}

// ---------------- part 2
async function app() {
  console.log('\n== part 2: the app (local build, production backend)');
  const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
  const b = await C.chromium.launch();
  const PUT = /\/me\/vocal-load\/sessions\/([0-9a-f-]{36})/;
  try {
    const a = await C.openPage(b, {}); const email = await C.signUp(a.page, 'dvvlo', 'Outbox Check');
    const uid = await a.page.evaluate(() => profile.id); const state = await a.ctx.storageState(); await a.ctx.close();
    const rows = () => db(`select session_id::text as id, active_seconds, load, ended from public.vocal_load_sessions where user_id = '${uid}' order by started_at`);
    // one context = one browser profile: its pages share localStorage, like two tabs
    const ctx = await b.newContext({ storageState: state, viewport: { width: 390, height: 844 } });
    await ctx.route(C.LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: require('path').join(C.DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
    const puts = []; let mode = 'pass'; // pass | 503 | abort
    await ctx.route('**/me/vocal-load/sessions/**', r => {
      if (r.request().method() !== 'PUT') return r.continue();
      puts.push({ id: (r.request().url().match(PUT) || [])[1], mode, t: Date.now() });
      if (mode === '503') return r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Service Unavailable"}' });
      if (mode === 'abort') return r.abort('failed');
      return r.continue();
    });
    const open = async () => { const page = await ctx.newPage(), errors = []; page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
      await page.goto(C.LOCAL); await page.waitForFunction(() => typeof profile !== 'undefined' && !!profile && !!progress, null, { timeout: 30000 }); await C.clearOverlays(page); return { page, errors }; };
    // 4 s of a C4 frame through the app's own load feed, then the idle timer ends the session (3 s) and writes its end
    const sing = page => page.evaluate(async () => {
      const n = 2048, buf = new Float32Array(n), f = 261.63; for (let i = 0; i < n; i++) buf[i] = 0.1 * Math.sin(2 * Math.PI * f * i / 48000);
      const t0 = performance.now(); while (performance.now() - t0 < 4000) { vlFeed(f, buf); await new Promise(r => setTimeout(r, 16)); }
      const until = performance.now() + 8000; while (vlRun && performance.now() < until) await new Promise(r => setTimeout(r, 100));
      return !vlRun;
    });
    const box = page => page.evaluate(() => { const b = vlOutbox(); const s = b._state(); return { n: Object.keys(s.entries).length, ids: Object.keys(s.entries), pending: b.pendingLoad(todayStr()),
      ended: Object.values(s.entries).map(e => e.payload.ended), load: Object.values(s.entries).map(e => e.payload.load) }; });
    const waitFor = async (fn, ms) => { const t = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > t) return v; await C.sleep(500); } };

    for (const how of ['503', 'abort']) {
      await C.G.step(`end PUT ${how}`, 120, async () => { // normally 25 s
        const { page, errors } = await open();
        const n0 = rows().length; mode = how; const p0 = puts.length;
        check(`${how}: the session ended by the idle timer`, await sing(page));
        await C.sleep(1500);
        const ob = await box(page), myPuts = puts.slice(p0);
        check(`${how}: the end PUT failed (${myPuts.length} attempt(s), all ${how}) and the session is kept on the device, ended`, myPuts.length >= 1 && myPuts.every(x => x.mode === how) && ob.n === 1 && ob.ended[0] === true, JSON.stringify(ob));
        check(`${how}: nothing stored on the server yet`, rows().length === n0, `${rows().length - n0} new rows`);
        const g = await page.evaluate(() => ({ pct: vlPercent(), dayLoad: vlDay.load }));
        const storedSum = rows().reduce((a, x) => a + x.load, 0);
        check(`${how}: the gauge still counts the session (today's total = the server's + the one waiting)`, Math.abs(g.dayLoad - (storedSum + ob.load[0])) < 1e-3, `gauge load ${g.dayLoad.toFixed(3)}, stored ${storedSum.toFixed(3)} + waiting ${ob.load[0].toFixed(3)}`);
        // the server answers again: the next retry (2 s, then 5 s…) stores it
        mode = 'pass';
        const done = await waitFor(async () => (await box(page)).n === 0, 30000);
        const r = rows();
        check(`${how}: once the server answers, the retry stores it and the outbox empties`, done && r.length === n0 + 1 && r[r.length - 1].ended && r[r.length - 1].id === ob.ids[0], `${r.length - n0} new row, ended ${r[r.length - 1] && r[r.length - 1].ended}, ${(await box(page)).n} waiting`);
        check(`${how}: stored with the device's load`, r.length && Math.abs(r[r.length - 1].load - ob.load[0]) < 1e-6, `${r[r.length - 1] && r[r.length - 1].load} vs ${ob.load[0]}`);
        await page.reload(); await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 30000 }); await C.sleep(2500);
        const g2 = await page.evaluate(() => vlDay.load);
        check(`${how}: after a reload the gauge reads the server's total, not counted twice`, Math.abs(g2 - r.reduce((a, x) => a + x.load, 0)) < 1e-3, `${g2.toFixed(3)} vs stored ${r.reduce((a, x) => a + x.load, 0).toFixed(3)}`);
        await page.close();
      });
    }
    await C.G.step('reload with an entry waiting', 120, async () => {
      const { page } = await open(); const n0 = rows().length; mode = '503';
      await sing(page); await C.sleep(1000);
      const ob = await box(page);
      await page.close(); // the page closes while the server is failing
      mode = 'pass';
      const p0 = puts.length; const { page: p2 } = await open();
      const done = await waitFor(async () => (await box(p2)).n === 0, 20000);
      const r = rows(), sentNow = puts.slice(p0).filter(x => x.id === ob.ids[0]);
      check('a page closed with an entry waiting: the next page sends it on sign-in, stored, the outbox empty', ob.n === 1 && done && r.length === n0 + 1 && r[r.length - 1].id === ob.ids[0] && sentNow.length >= 1, `${ob.n} waiting before, ${sentNow.length} PUT on load, ${r.length - n0} new row`);
      await p2.close();
    });
    await C.G.step('two tabs draining at once', 120, async () => {
      const { page } = await open(); const n0 = rows().length; mode = '503';
      await sing(page); await C.sleep(1000); const ob = await box(page); await page.close();
      mode = 'pass'; const p0 = puts.length;
      const [t1, t2] = await Promise.all([open(), open()]);
      const done = await waitFor(async () => (await box(t1.page)).n === 0 && (await box(t2.page)).n === 0, 30000);
      const r = rows(), sent = puts.slice(p0).filter(x => x.id === ob.ids[0]);
      check('two tabs at once: the session stored once, both outboxes empty', done && r.length === n0 + 1 && r.filter(x => x.id === ob.ids[0]).length === 1, `${r.length - n0} new row`);
      check('two tabs at once: one tab sent it (the other saw its lease)', sent.length === 1, `${sent.length} PUT(s) for the session`);
      await t1.page.close(); await t2.page.close();
    });
    await C.G.step('35 h drop', 90, async () => {
      const old = { sessionId: '20000000-0000-4000-8000-0000000000a5', day: new Date(Date.now() - 36 * 3600000).toISOString().slice(0, 10), startedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
        activeSeconds: 5, load: 9, medianRms: 0.05, p5Midi: 59, p95Midi: 61, ended: true };
      const { page } = await open();
      await page.evaluate(({ old, uid }) => { localStorage.setItem('vl-outbox:' + uid, JSON.stringify({ entries: { [old.sessionId]: { payload: old, seq: 1, lease: null } }, confirmed: {} })); }, { old, uid });
      await page.close(); const p0 = puts.length;
      const { page: p2, errors } = await open(); await C.sleep(3000);
      const st = await p2.evaluate(uid => JSON.parse(localStorage.getItem('vl-outbox:' + uid) || '{}'), uid);
      const sent = puts.slice(p0).filter(x => x.id === old.sessionId);
      check('an entry whose session started 36 h ago: dropped on load, never sent, logged', !(st.entries || {})[old.sessionId] && sent.length === 0 && errors.some(e => /older than 35 h/.test(e)), `kept ${!!(st.entries || {})[old.sessionId]}, ${sent.length} PUT, log ${errors.filter(e => /35 h/.test(e)).length}`);
      await p2.close();
    });
    await ctx.close();
  } finally { await b.close(); C.cleanup(); }
}

(async () => {
  if (ONLY !== 'app') await unit();
  if (ONLY !== 'unit') await app();
  console.log(`\n${fail ? 'OUTBOX: FAIL' : 'OUTBOX: PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
