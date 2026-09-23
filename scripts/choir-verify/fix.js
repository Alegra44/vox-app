// Verifies: playback end follows the audio clock; loop restart; result colours. Usage: node fix.js <url>
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

  await ev(() => { enterPanel('partrehearsal'); setRehearsalPart('Alto'); });
  // Record when choirIsPlaying flips false, in audio-clock song time, plus wall-clock elapsed.
  await ev(async () => {
    document.querySelector('#hmemStages [data-hm-stage="0"]').click();
    document.getElementById('hmemStartBtn').click();
    while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20));
    window.__w0 = performance.now(); window.__a0 = audioCtx.currentTime;
    (function watch() { if (!choirIsPlaying) { window.__endAt = { songT: audioCtx.currentTime - choirStartCtxTime, audioElapsed: audioCtx.currentTime - __a0, wallElapsed: (performance.now() - __w0) / 1000 }; return; } requestAnimationFrame(watch); })();
  });
  for (const t of [25.5, 26.0, 26.4, 26.6]) { await waitSongT(t); console.log('probe', t, JSON.stringify(await ev(() => ({ playing: choirIsPlaying, cue: bmLive.textContent })))); }
  await waitSongT(27.2); await sleep(300);
  console.log('playback ended at', JSON.stringify(await ev(() => __endAt)), '| scheduled end songT', await ev(() => (choirEndCtxTime - choirStartCtxTime).toFixed(3)));
  console.log('run finished:', await ev(() => !harmonyMemory.active && !!harmonyMemory.lastRun));

  // Colours: Harmony Memory result rows + timing trainer verdict classes
  console.log('colours', JSON.stringify(await ev(() => {
    const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
    const probe = cls => { const el = document.createElement('span'); el.className = 'record-val ' + cls; document.getElementById('hmemResults').appendChild(el); const c = getComputedStyle(el).color; el.remove(); return c; };
    const rgb = v => { const el = document.createElement('span'); el.style.color = `var(${v})`; document.body.appendChild(el); const c = getComputedStyle(el).color; el.remove(); return c; };
    return { teal: rgb('--teal'), coral: rgb('--coral'), brass: rgb('--brass'), muted: rgb('--muted'),
      'hm-held': probe('hm-held'), 'hm-off': probe('hm-off'), 'hm-silent': probe('hm-silent'),
      'tt-ontime': probe('tt-ontime'), 'tt-late': probe('tt-late'), 'tt-early': probe('tt-early'),
      'real rows': [...document.querySelectorAll('#hmemResults .record-val')].map(e => e.textContent.split('·').pop().trim() + '=' + getComputedStyle(e).color) };
  }), null, 1));

  // Looping rehearsal playback still restarts at the song end, on the audio clock.
  await ev(() => startPartRehearsal());
  await sleep(300);
  const s0 = await ev(() => choirStartCtxTime);
  await waitSongT(26.0);
  for (;;) { const st = await ev(() => choirStartCtxTime); if (st !== s0) break; await sleep(50); }
  console.log('loop restart', JSON.stringify(await ev(s0 => ({ restartedAfter: +(choirStartCtxTime - s0 - 0.08).toFixed(3), songLen: +(songTotalDurMs() / 1000).toFixed(3), playing: choirIsPlaying }), s0)));
  await ev(() => stopPartRehearsal());
  await sleep(200);
  console.log('after stop', JSON.stringify(await ev(() => ({ playing: choirIsPlaying, cue: bmLive.textContent }))));
  console.log('page errors:', errors);
  await b.close();
})();
