// Release J (design/reliability/RELEASE_J.md): Erase my progress on the phone, then one save from a laptop tab loaded
// before it. The server must keep the erase plus only the laptop's gains since it loaded (master: the laptop's save
// writes its pre-erase copy back). LOCAL stack, through the slow proxy; a throwaway account, deleted at exit.
// Usage: node scripts/release-j/erase.js [--ref <git ref>]   (default: the working copy's deploy/)
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('erase.js: VOX_BACKEND=local only'); process.exit(2); }
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const ri = process.argv.indexOf('--ref'), REF = ri > 0 ? process.argv[ri + 1] : null, DIR = C.buildDir(REF);
let pass = 0, fail = 0;
const check = (n, ok, d) => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); ok ? pass++ : fail++; };
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const row = uid => db(`select row_to_json(p) as r from public.user_progress p where user_id = '${uid}'`)[0].r;
const settle = async page => { for (let i = 0; i < 160; i++) { await C.sleep(250);
  if (await page.evaluate(() => (typeof progressInFlight === 'undefined' || !progressInFlight) && !progressRetry.timer && progressSaving.size === 0)) { await C.sleep(1500); return; } } };
(async () => {
  console.log(`build: ${REF || 'the working copy'}`);
  const b = await C.chromium.launch();
  try {
    // the laptop: an account with a morning's progress (scores, a session, a range, a timeline record); the tab left open
    const L = await C.openPage(b, { dir: DIR });
    await C.signUp(L.page, 'jerase', 'Erase Check'); await C.clearOverlays(L.page); await settle(L.page);
    const uid = await L.page.evaluate(() => profile.id);
    await L.page.evaluate(async () => { recordSkillScore('pitch', 70); recordSkillScore('agility', 60); await registerExerciseCompletion();
      await recordRangeCapture(50, 72); logTimelineEvent('record', 'Laptop record', { value: 70 }); await saveProgress(); });
    await settle(L.page); await C.clearOverlays(L.page);
    const M = row(uid);
    // the phone: the same account, Erase my progress (its confirm accepted)
    const Ph = await C.openPage(b, { dir: DIR, storageState: await L.ctx.storageState() }); await settle(Ph.page); await C.clearOverlays(Ph.page);
    Ph.page.on('dialog', d => d.accept());
    await Ph.page.evaluate(() => document.getElementById('dashResetBtn').click());
    await C.sleep(1000); await settle(Ph.page);
    const E = row(uid);
    check('the phone\'s erase reached the server', E.total_sessions === 0 && same(E.pitch_scores, []) && E.highest_midi === null,
      `sessions ${E.total_sessions}, pitch ${JSON.stringify(E.pitch_scores)}, highest ${E.highest_midi}`);
    // the laptop tab, never reloaded: a breath score and a session, then its save
    const gain = await L.page.evaluate(async () => {
      const x0 = progress.xp || 0; recordSkillScore('breath', 55); const p = recordActivity(); const d = (progress.xp || 0) - x0; await p; return d;
    });
    await settle(L.page);
    const S = row(uid), today = await L.page.evaluate(() => todayStr());
    console.log(`  morning xp ${M.xp}, sessions ${M.total_sessions}; erased: xp ${E.xp}, sessions ${E.total_sessions}; server now: xp ${S.xp}, sessions ${S.total_sessions}; the laptop's gain ${gain} XP`);
    check('XP: the erase keeps XP; plus the laptop\'s gain once', S.xp === E.xp + gain, `server ${S.xp}, want ${E.xp + gain}`);
    check('sessions: the erase (0) plus the laptop\'s one session', S.total_sessions === 1, `server ${S.total_sessions}`);
    check('history: only the laptop\'s session', same(S.history, { [today]: 1 }), JSON.stringify(S.history));
    check('streak: 1, from today (not the morning\'s streak carried over)', S.streak === 1 && S.last_practice_date === today, `streak ${S.streak}, day ${S.last_practice_date}`);
    check('scores: the morning\'s erased; only the laptop\'s new breath score', same(S.pitch_scores, []) && same(S.agility_scores, []) && same(S.breath_scores, [55]),
      `pitch ${JSON.stringify(S.pitch_scores)}, agility ${JSON.stringify(S.agility_scores)}, breath ${JSON.stringify(S.breath_scores)}`);
    check('range: erased', S.lowest_midi === null && S.highest_midi === null, `${S.lowest_midi}–${S.highest_midi}`);
    check('timeline: the morning\'s record erased', !(S.timeline_events || []).some(e => e && e.label === 'Laptop record'), `${(S.timeline_events || []).length} events`);
    check('exercises today: erased (the laptop\'s session isn\'t an exercise)', S.exercises_today === 0 && S.last_exercise_date === null, `${S.exercises_today}, ${S.last_exercise_date}`);
    const lp = await L.page.evaluate(() => ({ xp: progress.xp, s: progress.totalSessions }));
    check('the laptop page now shows the merged row', lp.xp === S.xp && lp.s === S.total_sessions, JSON.stringify(lp));
    await Ph.ctx.close(); await L.ctx.close();
  } finally { await b.close(); C.cleanup(); }
  console.log(`\nERASE-STALE: ${fail ? 'FAIL' : 'PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
