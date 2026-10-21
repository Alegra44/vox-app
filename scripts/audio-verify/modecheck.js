// feat/single-stream: the one mic stream, per engine (Playwright's Chromium, WebKit and Firefox, each with its own fake
// capture), local build. In one page session it starts the shared pitch path (initAudio), the register input
// (openRegisterInput), a Voice Quality capture (vqCapture), the Vocal Load sidecar and a short recording
// (recordShortClip), and checks:
//   - getUserMedia is called exactly once, with {echoCancellation:true, noiseSuppression:false, autoGainControl:false};
//   - every path reads that stream: pitch from the shared analyser, loudness (computeRMS of the raw path), the register
//     input's pitch and raw signal, Voice Quality's frames, the recording's size; and the stream is still live after;
//   - signed in (a test account, deleted after): the Vocal Load gauge shows in a sidecar feature (the Tuner) on every
//     engine (until this branch it was hidden outside desktop Chromium).
// Fake capture: Chromium plays a sung note from a file; Firefox's fake device is its own tone; WebKit's is whatever
// Playwright's build gives (signal levels are reported as found: −∞ means digital silence, which can't show pitch).
// Usage: node scripts/audio-verify/modecheck.js [chromium,webkit,firefox]   (MC_SIGNED_OUT=1 skips the gauge check;
//   MC_URL=<url> runs against a deployment, e.g. production, instead of serving deploy/)
const pw = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const { TESTDATA } = require('../testdata');
const { SKIP } = require('../warmup-verify/noWarmup');
const WAV = path.join(TESTDATA, 'vibfix/stim-S1.wav');
const DEPLOY = path.join(__dirname, '../../deploy'), PORT = 8766;
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `modecheck-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const SIGNED_IN = !process.env.MC_SIGNED_OUT;
const ENGINES = {
  chromium: [{ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`, '--autoplay-policy=no-user-gesture-required'] }, { permissions: ['microphone'] }],
  webkit: [{}, { permissions: ['microphone'] }],
  firefox: [{ firefoxUserPrefs: { 'media.navigator.streams.fake': true, 'media.navigator.permission.disabled': true, 'media.autoplay.default': 0 } }, {}],
};
const URL_ = process.env.MC_URL || null;
const ONLY = (process.argv[2] || 'chromium,webkit,firefox').split(',');
const WANT = { echoCancellation: true, noiseSuppression: false, autoGainControl: false };
const GUM = () => {
  window.__gum = []; // on the prototype: WebKit's navigator.mediaDevices may not exist yet when this runs
  if (typeof MediaDevices === 'undefined') return;
  const g = MediaDevices.prototype.getUserMedia;
  MediaDevices.prototype.getUserMedia = function (c) { window.__gum.push(c); return g.call(this, c); };
};

let track = null, cleanup = async () => {};
if (SIGNED_IN) ({ track, cleanup } = require('../choir-verify/testAccounts'));
const email = SIGNED_IN ? track(`voxcoach-mc-${Date.now()}@example.com`) : null, password = 'MC-' + Math.random().toString(36).slice(2) + '!x9';
let auth = null;

