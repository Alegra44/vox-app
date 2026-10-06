// The app's reference and guide tones read back through its own pitch detector (the guide is a plain sine): every semitone C2–C7 (MIDI 36–96),
// rendered offline with the page's tone (TONE_HARMONICS at TONE_REF_GAIN / TONE_GUIDE_GAIN, the same envelope as
// scheduleTone), at 44.1 and 48 kHz, then cut into the analyser's 2048-sample frames (hop 512) over the held part and
// passed to autoCorrelate. Per note: frames with a pitch, the median and worst error in cents, and octave errors (a
// frame more than 600 ct off). Master's plain sines (0.22 references, 0.10 guides) run alongside for comparison.
// Checks, for the page's reference and guide tones: every held frame of every note has a pitch, reads as the right
// note (within ±50 ct), no octave error; and a reference's worst frame no more than 2 ct worse than master's sine on
// any note (for a guide, reported only: the app never detects a guide).
// The detector's own error grows at low notes (a 2048-sample frame holds two periods of C2): reported, not checked.
// Usage: node scripts/vq-verify/tonepitch.js   (deploy/ from the working tree)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup');
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..'), LOGDIR = path.join(__dirname, 'logs');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `tonepitch-local-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; log(`  ${ok ? '✓' : '✗'} ${label.padEnd(70)} ${detail}`); };

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext()).newPage();
  await page.route('http://localhost:8765/**', r => { const p = new URL(r.request().url()).pathname.slice(1) || 'index.html'; r.fulfill({ path: path.join(ROOT, 'deploy', p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2000);
  const res = await page.evaluate(async () => {
    const out = [];
    // master's tones for comparison: a plain sine at 0.22 (references) and 0.10 (guides)
    const LEVELS = [['reference', TONE_REF_GAIN, true], ['guide', TONE_GUIDE_GAIN, false], ['master sine 0.22', 0.22, false], ['master sine 0.10', 0.10, false]];
    for (const sr of [44100, 48000]) for (const [level, peak, harmonic] of LEVELS) for (let midi = 36; midi <= 96; midi++) {
      const f = 440 * Math.pow(2, (midi - 69) / 12), dur = 0.9, ctx = new OfflineAudioContext(1, Math.ceil(sr * (dur + 0.05)), sr);
      const osc = ctx.createOscillator(), g = ctx.createGain();
      if (harmonic) osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array(TONE_HARMONICS.length), new Float32Array(TONE_HARMONICS), { disableNormalization: true }));
      osc.frequency.value = f;
      g.gain.setValueAtTime(0, 0); g.gain.linearRampToValueAtTime(peak, 0.03); g.gain.linearRampToValueAtTime(peak, dur - 0.08); g.gain.linearRampToValueAtTime(0, dur);
      osc.connect(g).connect(ctx.destination); osc.start(0); osc.stop(dur + 0.02);
      const buf = (await ctx.startRendering()).getChannelData(0), N = 2048, cents = [];
      let frames = 0;
      for (let s = Math.round(0.05 * sr); s + N <= Math.round((dur - 0.1) * sr); s += 512) { // the held part
        frames++;
        const fr = autoCorrelate(buf.slice(s, s + N), sr);
        if (fr > 0) cents.push(1200 * Math.log2(fr / f));
      }
      const abs = cents.map(Math.abs).sort((x, y) => x - y);
      out.push({ sr, level, midi, frames, read: cents.length, median: abs.length ? abs[abs.length >> 1] : null, worst: abs.length ? abs[abs.length - 1] : null, octave: cents.filter(c => Math.abs(c) > 600).length });
    }
    return out;
  });
  const name = m => ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'][m % 12] + (Math.floor(m / 12) - 1);
  log(`tonepitch ${stamp} · the page's reference and guide tones through autoCorrelate, MIDI 36–96`);
  for (const sr of [44100, 48000]) for (const level of ['reference', 'guide', 'master sine 0.22', 'master sine 0.10']) {
    const rows = res.filter(r => r.sr === sr && r.level === level);
    const unread = rows.filter(r => r.read < r.frames), off = rows.filter(r => r.worst === null || r.worst > 10), oct = rows.filter(r => r.octave);
    const worst = rows.reduce((a, r) => (r.worst ?? 1e9) > (a.worst ?? -1) ? r : a, rows[0]);
    log(`\n-- ${level}, ${sr} Hz: ${rows.length} notes · median error ${Math.max(...rows.map(r => r.median ?? 0)).toFixed(2)} ct at most · worst frame ${worst.worst?.toFixed(2)} ct (${name(worst.midi)})`);
    check(`${level} ${sr} Hz: every held frame of every note has a pitch`, !unread.length, unread.map(r => `${name(r.midi)} ${r.read}/${r.frames}`).join(', ') || `${rows.reduce((a, r) => a + r.frames, 0)} frames`);
    log(`   notes past ±10 ct on some frame: ${off.map(r => `${name(r.midi)} ${r.worst?.toFixed(1)}`).join(', ') || 'none'}`);
    if (level.startsWith('master')) continue;
    const wrong = rows.filter(r => r.worst === null || r.worst >= 50);
    check(`${level} ${sr} Hz: every frame reads as the right note (within ±50 ct)`, !wrong.length, wrong.map(r => `${name(r.midi)} ${r.worst?.toFixed(1)} ct`).join(', ') || `worst ${worst.worst?.toFixed(1)} ct`);
    check(`${level} ${sr} Hz: no octave errors`, !oct.length, oct.map(r => `${name(r.midi)} ×${r.octave}`).join(', ') || '0');
    const base = res.filter(r => r.sr === sr && r.level === (level === 'reference' ? 'master sine 0.22' : 'master sine 0.10'));
    const worse = rows.filter((r, i) => r.worst > base[i].worst + 2);
    if (level === 'guide') { log(`   guide vs master's 0.10 sine, notes > 2 ct worse (reported: the app never detects a guide, the singer hears it): ${worse.map(r => `${name(r.midi)} ${r.worst.toFixed(1)} vs ${base[rows.indexOf(r)].worst.toFixed(1)}`).join(', ') || 'none'}`); continue; }
    check(`${level} ${sr} Hz: no note worse than master's sine (+2 ct)`, !worse.length, worse.map(r => `${name(r.midi)} ${r.worst.toFixed(1)} vs ${base[rows.indexOf(r)].worst.toFixed(1)}`).join(', ') || `61 notes`);
  }
  log(`\n==== VERDICT: ${pass} passed, ${fail} failed`);
  fs.writeFileSync(LOG + '.json', JSON.stringify(res));
  log(`log: ${LOG}.log`); logf.end();
  await b.close();
  process.exitCode = fail ? 1 : 0;
})().catch(e => { log('ERROR ' + (e.stack || e)); logf.end(); process.exitCode = 2; });
