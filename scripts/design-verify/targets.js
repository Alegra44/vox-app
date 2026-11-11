// PHASE10.md B4: touch targets as a check. tour10.js's shots pass at 390, 768 and 1280 (Light) lists every visible
// interactive element whose box is under 44 × 44 px, a link inside running text excepted. Two controls are not targets
// and are excluded: #choirLoopCheck (the visually hidden checkbox behind Choir World's LOOP key, which is the target)
// and #rehearsalNextBtn (in a visually hidden row). A control that keeps a small look and gets its 44 px from a
// hit area (padding or a ::before/::after box) is measured by hit-testing (tour10.js --hit): the control in view, the
// points 21.5 px left, right, above and below its centre must all land on it; landing on a neighbour = an overlap, a fail.
// Usage: node scripts/design-verify/targets.js [--out <dir>] [--ref <git ref>]   exit 1 on any target under 44
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'vc-targets-')), REF = arg('--ref');
const EXCLUDED = [/#choirLoopCheck/, /#rehearsalNextBtn/];
const r = spawnSync('node', [path.join(__dirname, 'tour10.js'), '--passes', 'shots', '--hit', '--combos', '390-light,768-light,1280-light', '--out', OUT, ...(REF ? ['--ref', REF] : [])], { stdio: 'inherit' });
if (r.status !== 0) { console.log('tour10 failed'); process.exit(1); }
const audit = JSON.parse(fs.readFileSync(path.join(OUT, 'audit.json'), 'utf8'));
const small = {}; let excluded = 0, screens = 0;
for (const [combo, shots] of Object.entries(audit.combos))
  for (const [screen, a] of Object.entries(shots)) {
    screens++;
    for (const h of a.small || []) {
      if (EXCLUDED.some(x => x.test(h.path))) { excluded++; continue; }
      const k = `${h.path.split(' > ').slice(-2).join(' > ')} «${h.text}»`;
      (small[k] = small[k] || { sizes: new Set(), where: new Set() }).sizes.add(`${h.w}×${h.h}`); small[k].where.add(`${screen} (${combo})`);
    }
  }
for (const [k, v] of Object.entries(small)) console.log(`✗ ${k} ${[...v.sizes].join(', ')} on ${[...v.where].slice(0, 3).join(', ')}${v.where.size > 3 ? ` +${v.where.size - 3}` : ''}`);
const n = Object.keys(small).length;
console.log(`\n${screens} screen-states checked; ${excluded} hits on the two excluded hidden controls`);
console.log(`${n ? 'TARGETS: FAIL' : 'TARGETS: PASS'}: ${n} distinct controls under 44 × 44`);
process.exit(n ? 1 : 0);
