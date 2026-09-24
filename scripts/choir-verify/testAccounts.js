// Test accounts made by the verification scripts. A script calls track(email) for every account it is about to
// sign up; when the script exits (finished, crashed or Ctrl+C) those accounts are deleted from auth.users, which
// cascades to public.users, user_progress and the rest. Only voxcoach-…@example.com addresses the script itself
// created are ever deleted. Uses the linked project: npx supabase db query --linked.
const { execSync } = require('child_process');

const created = [];
const TEST_EMAIL = /^voxcoach-[a-z0-9-]+@example\.com$/;

function db(sql) {
  const out = execSync(`npx supabase db query --linked "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  return JSON.parse(out.slice(out.indexOf('{'))).rows;
}

function track(email) {
  if (!TEST_EMAIL.test(email)) throw new Error(`not a test account address: ${email}`);
  if (!created.includes(email)) created.push(email);
  return email;
}

let cleaned = false;
function cleanup() {
  if (cleaned || !created.length) return;
  cleaned = true;
  const list = created.map(e => `'${e}'`).join(',');
  try {
    const gone = db(`delete from auth.users where email in (${list}) and email like 'voxcoach-%@example.com' returning email`).length;
    const left = db(`select count(*) as n from auth.users where email in (${list})`)[0].n;
    console.log(`\n[cleanup] deleted ${gone} test account(s) this run created; ${left} left of ${created.join(', ')}`);
  } catch (e) {
    console.log(`\n[cleanup] FAILED, delete these by hand: ${created.join(', ')} (${e.message.split('\n')[0]})`);
  }
}
process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
process.on('uncaughtException', e => { console.error(e); process.exit(1); });
process.on('unhandledRejection', e => { console.error(e); process.exit(1); });

module.exports = { track, db, cleanup };
