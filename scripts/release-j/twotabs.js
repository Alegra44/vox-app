// Release J (design/reliability/RELEASE_J.md, J2, J5): two tabs of the same browser (the same storage and sign-in), each
// saving in turn from a copy the other has moved past: every save 409s, merges, and is sent again; nothing is lost. Then
// a level crossed only by the merge (each tab's XP alone stays under it) is announced once, on the tab whose merge
// crossed it, and not again on the other tab when it next merges. LOCAL stack, through the slow proxy; a throwaway
// account, deleted at exit. Usage: node scripts/release-j/twotabs.js [--ref <git ref>]
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('twotabs.js: VOX_BACKEND=local only'); process.exit(2); }
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const ri = process.argv.indexOf('--ref'), REF = ri > 0 ? process.argv[ri + 1] : null, DIR = C.buildDir(REF);
let pass = 0, fail = 0;
const check = (n, ok, d) => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); ok ? pass++ : fail++; };
const settle = async page => { for (let i = 0; i < 160; i++) { await C.sleep(250);
  if (await page.evaluate(() => (typeof progressInFlight === 'undefined' || !progressInFlight) && !progressRetry.timer && progressSaving.size === 0)) { await C.sleep(1200); return; } } };
const countLevels = page => page.evaluate(() => { window.__lv = []; const o = showLevelUp; showLevelUp = (l, ...a) => { window.__lv.push(l); return o(l, ...a); }; });
(async () => {
  console.log(`build: ${REF || 'the working copy'}`);
  const b = await C.chromium.launch();
  try {
    const { ctx, page: A } = await C.openPage(b, { dir: DIR });
    await C.signUp(A, 'jtabs', 'Two Tabs'); await C.clearOverlays(A); await settle(A);
    const uid = await A.evaluate(() => profile.id);
    const row = () => db(`select xp, pitch_scores, timeline_events from public.user_progress where user_id = '${uid}'`)[0];
    db(`update public.user_progress set xp = 30 where user_id = '${uid}'`); // level 1 (a level is 50 XP)
    await A.reload({ waitUntil: 'load' }); await A.waitForFunction(() => { try { return !!profile && !!progress; } catch (e) { return false; } }, null, { timeout: 30000 });
    const B = await ctx.newPage(); await B.goto(C.PAGE_URL, { waitUntil: 'load' });
    await B.waitForFunction(() => { try { return !!profile && !!progress; } catch (e) { return false; } }, null, { timeout: 30000 });
    await settle(A); await settle(B); await C.clearOverlays(A); await C.clearOverlays(B);
    await countLevels(A); await countLevels(B);
    // in turn: each tab adds XP (3) and a pitch score from its copy, which the other tab's save has moved past
    const scores = [41, 42, 43, 44];
    for (const [i, s] of scores.entries()) {
      const P = i % 2 ? B : A;
      await P.evaluate(async s => { progress.xp += 3; progress.pitchScores = [...(progress.pitchScores || []), s]; await saveProgress(); }, s);
      await settle(P);
    }
    let r = row();
    check('in turn: every tab\'s XP kept (30 + 4 × 3)', r.xp === 42, `server xp ${r.xp}`);
    check('in turn: every tab\'s score kept, once', JSON.stringify(r.pitch_scores) === JSON.stringify(scores), JSON.stringify(r.pitch_scores));
    // a level crossed by the merge: A +5 (47), then B, still at 42 in its copy, +6: B alone 48, merged 53: level 2
    await A.evaluate(async () => { progress.xp += 5; await saveProgress(); }); await settle(A);
    await B.evaluate(async () => { progress.xp += 6; await saveProgress(); }); await settle(B);
    await A.evaluate(async () => { progress.lastBossWeakness = 'tabs'; await saveProgress(); }); await settle(A); // A's next save merges B's
    await B.evaluate(async () => { progress.xp += 1; await saveProgress(); }); await settle(B);
    r = row();
    const lvA = await A.evaluate(() => window.__lv), lvB = await B.evaluate(() => window.__lv);
    const tl = (r.timeline_events || []).filter(e => e && e.type === 'levelup').map(e => e.data && e.data.level);
    check('the merged XP: 42 + 5 + 6 + 1', r.xp === 54, `server xp ${r.xp}`);
    check('level 2, crossed by the merge, announced once across the two tabs', [...lvA, ...lvB].filter(l => l === 2).length === 1, `tab A ${JSON.stringify(lvA)}, tab B ${JSON.stringify(lvB)}`);
    check('…on the tab whose merge crossed it (B)', JSON.stringify(lvB) === '[2]', `tab B ${JSON.stringify(lvB)}`);
    check('…and once in the server\'s timeline', JSON.stringify(tl) === '[2]', JSON.stringify(tl));
    const xs = await Promise.all([A, B].map(p => p.evaluate(() => progress.xp)));
    check('both tabs end on the server\'s XP after their next read or save', xs[1] === r.xp, `A ${xs[0]}, B ${xs[1]}, server ${r.xp}`);
    await ctx.close();
  } finally { await b.close(); C.cleanup(); }
  console.log(`\nTWOTABS: ${fail ? 'FAIL' : 'PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
