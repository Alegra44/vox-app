// Scoring batch release A, A2: a guard against silent drops. The server's PATCH /api/me/progress keeps only the
// columns on PROGRESS_PATCHABLE_COLUMNS (supabase/functions/_shared/patchableColumns.ts) and drops anything else without
// an error. That is how Emotional Singing's expressionScores were never stored (SCORING_SURVEY.md item 2). This check
// fails if any field the app sends in that PATCH isn't on the allow-list.
//   1. The source: every progress field deploy/index.html writes (progress.x = …, ++, +=, ||=; progress['x'] = …; and
//      recordSkillScore's progress[category + 'Scores'] for every category it is called with), in snake case, against
//      the allow-list.
//   2. The app: a throwaway account (deleted at exit), every recordSkillScore category recorded, an activity, a save;
//      every PATCH /me/progress body sent, its keys against the allow-list. Keys the server itself returned in
//      GET /me/progress and isn't letting the app write (user_id, updated_at…) are the server's own row coming back,
//      listed, not failed.
// EXEMPT: a field the app sends that a coming release adds to the server, with that release. An exemption ends by itself
// once any migration in supabase/migrations defines the column (then it must be on the allow-list like any other).
// Usage: node scripts/backend-verify/allowlist.js [--only source|app] [--ref <git ref>: part 1 on that ref's deploy/index.html]
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '../..');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const ONLY = arg('--only');
const EXEMPT = { expression_scores: 'release B (scoring batch decision 7): migration 0009 adds the column and its allow-list entry' };
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const snake = k => k.replace(/[A-Z]/g, c => '_' + c.toLowerCase());
const ts = fs.readFileSync(path.join(ROOT, 'supabase/functions/_shared/patchableColumns.ts'), 'utf8');
const ALLOW = [...ts.split('PROGRESS_PATCHABLE_COLUMNS')[1].split('] as const')[0].matchAll(/"([a-z0-9_]+)"/g)].map(m => m[1]);
const migrations = fs.readdirSync(path.join(ROOT, 'supabase/migrations')).map(f => fs.readFileSync(path.join(ROOT, 'supabase/migrations', f), 'utf8')).join('\n');
const exempt = k => EXEMPT[k] && !new RegExp(`\\b${k}\\b`).test(migrations) ? EXEMPT[k] : null;
for (const k of Object.keys(EXEMPT)) if (new RegExp(`\\b${k}\\b`).test(migrations)) console.log(`  (exemption for ${k} has ended: a migration defines it)`);

function source() {
  console.log(`\n== 1. the source (${ALLOW.length} columns on the allow-list)`);
  const html = arg('--ref') ? require('child_process').execFileSync('git', ['show', `${arg('--ref')}:deploy/index.html`], { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 << 20 })
    : fs.readFileSync(path.join(ROOT, 'deploy/index.html'), 'utf8');
  const h = html.split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
  const keys = new Set();
  for (const m of h.matchAll(/\bprogress\.([a-zA-Z_][a-zA-Z0-9_]*)\s*(=(?!=)|\+\+|--|\+=|-=|\|\|=|\?\?=)/g)) keys.add(m[1]);
  for (const m of h.matchAll(/\bprogress\[(['"])([a-zA-Z0-9_]+)\1\]\s*=(?!=)/g)) keys.add(m[2]);
  const cats = [...new Set([...h.matchAll(/recordSkillScore\(\s*'([a-z]+)'/g)].map(m => m[1]))];
  cats.forEach(c => keys.add(c + 'Scores'));
  const dyn = h.match(/progress\[[a-zA-Z_]+\]\s*=/g) || [];
  console.log(`  ${keys.size} fields written; recordSkillScore categories: ${cats.join(', ')}; dynamic writes progress[var] = …: ${dyn.length} (recordSkillScore's own)`);
  const off = [...keys].map(snake).filter(k => !ALLOW.includes(k));
  const ex = off.filter(exempt), bad = off.filter(k => !exempt(k));
  check('every progress field the app writes is on the server\'s allow-list', bad.length === 0, bad.length ? `dropped by the server: ${bad.join(', ')}` : 'all on it');
  ex.forEach(k => console.log(`  · exempt: ${k} (${exempt(k)})`));
}

async function app() {
  console.log('\n== 2. the app: what it sends');
  const C = require('../design-verify/common');
  const b = await C.chromium.launch();
  try {
    const bodies = [], gets = [];
    const { ctx, page } = await C.openPage(b, {
      prepare: async c => c.route('**/me/progress', async r => {
        const req = r.request();
        if (req.method() === 'PATCH') { try { bodies.push(JSON.parse(req.postData() || '{}')); } catch (e) {} return r.continue(); }
        if (req.method() === 'GET') { const resp = await r.fetch(); try { gets.push(Object.keys(await resp.json())); } catch (e) {} return r.fulfill({ response: resp }); }
        return r.continue();
      }) });
    await C.signUp(page, 'dvallow', 'Allow List');
    await C.clearOverlays(page);
    const cats = await page.evaluate(async () => {
      const cats = ['pitch', 'breath', 'agility', 'expression'];
      cats.forEach((c, i) => recordSkillScore(c, 40 + i));
      await recordActivity(); await saveProgress();
      return cats;
    });
    await C.sleep(1500);
    const sent = new Set(bodies.flatMap(o => Object.keys(o))), echo = new Set(gets.flat());
    console.log(`  ${bodies.length} PATCH bodies, ${sent.size} distinct fields; categories recorded: ${cats.join(', ')}`);
    const off = [...sent].filter(k => !ALLOW.includes(k));
    const fromServer = off.filter(k => echo.has(k)), ex = off.filter(k => !echo.has(k) && exempt(k)), bad = off.filter(k => !echo.has(k) && !exempt(k));
    check('saves were sent and seen', bodies.length > 0 && gets.length > 0, `${bodies.length} PATCH, ${gets.length} GET`);
    check('every field the app sends in PATCH /me/progress is on the allow-list', bad.length === 0, bad.length ? `dropped by the server: ${bad.join(', ')}` : 'all on it');
    if (fromServer.length) console.log(`  · the server's own row coming back (not writable, not the app's data): ${fromServer.join(', ')}`);
    ex.forEach(k => console.log(`  · exempt: ${k} (${exempt(k)})`));
    await ctx.close();
  } finally { await b.close(); C.cleanup(); }
}

(async () => {
  if (ONLY !== 'app') source();
  if (ONLY !== 'source') await app();
  console.log(`\n${fail ? 'ALLOWLIST: FAIL' : 'ALLOWLIST: PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
