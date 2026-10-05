// Playback levels: what each exercise actually sends to the speakers. Every connection to audioCtx.destination is
// rerouted through one AudioWorklet meter (then on to the speakers), so the reading is the real summed output, after
// every gain, envelope and trim. For each source: peak (dBFS), RMS over the samples where sound is playing (dBFS), and
// clipped samples (|x| ≥ 1), plus samples over the 0.95 ceiling. Sources are started with the app's own buttons or
// functions, signed out. Also the overlaps that can stack: a block chord, a reference tone over the backing pad, the
// Harmony Memory starting note over the choir. When the page has one playback output node (`playbackOutNode`, from
// 2026-10-05) it is rerouted through the meter, so the reading is after the volume control and the limiter.
// Usage: [LV_BEFORE=<ref> | LV_URL=<url>] node scripts/vq-verify/levels.js   (default: deploy/ from the working tree)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const path = require('path'), fs = require('fs');
const ROOT = path.resolve(__dirname, '../..');
const LOGDIR = path.join(__dirname, 'logs'); fs.mkdirSync(LOGDIR, { recursive: true });
const REF = process.env.LV_BEFORE, URL_ = process.env.LV_URL, { execFileSync } = require('child_process');
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), LOG = path.join(LOGDIR, `levels-${URL_ ? 'prod' : REF ? 'ref' : 'local'}-${stamp}`);
const logf = fs.createWriteStream(LOG + '.log');
const log = (...a) => { const s = a.join(' '); console.log(s); logf.write(s + '\n'); };

