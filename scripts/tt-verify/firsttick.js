// Entrance & Cutoff Trainer, first tick: a note already sounding when the trainer starts must not count as an entrance
// (or, when it ends, as a cutoff), and so can't add a count-in "bleed" hit, while normal singing and real speaker
// bleed are still detected. A real throwaway account runs the trainer from its own button (I Am the Alto, Lead). The
// page's mic is an oscillator (C4) whose on/off envelope is scheduled on the song clock (choirStartCtxTime), so it goes
// through the app's own mic path and ticker. Every edge the trainer counts is logged by wrapping claimNearestTarget.
//   S1 silent at the start, then sings every note (on at the note start, off 150 ms before its end): one entrance
//      per note, all claimed, none before the downbeat, no bleed hits
//   S2 already singing when the trainer starts, stops 1 s before the downbeat, then every note: the same as S1
//      (before the fix: one extra entrance at the first tick, near the first click); x5
//   S3 singing without a break from before the start to the end: no entrances at all; x5
//   S4 silent, but a 70 ms burst on each count-in click (the speakers leaking into the mic), then every note: at
//      least 2 bleed hits and the warning shown; every note still claimed
//   S5 Cutoff mode, already singing at the start, stops 1 s before the downbeat, then every note: no cutoff before
//      the downbeat, every note end claimed
// The test account is deleted however the run ends (testAccounts.js).
// Usage: [TT_ONLY=S1,S2] node scripts/tt-verify/firsttick.js [url]   (no url: deploy/ served locally, production backend)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const path = require('path');
const { track, db, cleanup } = require('../choir-verify/testAccounts');

const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-ttf-${Date.now()}@example.com`), password = 'VC-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(72)} ${detail}`); }
const REPEAT = Number(process.env.TT_REPEAT || 5);
const ONLY = process.env.TT_ONLY ? process.env.TT_ONLY.split(',') : null, want = k => !ONLY || ONLY.includes(k); // e.g. TT_ONLY=S1,S2

const INIT = () => {
  // the singer: C4 with 5 harmonics, gain switched on a schedule
  window.__singer = null;
  navigator.mediaDevices.getUserMedia = async () => {
    if (!window.__singer) {
      const ac = new AudioContext(); await ac.resume();
      const osc = ac.createOscillator(); osc.frequency.value = 261.63;
      osc.setPeriodicWave(ac.createPeriodicWave(new Float32Array(6), new Float32Array([0, 1, 0.5, 0.33, 0.25, 0.2])));
      const g = ac.createGain(); g.gain.value = 0; osc.connect(g); osc.start();
      window.__singer = { ac, g };
    }
    const d = __singer.ac.createMediaStreamDestination(); __singer.g.connect(d); return d.stream;
  };
  window.__on = v => { const { ac, g } = __singer; g.gain.cancelScheduledValues(0); g.gain.setValueAtTime(v ? 0.3 : 0, ac.currentTime); };
  // plan: [[songT, on], ...] on the song clock → the singer's clock (both follow the same output device)
  window.__schedule = plan => {
    const { ac, g } = __singer, off = ac.currentTime - audioCtx.currentTime;
    g.gain.cancelScheduledValues(ac.currentTime);
    for (const [t, on] of plan) g.gain.setValueAtTime(on ? 0.3 : 0, Math.max(ac.currentTime, choirStartCtxTime + t + off));
  };
};

