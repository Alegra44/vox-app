// Speaker bleed, with nobody singing: the app's own playback fed back into its own mic path. The page's getUserMedia
// returns a "room": whatever the page sends to its speakers (every connection to an AudioContext's destination is also
// tapped), times a speaker-to-mic coupling, and nothing else. No echo cancellation (a synthetic stream gets none), so
// this is harsher than a real laptop with it on. Couplings: −20 dB (a laptop's own speakers and mic) and −10 dB (worst
// case). Every feature that plays a guide note while the mic listens, plus the two the spec names:
//   Harmony Arena, piano guide on (the guide is your own part's note: bleed reads as in tune)
//   Harmony Arena, Distraction Mode on (guide-level notes a tritone away)
//   Scale Run, professional: its capture starts while its own reference is still sounding (steps heard)
//   Entrance & Cutoff Trainer, entrances: bleed hits ("Speaker bleed detected" at 2) and entrances heard
//   Choir World / Harmony Memory: stage 1 (your part as a full guide) and stage 6 (your starting note over the
//   count-in, then silence): notes judged held
// A phantom note: a Harmony Arena note landed (≥ 75, counted in Part Accuracy) or a Harmony Memory note held, with
// nobody singing. Before (LB_BEFORE, default master) at its own levels; after (the working tree) with the guide level
// as built, then the harmonic tone swept from −23.4 to −12 dBFS RMS in place of playGuideTone, to find the highest
// level with 0 phantom notes. (2026-10-05: none; even master's level has some, so guides stay master's sine.)
// LB_URL=<deployed url>: that page alone, as built (no sweep), signed out.
// LB_SCEN=scale,custom,rift,harmony,tt,hm runs only those groups (default all).
// Usage: [LB_BEFORE=<ref>] [LB_ONLY=before|after] [LB_URL=<url>] [LB_SCEN=…] node scripts/vq-verify/loopback.js
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), REF = process.env.LB_BEFORE || 'master', URL_ = process.env.LB_URL, LOGDIR = path.join(__dirname, 'logs');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `loopback-${URL_ ? 'prod' : 'local'}-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const COUPLINGS = [[-20, 0.1], [-10, 0.316]];
// guide gains for the harmonic tone (RMS 0.735 × gain, measured with its ramps by levels.js: 0.096 → −23.4 dBFS)
const GUIDE_DB = [-23.4, -20, -18, -16, -14, -12], guideGain = db => +(0.096 * Math.pow(10, (db + 23.4) / 20)).toFixed(4);

const INIT = () => {
  window.__coupling = 0.1;
  const ac = new AudioContext(), mix = ac.createGain();
  window.__room = { ac, mix };
  const realConnect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function (dest, ...a) {
    const r = realConnect.call(this, dest, ...a);
    if (dest instanceof AudioDestinationNode && this.context !== ac) {
      const c = this.context;
      if (!c.__tap) {
        const tap = c.createGain(), md = c.createMediaStreamDestination(); realConnect.call(tap, md);
        const src = ac.createMediaStreamSource(md.stream), cg = ac.createGain(); cg.gain.value = window.__coupling;
        realConnect.call(src, cg); realConnect.call(cg, mix); c.__tap = tap; window.__cg = cg;
      }
      realConnect.call(this, c.__tap);
    }
    return r;
  };
  navigator.mediaDevices.getUserMedia = async () => { await ac.resume(); const d = ac.createMediaStreamDestination(); realConnect.call(mix, d); return d.stream; };
};

async function open(b, side, coupling) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  if (!URL_) await ctx.route('http://localhost:8765/**', r => {
    const p = new URL(r.request().url()).pathname.slice(1) || 'index.html', type = p.endsWith('.js') ? 'text/javascript' : 'text/html';
    if (side === 'before') return r.fulfill({ body: execFileSync('git', ['show', `${REF}:deploy/${p}`], { cwd: ROOT, maxBuffer: 1 << 28 }), contentType: type });
    r.fulfill({ path: path.join(ROOT, 'deploy', p), contentType: type });
  });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(URL_ || 'http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await page.waitForTimeout(200); }
  await page.evaluate(async c => {
    requireProFeature = () => true; blockExercise = () => false; requireChoirWorld = () => true;
    window.__coupling = c; selectSong('hymn');
    await initAudio(); if (window.__cg) window.__cg.gain.value = c;
    document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]')?.click();
  }, coupling);
  await page.waitForTimeout(1500);
  return { ctx, page, errors };
}

// Harmony Arena, nobody singing; guide or distraction on; on the after side, the guide gain set for the run
async function harmony(page, { guide, distraction, gain }) {
  return page.evaluate(async ({ guide, distraction, gain }) => {
    if (gain != null) playGuideTone = async (f, d = 0.55, del = 0) => { await initAudioOnly(); scheduleTone(f, d, del, gain, true); };
    harmonySelectedLevel = 1; harmonySelectedPart = 'Alto'; harmonyPianoGuideOn = guide; harmonyDistractionOn = distraction; harmonyMemoryModeOn = false;
    await startHarmonyArena();
    while (harmonyActive) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 500));
    const res = harmonyNoteResults.map(r => r ?? null);
    return { heard: harmonyHeardFrames, total: harmonyTotalFrames, results: res, landed: res.filter(r => r !== null && r >= 75).length,
      scored: res.filter(r => r !== null).length, timing: document.getElementById('harmonyTimingVal').textContent, part: document.getElementById('harmonyPartVal').textContent };
  }, { guide, distraction, gain });
}
// Scale Run, professional, nobody singing: it starts listening while its own reference tone is still sounding
// (0.5 s tone, 280 ms gap), so a louder reference can be heard as the singer
async function scaleRun(page, level) {
  return page.evaluate(async level => {
    setExerciseLevel(level); window.__steps = [];
    if (!window.__capWrapped) { const cap = captureAccuracyForTarget; window.__capWrapped = true; captureAccuracyForTarget = async (...a) => { const r = await cap(...a); __steps.push(r); return r; }; }
    const btn = document.getElementById('scaleStartBtn'); btn.click();
    await new Promise(r => setTimeout(r, 300));
    while (btn.disabled) await new Promise(r => setTimeout(r, 200));
    return { steps: __steps.length, heard: __steps.filter(r => r.heard).length, scores: __steps.map(r => r.accuracy), shown: document.getElementById('scaleAccuracyVal').textContent,
      feedback: document.getElementById('scaleFeedback')?.textContent || '' };
  }, level);
}
// Custom exercise (its Start button, 5 notes) and Pitch Rift (its round function, ~12 s): each plays a reference and
// starts listening a short gap after it
async function custom(page) {
  return page.evaluate(async () => {
    window.__steps = [];
    if (!window.__capWrapped) { const cap = captureAccuracyForTarget; window.__capWrapped = true; captureAccuracyForTarget = async (...a) => { const r = await cap(...a); __steps.push(r); return r; }; }
    customSequence = [57, 59, 60, 62, 64];
    document.getElementById('customResultCard').style.display = 'none';
    document.getElementById('customStartBtn').click();
    const t0 = performance.now(); while (document.getElementById('customResultCard').style.display !== 'block' && performance.now() - t0 < 60000) await new Promise(r => setTimeout(r, 200));
    return { steps: __steps.length, heard: __steps.filter(r => r.heard).length, scores: __steps.map(r => r.accuracy), shown: document.getElementById('customResultAvg').textContent };
  });
}
async function rift(page) {
  return page.evaluate(async () => {
    riftRounds = []; riftActive = true; riftStartTime = performance.now();
    riftRunNextRound();
    await new Promise(r => setTimeout(r, 12000));
    riftActive = false; await new Promise(r => setTimeout(r, 2500));
    return { steps: riftRounds.length, heard: riftRounds.filter(r => r.heard).length, scores: riftRounds.map(r => r.accuracy) };
  });
}
async function entrance(page) {
  return page.evaluate(async () => {
    document.querySelector('#ttModeRow [data-tt-mode="entrance"]')?.click();
    document.getElementById('ttStartBtn').click();
    const t0 = performance.now(); while (!timingTrainer.active && performance.now() - t0 < 5000) await new Promise(r => setTimeout(r, 100));
    while (timingTrainer.active) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 500));
    return { bleed: timingTrainer.bleedHits, entrances: timingTrainer.results.filter(x => x.claimed).length, n: timingTrainer.results.length,
      warning: document.getElementById('ttResults').textContent.includes('Speaker bleed detected') };
  });
}
async function memory(page, stage) {
  return page.evaluate(async stage => {
    harmonyMemory.stage = stage; await startHarmonyMemory();
    while (harmonyMemory.active) await new Promise(r => setTimeout(r, 200));
    await new Promise(r => setTimeout(r, 500));
    const run = harmonyMemory.lastRun;
    return { held: run.held, n: run.notes.length, frames: run.cents.map(c => c.length) };
  }, stage);
}

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const only = URL_ ? 'prod' : process.env.LB_ONLY, R = { before: {}, after: {}, prod: {} };
  log(`loopback ${stamp} · ${URL_ ? `url: ${URL_}` : `before: ${REF} · after: working tree`} · nobody singing · song: hymn, Harmony part Alto, rehearsal part Lead`);
  for (const [cdb, c] of COUPLINGS) for (const side of URL_ ? ['prod'] : ['before', 'after']) {
    if (only && only !== side) continue;
    const { ctx, page, errors } = await open(b, side, c), out = R[side][cdb] = {};
    log(`\n== ${side}, coupling ${cdb} dB`);
    const SC = process.env.LB_SCEN ? process.env.LB_SCEN.split(',') : ['harmony', 'scale', 'custom', 'rift', 'tt', 'hm'], want = k => SC.includes(k);
    const show = (k, r) => log(`   ${k.padEnd(44)} heard ${r.heard}/${r.total} frames · notes scored ${r.scored} · landed ${r.landed} · Timing ${r.timing} · Part ${r.part}`);
    if (!want('harmony')) {} else if (side === 'before') {
      show('Harmony, piano guide (master level)', out.guide = await harmony(page, { guide: true, distraction: false }));
      show('Harmony, distraction (master level)', out.distraction = await harmony(page, { guide: false, distraction: true }));
    } else if (side === 'prod') {
      show('Harmony, piano guide (as built)', out.guideBuilt = await harmony(page, { guide: true, distraction: false }));
      show('Harmony, distraction (as built)', out.distractionBuilt = await harmony(page, { guide: false, distraction: true }));
    } else {
      show('Harmony, piano guide (as built)', out.guideBuilt = await harmony(page, { guide: true, distraction: false }));
      show('Harmony, distraction (as built)', out.distractionBuilt = await harmony(page, { guide: false, distraction: true }));
      out.guide = {}; out.distraction = {};
      for (const db of GUIDE_DB) {
        show(`Harmony, piano guide at ${db} dBFS (gain ${guideGain(db)})`, out.guide[db] = await harmony(page, { guide: true, distraction: false, gain: guideGain(db) }));
        show(`Harmony, distraction at ${db} dBFS`, out.distraction[db] = await harmony(page, { guide: false, distraction: true, gain: guideGain(db) }));
      }
    }
    if (want('harmony')) show('Harmony, no guide (the choir only: baseline)', out.none = await harmony(page, { guide: false, distraction: false }));
    if (want('scale')) for (const lv of ['beginner', 'intermediate', 'professional']) {
      const sr = out['scale_' + lv] = await scaleRun(page, lv);
      if (lv === 'professional') out.scale = sr;
      log(`   ${`Scale Run, ${lv}`.padEnd(44)} steps heard ${sr.heard}/${sr.steps} · scores ${sr.scores.join('/')} · shown ${sr.shown} · "${sr.feedback}"`);
    }
    if (want('custom')) { const r = out.custom = await custom(page); log(`   ${'Custom exercise, 5 notes'.padEnd(44)} steps heard ${r.heard}/${r.steps} · scores ${r.scores.join('/')} · shown ${r.shown}`); }
    if (want('rift')) { const r = out.rift = await rift(page); log(`   ${'Pitch Rift, ~12 s of rounds'.padEnd(44)} rounds heard ${r.heard}/${r.steps} · scores ${r.scores.join('/')}`); }
    if (want('tt')) {
      out.tt = await entrance(page);
      log(`   ${'Entrance Trainer'.padEnd(44)} bleed hits ${out.tt.bleed} · entrances ${out.tt.entrances}/${out.tt.n} · warning ${out.tt.warning}`);
    }
    if (want('hm')) for (const st of [0, 5]) {
      const m = out['hm' + st] = await memory(page, st);
      log(`   ${`Harmony Memory stage ${st + 1}`.padEnd(44)} held ${m.held}/${m.n} · frames with a pitch per note ${m.frames.join('/')}`);
    }
    log(`   page errors: ${errors.length ? errors.slice(0, 2).join(' | ') : 'none'}`);
    await ctx.close();
  }
  fs.writeFileSync(LOG + '.json', JSON.stringify(R, null, 1));
  if (!only && !process.env.LB_SCEN) {
    // the highest guide level with no phantom note at the worst coupling (and none at the typical one)
    const ok = db => COUPLINGS.every(([cdb]) => R.after[cdb].guide[db].landed === 0 && R.after[cdb].distraction[db].landed === 0);
    const okLevels = GUIDE_DB.filter(ok), pick = okLevels.length ? Math.max(...okLevels) : null;
    log(`\n==== guide levels with 0 landed notes at both couplings: ${okLevels.join(', ') || 'none'} dBFS → highest: ${pick ?? 'none'}`);
    log(`==== Harmony landed notes as built, master → branch: ${COUPLINGS.map(([cdb]) => `${cdb} dB: guide ${R.before[cdb].guide.landed} → ${R.after[cdb].guideBuilt.landed}, distraction ${R.before[cdb].distraction.landed} → ${R.after[cdb].distractionBuilt.landed}`).join(' · ')}`);
    log(`==== Scale Run steps heard (nobody singing), master → branch: ${COUPLINGS.map(([cdb]) => `${cdb} dB: ${R.before[cdb].scale.heard} → ${R.after[cdb].scale.heard}`).join(' · ')}`);
    const tt = COUPLINGS.map(([cdb]) => `${cdb} dB: master ${R.before[cdb].tt.bleed} → branch ${R.after[cdb].tt.bleed}`).join(' · ');
    const hm = COUPLINGS.map(([cdb]) => `${cdb} dB: stage 1 held ${R.before[cdb].hm0.held} → ${R.after[cdb].hm0.held}, stage 6 held ${R.before[cdb].hm5.held} → ${R.after[cdb].hm5.held}`).join(' · ');
    log(`==== Entrance Trainer bleed hits, nobody singing: ${tt}`);
    log(`==== Harmony Memory notes held, nobody singing: ${hm}`);
  }
  log(`log: ${LOG}.log`); logf.end();
  await b.close();
})().catch(e => { log('ERROR ' + (e.stack || e)); logf.end(); process.exitCode = 2; });
