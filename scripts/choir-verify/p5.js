// Phase 5 checks: Choir Bosses, Chaos Mode, Tempo/Key Ladder.
// Usage: node scripts/choir-verify/p5.js [fx|score|i18n|all] [url]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const which = process.argv[2] || 'all';
const url = process.argv[3] || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { localStorage.removeItem('choirChallengeBest'); enterPanel('partrehearsal'); });
  await sleep(500);
  await ev(() => { selectSong('hymn'); setRehearsalPart('Alto'); setRehearsalLevel(0); });

  const waitSongT = async sec => { for (;;) { const t = await ev(() => audioCtx.currentTime - choirStartCtxTime); if (t >= sec) return t; await sleep(Math.max(10, (sec - t) * 1000 - 30)); } };
  const start = async (kind) => ev(async k => {
    document.getElementById({ boss: 'cbStartBtn', chaos: 'cxStartBtn', ladder: 'tkStartBtn' }[k]).click();
    while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20));
  }, kind);
  // Real measurement taps: a 4096-sample analyser after each part's mixer GainNode; pitch via the app's autoCorrelate.
  const installTaps = () => ev(async () => {
    await initAudioOnly(); ensureChoirGainNodes();
    if (window.__taps) return;
    window.__taps = {};
    Object.keys(choirGainNodes).forEach(p => { const a = audioCtx.createAnalyser(); a.fftSize = 4096; choirGainNodes[p].connect(a); __taps[p] = a; });
  });
  const measure = () => ev(() => {
    const out = { songT: +(audioCtx.currentTime - choirStartCtxTime).toFixed(3), tempo: +SONG.tempo.toFixed(2) };
    const chordDur = songChordDurMs() / 1000, idx = Math.floor((audioCtx.currentTime - choirStartCtxTime) / chordDur);
    out.chord = idx + 1;
    out.parts = {};
    Object.keys(__taps).forEach(p => {
      const buf = new Float32Array(4096); __taps[p].getFloatTimeDomainData(buf);
      const rms = Math.sqrt(buf.reduce((a, v) => a + v * v, 0) / buf.length);
      const f = rms > 0.005 ? autoCorrelate(buf, audioCtx.sampleRate) : -1;
      const written = SONGS[currentSongId].parts[p].notes[idx];
      out.parts[p] = { mix: +choirGainNodes[p].gain.value.toFixed(3), fx: +choirFxNodes[p].gain.value.toFixed(3), rms: +rms.toFixed(4),
        heardCentsVsWritten: f > 0 ? Math.round(1200 * Math.log2(f / noteToFreq(written))) : null };
    });
    return out;
  });
  const fmt = m => `t=${m.songT} chord ${m.chord} tempo ${m.tempo} | ` + Object.entries(m.parts).map(([p, v]) => `${p} mix ${v.mix} fx ${v.fx} rms ${v.rms} Δ${v.heardCentsVsWritten}¢`).join(' | ');
  // Stand-in singer on the current (variant) SONG line: offsets[i] cents per chord, null = silent.
  const standIn = (offsets) => ev(offs => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    const cd = songChordDurMs() / 1000, part = challenge.part;
    SONG.parts[part].notes.forEach((m, i) => {
      const t0 = choirStartCtxTime + i * cd, off = offs[i];
      osc.frequency.setValueAtTime(noteToFreq(m + (off || 0) / 100), t0);
      g.gain.setValueAtTime(off === null ? 0 : 0.3, t0);
      g.gain.setValueAtTime(0, t0 + cd * CHOIR_NOTE_FRACTION);
    });
    window.__standIn = { osc };
    analyser = an;
  }, offsets);
  const waitDone = () => ev(async () => { while (challenge.active) await new Promise(r => setTimeout(r, 50)); });

  if (which === 'all' || which === 'fx') {
    await installTaps();
    console.log('== Fresh state:', await ev(() => ({ bosses: [...document.querySelectorAll('#cbBosses [data-cb-boss]')].map(b => (b.disabled ? 'L:' : 'O:') + b.querySelector('.rh-level-name').textContent), rungs: [...document.querySelectorAll('#tkRungs [data-tk-rung]')].map(b => (b.disabled ? 'L:' : 'O:') + b.querySelector('.rh-level-name').textContent), rungDesc: tkRungDesc.textContent, cx: cxDesc.textContent })));
    await ev(() => { localStorage.setItem('choirChallengeBest', JSON.stringify({ boss: { hymn: { Alto: { 0: 100, 1: 100, 2: 100, 3: 100, 4: 100 } } }, ladder: { hymn: { Alto: { up0: 100, up1: 100, up2: 100, up3: 100, up4: 100 } } } })); renderChallenges(); });
    for (let b = 0; b < 6; b++) {
      await ev(b => { chSel.boss = b; renderChoirBosses(); }, b);
      console.log(`\n== Boss ${b + 1}: ${await ev(() => CH_BOSSES[chSel.boss].key)} — ${await ev(() => cbBossDesc(chSel.boss))}`);
      await ev(() => { window.__tones = []; if (!window.__origTone) { window.__origTone = playTone; window.playTone = function (f, d, del, v) { __tones.push({ f: +f.toFixed(2), d: +d.toFixed(3), atSongT: +(audioCtx.currentTime + del - choirStartCtxTime).toFixed(3) }); return __origTone.apply(this, arguments); }; } });
      await start('boss');
      await standIn([0, 0, 0, 0, 0, 0, 0, 0]); // in tune throughout, so no boss ends the run early
      const info = await ev(() => ({ level: partRehearsal.level, acappella: partRehearsal.acappella, memory: partRehearsal.memory, tempo: SONG.tempo, chordDur: +(songChordDurMs() / 1000).toFixed(4), songLen: +(choirEndCtxTime - choirStartCtxTime).toFixed(3), altoNotes: SONG.parts.Alto.notes.join(','), label: rehearsalSongLabel.textContent, chord5: SONG.chordLabels[4] }));
      console.log(JSON.stringify(info));
      const cd = info.chordDur;
      for (const t of [cd * 1.5, cd * 5.5]) { await waitSongT(t); console.log(fmt(await measure())); }
      console.log('status:', await ev(() => cbStatus.textContent), '| tones:', JSON.stringify(await ev(() => __tones.filter(x => x.d > 0.5))));
      await ev(() => finishChallenge(false));
      console.log('after stop:', JSON.stringify(await ev(() => ({ level: partRehearsal.level, ac: partRehearsal.acappella, mem: partRehearsal.memory, songIsBase: SONG === SONGS.hymn, fx: Object.values(choirFxNodes).map(f => f.gain.value), label: rehearsalSongLabel.textContent }))));
    }

    console.log('\n== Chaos run (hymn Alto, rehearsal level 1)');
    await start('chaos');
    const plan = await ev(() => challenge.cfg.plan);
    console.log('plan:', JSON.stringify(plan));
    const cd = await ev(() => songChordDurMs() / 1000);
    for (let i = 0; i < plan.length; i++) { await waitSongT(cd * (i + 0.5)); console.log(fmt(await measure()), '| status:', await ev(() => cxStatus.textContent)); }
    await ev(() => finishChallenge(false));

    console.log('\n== Ladder rung 6 up (130%, +2) then rung 3 down (110%, −1)');
    for (const [dir, rung] of [['up', 5], ['down', 0]]) {
      await ev(([d, r]) => { chSel.dir = d; chSel.rung = r; renderLadder(); }, [dir, rung]);
      console.log(await ev(() => ({ desc: tkRungDesc.textContent, rungs: [...document.querySelectorAll('#tkRungs [data-tk-rung]')].map(b => (b.disabled ? 'L:' : 'O:') + b.querySelector('.rh-level-name').textContent) })));
      await start('ladder');
      const cd2 = await ev(() => songChordDurMs() / 1000);
      await waitSongT(cd2 * 1.5); console.log(fmt(await measure()));
      console.log('status:', await ev(() => tkStatus.textContent));
      await ev(() => finishChallenge(false));
    }
  }

  if (which === 'all' || which === 'score') {
    await ev(() => { localStorage.removeItem('choirChallengeBest'); chSel.boss = 0; chSel.rung = 0; chSel.dir = 'up'; renderChallenges(); });
    console.log('\n== Boss 1 win: stand-in sings chords 1–7 in tune, chord 3 +80¢, chord 8 silent (6/8 = 75%)');
    await start('boss');
    await standIn([0, 0, 80, 0, 0, 0, 0, null]);
    await waitSongT(12); console.log('mid-run:', await ev(() => ({ status: cbStatus.textContent, hp: cbBossHpText.textContent, lives: cbLivesText.textContent, hpW: cbBossHp.style.width, livesW: cbLives.style.width })));
    await waitDone();
    console.log(await ev(() => ({ results: cbResults.innerText, sel: chSel.boss, stored: localStorage.getItem('choirChallengeBest'), bosses: [...document.querySelectorAll('#cbBosses [data-cb-boss]')].map(b => (b.disabled ? 'L' : 'O') + ':' + b.querySelector('.rh-level-pct').textContent) })));

    console.log('\n== Boss 2 lose early: silent from chord 2 → 3 misses end the fight after chord 4');
    await start('boss');
    await standIn([0, null, null, null, 0, 0, 0, 0]);
    const t0 = Date.now();
    await waitDone();
    console.log(await ev(() => ({ endedAtSongT: +(audioCtx.currentTime - choirStartCtxTime).toFixed(3), playing: choirIsPlaying, results: cbResults.innerText, hp: cbBossHpText.textContent, lives: cbLivesText.textContent, sel: chSel.boss })), 'wall s', (Date.now() - t0) / 1000);

    console.log('\n== Ladder rung 1 pass, then rung 2 (110%) sung against the transposed line');
    await ev(() => { chSel.dir = 'down'; renderLadder(); });
    await start('ladder');
    await standIn([0, 0, 0, 0, 0, 0, 0, 0]);
    await waitDone();
    console.log(await ev(() => ({ results: tkResults.innerText.slice(0, 300), sel: chSel.rung, rungs: [...document.querySelectorAll('#tkRungs [data-tk-rung]')].map(b => (b.disabled ? 'L' : 'O') + ':' + b.querySelector('.rh-level-pct').textContent) })));

    console.log('\n== Chaos scoring: stand-in in tune on calm chords, +90¢ on chaos chords');
    await start('chaos');
    const plan = await ev(() => challenge.cfg.plan);
    await standIn(plan.map(e => e ? 90 : 0));
    await waitDone();
    console.log('plan', JSON.stringify(plan));
    console.log(await ev(() => ({ results: cxResults.innerText, best: cxBest.textContent })));
  }

  if (which === 'all' || which === 'i18n') {
    for (const lang of ['fr', 'es', 'tr', 'en']) {
      console.log(`\n== ${lang}`);
      console.log(await ev(async l => { await setLanguage(l); return { cb: cbDesc.textContent, boss: document.getElementById('cbBossDesc').textContent, bosses: cbBosses.innerText.replace(/\s+/g, ' '), bars: cbBossHpText.textContent + ' / ' + cbLivesText.textContent, cx: cxDesc.textContent, cxBest: cxBest.textContent, tk: tkDesc.textContent, rung: tkRungDesc.textContent, rungs: tkRungs.innerText.replace(/\s+/g, ' '), start: [cbStartLabel, cxStartLabel, tkStartLabel].map(e => e.textContent), results: cxResults.innerText.slice(0, 160) }; }, lang));
    }
  }

  console.log('\npage errors:', errors);
  await browser.close();
})();
