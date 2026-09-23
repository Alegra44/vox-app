// Peak levels of the summed choir signal (what the speakers receive) during normal playback and a Drowner run.
// Usage: node scripts/choir-verify/peaks.js [url]
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  const page = await ctx.newPage();
  await page.addInitScript(() => localStorage.setItem('language', 'en'));
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(async () => {
    localStorage.removeItem('choirChallengeBest'); enterPanel('partrehearsal'); selectSong('hymn'); setRehearsalPart('Alto');
    await initAudioOnly(); ensureChoirGainNodes();
    // Tap the node that feeds the speakers: the master bus output if there is one, else the sum of every part.
    const sum = audioCtx.createGain();
    if (typeof choirOutNode !== 'undefined' && choirOutNode) choirOutNode.connect(sum); else Object.values(choirAnalyserNodes).forEach(a => a.connect(sum));
    const sp = audioCtx.createScriptProcessor(1024, 1, 1);
    sum.connect(sp); sp.connect(audioCtx.destination);
    window.__pk = { max: 0, over: 0, n: 0, sq: 0 };
    sp.onaudioprocess = e => { const b = e.inputBuffer.getChannelData(0); for (let i = 0; i < b.length; i++) { const v = Math.abs(b[i]); if (v > __pk.max) __pk.max = v; if (v > 1) __pk.over++; __pk.n++; __pk.sq += v * v; } e.outputBuffer.getChannelData(0).fill(0); };
  });
  const reset = () => ev(() => { __pk = { max: 0, over: 0, n: 0, sq: 0 }; });
  const read = () => ev(() => ({ peak: +__pk.max.toFixed(3), peakDbfs: +(20 * Math.log10(__pk.max)).toFixed(2), samplesOver1: __pk.over, pctOver: +(100 * __pk.over / __pk.n).toFixed(2), rmsDbfs: +(10 * Math.log10(__pk.sq / __pk.n)).toFixed(2) }));
  const waitSongT = async sec => { for (;;) { const t = await ev(() => audioCtx.currentTime - choirStartCtxTime); if (t >= sec) return; await sleep(Math.max(10, (sec - t) * 1000 - 30)); } };

  await ev(() => startPartRehearsal()); await sleep(300); await reset();
  await waitSongT(26.5); console.log('Normal rehearsal (Alto, level 1), whole hymn:', JSON.stringify(await read()));
  await ev(() => stopPartRehearsal());

  await ev(() => { chSel.boss = 0; renderChoirBosses(); });
  await ev(async () => { cbStartBtn.click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  // Stand-in singer so the boss doesn't win early and cut the run short.
  await ev(() => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser(); an.fftSize = 2048; g.gain.value = 0; o.connect(g).connect(an); o.start(); const cd = songChordDurMs() / 1000; SONG.parts.Alto.notes.forEach((m, i) => { const t0 = choirStartCtxTime + i * cd; o.frequency.setValueAtTime(noteToFreq(m), t0); g.gain.setValueAtTime(0.3, t0); g.gain.setValueAtTime(0, t0 + cd * CHOIR_NOTE_FRACTION); }); analyser = an; });
  await waitSongT(0.05); await reset();
  const mid = []; for (const t of [5, 18]) { await waitSongT(t); mid.push(await ev(() => ({ t: +(audioCtx.currentTime - choirStartCtxTime).toFixed(2), fx: Object.fromEntries(Object.entries(choirFxNodes).map(([p, f]) => [p, +f.gain.value.toFixed(3)])), mix: Object.fromEntries(Object.entries(choirGainNodes).map(([p, g]) => [p, +g.gain.value.toFixed(3)])), bus: typeof choirOutNode !== 'undefined' && choirOutNode ? +choirOutNode.gain.value.toFixed(3) : null }))); }
  await waitSongT(26.5); console.log('Drowner run, whole hymn:', JSON.stringify(await read()));
  console.log('gains during Drowner:', JSON.stringify(mid));
  await ev(() => finishChallenge(false));
  console.log('page errors:', errors);
  await browser.close();
})();
