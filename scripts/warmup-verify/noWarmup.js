// Keeps the pre-session warm-up out of the way of every other verification script, without a test switch in the app.
// Requiring this module patches playwright's chromium.launch so every context (and browser.newPage) gets an init script:
//  1. As soon as the page knows who is signed in (wuKey() includes the account id, or '' signed out), today's warm-up is
//     stored as skipped, exactly as one tap on Skip would store it, so warmupGate() lets the session straight through.
//  2. Fallback: if the overlay still appears (e.g. a script swaps the account or the day mid-page), Skip is pressed and
//     window.__wuAutoSkips counts it, so a script can report it.
// Pages without the warm-up (older builds served as a "before" side) are left alone. Only scripts/warmup-verify/entries.js
// and tracking.js see the warm-up on purpose: they don't require this module.
const pw = require('playwright');

const SKIP = () => {
  window.__wuAutoSkips = 0;
  const tick = () => {
    try {
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
