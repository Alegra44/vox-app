// Phase 4a guard (PHASE4A.md §1a): the display changes, the scoring doesn't. Every singing tool changed in 4a (tools.js:
// Interval Match, Scale Run, Custom Challenge, Ear → Voice → Ear, Sing It 5 Ways, Hear Your Mistake's sing-back, Range
// Finder, Breath Trainer) on master and on the branch, in the same run, with the fake mic singing the steady A4 and the
// same note 40 cents sharp (stage.js), 3 runs per side, sides alternating. Signed in (one throwaway account, deleted at
// exit), local builds, production backend.
// Every number a result is made of, compared: each captureAccuracyForTarget result (score, attack, landing, cents,
// confidence %, heard), the tool's own numbers (its big score, the steps heard), Range Finder's captured notes and voice
// type, Breath's overall, seconds held and consistency.
// Gate: per number, the median of the runs on the branch is within ±2 of master's (text values equal).
// Phase 4b (PHASE4B.md §1a): the seven take tools with their own displays (tools4b.js: One Take, Mirror, Rhythm, Register
// Drills, Vibrato, Voice Quality, Emotion Mode), every number of each result from the tool's own state and its display
// (tools4b.js nums: scores, sub-scores, rate, depth, consistency, HNR, brightness, per-note and per-beat values, the
// comparisons). Each with the steady and sharp notes, and its own stimuli besides: Rhythm "onbeat" (a short sung onset
// of the steady note on each scored beat, synthmic.js) and "late60" (the same, 60 ms late); Vibrato and Voice Quality
// "vibrato" (a 5.5 Hz ±40 ct vibrato tone on A4, vq-verify/gen.py); Emotion Mode "louder" (its second take 6 dB louder,
// synthmic.js). One Take runs on a fresh test account each run (one take a day). Run them with --tools onetake,mirror,…;
// with no --stims, each tool runs with every stimulus it lists.
// Usage: node scripts/design-verify/scores.js [--base master] [--runs 3] [--tools interval,scale,…] [--stims steady,sharp]
//   [--branch-url https://…]: the branch side is that site (production after a deploy) instead of the working copy
//   [--resume <json>]   (keeps the runs already in that file)
const path = require('path'), fs = require('fs');
const C = require('./common'), S = require('./stage'), T = require('./tools'), T4 = require('./tools4b'), SYN = require('./synthmic');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master', RUNS = +(arg('--runs') || 3);
const ONLY = arg('--tools') ? arg('--tools').split(',') : null;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join(__dirname, 'logs', `scores-${stamp}`); fs.mkdirSync(path.dirname(OUT), { recursive: true });
const logf = fs.createWriteStream(OUT + '.log'); const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const TOOLS = [...T.SUNG, ...T4.TAKE].filter(t => ONLY ? ONLY.includes(t.key) : !t.stims); // the 4a tools unless --tools names others
const toolStims = t => t.stims || ['steady', 'sharp'];
const STIMS = arg('--stims') ? arg('--stims').split(',') : [...new Set(TOOLS.flatMap(toolStims))];
const toolsFor = stim => TOOLS.filter(t => toolStims(t).includes(stim));
// the stimuli beyond stage.js's files: the vibrato tone (a file), and the synthetic mic's (synthmic.js)
const VIB_FILE = path.join(require('../testdata').TESTDATA, 'design-vib55.wav');
function ensureVib() {
  if (fs.existsSync(VIB_FILE)) return;
  require('child_process').execFileSync('python3', [path.join(C.ROOT, 'scripts/vq-verify/gen.py'), VIB_FILE,
    JSON.stringify({ f0: 440, harmonics: [1, 0.5, 0.33, 0.25], vibRate: 5.5, vibCents: 40, seconds: 40, seed: 3 })], { encoding: 'utf8' });
}
const SYNTH = { onbeat: { level: 0, late: 0 }, late60: { level: 0, late: 60 }, louder: { level: 1 } };
const stimFile = stim => stim === 'vibrato' ? VIB_FILE : S.STIM[stim];
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

