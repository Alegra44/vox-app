// PHASE9.md 9.1 (4), shared by moments9.js and levelup-verify/levelup.js: a moment sheet's timer, on the build in the
// page. Cases per sheet:
//   untouched  it hides by itself after its time (level up with a why-line and breakthrough 6 s; level up without one
//              and new record 4 s), ±400 ms;
//   pointer    a real click on the sheet's text (not Continue) 0.5 s in: the timer stops (still shown 2.5 s after its
//              time) and the click doesn't close it; then Escape closes it;
//   key        a key inside the sheet (Tab, focus is on Continue) 0.5 s in: still shown after its time; then a click on
//              the scrim closes it;
//   continue   Continue closes it.
// Each sheet is opened through the app's own function: showLevelUp, triggerNewRecord, triggerBreakthrough.
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SHEETS = {
  'levelup-why': { id: 'levelupOverlay', ms: 6000, open: `showLevelUp(4, 'Pitch Apprentice', 'You levelled up: 2 new records.')` },
  'levelup': { id: 'levelupOverlay', ms: 4000, open: `showLevelUp(4, 'Pitch Apprentice', '')` },
  'newrecord': { id: 'newRecordOverlay', ms: 4000, open: `triggerNewRecord(t('record_label_longest_breath'), '12.4s', '+1.8s')` },
  'breakthrough': { id: 'breakthroughOverlay', ms: 6000, open: `triggerBreakthrough(64, 50)` },
};
const shown = (page, id) => page.evaluate(id => document.getElementById(id).classList.contains('levelup-show'), id);
async function open(page, s) {
  await page.evaluate(id => document.querySelectorAll('.levelup-overlay').forEach(o => o.classList.remove('levelup-show')), s.id);
  await page.evaluate(code => { window.logTimelineEvent = () => {}; (0, eval)(code); }, s.open);
  return Date.now();
}
async function untouched(page, s) {
  const t0 = await open(page, s);
  await page.waitForFunction(id => !document.getElementById(id).classList.contains('levelup-show'), s.id, { timeout: s.ms + 4000, polling: 50 }).catch(() => {});
  return Date.now() - t0;
}
async function textPoint(page, id) { // a point on the sheet's text, away from Continue
  return page.evaluate(id => { const r = document.querySelector(`#${id} .moment-label`).getBoundingClientRect(); return { x: r.left + 4, y: r.top + r.height / 2 }; }, id);
}
async function runSheet(page, name) {
  const s = SHEETS[name], r = { name, ms: s.ms };
  r.closedAfter = await untouched(page, s);
  await open(page, s); await sleep(500);
  const p = await textPoint(page, s.id); await page.mouse.click(p.x, p.y);
  r.pointerClickKept = await shown(page, s.id);
  await sleep(s.ms + 2500 - 500); r.pointerStopped = await shown(page, s.id);
  await page.keyboard.press('Escape'); await sleep(400); r.escapeCloses = !(await shown(page, s.id));
  await open(page, s); await sleep(500);
  await page.keyboard.press('Tab');
  await sleep(s.ms + 2500 - 500); r.keyStopped = await shown(page, s.id);
  await page.mouse.click(4, 4); await sleep(400); r.scrimCloses = !(await shown(page, s.id));
  await open(page, s); await sleep(300);
  await page.evaluate(id => document.querySelector(`#${id} [data-moment-close]`).click(), s.id); await sleep(400);
  r.continueCloses = !(await shown(page, s.id));
  r.ok = Math.abs(r.closedAfter - s.ms) <= 400 && r.pointerClickKept && r.pointerStopped && r.escapeCloses && r.keyStopped && r.scrimCloses && r.continueCloses;
  return r;
}
const describe = r => `${r.name}: hides by itself after ${r.closedAfter} ms (want ${r.ms} ±400); a click on the sheet keeps it ${r.pointerClickKept} and stops the timer ${r.pointerStopped}, Escape closes ${r.escapeCloses}; a key stops it ${r.keyStopped}, the scrim closes ${r.scrimCloses}; Continue closes ${r.continueCloses}`;
module.exports = { SHEETS, runSheet, describe };
