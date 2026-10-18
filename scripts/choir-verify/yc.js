// Phase 6 checks: Your Choir. A test tone stands in for the mic (a real MediaStream, so Studio Mode's
// MediaRecorder genuinely records it), singing each part's real notes on the song clock.
// Your Choir is Choir World's (cw-gated): the run signs up a throwaway account first (deleted at exit, testAccounts.js).
// First, one take through the real mic (the single stream since 2026-10-18): Chromium's fake capture plays a steady
// sung-like tone ($VOXCOACH_TESTDATA/yc/tone-220.wav, built here), Record Alto through the real button, and the decoded
// take (what playback plays) is measured from its downbeat to the song's end: level (median of 20 ms RMS windows) and gaps
// (windows 20 dB under that median), then Play my choir with that take alone: the output's level and gaps. One line,
// MICTAKE {...}; run it on master and a branch to compare (ycmic.sh).
// A steady tone is what noise suppression removes: master's stream (NS and AGC on) records it about 19 dB down, so
// YC_WAV=<file> sings a real voice instead (vibfix's stim-S1.wav, a held sung note) for the level comparison.
// Usage: node scripts/choir-verify/yc.js [url]   (YC_MIC_ONLY=1 stops after the real-mic take; YC_WAV=<wav> the mic's file)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const path = require('path'), fs = require('fs');
const { TESTDATA } = require('../testdata');
const { track } = require('./testAccounts'); // deletes the account this run creates when it exits
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const SHOTS = require('os').tmpdir() + '/';
const email = track(`voxcoach-yc-${Date.now()}@example.com`), password = 'YC-' + Math.random().toString(36).slice(2) + '!x9';

