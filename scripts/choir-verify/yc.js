// Phase 6 checks: Your Choir. A test tone stands in for the mic (a real MediaStream, so Studio Mode's
// MediaRecorder genuinely records it), singing each part's real notes on the song clock.
// Usage: node scripts/choir-verify/yc.js [url]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const SHOTS = require('os').tmpdir() + '/';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  await page.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.removeItem('yourChoirTakes'); });
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
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
