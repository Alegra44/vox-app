# Phase 6 survey (PHASE6_SURVEY.md, "Copy problems"): per Songs-tab solo tool, its translation keys checked in en/fr/es/tr
# for §7 words, emoji and a missing language, plus English text in markup without data-i18n. Line ranges are master 6266166 (phase 5 live).
# Usage: python3 scripts/design-verify/survey6/copy6.py
import re, sys, json, os
L = open(os.path.join(os.path.dirname(__file__), '../../../deploy/index.html'), encoding='utf8').read().split('\n')
def rng(a, b): return '\n'.join(L[a-1:b])
# translations
T = {}; cur = None
for i, line in enumerate(L[6555:12810], 6556):
    m = re.match(r'^  (en|fr|es|tr): *\{', line)
    if m: cur = m.group(1); T[cur] = {}; continue
    if cur:
        for m in re.finditer(r"""([A-Za-z0-9_]+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)""", line):
            T[cur][m.group(1)] = (m.group(2)[1:-1], i)
SECTIONS = {
 'Songs hub (the six cards)': ([(2621, 2652)], []),
 'Studio Mode':           ([(4377, 4400)], [(23541, 23590)]),
 'AI Duet Partner':       ([(4402, 4419)], [(24127, 24165)]),
 'Performance Director':  ([(4421, 4450)], [(23749, 23888)]),
 'Stay in Key':           ([(3934, 3964)], [(14441, 14535)]),
 'Emotional Singing':     ([(3966, 3986)], [(14536, 14620)]),
 'Karaoke Coach':         ([(4010, 4038)], [(14717, 14903)]),
 'Performance Report (Choir World, shared)': ([], [(17088, 17151)]),
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
