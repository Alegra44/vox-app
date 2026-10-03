// Live click-through on production for Phase 6 (Your Choir), in French chosen from the first-visit
// language picker: record Alto and Bass with a test tone as the mic, play the 2-part stack, and measure
// per-part pitch / fader gain / RMS and the stacked output peak exactly as yc.js does locally.
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const fs = require('fs'), crypto = require('crypto');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2] || 'https://deploy-alegra1122.vercel.app/';
const SHOTS = require('os').tmpdir() + '/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const resp = await p.goto(URL, { waitUntil: 'load' });
  const liveHtml = await resp.text();
  const local = fs.readFileSync(require('path').join(__dirname, '../../deploy/index.html'), 'utf8');
  const h = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 16);
  console.log('live sha', h(liveHtml), 'local sha', h(local), liveHtml === local ? 'IDENTICAL' : 'DIFFERENT');
  await sleep(3000);
  const ev = (f, a) => p.evaluate(f, a);

  // Real clicks: first-visit language picker → Français, then Songs → Choir Workspace.
  await p.locator('#languageSelectOverlay [data-lang="fr"]').click();
  await sleep(500);
  await p.locator('.snb-item[data-shell="songs"]').click();
  await sleep(600);
  const open = p.locator('[data-enter-panel="choir"]:visible').first();
  await open.scrollIntoViewIfNeeded(); await open.click();
  await sleep(800);
  console.log('lang', await ev(() => currentLanguage), '| choir panel active:', await ev(() => document.getElementById('panel-choir').classList.contains('active')));

  // Test-tone mic (a real MediaStream into Studio Mode's MediaRecorder) + measurement taps.
  await ev(async () => {
    await initAudioOnly(); ensureChoirGainNodes();
    const dest = audioCtx.createMediaStreamDestination(), osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    g.gain.value = 0; osc.connect(g).connect(dest); osc.start();
    window.__mic = { osc, g }; micStream = dest.stream;
    analyser = audioCtx.createAnalyser(); analyser.fftSize = 2048; dataArray = new Float32Array(2048);
    window.__taps = {};
    Object.keys(choirGainNodes).forEach(k => { const a = audioCtx.createAnalyser(); a.fftSize = 4096; choirGainNodes[k].connect(a); __taps[k] = a; });
    const sp = audioCtx.createScriptProcessor(1024, 1, 1); choirOutNode.connect(sp); sp.connect(audioCtx.destination);
    window.__pk = null;
    sp.onaudioprocess = e => { const d = e.inputBuffer.getChannelData(0), pk = window.__pk; e.outputBuffer.getChannelData(0).fill(0); if (!pk) return; for (let i = 0; i < d.length; i++) { const v = Math.abs(d[i]); pk.n++; if (v > pk.max) pk.max = v; if (v > 1) pk.over++; } };
  });
  const waitSongT = async s => { for (;;) { const t = await ev(() => audioCtx.currentTime - choirStartCtxTime); if (t >= s) return; await sleep(Math.max(10, (s - t) * 1000 - 30)); } };
  const measure = () => ev(() => {
    const cd = songChordDurMs() / 1000, idx = Math.floor((audioCtx.currentTime - choirStartCtxTime) / cd), out = { chord: idx + 1, trim: +choirOutNode.gain.value.toFixed(3), parts: {} };
    Object.keys(__taps).forEach(k => {
      const buf = new Float32Array(4096); __taps[k].getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length), f = rms > 0.003 ? autoCorrelate(buf, audioCtx.sampleRate) : -1;
      out.parts[k] = { gain: +choirGainNodes[k].gain.value.toFixed(3), rms: +rms.toFixed(4), heard: f > 0 ? midiName(Math.round(69 + 12 * Math.log2(f / 440))) : '—', written: midiName(SONG.parts[k].notes[idx]) };
    });
    return out;
  });
  const fmt = m => `chord ${m.chord} trim ${m.trim} | ` + Object.entries(m.parts).map(([k, v]) => `${k} g${v.gain} rms ${v.rms} ${v.heard}${v.heard === '—' ? '' : v.heard === v.written ? '✓' : '≠' + v.written}`).join(' | ');

  console.log('FR card before:', JSON.stringify(await ev(() => ({ title: document.querySelector('#yourChoirCard .step-label').textContent, summary: ycSummary.textContent, rows: [...document.querySelectorAll('#ycParts .yc-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()), play: ycPlayBtn.textContent, stop: ycStopBtn.textContent, headphones: document.querySelector('#yourChoirCard [data-i18n="tt_headphones"]').textContent, note: document.querySelector('[data-i18n="yc_storage_note"]').textContent, desc: ycDesc.textContent })), null, 1));

  for (const part of ['Alto', 'Bass']) {
    const btn = p.locator(`#ycParts [data-yc-rec="${part}"]`);
    await btn.scrollIntoViewIfNeeded(); await btn.click();
    await ev(async () => { while (!(yourChoir.recording && yourChoir.recording.downbeat)) await new Promise(r => setTimeout(r, 10)); });
    await ev(k => { const cd = songChordDurMs() / 1000, t0 = yourChoir.recording.downbeat, { osc, g } = __mic; SONG.parts[k].notes.forEach((m, i) => { osc.frequency.setValueAtTime(noteToFreq(m), t0 + i * cd); g.gain.setValueAtTime(0.5, t0 + i * cd); g.gain.setValueAtTime(0, t0 + (i + CHOIR_NOTE_FRACTION) * cd); }); }, part);
    const st = [];
    await waitSongT(-1); st.push(await ev(() => ycStatus.textContent));
    await waitSongT(5); st.push(await ev(() => ycStatus.textContent));
    const during = await measure();
    const ui = await ev(() => ({ stop: ycStopBtn.textContent, row: document.querySelector(`#ycParts [data-yc-part="${yourChoir.recording.part}"]`).innerText.replace(/\s+/g, ' ').trim() }));
    if (part === 'Alto') await p.locator('#yourChoirCard').screenshot({ path: SHOTS + 'live-yc-recording-fr.png' });
    await ev(async () => { while (yourChoir.recording) await new Promise(r => setTimeout(r, 50)); });
    const take = await ev(async k => {
      const tk = ycTakes()[k], buf = await ycDecode(tk.base64), d = buf.getChannelData(0), sr = buf.sampleRate, cd = songChordDurMs() / 1000;
      const win = Math.round(0.001 * sr), peakAt = q => { let m = 0; for (let i = q * win; i < (q + 1) * win && i < d.length; i++) m = Math.max(m, Math.abs(d[i])); return m; };
      const onsetAfter = sec => { for (let q = Math.floor(sec * sr / win) + 1; q * win < d.length; q++) if (peakAt(q) > 0.05 && peakAt(q - 1) <= 0.05 && peakAt(q - 5) < 0.01) return q * win / sr; return null; };
      const o1 = onsetAfter(tk.lead - 0.3), o2 = onsetAfter(tk.lead + cd * 0.5);
      return { lead: +tk.lead.toFixed(4), peak: +tk.peak.toFixed(3), dur: tk.dur, kb: Math.round(tk.base64.length / 1024), onset1VsDownbeatMs: +((o1 - tk.lead) * 1000).toFixed(1), onset2VsChord2Ms: +((o2 - tk.lead - cd) * 1000).toFixed(1) };
    }, part);
    console.log(`\n== Recorded ${part} (live)`);
    console.log('  status:', JSON.stringify(st), '→', await ev(() => ycStatus.textContent));
    console.log('  while recording:', fmt(during));
    console.log('  UI while recording:', JSON.stringify(ui));
    console.log('  take:', JSON.stringify(take));
  }

  // 2-part stack.
  await p.locator('#ycPlayBtn').click();
  await ev(async () => { while (!yourChoir.playing) await new Promise(r => setTimeout(r, 10)); });
  await ev(() => { __pk = { max: 0, over: 0, n: 0 }; });
  const rows = [];
  for (const t of [1.5, 5.0, 11.5, 25.0]) { await waitSongT(t); rows.push(await measure()); }
  const vu = await ev(() => Object.fromEntries(['Soprano', 'Lead', 'Alto', 'Tenor', 'Bass'].map(k => [k, document.getElementById('vu' + k).style.width])));
  const playingUi = await ev(() => ({ status: ycStatus.textContent, button: ycPlayBtn.textContent }));
  await p.locator('#yourChoirCard').screenshot({ path: SHOTS + 'live-yc-playing-fr.png' });
  await ev(async () => { while (yourChoir.playing) await new Promise(r => setTimeout(r, 50)); });
  const pk = await ev(() => { const q = __pk; __pk = null; return { peak: +q.max.toFixed(3), peakDbfs: +(20 * Math.log10(q.max)).toFixed(2), pctOver: +(100 * q.over / q.n).toFixed(2) }; });
  console.log('\n== Live 2-part stack (Alto + Bass, default faders)');
  rows.forEach(r => console.log('  ' + fmt(r)));
  console.log('  VU meters at 25 s:', JSON.stringify(vu), '| stacked output', JSON.stringify(pk));
  console.log('  UI while playing:', JSON.stringify(playingUi));
  console.log('FR card after:', JSON.stringify(await ev(() => ({ summary: ycSummary.textContent, rows: [...document.querySelectorAll('#ycParts .yc-row')].map(r => r.innerText.replace(/\s+/g, ' ').trim()), play: ycPlayBtn.textContent })), null, 1));
  console.log('shots in', SHOTS, '| page errors:', errors);
  await b.close();
})();
