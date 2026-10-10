// Redesign guard (static): master's deploy/index.html (git show master:deploy/index.html) against the working copy.
//   - every id, data-i18n*, data-panel, data-shell and data-enter-panel value in master still exists
//   - every protected class and English protected string in HOUSE_LIGHTS.md §9 still occurs
//   - every TRANSLATIONS key exists in en, es, fr and tr
//   - the HOUSE LIGHTS v1.2 block equals design/house-lights/house-lights.css byte for byte
//   - the legacy variables choir-verify/fix.js reads are still defined
//   - no Fraunces / Space Mono / Inter font names
//   - no emoji in the header and tab-bar markup, renderAccountBar and updateShellTopbar
//   - no hex / rgb / rgba colour literals outside the exemptions below
// Usage: node scripts/design-verify/hooks.js [--base <git ref>] [--json <file>]   (exit 1 on any failure)
const fs = require('fs'), path = require('path'), vm = require('vm');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '../..');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master';
const JSON_OUT = arg('--json') || path.join(__dirname, 'logs', `hooks-${new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)}.json`);

const master = execFileSync('git', ['show', `${BASE}:deploy/index.html`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 });
const work = fs.readFileSync(path.join(ROOT, 'deploy/index.html'), 'utf8');
const hlCss = fs.readFileSync(path.join(ROOT, 'design/house-lights/house-lights.css'), 'utf8');

// Removals the spec allows, each with its reason. Anything else missing is a failure.
const ALLOWED_REMOVALS = {
  'data-i18n=theme_default': 'phase 1 §2.8: the four theme swatches become System / Light / Dark (key stays in TRANSLATIONS)',
  'data-i18n=theme_cyberpunk': 'phase 1 §2.8: the four theme swatches become System / Light / Dark (key stays in TRANSLATIONS)',
  'data-i18n=theme_aurora': 'phase 1 §2.8: the four theme swatches become System / Light / Dark (key stays in TRANSLATIONS)',
  'data-i18n=theme_velvetopera': 'phase 1 §2.8: the four theme swatches become System / Light / Dark (key stays in TRANSLATIONS)',
};
// Canvas drawing code keeps its literal colours this phase (exempt by function), and the voice ambient glow (phase 2).
const EXEMPT_FUNCTIONS = {
  gliderLoop: 'Glider canvas (arcade game)', bridgeLoop: 'Bridge canvas (arcade game)', wuExLoop: 'the warm-up canvas',
  drawResonanceFrame: 'Resonance canvas', resonanceColorFor: 'Resonance canvas: the colour it returns is only painted by drawResonanceFrame',
  renderVoiceCard: 'Voice Card export canvas', tickVoiceAmbient: 'voice ambient glow (phase 2)',
};
const PROTECTED_CLASSES = ['snb-item', 'shell-bottomnav', 'panel', 'vl-gauge-val', 'vl-gauge-fill', 'vl-disclaimer', 'rh-level-name',
  'rh-level-pct', 'arcade-game-card', 'vq-row', 'record-row', 'record-val', 'step-label', 'yc-row', 'pr-report', 'why-detail',
  'hub-category-card', 'cw-hub-feature', 'cw-lock-only', 'achievement-card', 'app-toast', 'toast', 'fine-print', 'scale-dot',
  'j-title', 'j-sub', 'active'];
const PROTECTED_STRINGS = ['In tune', 'Listening…', 'In key', 'Steady', 'Pushing', 'Head', 'Mixed', 'Chest', 'Speaker bleed detected',
  'Fits comfortably in your captured range', 'Outside part of your captured range', 'Recording', 'Songs'];
const PROTECTED_ATTRS = ['data-rd-part', 'data-boss-type', 'data-boss-difficulty', 'data-glider-mode', 'data-glider-difficulty', 'data-game',
  'data-hm-stage', 'data-hm-guess', 'data-profile-lang'];
const LEGACY_VARS = ['--bg', '--surface', '--surface-raised', '--hairline', '--cream', '--muted', '--brass', '--brass-dim', '--teal', '--coral'];
const HL_BEGIN = '/* ===== HOUSE LIGHTS v1.2 BEGIN */', HL_END = '/* ===== HOUSE LIGHTS v1.2 END */';

