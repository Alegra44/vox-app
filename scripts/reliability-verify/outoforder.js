// Release H (design/reliability/RELEASE_H.md): server answers that arrive out of order. On the LOCAL stack only
// (VOX_BACKEND=local; refuses otherwise). A throwaway account (deleted at exit). In each case the server has already
// done the work of the older request (the browser fetched its real answer); only the answer's delivery to the page is
// held until a newer request has been answered, then released:
//   progress  saveProgress #1 (xp +3, warmupsCompleted +1) answered after saveProgress #2 (xp +4 more): the page must
//             keep #2's values, and the next save must not write #1's back to the server
//   retry     saveProgress #1 answered late (a success) after #2 failed with a 503: #2's retry still goes, the server ends
//             on #2's values (an older save's success must not cancel the newer one's retry)
//   profile   saveProfile #1 (name A) answered after saveProfile #2 (name B): the page keeps B; the server keeps B
//   warmup    wuServerSync's read of /me/progress (yesterday's warm-up day) answered after the save that counts today's
//             warm-up: the page keeps today's day and streak
//   vocal     loadVocalLoadToday's read of /me/vocal-load answered after a checkpoint the outbox sent meanwhile was
//             confirmed: the gauge's total includes that checkpoint
// Usage: node scripts/reliability-verify/outoforder.js [--ref <git ref>]   (default: the working copy's deploy/)
require('../runguard').auto();
if (process.env.VOX_BACKEND !== 'local') { console.error('outoforder.js runs on the local stack only (VOX_BACKEND=local)'); process.exit(2); }
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const ri = process.argv.indexOf('--ref'), REF = ri > 0 ? process.argv[ri + 1] : null;
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const waitFor = async (fn, ms) => { const t = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > t) return v; await C.sleep(100); } };

