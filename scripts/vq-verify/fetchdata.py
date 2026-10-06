# Fetches the recordings the verify scripts need into $VOXCOACH_TESTDATA (default ~/VoxCoachTestData, see
# scripts/testdata.js), skipping what is already there. Then build the stimuli: vibfix.js builds its own; run
# gatestim.py for noisegate's.
#   vocalset/<label>-<row>.wav: VocalSet (Wilkins et al. 2018, CC BY 4.0, doi:10.5281/zenodo.1442513) through the
#     Hugging Face mirror Bill13579/vocalset-mirror, by row (the label is checked); manifest.json lists the vibrato and
#     straight clips realvib.js / vibfix.js read. breathy / pp clips are for gatestim.py.
#   gate/real-*.wav: 42 s, 48 kHz mono, loudness-normalised cuts of public-domain recordings (LibriVox, archive.org),
#     sources kept in gate/src. Needs ffmpeg: pip install imageio-ffmpeg (in the venv).
# Usage: python scripts/vq-verify/fetchdata.py
import json, os, subprocess, urllib.parse, urllib.request
DATA = os.environ.get('VOXCOACH_TESTDATA') or os.path.join(os.path.expanduser('~'), 'VoxCoachTestData')
VS, GATE = os.path.join(DATA, 'vocalset'), os.path.join(DATA, 'gate')
SRC = os.path.join(GATE, 'src')
for d in (VS, SRC): os.makedirs(d, exist_ok=True)

LABELS = {'breathy': 1, 'pp': 8, 'straight': 12, 'vibrato': 16}
CLIPS = {'vibrato': [628, 3131, 1154, 772, 2417, 2961], 'straight': [625, 286],
         'breathy': [5, 562, 1197, 1743, 2353, 3002], 'pp': [92, 646, 1717, 2977]}
def get(url, out):
    tmp = out + '.part'
    with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': 'voxcoach-verify'}), timeout=300) as r, open(tmp, 'wb') as f:
        while True:
            b = r.read(1 << 20)
            if not b: break
            f.write(b)
    os.replace(tmp, out)
for label, rows in CLIPS.items():
    for i in rows:
        out = os.path.join(VS, f'{label}-{i}.wav')
        if os.path.exists(out): continue
        q = urllib.parse.urlencode({'dataset': 'Bill13579/vocalset-mirror', 'config': 'default', 'split': 'train', 'offset': i, 'length': 1})
        row = json.load(urllib.request.urlopen('https://datasets-server.huggingface.co/rows?' + q, timeout=60))['rows'][0]['row']
        if row['label'] != LABELS[label]: raise SystemExit(f'row {i}: label {row["label"]}, expected {label} ({LABELS[label]})')
        get(row['audio'][0]['src'], out); print('vocalset', out)
json.dump([{'file': f'{l}-{i}.wav', 'label': l} for l in ('vibrato', 'straight') for i in CLIPS[l]], open(os.path.join(VS, 'manifest.json'), 'w'), indent=1)

AO = 'https://archive.org/download/'
REAL = [('real-speech-alice', AO + 'alice_in_wonderland_librivox/wonderland_ch_01_64kb.mp3', 95),
        ('real-speech-holmes', AO + 'adventures_holmes/adventureholmes_03_doyle_64kb.mp3', 300),
        ('real-tv-bonanza-a', AO + 'bonanzapd/' + urllib.parse.quote('Bonanza s01e20 THE FEAR MERCHANTS.mp4'), 600),
        ('real-tv-bonanza-b', AO + 'bonanzapd/' + urllib.parse.quote('Bonanza s01e20 THE FEAR MERCHANTS.mp4'), 1500)]
import imageio_ffmpeg
ff = imageio_ffmpeg.get_ffmpeg_exe()
for name, url, start in REAL:
    out = os.path.join(GATE, name + '.wav')
    if os.path.exists(out): continue
    src = os.path.join(SRC, urllib.parse.unquote(url.rsplit('/', 1)[1]))
    if not os.path.exists(src): get(url, src); print('source', src)
    subprocess.check_call([ff, '-y', '-loglevel', 'error', '-ss', str(start), '-t', '42', '-i', src, '-vn', '-ac', '1', '-ar', '48000',
                           '-af', 'loudnorm=I=-20:TP=-4', '-c:a', 'pcm_s16le', out]); print('cut', out)
print('ok:', DATA)
