// Billing columns are server-only (supabase/migrations/0006_protect_billing_columns.sql), checked against the linked
// project directly: a real throwaway account signs up through Supabase Auth and writes its own public.users row
// straight through PostgREST with its own JWT and the page's publishable key, as anyone could from the browser console,
// not through the api function. What the row really holds is read back with the CLI (postgres), not trusted from the
// response.
//   P  subscription_plan, stripe_customer_id, payment_failed_at: each one set alone, set next to an allowed column, and
//      through an upsert, is rejected and the row is unchanged
//   A  every column the user edits (the api allow-list, plus language from /api/me/preferences) still saves, one at a
//      time and all together; a whole-row write that sends the billing columns at their current values goes through
//   S  the server still writes them (service_role, the webhook's role; and postgres), and once it has, the user can't
//      clear them
//   API PATCH /api/me still saves an allowed column and still drops subscription_plan
// Before 0006 is applied, the P and S "user can't" checks fail: that run is the control.
// The test account is deleted however the run ends (testAccounts.js).
// Usage: node scripts/billing-verify/protected-columns.js
const { track, db, cleanup } = require('../choir-verify/testAccounts');

const SUPABASE_URL = 'https://ccharikhpeqtzpobarxi.supabase.co', KEY = 'sb_publishable_hHDLaxAN4e9Yxg1jCfq8NA_V5WuBBwn';
const email = track(`voxcoach-bill-${Date.now()}@example.com`), password = 'VC-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, token, uid;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(74)} ${detail}`); }

