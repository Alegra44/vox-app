// Release F6's check: the warm-up streak line (#wuStreakLine, the first line of the warm-up's body) in every state, in
// the pre-session overlay and in Coach → Warm-up, at 390 Light. With no streak to show (none, one day, a broken one) the
// whole line is gone: not displayed, no height, the icon included. With one (2 days or more: "keep it going" before
// today's warm-up, "warmed up today" after) the icon and the text sit on one line.
// Each state is seeded on user_progress (local stack) with no page open, then read on a fresh page.
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/streakline.js
require('../runguard').auto();
const { sleep, check, totals, tone, launch, openPage, db, uid } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OFF = -new Date().getTimezoneOffset(), DAY = n => new Date(Date.now() + n * 86400000 + OFF * 60000).toISOString().slice(0, 10);
const STATES = [ // name, last_warmup_day, warmup_streak, shown text key (null: no line)
  ['no streak (never warmed up)', null, 0, null],
  ['one day (yesterday, 1)', -1, 1, null],
  ['a broken streak (3 days ago, 5)', -3, 5, null],
  ['a streak, not yet today (yesterday, 3)', -1, 3, 'wu_streak_keep'],
  ['warmed up today (today, 3)', 0, 3, 'wu_streak_done'],
];
const line = page => page.evaluate(() => {
  const l = document.getElementById('wuStreakLine'), i = l.querySelector('svg'), s = document.getElementById('wuStreakText');
  const r = l.getBoundingClientRect(), ri = i.getBoundingClientRect(), rs = s.getBoundingClientRect();
  return { host: wuHost, hidden: l.hidden, display: getComputedStyle(l).display, h: Math.round(r.height), iconW: Math.round(ri.width),
    text: s.textContent, textW: Math.round(rs.width), sameLine: Math.abs((ri.top + ri.bottom) / 2 - (rs.top + rs.bottom) / 2) < 8 };
});

(async () => {
  const t = tone(60), b = await launch(t.wav);
  try {
    const first = await openPage(b, { viewport: { width: 390, height: 844 } }); await sleep(3000); await first.ctx.close(); // the sign-up's saves done
    for (const [name, last, streak, key] of STATES) {
      db(`update public.user_progress set last_warmup_day = ${last === null ? 'null' : `'${DAY(last)}'`}, warmup_streak = ${streak} where user_id = '${uid()}'`);
      const { ctx, page, errors } = await openPage(b, { viewport: { width: 390, height: 844 } });
      const want = key && await page.evaluate(([k, n]) => t(k).replace('{n}', n), [key, streak]);
      const judge = (where, s) => key
        ? check(`${name}, ${where}: icon and text on one line`, s.display !== 'none' && s.text === want && s.textW > 0 && s.iconW > 0 && s.sameLine, `"${s.text}" h ${s.h}`)
        : check(`${name}, ${where}: no line at all (icon included)`, s.display === 'none' && s.h === 0 && s.iconW === 0, `display ${s.display}, h ${s.h}, icon ${s.iconW}px, text "${s.text}"`);
      // Coach → Warm-up
      await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
      await page.locator('#panel-train-hub [data-enter-panel="warmup"]').click(); await sleep(800);
      const p = await line(page); judge('Coach → Warm-up', p);
      // the pre-session overlay (opened as warmupGate opens it; "warmed up today" never gets it from a session)
      await page.evaluate(() => { window.__wuAllow = true; wuOpen(); }); await sleep(600);
      const o = await line(page); judge('the overlay', o);
      check(`${name}: the line was in each host`, p.host === 'panel' && o.host === 'overlay', `${p.host} / ${o.host}`);
      check(`${name}: no page errors`, errors.length === 0, errors.join(' | '));
      await ctx.close();
    }
  } finally { await b.close(); await cleanup(); }
  const { pass, fail } = totals(); console.log(`\n${pass} passed, ${fail} failed`); process.exit(fail ? 1 : 0);
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
