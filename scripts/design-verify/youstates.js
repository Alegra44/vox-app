// Phase 7 guard (PHASE7.md 1a): what each You screen computes, on master and on the branch, in the seeded states of
// youSeed.js (signed out, new, active, activecw: an active singer with Choir World runs). Values come from the app's own
// functions where both builds have them, and from what the screens show by IDs both builds keep:
//   the Skill Profile (computeSkillProfile) and its summary (level read, strongest, needs work, not scored yet; the
//   branch's skillSummary() when it has one, else master's rule), Today's focus, level, XP, streak, sessions, the
//   records (personalRecordValues and the rows Personal Records shows), the achievements unlocked, the Journey day and
//   its Day 1 steps (also with the Day 1 baseline removed, so the steps show), the Voice Health trend (the banner and the
//   two 14-day series), the Passport rows and timeline.
// Gate: equal on both builds, except the changes PHASE7.md §3 expects (EXPECTED in the table, with the reason):
//   Day 1 steps ticked from stored results (2.4); Records' Songs and Choir World rows and the best-pitch label (2.5);
//   the Passport timeline's language and dates and its "Updated" line (2.6); the Pitch blend (2.9): only in a state
//   with Choir World runs and only when the branch's Pitch equals the pooled value youstates computes from the seed,
//   and what follows from it there (summary, Today's focus, Passport strongest/focus, Pitch Master).
// Every state's achievements are marked as already announced first, so the timeline doesn't grow while screens render.
// Usage: node scripts/design-verify/youstates.js [--base <ref>, default master] [--branch-ref <ref>, default working copy]
//        [--branch-url <site>: the branch side is that site as served, e.g. production] [--lang en]   Out: logs/youstates-<stamp>.json; exit 1 on an unexpected difference.
const fs = require('fs'), path = require('path');
const C = require('./common');
const { YOU_STATES, seedInPage } = require('./youSeed');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master', LANG = arg('--lang') || 'en';
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join(__dirname, 'logs', `youstates-${stamp}.json`);

