# A clean vibrato tone plus realistic background noise at a set signal-to-noise ratio (full band, power), as a
# 16-bit mono 48 kHz WAV. Usage: python noisy.py <out.wav> <json>
#   {"f0":262, "vibRate":6, "vibCents":50, "noise":"pink|rumble|babble|white|none", "snrDb":10, "seconds":20, "seed":1,
#    "toneOff":false (noise only, for measuring what noise suppression removes),
#    "harmonics":[1,0.5,0.33,0.25,0.2] (tone amplitudes)}
# Noise types:
#   pink   1/f noise: generic room, traffic, distant ventilation
#   rumble HVAC: brown (1/f²) noise plus a 60 Hz hum with harmonics 120/180/240 Hz
#   babble 4 competing talkers: harmonic voices at 110–260 Hz with wandering pitch, switched on and off at syllable rate
#   white  flat hiss (reference)
import json, sys, wave
import numpy as np
out, spec = sys.argv[1], json.loads(sys.argv[2])
sr = 48000; n = int(spec.get('seconds', 20) * sr); t = np.arange(n) / sr
rng = np.random.default_rng(spec.get('seed', 1))

cents = spec.get('vibCents', 50) * np.sin(2 * np.pi * spec.get('vibRate', 6) * t)
phase = 2 * np.pi * np.cumsum(spec.get('f0', 262) * 2 ** (cents / 1200)) / sr
tone = sum(a * np.sin((k + 1) * phase) for k, a in enumerate(spec.get('harmonics', [1, 0.5, 0.33, 0.25, 0.2])))

def colored(exp):  # power spectrum ∝ 1/f^exp
    X = np.fft.rfft(rng.normal(size=n)); f = np.fft.rfftfreq(n, 1 / sr); f[0] = f[1]
    return np.fft.irfft(X / f ** (exp / 2), n)

kind = spec.get('noise', 'pink')
if kind == 'pink': noise = colored(1)
elif kind == 'white': noise = rng.normal(size=n)
elif kind == 'rumble':
    noise = colored(2); noise /= noise.std()
    noise += sum(a * np.sin(2 * np.pi * h * t + rng.uniform(0, 6.3)) for h, a in [(60, 1.0), (120, 0.6), (180, 0.35), (240, 0.2)])
elif kind == 'babble':
    noise = np.zeros(n)
    for v in range(4):
        base = rng.uniform(110, 260)
        wander = np.cumsum(rng.normal(0, 0.4, n // 480 + 1)); wander = np.repeat(wander, 480)[:n]   # pitch drift, semitones
        ph = 2 * np.pi * np.cumsum(base * 2 ** (np.clip(wander, -5, 5) / 12)) / sr
        voice = sum(a * np.sin((k + 1) * ph) for k, a in enumerate([1, 0.6, 0.4, 0.3, 0.2, 0.15]))
        # syllables: on/off segments of 120–350 ms with 20 ms ramps
        env = np.zeros(n); i = 0
        while i < n:
            L = int(rng.uniform(0.12, 0.35) * sr); env[i:i + L] = rng.random() < 0.65; i += L
        env = np.convolve(env, np.ones(960) / 960, mode='same')
        noise += voice * env
else: noise = np.zeros(n)

P = lambda x: float(np.mean(x ** 2))
if kind != 'none': noise *= np.sqrt(P(tone) / (P(noise) * 10 ** (spec.get('snrDb', 10) / 10)))
x = (0 if spec.get('toneOff') else tone) + (noise if kind != 'none' else 0)
x = x / np.abs(x).max() * 0.8
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
print(json.dumps({'snrDbActual': round(10 * np.log10(P(tone) / P(noise)), 2) if kind != 'none' else None}))
