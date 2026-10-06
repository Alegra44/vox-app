const XS = process.env.XS_DIR || require('path').join(require('../testdata').TESTDATA, 'xscope');
// Tables from xscope-*.json. Usage: node analyze.js vibrato|noise|phantom
const mode = process.argv[2] || 'vibrato';
const rows = require(require('path').join(XS, `xscope-${mode}.json`));
const nn = a => a.filter(x => x !== null && x !== undefined);
const mean = a => { a = nn(a); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length) : '—'; };
const rate = (a, f) => { a = nn(a); return a.length ? Math.round(100 * a.filter(f).length / a.length) + '%' : '—'; };
const k = (a, key) => nn(a).map(x => x[key]);
const pad = (s, n) => String(s).padEnd(n);
function lines(r) {
  const L = [];
  const pm = r.pitchMatch;
  for (const lv of ['beg', 'int', 'pro']) L.push([`Pitch/Interval Match ${lv}: score now|MA|median`, `${mean(k(pm[lv], 'now'))}|${mean(k(pm[lv], 'ma'))}|${mean(k(pm[lv], 'med'))}`, `≥75 ${rate(k(pm[lv], 'now'), x => x >= 75)}  ≥85 ${rate(k(pm[lv], 'now'), x => x >= 85)}  (MA ≥75 ${rate(k(pm[lv], 'ma'), x => x >= 75)})`]);
  for (const lv of ['beg', 'int', 'pro']) L.push([`Scale Run note ${lv}: now|MA`, `${mean(k(r.scaleNote[lv], 'now'))}|${mean(k(r.scaleNote[lv], 'ma'))}`, `≥80 ${rate(k(r.scaleNote[lv], 'now'), x => x >= 80)}  ≥60 ${rate(k(r.scaleNote[lv], 'now'), x => x >= 60)}`]);
  L.push(['Vocal Rift round (1.4 s, ×0.6)', mean(k(r.rift, 'now')), `≥75 ${rate(k(r.rift, 'now'), x => x >= 75)}`]);
  for (const [bk, v] of Object.entries(r.boss)) L.push([`Boss ${bk} (per-note)`, mean(k(v, 'acc')), `note passes ${rate(k(v, 'pass'), x => x)}`]);
  L.push(['Karaoke note (≥70 = good)', mean(r.karaoke), `≥70 ${rate(r.karaoke, x => x >= 70)}`]);
  L.push(['Harmony Arena note (≥75 = landed)', mean(r.harmony), `≥75 ${rate(r.harmony, x => x >= 75)}`]);
  L.push(['Choir World judgeHeldNote (median ±50)', mean(nn(r.hm).map(x => Math.abs(x.cents))), `held ${rate(nn(r.hm), x => x.held)}`]);
  L.push(['Stay in Key (% frames ±35)', r.stayKey + '%', `MA: ${r.stayKeyMA}%`]);
  L.push(['One Take pitch | stability', `${mean(k(r.oneTake, 'pitch'))} | ${mean(k(r.oneTake, 'stab'))}`, '']);
  L.push(['RTF "In tune" ±8 / Tuner locked ±6', `${r.rtfInTune}% / ${r.tunerLocked}%`, `"Steady" ${r.steadyPct}%  stability ${r.stabMean}`]);
  L.push(['Glider |Δy| p95 / max (px)', r.gliderDy ? `${r.gliderDy.p95} / ${r.gliderDy.max}` : '—', 'narrowest gap ±35']);
  L.push(['voiced / >±50ct / octave err / median|c|', `${r.voicedPct}% / ${r.gross50}% / ${r.octErr}% / ${r.p50abs}`, r.xcheck ? `real captureAccuracyForTarget: ${r.xcheck.join(',')}` : '']);
  return L;
}
if (mode === 'vibrato') {
  for (const r of rows) {
    console.log(`\n=== ${r.case} — ${r.path} mic ${JSON.stringify(r.settings)}`);
    for (const [a, b, c] of lines(r)) console.log('  ' + pad(a, 48) + pad(b, 16) + c);
  }
} else {
  // compact: one line per case/path with the headline graders
  console.log(pad('case', 14) + pad('path', 9) + pad('voiced', 7) + pad('>50ct', 6) + pad('oct', 6) + pad('PM int', 7) + pad('PM≥75', 7) + pad('PM pro', 7) + pad('Scale pro', 10) + pad('Kar≥70', 7) + pad('Boss int', 9) + pad('HMheld', 7) + pad('StayKey', 8) + pad('Glider95', 9) + 'PM int windows');
  for (const r of rows) {
    const pm = k(r.pitchMatch.int, 'now');
    console.log(pad(r.case, 14) + pad(r.path, 9) + pad(r.voicedPct + '%', 7) + pad(r.gross50 + '%', 6) + pad(r.octErr + '%', 6) + pad(mean(pm), 7) + pad(rate(pm, x => x >= 75), 7) + pad(mean(k(r.pitchMatch.pro, 'now')), 7) + pad(mean(k(r.scaleNote.pro, 'now')), 10)
      + pad(rate(r.karaoke, x => x >= 70), 7) + pad(rate(k(r.boss['pitch/intermediate'], 'pass'), x => x), 9) + pad(rate(nn(r.hm), x => x.held), 7) + pad(r.stayKey + '%', 8) + pad(r.gliderDy ? r.gliderDy.p95 : '—', 9)
      + r.pitchMatch.int.map(x => x ? x.now : '·').join(','));
  }
}
