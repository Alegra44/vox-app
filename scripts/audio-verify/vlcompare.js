// exp/single-stream B2 (Vocal Load): each mode's Vocal Load per session against today's (master, signed in: the sidecar
// for shared-mic features, own frames for the register features and Voice Quality). Every saved session is captured
// from vlWrite (active seconds, load, median RMS).
//   1. The batch harness's stimulus (harness.js: C4 with a harmonic roll-off, 60 s, steady): Tuner 6 s, Breath 6 s,
//      Stay in Key 6 s (backing pad playing), Pitch Match ×1, Register Drills 5 notes, Real-Time Feedback 6 s, Voice
//      Quality 4 s. A steady tone reads the same wherever the loop is, so short sessions compare exactly.
//   2. Real singing (gate/ stimuli, 40 s loops that swing in level): the Tuner for one whole loop (40 s), so every side
//      hears the same singing: the sidecar today, the one stream in a mode.
// Sides: in (master, signed in), C1, C2, C3 (the branch's window.__streamMode), each its own throwaway account
// (deleted at exit). VC_REPS rounds (default 3), sides alternating. Medians.
// Usage: [VC_SIDES=in,C1,C2,C3] [VC_REPS=3] [VC_REAL=sing-pp-646,sing-breathy-3002] node scripts/audio-verify/vlcompare.js
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata');
require('../warmup-verify/noWarmup');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { track } = require('../choir-verify/testAccounts');
const ROOT = path.resolve(__dirname, '../..');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const SIDES = (process.env.VC_SIDES || 'in,C1,C2,C3').split(','), REPS = +(process.env.VC_REPS || 3), BASE = process.env.VC_BASE || 'master';
const REAL = (process.env.VC_REAL || 'sing-pp-646,sing-breathy-3002').split(',').filter(Boolean);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `vlcompare-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const TONE = path.join(TESTDATA, 'vlh-c4.wav');
execFileSync('python', [path.join(ROOT, 'scripts/vq-verify/gen.py'), TONE, JSON.stringify({ f0: 261.6255653, harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
const BASE_HTML = path.join(TESTDATA, 'vlcompare-base.html');
fs.writeFileSync(BASE_HTML, execFileSync('git', ['show', `${BASE}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const isMode = s => /^C\d$/.test(s);
const ACCT = Object.fromEntries(SIDES.map(s => [s, { email: track(`voxcoach-ssvl-${s.toLowerCase()}-${Date.now()}@example.com`), password: 'SV-' + Math.random().toString(36).slice(2) + '!x9', auth: null }]));

async function run(file, side, plan) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const a = ACCT[side];
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(a.auth ? { storageState: a.auth } : {}) });
    if (isMode(side)) await ctx.addInitScript(m => { window.__streamMode = m; }, side);
    await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: isMode(side) ? path.join(ROOT, 'deploy/index.html') : BASE_HTML, contentType: 'text/html' });
      if (!/^[\w.-]+\.js$/.test(p)) return r.fulfill({ status: 404, body: '' });
      const body = isMode(side) ? fs.readFileSync(path.join(ROOT, 'deploy', p)) : execFileSync('git', ['show', `${BASE}:deploy/${p}`], { cwd: ROOT });
      return r.fulfill({ body, contentType: 'application/javascript' });
    });
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    await page.evaluate(async () => {
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close();
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    if (!a.auth) {
      await page.evaluate(() => openAuthModal());
      await page.locator('#authName').fill('Single Stream VL');
      await page.locator('#authEmail').fill(a.email); await page.locator('#authPassword').fill(a.password);
      await page.locator('#authCreateBtn').click();
    }
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display !== 'flex', null, { timeout: 60000 });
    if (!a.auth) { a.auth = await ctx.storageState(); log(`   signed up ${a.email} (${side})`); }
    await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; requireProFeature = () => true; blockExercise = () => false;
      window.__vl = []; const w = vlWrite; vlWrite = (p, o) => { if (p.ended) window.__vl.push({ feature: window.__feat, active: p.activeSeconds, load: p.load, medianRms: p.medianRms }); return w(p, o); }; });
    const r = await page.evaluate(async ([plan, target]) => {
      const wait = ms => new Promise(r => setTimeout(r, ms));
      const done = async () => { if (typeof vlEnd === 'function') vlEnd(); const t0 = performance.now(); while (vlRun && performance.now() - t0 < 6000) await wait(100); await wait(1500); };
      const toggle = async (btnId, ms) => { document.getElementById(btnId).click(); await wait(ms); document.getElementById(btnId).click(); };
      const F = {
        tuner: ms => toggle('micBtn', ms),
        breath: ms => toggle('breathStartBtn', ms),
        stayKey: ms => toggle('stayKeyStartBtn', ms),
        pitch: async () => { setExerciseLevel('intermediate'); pitchTargetMidi = target; const btn = document.getElementById('pitchListenBtn'); btn.click(); await wait(100); const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await wait(50); },
        drills: async () => { const rnd = Math.random; Math.random = () => 0; if (typeof pickNote === 'function') { window.__pick = window.__pick || pickNote; pickNote = (k, lo, hi) => k === 'drill' ? lo : __pick(k, lo, hi); }
          lowNote = freqToNote(noteToFreq(target)); highNote = freqToNote(noteToFreq(target + 24)); drillMode = 'chest'; document.getElementById('drillStartBtn').click();
          const t1 = performance.now(); while (!(drillResults.length === DRILL_NOTE_COUNT && !drillActive) && performance.now() - t1 < 40000) await wait(100); Math.random = rnd; if (window.__pick) pickNote = __pick; },
        rtf: ms => toggle('liveFeedbackStartBtn', ms),
        vq: async () => { document.getElementById('vqStartBtn').click(); await wait(300); const t0 = performance.now(); while (vqActive && performance.now() - t0 < 8000) await wait(100); },
      };
      for (const [k, ms] of plan) { window.__feat = k; await F[k](ms); await done(); }
      return window.__vl;
    }, [plan, 60]);
    return { vl: r, errors };
  } finally { await b.close().catch(() => {}); }
}

