# Phase 7 build helper: add or rewrite TRANSLATIONS keys in en, fr, es and tr at once (deploy/index.html).
# Input: a JSON file {"key": ["en", "fr", "es", "tr"], ...}. A key that exists in a language block gets its value
# replaced in place; a new key is appended at the end of that block, under a "phase 7" comment. Values are written as
# JSON strings (valid JS). Prints what it did per key. Usage: python3 scripts/design-verify/survey7/keys7.py <file.json>
import json, re, sys, os
P = os.path.join(os.path.dirname(__file__), '../../../deploy/index.html')
keys = json.load(open(sys.argv[1], encoding='utf8'))
src = open(P, encoding='utf8').read()
LANGS = ['en', 'fr', 'es', 'tr']
VAL = r"""('(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`)"""
def block(s, lg):
    a = re.search(rf'^  {lg}: *\{{', s, re.M).end()
    b = re.compile(r'^  \},?\s*$', re.M).search(s, a).start()
    return a, b
for k, vals in keys.items():
    assert len(vals) == 4, k
for i, lg in enumerate(LANGS):
    a, b = block(src, lg); body = src[a:b]; added = []
    for k, vals in keys.items():
        v = json.dumps(vals[i], ensure_ascii=False)
        m = re.search(rf'(?<![A-Za-z0-9_]){re.escape(k)}\s*:\s*{VAL}', body)
        if m:
            body = body[:m.start()] + f'{k}:{v}' + body[m.end():]
            print(f'{lg} {k}: replaced')
        else:
            added.append(f'    {k}:{v},')
    if added:
        if not body.rstrip().endswith(','): body = body.rstrip() + ',\n'
        marker = '    // phase 7 (PHASE7.md)\n'
        if marker not in body: body = body.rstrip('\n') + '\n' + marker
        body = body.rstrip('\n') + '\n' + '\n'.join(added) + '\n'
        print(f'{lg}: {len(added)} added')
    src = src[:a] + body + src[b:]
open(P, 'w', encoding='utf8').write(src)
