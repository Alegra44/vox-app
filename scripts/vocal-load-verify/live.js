// Vocal Load Dosimetry phase 2 on the deployed backend: the /api/me/vocal-load routes and migration 0005, through
// HTTP as a throwaway signed-up user (deleted at exit by testAccounts.js, which cascades to its vocal-load rows).
// The logic itself is verified in persist.js; this checks the deployed route, auth, RLS and constraints end to end.
// Usage: node scripts/vocal-load-verify/live.js
const { track } = require('../choir-verify/testAccounts');
const URL = 'https://ccharikhpeqtzpobarxi.supabase.co', KEY = 'sb_publishable_hHDLaxAN4e9Yxg1jCfq8NA_V5WuBBwn', API = URL + '/functions/v1/api';
let pass = 0, fail = 0;
function check(label, ok, detail) { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(60)} ${detail}`); }
const call = async (method, path, token, body, base = API) => {
  const r = await fetch(base + path, { method, headers: { apikey: KEY, 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => null) };
};

(async () => {
  const email = track(`voxcoach-vl-${Date.now()}@example.com`), password = 'VL-' + Math.random().toString(36).slice(2) + '!x9';
  const su = await call('POST', '/auth/v1/signup', null, { email, password, data: { name: 'VL Live' } }, URL);
  const token = su.body && (su.body.access_token || (su.body.session && su.body.session.access_token));
  if (!token) throw new Error('sign-up gave no session: ' + JSON.stringify(su.body).slice(0, 200));
  console.log(`signed up ${email}`);

  const now = Date.now(), day = new Date(now).toISOString().slice(0, 10); // the app's todayStr()
  const sid = crypto.randomUUID(), startedAt = new Date(now - 5 * 60000).toISOString();
  const cp = (o) => ({ day, startedAt, activeSeconds: 100, load: 150, medianRms: 0.05, p5Midi: 50, p95Midi: 60, ended: false, ...o });

  let r = await call('PUT', `/me/vocal-load/sessions/${sid}`, token, cp());
  check('checkpoint 100 s / 150', r.status === 200 && r.body.active_seconds === 100 && r.body.load === 150, `${r.status} ${JSON.stringify(r.body).slice(0, 90)}`);
  r = await call('PUT', `/me/vocal-load/sessions/${sid}`, token, cp({ activeSeconds: 160, load: 240 }));
  check('checkpoint 160 s / 240', r.status === 200 && r.body.active_seconds === 160 && r.body.load === 240, `${r.status}`);
  r = await call('PUT', `/me/vocal-load/sessions/${sid}`, token, cp({ activeSeconds: 120, load: 180 }));
  check('stale checkpoint (120 s) is a no-op', r.status === 200 && r.body.active_seconds === 160, `${r.status} stored ${r.body && r.body.active_seconds}`);
  r = await call('PUT', `/me/vocal-load/sessions/${crypto.randomUUID()}`, token, cp({ medianRms: 1.5 }));
  check('median RMS 1.5 rejected by the database', r.status === 400 && /vls_median_rms/.test(r.body.error), `${r.status} ${r.body && r.body.error}`);
  r = await call('PUT', `/me/vocal-load/sessions/${crypto.randomUUID()}`, token, cp({ activeSeconds: 1000, load: 1100 })); // 5 min elapsed + 10 min clock allowance = 900 s at most
  check('1000 active s in a 5-minute-old session rejected (limit 900)', r.status === 400 && /more active seconds/.test(r.body.error), `${r.status} ${r.body && r.body.error}`);
  r = await call('PUT', `/me/vocal-load/sessions/not-a-uuid`, token, cp());
  check('malformed session id rejected by the route', r.status === 400, `${r.status} ${r.body && r.body.error}`);
  r = await call('GET', `/me/vocal-load?day=${day}`, token);
  check('state: 1 baseline session (160 s), today 240', r.status === 200 && r.body.sessions.length === 1 && r.body.sessions[0].activeSeconds === 160 && Number(r.body.dayLoad) === 240, `${r.status} ${JSON.stringify(r.body)}`);
  r = await call('GET', `/rest/v1/vocal_load_daily?select=day,total_load`, token, null, URL);
  check('daily table (read straight, own JWT): today 240', r.status === 200 && r.body.length === 1 && r.body[0].total_load === 240 && r.body[0].day === day, `${r.status} ${JSON.stringify(r.body)}`);
  r = await call('POST', `/rest/v1/vocal_load_daily`, token, { day: '2026-01-01', total_load: 5 }, URL);
  check('writing the daily table straight is refused (RLS)', r.status === 401 || r.status === 403, `${r.status} ${r.body && r.body.message}`);
  r = await call('GET', `/me/vocal-load?day=${day}`, null);
  check('no sign-in: 401', r.status === 401, `${r.status}`);
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})().catch(e => { console.error(e); process.exitCode = 1; });
