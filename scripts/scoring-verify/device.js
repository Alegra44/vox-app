// Release B, B7: a real device modelled on the rig, inside the app's own AudioContext (no MediaStream hop between two
// contexts, whose ~20 ms the other rigs carry): every node the app connects to its destination also goes into a tap
// → output delay Do (a DelayNode: the speaker) → the room (−20 dB) → input delay Di (a DelayNode: the mic) → what the
// app gets from createMediaStreamSource. The "singer" is an oscillator in the room, in the same context: each note starts
// exactly when its beat reaches the room (the beat's audio-clock time + Do), or 150 ms after. Performance Director plays
// nothing: its singer follows the screen (the song's time, no Do). The device reports honestly: outputLatency Do,
// baseLatency 0, the mic track's latency Di. A −60 dBFS noise floor is in the room.
// Per device: the app's own speaker-delay sheet measures the round trip (Do + Di within ±5 ms), then a take of Rhythm,
// Entrance & Cutoff (entrances, Lead), Karaoke, Performance Director and Harmony Arena (Soprano, level 1), on time and
// 150 ms late. Each note's reading is compared with where the singer actually started it (a note scheduled after its
// time had passed starts late by a known amount): on time 0 ± 5 ms, late 150 ± 5 ms (the mean over the notes heard;
// every note is listed).
// --room-db: the speaker's level at the mic (default −30 dB; −20 dB: the app's own click and choir leak in as loud as a
// singer's attack). --legato: one unbroken sound changing pitch at each note (Karaoke, PD, Harmony Arena), for the pitch
// tracker's lag; a repeated note has no onset there and isn't counted.
// Usage: node scripts/scoring-verify/device.js [--devices 40/25,150/40] [--room-db -30] [--legato] [--out file.json]
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const C = require('../design-verify/common');
const { enterHub } = require('../choir-verify/cwreach');
const { DEVICE } = require('./devicemic');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const DEVICES = (arg('--devices') || '40/25,150/40').split(',').map(s => s.split('/').map(Number));
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.resolve(arg('--out') || path.join(__dirname, 'logs', `device-${stamp}.json`));
const TOL = 5, ROOM_DB = +(arg('--room-db') || -30), LEGATO = process.argv.includes('--legato');

let pass = 0, fail = 0; const out = [];
const check = (n, ok, d) => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); ok ? pass++ : fail++; };

// one take: start it, sing (refs: each note's reference time, when its beat reaches the singer), wait, read the offsets
async function take(page, tool, late, start, plan, busy, read, legato) {
  return C.G.step(`${tool} late ${late}`, 120, async () => { // normally 35 s
    await start();
    const r = await page.evaluate(async ([plan, late, legato]) => {
      const { refs, midis, durS } = new Function(`return (${plan})()`)();
      const step = refs.length > 1 ? refs[1] - refs[0] : durS;
      const acts = __dev.sing(refs.map((t, i) => ({ midi: midis[i % midis.length], on: t + late / 1000, off: t + late / 1000 + (legato ? step : durS) })), legato);
      return { refs, acts };
    }, [plan.toString(), late, legato]);
    await page.waitForFunction(`!(${busy})`, null, { timeout: 90000, polling: 200 });
    await C.sleep(600);
    const got = await page.evaluate(read);
    const notes = r.refs.map((ref, i) => {
      const truth = Math.round((r.acts[i] - ref) * 1000), reading = got[i] === undefined ? null : got[i];
      return { truth, reading, err: reading === null ? null : reading - truth };
    });
    await page.evaluate(() => { __dev.sing([]); try { stopAllActiveSessions(); } catch (e) {} });
    return notes;
  });
}

