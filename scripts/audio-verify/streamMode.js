// exp/single-stream: require this (node -r) to run any verify script with the app's branch-only window.__streamMode
// set from SS_MODE (C1, C2 or C3) in every page the script opens. A "before" side (master) has no such flag and ignores
// it, so a regress run compares today (master) with the mode on the branch. Patches chromium.launch like noWarmup.js.
// With SS_MODE unset this module does nothing.
const pw = require('playwright');
const MODE = process.env.SS_MODE || null;
if (MODE && !['C1', 'C2', 'C3'].includes(MODE)) throw new Error(`SS_MODE=${MODE}: only C1, C2, C3`);
if (MODE && !pw.chromium.__ssMode) {
  const launch = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...args) => {
    const b = await launch(...args);
    const newContext = b.newContext.bind(b);
    b.newContext = async (...o) => { const c = await newContext(...o); await c.addInitScript(m => { window.__streamMode = m; }, MODE); return c; };
    b.newPage = async (...o) => { const c = await b.newContext(...o); const p = await c.newPage(); p.on('close', () => c.close().catch(() => {})); return p; };
    return b;
  };
  pw.chromium.__ssMode = MODE;
  console.log(`[streamMode] every page opened with window.__streamMode = ${MODE}`);
}
module.exports = { MODE };