// PostgREST as the signed-in user
async function rest(method, query, body, prefer = 'return=representation') {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/users${query}`, { method,
    headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: prefer },
    body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await r.text(); let json = null; try { json = JSON.parse(text); } catch {}
  return { status: r.status, json, text };
}
const patchOwn = body => rest('PATCH', `?id=eq.${uid}`, body);
// the row as the database holds it
const COLS = 'subscription_plan, stripe_customer_id, payment_failed_at, name, exercise_level, genre, onboarding_singer_type, onboarding_priority, onboarding_goals, day1_start_date, day1_goal, day1_snapshot, language';
const row = () => db(`select ${COLS} from public.users where id = '${uid}'`)[0];
const billing = r => JSON.stringify([r.subscription_plan, r.stripe_customer_id, r.payment_failed_at]);
const brief = res => `HTTP ${res.status}${res.status >= 300 ? ': ' + String((res.json && res.json.message) || res.text).slice(0, 70) : ''}`;

async function expectRejected(label, body, rowBefore, via = patchOwn) {
  const res = await via(body), after = row();
  const unchanged = JSON.stringify(after) === JSON.stringify(rowBefore);
  check(label, res.status >= 400 && unchanged, `${brief(res)}; row ${unchanged ? 'unchanged' : 'CHANGED ' + billing(after)}`);
}

(async () => {
  try {
    console.log(`== ${SUPABASE_URL} (direct PostgREST as the user)\n`);
    const su = await fetch(`${SUPABASE_URL}/auth/v1/signup`, { method: 'POST', headers: { apikey: KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
    const sj = await su.json();
    if (!sj.access_token) throw new Error('signup gave no session: ' + JSON.stringify(sj).slice(0, 200));
    token = sj.access_token; uid = sj.user.id;
    console.log(`   signed up ${email}`);
    const start = row();
    check('new row starts with no plan, customer or failed payment', billing(start) === '[null,null,null]', billing(start));

    console.log('\n-- P: the user can\'t set the billing columns');
    await expectRejected('subscription_plan = choir', { subscription_plan: 'choir' }, row());
    await expectRejected('stripe_customer_id = cus_fake', { stripe_customer_id: 'cus_fake' }, row());
    await expectRejected('payment_failed_at = now', { payment_failed_at: new Date().toISOString() }, row());
    await expectRejected('name + subscription_plan together (the name doesn\'t save either)', { name: 'Sneaky', subscription_plan: 'yearly' }, row());
    await expectRejected('upsert of the own row with subscription_plan',
      { id: uid, email, subscription_plan: 'teacher' }, row(),
      b => rest('POST', '?on_conflict=id', b, 'resolution=merge-duplicates,return=representation'));

    console.log('\n-- A: the columns the user edits still save');
    const VALUES = { name: 'Billing Test', exercise_level: 'intermediate', genre: 'jazz', onboarding_singer_type: 'choir',
      onboarding_priority: 'pitch', onboarding_goals: ['range', 'breath'], day1_start_date: '2026-09-01', day1_goal: 'sing a high G',
      day1_snapshot: { pitch: 71, note: 'x' }, language: 'fr' };
    for (const [col, v] of Object.entries(VALUES)) {
      const res = await patchOwn({ [col]: v }), got = row()[col];
      // dates as YYYY-MM-DD; objects with sorted keys (jsonb doesn't keep key order)
      const sortKeys = x => x && typeof x === 'object' && !Array.isArray(x) ? Object.fromEntries(Object.keys(x).sort().map(k => [k, sortKeys(x[k])])) : x;
      const norm = x => JSON.stringify(typeof x === 'string' && /^\d{4}-\d\d-\d\dT/.test(x) ? x.slice(0, 10) : sortKeys(x));
      check(`${col} alone`, res.status === 200 && norm(got) === norm(v), `${brief(res)}; stored ${norm(got)}`);
    }
    const ALL2 = { name: 'Billing Test 2', exercise_level: 'professional', genre: 'pop', onboarding_singer_type: 'solo',
      onboarding_priority: 'range', onboarding_goals: ['agility'], day1_start_date: '2026-09-02', day1_goal: 'g2', day1_snapshot: { pitch: 80 }, language: 'es' };
    let res = await patchOwn(ALL2), r = row();
    check('all of them at once', res.status === 200 && r.name === 'Billing Test 2' && r.language === 'es' && r.exercise_level === 'professional', brief(res));
    const whole = (await rest('GET', `?id=eq.${uid}&select=*`, undefined, 'return=representation')).json[0];
    whole.name = 'Whole Row';
    res = await patchOwn(whole); r = row();
    check('whole-row write, billing columns sent at their current values', res.status === 200 && r.name === 'Whole Row' && billing(r) === '[null,null,null]', `${brief(res)}; billing ${billing(r)}`);

    console.log('\n-- S: the server still writes them; then the user can\'t clear them');
    let err = null;
    try { db(`begin; set local role service_role; update public.users set subscription_plan = 'choir', stripe_customer_id = 'cus_test_${uid.slice(0, 8)}' where id = '${uid}'; commit;`); } catch (e) { err = String(e.stdout || e.message).slice(0, 120); }
    r = row();
    check('as service_role (the webhook): plan + customer id', !err && r.subscription_plan === 'choir' && r.stripe_customer_id === `cus_test_${uid.slice(0, 8)}`, err || billing(r));
    err = null;
    try { db(`update public.users set payment_failed_at = now() where id = '${uid}'`); } catch (e) { err = String(e.stdout || e.message).slice(0, 120); }
    r = row();
    check('as postgres: payment_failed_at', !err && r.payment_failed_at !== null, err || billing(r));
    await expectRejected('user clears subscription_plan', { subscription_plan: null }, row());
    await expectRejected('user switches choir -> teacher', { subscription_plan: 'teacher' }, row());
    await expectRejected('user clears payment_failed_at', { payment_failed_at: null }, row());
    await expectRejected('user replaces stripe_customer_id', { stripe_customer_id: 'cus_other' }, row());
    const whole2 = (await rest('GET', `?id=eq.${uid}&select=*`, undefined, 'return=representation')).json[0];
    whole2.genre = 'rock';
    res = await patchOwn(whole2); r = row();
    check('whole-row write with the server-set values unchanged', res.status === 200 && r.genre === 'rock' && r.subscription_plan === 'choir', `${brief(res)}; billing ${billing(r)}`);

    console.log('\n-- API: PATCH /api/me');
    const api = body => fetch(`${SUPABASE_URL}/functions/v1/api/me`, { method: 'PATCH', headers: { apikey: KEY, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let ar = await api({ name: 'Via API' }); r = row();
    check('an allowed column saves', ar.status === 200 && r.name === 'Via API', `HTTP ${ar.status}`);
    ar = await api({ subscription_plan: 'yearly' }); r = row();
    check('subscription_plan alone is dropped (400, no patchable fields), plan kept', ar.status === 400 && r.subscription_plan === 'choir', `HTTP ${ar.status}; plan ${r.subscription_plan}`);
  } catch (e) {
    check('run finished', false, String(e && e.message || e).slice(0, 160));
  } finally {
    await cleanup();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
  }
})();
