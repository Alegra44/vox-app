"""GUARD.md part c: the phone's track, a real voice that isn't the Mac's own output.

Built from VocalSet straight-625.wav (~/VoxCoachTestData/vocalset): its steadiest stretch (3.32-4.90 s, ~A4, ±9 ct),
resampled to each note's pitch (a 1-2 semitone shift) and looped with 40 ms crossfades for long notes, 15 ms fades at
each end. Per tool, one block: a sync beep (2 kHz, 0.3 s), then the voice on the tool's own timeline with its zero
X = 8 s after the beep's start:
  entrance  the Alto part (the rehearsal part), each note sung for its first 70 % (the rest is silence: an entrance each)
  cutoff    the Alto part, each note sung to its end (a release on each cutoff)
  arena     the Alto part (guardvoice.js sets Arena to Alto), each chord for 94 % of it
  memory    the Alto part, each note to its end
  rhythm    8 onsets of A4, 0.2 s each, on the scored beats (100 bpm)
PRE seconds of silence before each beep (the script reloads the page and measures the speaker delay then; the first block
has FIRST_PRE, time to press play). Passes: the blocks for every tool, once per pass (the speakers file: 4 passes).
Usage: [FIRST_PRE=30] python3 -I scripts/guard-verify/phonetrack.py <timeline json> <out.wav> <passes> [tools]   (writes <out>.json, the layout)
"""
import json, sys, wave
import numpy as np

SR = 44100
SRC = '/Users/alegramusenge/VoxCoachTestData/vocalset/straight-625.wav'
SEG = (3.32, 4.90)
import os
X, PRE, FIRST_PRE, TAIL = 8.0, 25.0, float(os.environ.get('FIRST_PRE', 30)), 5.0
TOOLS = sys.argv[4].split(',') if len(sys.argv) > 4 else ['entrance', 'cutoff', 'arena', 'memory', 'rhythm']

tl = json.load(open(sys.argv[1])); out = sys.argv[2]; passes = int(sys.argv[3])
w = wave.open(SRC); src = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
seg = src[int(SEG[0] * SR):int(SEG[1] * SR)]

def f0_of(s):  # median f0 over 2048-sample frames (autocorrelation)
    fs = []
    for i in range(0, len(s) - 2048, 441):
        a = s[i:i + 2048] - s[i:i + 2048].mean(); ac = np.correlate(a, a, 'full')[2047:]
        lo, hi = SR // 1100, SR // 80; k = lo + int(np.argmax(ac[lo:hi]))
        if ac[k] > 0.5 * ac[0]:  # parabolic refinement
            y0, y1, y2 = ac[k - 1], ac[k], ac[k + 1]; d = 0.5 * (y0 - y2) / (y0 - 2 * y1 + y2); fs.append(SR / (k + d))
    return float(np.median(fs))
F0 = f0_of(seg)

def fade(n, ms):
    m = int(SR * ms / 1000); e = np.ones(n)
    r = 0.5 - 0.5 * np.cos(np.linspace(0, np.pi, m)); e[:m] = r; e[-m:] = r[::-1]; return e

def note(midi, dur):
    f = 440 * 2 ** ((midi - 69) / 12); ratio = f / F0
    t = np.arange(0, len(seg) - 1, ratio); res = np.interp(t, np.arange(len(seg)), seg)  # resampled: pitch × ratio
    n = int(dur * SR); xf = int(0.04 * SR); L = len(res); y = np.zeros(n + L)
    win = np.ones(L); win[:xf] = np.linspace(0, 1, xf); win[-xf:] = np.linspace(1, 0, xf)
    pos = 0
    while pos < n:  # overlap-add, 40 ms linear crossfades
        wv = win.copy()
        if pos == 0: wv[:xf] = 1
        y[pos:pos + L] += res * wv; pos += L - xf
    y = y[:n]
    return y * fade(n, 15)

def beep():
    n = int(0.3 * SR); return 0.5 * np.sin(2 * np.pi * 2000 * np.arange(n) / SR) * fade(n, 5)

alto = [(nt['midi'], nt['start'], nt['end']) for nt in tl['lead']]
cd = tl['chordDur']; beat = 60 / tl['rbpm'][tl['rtempo']]
def events(tool):
    if tool == 'entrance': return [(m, s, s + 0.7 * (e - s)) for m, s, e in alto]
    if tool in ('cutoff', 'memory'): return [(m, s, e) for m, s, e in alto]
    if tool == 'arena': return [(m, k * cd, k * cd + cd * 0.94) for k, m in enumerate(tl['hparts']['Alto'])]
    return [(69, j * beat, j * beat + 0.2) for j in range(8)]

blocks, t = [], 0.0
for p in range(passes):
    for tool in TOOLS:
        t += FIRST_PRE if not blocks else PRE
        ev = events(tool); blocks.append({'pass': p + 1, 'tool': tool, 'beep': round(t, 3), 'zero': round(t + X, 3), 'events': ev})
        t += X + max(e for _, _, e in ev) + TAIL
y = np.zeros(int((t + 1) * SR))
for b in blocks:
    i = int(b['beep'] * SR); bp = beep(); y[i:i + len(bp)] += bp
    for m, s, e in b['events']:
        v = note(m, e - s); j = int((b['zero'] + s) * SR); y[j:j + len(v)] += v
y *= 0.7 / np.max(np.abs(y))
with wave.open(out, 'wb') as o:
    o.setnchannels(1); o.setsampwidth(2); o.setframerate(SR); o.writeframes((y * 32767).astype(np.int16).tobytes())
json.dump({'source': SRC, 'segment': SEG, 'f0': F0, 'X': X, 'pre': PRE, 'firstPre': FIRST_PRE, 'blocks': blocks}, open(out + '.json', 'w'), indent=1)
print(f'{out}: {t:.0f} s, {len(blocks)} blocks, source f0 {F0:.1f} Hz')
