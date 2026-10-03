// Pre-session warm-up, phases 1–2: the tracking.
//  A. Exercises follow the voice exactly as Glider does. One scripted pitch stream (silence before the first note, a
//     sweep, dropouts, NaN / 0 / Infinity readings, pitches above and below the range, a vibrato, a long silence) is fed
//     frame by frame to Glider and to a warm-up exercise (autoCorrelate stubbed, frames stepped by hand): every frame's
//     height must be identical, and identical to Glider before this change (local runs: master's deploy/index.html).
//     Plus the edge cases already fixed in Glider: no movement before the first note, a fall (not NaN) on no pitch.
//  B. The four exercises on the real mic path (a C4 file mic): the dot settles on C4's height, the trace is drawn,
//     each runs its 20 s and is marked done; after several, "Start my session" lets the waiting session go.
//  C. Song warm-up on every song in the library: the song's Lead line, synthesised in the page and scheduled on the
//     backing pad's own start time, stands in for the singer. Each note: the roll's current note, the cursor on the
//     note's height, in tune (teal); a semitone sharp: coral, a semitone up. The pad plays every part, the song ends on
//     time, the session's song is restored.
//  D. Skipping mid-exercise and mid-song stops it and restores everything.
// Usage (from the main checkout): node scripts/warmup-verify/tracking.js [url]
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { URL_, TMP, sleep, check, totals, tone, launch, openPage, warm, rearm, overlayShown } = require('./common');

// ---- A: the scripted stream (Hz per frame; -1 is autoCorrelate's "no pitch") ----
const hz = m => 440 * Math.pow(2, (m - 69) / 12);
const SEQ = [
  ...Array(40).fill(-1),                                          // before the first note: nothing moves
  ...Array.from({ length: 120 }, (_, i) => hz(50 + 20 * i / 119)), // a sweep up through the range
  ...Array(20).fill(-1),                                          // a gap: falls 3.2 px a frame
  NaN, NaN, 0, 0, -1, Infinity, Infinity, NaN,                    // the readings that used to give NaN
  ...Array(15).fill(5000), ...Array(15).fill(30),                  // above / below the range: clamped
  ...Array.from({ length: 120 }, (_, i) => hz(60 + 0.8 * Math.sin(2 * Math.PI * 5.5 * i / 60))), // vibrato around C4
  ...Array.from({ length: 30 }, (_, i) => (i % 3 ? hz(64) : -1)),  // a flickering detector
  ...Array(150).fill(-1),                                         // a long silence: to the floor and held there
];
// Runs SEQ through Glider (what: 'glider') or a warm-up exercise ('warmup') in the page; returns each frame's height.
const RUN = async ({ what, seq }) => {
  let k = 0, q = [];
  const realRaf = window.requestAnimationFrame;
  window.requestAnimationFrame = fn => { q.push(fn); return q.length; };
  const realAc = autoCorrelate; autoCorrelate = () => seq[Math.min(k, seq.length - 1)];
  const ys = [], flags = [];
  try {
    if (what === 'glider') {
      if (typeof wuMarkPassed === 'function') wuMarkPassed('skipped'); // Glider's own start must not wait on the warm-up
      if (window.__seed) __seed(7); // the course (and so the start height) comes from Math.random: same seed on every page
      vlSidecar = () => {};
      gliderGapAtWorldX = () => ({ gapY: 160, gapH: 100000 }); // no crash, so the whole stream is flown
      gliderMode = 'highway';
      await startGlider();                                    // runs frame 0 (silence: nothing moves)
      ys.push(gliderY); flags.push(gliderTookOff);
    } else {
      wuStartExercise('hum');
      while (!wuRun) await new Promise(r => setTimeout(r, 10)); // the mic opening; frame 0 has run
      ys.push(wuRun.y); flags.push(wuRun.started);
    }
    for (k = 1; k < seq.length; k++) {
      const fns = q; q = [];
      fns.forEach(f => f(performance.now()));
      if (what === 'glider') { ys.push(gliderY); flags.push(gliderTookOff); }
      else { ys.push(wuRun ? wuRun.y : NaN); flags.push(wuRun ? wuRun.started : null); }
    }
  } finally {
    autoCorrelate = realAc; window.requestAnimationFrame = realRaf;
    if (what === 'glider') { gliderActive = false; } else wuStop();
  }
  return { ys, flags, H: what === 'glider' ? document.getElementById('gliderCanvas').height : document.getElementById('warmupCanvas').height };
};

