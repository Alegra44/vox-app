// PHASE10.md B5: accessible names as a check.
//   1. tour10.js's shots pass at 390 and 1280 (Light): no visible button, link, input, select, textarea, [role=…], img or
//      non-hidden svg without an accessible name;
//   2. tour10.js's language pass (390, fr / es / tr): no aria-label that reads the same as in English;
//   3. static, for what the tour doesn't see (canvases hidden at rest, labels set while a tool runs): every aria-label in
//      the markup carries data-i18n-aria-label (or is built with t() in a template), and no script sets an aria-label
//      from an English literal (setAttribute('aria-label', '…') or aria-label="Words" inside a template string).
// Usage: node scripts/design-verify/names.js [--out <dir>] [--ref <git ref>]   exit 1 on any failure
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync, execFileSync } = require('child_process');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'vc-names-')), REF = arg('--ref');
const ROOT = path.resolve(__dirname, '../..');
let fails = 0;
const check = (name, ok, detail) => { console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) fails++; };

// 3. static
const html = REF ? execFileSync('git', ['show', `${REF}:deploy/index.html`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 }) : fs.readFileSync(path.join(ROOT, 'deploy/index.html'), 'utf8');
const lineOf = i => html.slice(0, i).split('\n').length;
const tags = [...html.matchAll(/<[a-zA-Z][^<>]*\saria-label="([^"]*)"[^<>]*>/g)];
const untranslated = tags.filter(m => !/data-i18n-aria-label=/.test(m[0]) && !/^\$\{\s*t\(/.test(m[1]) && /[A-Za-z]{2}/.test(m[1].replace(/\$\{[^}]*\}/g, '')));
for (const m of untranslated) console.log(`  ✗ line ${lineOf(m.index)}: aria-label="${m[1].slice(0, 70)}" has no data-i18n-aria-label`);
check('every markup aria-label is translated (data-i18n-aria-label or t())', untranslated.length === 0, `${tags.length} aria-labels, ${untranslated.length} untranslated`);
const scripts = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const setLit = [...scripts.matchAll(/setAttribute\(\s*'aria-label'\s*,\s*(['"`])([A-Za-z][^'"`$]*)\1\s*\)/g)].map(m => m[2]);
const keysTo = [...html.matchAll(/data-i18n-aria-label="([^"]+)"/g)].map(m => m[1]);
// the four language blocks of TRANSLATIONS ("  en: {" … "  fr: {" …), each key looked up as "  key:" inside its block
const TRI = html.indexOf('const TRANSLATIONS'), TRE = html.indexOf('\n};', TRI), TRS = html.slice(TRI, TRE);
const block = l => { const i = TRS.indexOf(`\n  ${l}: {`); const j = ['en', 'fr', 'es', 'tr'].map(x => TRS.indexOf(`\n  ${x}: {`)).filter(x => x > i).sort((x, y) => x - y)[0]; return TRS.slice(i, j === undefined ? TRS.length : j); };
const missingKeys = keysTo.flatMap(k => ['en', 'fr', 'es', 'tr'].filter(l => !new RegExp(`[\\s,{]${k}\\s*:`).test(block(l))).map(l => `${k} (${l})`));
check('no script sets an aria-label from an English literal', setLit.length === 0, setLit.join(' | ') || 'none');
check('every data-i18n-aria-label key exists in en, fr, es and tr', missingKeys.length === 0, missingKeys.join(', ') || `${keysTo.length} keys`);

// 1 and 2: the tour
const r = spawnSync('node', [path.join(__dirname, 'tour10.js'), '--passes', 'shots,lang', '--combos', '390-light,1280-light', '--out', OUT, ...(REF ? ['--ref', REF] : [])], { stdio: 'inherit' });
if (r.status !== 0) { console.log('tour10 failed'); process.exit(1); }
const audit = JSON.parse(fs.readFileSync(path.join(OUT, 'audit.json'), 'utf8'));
const noName = {};
for (const [combo, shots] of Object.entries(audit.combos))
  for (const [screen, a] of Object.entries(shots))
    for (const h of a.noName || []) { const k = `${h.path.split(' > ').slice(-2).join(' > ')} (${h.what})`; (noName[k] = noName[k] || new Set()).add(`${screen} ${combo}`); }
for (const [k, v] of Object.entries(noName)) console.log(`  ✗ ${k} on ${[...v].slice(0, 3).join(', ')}${v.size > 3 ? ` +${v.size - 3}` : ''}`);
check('no visible control or graphic without an accessible name (390 and 1280)', Object.keys(noName).length === 0, `${Object.keys(noName).length} without a name`);
for (const lang of ['fr', 'es', 'tr']) {
  const o = (audit.lang || {})[lang] || {}, labels = new Set(Object.values(o).flat());
  check(`no aria-label in English when the page is in ${lang}`, labels.size === 0, labels.size ? [...labels].map(l => `"${l.slice(0, 40)}"`).join(', ') : 'none');
}
console.log(`\n${fails ? 'NAMES: FAIL' : 'NAMES: PASS'} (${fails} failed)`);
process.exit(fails ? 1 : 0);
