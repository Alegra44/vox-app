# Phase 10: checks an exported Your Choir WAV outside the app. Decodes it with Python's own `wave` module (no
# browser involved) and, chord by chord, measures the amplitude at each recorded part's written pitch.
# Usage: python scripts/choir-verify/wavcheck.py <file.wav> <expect.json>
#   expect.json: {"chordDur": s, "parts": {"Alto": [midi, ...], ...}}  (written from the app by p10.js)
import json, sys, wave
import numpy as np

path, exp_path = sys.argv[1], sys.argv[2]
exp = json.load(open(exp_path, encoding='utf-8'))
with wave.open(path, 'rb') as w:
    ch, width, sr, n = w.getnchannels(), w.getsampwidth(), w.getframerate(), w.getnframes()
    raw = w.readframes(n)
print(f'header: {ch} channel(s), {8 * width}-bit, {sr} Hz, {n} frames = {n / sr:.2f} s')
x = np.frombuffer(raw, dtype='<i2').astype(np.float64) / 32768.0
if ch > 1: x = x.reshape(-1, ch).mean(axis=1)
print(f'peak {np.abs(x).max():.3f} | samples at full scale {int((np.abs(x) >= 0.9999).sum())} | RMS {np.sqrt((x ** 2).mean()):.4f}')

cd = exp['chordDur']
freq = lambda m: 440.0 * 2 ** ((m - 69) / 12)
parts = exp['parts']
nchords = min(len(v) for v in parts.values())
print(f'song: {nchords} chords of {cd:.3f} s = {nchords * cd:.2f} s expected')

def amp_at(seg, f):
    # Amplitude of a sine at f in seg (Hann window, zero-padded FFT, peak within ±1.5%).
    win = np.hanning(len(seg))
    nfft = 1 << (len(seg) * 4 - 1).bit_length()
    spec = np.abs(np.fft.rfft(seg * win, nfft)) * 2 / win.sum()
    bins = np.fft.rfftfreq(nfft, 1 / sr)
    sel = (bins > f * 0.985) & (bins < f * 1.015)
    return spec[sel].max()

rows = {p: [] for p in parts}
for i in range(nchords):
    a, b = int((i + 0.25) * cd * sr), int((i + 0.75) * cd * sr)  # middle of the chord: past the ~67 ms take latency
    seg = x[a:b]
    if len(seg) < 256: break
    for p, notes in parts.items():
        f = freq(notes[i])
        # Skip chords where another part sings within 3% of this pitch: the amplitude there isn't this part's alone.
        shared = any(q != p and abs(freq(parts[q][i]) / f - 1) < 0.03 for q in parts)
        rows[p].append(None if shared else amp_at(seg, f))

out = {}
for p, v in rows.items():
    got = [a for a in v if a is not None]
    heard = sum(1 for a in got if a > 0.01)
    out[p] = {'chords': len(got), 'heard': heard, 'medianAmp': round(float(np.median(got)), 4) if got else None}
    print(f'{p:8s} pitch present (amp > 0.01) on {heard}/{len(got)} chords, median amplitude {out[p]["medianAmp"]}')
print('JSON', json.dumps({'sr': sr, 'channels': ch, 'bits': 8 * width, 'seconds': n / sr, 'parts': out}))
