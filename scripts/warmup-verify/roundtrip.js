// Release F's deploy, step b (design/warmup/RELEASE_F.md, "Review and deploy"): after 0011 and the api function are on
// production, PATCH /me/progress with last_warmup_day and warmup_streak round-trips through GET, and a PATCH without them
// (what the old app, dpl_12MtZ8zx…, sends) still saves and leaves them as they were. One throwaway account (deleted
// however the run ends). Usage: node scripts/warmup-verify/roundtrip.js
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const { track, cleanup } = require('../choir-verify/testAccounts');
const html = fs.readFileSync(path.join(__dirname, '../../deploy/index.html'), 'utf8');
const URL_ = html.match(/const SUPABASE_URL = '([^']+)'/)[1], KEY = html.match(/const SUPABASE_ANON_KEY = '([^']+)'/)[1];
let pass = 0, fail = 0;
const check = (l, ok, d = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${l.padEnd(78)} ${d}`); };
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  try {
    const email = track(`voxcoach-wu-rt-${Date.now()}@example.com`), password = 'RT-' + Math.random().toString(36).slice(2) + '!x9';
    let s;
    for (let i = 1; ; i++) { // "JWT issued at future" (auth vs api clock skew) is transient: a short wait and a retry
      const r = await fetch(`${URL_}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, data: { name: 'RT Harness' } }) });
      s = await r.json(); if (s.access_token) break;
      if (i >= 3) throw new Error('sign-up: ' + JSON.stringify(s).slice(0, 200)); await sleep(3000);
    }
    console.log(`   signed up ${email} on ${URL_}`);
    const api = async (method, body) => {
      for (let i = 1; ; i++) {
        const r = await fetch(`${URL_}/functions/v1/api/me/progress`, { method, headers: { apikey: KEY, Authorization: 'Bearer ' + s.access_token, 'Content-Type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) });
        const txt = await r.text();
        if (r.ok) return txt ? JSON.parse(txt) : null;
        if (i >= 3 || !/issued at future|503/.test(r.status + txt)) throw new Error(`${method} ${r.status}: ${txt.slice(0, 200)}`);
        await sleep(3000);
      }
    };
    const g0 = await api('GET'); const row0 = g0 && (g0.progress || g0);
    check('GET: the row has the two columns (0011), empty', row0 && 'last_warmup_day' in row0 && row0.last_warmup_day === null && +row0.warmup_streak === 0, JSON.stringify({ d: row0.last_warmup_day, s: row0.warmup_streak }));
    await api('PATCH', { last_warmup_day: '2026-11-23', warmup_streak: 4, xp: 5 });
    const g1 = await api('GET'), row1 = g1.progress || g1;
    check('PATCH with last_warmup_day and warmup_streak: GET returns them', row1.last_warmup_day === '2026-11-23' && +row1.warmup_streak === 4 && +row1.xp === 5, JSON.stringify({ d: row1.last_warmup_day, s: row1.warmup_streak, xp: row1.xp }));
    await api('PATCH', { xp: 42, total_sessions: 1 });
    const g2 = await api('GET'), row2 = g2.progress || g2;
    check('PATCH without them (as the old app): saves', +row2.xp === 42 && +row2.total_sessions === 1, JSON.stringify({ xp: row2.xp, n: row2.total_sessions }));
    check('… and leaves the warm-up columns as they were', row2.last_warmup_day === '2026-11-23' && +row2.warmup_streak === 4, JSON.stringify({ d: row2.last_warmup_day, s: row2.warmup_streak }));
  } catch (e) { fail++; console.error('  ✗ ' + e.message); }
  finally { await cleanup(); }
  console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})();
