// One verify run at a time, and a time limit on everything (PHASE10.md part B, additions 2 and 3).
//
// The lock: <tmp>/voxcoach-verify.lock holds the pid, start time and name of the run that took it. A run takes it at start
// and gives it back at exit (finished, crashed, Ctrl+C, SIGTERM, SIGHUP). A run killed outright (SIGKILL) can't give it
// back; the next run sees that the lock's process is gone (or is another process that got the same pid: the start time
// differs) and takes it over. While the lock's process is alive, a second run refuses to start and says which run holds
// it. Processes a run starts inherit VOXCOACH_RUN_LOCK and run inside it (a runner's suites, rule1's tour10).
//
// The limits: about 2× a run's normal time, from run-limits.json (minutes; normal = the longest clean run in the logs).
// Past its limit a run, or a step inside one, is a FAIL "timed out": the run, its browsers and everything else it
// started are killed. Test accounts are still deleted: by the run's exit hook on a SIGTERM, otherwise by the
// testAccounts watchdog, which is not part of the run's process tree.
//
// In a script:  require('../runguard').auto()              lock + the script's limit (testAccounts.js does this)
//               await G.step('sign-up', 60, () => …)       a step with its own limit, in seconds
// From a shell: node scripts/runguard.js run --name <name> [--limit-min <m>] -- <command…>
//               node scripts/runguard.js status            who holds the lock
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync, spawn } = require('child_process');

const LOCK = path.join(os.tmpdir(), 'voxcoach-verify.lock');
const LIMITS = JSON.parse(fs.readFileSync(path.join(__dirname, 'run-limits.json'), 'utf8')).minutes;
const EXIT_TIMEOUT = 124, EXIT_LOCKED = 75;

const startOf = pid => { try { return execFileSync('ps', ['-o', 'lstart=', '-p', String(pid)], { encoding: 'utf8' }).trim(); } catch { return null; } };
const read = () => { try { return JSON.parse(fs.readFileSync(LOCK, 'utf8')); } catch { return null; } };
// the lock's run is alive: its pid is running and started when the lock says (not a later process with a reused pid)
const holds = h => !!(h && h.pid && startOf(h.pid) && startOf(h.pid) === h.start);

let mine = false;
function release() {
  if (!mine) return; mine = false;
  const h = read(); if (h && h.pid === process.pid) fs.rmSync(LOCK, { force: true });
}
function onSignals() { // so a signal still runs the exit hooks (the lock, the test accounts)
  for (const [s, code] of [['SIGINT', 130], ['SIGTERM', 143], ['SIGHUP', 129]]) if (!process.listenerCount(s)) process.on(s, () => process.exit(code));
}

// Takes the lock for this process, or exits (75) if another run holds it. Inside a run that holds it: nothing to take.
function acquire(name) {
  const inherited = process.env.VOXCOACH_RUN_LOCK, h0 = read();
  if (inherited && h0 && String(h0.pid) === inherited && holds(h0)) return false;
  for (let i = 0; i < 3; i++) {
    try {
      fs.writeFileSync(LOCK, JSON.stringify({ pid: process.pid, start: startOf(process.pid), name, cwd: process.cwd(), since: new Date().toISOString() }), { flag: 'wx' });
      mine = true; process.env.VOXCOACH_RUN_LOCK = String(process.pid);
      process.on('exit', release); onSignals();
      return true;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      const h = read();
      if (holds(h)) {
        console.error(`REFUSED: another verify run holds the lock: "${h.name}" (pid ${h.pid}, since ${h.since}). One run at a time.`);
        process.exit(EXIT_LOCKED);
      }
      fs.rmSync(LOCK, { force: true }); // its run is gone (killed outright): taken over
    }
  }
  throw new Error('could not take the verify lock');
}

// Every process below root (root included unless keepRoot), killed at once with SIGKILL: node, its browsers (Playwright
// starts them in their own process group, so a group kill would miss them), a Supabase CLI call in flight.
function killTree(root, keepRoot) {
  let rows = [];
  try { rows = execFileSync('ps', ['-A', '-o', 'pid=,ppid='], { encoding: 'utf8' }).trim().split('\n').map(l => l.trim().split(/\s+/).map(Number)); } catch {}
  const kids = new Map(); for (const [p, pp] of rows) { if (!kids.has(pp)) kids.set(pp, []); kids.get(pp).push(p); }
  const all = [], q = [root];
  while (q.length) { const p = q.shift(); all.push(p); q.push(...(kids.get(p) || [])); }
  for (const p of all.reverse()) if (p !== process.pid && !(keepRoot && p === root)) { try { process.kill(p, 'SIGKILL'); } catch {} }
}

