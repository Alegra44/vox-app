// Register Coach chest score, reproduced outside the browser with exact control of every frame, to find where the
// vibrato bias comes from. No mic, no browser: the tone is synthesized sample-exact (as gen.py does, 48 kHz), each
// 2048-sample frame goes through an AnalyserNode emulation (Blackman window, FFT, |X|/N, optional 0.8 smoothing, dB)
// and the app's own autoCorrelate(), extracted from deploy/index.html, and scored by getSpectralChestScore's formula.
// Because the vibrato phase of each frame is known, the pitch in the denominator can be taken from the same frame,
// from a frame at a chosen lag, the true instantaneous f0, or the true mean f0.
// Usage: node scripts/vq-verify/rcmodel.js
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.resolve(__dirname, '../../deploy/index.html'), 'utf8');
const autoCorrelate = new Function(SRC.match(/function autoCorrelate\(buf, sampleRate\)\{[\s\S]*?\n\}/)[0] + '\nreturn autoCorrelate;')();
const SR = 48000, N = 2048, HOP = 800; // HOP: one rAF frame at 60 Hz

function tone(f0, H, rate, cents, seconds = 3) {
  const n = Math.round(seconds * SR), x = new Float64Array(n);
  let ph = 0, peak = 0;
  for (let i = 0; i < n; i++) {
    ph += 2 * Math.PI * f0 * Math.pow(2, cents * Math.sin(2 * Math.PI * rate * i / SR) / 1200) / SR;
    let v = 0; for (let k = 0; k < H.length; k++) v += H[k] * Math.sin((k + 1) * ph);
    x[i] = v; peak = Math.max(peak, Math.abs(v));
  }
  for (let i = 0; i < n; i++) x[i] = x[i] / peak * 0.5;
  return x;
}
const trueF0 = (f0, rate, cents, i) => f0 * Math.pow(2, cents * Math.sin(2 * Math.PI * rate * i / SR) / 1200);

const WIN = Float64Array.from({ length: N }, (_, n) => 0.42 - 0.5 * Math.cos(2 * Math.PI * n / N) + 0.08 * Math.cos(4 * Math.PI * n / N));
function magSpectrum(x, end) { // |X[k]|/N of the N samples ending at `end`, Blackman-windowed, as AnalyserNode
  const re = new Float64Array(N), im = new Float64Array(N);
  for (let n = 0; n < N; n++) re[n] = x[end - N + n] * WIN[n];
  for (let i = 1, j = 0; i < N; i++) { let b = N >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; } }
  for (let len = 2; len <= N; len <<= 1) {
    const a = -2 * Math.PI / len;
    for (let i = 0; i < N; i += len) for (let k = 0; k < len / 2; k++) {
      const c = Math.cos(a * k), s = Math.sin(a * k), p = i + k, q = p + len / 2;
      const tr = re[q] * c - im[q] * s, ti = re[q] * s + im[q] * c;
      re[q] = re[p] - tr; im[q] = im[p] - ti; re[p] += tr; im[p] += ti;
    }
  }
  return Float64Array.from({ length: N / 2 }, (_, k) => Math.hypot(re[k], im[k]) / N);
}
const binHz = SR / N;
function centroid(mag, pow) { // getSpectralChestScore's sum: bins 1 .. 6 kHz, all bins, magnitude (or power) weights
  let w = 0, s = 0; const hi = Math.min(mag.length, Math.floor(6000 / binHz));
  for (let i = 1; i < hi; i++) { const m = pow ? mag[i] * mag[i] : mag[i]; w += i * binHz * m; s += m; }
  return w / s;
}
const score = r => Math.max(0, Math.min(100, (r - 1.5) / 4 * 100));
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const mean = a => a.reduce((x, y) => x + y, 0) / a.length;
const pct = (a, f) => Math.round(100 * a.filter(f).length / a.length);

