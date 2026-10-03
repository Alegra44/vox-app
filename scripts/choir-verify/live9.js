// Production check for Phase 9: live HTML identical to deploy/index.html, then a fresh trial account (signed up
// through the auth modal) beats Boss 1 on Demo Hymn Alto with a stand-in singer. Times, on the page clock, when
// the run ended, when the achievement toast appeared (and whether it is on screen) and when the progress save
// was sent and returned, to show the toast does not wait for the save. The account is deleted at exit.
// Usage: node scripts/choir-verify/live9.js [url]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const fs = require('fs'), path = require('path');
const { track, db } = require('./testAccounts');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2] || 'https://deploy-alegra1122.vercel.app/';
const email = track(`voxcoach-live9-${Date.now()}@example.com`), password = 'L9-' + Math.random().toString(36).slice(2) + '!x9';

(async () => {
  const html = await (await fetch(URL + '?v=' + Date.now())).text();
  const local = fs.readFileSync(path.join(__dirname, '../../deploy/index.html'), 'utf8');
  console.log('live HTML identical to deploy/index.html:', html === local, `(${html.length} bytes)`);

  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const p = await (await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } })).newPage();
  const errors = [];
  p.on('pageerror', e => errors.push(String(e)));
  const ev = (f, a) => p.evaluate(f, a);
  await p.goto(URL, { waitUntil: 'load' }); await sleep(3000);
  const lang = p.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) await lang.click();

  await ev(() => openAuthModal());
  await p.locator('#authName').fill('Live9 Check');
  await p.locator('#authEmail').fill(email); await p.locator('#authPassword').fill(password);
  await p.locator('#authCreateBtn').click();
  await p.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await ev(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  const uid = await ev(async () => (await sb.auth.getSession()).data.session.user.id);
  console.log('signed up', email, '| tier', await ev(() => currentTier()), '| Choir World access', await ev(() => hasChoirWorldAccess()));

  // Page-clock instrumentation: toasts, progress saves (sent / returned), and the moment the run ends.
  await ev(() => {
    window.__t = { toasts: [], saves: [] };
    const show = showToast; showToast = (m, ty) => { __t.toasts.push({ at: performance.now(), m }); show(m, ty); };
    const f = window.fetch; window.fetch = async (u, o) => {
      const isSave = /\/me\/progress$/.test(String(u)) && o && o.method === 'PATCH', rec = isSave && { sent: performance.now() };
      if (rec) __t.saves.push(rec);
      try { const r = await f(u, o); if (rec) { rec.back = performance.now(); rec.status = r.status; } return r; }
      catch (e) { if (rec) { rec.back = performance.now(); rec.status = 'failed'; } throw e; }
    };
    enterPanel('partrehearsal'); selectSong('hymn'); setRehearsalPart('Alto'); chSel.boss = 0; renderChoirBosses();
  });
  await p.locator('#cbStartBtn').click();
  await ev(async () => { while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  await ev(() => { // stand-in singer: every note of the Alto line, in tune
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    challenge.notes.forEach(nt => { osc.frequency.setValueAtTime(noteToFreq(nt.midi), choirStartCtxTime + nt.start); g.gain.setValueAtTime(0.3, choirStartCtxTime + nt.start); g.gain.setValueAtTime(0, choirStartCtxTime + nt.end - 0.01); });
    analyser = an;
  });
  const ended = await ev(async () => { while (challenge.active) await new Promise(r => setTimeout(r, 5)); return performance.now(); });
  const onScreen = await ev(() => [...document.querySelectorAll('#appToastWrap .app-toast')].map(e => e.textContent));
  await sleep(6000);
  const t = await ev(() => __t);
  const r = await ev(() => ({ score: challenge.lastRun.boss.score, passed: challenge.lastRun.boss.passed, unlocked: ACHIEVEMENTS.find(a => a.id === 'cw_boss').check() }));
  const rel = x => x === undefined ? '—' : `${(x - ended) >= 0 ? '+' : ''}${Math.round(x - ended)} ms`;
  console.log(`\nBoss 1: ${JSON.stringify(r)}`);
  console.log('toast(s) on screen at the moment the run ended:', JSON.stringify(onScreen));
  t.toasts.forEach(x => console.log(`toast ${rel(x.at)} after the run ended: ${x.m}`));
  t.saves.forEach((s, i) => console.log(`save #${i + 1}: sent ${rel(s.sent)}, returned ${rel(s.back)} (HTTP ${s.status})`));
  const row = db(`select choir_readiness->'firsts'->'bossWin' as boss_win, notified_achievements from public.user_progress where user_id = '${uid}'`)[0];
  console.log('DB row:', JSON.stringify(row));
  console.log('page errors:', errors);
  await b.close();
})();
