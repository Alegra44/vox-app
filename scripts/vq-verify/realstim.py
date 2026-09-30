# A real sung note as a long mic stimulus: one sustained note cut from a VocalSet clip (CC BY 4.0), pitch-shifted by
# resampling (to centre it on its semitone, plus an optional deliberate offset or a slow wander), looped forward then
# backward (so the pitch contour never jumps at a seam) to `seconds`, written as 16-bit mono 48 kHz.
# Usage: python realstim.py <out.wav> <json>
#   {"clip":"<path>.wav", "startMs":2996, "durMs":1833, "shiftCents":1, "wanderCents":0, "wanderHz":0.8, "seconds":30,
#    "jitterCents":0, "jitterSeed":1}  jitter: irregular unsteadiness, seeded random pitch noise band-limited to 0.5–6 Hz
#    (no single period, unlike vibrato), scaled to jitterCents RMS
import json, sys, wave
import numpy as np
out, spec = sys.argv[1], json.loads(sys.argv[2])
with wave.open(spec['clip']) as w:
    sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').astype(float) / 32768
    if w.getnchannels() > 1: x = x.reshape(-1, w.getnchannels())[:, 0]
seg = x[int(spec['startMs'] / 1000 * sr): int((spec['startMs'] + spec['durMs']) / 1000 * sr)]
seg = seg / (np.abs(seg).max() + 1e-9) * 0.6
# ping-pong loop, then read it back at a rate that shifts the pitch: output sample n reads input position p(n) with
# dp/dn = (sr/48000)·2^(cents(n)/1200), cents = shift + wander·sin(2π·wanderHz·t)
loop = np.concatenate([seg, seg[::-1]])
n = int(spec.get('seconds', 30) * 48000); t = np.arange(n) / 48000
cents = spec.get('shiftCents', 0) + spec.get('wanderCents', 0) * np.sin(2 * np.pi * spec.get('wanderHz', 0.8) * t)
if spec.get('jitterCents', 0):
    f = np.fft.rfftfreq(n, 1 / 48000); J = np.fft.rfft(np.random.default_rng(spec.get('jitterSeed', 1)).standard_normal(n))
    J[(f < 0.5) | (f > 6)] = 0; j = np.fft.irfft(J, n); cents = cents + j / (j.std() + 1e-12) * spec['jitterCents']
p = np.cumsum(sr / 48000 * 2 ** (cents / 1200)) % len(loop)
y = np.interp(p, np.arange(len(loop)), loop)
fade = int(0.02 * 48000); y[:fade] *= np.linspace(0, 1, fade)
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000); w.writeframes((np.clip(y, -1, 1) * 32767).astype('<i2').tobytes())