const med = a => { const v = a.filter(x => x != null).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
const sum = a => a.reduce((x, y) => x + y, 0);
(async () => {
  const srv = require('child_process').spawn('python3', ['-m', 'http.server', '8765'], { cwd: path.join(ROOT, 'deploy'), stdio: 'ignore' });
  await sleep(1200);
  log(`vlcompare ${stamp}  today: ${BASE} signed in  modes: the working tree  sides ${SIDES.join(',')}  reps ${REPS}`);
  const STIM = [['harness C4', TONE, [['tuner', 6000], ['breath', 6000], ['stayKey', 6000], ['pitch'], ['drills'], ['rtf', 6000], ['vq']]],
    ...REAL.map(id => [id, path.join(TESTDATA, 'gate', id + '.wav'), [['tuner', 40000]]])];
  const rows = [];
  try {
    for (let rep = 1; rep <= REPS; rep++) for (const [name, file, plan] of STIM) for (const side of SIDES) {
      let res;
      for (let attempt = 1; ; attempt++) { try { res = await run(file, side, plan); break; } catch (e) { log(`   ${side} attempt ${attempt} failed: ${e.message.split('\n')[0]}`); if (attempt >= 3) throw e; } }
      const per = Object.fromEntries(plan.map(([k]) => { const l = res.vl.filter(x => x.feature === k); return [k, l.length ? { active: +sum(l.map(x => x.active)).toFixed(2), load: +sum(l.map(x => x.load)).toFixed(2), rms: med(l.map(x => x.medianRms)), n: l.length } : null]; }));
      rows.push({ rep, stim: name, side, per, errors: res.errors }); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
      log(`rep ${rep} ${name.padEnd(17)} ${side.padEnd(3)} ` + plan.map(([k]) => `${k} ${per[k] ? `${per[k].active}s ${per[k].load} (rms ${per[k].rms != null ? (+per[k].rms).toFixed(4) : '—'}${per[k].n > 1 ? ', ' + per[k].n + ' sessions' : ''})` : '—'}`).join(' · ') + (res.errors.length ? ' · ERRORS ' + res.errors.join(' | ') : ''));
    }
  } catch (e) { log('ERROR ' + (e.stack || e)); process.exitCode = 2; }
  finally { srv.kill(); }
  log('\n== median active seconds / load per session; each mode against today ("in")');
  for (const [name, , plan] of STIM) for (const [k] of plan) {
    const v = side => { const R = rows.filter(r => r.stim === name && r.side === side && r.per[k]); return R.length ? [med(R.map(r => r.per[k].active)), med(R.map(r => r.per[k].load))] : null; };
    const t = v('in');
    log(`${name.padEnd(17)} ${k.padEnd(8)} ` + SIDES.map(s => { const x = v(s); return `${s} ${x ? `${x[0]}s/${x[1]}` : '—'}${x && t && s !== 'in' ? ` (${x[1] >= t[1] ? '+' : ''}${(100 * (x[1] - t[1]) / (t[1] || 1)).toFixed(0)}%)` : ''}`; }).join(' · '));
  }
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
})();
