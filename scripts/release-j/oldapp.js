// Release J (design/reliability/RELEASE_J.md, J1): a save from an older app (master's page: no if_version) is accepted as
// before J (last writer wins), and a J page open meanwhile then merges on top of it (409, merged, sent again) instead of
// overwriting it. LOCAL stack (0012 and J's api), through the slow proxy; a throwaway account, deleted at exit.
// Usage: node scripts/release-j/oldapp.js [--old <git ref>]   (default master; the J page: the working copy's deploy/)
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('oldapp.js: VOX_BACKEND=local only'); process.exit(2); }
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const oi = process.argv.indexOf('--old'), OLD = oi > 0 ? process.argv[oi + 1] : 'master';
let pass = 0, fail = 0;
const check = (n, ok, d) => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); ok ? pass++ : fail++; };
const row = uid => db(`select xp, version, pitch_scores, agility_scores, total_sessions from public.user_progress where user_id = '${uid}'`)[0];
const watch = ctx => { const w = []; ctx.on('request', r => { if (/\/me\/progress$/.test(r.url()) && r.method() === 'PATCH') { const b = JSON.parse(r.postData() || '{}');
  w.push({ v: 'if_version' in b ? b.if_version : null, id: b.save_id || null, r }); } }); return w; };
const statuses = async w => Promise.all(w.map(async x => { const res = await x.r.response().catch(() => null); return res ? res.status() : 'none'; }));
const settle = async page => { for (let i = 0; i < 160; i++) { await C.sleep(250);
  if (await page.evaluate(() => (typeof progressInFlight === 'undefined' || !progressInFlight) && !progressRetry.timer && progressSaving.size === 0)) { await C.sleep(1500); return; } } };
(async () => {
  const b = await C.chromium.launch();
  try {
    const J = await C.openPage(b); const jw = watch(J.ctx);
    await C.signUp(J.page, 'joldapp', 'Old App'); await C.clearOverlays(J.page); await settle(J.page);
    const uid = await J.page.evaluate(() => profile.id), r0 = row(uid);
    const O = await C.openPage(b, { dir: C.buildDir(OLD), storageState: await J.ctx.storageState() }); const ow = watch(O.ctx);
    await settle(O.page); await C.clearOverlays(O.page);
    const ox = await O.page.evaluate(async () => { const x0 = progress.xp || 0; recordSkillScore('pitch', 77); progress.xp += 0; await saveProgress(); return { x0, x: progress.xp }; });
    await settle(O.page);
    const r1 = row(uid), os = await statuses(ow);
    check(`the old app (${OLD}) saves without a version`, ow.length > 0 && ow.every(x => x.v === null && x.id === null), `${ow.length} PATCH, if_version ${JSON.stringify(ow.map(x => x.v))}`);
    check('…and is accepted (200), as before J', os.length > 0 && os.every(s => s === 200), JSON.stringify(os));
    check('…the server has its score and XP; the version moved on', JSON.stringify(r1.pitch_scores) === '[77]' && r1.xp === ox.x && r1.version > r0.version,
      `pitch ${JSON.stringify(r1.pitch_scores)}, xp ${r1.xp} (the old page ${ox.x}), version ${r0.version} → ${r1.version}`);
    // the J page, open since before the old app's save: a score of its own, then its save
    const j0 = jw.length;
    const jx = await J.page.evaluate(async () => { const x0 = progress.xp || 0; recordSkillScore('agility', 66); const d = (progress.xp || 0) - x0; await saveProgress(); return d; });
    await settle(J.page);
    const r2 = row(uid), js = await statuses(jw.slice(j0));
    check('the J page\'s save: 409 (the old app moved the row), merged, sent again (200)', js[0] === 409 && js[js.length - 1] === 200 && jw.slice(j0).every(x => typeof x.v === 'number'), JSON.stringify(js));
    check('…the server keeps the old app\'s score and XP, plus the J page\'s', JSON.stringify(r2.pitch_scores) === '[77]' && JSON.stringify(r2.agility_scores) === '[66]' && r2.xp === r1.xp + jx,
      `pitch ${JSON.stringify(r2.pitch_scores)}, agility ${JSON.stringify(r2.agility_scores)}, xp ${r2.xp} (want ${r1.xp + jx})`);
    // and the old app again, after the J page's: still accepted (it writes its copy, last writer wins: as before J)
    const o0 = ow.length;
    await O.page.evaluate(async () => { progress.lastBossWeakness = 'old-app'; await saveProgress(); }); await settle(O.page);
    const os2 = await statuses(ow.slice(o0));
    check('the old app\'s next save is accepted too (no version, no 409)', os2.length > 0 && os2.every(s => s === 200), JSON.stringify(os2));
    await O.ctx.close(); await J.ctx.close();
  } finally { await b.close(); C.cleanup(); }
  console.log(`\nOLDAPP: ${fail ? 'FAIL' : 'PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