const magRatio = (s, K) => { let w = 0, a = 0; for (let k = 1; k <= K; k++) { const v = Math.pow(k, -s); w += k * v; a += v; } return w / a; };
const slopeFor = (ratio, K) => { let lo = 0.01, hi = 6; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (magRatio(m, K) > ratio) lo = m; else hi = m; } return (lo + hi) / 2; };

// Frames every HOP samples from 0.5 s on (as the app's rAF loop); smoothing carries across frames like the analyser.
function run(x, f0, rate, cents, { smooth = 0, pitch = 'same', lagMs = 0, pow = false } = {}) {
  const out = { score: [], cent: [], det: [], err: [] }; let prev = null;
  const lag = Math.round(lagMs / 1000 * SR);
  for (let end = SR / 2; end + Math.abs(lag) + N < x.length; end += HOP) {
    let m = magSpectrum(x, end);
    if (smooth) { if (prev) m = m.map((v, k) => smooth * prev[k] + (1 - smooth) * v); prev = m; }
    const c = centroid(m, pow);
    let f;
    if (pitch === 'same') f = autoCorrelate(Float32Array.from(x.subarray(end - N, end)), SR);
    else if (pitch === 'lag') f = autoCorrelate(Float32Array.from(x.subarray(end - N + lag, end + lag)), SR);
    else if (pitch === 'true') f = trueF0(f0, rate, cents, end - N / 2);
    else f = f0; // 'mean'
    if (!(f > 0)) continue;
    out.score.push(score(c / f)); out.cent.push(c); out.det.push(f); out.err.push(1200 * Math.log2(f / trueF0(f0, rate, cents, end - N / 2)));
  }
  return out;
}
const fmt = r => `score med ${med(r.score).toFixed(1).padStart(5)} mean ${mean(r.score).toFixed(1).padStart(5)} [≥62 ${String(pct(r.score, s => s >= 62)).padStart(3)}%]`;

for (const [f0, target] of [[330, 35], [330, 50]]) {
  const K = Math.floor(6000 / f0), s = slopeFor(1.5 + target / 100 * 4, K), H = [...Array(K).keys()].map(k => Math.pow(k + 1, -s));
  console.log(`\n==== ${f0} Hz, ${(6.02 * s).toFixed(1)} dB/oct (clean-spectrum score ${target}), 6 Hz vibrato`);
  for (const d of [0, 25, 50, 100]) {
    const x = tone(f0, H, 6, d);
    const same = run(x, f0, 6, d), sm = run(x, f0, 6, d, { smooth: 0.8 }), tr = run(x, f0, 6, d, { pitch: 'true' }), mn = run(x, f0, 6, d, { pitch: 'mean' });
    console.log(`${(d ? '±' + d + ' ct' : 'straight').padEnd(8)} centroid ${mean(same.cent).toFixed(0)} Hz | pitch same frame: ${fmt(same)} | +0.8 smoothing: ${fmt(sm)}`);
    console.log(`${''.padEnd(8)} pitch error (same frame − true f0 at frame centre): mean ${mean(same.err).toFixed(1)} ct, |max| ${Math.max(...same.err.map(Math.abs)).toFixed(1)} ct | true instantaneous f0: ${fmt(tr)} | true mean f0: ${fmt(mn)}`);
    if (d === 50) {
      const lags = [-83, -42, -21, -10, 0, 10, 21, 42, 83].map(L => `${L > 0 ? '+' : ''}${L} ms ${med(run(x, f0, 6, d, { pitch: 'lag', lagMs: L }).score).toFixed(1)}`);
      console.log(`${''.padEnd(8)} pitch taken from a frame at a lag (median score): ${lags.join(' | ')}`);
    }
  }
}