// Runs in the page, after the seed.
async function collectInPage() {
  const o = {}, wait = ms => new Promise(r => setTimeout(r, ms));
  const txt = id => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim() : '(absent)'; };
  const show = async p => { if (p) enterPanel(p); else showShellSection('you'); await wait(450); };
  if (!profile) {
    o.signedIn = false;
    await show('voicehealth'); o['vh.banner'] = document.getElementById('healthBanner').className;
    await show('passport'); o['passport.content'] = getComputedStyle(document.getElementById('passportContent')).display;
    return o;
  }
  o.signedIn = true;
  progress.notifiedAchievements = ACHIEVEMENTS.filter(a => a.check()).map(a => a.id);
  const sp = computeSkillProfile();
  for (const k of ['pitch', 'range', 'breath', 'agility', 'expression']) o[`skill.${k}`] = sp[k];
  // 2.9's pooled Pitch, computed here from the seed: the last 20 solo scores with the last 20 Choir World run pitches
  const runs = ((progress.choirReadiness || {}).runs || []).filter(r => typeof r.pitch === 'number').sort((a, b) => (a.ts || 0) - (b.ts || 0)).slice(-20);
  const pool = [...(progress.pitchScores || []).slice(-20), ...runs.map(r => r.pitch)];
  o.__cwRuns = runs.length; o.__pitchPooled = pool.length ? Math.round(pool.reduce((a, b) => a + b, 0) / pool.length) : null;
  const keys = ['pitch', 'range', 'breath', 'agility', 'expression'];
  const sum = typeof skillSummary === 'function' ? skillSummary(sp) : (() => { // master's rule (renderSkillProfile)
    const av = keys.filter(k => sp[k] !== null); if (!av.length) return { level: null, strongest: null, weakest: null, missing: keys };
    const avg = Math.round(av.reduce((a, k) => a + sp[k], 0) / av.length);
    return { level: avg >= 80 ? 'pro' : avg >= 55 ? 'mid' : 'beg', strongest: av.reduce((a, b) => sp[a] >= sp[b] ? a : b),
      weakest: av.reduce((a, b) => sp[a] <= sp[b] ? a : b), missing: keys.filter(k => sp[k] === null) };
  })();
  o['summary.level'] = sum.level; o['summary.strongest'] = sum.strongest; o['summary.weakest'] = sum.weakest; o['summary.missing'] = sum.missing.join(',');
  const f = computeTodaysFocus(); o['focus.label'] = f.label; o['focus.pct'] = f.pct; o['focus.panel'] = f.panel;
  const lv = levelForXp(progress.xp || 0); o.level = lv.level; o['level.name'] = lv.name;
  o.xp = progress.xp || 0; o.streak = progress.streak || 0; o.sessions = progress.totalSessions || 0;
  const rv = personalRecordValues(); for (const k of Object.keys(rv)) o[`records.${k}`] = rv[k];
  o.achievements = ACHIEVEMENTS.filter(a => a.check()).map(a => a.id).join(',');
  await show('records');
  document.querySelectorAll('#panel-records [id^="recordsList"]').forEach(list => {
    [...list.querySelectorAll('.record-row')].forEach((r, i) => {
      const lab = r.querySelector('.record-label'), val = r.querySelector('.record-val');
      o[`recordsDom.${list.id}.${i}`] = `${lab ? lab.textContent.trim() : '?'} = ${val ? val.textContent.trim() : '?'}`;
    });
  });
  await show('journey');
  o['journey.inProgress'] = getComputedStyle(document.getElementById('journeyInProgress')).display !== 'none';
  // the day only while the Journey runs (before Day 1 the label is hidden; master's markup held a placeholder there)
  o['journey.day'] = o['journey.inProgress'] ? (txt('journeyDayLabel').match(/\d+/) || [null])[0] : null;
  const steps = () => { for (const s of ['range', 'tuner', 'interval', 'breath', 'scale']) o[`journey.step.${s}`] = txt('assessCheck' + s); };
  if (profile.day1StartDate) { // the steps as a singer with these results would see them before Day 1
    const keep = { d: profile.day1StartDate, s: profile.day1Snapshot };
    delete profile.day1StartDate; delete profile.day1Snapshot; await show('journey'); steps();
    profile.day1StartDate = keep.d; profile.day1Snapshot = keep.s;
  } else steps();
  await show('voicehealth');
  o['vh.banner'] = document.getElementById('healthBanner').className;
  o['vh.stability'] = JSON.stringify(renderVoiceHealthChart('stabilityTrendChart', 'stability'));
  o['vh.breath'] = JSON.stringify(renderVoiceHealthChart('breathTrendChart', 'breath'));
  await show('passport');
  for (const id of ['passportLevel', 'passportExtended', 'passportComfortable', 'passportReliable', 'passportStrongest', 'passportFocus',
    'passportBestSong', 'passportAchievements', 'passportBreakthroughs']) o[`passport.${id.slice(8).toLowerCase()}`] = txt(id);
  o['passport.updated'] = txt('passportUpdatedStamp');
  [...document.querySelectorAll('#timelineList .record-row')].forEach((r, i) => { o[`passport.timeline.${i}`] = r.textContent.replace(/\s+/g, ' ').trim(); });
  return o;
}

// Why a difference is expected (PHASE7.md §3), or null.
function expected(state, k, vals) {
  if (k.startsWith('journey.step.')) return '2.4: the Day 1 steps tick from stored results';
  if (/^recordsDom\.recordsList(Songs|Choir)/.test(k)) return '2.5: Records\' Songs and Choir World rows';
  if (k === 'recordsDom.recordsListVoice.2') return '2.5: "best of your last 20" (label only; the value must match)';
  if (k.startsWith('records.') && !k.startsWith('recordsDom')) return null;
  if (k.startsWith('passport.timeline.') || k === 'passport.updated') return '2.6: the timeline\'s language and dates, the last change';
  // 2.9: only in a state with Choir World runs, and only if the branch's Pitch is exactly the pooled value computed from
  // the seed; then what follows from Pitch there (the summary, Today's focus, the Passport's strongest/focus, Pitch Master)
  const blend = vals && vals.branch.__cwRuns > 0 && vals.branch['skill.pitch'] === vals.branch.__pitchPooled;
  if (k === 'skill.pitch') return blend ? `2.9: the Pitch blend (${vals.branch.__cwRuns} Choir World run(s); pooled ${vals.branch.__pitchPooled})` : null;
  if (blend && (k.startsWith('summary.') || k.startsWith('focus.') || k === 'passport.strongest' || k === 'passport.focus' || k === 'achievements'))
    return '2.9: follows from the Pitch blend';
  return null;
}

