// Stage 6 (From memory) with a French switch mid-run. Usage: node s6fr.js <url>
const { chromium } = require('playwright');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'] });
  const p = await ctx.newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  await p.addInitScript(() => localStorage.setItem('language', 'en'));
  await p.goto(url); await sleep(3500);
  const ev = (f, a) => p.evaluate(f, a);
  const songT = () => ev(() => audioCtx.currentTime - choirStartCtxTime);
  const waitSongT = async s => { for (;;) { const t = await songT(); if (t >= s) return; await sleep(Math.max(10, (s - t) * 1000 - 30)); } };
  const snap = () => ev(() => {
    const status = document.getElementById('hmemStatus').textContent;
    const notesNames = SONG.parts.Alto.notes.map(midiName);
    return {
      songT: +(audioCtx.currentTime - choirStartCtxTime).toFixed(3),
      lang: currentLanguage, status,
      noteNameInStatus: notesNames.filter(n => status.includes(n)),
      gains: Object.fromEntries(Object.keys(choirGainNodes).map(k => [k, choirGainNodes[k].gain.value])),
      acappellaOn: document.getElementById('panel-partrehearsal').classList.contains('acappella-on'),
      visible: Object.fromEntries(['rehearsalNotes', 'rehearsalRoll', 'harmonyVisionBox', 'rehearsalLevels'].map(id => [id, !!document.getElementById(id).offsetParent])),
      hmActive: harmonyMemory.active, runStage: harmonyMemory.runStage + 1,
      startLabel: document.getElementById('hmemStartLabel').textContent,
      breathCue: document.getElementById('bmLive').textContent,
    };
  });
  await ev(() => { localStorage.setItem('harmonyMemoryBest', JSON.stringify({ hymn: { Alto: [100, 100, 100, 100, 100] } })); enterPanel('partrehearsal'); setRehearsalPart('Alto'); });
  await sleep(300);
  await ev(() => document.querySelector('#hmemStages [data-hm-stage="5"]').click());
  await ev(async () => { document.getElementById('hmemStartBtn').click(); while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  await waitSongT(-2); console.log('count-in (en)', JSON.stringify(await snap()));
  await waitSongT(5); console.log('before switch (en)', JSON.stringify(await snap()));
  await ev(() => setLanguage('fr'));
  await sleep(250); console.log('right after fr switch', JSON.stringify(await snap()));
  await waitSongT(11); console.log('later chord (fr)', JSON.stringify(await snap()));
  await waitSongT(26.0); console.log('near end (fr)', JSON.stringify(await snap()));
  await waitSongT(27.1); await sleep(300);
  console.log('after finish', JSON.stringify(await ev(() => ({ active: harmonyMemory.active, memoryFlag: partRehearsal.memory, acappella: partRehearsal.acappella, result: document.getElementById('hmemResults').innerText.split('\n').slice(0, 6) }))));
  console.log('page errors:', errors);
  await b.close();
})();