// A FAIL "timed out": printed, everything this process started is killed, and the process exits 124 (its exit hooks run:
// the lock is given back, the test accounts are deleted).
function timedOut(what) {
  console.log(`\n✗ FAIL: ${what} timed out`);
  killTree(process.pid, true);
  process.exit(EXIT_TIMEOUT);
}

// The script's own limit: VOXCOACH_LIMIT_MIN (a runner sets it), else run-limits.json by the script's file name.
function limit(minutes, what) {
  if (!(minutes > 0)) return;
  const t = setTimeout(() => timedOut(`${what} (its limit, ${minutes} min)`), minutes * 60000); t.unref();
}

// A step with its own limit, in seconds. Past it: timedOut (the run ends; a hung page can't be trusted for the rest).
async function step(name, seconds, fn) {
  let t;
  const over = new Promise(r => { t = setTimeout(r, seconds * 1000, 'TIMEOUT'); });
  try {
    const p = Promise.resolve().then(fn);
    const res = await Promise.race([p.then(v => ({ v })), over]);
    if (res === 'TIMEOUT') timedOut(`step "${name}" (its limit, ${seconds} s)`);
    return res.v;
  } finally { clearTimeout(t); }
}

// For a script run directly (node scripts/x/y.js …) or by a runner: the lock and the script's limit.
let autoDone = false;
function auto() {
  if (autoDone || !require.main) return; autoDone = true;
  const file = require.main.filename, base = path.basename(file, '.js');
  const name = `${path.relative(path.resolve(__dirname, '..'), file)} ${process.argv.slice(2).join(' ')}`.trim();
  acquire(name);
  const env = Number(process.env.VOXCOACH_LIMIT_MIN); delete process.env.VOXCOACH_LIMIT_MIN; // a run it starts goes by its own limit
  limit(env > 0 ? env : LIMITS[base], name);
}

module.exports = { LOCK, LIMITS, acquire, release, limit, step, killTree, timedOut, auto, holds, read };

// ---- the shell form
if (require.main === module) {
  const [cmd, ...rest] = process.argv.slice(2);
  if (cmd === 'status') { const h = read(); console.log(holds(h) ? `held by "${h.name}" (pid ${h.pid}, since ${h.since})` : 'free'); process.exit(0); }
  if (cmd !== 'run') { console.error('usage: runguard.js run --name <name> [--limit-min <m>] -- <command…> | status'); process.exit(2); }
  const dd = rest.indexOf('--'); if (dd < 0 || dd === rest.length - 1) { console.error('runguard: no command after --'); process.exit(2); }
  const opt = n => { const i = rest.indexOf(n); return i >= 0 && i < dd ? rest[i + 1] : null; };
  const name = opt('--name') || rest.slice(dd + 1).join(' ');
  const mins = opt('--limit-min') != null ? Number(opt('--limit-min')) : LIMITS[name];
  acquire(name);
  const env = { ...process.env, VOXCOACH_RUN_LOCK: process.env.VOXCOACH_RUN_LOCK };
  if (mins > 0) env.VOXCOACH_LIMIT_MIN = String(mins); else delete env.VOXCOACH_LIMIT_MIN;
  const child = spawn(rest[dd + 1], rest.slice(dd + 2), { stdio: 'inherit', env });
  let timer = null;
  if (mins > 0) timer = setTimeout(() => {
    console.log(`\n✗ FAIL: ${name} timed out (its limit, ${mins} min): killed with its browsers`);
    killTree(child.pid); process.exitCode = EXIT_TIMEOUT;
  }, mins * 60000);
  for (const s of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(s, () => { killTree(child.pid); process.exit(143); });
  child.on('exit', (code, sig) => { if (timer) clearTimeout(timer); if (process.exitCode !== EXIT_TIMEOUT) process.exitCode = code == null ? 1 : code; release(); });
}
