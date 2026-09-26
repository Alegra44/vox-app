// Test accounts made by the verification scripts. A script calls track(email) for every account it is about to
// sign up; those accounts are deleted from auth.users (cascading to public.users, user_progress and the rest) however
// the run ends. Only voxcoach-…@example.com addresses a script itself created are ever deleted. Uses the linked
// project: npx supabase db query --linked.
//
// Three layers, because a process that is killed outright (an out-of-memory kill, Task Manager, a tool timeout that
// terminates the process) runs no finally block and no exit hook:
//   1. cleanup() on exit: finished, crashed, Ctrl+C, SIGTERM. Scripts also call it from their own finally.
//   2. a watchdog: the first track() starts an orphaned node process that waits for this one to die and then deletes
//      whatever the ledger still lists. It reports to <tmp>/voxcoach-test-accounts/watchdog.log.
//   3. the ledger: track() writes <tmp>/voxcoach-test-accounts/<pid>.json BEFORE the address is signed up, and cleanup
//      removes it once the accounts are gone. Every script, when it loads this file, deletes the accounts listed in
//      any ledger whose process is no longer running, so even if the watchdog was killed with its parent, the next
//      verification run of any script cleans up.
const { execSync, spawn } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path');

const TEST_EMAIL = /^voxcoach-[a-z0-9-]+@example\.com$/;
const DIR = path.join(os.tmpdir(), 'voxcoach-test-accounts');
const LOG = path.join(DIR, 'watchdog.log');

// The CLI logs in with a temporary role whose password each query resets, so two queries at once (two scripts running,
// or a watchdog next to a run) can fail with "password authentication failed for user cli_login_postgres": retried.
function db(sql) {
  for (let i = 0; ; i++) {
    try {
      const out = execSync(`npx supabase db query --linked "${sql.replace(/"/g, '\\"')}"`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
      return JSON.parse(out.slice(out.indexOf('{'))).rows;
    } catch (e) {
      if (i >= 4 || !/cli_login_postgres|28P01/.test(String(e.stdout || e.message))) throw e;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 3000 + 2000 * i);
    }
  }
}
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } }
function readLedger(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')).filter(e => TEST_EMAIL.test(e)); } catch { return null; } }
// Deletes the listed accounts and returns [deleted, still there]; throws if the database can't be reached.
function remove(emails) {
  const list = emails.map(e => `'${e}'`).join(',');
  const gone = db(`delete from auth.users where email in (${list}) and email like 'voxcoach-%@example.com' returning email`).length;
  const left = Number(db(`select count(*) as n from auth.users where email in (${list})`)[0].n);
  return [gone, left];
}

// ---- launcher: starts the watchdog and exits at once, so the watchdog is orphaned. A kill of the run's process tree
// (Windows follows parent ids; that is how a tool timeout or a low-memory reap kills a run) then can't reach it.
if (require.main === module && process.argv[2] === '--launch') {
  spawn(process.execPath, [__filename, '--watch', ...process.argv.slice(3)], { detached: true, stdio: 'ignore', windowsHide: true }).unref();
  return;
}
// ---- watchdog mode: node testAccounts.js --watch <pid> <ledger>
if (require.main === module && process.argv[2] === '--watch') {
  const pid = +process.argv[3], ledger = process.argv[4];
  const log = m => fs.appendFileSync(LOG, `${new Date().toISOString()} [pid ${pid}] ${m}\n`);
  const tick = setInterval(() => {
    if (alive(pid)) return;
    clearInterval(tick);
    const emails = readLedger(ledger);
    if (!emails) return; // the run cleaned up after itself
    if (!emails.length) { fs.rmSync(ledger, { force: true }); return; }
    try {
      const [gone, left] = remove(emails);
      if (!left) fs.rmSync(ledger, { force: true });
      log(`run died without cleaning up; deleted ${gone}, ${left} left of ${emails.join(', ')}`);
    } catch (e) { log(`FAILED (${e.message.split(/\r?\n/)[0]}); the next verification run retries from ${ledger}`); }
  }, 1000);
  return;
}

const created = [];
const LEDGER = path.join(DIR, `${process.pid}.json`);
let watchdog = null;

function track(email) {
  if (!TEST_EMAIL.test(email)) throw new Error(`not a test account address: ${email}`);
  if (!created.includes(email)) created.push(email);
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(LEDGER, JSON.stringify(created)); // before the sign-up, so a kill at any later point is covered
  if (!watchdog) {
    watchdog = spawn(process.execPath, [__filename, '--launch', String(process.pid), LEDGER], { detached: true, stdio: 'ignore', windowsHide: true });
    watchdog.unref();
  }
  return email;
}

let cleaned = false;
function cleanup() {
  if (cleaned || !created.length) return;
  cleaned = true;
  try {
    const [gone, left] = remove(created);
    if (!left) fs.rmSync(LEDGER, { force: true });
    console.log(`\n[cleanup] deleted ${gone} test account(s) this run created; ${left} left of ${created.join(', ')}`);
  } catch (e) {
    console.log(`\n[cleanup] FAILED (${e.message.split(/\r?\n/)[0]}); the watchdog retries when this process exits: ${created.join(', ')}`);
  }
}

// Ledgers of runs that are no longer running: their accounts were never cleaned up.
function reapDeadRuns() {
  let files = [];
  try { files = fs.readdirSync(DIR).filter(f => /^\d+\.json$/.test(f)); } catch { return; }
  for (const f of files) {
    const pid = +f.slice(0, -5), file = path.join(DIR, f);
    if (pid === process.pid || alive(pid)) continue;
    const emails = readLedger(file);
    if (!emails || !emails.length) { fs.rmSync(file, { force: true }); continue; }
    try {
      const [gone, left] = remove(emails);
      if (!left) fs.rmSync(file, { force: true });
      console.log(`[reap] run ${pid} died without cleaning up: deleted ${gone}, ${left} left of ${emails.join(', ')}`);
    } catch (e) { console.log(`[reap] FAILED for run ${pid} (${e.message.split(/\r?\n/)[0]}): ${emails.join(', ')}`); }
  }
}
reapDeadRuns();

// A backstop for accounts from before the ledger existed: deletes accounts with this prefix over an hour old (a run of
// the same script still in progress keeps its account).
function sweep(prefix) {
  if (!/^[a-z0-9]+$/.test(prefix)) throw new Error(`bad test account prefix: ${prefix}`);
  try {
    const gone = db(`delete from auth.users where email like 'voxcoach-${prefix}-%@example.com' and created_at < now() - interval '1 hour' returning email`).map(r => r.email);
    console.log(`[sweep] deleted ${gone.length} leftover voxcoach-${prefix}-* account(s) from earlier runs${gone.length ? ': ' + gone.join(', ') : ''}`);
  } catch (e) {
    console.log(`[sweep] FAILED (${e.message.split(/\r?\n/)[0]}); leftover voxcoach-${prefix}-* accounts may remain`);
  }
}

process.on('exit', cleanup);
process.on('SIGINT', () => process.exit(130));
process.on('SIGTERM', () => process.exit(143));
process.on('SIGHUP', () => process.exit(129));
if (process.platform === 'win32') process.on('SIGBREAK', () => process.exit(131));
process.on('uncaughtException', e => { console.error(e); process.exit(1); });
process.on('unhandledRejection', e => { console.error(e); process.exit(1); });

module.exports = { track, db, cleanup, sweep };
