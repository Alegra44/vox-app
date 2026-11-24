// Release H (design/reliability/RELEASE_H.md): server answers that arrive out of order. On the LOCAL stack, or on the
// deployed site after a deploy (DV_URL; see below). A throwaway account (deleted at exit). In each case the server has already
// done the work of the older request (the browser fetched its real answer); only the answer's delivery to the page is
// held until a newer request has been answered, then released:
//   progress  saveProgress #1 (xp +3, warmupsCompleted +1) answered after saveProgress #2 (xp +4 more): the page must
//             keep #2's values, and the next save must not write #1's back to the server
//   retry     saveProgress #1 answered late (a success) after #2 failed with a 503: #2's retry still goes, the server ends
//             on #2's values (an older save's success must not cancel the newer one's retry)
//   profile   saveProfile #1 (name A) answered after saveProfile #2 (name B): the page keeps B; the server keeps B
//   warmup    wuServerSync's read of /me/progress (yesterday's warm-up day) answered after the save that counts today's
//             warm-up: the page keeps today's day and streak
//   (H2) warm-up count, while its read of /me/progress is out a save goes out (a score, +2 XP: the page's whole row):
//   elsewhere the warm-up was already counted today on another device (the server: today, streak +1, XP +5, warm-ups +1
//             when the read was served): counted once: today, streak +1 once, XP +5 once (plus the score's 2),
//             warm-ups +1 once, on the page and the server
//   nowhere   not counted anywhere yet: counted once, the same
//   quiet     (no save meanwhile) counted on another device: the page takes the count's XP too, and keeps it at its next
//             save (F took only the day and streak: the other device's +5 was lost)
//   vocal     loadVocalLoadToday's read of /me/vocal-load answered after a checkpoint the outbox sent meanwhile was
//             confirmed: the gauge's total includes that checkpoint
// Usage: node scripts/reliability-verify/outoforder.js [--ref <git ref>]   (default: the working copy's deploy/; DV_URL: that site)
require('../runguard').auto();
// The local stack (VOX_BACKEND=local), or the deployed site with DV_URL=https://… (the production checks after a deploy,
// production backend, the account deleted at exit); never production from a local build.
if (process.env.VOX_BACKEND !== 'local' && !/^https:\/\//.test(process.env.DV_URL || '')) { console.error('outoforder.js: VOX_BACKEND=local, or DV_URL=<the deployed site>'); process.exit(2); }
const C = require('../design-verify/common'), { db } = require('../choir-verify/testAccounts');
const ri = process.argv.indexOf('--ref'), REF = ri > 0 ? process.argv[ri + 1] : null;
let pass = 0, fail = 0;
const check = (name, ok, detail) => { console.log(`  ${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); ok ? pass++ : fail++; };
const waitFor = async (fn, ms) => { const t = Date.now() + ms; for (;;) { const v = await fn(); if (v || Date.now() > t) return v; await C.sleep(100); } };

(async () => {
  console.log(`build: ${process.env.DV_URL && !REF ? process.env.DV_URL : REF ? `${REF}'s deploy/` : 'the working copy'}`);
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
      const fetched = r.fetch(); // sent on to the server at once (through the local stack's slow proxy, only its answer waits)
      let release; const p = new Promise(res => { release = res; });
      held[k] = { release, answered: false };
      const resp = await fetched, body = await resp.text();
      await p;
      await r.fulfill({ response: resp, body });
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

    // H2: the warm-up count (wuCount: its read of /me/progress, then the count if today's isn't counted)
    const yday = () => page.evaluate(() => { const d = new Date(); d.setDate(d.getDate() - 1); return d.toLocaleDateString('en-CA'); });
    const row = () => db(`select xp, warmups_completed as w, last_warmup_day::text as d, warmup_streak as s from public.user_progress where user_id = '${uid}'`)[0];
    // the page and the server on yesterday's warm-up (streak 2), the page's xp and warm-ups on the server too
    const fromYesterday = async () => {
      await page.evaluate(() => Promise.allSettled([...progressSaving]));
      const y = await yday();
      await page.evaluate(async d => { progress.lastWarmupDay = d; progress.warmupStreak = 2; await saveProgress(); await Promise.allSettled([...progressSaving]); }, y);
      return { ...await page.evaluate(() => ({ xp: progress.xp || 0, w: progress.warmupsCompleted || 0, today: todayStr() })), y };
    };
    const countWith = async (k0, { elsewhere, save }) => {
      const k = 'GET /me/progress';
      if (elsewhere) db(`update public.user_progress set last_warmup_day = '${k0.today}', warmup_streak = 3, xp = ${k0.xp + 5}, warmups_completed = ${k0.w + 1} where user_id = '${uid}'`);
      holdNext(k);
      await page.evaluate(() => { window.__s = null; window.__c = wuCount(); });
      const ok = !!await whenHeld(k);
      // a score's save (the page's whole row) goes out while the read is out; the read's answer lands 300 ms later
      if (save) { await page.evaluate(() => { progress.xp += 2; window.__s = saveProgress(); }); await C.sleep(300); }
      await releaseAndWait(k); await page.evaluate(() => Promise.all([window.__c, window.__s]));
      await page.evaluate(() => Promise.allSettled([...progressSaving])); await C.sleep(500);
      return ok;
    };
    const counted = async (name, k0, extra) => {
      const p = await page.evaluate(() => ({ xp: progress.xp, w: progress.warmupsCompleted, d: progress.lastWarmupDay, s: progress.warmupStreak }));
      const s = row(), want = { xp: k0.xp + 5 + extra, w: k0.w + 1, d: k0.today, s: 3 };
      const same = o => o.xp === want.xp && o.w === want.w && o.d === want.d && o.s === want.s;
      check(`${name}: counted once on the page (today, streak 3, XP +5${extra ? ` +${extra}` : ''}, warm-ups +1)`, same(p), `page ${JSON.stringify(p)} want ${JSON.stringify(want)}`);
      check(`${name}: …and on the server`, same(s), `server ${JSON.stringify(s)}`);
    };

    await C.G.step('warmup-elsewhere', 60, async () => {
      const k0 = await fromYesterday();
      check('elsewhere: the count\'s read reached the server (today already counted there), its answer held', await countWith(k0, { elsewhere: true, save: true }));
      await counted('elsewhere', k0, 2);
    });
    await C.G.step('warmup-nowhere', 60, async () => {
      const k0 = await fromYesterday();
      check('nowhere: the count\'s read reached the server (yesterday), its answer held', await countWith(k0, { elsewhere: false, save: true }));
      await counted('nowhere', k0, 2);
    });
    await C.G.step('warmup-quiet', 60, async () => {
      const k0 = await fromYesterday();
      check('quiet: the count\'s read reached the server (today already counted there), its answer held', await countWith(k0, { elsewhere: true, save: false }));
      await page.evaluate(async () => { progress.lastBossWeakness = 'h2-quiet'; await saveProgress(); await Promise.allSettled([...progressSaving]); }); // the page's next save
      await counted('quiet (after the page\'s next save)', k0, 0);
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