async function oneRun(b, dir, state, tools, stim) {
  const syn = SYNTH[stim];
  const { ctx, page, errors } = await C.openPage(b, { dir, theme: 'light', storageState: state,
    prepare: syn ? c => SYN.attach(c, S.STIM.steady, { level: syn.level }) : undefined });
  const out = {};
  try {
    await C.clearOverlays(page); await page.evaluate(T.CAPTURE_TAP); await S.warmMic(page);
    if (syn) await page.evaluate(late => { window.__rhythmLate = late || 0; }, syn.late);
    for (const tool of tools) {
      await tool.open(page); await C.sleep(300);
      await page.evaluate(() => { window.__caps = []; });
      const { started, done } = await T.runTake(page, tool);
      await C.sleep(800);
      if (tool.nums) { // a 4b tool: its numbers from its own state and display (tools4b.js)
        const nums = await page.evaluate(`(${tool.nums})()`); await T.restoreRange(page);
        out[tool.key] = { started, done, nums };
      } else {
        const r = await T.readTake(page, tool); await T.restoreRange(page);
        out[tool.key] = { started, done, raw: r, nums: flatten(tool, r) };
      }
      await page.evaluate(() => stopAllActiveSessions()); await C.sleep(300);
    }
  } finally { out.__errors = errors.slice(); await ctx.close(); }
  return out;
}
// a throwaway account's session (deleted at exit)
async function freshState(dir) {
  const b0 = await C.chromium.launch(); const { ctx, page } = await C.openPage(b0, { dir }); await C.signUp(page, 'dvsc', 'Score Check');
  const st = await ctx.storageState(); await ctx.close(); await b0.close(); return st;
}

const median = a => { const v = a.filter(x => x !== null && x !== undefined); if (!v.length) return null; if (typeof v[0] === 'string') { const c = {}; v.forEach(x => c[x] = (c[x] || 0) + 1); return Object.entries(c).sort((x, y) => y[1] - x[1])[0][0]; } const s = v.slice().sort((x, y) => x - y); return s.length % 2 ? s[s.length >> 1] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2; };

(async () => {
  S.ensureStimuli(); if (STIMS.includes('vibrato')) ensureVib();
  const BRANCH_URL = arg('--branch-url'), dirs = { master: C.buildDir(BASE), branch: BRANCH_URL || C.buildDir(null) };
  const data = arg('--resume') ? JSON.parse(fs.readFileSync(arg('--resume'))) : { base: BASE, runs: RUNS, tools: TOOLS.map(t => t.key), stims: {} };
  log(`scores ${stamp}  ${BASE} vs branch (${BRANCH_URL || 'working copy'})  ${RUNS} runs per side  stimuli ${STIMS.join(', ')}  tools ${TOOLS.map(t => t.key).join(', ')}`);
  // the same account on the site: its session is in the local origin's localStorage (same backend)
  const onSite = st => { if (BRANCH_URL) st.origins = [...st.origins, ...st.origins.map(o => ({ ...o, origin: new URL(BRANCH_URL).origin }))]; return st; };
  const state = onSite(await freshState(dirs.master));
  let fail = 0;
  try {
    for (const stim of STIMS) {
      const st = data.stims[stim] = data.stims[stim] || { master: [], branch: [] };
      const tools = toolsFor(stim); if (!tools.length) continue;
      const b = SYNTH[stim] ? await SYN.launch() : await S.launchMic(stimFile(stim));
      try {
        for (let k = 0; k < RUNS; k++) for (const side of k % 2 ? ['branch', 'master'] : ['master', 'branch']) {
          if (st[side].length > k) continue;
          const t0 = Date.now(); const r = await oneRun(b, dirs[side], tools.some(t => t.fresh) ? onSite(await freshState(dirs.master)) : state, tools, stim);
          st[side].push(r);
          log(`${stim} ${side.padEnd(6)} #${k + 1} (${Math.round((Date.now() - t0) / 1000)} s): ` + tools.map(t => `${t.key} ${r[t.key].done ? '' : '(not done) '}${JSON.stringify(Object.fromEntries(Object.entries(r[t.key].nums).filter(([n]) => /score$|big|overall|type|^pitch$|accuracy$|average|rate|^ok$|%$/.test(n))))}`).join(' · ') + (r.__errors.length ? ` · page errors: ${r.__errors.slice(0, 2).join(' | ')}` : ''));
          fs.writeFileSync(OUT + '.json', JSON.stringify(data));
        }
      } finally { await b.close(); }
    }
    // the table
    for (const stim of STIMS) {
      log(`\n== ${stim}: median of ${RUNS} runs, master → branch (gate ±${TOL})`);
      for (const tool of toolsFor(stim)) {
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
