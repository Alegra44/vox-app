// PHASE10.md B6: focus as a check. tour10.js's focus pass (1280, Light and Dark; 40 Tabs on every screen and sheet,
// elements followed by identity) must show:
//   stuck     0: the same element on two Tabs in a row, unless the sheet has a single control (focus held on it is the
//               trap working);
//   escaping  0: on a sheet, focus on an element outside it, or on the body after a step that wasn't the sheet's last
//               control (a sheet's trap wraps from its last control to its first);
//   invisible 0, hidden 0: a focused element that looks the same blurred, or is off screen;
//   returned  every sheet closes with Escape and focus is back on what had it when the sheet opened.
// Excepted, as PHASE10.md B6 says: onboarding (Escape doesn't close it; setup can't be skipped) and Language at first
// run (a choice is needed). Both must still keep focus inside (no escaping) and not get stuck.
// Usage: node scripts/design-verify/focus.js [--out <dir>] [--ref <git ref>]   exit 1 on any failure
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'vc-focus-')), REF = arg('--ref');
const NO_ESCAPE = n => /^sheet-(onboarding|language)/.test(n);
const r = spawnSync('node', [path.join(__dirname, 'tour10.js'), '--passes', 'focus', '--out', OUT, ...(REF ? ['--ref', REF] : [])], { stdio: 'inherit' });
if (r.status !== 0) { console.log('tour10 failed'); process.exit(1); }
const audit = JSON.parse(fs.readFileSync(path.join(OUT, 'audit.json'), 'utf8'));
const fails = { stuck: [], escaping: [], invisible: [], hidden: [], returned: [], lost: [] };
let n = 0;
for (const [combo, screens] of Object.entries(audit.focus))
  for (const [name, f] of Object.entries(screens)) {
    n++; const at = `${name} (${combo})`;
    // a sheet is an overlay (the tour's 'sheet-' names also cover states9's panels, Pricing, Feedback…: they are pages)
    const sheet = 'overlay' in f ? !!f.overlay : name.startsWith('sheet-');
    if (f.stuck.length && !(sheet && f.controls === 1)) fails.stuck.push(`${at}: ${f.stuck.map(p => p.split(' > ').pop()).join(', ')}`);
    if (sheet && f.outside.length) fails.escaping.push(`${at}: ${f.outside.length} steps outside`);
    if (sheet && f.lost) fails.escaping.push(`${at}: ${f.lost} steps on the body`);
    if (!sheet && f.lost > 1) fails.lost.push(`${at}: ${f.lost} steps on the body`); // the first Tab after the harness's blur starts at the body
    if (f.invisible.length) fails.invisible.push(`${at}: ${f.invisible.map(p => p.split(' > ').pop()).join(', ')}`);
    if (f.hidden.length) fails.hidden.push(`${at}: ${f.hidden.map(p => p.split(' > ').pop()).join(', ')}`);
    if (sheet && !NO_ESCAPE(name) && !(f.return && f.return.closedByEscape && f.return.back))
      fails.returned.push(`${at}: Escape ${f.return && f.return.closedByEscape ? 'closes it' : 'doesn\'t close it'}, focus on ${f.return ? f.return.now : '?'} (opener ${f.return ? f.return.opener : '?'})`);
  }
let bad = 0;
for (const [k, list] of Object.entries(fails)) { console.log(`${list.length ? '✗' : '✓'} ${k}: ${list.length}`); list.forEach(x => console.log(`    ${x}`)); bad += list.length; }
console.log(`\n${n} screen-states (1280 Light and Dark). ${bad ? 'FOCUS: FAIL' : 'FOCUS: PASS'}`);
process.exit(bad ? 1 : 0);
