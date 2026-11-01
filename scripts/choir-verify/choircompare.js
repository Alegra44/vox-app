// Choir regress mode (PHASE5A.md 5a.1): compares what the choir scripts printed on the base build (master) and on a
// branch's build, written by choirregress.sh as <dir>/base/<script>-<n>.json and <dir>/branch/<script>-<n>.json (harness.js,
// CV_JSON). Nothing is re-measured here: every printed line is a measurement as the script has always printed it.
//  - A line's words are its key (its numbers replaced by #, plus how many times that key came before it in the run); test
//    account emails, user ids, dates and file paths are masked first, since they change every run whatever the build.
//  - Numbers: per key and slot, the median over the branch runs against the median over the base runs. The gate is ±2,
//    or more where the base moves more than that on its own: the base's range in this run, and the A/A range of the same
//    slot in aa-ranges.json (master against itself, the proof run), whichever is largest.
//  - Words: a line on one side only (in at least 2 of the 3 runs there and in none on the other) is listed for review;
//    it fails the gate only when the line says MISMATCH, FAIL or false-for-a-check on the branch side.
//  - A script fails the gate when the branch passes fewer of its runs (exit 0) than the base, or a number moves.
// Usage: node scripts/choir-verify/choircompare.js <dir> [--aa <aa-ranges.json>] [--write-aa <file>]
//   --write-aa: the proof (base and branch are both master): writes each slot's range over all the runs, both sides.
const fs = require('fs'), path = require('path');
const dir = process.argv[2], arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const aaFile = arg('--aa'), writeAa = arg('--write-aa');
const AA = aaFile && fs.existsSync(aaFile) ? JSON.parse(fs.readFileSync(aaFile, 'utf8')) : {};

const MASKS = [
  [/voxcoach-[\w.-]+@example\.com/g, '<email>'],
  [/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, '<uuid>'],
  [/\d{4}-\d{2}-\d{2}T[\d:.]+Z?/g, '<iso>'],
  [/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2}, \d{4}/g, '<date>'],
  [/\b\d{1,2} (janv|févr|mars|avr|mai|juin|juil|août|sept|oct|nov|déc)[a-zé.]* \d{4}/gi, '<date>'],
  [/\(today\)|\(aujourd'hui\)/g, ''],
  [/(\/[\w.@-]+)+\/?|[A-Z]:\\[\w\\.-]+/g, '<path>'],
  [/\b\d{12,}\b/g, '<ts>'],
];
const NUM = /-?\d+(?:\.\d+)?/g;
const BAD = /MISMATCH|\bFAIL|FAILED/;
const parse = line => { let s = line; for (const [re, to] of MASKS) s = s.replace(re, to); return { tpl: s.replace(NUM, '#'), nums: (s.match(NUM) || []).map(Number) }; };
const median = a => { const s = [...a].sort((x, y) => x - y), n = s.length; return n % 2 ? s[n >> 1] : (s[n / 2 - 1] + s[n / 2]) / 2; };

function load(side) {
  const d = path.join(dir, side), runs = {};
  if (!fs.existsSync(d)) return runs;
  for (const f of fs.readdirSync(d).filter(f => f.endsWith('.json'))) {
    const m = f.match(/^(.+)-(\d+)\.json$/); if (!m) continue;
    let j; try { j = JSON.parse(fs.readFileSync(path.join(d, f), 'utf8')); } catch (e) { j = { exit: 'unreadable', lines: [] }; }
    const seen = {}, keys = {};
    for (const line of j.lines.flatMap(l => l.split('\n'))) {
      if (!line.trim()) continue;
      const { tpl, nums } = parse(line); const k = `${tpl}@${seen[tpl] = (seen[tpl] || 0) + 1}`;
      keys[k] = { nums, line };
    }
    (runs[m[1]] = runs[m[1]] || []).push({ n: +m[2], exit: j.exit, keys });
  }
  return runs;
}
const base = load('base'), branch = load('branch');
const scripts = [...new Set([...Object.keys(base), ...Object.keys(branch)])].sort();
const aaOut = {}; let failed = 0;
const out = [`Choir regress: ${dir}${aaFile ? ` (A/A ranges ${aaFile})` : ''}`, ''];
for (const sc of scripts) {
  const B = base[sc] || [], R = branch[sc] || [];
  const ok = rs => rs.filter(r => r.exit === 0).length;
  const keys = [...new Set([...B, ...R].flatMap(r => Object.keys(r.keys)))];
  const moved = [], onlyBase = [], onlyBranch = [];
  let slots = 0;
  for (const k of keys) {
    const bh = B.filter(r => r.keys[k]), rh = R.filter(r => r.keys[k]);
    if (bh.length >= 2 && !rh.length) { onlyBase.push(bh[0].keys[k].line); continue; }
    if (rh.length >= 2 && !bh.length) { onlyBranch.push(rh[0].keys[k].line); continue; }
    if (!bh.length || !rh.length) continue;
    const width = bh[0].keys[k].nums.length;
    for (let i = 0; i < width; i++) {
      const bv = bh.map(r => r.keys[k].nums[i]).filter(Number.isFinite), rv = rh.map(r => r.keys[k].nums[i]).filter(Number.isFinite);
      if (!bv.length || !rv.length) continue;
      slots++;
      const id = `${k}#${i}`, all = [...bv, ...rv];
      if (writeAa) { const r = Math.max(...all) - Math.min(...all); ((aaOut[sc] = aaOut[sc] || {})[id] = r); }
      const tol = Math.max(2, Math.max(...bv) - Math.min(...bv), (AA[sc] && AA[sc][id]) || 0);
      const d = median(rv) - median(bv);
      if (Math.abs(d) > tol) moved.push(`${bh[0].keys[k].line.trim().slice(0, 150)}\n      slot ${i + 1}: base ${JSON.stringify(bv)} median ${median(bv)} | branch ${JSON.stringify(rv)} median ${median(rv)} | moved ${+d.toFixed(3)}, allowed ±${tol}`);
    }
  }
  const bad = onlyBranch.filter(l => BAD.test(l));
  const fail = moved.length > 0 || ok(R) < ok(B) || bad.length > 0;
  if (fail) failed++;
  out.push(`${fail ? 'FAIL' : 'pass'}  ${sc}: runs passed base ${ok(B)}/${B.length}, branch ${ok(R)}/${R.length} | ${slots} numbers compared, ${moved.length} moved | lines only on base ${onlyBase.length}, only on branch ${onlyBranch.length}${bad.length ? ` (${bad.length} say MISMATCH/FAIL)` : ''}`);
  moved.forEach(m => out.push('    moved: ' + m));
  onlyBase.slice(0, 15).forEach(l => out.push('    only on base:   ' + l.trim().slice(0, 160)));
  onlyBranch.slice(0, 15).forEach(l => out.push('    only on branch: ' + l.trim().slice(0, 160)));
  if (onlyBase.length > 15 || onlyBranch.length > 15) out.push(`    (… ${Math.max(0, onlyBase.length - 15)} more base, ${Math.max(0, onlyBranch.length - 15)} more branch)`);
}
out.push('', failed ? `GATE: FAIL (${failed} of ${scripts.length} scripts)` : `GATE: pass (${scripts.length} scripts)`);
console.log(out.join('\n'));
fs.writeFileSync(path.join(dir, 'compare.txt'), out.join('\n') + '\n');
if (writeAa) { fs.writeFileSync(writeAa, JSON.stringify(aaOut, null, 1)); console.log(`A/A ranges written to ${writeAa}`); }
process.exit(failed ? 1 : 0);
