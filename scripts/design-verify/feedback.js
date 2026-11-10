// PHASE9.md 1d: the Feedback form, on master and the branch (the working copy, or --branch-ref). Signed in (a test
// account) and signed out, each side: every field filled through the page (the same text both sides, tagged with the
// run), the rating chosen with its own control ([data-star="4"]), Submit. The row the app inserted into public.feedback
// is read back with the service role and compared: every column except id and submitted_at must equal master's (user_id
// and email: the test account signed in, null signed out). The thanks state shows (#feedbackThanksCard visible, the
// form hidden) and "Submit more feedback" brings back an empty form with no rating. 9.1, on the branch, signed in: Send
// with nothing filled in saves no row and shows "Write at least one answer first." under the button (the form stays);
// a rating alone (2) saves one row with that rating and empty answers, and thanks. (On master an empty Send inserts an
// all-blank row, since its check counted the timestamp: fixed in 9.1.) The rows this run inserted are deleted at the end.
// Usage: node scripts/design-verify/feedback.js [--base master] [--branch-ref <ref>]
const C = require('./common');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const SIDES = { master: C.buildDir(arg('--base') || 'master'), branch: C.buildDir(arg('--branch-ref') || null) };
const TAG = 'dvfb-' + Date.now();
const FIELDS = { fbLike: 'The tuner is quick.', fbDislike: "The menus move around.", fbConfusing: 'What the load % means.', fbDifficult: 'Finding the warm-up again.',
  fbMostUsed: 'Pitch Match', fbImprove: 'Range Finder', fbAddFeature: 'A metronome.', fbBugs: 'None seen.', fbOther: `Keep going. <b>${'&'}"quotes"</b>` };
const COLS = 'user_id, email, liked, disliked, confusing, difficult, most_used, improve, add_feature, bugs, rating, other_notes';
let fails = 0; const check = (ok, s) => { if (!ok) fails++; console.log(`${ok ? '✓' : '✗'} ${s}`); };

async function submit(b, dir, state, side, signed) {
  const { ctx, page, errors } = await C.openPage(b, { dir, storageState: signed ? state : undefined });
  try {
    await C.clearOverlays(page); await page.evaluate(() => enterPanel('feedback')); await C.sleep(500);
    const tag = `${TAG} ${side} ${signed ? 'in' : 'out'}`;
    for (const [id, v] of Object.entries(FIELDS)) await page.locator('#' + id).fill(id === 'fbOther' ? `${v} ${tag}` : v);
    await page.locator('#panel-feedback [data-star="4"]').click();
    const pressed = await page.evaluate(() => [...document.querySelectorAll('#panel-feedback [data-star]')].map(e => e.getAttribute('aria-pressed') || e.getAttribute('aria-checked') || (e.checked ? 'true' : 'false')).join(''));
    await page.locator('#feedbackSubmitBtn').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('feedbackThanksCard')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
    const thanks = await page.evaluate(() => ({ shown: getComputedStyle(document.getElementById('feedbackThanksCard')).display !== 'none', formHidden: getComputedStyle(document.getElementById('feedbackFormCard')).display === 'none',
      text: document.getElementById('feedbackThanksCard').innerText.replace(/\s+/g, ' ').trim() }));
    await page.locator('#feedbackAnotherBtn').click(); await C.sleep(300);
    const reset = await page.evaluate(ids => ({ empty: ids.every(id => !document.getElementById(id).value), rating: [...document.querySelectorAll('#panel-feedback [data-star]')].some(e => e.getAttribute('aria-pressed') === 'true' || e.getAttribute('aria-checked') === 'true' || e.checked),
      form: getComputedStyle(document.getElementById('feedbackFormCard')).display !== 'none' }), Object.keys(FIELDS));
    const rows = db(`select ${COLS} from public.feedback where other_notes like '%${tag}' order by submitted_at`);
    return { tag, pressed, thanks, reset, rows, errors: errors.slice() };
  } finally { await ctx.close(); }
}

