# Test signals of known properties for the Voice Quality checks, written as 16-bit mono 48 kHz WAVs.
# Usage: python gen.py <out.wav> <json spec>
#   spec: {"f0":220, "harmonics":[1,0.5,...] (amplitude per harmonic, default [1]), "amp":0.5 (peak of the tone),
#          "vibRate":6, "vibCents":50 (± extent), "noiseRms":0.05 (white Gaussian), "seconds":8, "seed":1}
import json, sys, wave
import numpy as np
out, spec = sys.argv[1], json.loads(sys.argv[2])
sr = 48000; n = int(spec.get('seconds', 8) * sr); t = np.arange(n) / sr
f0 = spec['f0']; h = np.array(spec.get('harmonics', [1.0]), float)
cents = spec.get('vibCents', 0) * np.sin(2 * np.pi * spec.get('vibRate', 0) * t) + spec.get('driftCentsPerSec', 0) * t  # optional slow linear pitch drift
inst = f0 * 2 ** (cents / 1200)                      # instantaneous f0
phase = 2 * np.pi * np.cumsum(inst) / sr
x = sum(a * np.sin((k + 1) * phase) for k, a in enumerate(h))
x = x / np.abs(x).max() * spec.get('amp', 0.5)
rng = np.random.default_rng(spec.get('seed', 1))
x = x + rng.normal(0, spec.get('noiseRms', 0), n)
x = np.clip(x, -1, 1)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr)
    w.writeframes((x * 32767).astype('<i2').tobytes())
# Ground truth for the report: harmonic power per harmonic (after the amplitude scaling) and noise power.
scale = spec.get('amp', 0.5) / np.abs(sum(a * np.sin((k + 1) * phase) for k, a in enumerate(h))).max()
print(json.dumps({'harmonicAmps': [float(a * scale) for a in h], 'noiseRms': spec.get('noiseRms', 0), 'sr': sr}))
