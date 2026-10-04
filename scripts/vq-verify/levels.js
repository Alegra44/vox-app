// Playback levels: what each exercise actually sends to the speakers. Every connection to audioCtx.destination is
// rerouted through one AudioWorklet meter (then on to the speakers), so the reading is the real summed output, after
// every gain, envelope and trim. For each source: peak (dBFS), RMS over the samples where sound is playing (dBFS), and
// clipped samples (|x| ≥ 1). Sources are started with the app's own buttons or functions, signed out, locally.
// Usage: node scripts/vq-verify/levels.js   (deploy/ served locally)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `levels-local-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };

const METER = `class M extends AudioWorkletProcessor{constructor(){super();this.p=0;this.s=0;this.n=0;this.c=0;this.port.onmessage=()=>{this.port.postMessage({p:this.p,s:this.s,n:this.n,c:this.c});this.p=0;this.s=0;this.n=0;this.c=0;};}
process(i,o){const x=i[0]&&i[0][0];if(x){for(let k=0;k<x.length;k++){const v=Math.abs(x[k]);if(v>this.p)this.p=v;if(v>1e-4){this.s+=v*v;this.n++;}if(v>=1)this.c++;}
for(let ch=0;ch<o[0].length;ch++)o[0][ch].set(i[0][ch]||i[0][0]);}return true;}}registerProcessor('m',M);`;

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'] });
  await ctx.route('http://localhost:8765/**', r => { const p = new URL(r.request().url()).pathname.slice(1) || 'index.html'; r.fulfill({ path: path.join(ROOT, 'deploy', p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  const page = await ctx.newPage();
  await page.goto('http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async src => {
    requireProFeature = () => true; blockExercise = () => false;
    await initAudioOnly();
    await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const meter = new AudioWorkletNode(audioCtx, 'm', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    meter.connect(audioCtx.destination);
    const real = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) { return real.call(this, dest === audioCtx.destination && this !== meter ? meter : dest, ...a); };
    // anything already wired to the speakers (backing / choir output nodes made earlier) goes through the meter too
    window.__read = () => new Promise(r => { meter.port.onmessage = e => r(e.data); meter.port.postMessage(0); });
  }, METER);
  const db = v => v > 0 ? (20 * Math.log10(v)).toFixed(1) : '−∞';
  const measure = async (label, start, ms) => {
    await page.evaluate(() => window.__read()); // reset
    await page.evaluate(start);
    await page.waitForTimeout(ms);
    const r = await page.evaluate(() => window.__read());
    await page.evaluate(() => { try { stopBackingPad(); } catch (e) {} try { if (choirIsPlaying) stopChoir(); } catch (e) {} });
    const rms = r.n ? Math.sqrt(r.s / r.n) : 0;
    log(`${label.padEnd(58)} peak ${db(r.p).padStart(6)} dBFS · RMS ${db(rms).padStart(6)} dBFS · clipped ${r.c}`);
    await page.waitForTimeout(400);
    return { label, peak: r.p, rms, clipped: r.c };
  };
  log(`playback levels ${stamp} · deploy/ at ${require('child_process').execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim()}`);
  const rows = [];
  const click = id => `document.getElementById('${id}').click()`;
  rows.push(await measure('Pitch Match: Play target (playTone 0.22)', `enterPanel('exercises'); pitchTargetMidi = 57; ${click('pitchPlayBtn')}`, 1300));
  rows.push(await measure('Interval Match: Play root + interval (2 × playTone 0.22)', `intervalRootMidi = 55; intervalTargetMidi = 62; ${click('intervalPlayBtn')}`, 1600));
  rows.push(await measure('Key Trainer: Play note (playTone 0.22)', `enterPanel('key'); ${click('playNoteBtn')}`, 1300));
  rows.push(await measure('Key Trainer: Play major scale (8 × playTone 0.22)', click('playScaleBtn'), 3600));
  rows.push(await measure('Ear Training: Play interval', `enterPanel('exercises'); document.querySelector('[data-extype="ear"]')?.click(); ${click('earPlayBtn')}`, 2200));
  rows.push(await measure('Smart Warmup: siren (playSiren 0.18)', `enterPanel('warmup'); ${click('warmupPlay1')}`, 4800));
  rows.push(await measure('Smart Warmup: 5-note scale (playTone 0.22)', click('warmupPlay3'), 4200));
  rows.push(await measure('Pitch Dragon training: Play the note (playTone 0.22)', `window._bossTrainTargetMidi = 57; ${click('bossTrainPlayBtn')}`, 1300));
  rows.push(await measure('Guide note (playTone 0.10, e.g. Register Runner)', `playTone(noteToFreq(57), 0.9, 0, 0.10)`, 1300));
  rows.push(await measure('Drill / reference note (playTone 0.20)', `playTone(noteToFreq(57), 0.9, 0, 0.20)`, 1300));
  rows.push(await measure('Count-in click (playTone 880 Hz, as used)', `playTone(880, 0.08)`, 600));
  for (const id of ['hymn', 'ballad']) {
    rows.push(await measure(`Backing pad, ${id} (Karaoke / Stay in Key / Harmony)`, `selectSong('${id}'); playBackingPad(false)`, 8000));
    rows.push(await measure(`Choir World mixer, ${id}, all parts at default`, `selectSong('${id}'); enterPanel('choir'); (typeof playChoir==='function' ? playChoir() : document.getElementById('choirPlayBtn')?.click())`, 8000));
  }
  fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