// 60 s at 48 kHz: 220 Hz with harmonics 1–8 (amplitude 1/k), a 5.5 Hz ±30 ct vibrato, peak 0.3. Continuous, so any gap
// in a take is the recording's.
function toneWav() {
  const dir = path.join(TESTDATA, 'yc'), f = path.join(dir, 'tone-220.wav');
  if (fs.existsSync(f)) return f;
  fs.mkdirSync(dir, { recursive: true });
  const sr = 48000, n = sr * 60, x = new Float32Array(n); let ph = 0, mx = 0;
  for (let i = 0; i < n; i++) {
    ph += 2 * Math.PI * 220 * Math.pow(2, 30 / 1200 * Math.sin(2 * Math.PI * 5.5 * i / sr)) / sr;
    let v = 0; for (let k = 1; k <= 8; k++) v += Math.sin(k * ph) / k;
    x[i] = v; mx = Math.max(mx, Math.abs(v));
  }
  const b = Buffer.alloc(44 + n * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(x[i] / mx * 0.3 * 32767), 44 + i * 2);
  fs.writeFileSync(f, b); return f;
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${process.env.YC_WAV || toneWav()}`] });
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => {
    localStorage.setItem('language', 'en'); localStorage.removeItem('yourChoirTakes');
    window.__gum = []; const g = MediaDevices.prototype.getUserMedia;
    MediaDevices.prototype.getUserMedia = function (c) { window.__gum.push(c.audio); return g.call(this, c); };
  });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  await ev(() => openAuthModal());
  await page.locator('#authName').fill('Your Choir Check'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await ev(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  console.log('signed up', email);

  console.log('== Real-mic take: Record Alto through the one stream');
  await ev(() => { enterPanel('choir'); selectSong('hymn'); });
  await sleep(500);
  await page.locator('#ycParts [data-yc-rec="Alto"]').click();
  await ev(async () => { while (!(yourChoir.recording && yourChoir.recording.downbeat)) await new Promise(r => setTimeout(r, 10)); });
  await ev(async () => { while (yourChoir.recording) await new Promise(r => setTimeout(r, 50)); });
  const mic = await ev(async () => {
    const tk = ycTakes().Alto; if (!tk) return { error: 'no take: ' + document.getElementById('ycStatus').textContent };
    const buf = await ycDecode(tk.base64), d = buf.getChannelData(0), sr = buf.sampleRate, total = songTotalDurMs() / 1000;
    const w = Math.round(0.02 * sr), from = Math.floor(tk.lead * sr), to = Math.min(d.length, Math.floor((tk.lead + total) * sr)), db = [];
    for (let i = from; i + w <= to; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += d[j] * d[j]; const r = Math.sqrt(s / w); db.push(r > 0 ? 20 * Math.log10(r) : -120); }
    const sorted = [...db].sort((a, b) => a - b), med = sorted[sorted.length >> 1];
    let gaps = 0, run = 0, longest = 0; for (const v of db) { if (v < med - 20) { gaps++; run++; longest = Math.max(longest, run); } else run = 0; }
    return { levelDb: +med.toFixed(1), p5Db: +sorted[Math.floor(sorted.length * 0.05)].toFixed(1), p95Db: +sorted[Math.floor(sorted.length * 0.95)].toFixed(1),
      gaps, longestGapMs: longest * 20, windows: db.length, spanS: +((to - from) / sr).toFixed(2), song: +total.toFixed(2), peakDb: +(20 * Math.log10(tk.peak)).toFixed(1),
      mime: tk.mimeType, status: document.getElementById('ycStatus').textContent, gum: window.__gum, micLive: !!micStream && micStream.getAudioTracks().some(t => t.readyState === 'live') };
  });
  // And what it plays back at: Play my choir with only this take, the output (choirOutNode, after the headroom trim)
  // in 100 ms windows from the song's start to its end: median level and windows 20 dB under it.
  if (!mic.error) Object.assign(mic, await ev(async () => {
    const an = audioCtx.createAnalyser(); an.fftSize = 4096; choirOutNode.connect(an);
    document.getElementById('ycPlayBtn').click();
    while (!yourChoir.playing) await new Promise(r => setTimeout(r, 10));
    const buf = new Float32Array(4096), db = [];
    while (yourChoir.playing) {
      const t = audioCtx.currentTime - choirStartCtxTime;
      if (t > 0.2 && t < songTotalDurMs() / 1000 - 0.2) { an.getFloatTimeDomainData(buf); const r = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length); db.push(r > 0 ? 20 * Math.log10(r) : -120); }
      await new Promise(r => setTimeout(r, 100));
    }
    choirOutNode.disconnect(an);
    const s = [...db].sort((a, b) => a - b), med = s[s.length >> 1];
    return { playDb: +med.toFixed(1), playP5Db: +s[Math.floor(s.length * 0.05)].toFixed(1), playGaps: db.filter(v => v < med - 20).length, playWindows: db.length, trim: +choirOutNode.gain.value.toFixed(3) };
  }));
  console.log('MICTAKE ' + JSON.stringify(mic));
  if (process.env.YC_MIC_ONLY) { console.log('page errors:', errors); await browser.close(); return; }
  await ev(() => ycDelete('Alto'));

  await ev(async () => {
    enterPanel('choir'); selectSong('hymn');
    await initAudioOnly(); ensureChoirGainNodes();
    // Stand-in mic: an oscillator into a MediaStream that replaces the real mic stream.
    const dest = audioCtx.createMediaStreamDestination(), osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    g.gain.value = 0; osc.connect(g).connect(dest); osc.start();
    window.__mic = { osc, g };
    micStream = dest.stream;
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048; dataArray = new Float32Array(2048);
    // Measurement taps after each part's mixer GainNode (before the choir output trim), and a true-peak
    // processor on choirOutNode (what reaches the speakers).
    window.__taps = {};
    Object.keys(choirGainNodes).forEach(p => { const a = audioCtx.createAnalyser(); a.fftSize = 4096; choirGainNodes[p].connect(a); __taps[p] = a; });
    const sp = audioCtx.createScriptProcessor(1024, 1, 1); choirOutNode.connect(sp); sp.connect(audioCtx.destination);
    window.__pk = null;
    sp.onaudioprocess = e => { const d = e.inputBuffer.getChannelData(0), pk = window.__pk; e.outputBuffer.getChannelData(0).fill(0); if (!pk) return; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); pk.n++; if (v > pk.max) pk.max = v; if (v > 1) pk.over++; } };
  });
  const waitSongT = async sec => { for (;;) { const t = await ev(() => audioCtx.currentTime - choirStartCtxTime); if (t >= sec) return; await sleep(Math.max(10, (sec - t) * 1000 - 30)); } };
  const measure = () => ev(() => {
    const cd = songChordDurMs() / 1000, idx = Math.floor((audioCtx.currentTime - choirStartCtxTime) / cd), out = { chord: idx + 1, parts: {} };
    Object.keys(__taps).forEach(p => {
      const buf = new Float32Array(4096); __taps[p].getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length), f = rms > 0.003 ? autoCorrelate(buf, audioCtx.sampleRate) : -1;
      out.parts[p] = { gain: +choirGainNodes[p].gain.value.toFixed(3), rms: +rms.toFixed(4), heard: f > 0 ? midiName(Math.round(69 + 12 * Math.log2(f / 440))) : '—', written: midiName(SONG.parts[p].notes[idx]) };
    });
    out.trim = +choirOutNode.gain.value.toFixed(3);
    return out;
  });
  const fmt = m => `chord ${m.chord} trim ${m.trim} | ` + Object.entries(m.parts).map(([p, v]) => `${p} g${v.gain} rms ${v.rms} ${v.heard}${v.heard === '—' ? '' : v.heard === v.written ? '✓' : '≠' + v.written}`).join(' | ');

  // Record one part through the real UI button while the stand-in "sings" that part's notes at amp.
  const record = async (part, amp, midSample) => {
    await page.locator(`#ycParts [data-yc-rec="${part}"]`).click();
    await ev(async () => { while (!(yourChoir.recording && yourChoir.recording.downbeat)) await new Promise(r => setTimeout(r, 10)); });
    await ev(([p, a]) => {
      const cd = songChordDurMs() / 1000, t0 = yourChoir.recording.downbeat, { osc, g } = __mic;
      SONG.parts[p].notes.forEach((m, i) => { osc.frequency.setValueAtTime(noteToFreq(m), t0 + i * cd); g.gain.setValueAtTime(a, t0 + i * cd); g.gain.setValueAtTime(0, t0 + (i + CHOIR_NOTE_FRACTION) * cd); });
    }, [part, amp]);
    const status = [];
    for (const t of [-1, 5.0]) { await waitSongT(t); status.push(await ev(() => document.getElementById('ycStatus').textContent)); }
    if (midSample) console.log(`  while recording ${part}:`, fmt(await measure()));
    await ev(async () => { while (yourChoir.recording) await new Promise(r => setTimeout(r, 50)); });
    // Alignment: first onset in the decoded take after its recorded downbeat, and the onset of chord 2.
    const take = await ev(async p => {
      const tk = ycTakes()[p], buf = await ycDecode(tk.base64), d = buf.getChannelData(0), sr = buf.sampleRate, cd = songChordDurMs() / 1000;
      const win = Math.round(0.001 * sr), peakAt = k => { let m = 0; for (let i = k * win; i < (k + 1) * win && i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return m; };
      // Onset = the first 1 ms window over 0.05 whose window 5 ms earlier was under 0.01 (opus fades notes in over a few ms).
      const onsetAfter = sec => { for (let k = Math.floor(sec * sr / win) + 1; k * win < d.length; k++) if (peakAt(k) > 0.05 && peakAt(k - 1) <= 0.05 && peakAt(k - 5) < 0.01) return k * win / sr; return null; };
      const o1 = onsetAfter(tk.lead - 0.3), o2 = onsetAfter(tk.lead + cd * 0.5);
      return { lead: +tk.lead.toFixed(4), peak: +tk.peak.toFixed(3), dur: tk.dur, mime: tk.mimeType, kb: Math.round(tk.base64.length / 1024), bufDur: +buf.duration.toFixed(2),
        onset1VsDownbeatMs: +((o1 - tk.lead) * 1000).toFixed(1), onset2VsChord2Ms: +((o2 - tk.lead - cd) * 1000).toFixed(1) };
    }, part);
    console.log(`Recorded ${part}: status ${JSON.stringify(status)} → ${await ev(() => document.getElementById('ycStatus').textContent)} | take ${JSON.stringify(take)}`);
  };

  console.log('== Record Alto (amp 0.5)'); await record('Alto', 0.5, true);
  console.log('== Record Bass (amp 0.5) — the Alto take should play back underneath'); await record('Bass', 0.5, true);
  console.log('rows:', await ev(() => [...document.querySelectorAll('#ycParts .yc-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim())));

  const play = async label => {
    await page.locator('#ycPlayBtn').click();
    await ev(async () => { while (!yourChoir.playing) await new Promise(r => setTimeout(r, 10)); });
    await ev(() => { __pk = { max: 0, over: 0, n: 0 }; });
    const rows = [];
    for (const t of [1.5, 5.0, 11.5, 25.0]) { await waitSongT(t); rows.push(await measure()); }
    const vu = await ev(() => Object.fromEntries(['Soprano', 'Lead', 'Alto', 'Tenor', 'Bass'].map(p => [p, document.getElementById('vu' + p).style.width])));
    await ev(async () => { while (yourChoir.playing) await new Promise(r => setTimeout(r, 50)); });
    const pk = await ev(() => { const p = __pk; __pk = null; return { peak: +p.max.toFixed(3), peakDbfs: +(20 * Math.log10(p.max)).toFixed(2), pctOver: +(100 * p.over / p.n).toFixed(2) }; });
    console.log(`== Stacked playback: ${label}`); rows.forEach(r => console.log('  ' + fmt(r)));
    console.log('  VU meters at 25 s:', JSON.stringify(vu), '| stacked output', JSON.stringify(pk));
    return rows;
  };
  const a = await play('Alto + Bass, default faders (Alto 0.70, Bass 0.75)');
  await ev(() => { choirState.Alto.volume = 1.0; choirState.Bass.volume = 0.3; updateAllChoirGains(); });
  const b = await play('Alto fader 1.00, Bass fader 0.30');
  const ratio = (p, k) => +(b[k].parts[p].rms / a[k].parts[p].rms).toFixed(3);
  console.log('RMS ratio (run 2 / run 1) at each sample — Alto expected 1.429, Bass expected 0.400:', JSON.stringify([0, 1, 2, 3].map(k => ({ Alto: ratio('Alto', k), Bass: ratio('Bass', k) }))));
  await ev(() => { choirState.Alto.volume = 0.7; choirState.Bass.volume = 0.75; choirState.Bass.muted = true; updateAllChoirGains(); });
  await play('Bass muted via the workspace mute state');
  await ev(() => { choirState.Bass.muted = false; updateAllChoirGains(); });

  console.log('== Record Soprano, Lead, Tenor near full scale (amp 0.95) for a 5-part stacked peak test');
  for (const p of ['Soprano', 'Lead', 'Tenor']) await record(p, 0.95, false);
  await play('all 5 parts, default faders');

  console.log('== Delete Bass, then play');
  await page.locator('#ycParts [data-yc-del="Bass"]').click();
  console.log('status:', await ev(() => document.getElementById('ycStatus').textContent), '| stored parts:', await ev(() => Object.keys(JSON.parse(localStorage.getItem('yourChoirTakes')).hymn)));
  await page.locator('#yourChoirCard').screenshot({ path: SHOTS + 'yc-card.png' });

  for (const lang of ['fr', 'es', 'tr', 'en']) {
    console.log(`== ${lang}`, JSON.stringify(await ev(async l => { await setLanguage(l); return { title: document.querySelector('#yourChoirCard .step-label').textContent, summary: ycSummary.textContent, desc: ycDesc.textContent.slice(0, 90) + '…', rows: [...document.querySelectorAll('#ycParts .yc-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()), play: ycPlayBtn.textContent, stop: ycStopBtn.textContent, note: document.querySelector('[data-i18n="yc_storage_note"]').textContent }; }, lang), null, 1));
  }
  console.log('page errors:', errors);
  await browser.close();
})();
