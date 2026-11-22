# the branch's vibratoTolerantCents (blend.js on the working copy) against master's (blend.js --ref master), note by note
import json, sys, collections
M, B = (json.load(open(f)) for f in sys.argv[1:3]); assert len(M) == len(B)
sets = collections.OrderedDict()
for m, b in zip(M, B):
    assert m['label'] == b['label']; sets.setdefault(m['set'], []).append((m, b))
ok = True
for s, rows in sets.items():
    d = {k: max(abs(round(b['sw'][k]) - round(m['sw'][k])) for m, b in rows) for k in ('acc6', 'acc9', 'stab')}
    better = {k: sum(round(b['sw'][k]) > round(m['sw'][k]) for m, b in rows) for k in ('acc6', 'acc9', 'stab')}
    st = [round(b['sw']['stab']) for m, b in rows]
    line = f"{s:12} notes {len(rows):4} · branch stab {min(st)}–{max(st)} · per-note |Δ| max {d} · scoring better than master {better}"
    if s == 's1': line += f"  → spread {max(st) - min(st)} {'PASS' if max(st) - min(st) <= 3 else 'FAIL'}"
    if s.startswith('wobble'): line += f"  → {'PASS' if not any(better.values()) else 'FAIL'} (no better)"
    print(line)
# per take (VocalSet): the mean over its notes, each number within ±2
T = collections.defaultdict(list)
for m, b in zip(M, B):
    if m['set'].startswith('vs'): T[m['take']].append((m, b))
for t, rows in T.items():
    d = {k: round(sum(b['sw'][k] for m, b in rows) / len(rows)) - round(sum(m['sw'][k] for m, b in rows) / len(rows)) for k in ('acc6', 'acc9', 'stab')}
    print(f"  {t:14} {len(rows):2} notes · Δ take mean {d} {'PASS' if all(abs(v) <= 2 for v in d.values()) else 'FAIL'}")