// 9.1 (branch): the empty Send and the rating-only Send, signed in; rows found by the account's e-mail
async function sparse(b, dir, state, email) {
  const { ctx, page, errors } = await C.openPage(b, { dir, storageState: state });
  const count = () => db(`select count(*)::int as n from public.feedback where email = '${email}'`)[0].n;
  try {
    await C.clearOverlays(page); await page.evaluate(() => enterPanel('feedback')); await C.sleep(500);
    const n0 = count();
    await page.locator('#feedbackSubmitBtn').click(); await C.sleep(2500);
    const empty = await page.evaluate(() => { const n = document.getElementById('feedbackEmptyNote'), btn = document.getElementById('feedbackSubmitBtn');
      return { note: n && !n.hidden && getComputedStyle(n).display !== 'none' ? n.textContent.trim() : null, below: n ? n.getBoundingClientRect().top >= btn.getBoundingClientRect().bottom : false,
        form: getComputedStyle(document.getElementById('feedbackFormCard')).display !== 'none', thanks: getComputedStyle(document.getElementById('feedbackThanksCard')).display !== 'none' }; });
    empty.rows = count() - n0;
    await page.locator('#panel-feedback [data-star="2"]').click();
    const noteGone = await page.evaluate(() => document.getElementById('feedbackEmptyNote').hidden);
    await page.locator('#feedbackSubmitBtn').click();
    await page.waitForFunction(() => getComputedStyle(document.getElementById('feedbackThanksCard')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
    const thanks = await page.evaluate(() => getComputedStyle(document.getElementById('feedbackThanksCard')).display !== 'none');
    const rows = db(`select ${COLS} from public.feedback where email = '${email}' order by submitted_at desc limit 1`);
    return { empty, noteGone, rating: { rows: count() - n0, row: rows[0], thanks }, errors: errors.slice() };
  } finally { await ctx.close(); }
}

(async () => {
  const b = await C.chromium.launch(); const out = {}; let acctEmail = null;
  try {
    const a = await C.openPage(b, { dir: SIDES.master }); const acct = await C.signUp(a.page, 'dvfb', 'Feedback Check'); acctEmail = acct.email; const state = await a.ctx.storageState(); await a.ctx.close();
    for (const signed of [true, false]) for (const side of ['master', 'branch']) out[`${side} ${signed ? 'signed in' : 'signed out'}`] = await submit(b, SIDES[side], state, side, signed);
    for (const signed of ['signed in', 'signed out']) {
      const m = out[`master ${signed}`], br = out[`branch ${signed}`];
      console.log(`-- ${signed}`);
      check(m.rows.length === 1 && br.rows.length === 1, `one row each (master ${m.rows.length}, branch ${br.rows.length})`);
      const norm = r => r && { ...r, other_notes: (r.other_notes || '').replace(/ dvfb-\d+ (master|branch) (in|out)$/, '') };
      check(JSON.stringify(norm(m.rows[0])) === JSON.stringify(norm(br.rows[0])), `the saved row equals master's: ${JSON.stringify(norm(br.rows[0]))}`);
      check(signed === 'signed in' ? br.rows[0] && br.rows[0].email === acct.email && !!br.rows[0].user_id : br.rows[0] && br.rows[0].user_id === null && br.rows[0].email === null, `user and e-mail ${signed === 'signed in' ? 'the account' : 'null'}`);
      check(br.rows[0] && br.rows[0].rating === 4, `rating 4 (the control's state ${br.pressed}; master ${m.pressed})`);
      check(br.thanks.shown && br.thanks.formHidden, `the thanks state shows: "${br.thanks.text}" (master "${m.thanks.text}")`);
      check(br.reset.empty && !br.reset.rating && br.reset.form, `"Submit more feedback": an empty form, no rating`);
      check(!m.errors.length && !br.errors.length, `page errors: master ${m.errors.length}, branch ${br.errors.length}`);
    }
    console.log('-- 9.1: an empty Send, then a rating alone (branch, signed in)');
    const sp = await sparse(b, SIDES.branch, state, acct.email);
    check(sp.empty.rows === 0 && sp.empty.form && !sp.empty.thanks, `empty Send: no row saved (${sp.empty.rows}), the form stays`);
    check(sp.empty.note === 'Write at least one answer first.' && sp.empty.below, `empty Send: "${sp.empty.note}" under the button`);
    check(sp.noteGone, 'the note goes once a rating is chosen');
    const r = sp.rating.row || {}, blank = ['liked', 'disliked', 'confusing', 'difficult', 'most_used', 'improve', 'add_feature', 'bugs', 'other_notes'].every(k => !r[k]);
    check(sp.rating.rows === 1 && r.rating === 2 && blank && sp.rating.thanks, `rating alone: one row, rating ${r.rating}, answers empty ${blank}, thanks ${sp.rating.thanks}`);
    check(!sp.errors.length, `page errors: ${sp.errors.length}`);
    console.log(`\nFEEDBACK: ${fails ? `FAIL: ${fails}` : 'PASS'}`); process.exitCode = fails ? 1 : 0;
  } finally {
    try { const n = db(`delete from public.feedback where other_notes like '%${TAG}%'${acctEmail ? ` or email = '${acctEmail}'` : ''} returning id`).length; console.log(`[feedback rows] deleted ${n}`); } catch (e) { console.log('[feedback rows] delete failed: ' + e.message); }
    await b.close(); await C.cleanup();
  }
})();
