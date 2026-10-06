// Scope check (no app changes): which pitch graders fail on vibrato, and how background noise moves pitch scores on the
// shared processed mic vs the register-input pattern. Each WAV is Chromium's mic; frames are read through the app's own
// mic paths (shared: initAudio + analyser + autoCorrelate, as every shared-mic feature does; register: openRegisterInput +
// readRegisterFrame), then graded with the app's own functions and thresholds on those same frames.
// Usage: node scripts/vq-verify/xscope.js vibrato|noise|phantom [out.json]   (default out: $VOXCOACH_TESTDATA (~/VoxCoachTestData)/xscope/xscope-<mode>.json; KINDS / SNRS env narrow the noise run)
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata'); // test data outside $TMPDIR (scripts/testdata.js)
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const TMP = path.join(TESTDATA, 'xscope'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TARGET = 57, F0 = 220; // A3

function gen(name, spec) { const f = path.join(TMP, name + '.wav'); if (!fs.existsSync(f)) execFileSync('python', [path.join(__dirname, 'noisy2.py'), f, JSON.stringify({ f0: F0, seconds: 30, ...spec })]); return f; }

async function withPage(wav, fn, attempt = 1) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  try {
    const ctx = await b.newContext({ permissions: ['microphone'] });
    await ctx.route('http://localhost:8765/', r => r.fulfill({ path: process.env.XS_HTML || ROOT + '/deploy/index.html', contentType: 'text/html' }));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://localhost:8765/'); await p.waitForTimeout(2500);
    const ok = await p.evaluate(() => { try { return typeof openRegisterInput === 'function' && !!BOSS_DIFFICULTY && !!SONG; } catch (e) { return false; } });
    if (!ok) { if (attempt < 3) { await b.close(); return withPage(wav, fn, attempt + 1); } throw new Error('page did not load: ' + errs.join(' | ')); }
    return await fn(p);
  } finally { await b.close().catch(() => {}); }
}

// Frames from one mic path: 3 s warm-up (fake mic silent start, suppressor adapts; the register input must keep being read
// or it closes itself), then `ms` of frames {t, f}.
async function collect(p, pathName, ms) {
  return p.evaluate(async ({ pathName, ms }) => {
    if (pathName === 'shared') await initAudio(); else await openRegisterInput();
    const read = pathName === 'shared' ? () => { analyser.getFloatTimeDomainData(dataArray); return autoCorrelate(dataArray, audioCtx.sampleRate); } : () => readRegisterFrame().freq;
    const run = dur => new Promise(res => { const out = [], s = performance.now(); (function fr() { const f = read(), t = performance.now() - s; out.push({ t, f }); if (t < dur) requestAnimationFrame(fr); else res(out); })(); });
    await run(3000);
    const frames = await run(ms);
    const tr = (pathName === 'shared' ? micStream : regIn.stream).getAudioTracks()[0].getSettings();
    return { frames, settings: { ns: tr.noiseSuppression, ec: tr.echoCancellation, agc: tr.autoGainControl } };
  }, { pathName, ms });
}

