// Release F4's check: the warm-up's summary, with the file mic. Each case is its own browser whose fake mic plays one
// exercise's guide (guidewav.py: the app's own guide formula for the case's range, 3 s of silence before it, 2 s
// after, looped). The exercise is started in a silence, so its clock starts on the first sung frame, as a singer who
// starts on the guide. Then Start my session shows the summary; its numbers and its next step are read from the page.
//   exact      the sirens sung on the guide                      → 95 % or more; the next step: your session (rule 5)
//   off2       the sirens sung 2 semitones sharp all the way      → 10 % or less
//   lost       the sirens on the guide, 3 semitones flat above p(0.7) → "lost above" named; Register Coach (rule 1)
//   wobble     Humming with ±40 ct at 5 Hz                       → spread over 20 ct; Tuner (rule 2)
//   easy       Humming on the guide, stored range 40–80           → an easy day, no tool (rule 3)
//   norange    Humming on the guide, no stored range              → Range Finder (rule 4)
// Also: the bars are in ink, not the voice colour (Rule 1); Start my session keeps the start-singing style; no summary
// before an exercise is finished (Start my session then starts the session); Coach → Warm-up's Finish shows it too.
// Local stack, a throwaway account (deleted however the run ends), silent.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/summary.js [out.json]
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const { execFileSync } = require('child_process');
const { sleep, check, totals, launch, openPage, rearm, TMP } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OUT = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : 'design/warmup/summary-f.json';
const DEFAULT = { lo: 45, hi: 72 }; // registerRangeBounds() with no range: A2–C5
const CASES = [
  { key: 'exact', ex: 'siren', range: { lo: 48, hi: 72 }, spec: {} },
  { key: 'off2', ex: 'siren', range: { lo: 48, hi: 72 }, spec: { offset: 2 } },
  { key: 'lost', ex: 'siren', range: { lo: 48, hi: 72 }, spec: { lostAbove: 0.7, lostBy: -3 } },
  { key: 'wobble', ex: 'hum', range: { lo: 48, hi: 72 }, spec: { vibCents: 40, vibRate: 5 } },
  { key: 'easy', ex: 'hum', range: { lo: 40, hi: 80 }, spec: {} },
  { key: 'norange', ex: 'hum', range: null, spec: {} },
];
const wavFor = c => {
  const wav = path.join(TMP, `wu-guide-${c.key}.wav`), r = c.range || DEFAULT;
  execFileSync('python', [path.join(__dirname, 'guidewav.py'), wav, JSON.stringify({ ex: c.ex, lo: r.lo, hi: r.hi, ...c.spec })]);
  return wav;
};
// the page's mic in a silence that follows the voice (the file's tail or lead): the exercise started now begins on the onset
const atSilence = page => page.evaluate(async () => {
  const buf = new Float32Array(2048), rms = () => { analyser.getFloatTimeDomainData(buf); let a = 0; for (const v of buf) a += v * v; return Math.sqrt(a / buf.length); };
  const t0 = performance.now(); let heard = false, quietSince = null;
  while (performance.now() - t0 < 40000) {
    await new Promise(r => setTimeout(r, 20));
    const v = rms() > 0.01;
    if (v) { heard = true; quietSince = null; } else if (heard) { quietSince = quietSince || performance.now(); if (performance.now() - quietSince > 300) return true; }
  }
  return false;
});
const read = page => page.evaluate(() => {
  const el = document.getElementById('wuSummary'), cont = document.getElementById('warmupContinueBtn');
  const bar = el.querySelector('.wu-sum-row .hl-meter > i'), probe = document.createElement('i');
  probe.style.color = 'var(--hl-ink)'; el.append(probe); const ink = getComputedStyle(probe).color; probe.style.color = 'var(--hl-voice)'; const voice = getComputedStyle(probe).color; probe.remove();
  return { shown: getComputedStyle(el).display !== 'none', title: document.getElementById('warmupTitle').textContent, meta: document.getElementById('wuSumMeta').textContent,
    range: document.getElementById('wuSumRange').textContent, stored: document.getElementById('wuSumStored').textContent,
    rows: [...el.querySelectorAll('.wu-sum-row')].map(r => ({ ex: r.dataset.ex, pct: parseInt(r.querySelector('.wu-sum-pct').textContent), note: r.querySelector('.wu-sum-note').textContent })),
    coach: document.getElementById('wuSumCoach').textContent, rule: +document.getElementById('wuSumNext').dataset.rule || null,
    nextShown: getComputedStyle(document.getElementById('wuSumNext')).display !== 'none', next: document.getElementById('wuSumNextName').textContent, why: document.getElementById('wuSumNextWhy').textContent,
    open: getComputedStyle(document.getElementById('wuSumOpenBtn')).display !== 'none' ? document.getElementById('wuSumOpenBtn').textContent : null,
    barColor: bar ? getComputedStyle(bar).backgroundColor : null, ink, voice, sing: cont.classList.contains('hl-btn--sing'), contText: cont.textContent,
    listHidden: getComputedStyle(document.getElementById('wuBody')).display === 'none', stats: wuStats[Object.keys(wuStats)[0]] && { ...wuStats[Object.keys(wuStats)[0]], midis: undefined } };
});

