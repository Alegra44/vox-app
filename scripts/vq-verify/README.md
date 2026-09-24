# Voice Quality verification

Phase 1 of Voice Quality Analysis: three estimates from the live mic signal in the Voice Quality panel
(`#panel-voicequality`, Train → Expression). Every check feeds a WAV of known properties to Chromium as the
microphone (`--use-file-for-fake-audio-capture`), so the signal goes through the real `getUserMedia` →
AnalyserNode path. No server is needed: the scripts serve `deploy/index.html` on localhost by request interception.

| Script | Checks |
|---|---|
| `gen.py <out.wav> <json>` | Writes a test signal: f0, harmonic amplitudes, sinusoidal vibrato (rate, ± cents), linear pitch drift, white noise RMS |
| `vq.js [vibrato\|hnr\|centroid\|ui\|all] [captures]` | Injected vs measured for each metric, via the panel's own `vqCapture` + `vqSummarize`; a forced 600 ms main-thread stall; the Vibrato Analyzer panel's own capture on the cases that used to break it; then the panel with a real click, en/fr/es/tr text, stopping mid-hold (mic released), 390 px width |
| `noisy.py <out.wav> <json>` | A clean vibrato tone plus realistic background noise at a set SNR: pink (room), rumble (brown noise + 60 Hz hum), babble (4 talkers), white |
| `noisemic.js [captures]` | Vibrato under that noise: the Analyzer's old capture loop on the processed mic (noise suppression on) and on an unprocessed mic, vs the Analyzer as it is now; plus how many dB the suppressor removes on each noise |
| `vq.js vibui` | The Vibrato Analyzer panel with a real click: shown rate/depth/consistency, feedback, mic constraints |
| `livevq.js [url]` | Production: a fresh account (deleted at exit) clicks Train → Expression → Vibrato and Voice Quality with known WAVs as the mic; logs every getUserMedia call's constraints and track settings |
| `cvib.js` | Brightness with and without vibrato: the panel's magnitude-weighted centroid vs a power-weighted one on the same spectra |
| `shotlang.js <wav>` | Screenshots of the result rows in each language |

## How each metric is computed

- **Vibrato**: the Vibrato Analyzer's method, shared (`analyzeVibrato`). Pitch per frame by autocorrelation
  (2048 samples, behind a 1.5 kHz low-pass in Voice Quality so broadband breath noise can't swamp it); frames more than
  3 semitones off the median dropped; rate from peak-to-peak intervals (intervals spanning a capture stall left out);
  depth (± cents) per cycle, peak against the neighbouring troughs, median over cycles, divided by sin(x)/x with
  x = π·rate·window, the known shrink from averaging the pitch over one analysis window. Under ±8 ct: no vibrato.
- **Breathiness (HNR)**: per frame, 8192-point spectrum with no smoothing, f0/2 to 5 kHz. Bins within a quarter of the
  harmonic spacing of a harmonic are harmonic; the rest give the noise level per bin, assumed to lie under the harmonics
  too. HNR = (harmonic energy − noise under it) / (noise per bin × all bins). Median over the hold.
- **Brightness**: spectral centroid, magnitude-weighted, 50 Hz–6 kHz (the Register Coach's definition), ignoring bins
  60 dB under the frame's loudest; also shown as a multiple of f0, since it rises with the note.
- Voice Quality opens its own mic stream with echo cancellation, noise suppression and auto gain **off**; noise
  suppression would remove the breath noise the HNR looks for.

## Results (2026-09-24, local, headless Chromium, 48 kHz)

Vibrato (tone with harmonics 1, ½, ⅓, ¼; 3 captures each): 6 Hz ±50 → 5.9–6 Hz ±50–51; 4.5 ±30 → 4.5 ±30;
7 ±100 → 7 ±100–101; 5.5 ±40 @220 Hz → 5.5 ±40; 6 ±20 @440 Hz → 6 ±20; 6 ±50 + 15 ct/s drift → 6 ±50–51;
6 ±50 + white noise → 6 ±50–51; straight tone → no vibrato; 4.5 ±30 with a 600 ms stall → 4.6 ±30.
Before the fixes the Vibrato Analyzer read 4.5 ±30 as ±984 (one octave-error frame) and the drift case as 74.

Breathiness (220 Hz tone, harmonics 1…⅕, white noise scaled to an exact in-band HNR): injected 35/25/20/15/12/8/4/0 dB
→ measured 35.0/25.0/20.0/15.0/12.0/8.0/4.0/−0.1 dB; clean tone 70.1 dB (the 16-bit floor). With 6 Hz ±50 ct vibrato
the harmonics smear within a 170 ms frame: 25 dB reads 22.6–23.3, 12 dB reads 11.7.

Brightness: sine 440 → 440 Hz; 220 Hz ×10 harmonics 1/k² → 415 (expected 416), 1/k → 751 (751), flat → 1210 (1210);
330 Hz 1/k → 1126 (1127); adding white noise to the 1/k tone raises it (751 → 1641 Hz).

Vibrato Analyzer mic (decided 2026-09-24): it now uses Voice Quality's capture (unprocessed mic, pitch behind the
1.5 kHz low-pass). Tested with `noisemic.js` against its old capture on both mic settings, 6 Hz ±50 ct under noise at
20→0 dB SNR: the plain unprocessed switch was better with room noise, rumble and talkers but halved the depth under
hiss at ≤10 dB (±20–29); the suppressed mic read ±92–134 with talkers at 0 dB; the low-passed unprocessed path stayed
within ~2 ct in every case. Chrome's suppressor removed 16–20 dB of stationary noise but only 8 dB of babble.

Known limits: the reading bands (HNR 20 / 12 dB; brightness 2× / 4× f0) are rough guides for this tool, not norms from
real voices. Noise tests use synthesized noise and Chrome's own suppressor; Safari, Firefox and phones process the mic differently.
