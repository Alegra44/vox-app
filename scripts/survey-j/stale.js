// Survey J (design/reliability/SURVEY_J.md): a tab left open overwriting another device's progress. LOCAL stack only,
// through the slow, shuffled proxy (VOX_BACKEND=local NODE_OPTIONS="--require <repo>/scripts/localBackend.js").
// Per case, a throwaway account (deleted at exit):
//   1. laptop: signs up and practises in the morning (a score, an exercise = a session); the tab is then left open
//   2. phone: a second browser (its own storage, the same sign-in) opens the account and earns XP, scores and a session
//      through the app's own functions (scores, an exercise, range, a daily metric, the weekly log, a timeline event,
//      a song best, a One Take, a warm-up, a "tried" flag)
//   3. laptop: ONE save from the tab loaded in the morning:
//        a. "score"   a breath score (recordSkillScore) and saveProgress, as after a take
//        b. "warmup"  the warm-up counted (wuCount: H2's wuServerSync merge first, then the save)
//        c. "plain"   saveProgress with nothing new (any save: a setting, a level-up snapshot)
//        d. "warmup, the phone didn't warm up": the same as b, the phone's warm-up left out
//        e. "warmup, then a score": b, then the tab's next save (a breath score)
//      and in case a, afterwards: the phone (still open, never reloaded) saves once more (a plain save)
//   4. the server's row, column by column: the phone's value (P), the laptop tab's copy sent (L), or something else
// Writes scripts/survey-j/out/stale-<case>.json (or --out <dir>) and prints the table; exits 1 if any of the phone's changes
// were lost. Usage: node scripts/survey-j/stale.js [--ref <git ref>] [--out <dir>] [a b c]   (default: the working copy's deploy/)
// Release J (RELEASE_J.md): a check of J's, master losing (the old row write), the branch not.
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const argv = process.argv.slice(2), opt = n => { const i = argv.indexOf(n); if (i < 0) return null; const v = argv[i + 1]; argv.splice(i, 2); return v; };
const REF = opt('--ref'), OUT = opt('--out') || path.join(__dirname, 'out'), DIR = C.buildDir(REF);
const CASES = argv.length ? argv : ['a', 'b', 'c', 'd', 'e'];
fs.mkdirSync(OUT, { recursive: true });
const SKIP = new Set(['user_id', 'updated_at', 'created_at', 'version', 'last_save_id', 'recent_save_ids']); // the last three: 0012's bookkeeping
// Release J: does the server's value S still hold the phone's change from M to P? A merge adds the laptop's own on top,
// so S needn't equal P: a counter or a later day at least P's (lowest_midi: at most), every item the phone added still
// there, a key the phone changed held the same way, a flag as the phone set it.
function holds(M, P, S) {
  if (same(S, P) || same(M, P)) return true;
  if (typeof P === 'number') return typeof S === 'number' && (typeof M !== 'number' || P >= M ? S >= P : S <= P);
  if (typeof P === 'string') return typeof S === 'string' && S >= P;
  if (Array.isArray(P)) { // the phone's new items (after the longest end of M it starts with), each in S
    const m = Array.isArray(M) ? M : []; let k = Math.min(m.length, P.length);
    for (; k > 0; k--) if (same(m.slice(m.length - k), P.slice(0, k))) break;
    const left = (Array.isArray(S) ? S : []).map(x => JSON.stringify(x));
    return P.slice(k).every(x => { const i = left.indexOf(JSON.stringify(x)); if (i < 0) return false; left.splice(i, 1); return true; });
  }
  if (P && typeof P === 'object') { const m = M && typeof M === 'object' ? M : {}, t = S && typeof S === 'object' ? S : {};
    return Object.keys(P).every(k => holds(m[k], P[k], t[k])); }
  return false;
}
const same = (x, y) => JSON.stringify(x) === JSON.stringify(y);
const row = uid => db(`select row_to_json(p) as r from public.user_progress p where user_id = '${uid}'`)[0].r;