(async () => {
  const rows = [], errors = [];
  try {
    for (const c of CASES) {
      const b = await launch(wavFor(c));
      try {
        const { page, errors: e } = await openPage(b, { viewport: { width: 390, height: 844 } });
        await page.evaluate(r => { window.__wuAllow = true; lowNote = null; highNote = null; progress.lowestMidi = r ? r.lo : null; progress.highestMidi = r ? r.hi : null; }, c.range);
        await rearm(page);
        await page.evaluate(() => { initAudio({ noWarmup: true }); });
        await page.waitForFunction(() => !!analyser, null, { timeout: 15000 });
        await page.evaluate(() => { warmupGate(); });
        if (c.key === 'exact') { // before any exercise: Start my session isn't offered, so no summary can show
          const r0 = await page.evaluate(() => ({ cont: getComputedStyle(document.getElementById('warmupContinueBtn')).display, sum: getComputedStyle(document.getElementById('wuSummary')).display }));
          check('before an exercise is finished: no Start my session, no summary', r0.cont === 'none' && r0.sum === 'none', JSON.stringify(r0));
        }
        if (!await atSilence(page)) throw new Error(`${c.key}: the file mic never went silent after the voice`);
        await page.evaluate(id => wuStartExercise(id), c.ex);
        await page.waitForFunction(id => wuDone.has(id) && !wuRun, c.ex, { timeout: 45000 });
        await page.locator('#warmupContinueBtn').click(); await sleep(400);
        const r = await read(page); rows.push({ case: c.key, ...r });
        const row = r.rows.find(x => x.ex === c.ex) || {};
        console.log(`  ${c.key}: ${row.pct} % · "${row.note}" · next rule ${r.rule} ${r.next} (${r.why}) · "${r.coach}" · range ${r.range} (${r.stored})`);
        check(`${c.key}: the summary shows in place of the list, titled "Warmed up"`, r.shown && r.listHidden && r.title === 'Warmed up', r.meta);
        if (c.key === 'exact') {
          check('exact: the sirens sung on the guide read 95 % or more', row.pct >= 95, `${row.pct} %`);
          check('exact: rule 5, the next step is your session', r.rule === 5 && r.nextShown && !r.open, `${r.next} · ${r.why}`);
          check('the bars are in ink, not the voice colour (Rule 1)', r.barColor === r.ink && r.barColor !== r.voice, `${r.barColor} (ink ${r.ink}, voice ${r.voice})`);
          check('Start my session keeps the start-singing style (hl-btn--sing)', r.sing && r.contText === 'Start my session', r.contText);
        }
        if (c.key === 'off2') check('off2: 2 semitones off reads 10 % or less', row.pct <= 10, `${row.pct} %`);
        if (c.key === 'lost') check('lost: rule 1, Register Coach, and where the line was lost', r.rule === 1 && r.open === 'Open Register Coach' && /lost the line above/.test(row.note), `${row.note} · ${r.why}`);
        if (c.key === 'wobble') check('wobble: rule 2, Tuner, the hum\'s spread over 20 ct', r.rule === 2 && r.open === 'Open Tuner' && r.stats && r.stats.spread > 20, `spread ${r.stats && r.stats.spread} ct · ${row.note}`);
        if (c.key === 'easy') check('easy: rule 3, an easy day, no tool', r.rule === 3 && r.next === 'An easy day' && !r.open, `${r.range} inside ${r.stored}`);
        if (c.key === 'norange') check('norange: rule 4, Range Finder', r.rule === 4 && r.open === 'Open Range Finder', r.stored);
        await page.locator('#warmupContinueBtn').click(); await sleep(400);
        const closed = await page.evaluate(() => getComputedStyle(document.getElementById('warmupOverlay')).display === 'none' && getComputedStyle(document.getElementById('wuSummary')).display === 'none');
        check(`${c.key}: Start my session again closes it`, closed);
        if (c.key === 'norange') { // Coach → Warm-up: Finish shows the summary there, Back returns to the list
          await page.evaluate(() => enterPanel('warmup')); await sleep(600);
          if (!await atSilence(page)) throw new Error('panel: no silence');
          await page.evaluate(() => wuStartExercise('hum'));
          await page.waitForFunction(() => wuDone.has('hum') && !wuRun, null, { timeout: 45000 });
          const fin = await page.evaluate(() => getComputedStyle(document.getElementById('wuFinishBtn')).display !== 'none');
          await page.locator('#wuFinishBtn').click(); await sleep(400);
          const p = await page.evaluate(() => ({ inPanel: !!document.querySelector('#panel-warmup #wuSummary'), shown: getComputedStyle(document.getElementById('wuSummary')).display !== 'none',
            rule: +document.getElementById('wuSumNext').dataset.rule }));
          await page.locator('#wuSumBackBtn').click(); await sleep(300);
          const back = await page.evaluate(() => getComputedStyle(document.getElementById('wuSummary')).display === 'none' && getComputedStyle(document.getElementById('wuBody')).display !== 'none');
          check('Coach → Warm-up: Finish shows the summary in the panel; Back returns to the exercises', fin && p.inPanel && p.shown && back, JSON.stringify({ fin, ...p, back }));
        }
        errors.push(...e.map(x => `${c.key}: ${x}`));
        await page.context().close();
      } finally { await b.close(); }
    }
    check('no page errors', errors.length === 0, errors.join(' | '));
  } finally { await cleanup(); }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  const { pass, fail } = totals(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
