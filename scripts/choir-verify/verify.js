const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const which = process.argv[2] || 'all';

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto('http://localhost:8765/', { waitUntil: 'load' });
  await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { localStorage.removeItem('harmonyMemoryBest'); enterPanel('partrehearsal'); });
  await sleep(500);
  await ev(() => setRehearsalPart('Alto'));

  // Wait until the song clock is at `sec` seconds past the downbeat.
  const waitSongT = async sec => { for (;;) { const t = await ev(() => audioCtx.currentTime - choirStartCtxTime); if (t >= sec) return t; await sleep(Math.max(10, (sec - t) * 1000 - 30)); } };
  const gains = () => ev(() => Object.fromEntries(Object.keys(choirGainNodes).map(p => [p, +choirGainNodes[p].gain.value.toFixed(4)])));

  if (which === 'all' || which === 'gates') {
    console.log('== Fresh unlock state');
    console.log(await ev(() => [...document.querySelectorAll('#hmemStages [data-hm-stage]')].map(b => `${+b.dataset.hmStage + 1}:${b.disabled ? 'locked' : 'open'}:${b.querySelector('.rh-level-pct').textContent}`)));
    console.log('== Real gain per stage (Alto; mixer S .65 L .85 A .70 T .70 B .75)');
    // Unlock everything for the gain survey, then restore.
    await ev(() => localStorage.setItem('harmonyMemoryBest', JSON.stringify({ hymn: { Alto: [100, 100, 100, 100, 100] } })));
    for (let s = 0; s < 6; s++) {
      await ev(s => { harmonyMemory.stage = s; renderHarmonyMemory(); }, s);
      await ev(() => startHarmonyMemory());
      const cnt = await ev(() => document.getElementById('hmemStatus').textContent);
      await waitSongT(1.5);
      const g = await gains();
      const st = await ev(() => ({ status: document.getElementById('hmemStatus').textContent, acOn: document.getElementById('panel-partrehearsal').classList.contains('acappella-on'), notesVisible: getComputedStyle(document.getElementById('rehearsalNotes')).display !== 'none', level: partRehearsal.level, readout: document.getElementById('rehearsalGainValue').textContent }));
      console.log(`stage ${s + 1}`, JSON.stringify(g), JSON.stringify(st), '| count-in:', cnt);
      await ev(() => finishHarmonyMemory(false));
      await sleep(200);
    }
    console.log('after stop: level', await ev(() => partRehearsal.level), 'acappella', await ev(() => partRehearsal.acappella), 'memory', await ev(() => partRehearsal.memory));
  }

  if (which === 'all' || which === 'ref') {
    console.log('== Stage 6 starting-note reference');
    await ev(() => { window.__tones = []; const orig = playTone; window.playTone = function (f, d, del, v) { __tones.push({ f: +f.toFixed(2), d: +d.toFixed(3), atSongT: +(audioCtx.currentTime + del - choirStartCtxTime).toFixed(3), v }); return orig.apply(this, arguments); }; });
    await ev(() => localStorage.setItem('harmonyMemoryBest', JSON.stringify({ hymn: { Alto: [100, 100, 100, 100, 100] } })));
    await ev(async () => { harmonyMemory.stage = 5; renderHarmonyMemory(); await startHarmonyMemory(); });
    const cnt6 = []; for (const t of [-3.0, -0.5]) { await waitSongT(t); cnt6.push(await ev(() => document.getElementById('hmemStatus').textContent)); } console.log('stage 6 count-in status:', cnt6);
    await waitSongT(0.3);
    console.log(await ev(() => __tones), 'expected G4 =', await ev(() => noteToFreq(SONG.parts.Alto.notes[0]).toFixed(2)), 'beat', (60 / 72).toFixed(3));
    await waitSongT(4.0);
    console.log('stage 6 mid-run es switch:', await ev(async () => { await setLanguage('es'); await new Promise(r => setTimeout(r, 200)); const o = { status: document.getElementById('hmemStatus').textContent, gains: Object.values(choirGainNodes).map(g => g.gain.value), acOn: document.getElementById('panel-partrehearsal').classList.contains('acappella-on'), live: bmLive.textContent, active: harmonyMemory.active }; await setLanguage('en'); return o; }));
    await ev(() => finishHarmonyMemory(false));
  }

  if (which === 'all' || which === 'breath') {
    for (const song of ['hymn', 'ballad']) {
      await ev(s => { selectSong(s); renderPartRehearsal(); }, song);
      const d = await ev(() => ({ summary: bmSummary.textContent, shape: bmShape.textContent, rows: [...document.querySelectorAll('#bmRows .record-row')].map(r => r.textContent.replace(/\s+/g, ' ').trim()), final: document.querySelector('#bmRows .fine-print').textContent }));
      console.log(`== Breath Map ${song}`); console.log(JSON.stringify(d, null, 1));
    }
    // Measure real silence in the Alto GainNode output while the hymn plays (Stage 1 = guide at full).
    await ev(async () => { selectSong('hymn'); await initAudioOnly(); ensureChoirGainNodes(); });
    await ev(() => {
      window.__rec = { runs: [], silentStart: null };
      const sp = audioCtx.createScriptProcessor(1024, 1, 1);
      choirGainNodes.Alto.connect(sp); sp.connect(audioCtx.destination);
      sp.onaudioprocess = e => {
        const buf = e.inputBuffer.getChannelData(0), t0 = e.playbackTime - choirStartCtxTime, sr = audioCtx.sampleRate;
        for (let i = 0; i < buf.length; i++) {
          const t = t0 + i / sr, silent = Math.abs(buf[i]) < 1e-7;
          if (silent && __rec.silentStart === null) __rec.silentStart = t;
          if (!silent && __rec.silentStart !== null) { __rec.runs.push([__rec.silentStart, t]); __rec.silentStart = null; }
        }
        e.outputBuffer.getChannelData(0).fill(0);
      };
      window.__sp = sp;
      startPartRehearsal();
    });
    await sleep(500);
    const live = [];
    for (const target of [3.0, 3.2, 6.5]) { await waitSongT(target); live.push([target, await ev(() => bmLive.textContent)]); }
    await waitSongT(26.55);
    const runs = await ev(() => __rec.runs.filter(r => r[0] > 0.5 && r[0] < 26.5).map(r => [+r[0].toFixed(4), +(r[1] - r[0]).toFixed(4)]));
    console.log('== Measured silent runs in real Alto audio (start s, duration s):', JSON.stringify(runs));
    console.log('== Live cue samples:', JSON.stringify(live));
    await ev(() => { stopPartRehearsal(); __sp.disconnect(); });
  }

  if (which === 'all' || which === 'score') {
    console.log('== Scoring with injected stand-in mic (hymn Alto, stage 1)');
    await ev(() => { localStorage.removeItem('harmonyMemoryBest'); selectSong('hymn'); harmonyMemory.lastRun = null; harmonyMemory.stage = 0; renderPartRehearsal(); });
    console.log('Hear the Mistake button still its own:', await ev(async () => { document.getElementById('hmStartBtn').click(); await new Promise(r => setTimeout(r, 300)); const r = harmonyMemory.active; stopAllActiveSessions(); return 'harmonyMemory.active=' + r; }));
    await ev(() => enterPanel('partrehearsal'));
    await ev(() => document.querySelector('#hmemStages [data-hm-stage="0"]').click());
    await ev(async () => { document.getElementById('hmemStartBtn').click(); while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await ev(async () => {
      // Stand-in singer: sine on each Alto note; chord 3 sung +80 cents sharp, chord 6 silent, chord 8 an octave low (octave-folded = in tune).
      const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
      an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
      const cd = songChordDurMs() / 1000;
      SONG.parts.Alto.notes.forEach((m, i) => {
        const t0 = choirStartCtxTime + i * cd, midi = m + (i === 2 ? 0.8 : 0) - (i === 7 ? 12 : 0);
        osc.frequency.setValueAtTime(noteToFreq(midi), t0);
        g.gain.setValueAtTime(i === 5 ? 0 : 0.3, t0);
        g.gain.setValueAtTime(0, t0 + cd * CHOIR_NOTE_FRACTION);
      });
      window.__standIn = { osc, an };
      analyser = an;
    });
    await waitSongT(12);
    console.log('mid-run fr switch → status:', await ev(async () => { await setLanguage('fr'); await new Promise(r => setTimeout(r, 300)); return { status: document.getElementById('hmemStatus').textContent, live: bmLive.textContent, stage1: document.querySelector('#hmemStages .rh-level-name').textContent, start: document.getElementById('hmemStartLabel').textContent, gainAlto: choirGainNodes.Alto.gain.value.toFixed(4), gainBass: choirGainNodes.Bass.gain.value.toFixed(4), active: harmonyMemory.active, bmSummary: bmSummary.textContent }; }));
    await waitSongT(27.2);
    await sleep(400);
    const r = await ev(() => ({ active: harmonyMemory.active, run: harmonyMemory.lastRun, results: document.getElementById('hmemResults').innerText, stored: localStorage.getItem('harmonyMemoryBest'), nextStage: harmonyMemory.stage, stages: [...document.querySelectorAll('#hmemStages [data-hm-stage]')].map(b => b.disabled ? 'locked' : 'open') }));
    console.log(JSON.stringify(r, null, 1));
    console.log('== Switch to tr after results');
    console.log(await ev(async () => { await setLanguage('tr'); return { results: document.getElementById('hmemResults').innerText, desc: document.getElementById('hmemDesc').textContent, stageDesc: document.getElementById('hmemStageDesc').textContent, bm: bmSummary.textContent, live: bmLive.textContent }; }));
    console.log('== Switch to es');
    console.log(await ev(async () => { await setLanguage('es'); return { results: document.getElementById('hmemResults').innerText.slice(0, 200), stages: document.getElementById('hmemStages').innerText.replace(/\s+/g, ' ') }; }));
    await ev(() => setLanguage('en'));
  }

  console.log('page errors:', errors);
  await browser.close();
})();
