# Test tone (optional vibrato, optional cents offset) + realistic background noise at a set full-band SNR, 16-bit mono 48 kHz.
# Extends scripts/vq-verify/noisy.py with the noises testers report. Usage: python noisy2.py <out.wav> <json>
#  {"f0":220, "centsOffset":0, "vibRate":6, "vibCents":0, "noise":"none|pink|rumble|babble|talker|tv|traffic|white",
#   "snrDb":10, "seconds":24, "seed":1, "toneOff":false, "harmonics":[1,0.5,0.33,0.25,0.2]}
#  babble  4 competing talkers (a room of people)
#  talker  one person talking nearby: speech-like harmonic voice, 20 harmonics, intonation, syllables and pauses
#  tv      a TV: one talker over a music bed (triads that change every 1.5-2.5 s, i.e. sustained competing pitches)
#  traffic brown rumble with slow swells (passing cars, 4-9 s) plus a band of tyre hiss that swells with them
import json, sys, wave
import numpy as np
out, spec = sys.argv[1], json.loads(sys.argv[2])
sr = 48000; n = int(spec.get('seconds', 24) * sr); t = np.arange(n) / sr
rng = np.random.default_rng(spec.get('seed', 1))

cents = spec.get('centsOffset', 0) + spec.get('vibCents', 0) * np.sin(2 * np.pi * spec.get('vibRate', 6) * t)
phase = 2 * np.pi * np.cumsum(spec.get('f0', 220) * 2 ** (cents / 1200)) / sr
tone = sum(a * np.sin((k + 1) * phase) for k, a in enumerate(spec.get('harmonics', [1, 0.5, 0.33, 0.25, 0.2])))

def colored(exp):
    X = np.fft.rfft(rng.normal(size=n)); f = np.fft.rfftfreq(n, 1 / sr); f[0] = f[1]
    return np.fft.irfft(X / f ** (exp / 2), n)

def syllables(on_p=0.65, lo=0.12, hi=0.35, pause_p=0.0):
    env = np.zeros(n); i = 0
    while i < n:
        if pause_p and rng.random() < pause_p: i += int(rng.uniform(0.3, 0.9) * sr); continue   # breath pauses
        L = int(rng.uniform(lo, hi) * sr); env[i:i + L] = rng.random() < on_p; i += L
    return np.convolve(env, np.ones(960) / 960, mode='same')

def voice(base, amps, drift=0.4, contour=0.0):
    wander = np.cumsum(rng.normal(0, drift, n // 480 + 1)); wander = np.repeat(wander, 480)[:n]
    semis = np.clip(wander, -5, 5)
    if contour: semis = semis + contour * np.sin(2 * np.pi * rng.uniform(0.3, 0.7) * t + rng.uniform(0, 6.3))   # intonation
    ph = 2 * np.pi * np.cumsum(base * 2 ** (semis / 12)) / sr
    return sum(a * np.sin((k + 1) * ph) for k, a in enumerate(amps))

def speech_amps(K=20):   # 1/k roll-off with two formant-ish bumps (~500 Hz, ~1500 Hz for a 120 Hz voice)
    k = np.arange(1, K + 1); return list((1 / k) * (1 + 1.5 * np.exp(-((k - 4) / 1.5) ** 2) + 0.8 * np.exp(-((k - 12) / 2.5) ** 2)))

kind = spec.get('noise', 'none')
if kind == 'pink': noise = colored(1)
elif kind == 'white': noise = rng.normal(size=n)
elif kind == 'rumble':
    noise = colored(2); noise /= noise.std()
    noise += sum(a * np.sin(2 * np.pi * h * t + rng.uniform(0, 6.3)) for h, a in [(60, 1.0), (120, 0.6), (180, 0.35), (240, 0.2)])
elif kind == 'babble':
    noise = np.zeros(n)
    for v in range(4): noise += voice(rng.uniform(110, 260), [1, 0.6, 0.4, 0.3, 0.2, 0.15]) * syllables()
elif kind in ('talker', 'tv'):
    noise = voice(rng.uniform(105, 210), speech_amps(), drift=0.25, contour=3) * syllables(0.8, 0.1, 0.28, pause_p=0.12)
    if kind == 'tv':
        music = np.zeros(n); i = 0
        while i < n:
            L = int(rng.uniform(1.5, 2.5) * sr); root = rng.integers(48, 72)
            seg = np.arange(min(L, n - i)) / sr
            for iv in (0, 4 if rng.random() < 0.5 else 3, 7):
                f = 440 * 2 ** ((root + iv - 69) / 12)
                music[i:i + len(seg)] += sum(a * np.sin(2 * np.pi * f * (h + 1) * seg) for h, a in enumerate([1, 0.5, 0.3, 0.2])) * np.minimum(1, seg / 0.02) * np.exp(-seg * 0.4)
            i += L
        noise = noise / noise.std() + 0.5 * music / music.std()
elif kind == 'traffic':
    swell = np.zeros(n); i = 0
    while i < n:
        L = int(rng.uniform(4, 9) * sr); c = i + L // 2; w = L / 5
        swell += np.exp(-((np.arange(n) - c) / w) ** 2) * rng.uniform(0.5, 1.2); i += L
    swell = 0.25 + swell
    hiss = colored(0); X = np.fft.rfft(hiss); f = np.fft.rfftfreq(n, 1 / sr); X[(f < 700) | (f > 4000)] = 0; hiss = np.fft.irfft(X, n)
    noise = (colored(2) / colored(2).std() + 0.3 * hiss / hiss.std()) * swell
else: noise = np.zeros(n)

P = lambda x: float(np.mean(x ** 2))
if kind != 'none': noise *= np.sqrt(P(tone) / (P(noise) * 10 ** (spec.get('snrDb', 10) / 10)))
full = tone + (noise if kind != 'none' else 0)
scale = 0.6 / np.abs(full).max()   # noise-only files keep the level the noise has under the tone
x = (noise if kind != 'none' else 0 * tone) * scale if spec.get('toneOff') else full * scale
with wave.open(out, 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((x * 32767).astype('<i2').tobytes())
print(json.dumps({'snrDbActual': round(10 * np.log10(P(tone) / P(noise)), 2) if kind != 'none' else None}))
