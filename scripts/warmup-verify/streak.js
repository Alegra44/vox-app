// Release F5's check: the warm-up's day and streak on the server, with two browser contexts as two devices of one
// account (local stack, a throwaway account deleted however the run ends; the fake mic: a C4 tone, silent).
//   1. Both devices open. Device A warms up (one real exercise in the pre-session warm-up, 20 s). Device B, already
//      open since before, starts a session: the warm-up isn't offered (the server says today counted), and its
//      Coach → Warm-up says "Warmed up today"; a third, fresh device opened after it sees the same.
//   2. The streak over days (the app's day moved in the page; wuCount is what an exercise's end calls): day D counts 1;
//      D+1 (past local midnight) counts 2 and the header reads "2 days warmed up in a row"; Home says "2 days warmed
//      up"; D+3 (D+2 missed) shows 0 before warming up (broken) and 1 after. The practice streak and the session count
//      never move with it, and XP rises by 5 once per day.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/streak.js [out.json]
require('../runguard').auto();
const fs = require('fs');
const { sleep, check, totals, tone, launch, openPage, warm, rearm, db, uid } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OUT = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : 'design/warmup/streak-f.json';
const OFF = -new Date().getTimezoneOffset(), DAY = n => new Date(Date.now() + n * 86400000 + OFF * 60000).toISOString().slice(0, 10); // the app's local day
const overlayUp = page => page.evaluate(() => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none');
const server = () => db(`select last_warmup_day::text as d, warmup_streak as s, streak, total_sessions as n, xp from public.user_progress where user_id = '${uid()}'`)[0];

(async () => {
  const t = tone(60), b = await launch(t.wav), rows = [];
  try {
    const A = await openPage(b, { viewport: { width: 390, height: 844 } });
    await A.page.evaluate(() => { window.__wuAllow = true; });
    await rearm(A.page);
    const B = await openPage(b, { viewport: { width: 1280, height: 900 } }); // the second device, open from the start
    const s0 = server(); rows.push({ step: 'start', ...s0 });
    check('the columns exist on the local stack (0011): last_warmup_day null, warmup_streak 0', s0.d === null && +s0.s === 0, JSON.stringify(s0));
    // 1. A warms up with a real exercise
    await warm(A.page);
    await A.page.evaluate(() => { warmupGate(); });
    await A.page.waitForFunction(() => getComputedStyle(document.getElementById('warmupOverlay')).display !== 'none', null, { timeout: 8000 });
    await A.page.locator('#warmupList [data-wu-item="hum"]').click();
    await A.page.waitForFunction(() => wuDone.has('hum') && !wuRun, null, { timeout: 40000 }); await sleep(2500);
    await A.page.locator('#warmupContinueBtn').click(); await sleep(300); // the summary
    await A.page.locator('#warmupContinueBtn').click(); await sleep(500); // the session
    const s1 = server(); rows.push({ step: 'A warmed up', ...s1 });
    check('A: one exercise counts the day on the server (last_warmup_day today, streak 1)', s1.d === DAY(0) && +s1.s === 1, JSON.stringify(s1));
    check('A: the practice streak and sessions are untouched, XP +5', +s1.streak === +s0.streak && +s1.n === +s0.n && +s1.xp - +s0.xp === 5, `streak ${s0.streak}→${s1.streak} · sessions ${s0.n}→${s1.n} · xp ${s0.xp}→${s1.xp}`);
    // B, open since before A warmed up: no reload
    const bLocal = await B.page.evaluate(() => ({ ls: (() => { try { return localStorage.getItem(wuKey()); } catch (e) { return 'err'; } })(), last: progress.lastWarmupDay }));
    await B.page.evaluate(() => { window.__gateDone = false; warmupGate().then(() => { window.__gateDone = true; }); });
    await sleep(2500);
    const bUp = await overlayUp(B.page), bDone = await B.page.evaluate(() => window.__gateDone);
    check('B (open since before): a session start isn\'t offered the warm-up; the server says today counted', !bUp && bDone, `overlay ${bUp} · gate passed ${bDone} · B had in memory ${JSON.stringify(bLocal)}`);
    await B.page.evaluate(() => enterPanel('warmup')); await sleep(600);
    const bCard = await B.page.evaluate(() => document.getElementById('wuXpTitle').textContent);
    check('B: Coach → Warm-up says "Warmed up today"', bCard === 'Warmed up today', bCard);
    const C = await openPage(b, { viewport: { width: 390, height: 844 } }); // a fresh device, opened now
    const cGate = await C.page.evaluate(() => wuPassed());
    check('C (opened after): warmed up today from the server row it loaded', cGate, `wuPassed ${cGate}`);
    await C.ctx.close(); await B.ctx.close();
    // 2. the streak over days, on A (wuCount: what an exercise's end calls)
    const P = A.page;
    const dayStep = async (n, label) => {
      await P.evaluate(d => { if (!window.__todayStr) window.__todayStr = todayStr; todayStr = () => d; }, DAY(n));
      const before = await P.evaluate(() => wuStreakNow());
      await P.evaluate(() => wuCount()); await sleep(800);
      const r = await P.evaluate(() => { wuRender(); updateShellTopbar(); return { now: wuStreakNow(), header: document.getElementById('wuStreakLine').hidden ? null : document.getElementById('wuStreakText').textContent,
        home: document.getElementById('shellWuStreak').hidden ? null : document.getElementById('shellWuStreak').textContent, practice: progress.streak, sessions: progress.totalSessions }; });
      const sv = server(); rows.push({ step: label, before, ...r, server: sv }); return { before, ...r, sv };
    };
    await rearm(P); await P.evaluate(() => { progress.warmupStreak = 0; });
    const base = server();
    const d0 = await dayStep(0, 'day D');
    check('day D: counts 1', d0.now === 1 && +d0.sv.s === 1 && d0.sv.d === DAY(0), JSON.stringify({ now: d0.now, server: d0.sv }));
    const d1 = await dayStep(1, 'D+1');
    check('D+1 (past local midnight): carries on, 2', d1.before === 1 && d1.now === 2 && +d1.sv.s === 2 && d1.sv.d === DAY(1), JSON.stringify({ before: d1.before, now: d1.now, server: d1.sv }));
    check('the warm-up\'s header: "2 days warmed up in a row · today counted"', d1.header === '2 days warmed up in a row · today counted', d1.header);
    check('Home\'s stats line, in words: "2 days warmed up"', d1.home === '2 days warmed up', d1.home);
    await P.evaluate(d => { todayStr = () => d; }, DAY(3));
    const broken = await P.evaluate(() => { wuRender(); updateShellTopbar(); return { now: wuStreakNow(), home: document.getElementById('shellWuStreak').hidden ? null : document.getElementById('shellWuStreak').textContent, header: !document.getElementById('wuStreakLine').hidden }; });
    check('D+3 (D+2 missed): broken before warming up (0; nothing on Home or in the header)', broken.now === 0 && broken.home === null && !broken.header, JSON.stringify(broken));
    const d3 = await dayStep(3, 'D+3');
    check('D+3: warming up starts it again at 1', d3.now === 1 && +d3.sv.s === 1 && d3.sv.d === DAY(3), JSON.stringify({ now: d3.now, server: d3.sv }));
    const again = await dayStep(3, 'D+3 again');
    check('D+3, a second exercise: no change (once a day)', again.now === 1 && +again.sv.xp === +d3.sv.xp, `xp ${d3.sv.xp} → ${again.sv.xp}`);
    check('over the days: the practice streak and sessions never moved; XP +5 a counted day (3 days)', +again.sv.streak === +base.streak && +again.sv.n === +base.n && +again.sv.xp - +base.xp === 15,
      `streak ${base.streak}→${again.sv.streak} · sessions ${base.n}→${again.sv.n} · xp +${+again.sv.xp - +base.xp}`);
    await P.evaluate(() => { todayStr = window.__todayStr; });
    check('no page errors', A.errors.length + B.errors.length === 0, [...A.errors, ...B.errors].join(' | '));
  } finally { await b.close(); await cleanup(); }
  fs.writeFileSync(OUT, JSON.stringify(rows, null, 1));
  const { pass, fail } = totals(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
