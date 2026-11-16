// Release B on production: an Expression score survives a reload (migration 0009 and the api function's allow-list).
// A throwaway account (deleted at exit), the local build (DV_URL=https://…: that site), the production backend:
//   1. the sign-up's own saves settled (each carries [] and could land after ours), then the app records an Expression
//      score the way Emotional Singing does (recordSkillScore('expression', …)) and saves
//   2. the server's expression_scores holds it; after a reload the page does, and the Skill Profile's Expression reads it
// Usage: [DV_URL=https://…] node scripts/backend-verify/exprtrip.js
require('../runguard').auto();
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
(async () => {
  const b = await C.chromium.launch();
  try {
    const { page } = await C.openPage(b, {});
    await C.signUp(page, 'dvexpr', 'Expression Trip'); await C.clearOverlays(page);
    const uid = await page.evaluate(() => profile.id);
    await C.sleep(3000);
    await C.G.step('record and save', 30, () => page.evaluate(async () => {
      await Promise.allSettled([...progressSaving]);
      recordSkillScore('expression', 71); recordSkillScore('expression', 64);
      await Promise.allSettled([...progressSaving]); await saveProgress();
    }));
    const row = db(`select expression_scores from public.user_progress where user_id = '${uid}'`)[0];
    check('the server holds the scores', JSON.stringify(row.expression_scores) === '[71,64]', JSON.stringify(row.expression_scores));
    await page.reload(); await page.waitForFunction(() => { try { return !!profile && 'xp' in progress; } catch (e) { return false; } }, null, { timeout: 30000 });
    const after = await page.evaluate(() => ({ list: progress.expressionScores, sp: computeSkillProfile().expression }));
    check('after a reload the page has them', JSON.stringify(after.list) === '[71,64]', JSON.stringify(after.list));
    check('the Skill Profile\'s Expression reads them', after.sp === 68 || after.sp === 67.5, `${after.sp}`);
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fail ? 'EXPRESSION: FAIL' : 'EXPRESSION: PASS'} (${pass} passed, ${fail} failed)`);
  process.exitCode = fail ? 1 : 0;
})();
