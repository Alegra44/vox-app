// PHASE10.md A1: TRANSLATIONS keys that nothing references. A key counts as used when, outside the TRANSLATIONS object,
// deploy/index.html or deploy/*.js contains it as a whole token (data-i18n*, t('…'), a key held in a table or array),
// or it starts with a prefix that the code builds keys from: a string literal ending in "_" (or a template literal's
// text before ${…}) that is joined to something ('voicetype_' + x, `record_label_${k}`, t(p+'_title')…). Printed per
// prefix so a dynamic family can be checked by hand. Usage: node scripts/design-verify/unusedkeys.js [--json <file>]
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '../..'), F = path.join(ROOT, 'deploy/index.html');
const html = fs.readFileSync(F, 'utf8');
const start = html.indexOf('const TRANSLATIONS = {'), end = html.indexOf('\n};', start) + 3;
const T = vm.runInNewContext('(' + html.slice(start + 'const TRANSLATIONS = '.length, end - 1) + ')');
const rest = html.slice(0, start) + html.slice(end) + fs.readdirSync(path.join(ROOT, 'deploy')).filter(f => f.endsWith('.js')).map(f => fs.readFileSync(path.join(ROOT, 'deploy', f), 'utf8')).join('\n');
const keys = Object.keys(T.en);
const tokens = new Set(rest.match(/[A-Za-z0-9_]+/g));
// families: a literal prefix joined to an expression, with the literal suffix that follows it when there is one
// ('rhythm_' + tempo + '_btn' → rhythm_*_btn; `record_label_${k}` → record_label_*; 'voicetype_' + x → voicetype_*).
const fam = new Map(); const addF = (p, suf) => { if (p.length >= 3) fam.set(p + '*' + (suf || ''), { p, s: suf || '' }); };
for (const m of rest.matchAll(/['"]([a-z][a-z0-9_]*_)['"]\s*\+\s*([^;,)}\]]*?)(?:\+\s*['"]([a-z0-9_]*)['"])?(?=\s*[;,)}\]])/g)) addF(m[1], m[3]);
for (const m of rest.matchAll(/`([a-z][a-z0-9_]*)\$\{[^}]*\}([a-z0-9_]*)(`|\$\{)/g)) addF(m[1], m[3] === '`' ? m[2] : '');
// any literal ending in "_" (a ternary's branches: (up ? 'key_rank_up_' : 'key_rank_down_') + …), and any literal
// directly followed by "+" ('eve_note_better' + one), count as prefixes too
for (const m of rest.matchAll(/['"]([a-z][a-z0-9_]*_)['"]/g)) addF(m[1], '');
for (const m of rest.matchAll(/['"]([a-z][a-z0-9_]{3,})['"]\s*\+/g)) addF(m[1], '');
const fams = [...fam.values()];
const unused = [], dynamic = {};
for (const k of keys) {
  if (tokens.has(k)) continue;
  const f = fams.find(f => k.startsWith(f.p) && k.endsWith(f.s) && k.length > f.p.length + f.s.length);
  if (f) { (dynamic[f.p + '*' + f.s] ||= []).push(k); continue; }
  unused.push(k);
}
const missing = ['fr', 'es', 'tr'].map(l => [l, keys.filter(k => !(k in T[l])).length]);
console.log(`${keys.length} keys in en; ${unused.length} referenced nowhere; ${Object.values(dynamic).flat().length} only through a built prefix/suffix (${Object.keys(dynamic).length} families); missing in fr/es/tr: ${JSON.stringify(missing)}`);
console.log('\n-- only through a built prefix (check by hand):'); for (const [p, ks] of Object.entries(dynamic)) console.log(`   ${p} (${ks.length}): ${ks.join(', ')}`);
console.log('\n-- referenced nowhere:'); for (const k of unused) console.log(`   ${k}  "${String(T.en[k]).slice(0, 70)}"`);
const ji = process.argv.indexOf('--json'); if (ji > 0) fs.writeFileSync(process.argv[ji + 1], JSON.stringify({ unused, dynamic }, null, 1));
