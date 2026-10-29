// Phase 4b guard (PHASE4B.md §1b): the three live tools (tools4b.js: Register Coach, Live Feedback, Resonance) show the
// same readings on master and on the branch. Each run: a page signed in (one throwaway account, deleted at exit), the
// fake mic singing (stage.js: the steady A4, or the same note 40 cents sharp), the tool started through its own button
// and its readout sampled at 4, 5, 6 and 7 s after the page opened the mic (tools4b.js readout: Register Coach's note, chest score, zone, pushing and
// clean crossing; Live Feedback's four rows' states and the pitch row's cents; Resonance's zone, steadiness and ripple),
// then stopped. 3 runs per side, sides alternating, local builds, production backend.
// Register Coach on master reads nothing on a fresh page (its UI waits for the analyser only initAudio sets), so there
// the Tuner is started and stopped first in the same page; on the branch it runs on a fresh page (fix 2.8).
// The fake mic plays its file from the moment the mic opens, and the steady file's tone colour moves (Register Coach's
// chest score swings between about 15 and 70 over seconds), so the sample times count from getUserMedia, not from Start:
// both sides read the same part of the file whether the Tuner opened the mic first or the tool did.
// Gate: per reading and moment, the median on the branch within ±2 of master's (states and notes equal).
// 4b.1 (the user's decision 2): Resonance's ripple and steadiness are compared by the range of the three runs: the
// branch's min–max overlaps master's (±2). Ripple moves in steps of 9 and flips between values on master itself.
// Both stimuli turn quiet and dark at 5.7–6.4 s (and again near 7.5 s): a sample inside that change is tens of ms
// from a very different reading; --at picks other times (ms after the mic opened).
// Usage: node scripts/design-verify/live.js [--base master] [--runs 3] [--at 4000,5000,6000,7000] [--tools register,livefeedback,resonance] [--stims steady,sharp]
const path = require('path'), fs = require('fs');
const C = require('./common'), S = require('./stage'), T4 = require('./tools4b');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master', RUNS = +(arg('--runs') || 3), TOL = 2, AT = (arg('--at') || '4000,5000,6000,7000').split(',').map(Number); // ms after the mic opened
// in the page, before the app: when the mic stream first arrives
const GUM = () => { const md = navigator.mediaDevices; if (!md) return; const g = md.getUserMedia.bind(md);
  md.getUserMedia = async c => { const st = await g(c); if (!window.__gumAt) window.__gumAt = performance.now(); return st; }; };
const RANGED = ['ripple', 'steadiness']; // Resonance's, compared by range (4b.1)
const ONLY = arg('--tools') ? arg('--tools').split(',') : null, STIMS = (arg('--stims') || 'steady,sharp').split(',');
const TOOLS = T4.LIVE.filter(t => !ONLY || ONLY.includes(t.key));
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join(__dirname, 'logs', `live-${stamp}`); fs.mkdirSync(path.dirname(OUT), { recursive: true });
const logf = fs.createWriteStream(OUT + '.log'); const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };

// one tool on a fresh page: [{ at, ...readout }]
async function oneRun(b, dir, state, tool, side) {
  const { ctx, page, errors } = await C.openPage(b, { dir, theme: 'light', storageState: state, prepare: c => c.addInitScript(GUM) });
  try {
    await C.clearOverlays(page);
    if (tool.key === 'register' && side === 'master') { await S.startTuner(page); await C.sleep(800); await S.stopTuner(page); await C.sleep(500); }
    await tool.open(page); await C.sleep(300);
    await tool.act(page);
    const started = await page.waitForFunction(`(${tool.busy})()`, null, { timeout: 8000 }).then(() => true, () => false);
    // the readouts at fixed times from the moment the mic opened (the fake file's own clock)
    const samples = await page.evaluate(async ({ src, at }) => {
      const f = new Function('return (' + src + ')()'), t0 = window.__gumAt ?? performance.now(), out = [];
      for (const ms of at) { while (performance.now() - t0 < ms) await new Promise(r => setTimeout(r, 5)); out.push({ at: ms, ...f() }); }
      return out;
    }, { src: tool.readout.toString(), at: AT });
    await tool.stop(page); await C.sleep(400);
    const stopped = await page.evaluate(`!(${tool.busy})()`);
    return { started, stopped, samples, errors: errors.slice() };
  } finally { await page.evaluate(() => stopAllActiveSessions()).catch(() => {}); await ctx.close(); }
}

