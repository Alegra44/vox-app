// Phase 5 (PHASE5.md §3): the vocal load of one rehearsal play-through with "Hear me" on, and the same with it off
// (no mic: expected 0). Choir-plan test account, the fake mic singing the steady A4 (design-verify/stage.js), Light 1280.
// For each: today's load before and after (vlDay.load, settled after the stop), and each vocal load session's own
// finish() (active seconds, load), captured by wrapping VocalLoad.createSession. Report only: nothing is gated.
// Usage: node scripts/vocal-load-verify/hearme.js [--base <git ref>]
const C = require('../design-verify/common'), S = require('../design-verify/stage');
const { db } = require('../choir-verify/testAccounts');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const sleep = C.sleep;

(async () => {
  const dir = C.buildDir(arg('--base'));
  const b0 = await C.chromium.launch();
  const { ctx: c0, page: p0 } = await C.openPage(b0, { dir }); await C.signUp(p0, 'vlhm', 'Hear Me');
  const uid = await p0.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
  db(`update public.users set subscription_plan = 'choir', trial_start_date = current_date - 30 where id = '${uid}'`);
  const state = await c0.storageState(); await c0.close(); await b0.close();
  S.ensureStimuli(); const b = await S.launchMic(S.STIM.steady);
  try {
    const { page, errors } = await C.openPage(b, { dir, theme: 'light', viewport: { width: 1280, height: 800 }, storageState: state });
    await C.clearOverlays(page); await S.warmMic(page);
    await page.evaluate(() => { window.__vls = []; const mk = VocalLoad.createSession;
      VocalLoad.createSession = (...a) => { const s = mk(...a), fin = s.finish.bind(s); s.finish = () => { const r = fin(); window.__vls.push(JSON.parse(JSON.stringify(r))); return r; }; return s; }; });
    const one = async on => {
      await page.evaluate(on => { selectSong('hymn'); setRehearsalPart('Alto'); cwShowTab('rehearse'); localStorage.setItem('cwHearMe', on ? '1' : '0'); renderHearButton(); window.__vls = []; }, on);
      await sleep(1000);
      const before = await page.evaluate(() => vlDay.load);
      await page.evaluate(() => document.getElementById('rehearsalPlayBtn').click());
      await page.waitForFunction(() => partRehearsal.active && choirIsPlaying, null, { timeout: 15000 });
      const len = await page.evaluate(() => choirEndCtxTime - choirStartCtxTime);
      await page.waitForFunction(len => audioCtx.currentTime - choirStartCtxTime >= len - 0.05, len, { timeout: (len + 20) * 1000, polling: 50 });
      await page.evaluate(() => document.getElementById('rehearsalStopBtn').click());
      await sleep(6000); // past VL_IDLE_MS: the session has ended and saved
      const after = await page.evaluate(() => ({ load: vlDay.load, sessions: window.__vls }));
      console.log(`Hear me ${on ? 'on ' : 'off'}: one play-through ${len.toFixed(1)} s · today's load ${before.toFixed(2)} → ${after.load.toFixed(2)} (+${(after.load - before).toFixed(2)}) · sessions ${JSON.stringify(after.sessions)}`);
    };
    console.log(`== hearme · ${arg('--base') || 'branch (working copy)'}`);
    await one(false); await one(true);
    console.log(`page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
  } finally { await b.close(); await C.cleanup(); }
})();