const results = []; // {check, ok, detail}
const check = (name, ok, detail = '') => { results.push({ check: name, ok, detail }); };
const esc = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// ---- 1. hooks from master
const HOOK_ATTRS = ['id', 'data-i18n', 'data-i18n-placeholder', 'data-i18n-title', 'data-i18n-aria', 'data-i18n-html', 'data-panel', 'data-shell', 'data-enter-panel'];
function attrValues(src, attr) {
  const out = new Set(), re = new RegExp(`(?:^|[\\s"'\`])${esc(attr)}=(["'])([^"'$\`{}<>]+)\\1`, 'g');
  let m; while ((m = re.exec(src))) out.add(m[2]);
  return out;
}
function stillThere(src, attr, value) {
  if (new RegExp(`${esc(attr)}=["']${esc(value)}["']`).test(src)) return true;
  if (attr === 'id') return new RegExp(`\\.id\\s*=\\s*["'\`]${esc(value)}["'\`]|\\bid\\s*:\\s*["']${esc(value)}["']`).test(src);
  if (attr.startsWith('data-')) { // set through dataset in JS
    const prop = attr.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return new RegExp(`dataset\\.${prop}\\s*=\\s*["'\`]${esc(value)}["'\`]`).test(src);
  }
  return false;
}
const allowedSeen = [];
for (const attr of HOOK_ATTRS) {
  const missing = [];
  for (const v of attrValues(master, attr)) if (!stillThere(work, attr, v)) {
    if (ALLOWED_REMOVALS[`${attr}=${v}`]) allowedSeen.push({ hook: `${attr}="${v}"`, reason: ALLOWED_REMOVALS[`${attr}=${v}`] }); else missing.push(v);
  }
  check(`every ${attr} value in ${BASE} still exists`, missing.length === 0, missing.length ? `missing: ${missing.join(', ')}` : `${attrValues(master, attr).size} checked`);
}

// ---- 2. protected classes, strings, attributes (§9)
{
  const miss = PROTECTED_CLASSES.filter(c => !new RegExp(`(?:class(?:Name)?\\s*=\\s*["'\`][^"'\`]*|classList\\.\\w+\\([^)]*["']|\\.)\\b${esc(c)}(?![\\w-])`).test(work));
  check('protected classes (§9) still occur', miss.length === 0, miss.length ? `missing: ${miss.join(', ')}` : `${PROTECTED_CLASSES.length} checked`);
  const missS = PROTECTED_STRINGS.filter(s => !work.includes(s));
  check('protected English strings (§9) still occur', missS.length === 0, missS.length ? `missing: ${missS.join(', ')}` : `${PROTECTED_STRINGS.length} checked`);
  const missA = PROTECTED_ATTRS.filter(a => master.includes(a) && !work.includes(a));
  check('protected attributes (§9) still occur', missA.length === 0, missA.length ? `missing: ${missA.join(', ')}` : `${PROTECTED_ATTRS.length} checked`);
}

// ---- 3. TRANSLATIONS keys in all four languages
function translations(src) {
  const start = src.indexOf('const TRANSLATIONS = {');
  if (start < 0) return null;
  const end = src.indexOf('\n};', start);
  return vm.runInNewContext('(' + src.slice(start + 'const TRANSLATIONS = '.length, end + 2) + ')', {});
}
{
  let T = null, err = '';
  try { T = translations(work); } catch (e) { err = e.message; }
  if (!T) check('TRANSLATIONS parses', false, err || 'not found');
  else {
    const all = new Set(Object.values(T).flatMap(o => Object.keys(o)));
    const gaps = ['en', 'es', 'fr', 'tr'].map(l => [l, [...all].filter(k => !(T[l] && k in T[l]))]).filter(([, ks]) => ks.length);
    check('every TRANSLATIONS key exists in en, es, fr and tr', gaps.length === 0,
      gaps.length ? gaps.map(([l, ks]) => `${l} lacks ${ks.length}: ${ks.slice(0, 12).join(', ')}${ks.length > 12 ? '…' : ''}`).join(' | ') : `${all.size} keys`);
    const T0 = translations(master), dropped = Object.keys(T0.en).filter(k => !(k in T.en));
    check(`no TRANSLATIONS key from ${BASE} removed`, dropped.length === 0, dropped.length ? `removed: ${dropped.join(', ')}` : 'none removed');
  }
}

// ---- 4. the House Lights block
const hlStart = work.indexOf(HL_BEGIN), hlEnd = work.indexOf(HL_END);
{
  let ok = false, detail = 'markers not found';
  if (hlStart >= 0 && hlEnd > hlStart) {
    const inner = work.slice(hlStart + HL_BEGIN.length, hlEnd).replace(/^\n/, '');
    ok = inner === hlCss;
    if (!ok) { let i = 0; while (i < inner.length && inner[i] === hlCss[i]) i++; detail = `differs at byte ${i} (block ${inner.length} bytes, file ${hlCss.length})`; }
    else detail = `${hlCss.length} bytes`;
  }
  check('HOUSE LIGHTS v1.2 block = design/house-lights/house-lights.css', ok, detail);
}

// ---- 5. legacy variables (choir-verify/fix.js reads them)
{
  const miss = LEGACY_VARS.filter(v => !new RegExp(`${esc(v)}\\s*:`).test(work));
  check('legacy variables still defined', miss.length === 0, miss.length ? `missing: ${miss.join(', ')}` : LEGACY_VARS.join(' '));
}