(async () => {
  const T = tone(60), b = await launch(T.wav);
  console.log(`warm-up tracking · ${URL_ || 'local deploy/ against the production backend'}`);
  const errors = [];
  try {
    // ---------------- A ----------------
    console.log('\n-- A. exercise tracking = Glider tracking, frame by frame');
    let { ctx, page, errors: e1 } = await openPage(b); errors.push(...e1);
    if (!await warm(page)) throw new Error('fake mic silent');
    const glider = await page.evaluate(RUN, { what: 'glider', seq: SEQ });
    await page.reload(); await sleep(3500); await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
    await rearm(page);
    await page.evaluate(() => { warmupGate(); });            // a session asked: the warm-up is open
    // same starting height as the glider (before the first note neither moves, so this is set after frame 0)
    const warmup = await page.evaluate(async ({ RUNsrc, seq, y0 }) => {
      const RUN = eval('(' + RUNsrc + ')');
      // wrap wuExLoop's first call so the dot starts where the glider did
      const orig = wuStartExercise;
      wuStartExercise = async id => { await orig(id); if (wuRun) wuRun.y = y0; };
      try { return await RUN({ what: 'warmup', seq }); } finally { wuStartExercise = orig; }
    }, { RUNsrc: RUN.toString(), seq: SEQ, y0: glider.ys[0] });
    const same = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
    const firstDiff = (a, b) => { const i = a.findIndex((v, j) => v !== b[j]); return i < 0 ? '' : `first differs at frame ${i}: ${a[i]} vs ${b[i]}`; };
    check(`both canvases ${glider.H} px high`, glider.H === warmup.H && glider.H === 320, `glider ${glider.H} · warm-up ${warmup.H}`);
    check(`all ${SEQ.length} frames: warm-up height === Glider height`, same(glider.ys, warmup.ys), firstDiff(glider.ys, warmup.ys) || `${SEQ.length} identical`);
    check('starts on the same frame (the first sung note)', same(glider.flags, warmup.flags), `glider took off at ${glider.flags.indexOf(true)}, warm-up started at ${warmup.flags.indexOf(true)}`);
    const pre = warmup.ys.slice(0, 40);
    check('before the first note: no movement (no fall, no NaN)', pre.every(v => v === pre[0]), `${pre[0]} … ${pre[39]}`);
    const gapStart = 160, fall = warmup.ys.slice(gapStart, gapStart + 20).map((v, i, a) => i ? +(v - a[i - 1]).toFixed(6) : null).slice(1);
    check('a gap: falls 3.2 px a frame', fall.every(d => d === 3.2 || d === 0), fall.slice(0, 6).join(', '));
    check('no NaN / Infinity at any frame (NaN, 0, Infinity, -1 readings)', warmup.ys.every(Number.isFinite), `${warmup.ys.filter(v => !Number.isFinite(v)).length} bad`);
    check('always inside the canvas (6 … H−6)', warmup.ys.every(v => v >= 6 && v <= warmup.H - 6), `min ${Math.min(...warmup.ys).toFixed(2)} max ${Math.max(...warmup.ys).toFixed(2)}`);
    check('a long silence ends on the floor (H−6)', warmup.ys[warmup.ys.length - 1] === warmup.H - 6, `${warmup.ys[warmup.ys.length - 1]}`);
    await ctx.close();
    if (!URL_) { // Glider before this change: master's index.html
      const before = path.join(TMP, 'wu-index-master.html');
      fs.writeFileSync(before, execFileSync('git', ['show', 'master:deploy/index.html'], { cwd: path.resolve(__dirname, '../..'), maxBuffer: 1 << 28 }));
      ({ ctx, page } = await openPage(b, { html: before }));
      const old = await page.evaluate(RUN, { what: 'glider', seq: SEQ });
      check('Glider unchanged by the refactor: every frame === master\'s Glider', same(old.ys, glider.ys) && same(old.flags, glider.flags), firstDiff(old.ys, glider.ys) || `${SEQ.length} identical`);
      // Karaoke's roll, now built by the shared builder: the same markup as before, both songs
      const rolls = async () => page.evaluate(() => Object.keys(SONGS).map(id => { SONG = SONGS[id]; buildKaraokeRoll(); const h = document.getElementById('karaokeRollSvg').innerHTML; SONG = SONGS[currentSongId]; return h; }));
      const oldRolls = await rolls(); await ctx.close();
      ({ ctx, page } = await openPage(b));
      const newRolls = await rolls(); await ctx.close();
      check('Karaoke roll markup unchanged (every song)', same(oldRolls, newRolls), oldRolls.map((h, i) => h === newRolls[i] ? 'same' : 'DIFF').join(', '));
    }

    // ---------------- B ----------------
    console.log('\n-- B. the four exercises on the real mic (C4)');
    ({ ctx, page, errors: e1 } = await openPage(b)); errors.push(...e1);
    if (!await warm(page)) throw new Error('fake mic silent');
    await rearm(page);
    await page.evaluate(() => { window.__sessionGo = false; warmupGate().then(() => { window.__sessionGo = true; }); });
    const yC4 = await page.evaluate(() => gliderMidiToY(60, 320));
    for (const id of ['trill', 'siren', 'glide', 'hum']) {
      await page.locator(`#warmupList [data-wu-item="${id}"]`).click();
      const started = await page.waitForFunction(() => wuRun && wuRun.started, null, { timeout: 8000, polling: 50 }).then(() => true).catch(() => false);
      await sleep(3000);
      const s = await page.evaluate(() => ({ y: wuRun && wuRun.y, voiced: wuRun ? wuRun.trail.filter(p => p.voiced).length / Math.max(1, wuRun.trail.length) : 0,
        stage: getComputedStyle(document.getElementById('warmupStage')).display, go: document.querySelector(`[data-wu-item="${wuRun && wuRun.ex.id}"] .wu-go`)?.textContent,
        px: (() => { const c = document.getElementById('warmupCanvas'), d = c.getContext('2d').getImageData(90, Math.round(wuRun.y), 1, 1).data; return [...d.slice(0, 3)]; })() }));
      const done = await page.waitForFunction(id => !wuRun && wuDone.has(id), id, { timeout: 25000, polling: 100 }).then(() => true).catch(() => false);
      const after = await page.evaluate(id => ({ go: document.querySelector(`[data-wu-item="${id}"] .wu-go`).textContent, cont: getComputedStyle(document.getElementById('warmupContinueBtn')).display,
        status: document.getElementById('warmupStatus').textContent }), id);
      check(`${id.padEnd(5)}: starts on the voice, dot on C4 (±3 px), trace drawn, runs 20 s, ✓ Done`,
        started && Math.abs(s.y - yC4) <= 3 && s.voiced > 0.9 && s.stage === 'block' && s.go === 'Stop' && done && after.go === '✓ Done' && after.cont !== 'none',
        `y ${s.y && s.y.toFixed(1)} vs ${yC4.toFixed(1)} · voiced ${(s.voiced * 100).toFixed(0)}% · dot px ${s.px} · during "${s.go}" · after "${after.go}", continue ${after.cont}, "${after.status}"`);
    }
    const waiting = await page.evaluate(() => !window.__sessionGo && !!wuPending);
    await page.locator('#warmupContinueBtn').click(); await sleep(300);
    const go = await page.evaluate(() => ({ go: window.__sessionGo, overlay: getComputedStyle(document.getElementById('warmupOverlay')).display, stored: localStorage.getItem(wuKey()) }));
    check('several done, then "Start my session": the waiting session goes, stored "done" for today', waiting && go.go && go.overlay === 'none' && go.stored === 'done', JSON.stringify({ waiting, ...go }));

    // ---------------- C ----------------
    console.log('\n-- C. song warm-up, every song in the library');
    const songs = await page.evaluate(() => Object.keys(SONGS));
    await rearm(page);
    await page.evaluate(() => { selectSong('ballad'); warmupGate(); }); // the session's song is Autumn Requiem
    await page.locator('#warmupOverlay [data-wu-mode="song"]').click();
    const listed = await page.evaluate(() => [...document.querySelectorAll('#warmupList [data-wu-item]')].map(b => b.dataset.wuItem + ' ' + b.querySelector('b').textContent));
    check(`song list = the library (${songs.length} songs)`, listed.length === songs.length && songs.every(id => listed.some(l => l.startsWith('song:' + id))), listed.join(' | '));
    const karaokeBefore = await page.evaluate(() => document.getElementById('karaokeRollSvg').innerHTML);
    for (const [id, cents] of [...songs.map(id => [id, 0]), [songs[0], 100]]) {
      // the singer: the song's Lead line from the pad's own start time, into an analyser the warm-up reads
      await page.evaluate(cents => {
        window.__origPad = window.__origPad || playBackingPad;
        playBackingPad = async (...a) => {
          const t0 = await window.__origPad(...a), dur = songChordDurMs() / 1000;
          const osc = audioCtx.createOscillator(), an = audioCtx.createAnalyser(), g = audioCtx.createGain();
          osc.type = 'triangle'; an.fftSize = 2048; g.gain.value = 0.4;
          SONG.parts.Lead.notes.forEach((m, i) => osc.frequency.setValueAtTime(440 * Math.pow(2, (m + cents / 100 - 69) / 12), t0 + i * dur));
          osc.connect(g); g.connect(an); osc.start(t0); osc.stop(t0 + SONG.parts.Lead.notes.length * dur + 0.2);
          if (!window.__realAnalyser) window.__realAnalyser = analyser; analyser = an;
          return t0;
        };
        window.__samples = [];
        clearInterval(window.__sampler);
        window.__sampler = setInterval(() => {
          if (!wuRun || wuRun.kind !== 'song' || !wuRun.t0) return;
          const c = document.getElementById('warmupLiveCursor');
          window.__samples.push({ el: performance.now() - wuRun.t0, idx: wuRun.idx, cy: +c.getAttribute('cy'), fill: c.getAttribute('fill'), disp: c.style.display,
            song: SONG === SONGS[wuRun.id], pad: backingActiveOsc.length });
        }, 30);
      }, cents);
      const t0 = Date.now();
      await page.locator(`#warmupList [data-wu-item="song:${id}"]`).click();
      const total = await page.evaluate(id => (60 / SONGS[id].tempo) * SONGS[id].beatsPerChord * SONGS[id].parts.Lead.notes.length * 1000, id);
      const ended = await page.waitForFunction(id => !wuRun && wuDone.has('song:' + id), id, { timeout: total + 15000, polling: 100 }).then(() => true).catch(() => false);
      const r = await page.evaluate(({ id, cents }) => {
        clearInterval(window.__sampler);
        if (window.__realAnalyser) analyser = window.__realAnalyser; window.__realAnalyser = null; playBackingPad = window.__origPad;
        const S = SONGS[id], notes = S.parts.Lead.notes, d = (60 / S.tempo) * S.beatsPerChord * 1000, sm = window.__samples;
        const lo = Math.min(...notes) - 3, hi = Math.max(...notes) + 3;
        const per = notes.map((m, i) => {
          const mid = sm.filter(s => s.el > i * d + 0.25 * d && s.el < i * d + 0.8 * d);
          const want = karaokeRollY(m + cents / 100, lo, hi), shown = mid.filter(s => s.disp === 'block');
          const med = shown.map(s => s.cy).sort((a, b) => a - b)[shown.length >> 1];
          return { n: mid.length, idxOk: mid.every(s => s.idx === i), shown: shown.length / Math.max(1, mid.length), teal: shown.filter(s => s.fill === 'var(--teal)').length / Math.max(1, shown.length),
            dy: Math.abs(med - want) };
        });
        const rects = document.querySelectorAll('#warmupNotesGroup .wu-note-rect').length;
        return { per, rects, notes: notes.length, pads: Math.max(...sm.map(s => s.pad)), songWhile: sm.every(s => s.song), last: Math.max(...sm.map(s => s.el)), dur: d * notes.length,
          restored: SONG === SONGS.ballad && currentSongId === 'ballad', padAfter: backingActiveOsc.length, done: wuDone.has('song:' + id) };
      }, { id, cents });
      const tag = `${id}${cents ? ' +100 ct' : ''}`;
      const inTune = !cents;
      check(`${tag}: roll has every note (${r.notes}), pad plays all 4 backing parts (${4 * r.notes} notes)`, r.rects === r.notes && r.pads === 4 * r.notes, `rects ${r.rects} · pad ${r.pads}`);
      check(`${tag}: every note — roll on that note, cursor on its height (±2), ${inTune ? 'teal' : 'coral'}`,
        r.per.every(p => p.n >= 5 && p.idxOk && p.shown > 0.9 && p.dy <= 2 && (inTune ? p.teal > 0.9 : p.teal < 0.1)),
        r.per.map((p, i) => `${i + 1}:${p.idxOk ? '' : 'IDX!'}${(p.teal * 100).toFixed(0)}%/${p.dy.toFixed(1)}`).join(' '));
      check(`${tag}: ends on time, marked done, pad stopped, session's song restored`, ended && r.done && Math.abs(r.last - r.dur) < 300 && r.padAfter === 0 && r.restored && r.songWhile,
        `ended ${ended} · last sample ${Math.round(r.last)} of ${Math.round(r.dur)} ms · pad ${r.padAfter} · restored ${r.restored} · SONG swapped while running ${r.songWhile}`);
    }
    const karaokeAfter = await page.evaluate(() => document.getElementById('karaokeRollSvg').innerHTML);
    check("Karaoke's own roll untouched by the warm-up's", karaokeAfter === karaokeBefore, '');

    // ---------------- D ----------------
    console.log('\n-- D. skipping mid-way');
    await page.locator(`#warmupList [data-wu-item="song:hymn"]`).click(); await sleep(2500);
    const mid = await page.evaluate(() => ({ song: SONG === SONGS.hymn, pad: backingActiveOsc.length }));
    await page.locator('#warmupSkipBtn').click(); await sleep(300);
    const afterSong = await page.evaluate(() => ({ run: !!wuRun, pad: backingActiveOsc.length, song: SONG === SONGS.ballad, pending: !!wuPending, overlay: getComputedStyle(document.getElementById('warmupOverlay')).display }));
    check('skip mid-song: pad stopped, song restored, gate released, closed', mid.song && mid.pad > 0 && !afterSong.run && afterSong.pad === 0 && afterSong.song && !afterSong.pending && afterSong.overlay === 'none', JSON.stringify({ mid, afterSong }));
    await rearm(page);
    await page.evaluate(() => { warmupGate(); });
    await page.locator(`#warmupList [data-wu-item="siren"]`).click();
    await page.waitForFunction(() => wuRun && wuRun.started, null, { timeout: 8000 }).catch(() => {});
    await page.locator('#warmupSkipBtn').click(); await sleep(400);
    const afterEx = await page.evaluate(() => ({ run: !!wuRun, pending: !!wuPending, stored: localStorage.getItem(wuKey()) }));
    check('skip mid-exercise: stopped, gate released, stored "skipped"', !afterEx.run && !afterEx.pending && afterEx.stored === 'skipped', JSON.stringify(afterEx));
    await ctx.close();
    check('no page errors', !errors.length, errors.slice(0, 3).join(' | '));
  } finally {
    await b.close();
    const { pass, fail } = totals();
    console.log(`\n==== warm-up tracking: ${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
