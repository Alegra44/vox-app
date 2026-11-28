// Release J deploy step b (design/reliability/RELEASE_J.md, "Review and deploy"): the api Edge Function on the linked
// project, called directly with a throwaway account's JWT, as the page does. What the row holds is read back with the
// CLI (postgres), not trusted from the response.
//   1  PATCH /me/progress with if_version at the row's version: 200, saved, version + 1
//   2  …with if_version at an old version: 409 with the row as it is; nothing written
//   3  …without if_version (the live app today): 200, saved (last writer wins, as before J)
//   4  version can't be written by a client: not through the api (not on the allow-list), and a direct PostgREST
//      write of version is either refused or overwritten by the trigger
// The test account is deleted however the run ends (testAccounts.js).
// Usage: node scripts/release-j/apicheck.js
const { track, db, cleanup } = require('../choir-verify/testAccounts');
const crypto = require('crypto');

const SUPABASE_URL = 'https://ccharikhpeqtzpobarxi.supabase.co', KEY = 'sb_publishable_hHDLaxAN4e9Yxg1jCfq8NA_V5WuBBwn';
const API = SUPABASE_URL + '/functions/v1/api';
const email = track(`voxcoach-japi-${Date.now()}@example.com`), password = 'VC-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, token, uid;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(70)} ${detail}`); };
const row = () => db(`select xp, version, last_save_id, recent_save_ids, pitch_scores from public.user_progress where user_id = '${uid}'`)[0];
async function call(method, path, body) {
  const r = await fetch(API + path, { method, headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}

(async () => {
  try {
    console.log(`== ${API}\n`);
    const su = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const sj = await su.json();
    if (!sj.access_token) throw new Error('signup gave no session: ' + JSON.stringify(sj).slice(0, 200));
    token = sj.access_token; uid = sj.user.id;
    console.log(`   signed up ${email}`);
    const g = await call('GET', '/me/progress');
    check('GET /me/progress returns the row with its version', g.status === 200 && typeof g.json.version === 'number', `HTTP ${g.status}, version ${g.json && g.json.version}`);
    const r0 = row();

    // 1: at the row's version
    const id1 = crypto.randomUUID();
    const p1 = await call('PATCH', '/me/progress', { xp: 7, if_version: r0.version, save_id: id1 }), r1 = row();
    check('1  if_version at the row\'s version: 200', p1.status === 200, `HTTP ${p1.status}`);
    check('   …saved, version + 1, the save id kept', r1.xp === 7 && r1.version === r0.version + 1 && r1.last_save_id === id1 && r1.recent_save_ids.includes(id1),
      `xp ${r1.xp}, version ${r0.version} → ${r1.version}, last_save_id ${r1.last_save_id === id1 ? 'ok' : r1.last_save_id}`);
    check('   …the response carries the new version', p1.json && p1.json.version === r1.version, `${p1.json && p1.json.version}`);

    // 2: at an old version
    const p2 = await call('PATCH', '/me/progress', { xp: 999, if_version: r0.version, save_id: crypto.randomUUID() }), r2 = row();
    check('2  if_version at an old version: 409', p2.status === 409, `HTTP ${p2.status}`);
    check('   …with the row as it is', p2.json && p2.json.row && p2.json.row.version === r1.version && p2.json.row.xp === 7,
      `row version ${p2.json && p2.json.row && p2.json.row.version}, xp ${p2.json && p2.json.row && p2.json.row.xp}`);
    check('   …nothing written', JSON.stringify(r2) === JSON.stringify(r1), `xp ${r2.xp}, version ${r2.version}`);

    // 3: without if_version (the live app: no save_id either)
    const p3 = await call('PATCH', '/me/progress', { xp: 12, pitch_scores: [77] }), r3 = row();
    check('3  no if_version (the live app today): 200', p3.status === 200, `HTTP ${p3.status}`);
    check('   …saved, version + 1, save ids unchanged', r3.xp === 12 && JSON.stringify(r3.pitch_scores) === '[77]' && r3.version === r2.version + 1
      && r3.last_save_id === id1 && JSON.stringify(r3.recent_save_ids) === JSON.stringify(r2.recent_save_ids),
      `xp ${r3.xp}, pitch ${JSON.stringify(r3.pitch_scores)}, version ${r2.version} → ${r3.version}`);

    // 4: version is the server's
    const p4 = await call('PATCH', '/me/progress', { version: 500, recent_save_ids: [], xp: 13 }), r4 = row();
    check('4  the api ignores version and recent_save_ids from a client', p4.status === 200 && r4.version === r3.version + 1 && r4.xp === 13
      && JSON.stringify(r4.recent_save_ids) === JSON.stringify(r3.recent_save_ids), `HTTP ${p4.status}, version ${r4.version}, xp ${r4.xp}`);
    const d = await fetch(`${SUPABASE_URL}/rest/v1/user_progress?user_id=eq.${uid}`, { method: 'PATCH',
      headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' }, body: JSON.stringify({ version: 500 }) });
    const r5 = row();
    check('   a direct PostgREST write of version: refused, or the trigger wins', r5.version !== 500 && r5.version <= r4.version + 1,
      `HTTP ${d.status}, version ${r4.version} → ${r5.version}`);
  } catch (e) { fail++; console.error(e); }
  finally { cleanup(); }
  const left = db(`select count(*)::int n from auth.users where email = '${email}'`)[0].n;
  check('the test account is deleted', left === 0, `${left} left`);
  console.log(`\nAPICHECK: ${fail ? 'FAIL' : 'PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