function watch(page) { // the page's /me/progress requests: how many PATCHes, none out
  const w = { out: 0, patches: 0, last: Date.now() };
  page.on('request', r => { if (/\/me\/progress/.test(r.url())) { w.out++; w.last = Date.now(); if (r.method() === 'PATCH') w.patches++; } });
  const done = r => { if (/\/me\/progress/.test(r.url())) { w.out = Math.max(0, w.out - 1); w.last = Date.now(); } };
  page.on('requestfinished', done); page.on('requestfailed', done);
  w.quiet = async () => { const t = Date.now() + 40000;
    while (Date.now() < t) { if (w.out === 0 && Date.now() - w.last > 2500 && await page.evaluate(() => !progressRetry.timer && !wuCounting)) return true; await C.sleep(250); }
    return false; };
  return w;
}

async function runCase(b, k) {
  // 1. the laptop, in the morning
  const L = await C.openPage(b, { dir: DIR }); const lw = watch(L.page);
  await C.signUp(L.page, 'svj' + k, 'Stale Tab'); await C.clearOverlays(L.page); await lw.quiet();
  const uid = await L.page.evaluate(() => profile.id);
  await L.page.evaluate(async () => { recordSkillScore('pitch', 60); await registerExerciseCompletion(); });
  await lw.quiet(); await C.clearOverlays(L.page);
  const M = row(uid);
  // 2. the phone: its own browser profile (localStorage copied once, as a sign-in would leave it), the same account
  const state = await L.ctx.storageState();
  const Ph = await C.openPage(b, { dir: DIR, storageState: state }); const pw = watch(Ph.page); await pw.quiet(); await C.clearOverlays(Ph.page);
  await Ph.page.evaluate(async warm => {
    const today = todayStr();
    recordSkillScore('pitch', 85); recordSkillScore('agility', 72); recordNoteAttempt(64, 82);
    await registerExerciseCompletion();                      // exercises today, a session (+5 XP), history, streak
    await recordRangeCapture(48, 74);                        // range, and a second session
    await recordDailyMetric('pitch', 85);
    await recordWeeklyLog('pitch', 85);
    logTimelineEvent('record', 'Phone record', { value: 85 });
    progress.songBestScores = progress.songBestScores || {}; progress.songBestScores['survey-j-song'] = 88; // as the song end does
    progress.oneTakeHistory = progress.oneTakeHistory || {}; progress.oneTakeHistory[today] = { pitch: 80, stability: 70, timing: 75, heard: true };
    progress.oneTakeLastDate = today; progress.triedKaraoke = true;
    await saveProgress();
    if (warm) await wuCount();                               // the day's warm-up: +5 XP, warmups_completed, its day and streak
  }, k !== 'd');
  await pw.quiet(); await C.clearOverlays(Ph.page);
  const P = row(uid);
  // 3. the laptop tab, never reloaded: one save
  const before = lw.patches;
  const sent = await L.page.evaluate(async k => {
    if (k === 'a') { recordSkillScore('breath', 55); await saveProgress(); }
    else if (k === 'b' || k === 'd') { await wuCount(); }
    else if (k === 'e') { await wuCount(); recordSkillScore('breath', 55); await saveProgress(); }
    else await saveProgress();
    return objCamelToSnake(progress);
  }, k);
  await lw.quiet();
  const S = row(uid), laptopAfter = await L.page.evaluate(() => objCamelToSnake(progress));
  // 4. column by column
  const cols = Object.keys(S).filter(c => !SKIP.has(c)).sort(), table = [];
  for (const c of cols) {
    const changedOnPhone = !same(P[c], M[c]);
    const v = same(S[c], P[c]) ? (changedOnPhone ? 'phone' : 'unchanged') : changedOnPhone && holds(M[c], P[c], S[c]) ? 'merged' : same(S[c], sent[c]) ? 'laptop' : 'other';
    table.push({ col: c, changedOnPhone, kept: v, morning: M[c], phone: P[c], server: S[c] });
  }
  let back = null;
  if (k === 'a') { // the phone's next save, from its page as it was
    const pb = pw.patches; await Ph.page.evaluate(async () => { await saveProgress(); }); await pw.quiet();
    const S2 = row(uid);
    back = { patches: pw.patches - pb, xp: S2.xp, total_sessions: S2.total_sessions, breath_scores: S2.breath_scores,
      laptopBreathKept: same(S2.breath_scores, S.breath_scores) };
    console.log(`\n   then the phone saves once: xp ${S2.xp}, sessions ${S2.total_sessions}, the laptop's breath score ${back.laptopBreathKept ? 'kept' : 'LOST'} (${JSON.stringify(S2.breath_scores)})`);
  }
  // the laptop's own gains, kept too: its breath score (a, e); its warm-up counted once (d: +1 and +5 XP; b, e: none,
  // the phone's already counted today)
  const own = { a: () => (S.breath_scores || []).includes(55), e: () => (S.breath_scores || []).includes(55) && S.warmups_completed === P.warmups_completed,
    b: () => S.warmups_completed === P.warmups_completed && S.xp === P.xp, d: () => S.warmups_completed === P.warmups_completed + 1 && S.xp === P.xp + 5, c: () => true }[k]();
  console.log(`   the laptop's own gain ${own ? 'kept' : 'LOST or counted twice'}`);
  const lv = (S.timeline_events || []).filter(e => e && e.type === 'levelup').map(e => e.data && e.data.level);
  const dupLevels = lv.filter((x, i) => lv.indexOf(x) !== i);
  console.log(`   level-ups in the server's timeline: ${JSON.stringify(lv)}${dupLevels.length ? ' — ANNOUNCED TWICE' : ''}`);
  const res = { case: k, own, levelups: lv, dupLevels, back, patchesFromLaptop: lw.patches - before, xp: { morning: M.xp, phone: P.xp, server: S.xp, laptopShows: laptopAfter.xp },
    totalSessions: { morning: M.total_sessions, phone: P.total_sessions, server: S.total_sessions }, table };
  fs.writeFileSync(path.join(OUT, `stale-${k}.json`), JSON.stringify(res, null, 1));
  console.log(`\n== case ${k}: ${lw.patches - before} PATCH from the laptop tab; xp morning ${M.xp} → phone ${P.xp} → server ${S.xp}; sessions ${M.total_sessions} → ${P.total_sessions} → ${S.total_sessions}`);
  for (const t of table.filter(t => t.changedOnPhone || t.kept === 'laptop' || t.kept === 'other'))
    console.log(`  ${t.col.padEnd(26)} ${t.kept === 'phone' ? 'KEPT the phone\'s' : t.kept === 'merged' ? 'KEPT the phone\'s, merged' : !t.changedOnPhone ? 'the laptop\'s own change' : t.kept === 'laptop' ? 'LOST: the laptop\'s copy' : 'LOST: ' + t.kept}  ${t.changedOnPhone ? '' : '(not changed on the phone)'}`);
  await Ph.ctx.close(); await L.ctx.close();
  return res;
}

(async () => {
  const b = await C.chromium.launch(), all = [];
  try { for (const k of CASES) all.push(await C.G.step(`case ${k}`, 300, () => runCase(b, k))); }
  finally { await b.close(); C.cleanup(); }
  const lost = all.map(r => `${r.case}: ${r.table.filter(t => t.changedOnPhone && !['phone', 'merged'].includes(t.kept)).length}/${r.table.filter(t => t.changedOnPhone).length} phone changes lost`);
  const nLost = all.reduce((n, r) => n + r.table.filter(t => t.changedOnPhone && !['phone', 'merged'].includes(t.kept)).length + r.dupLevels.length + (r.own ? 0 : 1), 0);
  console.log(`\nSURVEY J stale (${REF || 'the working copy'}): ${lost.join('; ')}`);
  console.log(`STALE: ${nLost || all.length < CASES.length ? 'LOST' : 'NOTHING LOST'} (${nLost}: the phone's changes lost, the laptop's gains lost, levels announced twice; ${all.length} cases)`);
  process.exit(nLost || all.length < CASES.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