(async () => {
  console.log(`build: ${REF ? `${REF}'s deploy/` : 'the working copy'}`);
  const b = await C.chromium.launch();
  try {
    // hold[path+method] = true: the next such request is sent to the server at once, its answer kept back until released
    const hold = {}, held = {}, fail503 = {};
    const key = (u, m) => `${m} ${new URL(u).pathname.replace(/^.*\/api/, '')}`;
    const { ctx, page } = await C.openPage(b, { dir: C.buildDir(REF), prepare: c => c.route(/\/api\/me(\/progress|\/vocal-load)?(\?.*)?$/, async r => {
      const k = key(r.request().url(), r.request().method());
      if (fail503[k]) { fail503[k]--; return r.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"Service Unavailable"}' }); }
      if (!hold[k]) return r.continue();
      hold[k] = false;
      const resp = await r.fetch(); // the server has done it
      let release; const p = new Promise(res => { release = res; });
      held[k] = { release, answered: false, body: await resp.text() };
      await p;
      await r.fulfill({ response: resp, body: held[k].body });
      held[k].answered = true;
    }) });
    const holdNext = k => { hold[k] = true; delete held[k]; };
    const whenHeld = k => waitFor(() => !!held[k], 15000);
    const releaseAndWait = async k => { held[k].release(); await waitFor(() => held[k].answered, 10000); await C.sleep(300); };

    await C.signUp(page, 'hsave', 'Order Check'); await C.clearOverlays(page);
    const uid = await page.evaluate(() => profile.id);
    await page.evaluate(() => Promise.allSettled([...progressSaving])); await C.sleep(1500);

    await C.G.step('progress', 40, async () => {
      const k = 'PATCH /me/progress';
      const x0 = await page.evaluate(() => progress.xp || 0), w0 = await page.evaluate(() => progress.warmupsCompleted || 0);
      holdNext(k);
      await page.evaluate(() => { progress.xp = (progress.xp || 0) + 3; progress.warmupsCompleted = (progress.warmupsCompleted || 0) + 1; window.__s1 = saveProgress(); });
      check('save #1 reached the server, its answer held', !!await whenHeld(k));
      await page.evaluate(async () => { progress.xp += 4; progress.warmupsCompleted += 1; await saveProgress(); });
      await releaseAndWait(k); await page.evaluate(() => window.__s1);
      const now = await page.evaluate(() => ({ xp: progress.xp, w: progress.warmupsCompleted }));
      check('progress: the page keeps the newest save\'s values after the older answer lands', now.xp === x0 + 7 && now.w === w0 + 2,
        `xp ${now.xp} (want ${x0 + 7}), warmupsCompleted ${now.w} (want ${w0 + 2})`);
      await page.evaluate(async () => { progress.lastBossWeakness = 'h-check'; await saveProgress(); }); // the next save, of another field
      const s = db(`select xp, warmups_completed from public.user_progress where user_id = '${uid}'`)[0];
      check('progress: the next save keeps the server on the newest values', s.xp === x0 + 7 && s.warmups_completed === w0 + 2,
        `server xp ${s.xp}, warmups_completed ${s.warmups_completed}`);
    });

    await C.G.step('retry', 40, async () => {
      const k = 'PATCH /me/progress';
      const x0 = await page.evaluate(() => progress.xp || 0);
      holdNext(k);
      await page.evaluate(() => { progress.xp += 2; window.__s1 = saveProgress(); });
      check('save #1 reached the server, its answer held', !!await whenHeld(k));
      fail503[k] = 1;
      await page.evaluate(async () => { progress.xp += 5; await saveProgress(); });
      await releaseAndWait(k); await page.evaluate(() => window.__s1);
      const ok = await waitFor(() => db(`select xp from public.user_progress where user_id = '${uid}'`)[0].xp === x0 + 7, 8000);
      const s = db(`select xp from public.user_progress where user_id = '${uid}'`)[0].xp;
      check('retry: save #2 (503) is still retried after #1\'s late success; the server ends on #2\'s values', !!ok,
        `server xp ${s} (want ${x0 + 7}), page ${await page.evaluate(() => progress.xp)}`);
      await page.evaluate(() => Promise.allSettled([...progressSaving])); await C.sleep(500);
    });

    await C.G.step('profile', 40, async () => {
      const k = 'PATCH /me';
      holdNext(k);
      await page.evaluate(() => { profile.name = 'Order A'; window.__p1 = saveProfile(profile); });
      check('saveProfile #1 reached the server, its answer held', !!await whenHeld(k));
      await page.evaluate(async () => { profile.name = 'Order B'; await saveProfile(profile); });
      await releaseAndWait(k); await page.evaluate(() => window.__p1);
      const name = await page.evaluate(() => profile.name);
      check('profile: the page keeps the newest name after the older answer lands', name === 'Order B', `name "${name}"`);
      await page.evaluate(async () => { profile.genre = profile.genre || 'pop'; await saveProfile(profile); });
      const s = db(`select name from public.users where id = '${uid}'`)[0];
      check('profile: the next save keeps the server on the newest name', s && s.name === 'Order B', `server "${s && s.name}"`);
    });

    await C.G.step('warmup', 40, async () => {
      const k = 'GET /me/progress';
      // yesterday's warm-up on the server and in the page (a streak of 2)
      const y = await page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); });
      db(`update public.user_progress set last_warmup_day = '${y}', warmup_streak = 2 where user_id = '${uid}'`);
      await page.evaluate(d => { progress.lastWarmupDay = d; progress.warmupStreak = 2; }, y);
      holdNext(k);
      await page.evaluate(() => { window.__g = wuServerSync(8000); });
      check('the warm-up day\'s read reached the server (yesterday), its answer held', !!await whenHeld(k));
      const today = await page.evaluate(async () => { progress.warmupStreak = 3; progress.lastWarmupDay = todayStr(); await saveProgress(); return todayStr(); });
      await releaseAndWait(k); await page.evaluate(() => window.__g);
      const now = await page.evaluate(() => ({ day: progress.lastWarmupDay, streak: progress.warmupStreak, counted: wuCountedToday() }));
      check('warm-up day: the page keeps today\'s day and streak after the older read lands', now.day === today && now.streak === 3 && now.counted,
        `day ${now.day} (want ${today}), streak ${now.streak}, counted today ${now.counted}`);
    });

    await C.G.step('vocal', 40, async () => {
      const k = 'GET /me/vocal-load';
      await page.evaluate(() => loadVocalLoadToday());
      const before = await page.evaluate(() => vlDay.load);
      holdNext(k);
      await page.evaluate(() => { window.__v = loadVocalLoadToday(); });
      check('the day\'s vocal-load read reached the server, its answer held', !!await whenHeld(k));
      // a checkpoint (60 s of singing, load 120) stored and confirmed while the read is out
      const sent = await page.evaluate(async () => {
        const t = Date.now() - 70000, payload = { sessionId: crypto.randomUUID(), day: VocalLoadStore.dayOf(t), startedAt: new Date(t).toISOString(),
          tzOffsetMin: -new Date(t).getTimezoneOffset(), activeSeconds: 60, load: 120, medianRms: 0.05, p5Midi: 55, p95Midi: 67, ended: true };
        const box = vlOutbox(); const { sending } = box.put(payload, {}); const r = await sending;
        return { ok: r && r.ok, left: box.size() };
      });
      check('…the checkpoint was confirmed meanwhile', sent.ok && sent.left === 0, JSON.stringify(sent));
      await releaseAndWait(k); await page.evaluate(() => window.__v); await C.sleep(500);
      const after = await page.evaluate(() => vlDay.load);
      const server = Number(db(`select coalesce(sum(load),0) as s from public.vocal_load_sessions where user_id = '${uid}'`)[0].s);
      check('vocal load: the gauge\'s total includes the checkpoint confirmed while the read was out', Math.abs(after - (before + 120)) < 0.01,
        `before ${before}, after ${after} (want ${before + 120}); server's sessions total ${server}`);
    });
    await ctx.close();
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fail ? 'OUTOFORDER: FAIL' : 'OUTOFORDER: PASS'} (${pass} passed, ${fail} failed)`);
  process.exit(fail ? 1 : 0);
})();