// ---- Candidate fixes on the unprocessed signal (pitch from the same frame, no smoothing, as NS-off measured).
// A today: magnitude, every bin. B: magnitude, bins within 60 dB of the frame's peak. C: power, converted to the score
// through the "equivalent magnitude ratio" (the roll-off whose clean harmonic spectrum gives this power centroid, then
// that spectrum's magnitude ratio), so straight tones keep today's score. D: C with the 60 dB floor.
// Also with white noise at a set harmonic-to-noise ratio over the whole band (room noise / breath reaching the mic).
const powRatio = (s, K) => magRatio(2 * s, K);
function equivMag(pr, K) { let lo = 0.01, hi = 6; for (let i = 0; i < 50; i++) { const m = (lo + hi) / 2; if (powRatio(m, K) > pr) lo = m; else hi = m; } return magRatio((lo + hi) / 2, K); }
function centroidFloor(mag, pow, floorDb) {
  const hi = Math.min(mag.length, Math.floor(6000 / binHz)); let pk = 0; for (let i = 1; i < hi; i++) pk = Math.max(pk, mag[i]);
  const lim = floorDb ? pk * Math.pow(10, -floorDb / 20) : 0; let w = 0, s = 0;
  for (let i = 1; i < hi; i++) { if (mag[i] < lim) continue; const m = pow ? mag[i] * mag[i] : mag[i]; w += i * binHz * m; s += m; }
  return w / s;
}
function candidates(x) {
  const r = { A: [], B: [], C: [], D: [] };
  for (let end = SR / 2; end + N < x.length; end += HOP) {
    const f = autoCorrelate(Float32Array.from(x.subarray(end - N, end)), SR); if (!(f > 0)) continue;
    const m = magSpectrum(x, end), K = Math.max(1, Math.floor(6000 / f));
    r.A.push(score(centroidFloor(m, false, 0) / f)); r.B.push(score(centroidFloor(m, false, 60) / f));
    r.C.push(score(equivMag(centroidFloor(m, true, 0) / f, K))); r.D.push(score(equivMag(centroidFloor(m, true, 60) / f, K)));
  }
  return r;
}
function addNoise(x, hnrDb, seed = 1) { // white noise with power = harmonic power / 10^(hnr/10), measured over 0–6 kHz
  let p = 0; for (let i = 0; i < x.length; i++) p += x[i] * x[i]; p /= x.length;
  const sigma = Math.sqrt(p / Math.pow(10, hnrDb / 10) / (6000 / (SR / 2)));
  let s = seed; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  return x.map(v => v + sigma * Math.sqrt(-2 * Math.log(rnd() + 1e-12)) * Math.cos(2 * Math.PI * rnd()));
}
console.log('\n\n==== candidate scorings, unprocessed signal: median score [% frames ≥ 62]');
for (const [f0, target] of [[330, 35], [330, 50], [330, 62], [440, 35], [440, 50]]) {
  const K = Math.floor(6000 / f0), s = slopeFor(1.5 + target / 100 * 4, K), H = [...Array(K).keys()].map(k => Math.pow(k + 1, -s));
  console.log(`\n${f0} Hz, ${(6.02 * s).toFixed(1)} dB/oct (clean-spectrum score ${target})     A today | B mag+floor | C power→score | D power+floor`);
  const rows = [['straight', tone(f0, H, 6, 0)], ['±25 ct', tone(f0, H, 6, 25)], ['±50 ct', tone(f0, H, 6, 50)], ['±100 ct', tone(f0, H, 6, 100)]];
  for (const hnr of [30, 20]) { rows.push([`straight + noise ${hnr} dB`, addNoise(tone(f0, H, 6, 0), hnr)]); rows.push([`±50 + noise ${hnr} dB`, addNoise(tone(f0, H, 6, 50), hnr)]); }
  for (const [label, x] of rows) {
    const r = candidates(x), c = a => `${med(a).toFixed(1).padStart(5)} [${String(pct(a, v => v >= 62)).padStart(3)}%]`;
    console.log(`  ${label.padEnd(22)} ${c(r.A)} | ${c(r.B)} | ${c(r.C)} | ${c(r.D)}`);
  }
}
