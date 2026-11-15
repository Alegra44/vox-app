// Keeps the pre-session warm-up out of the way of every other verification script, without a test switch in the app.
// Requiring this module patches playwright's chromium.launch so every context (and browser.newPage) gets an init script:
//  1. As soon as the page knows who is signed in (wuKey() includes the account id, or '' signed out), today's warm-up is
//     stored as skipped, exactly as one tap on Skip would store it, so warmupGate() lets the session straight through.
//  2. Fallback: if the overlay still appears (e.g. a script swaps the account or the day mid-page), Skip is pressed and
//     window.__wuAutoSkips counts it, so a script can report it.
//  3. The speaker delay (scoring batch B2): the rig has no speaker and no room, so its round trip is the synthetic mic's
//     own path. Once the page defines sdGate(), it is wrapped so that before a timing take 0 ms is stored as measured
//     for this browser and output device, as a finished measurement would store it, and the sheet doesn't open. A page
//     that sets window.__sdAllow = true is left alone (scripts/scoring-verify/sdcheck.js shows the sheet on purpose).
// Pages without the warm-up (older builds served as a "before" side) are left alone. Only scripts/warmup-verify/entries.js
// and tracking.js see the warm-up on purpose: they don't require this module. A page that sets window.__wuAllow = true
// is left alone from then on (to show the warm-up on purpose).
const pw = require('playwright');

const SKIP = () => {
  window.__wuAutoSkips = 0;
  const tick = () => {
    try {
      if (!window.__sdWrapped && typeof sdGate === 'function' && typeof sdSave === 'function' && typeof sdOutputKey === 'function') {
        window.__sdWrapped = true; const orig = sdGate;
        sdGate = async function () {
          if (!window.__sdAllow) { const k = await sdOutputKey(); if (!sdAll()[k]) sdSave(k, { ms: 0, how: 'measured', heard: 10, rig: true, at: Date.now() }); }
          return orig.apply(this, arguments);
        };
      }
    } catch (e) {}
    try {
      if (window.__wuAllow) return; // a script showing the warm-up on purpose (phase 9's shots9.js, states9.js) sets this
      if (typeof wuKey !== 'function') return;
      const k = wuKey();
      if (!localStorage.getItem(k)) localStorage.setItem(k, 'skipped');
      const o = document.getElementById('warmupOverlay');
      if (o && o.style.display !== 'none') { const b = document.getElementById('warmupSkipBtn'); if (b) { b.click(); window.__wuAutoSkips++; } }
    } catch (e) {}
  };
  setInterval(tick, 25);
  document.addEventListener('DOMContentLoaded', tick);
};

if (!pw.chromium.__noWarmup) {
  const launch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...args) => {
    const b = await launch(...args);
    const newContext = b.newContext.bind(b);
    b.newContext = async (...o) => { const c = await newContext(...o); await c.addInitScript(SKIP); return c; };
    b.newPage = async (...o) => { const c = await b.newContext(...o); const p = await c.newPage(); p.on('close', () => c.close().catch(() => {})); return p; };
    return b;
  };
  pw.chromium.__noWarmup = true;
}
module.exports = { SKIP };