(async () => {
  const dirs = { master: C.buildDir(BASE), branch: arg('--branch-url') || C.buildDir(arg('--branch-ref') || null) };
  const b = await C.chromium.launch(); const res = { base: BASE, branch: arg('--branch-url') || arg('--branch-ref') || 'working copy', lang: LANG, states: {} };
  let unexpected = 0;
  try {
    const o0 = await C.openPage(b, { dir: dirs.master }); await C.signUp(o0.page, 'dvys', 'You States');
    const state = await o0.ctx.storageState(); await o0.ctx.close();
    // --branch-url: the sign-in was saved on the local origin; copy it to the site's origin (the same Supabase project).
    if (/^https?:\/\//.test(dirs.branch)) { const o = new URL(dirs.branch).origin; state.origins = [...state.origins.filter(x => x.origin !== o), ...state.origins.map(x => ({ ...x, origin: o }))]; }
    console.log(`== youstates · ${BASE} vs ${res.branch} · ${LANG}`);
    for (const st of YOU_STATES) {
      const vals = {};
      for (const side of ['master', 'branch']) {
        const { ctx, page, errors } = await C.openPage(b, { dir: dirs[side], storageState: st === 'signedout' ? undefined : state, lang: LANG });
        await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
        await C.clearOverlays(page);
        if (LANG !== 'en') await page.evaluate(l => setLanguage(l), LANG).catch(() => {});
        if (st !== 'signedout') await page.evaluate(seedInPage, st);
        vals[side] = await page.evaluate(collectInPage);
        vals[side].__errors = errors.slice();
        await ctx.close();
      }
      const keys = [...new Set([...Object.keys(vals.master), ...Object.keys(vals.branch)])].filter(k => !k.startsWith('__'));
      const rows = [];
      for (const k of keys) {
        const m = vals.master[k], br = vals.branch[k], same = JSON.stringify(m) === JSON.stringify(br);
        let why = same ? null : expected(st, k, vals);
        // a label-only change on the best-pitch row: the value must still match
        if (!same && k === 'recordsDom.recordsListVoice.2' && String(m).split(' = ')[1] !== String(br).split(' = ')[1]) why = null;
        const verdict = same ? 'equal' : why ? 'EXPECTED' : 'DIFF';
        if (verdict === 'DIFF') unexpected++;
        rows.push({ k, master: m, branch: br, verdict, why });
      }
      for (const side of ['master', 'branch']) if (vals[side].__errors.length) { unexpected++; rows.push({ k: `page errors (${side})`, master: '', branch: vals[side].__errors.join(' | '), verdict: 'DIFF' }); }
      res.states[st] = rows;
      const n = v => rows.filter(r => r.verdict === v).length;
      console.log(`\n-- ${st}: ${n('equal')} equal, ${n('EXPECTED')} expected, ${n('DIFF')} unexpected`);
      for (const r of rows) if (r.verdict !== 'equal') console.log(`   ${r.verdict.padEnd(8)} ${r.k}: ${JSON.stringify(r.master)} → ${JSON.stringify(r.branch)}${r.why ? `   (${r.why})` : ''}`);
    }
    console.log(`\nYOUSTATES: ${unexpected ? `FAIL: ${unexpected} unexpected difference(s)` : 'PASS: equal except the expected changes'}`);
    process.exitCode = unexpected ? 1 : 0;
  } finally {
    fs.mkdirSync(path.dirname(OUT), { recursive: true }); fs.writeFileSync(OUT, JSON.stringify(res, null, 1));
    console.log(`json: ${path.relative(C.ROOT, OUT)}`);
    await b.close(); C.cleanup();
  }
})();
