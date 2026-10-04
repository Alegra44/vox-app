// Soft singing through Real-Time Feedback under production conditions: does the singing-detection gate cost soft singers
// RTF frames when the page is signed in (Vocal Load sidecar and vlFeed running) as it is on production?
// Three sides, each signed in as its own throwaway account (testAccounts.js, deleted at exit):
//   before  deploy/index.html at RS_BEFORE (default b37cd57, no gate), served locally
//   after   the working tree (with the gate), served locally
//   prod    RS_URL (default https://deploy-alegra1122.vercel.app)
// The page is driven exactly as noisegate.js drives it up to RTF (Pitch Match Listen ×2 → Register Drills → RTF), so the
// shared mic and the register input are in the same state; only RTF is measured (6 s, % of 50 ms samples voiced / in tune).
// Usage: [RS_REPS=3] [RS_PACE_MS=45000] node scripts/vq-verify/rtfsoft.js [stimuli, comma-separated]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track } = require('../choir-verify/testAccounts');
const ROOT = path.resolve(__dirname, '../..'), DIR = path.join(os.tmpdir(), 'vq-verify', 'gate');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const PROD = process.env.RS_URL || 'https://deploy-alegra1122.vercel.app', BEFORE_REF = process.env.RS_BEFORE || 'b37cd57';
const REPS = +(process.env.RS_REPS || 3), PACE = +(process.env.RS_PACE_MS ?? 45000), TARGET = 57;
const STIMS = (process.argv[2] || 'sing-pp-92,sing-pp-646,sing-breathy-5,sing-breathy-3002').split(',');
const SIDES = ['before', 'after', 'prod'];
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `rtfsoft-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BEFORE = path.join(os.tmpdir(), 'vq-verify', 'rtfsoft-before.html');
fs.writeFileSync(BEFORE, execFileSync('git', ['show', `${BEFORE_REF}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const HTML = { before: BEFORE, after: path.join(ROOT, 'deploy/index.html') };
const ACCT = Object.fromEntries(SIDES.map(s => [s, { email: track(`voxcoach-rtfsoft-${s}-${Date.now()}@example.com`), password: 'RS-' + Math.random().toString(36).slice(2) + '!x9', auth: null }]));
let lastProd = 0;