// Every grader, applied to the same frames with the app's own code where it is callable, its exact formula where it is inline.
const SCORE = ({ frames, target }) => {
  // Graded as the running build grades: with the vibrato helper where the build has it (after 2026-09-30), as read before.
  const NEW = typeof vibratoTolerantCents === 'function', tolOf = l => NEW ? vibratoTolerantCents(l) : l.map(x => x.c);
  const cd = songChordDurMs();
  const voiced = frames.filter(x => x.f > 0);
  const cOf = f => centsFromTarget(f, target);
  const win = W => { const g = []; const end = frames[frames.length - 1].t; for (let s = 0; s + W <= end; s += W) g.push(frames.filter(x => x.t >= s && x.t < s + W).map(x => ({ ...x, t: x.t - s }))); return g; };
  const cs = w => w.filter(x => x.f > 0).map(x => ({ t: x.t, c: cOf(x.f) })).filter(x => x.c !== null && Math.abs(x.c) < 300);
  const sc = (list, m) => Math.max(0, Math.round(100 - list.reduce((a, b) => a + Math.abs(b), 0) / list.length * m));
  // candidate fixes, for scoping only: mean |cents| after a centred 200 ms moving average (≈ one vibrato cycle), and |median|
  const smooth = (l, half = 100) => l.map(x => { const n = l.filter(y => Math.abs(y.t - x.t) <= half); return n.reduce((a, y) => a + y.c, 0) / n.length; });
  const med = a => { const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
  const ex = (W, m) => win(W).map(w => { const l = cs(w); if (!l.length) return null; return { now: sc(tolOf(l), m), ma: sc(smooth(l), m), med: Math.max(0, Math.round(100 - Math.abs(med(l.map(x => x.c))) * m)) }; });
  const R = { voicedPct: Math.round(100 * voiced.length / frames.length), frames: frames.length };
  const allC = voiced.map(x => cOf(x.f)).filter(c => c !== null);
  R.gross50 = allC.length ? Math.round(100 * allC.filter(c => Math.abs(c) > 50).length / allC.length) : null;
  R.octErr = voiced.length ? Math.round(1000 * voiced.filter(x => Math.abs(69 + 12 * Math.log2(x.f / 440) - target) > 6).length / voiced.length) / 10 : null;
  R.p50abs = allC.length ? Math.round(med(allC.map(Math.abs))) : null;
  R.pitchMatch = { beg: ex(1600, 0.45), int: ex(1600, 0.6), pro: ex(1600, 0.9) };
  R.scaleNote = { beg: ex(1100, 0.45), int: ex(900, 0.6), pro: ex(650, 0.9) };
  R.rift = ex(1400, 0.6);
  // per-note song graders, one window per chord
  const notes = win(cd).map(cs);
  const bossT = ['pitch', 'sustain', 'agility', 'tremor'], diffs = ['beginner', 'intermediate', 'professional'];
  R.boss = {};
  for (const bt of bossT) for (const d of diffs) R.boss[bt + '/' + d] = notes.map(l => {
    if (!l.length) return null;
    bossCentsBuf = NEW ? l : l.map(x => x.c); bossRmsBuf = []; bossChestBuf = []; bossNoteOnsetTime = null; bossNoteResults = [];
    selectedBossType = bt; selectedBossDifficulty = d; bossCurrentTargetMidi = target; bossFinalizeNote(0);
    const r = bossNoteResults[0]; return { acc: r.pitchAcc, pass: r.pitchAcc >= 70 + BOSS_DIFFICULTY[d].thresholdAdjust };
  });
  bossHealth = 100; playerHealth = 100;
  R.karaoke = notes.map(l => { if (!l.length) return null; karaokeCentsBuf = NEW ? l : l.map(x => x.c); karaokeFirstVoicedOffset = 0; karaokeResults = []; finalizeKaraokeNote(0); return karaokeResults[0].pitchAcc; });
  document.getElementById('karaokeLiveLine').innerHTML = '';
  R.harmony = notes.map(l => { if (!l.length) return null; harmonyNoteBuf = NEW ? l : l.map(x => Math.abs(x.c)); harmonyNoteResults = []; harmonyFinalizeNote(0); return harmonyNoteResults[0]; });
  R.hm = notes.map(l => { const k = l.filter(x => x.t >= HM_SKIP_ATTACK_SEC * 1000), r = judgeHeldNote(target, k.map(x => x.c), k.map(x => x.t / 1000)); return r.heard ? { held: r.held, cents: r.cents } : null; });
  // Stay in Key: a chord that has the target's pitch class
  let idx = 0; for (let i = 0; i < SONG.parts.Lead.notes.length; i++) if (chordTonePitchClasses(i).has(((target % 12) + 12) % 12)) { idx = i; break; }
  // live readouts: each frame through the build's live helper (Stay in Key, Real-Time Feedback, Tuner)
  const live = NEW ? makeVibratoTolerantLive() : null;
  const heldF = voiced.map(x => { if (!live) return x.f; const h = live(x.t, 6900 + 1200 * Math.log2(x.f / 440)); return 440 * Math.pow(2, (h - 6900) / 1200); });
  const sik = heldF.map(f => nearestChordToneCents(f, idx));
  R.stayKey = sik.length ? Math.round(100 * sik.filter(n => Math.abs(n.cents) <= 35).length / sik.length) : null;
  const sikL = voiced.map(x => ({ t: x.t, c: nearestChordToneCents(x.f, idx).cents }));
  R.stayKeyMA = sikL.length ? Math.round(100 * smooth(sikL).filter(c => Math.abs(c) <= 35).length / sikL.length) : null;
  // One Take (6 s): pitch + stability
  R.oneTake = win(6000).map(w => { const l = tolOf(cs(w)); if (!l.length) return null; const m = l.reduce((a, b) => a + b, 0) / l.length; const sd = Math.sqrt(l.reduce((a, b) => a + (b - m) ** 2, 0) / l.length); return { pitch: sc(l, 0.6), stab: Math.max(0, Math.round(100 - sd * 3)) }; });
  // Real-Time Feedback / Tuner: per frame note cents; stability over the last 30 voiced frames
  const nc = heldF.map(f => freqToNote(f).cents);
  const stab = []; for (let i = 5; i < nc.length; i++) { const b = nc.slice(Math.max(0, i - 29), i + 1), m = b.reduce((a, c) => a + c, 0) / b.length; stab.push(Math.max(0, 100 - Math.sqrt(b.reduce((a, c) => a + (c - m) ** 2, 0) / b.length) * 3)); }
  R.rtfInTune = nc.length ? Math.round(100 * nc.filter(c => Math.abs(c) <= 8).length / nc.length) : null;
  R.tunerLocked = nc.length ? Math.round(100 * nc.filter(c => Math.abs(c) <= 6).length / nc.length) : null;
  R.steadyPct = stab.length ? Math.round(100 * stab.filter(s => s >= 75).length / stab.length) : null;
  R.stabMean = stab.length ? Math.round(stab.reduce((a, b) => a + b, 0) / stab.length) : null;
  // Glider: its own easing toward gliderPitchToY; distance from the target note's height, in px (narrowest gap is 70 px)
  let y = null; const H = GLIDER_CANVAS_H, yt = gliderMidiToY(target, H), dy = [];
  for (const x of frames) { const d = gliderPitchToY(x.f, H); if (d === null) continue; y = y === null ? d : y + (d - y) * 0.25; dy.push(Math.abs(y - yt)); }
  R.gliderDy = dy.length ? { p95: Math.round(dy.sort((a, b) => a - b)[Math.floor(0.95 * dy.length)]), max: Math.round(dy[dy.length - 1]) } : null;
  R.chordMs = Math.round(cd);
  return R;
};

async function measure(wav, pathName, ms, xcheck = false) {
  return withPage(wav, async p => {
    const { frames, settings } = await collect(p, pathName, ms);
    const R = await p.evaluate(`(${SCORE.toString()})(${JSON.stringify({ frames, target: TARGET })})`);
    R.settings = settings;
    if (xcheck) R.xcheck = await p.evaluate(async t => { const o = []; for (let i = 0; i < 4; i++) o.push((await captureAccuracyForTarget(t, 1600, { accuracyMultiplier: 0.6 })).accuracy); return o; }, TARGET);
    return R;
  });
}

(async () => {
  const mode = process.argv[2] || 'vibrato', out = process.argv[3] || path.join(TMP, `xscope-${mode}.json`);
  const rows = [];
  const save = () => fs.writeFileSync(out, JSON.stringify(rows, null, 1));
  if (mode === 'vibrato') {
    const cases = [['straight', {}], ['vib25', { vibCents: 25 }], ['vib50', { vibCents: 50 }], ['vib100', { vibCents: 100 }],
      ['vib50_5Hz', { vibCents: 50, vibRate: 5 }], ['off+35', { centsOffset: 35 }], ['off+60', { centsOffset: 60 }], ['vib50_off+35', { vibCents: 50, centsOffset: 35 }]];
    for (const [name, spec] of cases) for (const pth of ['shared', 'register']) {
      const R = await measure(gen('v-' + name, { vibRate: 6, ...spec }), pth, 20000, pth === 'shared');
      rows.push({ case: name, path: pth, ...R }); save(); console.log(name, pth, 'voiced', R.voicedPct, 'PMint', R.pitchMatch.int.map(x => x && x.now).join(','), 'xcheck', R.xcheck || '');
    }
  } else if (mode === 'noise') {
    const kinds = (process.env.KINDS || 'talker,tv,babble,traffic,rumble,white').split(','), snrs = (process.env.SNRS || '20,10,5,0').split(',').map(Number);
    for (const pth of ['shared', 'register']) { const R = await measure(gen('n-clean', {}), pth, 16000); rows.push({ case: 'clean', noise: 'none', snr: null, path: pth, ...R }); save(); console.log('clean', pth, R.voicedPct); }
    for (const k of kinds) for (const s of snrs) for (const pth of ['shared', 'register']) {
      const R = await measure(gen(`n-${k}-${s}`, { noise: k, snrDb: s, seed: 7 }), pth, 16000);
      rows.push({ case: `${k}@${s}`, noise: k, snr: s, path: pth, ...R }); save();
      console.log(`${k}@${s}`, pth, JSON.stringify(R.settings), 'voiced', R.voicedPct, 'gross50', R.gross50, 'PMint', R.pitchMatch.int.map(x => x && x.now).join(','));
    }
  } else if (mode === 'phantom') {  // nobody singing: noise alone, at the level it has under a tone at 10 dB SNR
    for (const k of (process.env.KINDS || 'talker,tv,babble,traffic,rumble').split(',')) for (const pth of ['shared', 'register']) {
      const R = await measure(gen(`p-${k}`, { noise: k, snrDb: 10, seed: 7, toneOff: true }), pth, 16000);
      rows.push({ case: `${k} only`, noise: k, path: pth, ...R }); save();
      console.log(`${k} only`, pth, 'voiced', R.voicedPct, 'PMint', R.pitchMatch.int.map(x => x && x.now).join(','), 'stayKey', R.stayKey);
    }
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