(async () => {
  const b = await C.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  try {
    const a = await C.openPage(b, {}); await C.signUp(a.page, 'dvdevice', 'Device B7'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const [Do, Di] of DEVICES) {
      console.log(`\n== device: output ${Do} ms, input ${Di} ms, room ${ROOM_DB} dB${LEGATO ? ', legato' : ''}`);
      const { ctx, page } = await C.openPage(b, { storageState: state, prepare: c => c.addInitScript(DEVICE, [Do, Di, ROOM_DB]) });
      try {
        await C.clearOverlays(page);
        // the app's own measurement
        const m = await C.G.step('speaker-delay sheet', 40, () => page.evaluate(async () => {
          window.__sdAllow = true; localStorage.removeItem(SD_STORE_KEY);
          await initAudio({ noWarmup: true }); sdKeyNow = await sdOutputKey(); sdOpen();
          const ov = document.getElementById('speakerDelayOverlay'), t0 = performance.now();
          while (ov.dataset.sdState === 'measuring' && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 100));
          document.getElementById('sdContinueBtn').click();
          return { stored: sdStored(), delay: sdDelayMs(), input: sdInputMs(), reported: sdReportedMs() };
        }));
        console.log(`sheet: ${JSON.stringify(m)}`);
        check(`device ${Do}/${Di}: the sheet measures the round trip ${Do + Di} ms within ±${TOL}`, m.stored && m.stored.how === 'measured' && Math.abs(m.stored.ms - Do - Di) <= TOL, `${m.stored && m.stored.how} ${m.stored && m.stored.ms} ms; PD's input share ${m.input} ms`);
        await page.evaluate(() => { const f = window.onsetTimings; window.onsetTimings = (...x) => { const r = f(...x); window.__lastTim = r; return r; }; });
        const tim = () => (window.__lastTim || []).map(x => x.offsetMs);
        const tools = [
          ['Rhythm', async () => { await C.showPanel(page, 'rhythm'); await C.clearOverlays(page);
            await page.evaluate(async () => { document.getElementById('rhythmStartBtn').click(); const u = performance.now() + 8000; while (!(rhythmActive && rhythmBeatTimestamps.length === 8) && performance.now() < u) await new Promise(r => setTimeout(r, 5)); }); },
            () => ({ refs: rhythmBeatTimestamps.map(t => t + __dev.Do / 1000), midis: [69], durS: 0.15 }), 'rhythmActive',
            () => rhythmResults.map(r => r && r.claimed ? r.offsetMs : null)],
          ['Entrance & Cutoff', async () => {
            await page.evaluate(() => showShellSection('songs')); await C.sleep(400);
            await enterHub(page, '#panel-songs-hub [data-enter-panel="partrehearsal"]', '#ttStartBtn');
            await page.evaluate(async () => { document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]').click(); timingTrainer.mode = 'entrance'; document.getElementById('ttStartBtn').click();
              const u = performance.now() + 8000; while (!(timingTrainer.active && choirIsPlaying) && performance.now() < u) await new Promise(r => setTimeout(r, 20)); }); },
            () => { const D = songChordDurMs() / 1000; return { refs: SONG.parts.Lead.notes.map((_, i) => choirStartCtxTime + i * D + __dev.Do / 1000), midis: SONG.parts.Lead.notes, durS: D * 0.85 }; },
            'timingTrainer.active', () => timingTrainer.results.map(r => r && r.claimed ? r.offsetMs : null)],
          ...[['Karaoke', 'karaoke', 'karaokeStartBtn', 'karaokeActive', 'karaokeStartCtx', 'Lead', true],
            ['Performance Director', 'performancedirector', 'pdStartBtn', 'pdActive', 'pdStartCtx', 'Lead', false]].map(([name, panel, btn, active, startVar, part, plays]) =>
            [name, async () => { await C.showPanel(page, panel); await C.clearOverlays(page);
              await page.evaluate(async ([btn, active]) => { window.__lastTim = null; document.getElementById(btn).click(); const u = performance.now() + 8000; while (!window.eval(active) && performance.now() < u) await new Promise(r => setTimeout(r, 2)); }, [btn, active]); },
              new Function(`const D = songChordDurMs() / 1000; return { refs: SONG.parts.${part}.notes.map((_, i) => ${startVar} + i * D + ${plays ? '__dev.Do / 1000' : '0'}), midis: SONG.parts.${part}.notes, durS: D * 0.85 };`),
              active, tim]),
          ['Harmony Arena', async () => {
            await page.evaluate(() => { window.__lastTim = null; progress.xp = Math.max(progress.xp || 0, 20000); window.saveProgress = async () => {}; showShellSection('world'); });
            await C.sleep(400); await page.evaluate(() => showArcadeGame('harmony')); await C.sleep(600);
            await page.evaluate(async () => { document.querySelector('#harmonyPartRow [data-harmony-part="Soprano"]').click(); document.querySelector('#harmonyLevelRow [data-harmony-level="1"]').click();
              document.getElementById('harmonyStartBtn').click(); const u = performance.now() + 8000; while (!harmonyActive && performance.now() < u) await new Promise(r => setTimeout(r, 2)); }); },
            () => { const D = songChordDurMs() / 1000; return { refs: SONG.parts.Soprano.notes.map((_, i) => harmonyStartCtx + i * D + __dev.Do / 1000), midis: SONG.parts.Soprano.notes, durS: D * 0.85 }; },
            'harmonyActive', tim],
        ];
        for (const [name, start, plan, busy, read] of tools) for (const late of [0, 150]) {
          if (LEGATO && (name === 'Rhythm' || name === 'Entrance & Cutoff')) continue; // legato: the onset-tracker tools
          const notes = await take(page, name, late, start, plan, busy, read, LEGATO);
          const heard = notes.filter(n => n.reading !== null), mean = heard.length ? heard.reduce((s, n) => s + n.err, 0) / heard.length : null;
          out.push({ device: [Do, Di], roomDb: ROOM_DB, legato: LEGATO, measured: m, tool: name, late, notes, meanErr: mean });
          console.log(`${name} late ${late}: ${notes.map(n => n.reading === null ? '—' : `${n.reading}${n.truth !== late ? `(t${n.truth})` : ''}`).join(' ')} · error mean ${mean === null ? '—' : mean.toFixed(1)} ms`);
          check(`device ${Do}/${Di} ${name} ${late ? '150 ms late' : 'on time'}: reads ${late} ± ${TOL} ms`, mean !== null && (LEGATO || heard.length >= notes.length - 1) && Math.abs(mean) <= TOL,
            `${heard.length}/${notes.length} heard, mean error ${mean === null ? '—' : mean.toFixed(1)} ms, notes ${heard.map(n => n.err).join(',')}`);
        }
      } finally { await ctx.close(); }
    }
  } finally { await b.close(); C.cleanup(); fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(out, null, 1)); }
  console.log(`\n${fail ? 'DEVICE: FAIL' : 'DEVICE: PASS'} (${pass} passed, ${fail} failed)\njson: ${path.relative(process.cwd(), OUT)}`);
  process.exitCode = fail ? 1 : 0;
})();