// ---- line bookkeeping for the next checks
const lines = work.split('\n');
const offsetLine = []; { let o = 0; lines.forEach((l, i) => { offsetLine.push(o); o += l.length + 1; }); }
const lineOf = off => { let lo = 0, hi = offsetLine.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; offsetLine[mid] <= off ? lo = mid : hi = mid - 1; } return lo; };
function fnRange(name) { // a top-level function: its declaration up to the first line that starts with "}"
  const i = lines.findIndex(l => new RegExp(`^(?:async\\s+)?function\\s+${esc(name)}\\s*\\(`).test(l));
  if (i < 0) return null;
  let j = i + 1; while (j < lines.length && !/^}/.test(lines[j])) j++;
  return [i, j];
}
const hlLines = hlStart >= 0 && hlEnd > hlStart ? [lineOf(hlStart), lineOf(hlEnd)] : null;
const exemptRanges = Object.entries(EXEMPT_FUNCTIONS).map(([n, why]) => ({ n, why, r: fnRange(n) }));
const exemptBy = i => {
  if (hlLines && i >= hlLines[0] && i <= hlLines[1]) return 'House Lights block';
  const e = exemptRanges.find(e => e.r && i >= e.r[0] && i <= e.r[1]); return e ? e.n : null;
};

// ---- 6. font names
{
  const hits = [];
  lines.forEach((l, i) => { const m = l.match(/Fraunces|Space[ +]Mono|\bInter\b/g); if (m) hits.push(`${i + 1}: ${m.join(', ')}`); });
  check('no Fraunces / Space Mono / Inter font names', hits.length === 0, hits.length ? `${hits.length} line(s): ${hits.slice(0, 8).join(' | ')}${hits.length > 8 ? ' …' : ''}` : '0');
}

// ---- 7. emoji in the shell
{
  const EMOJI = /\p{Extended_Pictographic}/u, regions = [];
  const tagRegion = (open, close, name) => { const a = work.search(open); if (a < 0) return; const b = work.indexOf(close, a); regions.push([name, lineOf(a), lineOf(b)]); };
  tagRegion(/<header class="shell-topbar[^"]*"/, '</header>', 'header.shell-topbar');
  tagRegion(/<nav class="shell-bottomnav[^"]*"/, '</nav>', 'nav.shell-bottomnav');
  for (const f of ['renderAccountBar', 'updateShellTopbar']) { const r = fnRange(f); if (r) regions.push([f, r[0], r[1]]); else check(`${f} found`, false, 'not found'); }
  const hits = [];
  for (const [name, a, b] of regions) for (let i = a; i <= b; i++) if (EMOJI.test(lines[i])) hits.push(`${name} line ${i + 1}: ${lines[i].trim().slice(0, 70)}`);
  check('no emoji in the header, tab bar, renderAccountBar, updateShellTopbar', hits.length === 0, hits.length ? hits.join(' | ') : regions.map(r => r[0]).join(', '));
}

// ---- 8. colour literals
const literals = [];
{
  const RE = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})\b|rgba?\([^)]*\)/g;
  lines.forEach((l, i) => {
    let m; RE.lastIndex = 0;
    while ((m = RE.exec(l))) {
      const lit = m[0];
      if (lit[0] === '#' && /[\w-]/.test(l[m.index - 1] || '')) continue; // part of a word, not a colour
      if (lit[0] === '#' && /(?:href|url\(|querySelector(?:All)?\(|getElementById\()\s*["'`]?$/.test(l.slice(Math.max(0, m.index - 20), m.index))) continue;
      let exempt = exemptBy(i);
      if (!exempt && /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*[,)]/.test(lit)) exempt = 'black shadow / backdrop';
      if (!exempt && /<meta name="theme-color"/.test(l)) exempt = 'theme-color meta tag';
      if (!exempt && new RegExp(`drawResonanceFrame\\([^)]*${esc(lit)}`).test(l)) exempt = 'drawResonanceFrame (argument: canvas colour)';
      literals.push({ line: i + 1, literal: lit, exempt, text: l.trim().slice(0, 100) });
    }
  });
  const bad = literals.filter(x => !x.exempt);
  check('no colour literals outside the exemptions', bad.length === 0, bad.length ? `${bad.length}: ${bad.slice(0, 10).map(x => `${x.line} ${x.literal}`).join(' | ')}${bad.length > 10 ? ' …' : ''}` : `${literals.length} exempt`);
  const notFound = exemptRanges.filter(e => !e.r).map(e => e.n);
  if (notFound.length) check('exempt functions found', false, `not found: ${notFound.join(', ')}`);
}

// ---- report
const fails = results.filter(r => !r.ok);
for (const r of results) console.log(`  ${r.ok ? '✓' : '✗'} ${r.check.padEnd(66)} ${r.detail}`);
if (allowedSeen.length) { console.log('\n  allowed removals (listed in this script):'); for (const a of allowedSeen) console.log(`    · ${a.hook}: ${a.reason}`); }
console.log(`\n${results.length - fails.length} passed, ${fails.length} failed (base ${BASE})`);
fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
fs.writeFileSync(JSON_OUT, JSON.stringify({ base: BASE, at: new Date().toISOString(), passed: results.length - fails.length, failed: fails.length,
  results, allowedRemovals: allowedSeen, literals: literals.filter(x => !x.exempt), exemptLiterals: literals.filter(x => x.exempt) }, null, 1));
console.log(`json: ${path.relative(ROOT, JSON_OUT)}`);
process.exitCode = fails.length ? 1 : 0;
