// Phase 4a guard (PHASE4A.md §1a): the display changes, the scoring doesn't. Every singing tool changed in 4a (tools.js:
// Interval Match, Scale Run, Custom Challenge, Ear → Voice → Ear, Sing It 5 Ways, Hear Your Mistake's sing-back, Range
// Finder, Breath Trainer) on master and on the branch, in the same run, with the fake mic singing the steady A4 and the
// same note 40 cents sharp (stage.js), 3 runs per side, sides alternating. Signed in (one throwaway account, deleted at
// exit), local builds, production backend.
// Every number a result is made of, compared: each captureAccuracyForTarget result (score, attack, landing, cents,
// confidence %, heard), the tool's own numbers (its big score, the steps heard), Range Finder's captured notes and voice
// type, Breath's overall, seconds held and consistency.
// Gate: per number, the median of the runs on the branch is within ±2 of master's (text values equal).
// Usage: node scripts/design-verify/scores.js [--base master] [--runs 3] [--tools interval,scale,…] [--stims steady,sharp]
//   [--resume <json>]   (keeps the runs already in that file)
const path = require('path'), fs = require('fs');
const C = require('./common'), S = require('./stage'), T = require('./tools');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master', RUNS = +(arg('--runs') || 3);
const ONLY = arg('--tools') ? arg('--tools').split(',') : null, STIMS = (arg('--stims') || 'steady,sharp').split(',');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join(__dirname, 'logs', `scores-${stamp}`); fs.mkdirSync(path.dirname(OUT), { recursive: true });
const logf = fs.createWriteStream(OUT + '.log'); const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const TOOLS = T.SUNG.filter(t => !ONLY || ONLY.includes(t.key));
const TOL = 2;

// a take's numbers, flattened to name → value
function flatten(tool, r) {
  const o = {}, num = s => { const m = String(s ?? '').match(/-?\d+(?:\.\d+)?/); return m ? +m[0] : null; };
  r.caps.forEach((c, i) => {
    const p = r.caps.length > 1 ? `take${i + 1}.` : '';
    o[p + 'score'] = c.accuracy; o[p + 'heard'] = c.heard ? 1 : 0; o[p + 'confidence%'] = c.conf;
    if (c.attack !== null) o[p + 'attack'] = c.attack;
    if (c.landing !== null) o[p + 'landing'] = c.landing;
    if (c.cents !== null) o[p + 'cents'] = c.cents;
    if (c.noVoice) o[p + 'noVoice'] = 1;
  });
  if (r.caps.length > 1) o['steps heard'] = r.caps.filter(c => c.heard).length;
  const d = r.display || {};
  if ('big' in d) o['result: big number'] = num(d.big);
  if (tool.key === 'eve') { o['result: step 2'] = num(d.first); o['result: step 5'] = num(d.second); }
  if (tool.key === 'five' || tool.key === 'custom') (d.rows || '').split(',').forEach((v, i) => { o[`result: row ${i + 1}`] = num(v); });
  if (tool.key === 'interval') { o['result: attack'] = num(d.attack); o['result: landing'] = num(d.landing); }
  if (r.range) { o['range: low midi'] = r.range.low; o['range: high midi'] = r.range.high; o['range: voice type'] = r.range.type; o['range: semitones'] = r.range.high - r.range.low; }
  if (r.breath) { o['breath: overall'] = r.breath.overall; o['breath: seconds'] = r.breath.duration; o['breath: consistency'] = r.breath.consistency; }
  return o;
}

async function oneRun(b, dir, state, tools) {
  const { ctx, page, errors } = await C.openPage(b, { dir, theme: 'light', storageState: state });
  const out = {};
  try {
    await C.clearOverlays(page); await page.evaluate(T.CAPTURE_TAP); await S.warmMic(page);
    for (const tool of tools) {
      await tool.open(page); await C.sleep(300);
      await page.evaluate(() => { window.__caps = []; });
      const { started, done } = await T.runTake(page, tool);
      await C.sleep(800);
      const r = await T.readTake(page, tool); await T.restoreRange(page);
      out[tool.key] = { started, done, raw: r, nums: flatten(tool, r) };
      await page.evaluate(() => stopAllActiveSessions()); await C.sleep(300);
    }
  } finally { out.__errors = errors.slice(); await ctx.close(); }
  return out;
}