const METER = `class M extends AudioWorkletProcessor{constructor(){super();this.p=0;this.s=0;this.n=0;this.c=0;this.o=0;this.port.onmessage=()=>{this.port.postMessage({p:this.p,s:this.s,n:this.n,c:this.c,o:this.o});this.p=0;this.s=0;this.n=0;this.c=0;this.o=0;};}
process(i,o){const x=i[0]&&i[0][0];if(x){for(let k=0;k<x.length;k++){const v=Math.abs(x[k]);if(v>this.p)this.p=v;if(v>1e-4){this.s+=v*v;this.n++;}if(v>=1)this.c++;if(v>0.95)this.o++;}
for(let ch=0;ch<o[0].length;ch++)o[0][ch].set(i[0][ch]||i[0][0]);}return true;}}registerProcessor('m',M);`;

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const ctx = await b.newContext({ permissions: ['microphone'] });
  await ctx.route('http://localhost:8765/**', r => {
    const p = new URL(r.request().url()).pathname.slice(1) || 'index.html', type = p.endsWith('.js') ? 'text/javascript' : 'text/html';
    if (REF) return r.fulfill({ body: execFileSync('git', ['show', `${REF}:deploy/${p}`], { cwd: ROOT, maxBuffer: 1 << 28 }), contentType: type });
    r.fulfill({ path: path.join(ROOT, 'deploy', p), contentType: type });
  });
  const page = await ctx.newPage();
  await page.goto(URL_ || 'http://localhost:8765/', { waitUntil: 'load' }); await page.waitForTimeout(2500);
  await page.evaluate(async src => {
    requireProFeature = () => true; blockExercise = () => false;
    await initAudioOnly();
    await audioCtx.audioWorklet.addModule(URL.createObjectURL(new Blob([src], { type: 'text/javascript' })));
    const meter = new AudioWorkletNode(audioCtx, 'm', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    meter.connect(audioCtx.destination);
    const real = AudioNode.prototype.connect;
    AudioNode.prototype.connect = function (dest, ...a) { return real.call(this, dest === audioCtx.destination && this !== meter ? meter : dest, ...a); };
    // the page's single playback output, if it has one (made by initAudioOnly, before the patch), goes through the meter
    if (typeof playbackOutNode !== 'undefined' && playbackOutNode) { playbackOutNode.disconnect(); playbackOutNode.connect(meter); }
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
    log(`${label.padEnd(66)} peak ${db(r.p).padStart(6)} dBFS (${r.p.toFixed(3)}) · RMS ${db(rms).padStart(6)} dBFS · clipped ${r.c} · over 0.95 ${r.o}`);
    await page.waitForTimeout(400);
    return { label, peak: r.p, rms, clipped: r.c, over: r.o };
  };
  log(`playback levels ${stamp} · ${URL_ ? `url ${URL_}` : REF ? `deploy/ at ${REF}` : `deploy/ in the working tree (HEAD ${execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: ROOT }).toString().trim()})`}`);
  const rows = [];
  const click = id => `document.getElementById('${id}').click()`;
  // a guide note (plays while the mic listens) and the Harmony Memory starting note, as each version plays them
  const guide = (midi, dur) => `typeof playGuideTone === 'function' ? playGuideTone(noteToFreq(${midi}), ${dur}, 0) : playTone(noteToFreq(${midi}), ${dur}, 0, 0.10)`;
  const memory = (midi, dur) => `typeof playGuideTone === 'function' ? playGuideTone(noteToFreq(${midi}), ${dur}, 0) : playTone(noteToFreq(${midi}), ${dur}, 0, 0.2)`;
  const ear = (mode, semis) => `enterPanel('exercises'); document.querySelector('[data-extype="ear"]')?.click(); earSubMode = '${mode}'; earRootMidi = 57; earTargetName = 'x'; earTargetSemis = ${JSON.stringify(semis)}; ${click('earPlayBtn')}`;
  rows.push(await measure('Pitch Match: Play target, A3', `enterPanel('exercises'); pitchTargetMidi = 57; ${click('pitchPlayBtn')}`, 1300));
  rows.push(await measure('Pitch Match: Play target, low E2', `pitchTargetMidi = 40; ${click('pitchPlayBtn')}`, 1300));
  rows.push(await measure('Pitch Match: Play target, high C6', `pitchTargetMidi = 84; ${click('pitchPlayBtn')}`, 1300));
  rows.push(await measure('Interval Match: Play root + interval', `intervalRootMidi = 55; intervalTargetMidi = 62; ${click('intervalPlayBtn')}`, 1600));
  rows.push(await measure('Key Trainer: Play note', `enterPanel('key'); ${click('playNoteBtn')}`, 1300));
  rows.push(await measure('Key Trainer: Play major scale', click('playScaleBtn'), 3600));
  rows.push(await measure('Ear Training: Play interval', ear('interval', [0, 7]), 2200));
  rows.push(await measure('Ear Training: block chord, 4 notes (A3 maj7)', ear('chord', [0, 4, 7, 11]), 1500));
  rows.push(await measure('Smart Warmup: siren', `enterPanel('warmup'); ${click('warmupPlay1')}`, 4800));
  rows.push(await measure('Smart Warmup: 5-note scale', click('warmupPlay3'), 4200));
  rows.push(await measure('Pitch Dragon training: Play the note', `window._bossTrainTargetMidi = 57; ${click('bossTrainPlayBtn')}`, 1300));
  rows.push(await measure('Guide note (Harmony piano guide, plays while the mic listens)', guide(57, 0.9), 1300));
  rows.push(await measure('Count-in click (880 Hz, first beat)', `playTone(880, 0.08, 0, 0.20)`, 600));
  rows.push(await measure('Cue tick (1320 Hz, before listening)', `playTone(1320, 0.12, 0, 0.12)`, 600));
  for (const id of ['hymn', 'ballad']) {
    rows.push(await measure(`Backing pad, ${id} (Karaoke / Stay in Key / Harmony)`, `selectSong('${id}'); playBackingPad(false)`, 8000));
    rows.push(await measure(`Choir World mixer, ${id}, all parts at default`, `selectSong('${id}'); enterPanel('choir'); (typeof playChoir==='function' ? playChoir() : document.getElementById('choirPlayBtn')?.click())`, 8000));
  }
  // overlaps: what stacks on top of the loudest playback
  rows.push(await measure('Overlap: reference tone over the backing pad (hymn)', `selectSong('hymn'); playBackingPad(false); setTimeout(() => { pitchTargetMidi = 57; ${click('pitchPlayBtn')} }, 1500)`, 4000));
  rows.push(await measure('Overlap: block chord over the backing pad (hymn)', `selectSong('hymn'); playBackingPad(false); setTimeout(() => { ${ear('chord', [0, 4, 7, 11])} }, 1500)`, 4000));
  rows.push(await measure('Overlap: Harmony Memory starting note over the choir (hymn)', `selectSong('hymn'); enterPanel('choir'); playChoir(); setTimeout(() => { ${memory(57, 1.5)} }, 1500)`, 4000));
  // the playback volume control, where the page has one
  if (await page.evaluate(() => typeof setPlaybackVolume === 'function')) {
    rows.push(await measure('Playback volume 50%: Pitch Match target, A3 (expect −6 dB)', `setPlaybackVolume(0.5, false); pitchTargetMidi = 57; setTimeout(() => ${click('pitchPlayBtn')}, 200)`, 1300));
    rows.push(await measure('Playback volume 50%: backing pad, hymn (expect −6 dB)', `selectSong('hymn'); playBackingPad(false)`, 8000));
    rows.push(await measure('Playback volume 0%: Pitch Match target (expect silence)', `setPlaybackVolume(0, false); setTimeout(() => ${click('pitchPlayBtn')}, 200)`, 1300));
    await page.evaluate(() => setPlaybackVolume(1, false));
  }
  const worst = rows.reduce((a, r) => r.peak > a.peak ? r : a, rows[0]);
  log(`\nloudest peak ${worst.peak.toFixed(3)} (${worst.label}); clipped samples in total ${rows.reduce((a, r) => a + r.clipped, 0)}; samples over 0.95 ${rows.reduce((a, r) => a + r.over, 0)}`);
  fs.writeFileSync(LOG + '.json', JSON.stringify(rows, null, 1));
  log(`\nlog: ${LOG}.log  json: ${LOG}.json`);
  await b.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