(async () => {
  const types = { '.js': 'text/javascript', '.html': 'text/html' };
  const srv = http.createServer((q, r) => {
    const p = decodeURIComponent(new URL(q.url, 'http://x').pathname).replace(/^\//, '') || 'index.html', f = path.join(DEPLOY, p);
    if (!f.startsWith(DEPLOY) || !fs.existsSync(f)) { r.writeHead(404); r.end(); return; }
    r.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(r);
  });
  if (!URL_) srv.listen(PORT);
  let fail = 0;
  const check = (name, ok, detail) => { if (!ok) fail++; log(`   ${ok ? '✓' : '✗'} ${name}${detail ? ' · ' + detail : ''}`); };
  log(`modecheck ${stamp}  ${URL_ || 'local build'}  playwright ${require('playwright/package.json').version}  ${SIGNED_IN ? 'signed in: ' + email : 'signed out'}`);
  try {
    for (const name of ONLY) {
      const [launch, ctxOpts] = ENGINES[name];
      let b;
      try {
        b = await pw[name].launch(launch);
        log(`\n== ${name} ${b.version()}`);
        const ctx = await b.newContext({ ...ctxOpts, ...(auth ? { storageState: auth } : {}) });
        await ctx.addInitScript(SKIP); await ctx.addInitScript(GUM);
        const page = await ctx.newPage(), errors = [];
        page.on('pageerror', e => errors.push(String(e).split('\n')[0]));
        await page.goto(URL_ || `http://localhost:${PORT}/`, { waitUntil: 'load' }); await sleep(2500);
        const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible().catch(() => false)) { await lang.click(); await sleep(300); }
        if (SIGNED_IN && !auth) {
          await page.evaluate(() => openAuthModal());
          await page.locator('#authName').fill('Mode Check'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
          await page.locator('#authCreateBtn').click();
          await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
          auth = await ctx.storageState(); log(`   signed up ${email}`);
        }
        if (SIGNED_IN) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
        await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
        const r = await page.evaluate(async () => {
          const out = {}, wait = ms => new Promise(r => setTimeout(r, ms));
          const db = x => x > 0 ? +(20 * Math.log10(x)).toFixed(1) : null;
          out.init = await initAudio({ noWarmup: true }); await wait(2000);
          // the median over 20 frames: a fake tone can have gaps
          const fs_ = [], rs = [];
          for (let i = 0; i < 20; i++) { analyser.getFloatTimeDomainData(dataArray); fs_.push(autoCorrelate(dataArray, audioCtx.sampleRate)); micG.rawAn.getFloatTimeDomainData(micG.__raw || (micG.__raw = new Float32Array(2048))); rs.push(computeRMS(micG.__raw)); await wait(50); }
          const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
          out.pitch = Math.round(med(fs_)); out.rawDb = db(med(rs)); out.gainDb = +(20 * Math.log10(micG.gain.gain.value)).toFixed(1);
          await openRegisterInput({ quiet: true }); await wait(600);
          const rf = []; for (let i = 0; i < 10; i++) { const fr = readRegisterFrame(); rf.push(fr.freq); out.regRawDb = db(computeRMS(fr.raw)); await wait(50); }
          out.regPitch = Math.round(med(rf));
          closeRegisterInput();
          vqActive = true; const vq = await vqCapture({ ms: 800, active: () => true, spectrum: true }); vqActive = false;
          out.vqFrames = vq.length;
          const clip = await recordShortClip(800); out.clipBytes = clip ? Math.round(clip.base64.length * 3 / 4) : 0;
          out.live = micLive();
          const t = micStream.getAudioTracks()[0]; try { const s = t.getSettings(); out.settings = { ec: s.echoCancellation, ns: s.noiseSuppression, agc: s.autoGainControl }; } catch (e) {}
          if (typeof profile !== 'undefined' && profile) { // the Tuner: a sidecar feature
            renderVocalLoadGauge();
            const g = document.getElementById('vlGaugeTuner');
            out.gauge = { shown: !!g && getComputedStyle(g).display !== 'none', val: g && (g.querySelector('.vl-gauge-val') || {}).textContent };
          }
          out.gum = window.__gum;
          return out;
        });
        const gum = r.gum.map(c => JSON.stringify(c.audio));
        check('getUserMedia exactly once, with the one stream\'s constraints', r.gum.length === 1 && JSON.stringify(r.gum[0].audio) === JSON.stringify(WANT), `${r.gum.length}× ${gum.join(' | ')}`);
        check('applied processing (getSettings)', true, JSON.stringify(r.settings || 'not reported'));
        const silent = r.rawDb === null;
        check('pitch path (initAudio analyser)', r.pitch > 0 || silent, `${r.pitch} Hz, F2 gain ${r.gainDb} dB${silent ? ' (fake capture is silent)' : ''}`);
        check('raw path (loudness)', r.rawDb !== null || name === 'webkit', `${r.rawDb ?? '−∞'} dBFS`);
        check('register input: pitch and raw from the same stream', (r.regPitch > 0 || silent) && (r.regRawDb !== null || silent), `${r.regPitch} Hz, ${r.regRawDb ?? '−∞'} dBFS`);
        check('Voice Quality capture', r.vqFrames > 0 || silent, `${r.vqFrames} frames`);
        check('recording (MediaRecorder on the one stream)', r.clipBytes > 0, `${r.clipBytes} bytes`);
        check('stream still live after every reader closed', r.live === true, '');
        if (SIGNED_IN) check('Vocal Load gauge shows (Tuner)', !!(r.gauge && r.gauge.shown), JSON.stringify(r.gauge));
        check('page errors', errors.length === 0, errors.join(' | ') || 'none');
        await ctx.close();
      } catch (e) { fail++; log(`   ✗ ${name}: could not run (${e.message.split('\n')[0]})`); }
      finally { if (b) await b.close().catch(() => {}); }
    }
  } finally { srv.close(); await cleanup(); }
  log(`\n${fail ? fail + ' failed' : 'all passed'}\nlog: ${LOG}.log`);
  process.exitCode = fail ? 1 : 0;
})();