async function openPage(b) {
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  await ctx.addInitScript(INIT);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  const resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
  if (!resp || resp.status() >= 400) throw new Error('page answered ' + (resp && resp.status()));
  if (!await page.evaluate(() => { try { return typeof sb !== 'undefined'; } catch { return false; } })) throw new Error('Supabase client missing (CDN script failed to load)');
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  await page.evaluate(() => openAuthModal());
  await page.locator('#authName').fill('Entrance'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  console.log(`   signed up ${email}`);
  await page.evaluate(() => appInitPromise);
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  // open the shared mic (and so the singer) now: a just-created AudioContext's clock isn't steady for its first moments,
  // which would skew the song-clock → singer-clock mapping of the first run
  await page.evaluate(() => initAudio()); await sleep(2000);
  await page.locator('.snb-item[data-shell="songs"]').click(); await sleep(500);
  await page.locator('#panel-songs-hub [data-enter-panel="partrehearsal"]').click(); await sleep(800);
  await page.evaluate(() => {
    document.querySelector('#rehearsalPartRow [data-rh-part="Lead"]').click();
    const claim = claimNearestTarget;
    window.claimNearestTarget = function (targets, results, t, w) { if (timingTrainer.active && targets === timingTrainer.targets) __edges.push(+t.toFixed(3)); return claim.apply(this, arguments); };
  });
  return { ctx, page, errors };
}

// One trainer run. startOn: the singer is already sounding when Start is pressed. plan(tl, clicks): the envelope.
async function run(page, mode, { startOn, plan }) {
  await page.evaluate(m => { document.querySelector(`#ttModeRow [data-tt-mode="${m}"]`).click(); window.__edges = []; }, mode);
  // the mic (and the singer) exist once the shared mic has opened; open it first so "already sounding" is real
  await page.evaluate(() => initAudio()); await sleep(300);
  await page.evaluate(on => __on(on), !!startOn); await sleep(startOn ? 1500 : 300);
  await page.locator('#ttStartBtn').click();
  await page.waitForFunction(() => timingTrainer.active && timingTrainer.clicks.length === 4, null, { timeout: 15000 });
  const info = await page.evaluate(() => { const tl = songTimeline(); return { notes: tl.parts[partRehearsal.part].map(n => [n.start, n.end]), clicks: timingTrainer.clicks.slice(), total: tl.total, songT: audioCtx.currentTime - choirStartCtxTime }; });
  await page.evaluate(p => __schedule(p), plan(info));
  await page.waitForFunction(() => !timingTrainer.active, null, { timeout: (info.total + 15) * 1000, polling: 200 });
  await page.evaluate(() => __on(false)); await sleep(500);
  const r = await page.evaluate(() => ({ edges: __edges.slice(), bleed: timingTrainer.bleedHits, claimed: timingTrainer.results.filter(x => x.claimed).length, n: timingTrainer.results.length,
    warning: document.getElementById('ttResults').textContent.includes('Speaker bleed detected') }));
  return { ...r, ...info, early: r.edges.filter(t => t < 0) };
}
// sing each note: on at its start, off 150 ms before its end
const sing = notes => notes.flatMap(([s, e]) => [[s, true], [e - 0.15, false]]);

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  let ctx, page, errors;
  const errCheck = () => { check('page errors', errors.length === 0, errors.length ? errors[0].slice(0, 120) : 'none'); errors.length = 0; };
  try {
    console.log(`== ${URL_ || 'local deploy/ (production backend)'}\n`);
    ({ ctx, page, errors } = await openPage(b));

    let r;
    if (want('S1')) {
    console.log('-- S1: silent at the start, then every note');
    r = await run(page, 'entrance', { startOn: false, plan: i => sing(i.notes) });
    check(`one entrance per note, all claimed, none early, no bleed (${r.n} notes)`, r.edges.length === r.n && r.claimed === r.n && r.early.length === 0 && r.bleed === 0,
      `edges [${r.edges}], claimed ${r.claimed}/${r.n}, early [${r.early}], bleed ${r.bleed}; first click ${r.clicks[0].toFixed(3)}, first tick ~${r.songT.toFixed(3)}`);
    }

    if (want('S2')) {
    console.log('\n-- S2: already singing at the start, stops 1 s before the downbeat, then every note');
    for (let k = 1; k <= REPEAT; k++) {
      r = await run(page, 'entrance', { startOn: true, plan: i => [[i.songT, true], [-1.0, false], ...sing(i.notes)] });
      check(`run ${k}: no entrance before the downbeat, all ${r.n} claimed, no bleed`, r.early.length === 0 && r.edges.length === r.n && r.claimed === r.n && r.bleed === 0,
        `edges [${r.edges}], claimed ${r.claimed}/${r.n}, bleed ${r.bleed}; first click ${r.clicks[0].toFixed(3)}`);
    }
    }

    if (want('S3')) {
    console.log('\n-- S3: singing without a break, from before the start to the end');
    for (let k = 1; k <= REPEAT; k++) {
      r = await run(page, 'entrance', { startOn: true, plan: i => [[i.songT, true]] });
      check(`run ${k}: no entrances at all, nothing claimed, no bleed`, r.edges.length === 0 && r.claimed === 0 && r.bleed === 0, `edges [${r.edges}], claimed ${r.claimed}, bleed ${r.bleed}`);
    }
    }

    if (want('S4')) {
    console.log('\n-- S4: speaker bleed: a 70 ms burst on each count-in click, then every note');
    r = await run(page, 'entrance', { startOn: false, plan: i => [...i.clicks.flatMap(c => [[c + 0.005, true], [c + 0.075, false]]), ...sing(i.notes)] });
    check('bleed hits ≥ 2 and the warning shown', r.bleed >= 2 && r.warning, `bleed ${r.bleed} of 4 clicks (clicks ${r.clicks.map(c => c.toFixed(3))}; early edges [${r.early}])`);
    check('every note still claimed', r.claimed === r.n, `${r.claimed}/${r.n}`);
    }

    if (want('S5')) {
    console.log('\n-- S5: Cutoff mode, already singing at the start, stops 1 s before the downbeat, then every note');
    r = await run(page, 'cutoff', { startOn: true, plan: i => [[i.songT, true], [-1.0, false], ...sing(i.notes)] });
    check(`no cutoff before the downbeat, all ${r.n} note ends claimed`, r.early.length === 0 && r.claimed === r.n, `cutoffs ${r.edges.length}, early [${r.early}], claimed ${r.claimed}/${r.n}`);
    }
    errCheck();
    await ctx.close(); ctx = null;
  } catch (e) { check('ran to the end', false, e.message.split('\n')[0]); }
  finally {
    try { cleanup(); } finally { await Promise.race([b.close().catch(() => {}), sleep(10000)]); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
