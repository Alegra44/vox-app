// exp/single-stream B3: what a second getUserMedia capture does to the first, per engine (Playwright's Chromium, WebKit
// and Firefox on this Mac, each with its own fake capture). A static page (no app) opens stream 1 with the shared
// mic's constraints (EC + NS on), measures it, opens stream 2 with the register input's (EC on, NS and AGC off), and
// measures both; then stops stream 2 and measures stream 1 again. Per stream: track.muted, readyState, enabled, the
// mute/ended events seen, RMS over 1.5 s (−∞ dBFS = digital silence) and the processing the engine actually applied
// (getSettings: echoCancellation, noiseSuppression, autoGainControl). Three passes: shared then register (today's
// order when a shared-mic feature ran first: the sidecar, or Register Coach after the Tuner), the same constraints
// twice, and register then shared (Real-Time Feedback first, then a shared-mic feature).
// Fake capture: Chromium --use-fake-device-for-media-stream with a file (a sung note, so RMS is meaningful); Firefox
// media.navigator.streams.fake (its own fake tone); WebKit whatever Playwright's build gives (recorded as found).
// The fake devices don't model a real phone's audio session, so this answers "does the engine itself mute or starve the
// first capture"; the phone answer comes from micdiag.html on the user's devices.
// Usage: node scripts/audio-verify/browsers.js
const pw = require('playwright');
const path = require('path'), fs = require('fs'), http = require('http');
const { TESTDATA } = require('../testdata');
const WAV = path.join(TESTDATA, 'vibfix/stim-S1.wav');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `browsers-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };

const PAGE = `<!doctype html><meta charset="utf-8"><title>two captures</title><script>
const SHARED = {echoCancellation:true, noiseSuppression:true};
const REGISTER = {echoCancellation:true, noiseSuppression:false, autoGainControl:false};
async function meter(ac, st, ms){
  const an = ac.createAnalyser(); an.fftSize = 2048; const src = ac.createMediaStreamSource(st); src.connect(an);
  const buf = new Float32Array(2048); let sum = 0, n = 0, peak = 0; const t0 = performance.now();
  while(performance.now()-t0 < ms){ await new Promise(r=>setTimeout(r, 40)); an.getFloatTimeDomainData(buf); let s=0; for(const v of buf){ s+=v*v; peak=Math.max(peak,Math.abs(v)); } sum += s/buf.length; n++; }
  src.disconnect(); const rms = Math.sqrt(sum/Math.max(1,n));
  return {dbfs: rms>0 ? +(20*Math.log10(rms)).toFixed(1) : null, peak:+peak.toFixed(4)};
}
function track(st, ev){ const t = st.getAudioTracks()[0]; return {muted:t.muted, readyState:t.readyState, enabled:t.enabled, events:ev.slice(), label:t.label.slice(0,40), settings:(()=>{ try{ const s=t.getSettings(); return {ec:s.echoCancellation, ns:s.noiseSuppression, agc:s.autoGainControl}; }catch(e){ return null; } })()}; }
function watch(st){ const ev=[]; const t=st.getAudioTracks()[0]; ['mute','unmute','ended'].forEach(k=>t.addEventListener(k,()=>ev.push(k))); return ev; }
window.run = async (second)=>{
  const FIRST = second==='reverse' ? REGISTER : SHARED, SECOND = second==='reverse' ? SHARED : second==='same' ? SHARED : REGISTER;
  const out = {}; const ac = new (window.AudioContext||window.webkitAudioContext)(); try{ await ac.resume(); }catch(e){}
  try{
    const s1 = await navigator.mediaDevices.getUserMedia({audio:FIRST}); const e1 = watch(s1);
    await new Promise(r=>setTimeout(r, 1500)); // fake devices start late
    out.alone = {s1:{...track(s1,e1), ...(await meter(ac, s1, 1500))}};
    let s2;
    try{ s2 = await navigator.mediaDevices.getUserMedia({audio: SECOND}); }
    catch(e){ out.second = {error:String(e)}; return out; }
    const e2 = watch(s2);
    await new Promise(r=>setTimeout(r, 500));
    const [m1, m2] = await Promise.all([meter(ac, s1, 1500), meter(ac, s2, 1500)]);
    out.both = {s1:{...track(s1,e1), ...m1}, s2:{...track(s2,e2), ...m2}};
    s2.getTracks().forEach(t=>t.stop()); await new Promise(r=>setTimeout(r, 500));
    out.after = {s1:{...track(s1,e1), ...(await meter(ac, s1, 1500))}};
    s1.getTracks().forEach(t=>t.stop());
  }catch(e){ out.error = String(e); }
  return out;
};
</script>`;

(async () => {
  const srv = http.createServer((q, r) => { r.writeHead(200, { 'content-type': 'text/html' }); r.end(PAGE); }).listen(8767);
  const engines = [
    ['chromium', { args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${WAV}`, '--autoplay-policy=no-user-gesture-required'] }, { permissions: ['microphone'] }],
    ['webkit', {}, { permissions: ['microphone'] }],
    ['firefox', { firefoxUserPrefs: { 'media.navigator.streams.fake': true, 'media.navigator.permission.disabled': true, 'media.autoplay.default': 0 } }, {}],
  ];
  const rows = [];
  log(`browsers ${stamp}  playwright ${require('playwright/package.json').version}`);
  for (const [name, launch, ctxOpts] of engines) {
    let b;
    try {
      b = await pw[name].launch(launch);
      log(`\n== ${name} ${b.version()}`);
      let ctx; try { ctx = await b.newContext(ctxOpts); } catch (e) { log(`   context with ${JSON.stringify(ctxOpts)} refused (${e.message.split('\n')[0]}): plain context`); ctx = await b.newContext(); }
      const page = await ctx.newPage(); await page.goto('http://localhost:8767/');
      for (const second of ['register', 'same', 'reverse']) {
        const r = await page.evaluate(s => window.run(s), second).catch(e => ({ error: e.message.split('\n')[0] }));
        rows.push({ engine: name, version: b.version(), second, r });
        const f = x => x ? `muted ${x.muted} ${x.readyState} ${x.dbfs ?? '−∞'} dBFS${x.events && x.events.length ? ' events ' + x.events.join(',') : ''}${x.settings ? ` (ec ${x.settings.ec} ns ${x.settings.ns} agc ${x.settings.agc})` : ''}` : '—';
        if (r.error && !r.alone) { log(`   second = ${second}: ERROR ${r.error}`); continue; }
        log(`   ${{ register: 'shared, then register', same: 'shared twice', reverse: 'register, then shared' }[second]}`);
        log(`     stream 1 alone          ${f(r.alone && r.alone.s1)}`);
        if (r.second) { log(`     stream 2 refused: ${r.second.error}`); continue; }
        log(`     stream 1 with stream 2  ${f(r.both.s1)}`);
        log(`     stream 2                ${f(r.both.s2)}`);
        log(`     stream 1 after 2 stops  ${f(r.after.s1)}`);
        if (r.error) log(`     ERROR ${r.error}`);
      }
    } catch (e) { log(`\n== ${name}: could not run (${e.message.split('\n')[0]})`); rows.push({ engine: name, error: e.message.split('\n')[0] }); }
    finally { if (b) await b.close().catch(() => {}); }
  }
  srv.close();
  fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
})();
