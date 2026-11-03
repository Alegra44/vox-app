# Phase 5 survey (PHASE5_SURVEY.md, "Copy problems"): per Choir World section, its translation keys checked in en/fr/es/tr
# for §7 words, emoji and a missing language, plus English text in markup without data-i18n. Line ranges are master 7296998.
# Usage: python3 scripts/design-verify/survey5/cwcopy.py
import re, sys, json, os
L = open(os.path.join(os.path.dirname(__file__), '../../../deploy/index.html'), encoding='utf8').read().split('\n')
def rng(a, b): return '\n'.join(L[a-1:b])
# translations
T = {}; cur = None
for i, line in enumerate(L[6280:12300], 6281):
    m = re.match(r'^  (en|fr|es|tr): *\{', line)
    if m: cur = m.group(1); T[cur] = {}; continue
    if cur:
        for m in re.finditer(r"""([A-Za-z0-9_]+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)""", line):
            T[cur][m.group(1)] = (m.group(2)[1:-1], i)
SECTIONS = {
 'Songs hub':             ([(2390, 2443)], []),
 'Choir Workspace':       ([(4421, 4452), (4471, 4545), (4571, 4579)], [(13802, 13909), (20831, 20996)]),
 'Song Difficulty':       ([(4451, 4451)], [(18185, 18300)]),
 'Song DNA':              ([(4453, 4459)], []),
 'Sonic X-Ray + Microscope + Harmony Vision': ([(4461, 4469)], [(15051, 15259)]),
 'Rehearsal (I Am the Part)': ([(4582, 4603), (4613, 4640)], [(14783, 15051)]),
 'A Cappella':            ([(4600, 4601), (4613, 4613)], [(15259, 15279)]),
 'Readiness':             ([(4604, 4611)], [(16553, 16663)]),
 'Breath Map':            ([(4642, 4650)], [(15462, 15539)]),
 'Harmony Memory':        ([(4652, 4663)], [(15539, 15721)]),
 'Bosses / Chaos / Ladder': ([(4665, 4713)], [(15721, 16102)]),
 'Entrance & Cutoff':     ([(4715, 4727)], [(15279, 15462)]),
 'Your Choir':            ([(4547, 4562)], [(16102, 16385)]),
 'Performance Report / Why': ([], [(16385, 16553)]),
 'Choir DNA':             ([(4564, 4569)], [(16663, 16701)]),
 'Locked preview':        ([], [(16701, 16768)]),
 'Hooks (milestones, achievements)': ([], [(16768, 16904)]),
 'Choir Passport':        ([(4381, 4418)], [(16904, 16988)]),
}
BANNED = {
 'en': r"\b(real|really|genuinely|genuine|honest|honestly|not a demo|fake|PRD|GainNode|autocorrelation|engine)\b|§",
 'fr': r"\b(vrai|vraie|vrais|vraies|vraiment|réel|réelle|réels|réelles|réellement|honnête|honnêtement|factice|PRD|GainNode|autocorrélation)\b|§",
 'es': r"\b(real|reales|realmente|de verdad|honesto|honesta|honestamente|falso|falsa|PRD|GainNode|autocorrelación)\b|§",
 'tr': r"(gerçek|gerçekten|dürüst|sahte|\bPRD\b|GainNode|otokorelasyon|§)",
}
EMOJI = re.compile('[\U0001F300-\U0001FAFF☀-➿⭐⬆⬇⏱⏸⏹▶⬛]')
out = {}
for name, (mk, js) in SECTIONS.items():
    keys = set(); hard = []
    for a, b in mk:
        for i in range(a, b + 1):
            line = L[i-1]
            keys.update(re.findall(r'data-i18n="([^"]+)"', line))
            # English text in an element without data-i18n
            for m in re.finditer(r'<(button|span|div|p|label|h2|small|a)\b([^>]*)>([^<]*[A-Za-z]{3,}[^<]*)<', line):
                if 'data-i18n' in m.group(2): continue
                txt = m.group(3).strip()
                if txt: hard.append((i, txt[:90]))
            m = re.search(r'</[a-z]+>\s*([^<]*[A-Za-z]{3,}[^<]*)\s*</label>', line)
            if m: hard.append((i, m.group(1).strip()[:90]))
    for a, b in js:
        src = rng(a, b)
        keys.update(re.findall(r"""\bt\(\s*['"]([A-Za-z0-9_]+)['"]""", src))
        keys.update(re.findall(r"""['"]([a-z]{2,4}_[a-z0-9_]+)['"]""", src))
    keys = sorted(k for k in keys if k in T['en'])
    probs = []
    for k in keys:
        for lg in ('en', 'fr', 'es', 'tr'):
            if k not in T[lg]: probs.append(f'{k} [{lg}] missing'); continue
            v = T[lg][k][0]
            for w in set(x if isinstance(x, str) else ''.join(x) for x in re.findall(BANNED[lg], v, re.I)):
                probs.append(f'{k} [{lg}] §7 word "{w}" (line {T[lg][k][1]})')
            em = set(EMOJI.findall(v))
            if em: probs.append(f'{k} [{lg}] emoji {"".join(sorted(em))}')
            if lg != 'en' and v == T['en'][k][0] and re.search(r'[A-Za-z]{4,} [A-Za-z]{3,}', v): probs.append(f'{k} [{lg}] same as English')
    out[name] = {'keys': len(keys), 'hard': hard, 'probs': probs}
for name, o in out.items():
    print(f'\n## {name}: {o["keys"]} keys')
    for i, h in o['hard']: print(f'  hard-coded (line {i}): {h}')
    for p in o['probs']: print('  ' + p)
