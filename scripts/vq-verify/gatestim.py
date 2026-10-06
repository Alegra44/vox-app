# Stimuli for noisegate.js ("is someone singing" gate), written to $VOXCOACH_TESTDATA (~/VoxCoachTestData)/gate. Usage: python gatestim.py
# Needs: vibfix.js's stims ($VOXCOACH_TESTDATA (~/VoxCoachTestData)/vibfix/stim-*.wav, for the reference sung level), noisy2.py, and in
# $VOXCOACH_TESTDATA (~/VoxCoachTestData)/vocalset the VocalSet clips breathy-<row>.wav / pp-<row>.wav (Hugging Face mirror
# Bill13579/vocalset-mirror, labels 1 = breathy, 8 = pp; CC BY 4.0), and in gate/ the public-domain recordings (downloaded
# to gate/src) as 42 s, 48 kHz mono WAVs real-speech-alice / real-speech-holmes (LibriVox: alice_in_wonderland_librivox ch. 1 from 95 s,
# adventures_holmes ch. 3 from 300 s) and real-tv-bonanza-a / -b (archive.org bonanzapd, s01e20 from 600 s / 1500 s),
# decoded with ffmpeg (pip install imageio-ffmpeg):  ffmpeg -ss <s> -t 42 -i <src> -vn -ac 1 -ar 48000
#   -af loudnorm=I=-20:TP=-4 -c:a pcm_s16le gate/real-<name>.wav
# Noise alone is scaled against a typical sung level on this mic chain (vibfix stim S1): at SNR s, noise-<k>-<s>.wav is
# what the mic hears when the singer stops.
import json, os, subprocess, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
TMP = os.environ.get('VOXCOACH_TESTDATA') or os.path.join(os.path.expanduser('~'), 'VoxCoachTestData')  # scripts/testdata.js
OUT = os.path.join(TMP, 'gate'); VS = os.path.join(TMP, 'vocalset')
os.makedirs(OUT, exist_ok=True)
def rd(p):
    w = wave.open(p); sr = w.getframerate(); x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(float) / 32768
    if sr != 48000: x = np.interp(np.arange(int(len(x) * 48000 / sr)) * sr / 48000, np.arange(len(x)), x)
    return x
def wr(p, x):
    w = wave.open(p, 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(48000)
    w.writeframes((np.clip(x, -1, 1) * 32767).astype(np.int16).tobytes()); w.close()
P = lambda x: float(np.mean(x ** 2))
act = lambda x: x[np.abs(x) > 0.02 * np.abs(x).max()]
level = lambda x, p, snr: x / np.sqrt(P(x)) * np.sqrt(p / 10 ** (snr / 10))
refP = P(act(rd(os.path.join(TMP, 'vibfix', 'stim-S1.wav'))))
raw = {}
for k in ['talker', 'tv', 'babble', 'traffic', 'white', 'pink', 'rumble']:
    f = os.path.join(OUT, f'raw-{k}.wav')
    if not os.path.exists(f): subprocess.check_call(['python', os.path.join(HERE, 'noisy2.py'), f, json.dumps({'f0': 220, 'seconds': 40, 'noise': k, 'snrDb': 0, 'seed': 11, 'toneOff': True})])
    raw[k] = rd(f)
    for snr in (10, 20): wr(os.path.join(OUT, f'noise-{k}-{snr}.wav'), level(raw[k], refP, snr))
for f in sorted(os.listdir(OUT)):
    if f.startswith('real-') and f.endswith('.wav'):
        for snr in (10, 20): wr(os.path.join(OUT, f'noise-real{f[5:-4]}-{snr}.wav'), level(rd(os.path.join(OUT, f)), refP, snr))
loop = lambda x, L: np.concatenate([x, x[::-1]] * (L // (2 * len(x)) + 1))[:L]
for f in sorted(os.listdir(VS)):
    if not (f.startswith('breathy-') or f.startswith('pp-')): continue
    v = loop(rd(os.path.join(VS, f)), 48000 * 40); v = v / np.abs(v).max() * (0.6 if f.startswith('breathy') else 0.15)  # pp kept soft
    wr(os.path.join(OUT, f'sing-{f[:-4]}.wav'), v)
    if f.startswith('breathy'):
        for k in ['talker', 'white', 'traffic']: wr(os.path.join(OUT, f'mix-{f[:-4]}-{k}-10.wav'), v + level(raw[k][:len(v)], P(act(v)), 10))
print('ok')
