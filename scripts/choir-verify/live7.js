// Production check for Phase 7, signed in: checks the live HTML is identical to deploy/index.html, signs up
// a fresh account through the auth modal at 1280x720, runs Harmony Memory stage 1 on Demo Hymn Alto with a
// stand-in singer (known offsets, one late entry, one silent chord), compares the Performance Report shown
// with an independent recomputation from the run's raw frames, and logs the choir_readiness the API stored.
// Confirm the row afterwards: npx supabase db query --linked on the printed user id.
// Usage: node scripts/choir-verify/live7.js [url]
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const URL = process.argv[2] || 'https://deploy-alegra1122.vercel.app/';
const email = `voxcoach-live7-${Date.now()}@example.com`, password = 'L7-' + Math.random().toString(36).slice(2) + '!x9';
const PLAN = [
  { c: 0 }, { c: 20 }, { c: 80 }, { c: 0, d: 0.55 },  // chord 3 sharp (miss), chord 4 late but in tune
  null, { c: -120 }, { c: 0 }, { c: 0 },              // chord 5 silent, chord 6 over a semitone flat
];

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 720 } });
  const p = await ctx.newPage();
  const errors = [], patches = [];
  p.on('pageerror', e => errors.push(String(e)));
  p.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  p.on('response', async r => {
    if (!/\/me\/progress$/.test(r.url()) || r.request().method() !== 'PATCH') return;
    let got = null; try { got = (await r.json()).choir_readiness; } catch (e) {}
    patches.push({ status: r.status(), runs: got && got.runs ? got.runs.length : 0 });
  });
  const ev = (f, a) => p.evaluate(f, a);

  const resp = await p.goto(URL, { waitUntil: 'load' });
  const live = await resp.text(), local = fs.readFileSync(path.join(__dirname, '../../deploy/index.html'), 'utf8');
  console.log('live HTML', live === local ? 'IDENTICAL to deploy/index.html' : `DIFFERENT (live ${live.length} B, local ${local.length} B)`);
  await sleep(3000);
  const lang = p.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) await lang.click();

  // Sign up at 1280x720 with real clicks; flip to Sign in and back first, so the toggle is clicked for real too.
  await ev(() => openAuthModal());
  const hit = await p.locator('#authModeToggle').evaluate(el => { const r = el.getBoundingClientRect(), h = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return h === el ? 'the toggle itself' : (h && (h.id || h.className || h.tagName)); });
  await p.locator('#authModeToggle').click({ timeout: 5000 }); const m1 = await ev(() => authMode);
  await p.locator('#authModeToggle').click({ timeout: 5000 }); const m2 = await ev(() => authMode);
  console.log(`1280x720 modal: z ${await ev(() => getComputedStyle(authModalOverlay).zIndex)} over nav ${await ev(() => getComputedStyle(document.querySelector('.shell-bottomnav')).zIndex)} | on top at toggle: ${hit} | toggle clicks → ${m1} → ${m2}`);
  await p.locator('#authName').fill('Live7 Check');
  await p.locator('#authEmail').fill(email);
  await p.locator('#authPassword').fill(password);
  await p.locator('#authCreateBtn').click({ timeout: 5000 });
  await p.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await ev(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  const uid = await ev(async () => (await sb.auth.getSession()).data.session.user.id);
  console.log('signed up', email, '| user_id', uid, '| choir_readiness loaded:', JSON.stringify(await ev(() => progress.choirReadiness)));

  await ev(() => { enterPanel('partrehearsal'); });
  await sleep(500);
  await ev(() => { selectSong('hymn'); setRehearsalPart('Alto'); setRehearsalLevel(0); harmonyMemory.stage = 0; renderPartRehearsal(); });
  await p.locator('#hmemStartBtn').scrollIntoViewIfNeeded();
  await p.locator('#hmemStartBtn').click();
  await ev(async () => { while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
  await ev(pl => {
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
    an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
    harmonyMemory.notes.forEach((nt, i) => {
      const q = pl[i]; if (!q) return;
      const on = choirStartCtxTime + nt.start + (q.d || 0) * (nt.end - nt.start), off = choirStartCtxTime + nt.end - 0.01;
      osc.frequency.setValueAtTime(noteToFreq(nt.midi + q.c / 100), on);
      g.gain.setValueAtTime(0.3, on); g.gain.setValueAtTime(0, off);
    });
    analyser = an;
  }, PLAN);
  await ev(async () => { while (harmonyMemory.active) await new Promise(r => setTimeout(r, 50)); });
  let n = -1; while (n !== patches.length) { n = patches.length; await sleep(1500); }

  // Independent recomputation from the raw frames (the formulas written out again, not the app's functions).
  const ind = await ev(() => {
    const r = harmonyMemory.lastRun, mean = a => a.reduce((x, y) => x + y, 0) / a.length;
    const med = a => { const s = [...a].sort((x, y) => x - y), k = s.length >> 1; return s.length % 2 ? s[k] : (s[k - 1] + s[k]) / 2; };
    const judged = r.notes.map((nt, i) => { const c = r.cents[i]; if (c.length < HM_MIN_FRAMES) return { heard: false }; const m = med(c); return { heard: true, med: m, held: Math.abs(m) <= HM_TOL_CENTS }; });
    const heard = judged.map((j, i) => i).filter(i => judged[i].heard), held = judged.filter(j => j.held).length;
    return {
      held, n: r.notes.length, score: Math.round(held / r.notes.length * 100), heard: heard.length,
      pitch: Math.round(mean(heard.map(i => Math.max(0, 100 - mean(r.cents[i].map(Math.abs)) * 0.6)).map(Math.round))),
      timing: Math.round(mean(heard.map(i => r.firstVoiced[i] < (r.notes[i].end - r.notes[i].start) * 0.4 ? 100 : 50))),
      perNote: r.notes.map((nt, i) => ({ chord: i + 1, target: midiName(nt.midi), frames: r.cents[i].length, medianCents: judged[i].heard ? Math.round(judged[i].med) : null,
        entryMs: r.firstVoiced[i] === null ? null : Math.round(r.firstVoiced[i] * 1000), noteMs: Math.round((nt.end - nt.start) * 1000), verdict: judged[i].held ? 'held' : judged[i].heard ? 'off' : 'not heard', app: r.results[i].held ? 'held' : r.results[i].heard ? 'off' : 'not heard' })),
    };
  });
  console.log('\n== Harmony Memory stage 1, plan', JSON.stringify(PLAN));
  console.table(ind.perNote);
  console.log('independent:', JSON.stringify({ held: ind.held, n: ind.n, score: ind.score, heard: ind.heard, pitch: ind.pitch, timing: ind.timing }));
  console.log('app run:', JSON.stringify(await ev(() => { const r = harmonyMemory.lastRun, rep = computePerfReport(r); return { held: r.held, score: r.score, passed: r.passed, heard: rep.heard, pitch: rep.pitch, timing: rep.timing, onTime: rep.onTime }; })));
  console.log('Performance Report shown:\n  ' + (await ev(() => [...document.querySelectorAll('#hmemResults .pr-report .record-row')].map(r => r.innerText.replace(/\s+/g, ' ')))).join('\n  '));
  console.log('insight:', await ev(() => (document.querySelector('#hmemResults .pr-report p.desc') || {}).textContent));
  await p.locator('#hmemResults').screenshot({ path: require('os').tmpdir() + '/live7-report.png' });

  console.log('\nPATCH /me/progress:', JSON.stringify(patches));
  console.log('client choir_readiness:', JSON.stringify(await ev(() => progress.choirReadiness)));
  console.log('readiness card (Alto):', await ev(() => document.querySelector('[data-rd-part="Alto"]').innerText.replace(/\s+/g, ' ')));
  console.log('\nUSER_ID', uid, '| screenshot', require('os').tmpdir() + '\\live7-report.png', '| page errors:', errors);
  await b.close();
})();
