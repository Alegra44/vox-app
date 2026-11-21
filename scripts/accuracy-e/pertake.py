# per take (VocalSet) and per wobble seed: the mean over its notes of each tool number, switch vs blend
import json, sys, collections
R = json.load(open(sys.argv[1])); G = collections.defaultdict(list)
for r in R:
    if r['set'].startswith('vs'): G[r['take']].append(r)
    elif r['set'].startswith('wobble') and '6 s' in r['label']: G[r['label']].append(r)
worst = {}
for k, rs in G.items():
    m = lambda side, key: sum(r[side][key] for r in rs) / len(rs)
    d = {key: round(m('bl', key)) - round(m('sw', key)) for key in ('acc6', 'acc9', 'stab')}
    d['med'] = round(m('bl', 'med') - m('sw', 'med'), 1)
    print(f"{k:28} notes {len(rs):2}  switch acc6 {m('sw','acc6'):5.1f} acc9 {m('sw','acc9'):5.1f} stab {m('sw','stab'):6.1f} | Δ {d}")
