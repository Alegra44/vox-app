// Phase 7 checks: Performance Report, "Why Did I Fail?", Readiness Engine, Choir DNA, Choir Passport.
// A stand-in singer (oscillator → the app's pitch analyser) sings known offsets and entry delays per chord,
// then the report and the "Why?" panels are compared with the injected values and with the raw frames.
// Usage: node scripts/choir-verify/p7.js [report|why|ready|i18n|all] [url]
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const which = process.argv[2] || 'all';
const url = process.argv[3] || 'http://localhost:8765/';

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await browser.newContext({ permissions: ['microphone'] });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/progress (load|save) error|Not signed in/.test(m.text())) errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' });
  await sleep(3000);
  const ev = (f, a) => page.evaluate(f, a);
  await ev(() => { ['choirChallengeBest', 'harmonyMemoryBest', 'rehearsalPasses'].forEach(k => localStorage.removeItem(k)); enterPanel('partrehearsal'); });
  await sleep(500);
  await ev(() => { selectSong('hymn'); setRehearsalPart('Alto'); setRehearsalLevel(0); harmonyMemory.stage = 0; renderPartRehearsal(); });

  // Stand-in singer for the part being scored: plan[i] = {c: cents off, d: entry delay (fraction of the note), dur: sung length (s)} or null (silent).
  const standIn = plan => ev(pl => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    const run = harmonyMemory.active ? harmonyMemory : challenge;
    run.notes.forEach((nt, i) => {
      const p = pl[i]; if (!p) return;
      const len = nt.end - nt.start, on = choirStartCtxTime + nt.start + (p.d || 0) * len;
      const off = p.dur ? on + p.dur : choirStartCtxTime + nt.end - 0.01;
      osc.frequency.setValueAtTime(noteToFreq(nt.midi + p.c / 100), on);
      g.gain.setValueAtTime(0.3, on); g.gain.setValueAtTime(0, off);
    });
    analyser = an;
  }, plan);
  const waitDone = () => ev(async () => { while (harmonyMemory.active || challenge.active) await new Promise(r => setTimeout(r, 50)); });

  // Independent recomputation from the raw frames the run stored (same formulas, written out again here).
  const independent = run => ev(r => {
    const heard = r.results.map((x, i) => i).filter(i => r.results[i].heard);
    const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const pitch = heard.map(i => Math.max(0, Math.round(100 - mean(r.cents[i].map(Math.abs)) * 0.6)));
    const timing = heard.map(i => r.firstVoiced[i] < (r.notes[i].end - r.notes[i].start) * 0.4 ? 100 : 50);
    return {
      held: r.held, n: r.notes.length, score: r.score, heard: heard.length,
      pitch: Math.round(mean(pitch)), timing: Math.round(mean(timing)),
      perNote: r.notes.map((nt, i) => ({ chord: i + 1, target: midiName(nt.midi), frames: r.cents[i].length,
        median: r.cents[i].length ? Math.round(hmMedian(r.cents[i])) : null,
        entryMs: r.firstVoiced[i] === null ? null : Math.round(r.firstVoiced[i] * 1000), noteMs: Math.round((nt.end - nt.start) * 1000),
        verdict: r.results[i].held ? 'held' : r.results[i].heard ? 'off' : 'not heard' })),
    };
  }, run);

  const PLAN = [
    { c: 0 }, { c: 20 }, { c: 80 }, { c: 0, d: 0.55 },  // chord 3 sharp (miss), chord 4 late entry but in tune
    null, { c: -120 }, { c: 0 }, { c: 0, d: 0, dur: 0.075 }, // chord 5 silent, 6 a semitone+ flat, 8 only inside the unjudged first 100 ms
  ];

  if (which === 'all' || which === 'report' || which === 'why') {
    console.log('== Harmony Memory stage 1, Demo Hymn Alto, stand-in plan:', JSON.stringify(PLAN));
    await ev(async () => { document.getElementById('hmemStartBtn').click(); while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await standIn(PLAN);
    await waitDone();
    const ind = await independent(await ev(() => harmonyMemory.lastRun));
    console.table(ind.perNote);
    console.log('independent:', JSON.stringify({ held: ind.held, n: ind.n, score: ind.score, heard: ind.heard, pitch: ind.pitch, timing: ind.timing }));
    const shown = await ev(() => [...document.querySelectorAll('#hmemResults .pr-report .record-row')].map(r => r.innerText.replace(/\s+/g, ' ')));
    console.log('Performance Report shown:\n  ' + shown.join('\n  '));
    console.log('insight:', await ev(() => document.querySelector('#hmemResults .pr-report p.desc').textContent));
    console.log('why buttons on chords:', await ev(() => [...document.querySelectorAll('#hmemResults [data-why]')].map(b => +b.dataset.why + 1).join(',')));

    for (const i of [2, 5, 4, 7]) {
      await ev(i => document.querySelector(`#hmemResults [data-why="${i}"]`).click(), i);
      console.log(`\n-- Why? chord ${i + 1}:\n` + await ev(i => document.querySelector(`#hmemResults [data-why-detail="${i}"]`).innerText, i));
      console.log('   plot dots:', await ev(i => document.querySelectorAll(`#hmemResults [data-why-detail="${i}"] circle`).length, i),
        '| aria-expanded:', await ev(i => document.querySelector(`#hmemResults [data-why="${i}"]`).getAttribute('aria-expanded'), i));
    }
    await ev(() => document.querySelector('#hmemResults [data-why="7"]').click());
    console.log('after closing: open panels =', await ev(() => document.querySelectorAll('#hmemResults .why-detail').length));

    console.log('\n== Boss 1 (Drowner): in tune except chord 2 (−70¢) → 7/8 wins');
    await ev(() => { chSel.boss = 0; renderChoirBosses(); });
    await ev(async () => { document.getElementById('cbStartBtn').click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await standIn([{ c: 0 }, { c: -70 }, { c: 0 }, { c: 0 }, { c: 0 }, { c: 0 }, { c: 0 }, { c: 0 }]);
    await waitDone();
    const bi = await independent(await ev(() => challenge.lastRun.boss));
    console.log('independent:', JSON.stringify({ held: bi.held, score: bi.score, heard: bi.heard, pitch: bi.pitch, timing: bi.timing }), 'chord 2 median', bi.perNote[1].median);
    console.log('shown:', await ev(() => [...document.querySelectorAll('#cbResults .pr-report .record-row')].map(r => r.innerText.replace(/\s+/g, ' ')).join(' | ')));
    await ev(() => document.querySelector('#cbResults [data-why="1"]').click());
    console.log('Why? chord 2:\n' + await ev(() => document.querySelector('#cbResults [data-why-detail="1"]').innerText));

    console.log('\n== Boss 2 (Drifter) lost early: silent from chord 2');
    await ev(async () => { document.getElementById('cbStartBtn').click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
    await standIn([{ c: 0 }, null, null, null, null, null, null, null]);
    await waitDone();
    await ev(() => document.querySelector('#cbResults [data-why="6"]').click());
    console.log('Why? chord 7 (unreached):\n' + await ev(() => document.querySelector('#cbResults [data-why-detail="6"]').innerText));
  }

  if (which === 'all' || which === 'ready') {
    console.log('\n== Readiness after those runs (signed out, so nothing is sent):');
    console.log(await ev(() => rdRows.innerText));
    console.log('choir_readiness object:', JSON.stringify(await ev(() => progress.choirReadiness && { parts: progress.choirReadiness.parts, log: progress.choirReadiness.log, runs: progress.choirReadiness.runs.length })));

    console.log('\n== A full rehearsal play-through at level 1, then one interrupted by a level change');
    await ev(() => { setRehearsalLevel(0); });
    const passes = async () => ev(() => localStorage.getItem('rehearsalPasses'));
    await ev(() => startPartRehearsal(0));
    const total = await ev(() => choirEndCtxTime - choirStartCtxTime);
    await ev(async tot => { const s0 = choirStartCtxTime; while (choirStartCtxTime === s0) await new Promise(r => setTimeout(r, 50)); }, total);
    console.log('after 1 loop at level 1:', await passes());
    await sleep(800);
    await ev(() => setRehearsalLevel(1)); // mid-pass: this pass must not count
    await ev(async () => { const s0 = choirStartCtxTime; while (choirStartCtxTime === s0) await new Promise(r => setTimeout(r, 50)); });
    console.log('after a pass that changed level mid-way:', await passes());
    await ev(async () => { const s0 = choirStartCtxTime; while (choirStartCtxTime === s0) await new Promise(r => setTimeout(r, 50)); });
    console.log('after a clean pass at level 2:', await passes());
    await ev(() => stopPartRehearsal());

    console.log('\n== Status rules, from stored bests (Alto) and a second part');
    await ev(() => {
      localStorage.setItem('harmonyMemoryBest', JSON.stringify({ hymn: { Alto: [100, 100, 88, 75, 75], Tenor: [50] } }));
      localStorage.setItem('choirChallengeBest', JSON.stringify({ boss: { hymn: { Alto: { 0: 88, 1: 75 }, Bass: { 0: 100 } } } }));
      localStorage.setItem('rehearsalPasses', JSON.stringify({ hymn: { Alto: [0, 1, 2, 3], Soprano: [0, 1, 2] } }));
      renderReadiness();
    });
    console.log(await ev(() => rdRows.innerText));
    await ev(() => { const a = JSON.parse(localStorage.rehearsalPasses); a.hymn.Alto.push(4); localStorage.rehearsalPasses = JSON.stringify(a); rdSync('hymn', 'Alto'); });
    console.log('\nAlto after its 5th level:', await ev(() => document.querySelector('[data-rd-part="Alto"]').innerText.replace(/\s+/g, ' ')));
    console.log('log:', JSON.stringify(await ev(() => progress.choirReadiness.log.map(e => `${e.part}:${e.from}->${e.status}`))));
    console.log('Choir DNA (workspace):', await ev(() => ({ label: choirDnaWorkspaceSvg.getAttribute('aria-label'), note: choirDnaWorkspaceNote.textContent, dots: choirDnaWorkspaceSvg.querySelectorAll('circle').length })));
  }

  if (which === 'all' || which === 'i18n') {
    await ev(() => { window.__realProfile = profile; profile = profile || { name: 'test' }; enterPanel('choirpassport'); });
    for (const lang of ['fr', 'es', 'tr', 'en']) {
      await ev(l => setLanguage(l), lang);
      await ev(() => { enterPanel('partrehearsal'); if (!harmonyMemory.lastRun.whyIdx) harmonyMemory.lastRun.whyIdx = 2; renderHmResults(); });
      const d = await ev(() => ({
        report: document.querySelector('#hmemResults .pr-report').innerText.replace(/\s+/g, ' ').slice(0, 700),
        why: document.querySelector('#hmemResults .why-detail').innerText.replace(/\s+/g, ' '),
        ready: readinessCard.innerText.replace(/\s+/g, ' ').slice(0, 900),
      }));
      await ev(() => { enterPanel('choirpassport'); });
      d.passport = await ev(() => document.getElementById('panel-choirpassport').innerText.replace(/\s+/g, ' ').slice(0, 1600));
      console.log(`\n== ${lang}\n` + Object.entries(d).map(([k, v]) => `[${k}] ${v}`).join('\n'));
    }
    await ev(() => { profile = window.__realProfile; renderChoirPassport(); });
    console.log('\nsigned-out passport:', await ev(() => cpEmpty.textContent));
  }

  console.log('\npage errors:', errors);
  await browser.close();
})();