const median = a => { const v = a.filter(x => x !== null && x !== undefined); if (!v.length) return null; if (typeof v[0] === 'string') { const c = {}; v.forEach(x => c[x] = (c[x] || 0) + 1); return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; } const s = v.slice().sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

(async () => {
  S.ensureStimuli();
  const dirs = { master: C.buildDir(BASE), branch: C.buildDir(null) };
  log(`live ${stamp}  ${BASE} vs branch (working copy)  ${RUNS} runs per side  stimuli ${STIMS.join(', ')}  tools ${TOOLS.map(t => t.key).join(', ')}  samples at ${AT.join(', ')} ms`);
  let state;
  { const b0 = await C.chromium.launch(); const { ctx, page } = await C.openPage(b0, { dir: dirs.master }); await C.signUp(page, 'dvlive', 'Live Check'); state = await ctx.storageState(); await ctx.close(); await b0.close(); }
  const data = {}; let fail = 0;
  try {
    for (const stim of STIMS) {
      const b = await S.launchMic(S.STIM[stim]);
      try {
        for (const tool of TOOLS) {
          const st = data[`${stim} ${tool.key}`] = { master: [], branch: [] };
          for (let k = 0; k < RUNS; k++) for (const side of k % 2 ? ['branch', 'master'] : ['master', 'branch']) {
            const r = await oneRun(b, dirs[side], state, tool, side); st[side].push(r);
            log(`${stim} ${tool.key} ${side.padEnd(6)} #${k + 1}: ${r.started ? '' : '(did not start) '}${r.stopped ? '' : '(did not stop) '}${r.samples.map(s => JSON.stringify(Object.fromEntries(Object.entries(s).filter(([n]) => n !== 'at')))).join(' ')}${r.errors.length ? ' · page errors: ' + r.errors.slice(0, 2).join(' | ') : ''}`);
            fs.writeFileSync(OUT + '.json', JSON.stringify(data));
          }
        }
      } finally { await b.close(); }
    }
    for (const stim of STIMS) for (const tool of TOOLS) {
      const st = data[`${stim} ${tool.key}`];
      log(`\n== ${stim} · ${tool.name}: median of ${RUNS} runs, master → branch (gate ±${TOL})`);
      const names = [...new Set(['master', 'branch'].flatMap(s => st[s].flatMap(r => r.samples.flatMap(x => Object.keys(x)))))].filter(n => n !== 'at');
      for (const [i, at] of AT.entries()) for (const n of names) {
        const vals = s => st[s].map(r => r.samples[i] ? r.samples[i][n] : null);
        const m = median(vals('master')), b = median(vals('branch'));
        const byRange = tool.key === 'resonance' && RANGED.includes(n), num = s => vals(s).filter(v => typeof v === 'number');
        const span = s => num(s).length ? [Math.min(...num(s)), Math.max(...num(s))] : null, mr = byRange && span('master'), br = byRange && span('branch');
        const ok = byRange ? (!mr && !br) || (!!mr && !!br && br[0] <= mr[1] + TOL && br[1] >= mr[0] - TOL)
          : typeof m === 'string' || typeof b === 'string' ? m === b : (m === null && b === null) || (m !== null && b !== null && Math.abs(b - m) <= TOL);
        if (!ok) fail++;
        log(`   ${ok ? '✓' : '✗'} ${(at / 1000 + ' s ' + n).padEnd(26)} ${String(m ?? '—').padStart(7)} → ${String(b ?? '—').padEnd(7)} (master ${vals('master').map(v => v ?? '—').join('/')}; branch ${vals('branch').map(v => v ?? '—').join('/')})${byRange ? `  [ranges ${mr ? mr.join('–') : '—'} / ${br ? br.join('–') : '—'}]` : ''}`);
      }
      const bad = ['master', 'branch'].flatMap(s => st[s].map((r, i) => r.started && r.stopped ? null : `${s} #${i + 1}`)).filter(Boolean);
      if (bad.length) { fail++; log(`   ✗ did not start or stop: ${bad.join(', ')}`); }
    }
  } finally {
    log(`\nGATE: ${fail ? fail + ' differences beyond ±' + TOL : 'every median within ±' + TOL}`);
    log(`log: ${path.relative(C.ROOT, OUT)}.log  json: ${path.relative(C.ROOT, OUT)}.json`);
    process.exitCode = fail ? 1 : 0;
    C.cleanup();
  }
})();