const median = a => { const v = a.filter(x => x !== null && x !== undefined); if (!v.length) return null; if (typeof v[0] === 'string') { const c = {}; v.forEach(x => c[x] = (c[x] || 0) + 1); return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; } const s = v.slice().sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

(async () => {
  S.ensureStimuli();
  const dirs = { master: C.buildDir(BASE), branch: C.buildDir(null) };
  const data = arg('--resume') ? JSON.parse(fs.readFileSync(arg('--resume'))) : { base: BASE, runs: RUNS, tools: TOOLS.map(t => t.key), stims: {} };
  log(`scores ${stamp}  ${BASE} vs branch (working copy)  ${RUNS} runs per side  stimuli ${STIMS.join(', ')}  tools ${TOOLS.map(t => t.key).join(', ')}`);
  let state;
  { const b0 = await C.chromium.launch(); const { ctx, page } = await C.openPage(b0, { dir: dirs.branch }); await C.signUp(page, 'dvsc', 'Score Check'); state = await ctx.storageState(); await ctx.close(); await b0.close(); }
  let fail = 0;
  try {
    for (const stim of STIMS) {
      const st = data.stims[stim] = data.stims[stim] || { master: [], branch: [] };
      const b = await S.launchMic(S.STIM[stim]);
      try {
        for (let k = 0; k < RUNS; k++) for (const side of k % 2 ? ['branch', 'master'] : ['master', 'branch']) {
          if (st[side].length > k) continue;
          const t0 = Date.now(); const r = await oneRun(b, dirs[side], state, TOOLS);
          st[side].push(r);
          log(`${stim} ${side.padEnd(6)} #${k + 1} (${Math.round((Date.now() - t0) / 1000)} s): ` + TOOLS.map(t => `${t.key} ${r[t.key].done ? '' : '(not done) '}${JSON.stringify(Object.fromEntries(Object.entries(r[t.key].nums).filter(([n]) => /score$|big|overall|type/.test(n))))}`).join(' · ') + (r.__errors.length ? ` · page errors: ${r.__errors.slice(0, 2).join(' | ')}` : ''));
          fs.writeFileSync(OUT + '.json', JSON.stringify(data));
        }
      } finally { await b.close(); }
    }
    // the table
    for (const stim of STIMS) {
      log(`\n== ${stim}: median of ${RUNS} runs, master → branch (gate ±${TOL})`);
      for (const tool of TOOLS) {
        const names = [...new Set(['master', 'branch'].flatMap(s => data.stims[stim][s].flatMap(r => Object.keys(r[tool.key].nums))))];
        log(`-- ${tool.name}`);
        for (const n of names) {
          const m = median(data.stims[stim].master.map(r => r[tool.key].nums[n])), b = median(data.stims[stim].branch.map(r => r[tool.key].nums[n]));
          const ok = typeof m === 'string' || typeof b === 'string' ? m === b : (m === null && b === null) || (m !== null && b !== null && Math.abs(b - m) <= TOL);
          if (!ok) fail++;
          const runs = s => data.stims[stim][s].map(r => r[tool.key].nums[n] ?? '—').join('/');
          log(`   ${ok ? '✓' : '✗'} ${n.padEnd(26)} ${String(m ?? '—').padStart(7)} → ${String(b ?? '—').padEnd(7)} (master ${runs('master')}; branch ${runs('branch')})`);
        }
        const notDone = ['master', 'branch'].flatMap(s => data.stims[stim][s].map((r, i) => r[tool.key].done && r[tool.key].started ? null : `${s} #${i + 1}`)).filter(Boolean);
        if (notDone.length) { fail++; log(`   ✗ take did not start or finish: ${notDone.join(', ')}`); }
      }
    }
  } finally {
    log(`\nGATE: ${fail ? fail + ' differences beyond ±' + TOL : 'every median within ±' + TOL}`);
    log(`log: ${path.relative(C.ROOT, OUT)}.log  json: ${path.relative(C.ROOT, OUT)}.json`);
    process.exitCode = fail ? 1 : 0;
    C.cleanup();
  }
})();
