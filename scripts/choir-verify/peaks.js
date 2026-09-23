// True peak / % samples over full scale / RMS of what reaches the speakers, across choir scenarios.
// Taps choirOutNode (the choir bus) or backingGainNode (backing pad), and keeps a per-chord peak so a
// single Chaos surge chord can be read on its own. Run against production for "before", localhost for "after".
// Usage: node scripts/choir-verify/peaks.js [url] [scenario,...]
//   scenarios: hymn, requiem, hymnmax, chaos, drowner, pad4, pad5 (default: all)
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
const only = process.argv[3] ? process.argv[3].split(',') : null;
const want = s => !only || only.includes(s);
(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  const page = await ctx.newPage();
  await page.addInitScript(() => { localStorage.setItem('language', 'en'); localStorage.removeItem('choirChallengeBest'); });
  const errors = []; page.on('pageerror', e => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(async () => {
    await initAudioOnly(); ensureChoirGainNodes(); ensureBackingGain();
    window.__pk = null;
    const sp = audioCtx.createScriptProcessor(1024, 1, 1);
    choirOutNode.connect(sp); backingGainNode.connect(sp); sp.connect(audioCtx.destination);
    sp.onaudioprocess = e => {
      const d = e.inputBuffer.getChannelData(0), pk = window.__pk;
      e.outputBuffer.getChannelData(0).fill(0);
      if (!pk) return;
      const sr = audioCtx.sampleRate, cd = songChordDurMs() / 1000;
      for (let i = 0; i < d.length; i++) {
        const v = Math.abs(d[i]); pk.n++; pk.sq += v * v;
        if (v > pk.max) pk.max = v; if (v > 1) pk.over++;
        const idx = Math.floor((e.playbackTime + i / sr - pk.t0) / cd);
        if (idx >= 0) pk.chord[idx] = Math.max(pk.chord[idx] || 0, v);
      }
    };
  });
  const reset = t0expr => ev(t0 => { window.__pk = { max: 0, over: 0, n: 0, sq: 0, chord: [], t0: t0 === null ? choirStartCtxTime : t0 }; }, t0expr);
  const read = () => ev(() => { const p = __pk; __pk = null; return { peak: +p.max.toFixed(3), peakDbfs: +(20 * Math.log10(p.max)).toFixed(2), pctOver: +(100 * p.over / p.n).toFixed(2), rmsDbfs: +(10 * Math.log10(p.sq / p.n)).toFixed(2), chordPeaks: p.chord.map(v => +v.toFixed(2)), trim: +choirOutNode.gain.value.toFixed(3) }; });
  const waitSongT = async sec => { for (;;) { const t = await ev(() => audioCtx.currentTime - choirStartCtxTime); if (t >= sec) return; await sleep(Math.max(10, (sec - t) * 1000 - 30)); } };
  const standIn = () => ev(() => { const o = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser(); an.fftSize = 2048; g.gain.value = 0; o.connect(g).connect(an); o.start(); const cd = songChordDurMs() / 1000; SONG.parts[challenge.part].notes.forEach((m, i) => { const t0 = choirStartCtxTime + i * cd; o.frequency.setValueAtTime(noteToFreq(m), t0); g.gain.setValueAtTime(0.3, t0); g.gain.setValueAtTime(0, t0 + cd * CHOIR_NOTE_FRACTION); }); analyser = an; });
  const out = (name, r) => console.log(name.padEnd(34), JSON.stringify(r));

  // Choir Workspace ▶ Play (plain playChoir, default mixer faders), whole song, no loop.
  const workspace = async (song, faders) => {
    await ev(([s, f]) => { enterPanel('choir'); selectSong(s); document.getElementById('choirLoopCheck').checked = false; if (f) Object.keys(choirState).forEach(p => { choirState[p].volume = f; document.getElementById('vol' + p).value = f * 100; }); updateAllChoirGains(); }, [song, faders]);
    await sleep(300);
    await ev(async () => { document.getElementById('choirPlayBtn').click(); while (!choirIsPlaying) await new Promise(r => setTimeout(r, 20)); });
    await reset(null);
    const total = await ev(() => choirEndCtxTime - choirStartCtxTime);
    await waitSongT(total - 0.05);
    const r = await read(); await ev(() => stopChoir()); return r;
  };
  const defaults = { Soprano: 0.65, Lead: 0.85, Alto: 0.7, Tenor: 0.7, Bass: 0.75 };
  const restore = () => ev(d => { Object.keys(d).forEach(p => { choirState[p].volume = d[p]; document.getElementById('vol' + p).value = d[p] * 100; }); updateAllChoirGains(); }, defaults);

  if (want('hymn')) out('Workspace play, Hymn', await workspace('hymn'));
  if (want('requiem')) out('Workspace play, Requiem', await workspace('ballad'));
  if (want('hymnmax')) { out('Workspace play, Hymn, faders 100%', await workspace('hymn', 1)); await restore(); }

  const challengeRun = async (kind, boss) => {
    await ev(([k, b]) => { selectSong('hymn'); enterPanel('partrehearsal'); setRehearsalPart('Alto'); if (b !== null) { localStorage.setItem('choirChallengeBest', JSON.stringify({ boss: { hymn: { Alto: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 } } } })); chSel.boss = b; renderChoirBosses(); } }, [kind, boss]);
    await ev(async k => { document.getElementById({ boss: 'cbStartBtn', chaos: 'cxStartBtn' }[k]).click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); }, kind);
    await standIn();
    const plan = await ev(() => challenge.cfg.plan || null);
    await waitSongT(0); await reset(null);
    await ev(async () => { while (challenge.active) await new Promise(r => setTimeout(r, 50)); });
    return { plan, r: await read() };
  };
  if (want('chaos')) {
    const { plan, r } = await challengeRun('chaos', null);
    const surge = plan.map((e, i) => e && e.type === 'surge' ? `chord ${i + 1} (${e.target}): peak ${r.chordPeaks[i]}` : null).filter(Boolean);
    out('Chaos run, Hymn Alto', r);
    console.log('  plan:', plan.map((e, i) => `${i + 1}:${e ? e.type + (e.target ? '/' + e.target : '') : 'calm'}`).join(' '), '| surge chords:', surge.join('; '));
  }
  if (want('drowner')) out('Drowner run, Hymn Alto', (await challengeRun('boss', 0)).r);

  // Backing pad (Stay in Key / Emotional Singing / Karaoke accompaniment), 4 and 5 parts.
  for (const [name, lead] of [['pad4', false], ['pad5', true]]) {
    if (!want(name)) continue;
    await ev(() => selectSong('hymn'));
    const t0 = await ev(async l => await playBackingPad(l), lead);
    await reset(t0);
    const total = await ev(() => songTotalDurMs() / 1000);
    for (;;) { const t = await ev(t => audioCtx.currentTime - t, t0); if (t >= total - 0.05) break; await sleep(200); }
    out(`Backing pad, Hymn, ${lead ? 5 : 4} parts`, { ...(await read()), padGain: await ev(() => +backingGainNode.gain.value.toFixed(3)) });
    await ev(() => stopBackingPad());
  }
  console.log('page errors:', errors);
  await browser.close();
})();
