// exp/single-stream B1 and B2 (soft singing, Vocal Load): rtfsoft.js's drive (Pitch Match Listen ×2 → Register Drills,
// 5 notes → Real-Time Feedback, 6 s of 50 ms samples), on five sides, local build against the production backend:
//   out    master, signed out (no Vocal Load: vlSidecar / vlFeed return at once): one stream during Pitch Match
//   in     master, signed in (the sidecar opens the register input next to the shared stream during Pitch Match)
//   C1 C2 C3  the branch with window.__streamMode, signed in (one stream for everything, Vocal Load included)
// Each signed-in side is its own throwaway account (testAccounts.js, deleted at exit). Every Vocal Load session the page
// saves is captured from vlWrite (feature, active seconds, load, median RMS), so a mode's Vocal Load can be put next to
// today's: Pitch Match's (today: the sidecar), Drills' and RTF's (today: their own register frames).
// RTF is sampled every 50 ms for one whole loop of the stimulus (SC_RTF_MS, default 40 s, the length of every gate/
// stimulus): the soft-singing stimuli swing by up to 60 dB within their loop, so a 6 s window (rtfsoft.js) reads a
// different stretch of singing on each side depending on how long the page took to get there (signing in, mostly).
// Over a whole loop every side hears the same singing. Pitch Match and Drills run only to put the page in the state
// rtfsoft.js measured (the shared mic open, the register input opened by Drills); they aren't scored (the stimuli aren't
// on the target). Sides alternate within each rep, so drift reaches all alike. Medians over SC_REPS (default 3).
// Usage: [SC_SIDES=out,in,C1,C2,C3] [SC_REPS=3] [SC_BASE=master] node scripts/audio-verify/sidecar.js [stimuli]
//   stimuli: names in $VOXCOACH_TESTDATA/gate (default rtfsoft's four soft-singing ones)
const { chromium } = require('playwright');
const { TESTDATA } = require('../testdata');
require('../warmup-verify/noWarmup');
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { track } = require('../choir-verify/testAccounts');
const ROOT = path.resolve(__dirname, '../..'), DIR = path.join(TESTDATA, 'gate');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const BASE = process.env.SC_BASE || 'master', REPS = +(process.env.SC_REPS || 3), TARGET = 57, RTF_MS = +(process.env.SC_RTF_MS || 40000);
const SIDES = (process.env.SC_SIDES || 'out,in,C1,C2,C3').split(',');
const STIMS = (process.argv[2] || 'sing-pp-92,sing-pp-646,sing-breathy-5,sing-breathy-3002').split(',');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `sidecar-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const BASE_HTML = path.join(TESTDATA, 'sidecar-base.html');
fs.writeFileSync(BASE_HTML, execFileSync('git', ['show', `${BASE}:deploy/index.html`], { cwd: ROOT, maxBuffer: 1 << 28 }));
const isMode = s => /^C\d$/.test(s);
const ACCT = Object.fromEntries(SIDES.filter(s => s !== 'out').map(s => [s, { email: track(`voxcoach-sscar-${s.toLowerCase()}-${Date.now()}@example.com`), password: 'SS-' + Math.random().toString(36).slice(2) + '!x9', auth: null }]));

async function measure(file, side) {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${file}`] });
  try {
    const a = ACCT[side] || null;
    const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(a && a.auth ? { storageState: a.auth } : {}) });
    if (isMode(side)) await ctx.addInitScript(m => { window.__streamMode = m; }, side);
    await ctx.addInitScript(() => { window.__gum = []; const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices); navigator.mediaDevices.getUserMedia = c => { window.__gum.push(c.audio); return g(c); }; });
    await ctx.route('http://localhost:8765/**', r => {
      const p = new URL(r.request().url()).pathname.slice(1);
      if (!p || p === 'index.html') return r.fulfill({ path: isMode(side) ? path.join(ROOT, 'deploy/index.html') : BASE_HTML, contentType: 'text/html' });
      if (!/^[\w.-]+\.js$/.test(p)) return r.fulfill({ status: 404, body: '' });
      const body = isMode(side) ? fs.readFileSync(path.join(ROOT, 'deploy', p)) : execFileSync('git', ['show', `${BASE}:deploy/${p}`], { cwd: ROOT });
      return r.fulfill({ body, contentType: 'application/javascript' });
    });
    const page = await ctx.newPage(), errors = []; page.on('pageerror', e => errors.push(String(e)));
    await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await sleep(2500);
    await page.evaluate(async () => { // warm up the file-backed fake mic (rtfsoft.js); not counted
      const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now();
      ac.createMediaStreamSource(st).connect(an);
      let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
      st.getTracks().forEach(t => t.stop()); await ac.close(); window.__gum = [];
    });
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(200); }
    if (a) {
      if (!a.auth) {
        await page.evaluate(() => openAuthModal());
        await page.locator('#authName').fill('Single Stream Check');
        await page.locator('#authEmail').fill(a.email); await page.locator('#authPassword').fill(a.password);
        await page.locator('#authCreateBtn').click();
      }
      await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display !== 'flex', null, { timeout: 60000 });
      if (!a.auth) { a.auth = await ctx.storageState(); log(`   signed up ${a.email} (${side})`); }
    }
    await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; requireProFeature = () => true; blockExercise = () => false;
      window.__vl = []; const w = vlWrite; vlWrite = (p, o) => { if (p.ended) window.__vl.push({ feature: window.__feat, active: p.activeSeconds, load: p.load, medianRms: p.medianRms }); return w(p, o); }; });
    const r = await page.evaluate(async ([target, rtfMs]) => {
      const vlDone = async () => { const t0 = performance.now(); while (vlRun && performance.now() - t0 < 6000) await new Promise(r => setTimeout(r, 100)); await new Promise(r => setTimeout(r, 1500)); };
      window.__feat = 'pitch';
      const pm = [];
      for (let k = 0; k < 2; k++) {
        setExerciseLevel('intermediate'); pitchTargetMidi = target;
        const btn = document.getElementById('pitchListenBtn'); btn.click();
        await new Promise(r => setTimeout(r, 100));
        const t0 = performance.now(); while (btn.disabled && performance.now() - t0 < 8000) await new Promise(r => setTimeout(r, 50));
        { const m = ((document.getElementById('pitchResult') || {}).textContent || '').match(/confidence — (\d+)%/i); pm.push(m ? +m[1] : null); }
      }
      const gumAfterPm = window.__gum.length;
      if (typeof vlEnd === 'function') vlEnd(); await vlDone();
      window.__feat = 'drills';
      const rnd = Math.random; Math.random = () => 0;
      if (typeof pickNote === 'function') { window.__pick = window.__pick || pickNote; pickNote = (k, lo, hi) => k === 'drill' ? lo : __pick(k, lo, hi); }
      lowNote = freqToNote(noteToFreq(target)); highNote = freqToNote(noteToFreq(target + 24)); drillMode = 'chest';
      document.getElementById('drillStartBtn').click();
      let t1 = performance.now(); while (!(drillResults.length === DRILL_NOTE_COUNT && !drillActive) && performance.now() - t1 < 40000) await new Promise(r => setTimeout(r, 100));
      Math.random = rnd; if (window.__pick) pickNote = __pick;
      const drills = drillResults.map(d => d.pitchAcc ?? null);
      if (typeof vlEnd === 'function') vlEnd(); await vlDone();
      window.__feat = 'rtf';
      document.getElementById('liveFeedbackStartBtn').click();
      await new Promise(r => setTimeout(r, 1000));
      const s = [], t0 = performance.now();
      while (performance.now() - t0 < rtfMs) { s.push(document.getElementById('lfPitchIcon').dataset.state); await new Promise(r => setTimeout(r, 50)); }
      document.getElementById('liveFeedbackStartBtn').click();
      if (typeof vlEnd === 'function') vlEnd(); await vlDone();
      const v = s.filter(x => x !== 'neutral');
      return { rtfHeard: Math.round(100 * v.length / s.length), rtfInTune: Math.round(100 * v.filter(x => x === 'good').length / s.length), pm, drills, gumAfterPm, gum: window.__gum.length, vl: window.__vl, mode: typeof ssMode === 'function' ? ssMode() : null };
    }, [TARGET, RTF_MS]);
    return { ...r, errors };
  } finally { await b.close().catch(() => {}); }
}

