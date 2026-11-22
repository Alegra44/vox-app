# Release F4's test voice: a warm-up exercise's guide (deploy/index.html, WU_EXERCISES) sung as a harmonic tone, for
# Chromium's file mic. 16-bit mono 48 kHz: `lead` s of silence, the guide from t = 0 for `seconds`, `tail` s of silence
# (the file loops; summary.js starts the exercise in a silence, so the exercise's clock starts on the first sung frame).
# spec: {"ex": "siren", "lo": 48, "hi": 72, "offset": 0 (semitones added everywhere), "lostAbove": f (above p(f) the
#        voice sings `lostBy` semitones flat), "lostBy": -3, "vibCents": 0, "vibRate": 5, "seconds": 21, "lead": 3, "tail": 2}
# Usage: python guidewav.py <out.wav> <json spec>
import json, sys, wave
import numpy as np
out, spec = sys.argv[1], json.loads(sys.argv[2])
sr = 48000; lo, hi = spec['lo'], spec['hi']; p = lambda f: lo + f * (hi - lo)
n = int(spec.get('seconds', 21) * sr); t = np.arange(n) / sr
ex = spec['ex']
if ex == 'trill': g = p(0.35) + 2 * np.sin(2 * np.pi * t / 3)
elif ex == 'siren': g = p(0.5 - 0.4 * np.cos(2 * np.pi * t / 5))
elif ex == 'glide':
    ph = (t / 8) % 1; g = p(0.25 + 0.35 * np.where(ph < 0.5, ph * 2, 2 - ph * 2))
elif ex == 'hum': g = np.full(n, p(0.35))
m = g + spec.get('offset', 0)
if 'lostAbove' in spec: m = np.where(g > p(spec['lostAbove']), g + spec.get('lostBy', -3), m)
m = m + spec.get('vibCents', 0) / 100 * np.sin(2 * np.pi * spec.get('vibRate', 5) * t)
f = 440 * 2 ** ((m - 69) / 12); ph = 2 * np.pi * np.cumsum(f) / sr
x = sum(a * np.sin((k + 1) * ph) for k, a in enumerate([1, 0.5, 0.33, 0.25, 0.2]))
x = x / np.abs(x).max() * 0.5
ramp = int(0.01 * sr); x[:ramp] *= np.linspace(0, 1, ramp); x[-ramp:] *= np.linspace(1, 0, ramp)
x = np.concatenate([np.zeros(int(spec.get('lead', 3) * sr)), x, np.zeros(int(spec.get('tail', 2) * sr))])
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