async function measure(file, side) {
  if (side === 'prod') { const w = lastProd + PACE - Date.now(); if (w > 0) await sleep(w); lastProd = Date.now(); }
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const a = ACCT[side];
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(a.auth ? { storageState: a.auth } : {}) });
    if (side !== 'prod') await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: HTML[side], contentType: 'text/html' });
      if (!/^[\w.-]+\.js$/.test(p)) return r.fulfill({ status: 404, body: '' });
      const body = side === 'before' ? execFileSync('git', ['show', `${BEFORE_REF}:deploy/${p}`], { cwd: ROOT }) : fs.readFileSync(path.join(ROOT, 'deploy', p));
      return r.fulfill({ body, contentType: 'application/javascript' });
    });
    const page = await ctx.newPage();
    const t0 = Date.now();
    await page.goto(side === 'prod' ? PROD : 'http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    await page.evaluate(async () => { // warm up the file-backed fake mic, as noisegate.js does
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close();
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    if (!a.auth) {
      await page.evaluate(() => openAuthModal());
      await page.locator('#authName').fill('RTF Soft Check');
      await page.locator('#authEmail').fill(a.email); await page.locator('#authPassword').fill(a.password);
      await page.locator('#authCreateBtn').click();
    }
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display !== 'flex', null, { timeout: 60000 });
    const ready = Date.now() - t0;
    if (!a.auth) { a.auth = await ctx.storageState(); log(`   signed up ${a.email} (${side})`); }
    const st = await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none';
      return { paid: isPaid(), gate: typeof VOICE_MIN_CLARITY === 'number', sidecarBlocked: VL_SIDECAR_BLOCKED }; });
    if (!st.paid) throw new Error(`${side}: account can't use the features`);
    return await page.evaluate(async target => {
      for (let k = 0; k < 2; k++) { // Pitch Match Listen ×2 (its vlSidecar runs while signed in)
        setExerciseLevel('intermediate'); pitchTargetMidi = target;
        const btn = document.getElementById('pitchListenBtn'); btn.click();
        await new Promise(r => setTimeout(r, 100));
        const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
      }
      const rnd = Math.random; Math.random = () => 0; // Register Drills, 5 notes (register input + vlFeed)
      if (typeof pickNote === 'function') { window.__pick = window.__pick || pickNote; pickNote = (k, lo, hi) => k === 'drill' ? lo : __pick(k, lo, hi); } // every drill note on the sung one (the picker never repeats a note)
      lowNote = freqToNote(noteToFreq(target)); highNote = freqToNote(noteToFreq(target + 24)); drillMode = 'chest';
      document.getElementById('drillStartBtn').click();
      let t1 = performance.now(); while (!(drillResults.length === DRILL_NOTE_COUNT && !drillActive) && performance.now() - t1 < 40000) await new Promise(r => setTimeout(r, 100));
      Math.random = rnd; if (window.__pick) pickNote = __pick;
      const regOpen = !!regIn, vlOn = typeof vlRun !== 'undefined';
      document.getElementById('liveFeedbackStartBtn').click(); // RTF, sampled as noisegate.js samples it
      await new Promise(r => setTimeout(r, 1000));
      const s = [], t0 = performance.now();
      while (performance.now() - t0 < 6000) { s.push(document.getElementById('lfPitchIcon').dataset.state); await new Promise(r => setTimeout(r, 50)); }
      const vlFed = typeof vlRun !== 'undefined' && !!vlRun;
      document.getElementById('liveFeedbackStartBtn').click();
      const v = s.filter(x => x !== 'neutral');
      return { voiced: Math.round(100 * v.length / s.length), inTune: Math.round(100 * v.filter(x => x === 'good').length / s.length), n: s.length, regOpenAtStart: regOpen, vlFedDuringRtf: vlFed };
    }, TARGET).then(r => ({ ...r, ...st, readyMs: ready }));
  } finally { await b.close().catch(() => {}); }
}

(async () => {
  log(`rtfsoft ${stamp}  before: ${BEFORE_REF}  after: working tree (${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim()})  prod: ${PROD}  reps ${REPS}`);
  const rows = [];
  try {
    for (let rep = 1; rep <= REPS; rep++) for (const id of STIMS) {
      const file = path.join(DIR, id + '.wav'); if (!fs.existsSync(file)) throw new Error('missing stimulus ' + file);
      const res = {};
      for (const side of SIDES) {
        for (let attempt = 1; ; attempt++) {
          try { res[side] = await measure(file, side); break; }
          catch (e) { log(`   ${side} attempt ${attempt} failed: ${e.message.split('\n')[0]}`); if (attempt >= 3) throw e; }
        }
      }
      rows.push({ rep, id, res }); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
      log(`rep ${rep} ${id.padEnd(18)} ` + SIDES.map(s => `${s} heard ${res[s].voiced}% in tune ${res[s].inTune}% (n ${res[s].n}, reg open ${res[s].regOpenAtStart}, vl fed ${res[s].vlFedDuringRtf}, ready ${res[s].readyMs} ms)`).join(' | '));
    }
  } catch (e) { log('ERROR ' + (e.stack || e)); process.exitCode = 2; }
  const avg = a => a.length ? (a.reduce((x, y) => x + y, 0) / a.length) : NaN;
  log('\n== RTF heard (% of frames), mean [runs] per side; gate effect = after − before');
  for (const id of STIMS) {
    const v = s => rows.filter(r => r.id === id).map(r => r.res[s].voiced);
    log(`${id.padEnd(18)} before ${avg(v('before')).toFixed(1)} [${v('before')}]  after ${avg(v('after')).toFixed(1)} [${v('after')}]  prod ${avg(v('prod')).toFixed(1)} [${v('prod')}]  gate effect ${(avg(v('after')) - avg(v('before'))).toFixed(1)}`);
  }
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
})();