const med = a => { const v = a.filter(x => x != null && !Number.isNaN(x)).sort((x, y) => x - y); return v.length ? v[v.length >> 1] : null; };
const sum = a => a.reduce((x, y) => x + y, 0);
(async () => {
  const srv = require('child_process').spawn('python3', ['-m', 'http.server', '8765'], { cwd: path.join(ROOT, 'deploy'), stdio: 'ignore' });
  await sleep(1200);
  log(`sidecar ${stamp}  today: ${BASE}  modes: the working tree (${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim()} + uncommitted)  sides ${SIDES.join(',')}  reps ${REPS}`);
  const rows = [];
  try {
    for (let rep = 1; rep <= REPS; rep++) for (const id of STIMS) {
      const file = path.join(DIR, id + '.wav'); if (!fs.existsSync(file)) throw new Error('missing stimulus ' + file);
      for (const side of SIDES) {
        let res;
        for (let attempt = 1; ; attempt++) {
          try { res = await measure(file, side); break; }
          catch (e) { log(`   ${side} attempt ${attempt} failed: ${e.message.split('\n')[0]}`); if (attempt >= 3) throw e; }
        }
        rows.push({ rep, id, side, ...res }); fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
        const vl = f => res.vl.filter(x => x.feature === f);
        log(`rep ${rep} ${id.padEnd(17)} ${side.padEnd(3)} RTF heard ${String(res.rtfHeard).padStart(3)}% in tune ${String(res.rtfInTune).padStart(3)}% | streams ${res.gumAfterPm} during PM, ${res.gum} total | VL ${['pitch', 'drills', 'rtf'].map(f => `${f} ${vl(f).length ? sum(vl(f).map(x => x.active)).toFixed(1) + 's ' + sum(vl(f).map(x => x.load)).toFixed(1) : '—'}`).join(', ')}${res.errors.length ? ' | ERRORS ' + res.errors.join(' | ') : ''}`);
      }
    }
  } catch (e) { log('ERROR ' + (e.stack || e)); process.exitCode = 2; }
  finally { srv.kill(); }
  log('\n== medians per stimulus and side');
  log(`${'stimulus'.padEnd(17)} ${'side'.padEnd(4)} ${'RTF heard'.padStart(9)} ${'in tune'.padStart(7)}  | VL active s / load: Pitch Match, Drills, RTF`);
  for (const id of STIMS) for (const side of SIDES) {
    const R = rows.filter(r => r.id === id && r.side === side); if (!R.length) continue;
    const vls = f => R.map(r => r.vl.filter(x => x.feature === f)).map(l => l.length ? [sum(l.map(x => x.active)), sum(l.map(x => x.load))] : null);
    const vm = f => { const l = vls(f).filter(Boolean); return l.length ? `${med(l.map(x => x[0])).toFixed(1)}/${med(l.map(x => x[1])).toFixed(1)}` : '—'; };
    log(`${id.padEnd(17)} ${side.padEnd(4)} ${String(med(R.map(r => r.rtfHeard))).padStart(8)}% ${String(med(R.map(r => r.rtfInTune))).padStart(6)}%  | ${vm('pitch')}, ${vm('drills')}, ${vm('rtf')}   [RTF heard ${R.map(r => r.rtfHeard).join('/')}]`);
  }
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
})();
