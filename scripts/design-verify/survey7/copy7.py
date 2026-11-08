# Phase 7 survey (PHASE7_SURVEY.md, "Copy problems"): per You screen, its translation keys checked in en/fr/es/tr for
# §7 words, emoji and a missing or untranslated language, plus English text in markup without data-i18n. The same
# checks as survey6/copy6.py; markup ranges are found by panel id and code ranges by function name (redesign/phase7).
# Usage: python3 scripts/design-verify/survey7/copy7.py
import re, os
L = open(os.path.join(os.path.dirname(__file__), '../../../deploy/index.html'), encoding='utf8').read().split('\n')
# translations: the en/fr/es/tr blocks of TRANSLATIONS
T = {}; cur = None
for i, line in enumerate(L, 1):
    m = re.match(r'^  (en|fr|es|tr): *\{', line)
    if m: cur = m.group(1); T[cur] = {}; continue
    if cur and re.match(r'^  \};?\s*$', line): cur = None; continue
    if cur:
        for m in re.finditer(r"""([A-Za-z0-9_]+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)""", line):
            T[cur][m.group(1)] = (m.group(2)[1:-1], i)
def panel(pid):  # markup lines of <section id="panel-…"> up to its </section>
    a = next(i for i, l in enumerate(L, 1) if f'id="panel-{pid}"' in l)
    b = next(i for i in range(a, len(L)) if L[i-1].strip() == '</section>')
    return (a, b)
FN = [(i, m.group(1)) for i, l in enumerate(L, 1) for m in [re.match(r'^(?:async )?function ([A-Za-z0-9_]+)\(', l)] if m]
def fn(name):
    k = next(j for j, (_, n) in enumerate(FN) if n == name)
    return (FN[k][0], (FN[k+1][0] - 1) if k + 1 < len(FN) else len(L))
SECTIONS = {
 'You hub':            ([panel('you-hub')], []),
 '21-Day Journey':     ([panel('journey')], [fn('renderJourney'), fn('renderAchievements'), fn('renderSnapshotCompare'), fn('renderJourneyChoirMilestone'), fn('levelForXp')]),
 'Dashboard & Skill Profile': ([panel('dashboard')], [fn('renderDashboard'), fn('renderSkillProfile'), fn('renderWeeklyChallenge'), fn('renderTodaysPlan')]),
 'Personal Records':   ([panel('records')], [fn('personalRecordValues'), fn('renderRecordsList')]),
 'Vocal Passport':     ([panel('passport')], [fn('renderVoiceFingerprint'), fn('renderVocalPassport'), fn('logTimelineEvent'), fn('checkNewAchievementsForTimeline')]),
 'Voice Health':       ([panel('voicehealth')], [fn('renderVoiceHealthChart'), fn('renderVoiceHealth'), fn('checkVocalHealthSignal')]),
 'Profile & settings': ([panel('profile')], [fn('renderProfile'), fn('renderVoiceCard'), fn('renderSkillTree')]),
}
BANNED = {
 'en': r"\b(real|really|genuinely|genuine|honest|honestly|not a demo|fake|PRD|GainNode|autocorrelation|engine)\b|§",
 'fr': r"\b(vrai|vraie|vrais|vraies|vraiment|réel|réelle|réels|réelles|réellement|honnête|honnêtement|factice|PRD|GainNode|autocorrélation)\b|§",
 'es': r"\b(real|reales|realmente|de verdad|honesto|honesta|honestamente|falso|falsa|PRD|GainNode|autocorrelación)\b|§",
 'tr': r"(gerçek|gerçekten|dürüst|sahte|\bPRD\b|GainNode|otokorelasyon|§)",
}
EMOJI = re.compile('[\U0001F300-\U0001FAFF☀-➿⭐⬆⬇⏱⏸⏹▶⬛]')
for name, (mk, js) in SECTIONS.items():
    keys = set(); hard = []
    for a, b in mk:
        for i in range(a, b + 1):
            line = L[i-1]
            keys.update(re.findall(r'data-i18n="([^"]+)"', line))
            for m in re.finditer(r'<(button|span|div|p|label|h2|small|a)\b([^>]*)>([^<]*[A-Za-z]{3,}[^<]*)<', line):
                if 'data-i18n' in m.group(2): continue
                txt = m.group(3).strip()
                if txt: hard.append((i, txt[:90]))
    for a, b in js:
        src = '\n'.join(L[a-1:b])
        keys.update(re.findall(r"""\bt\(\s*['"]([A-Za-z0-9_]+)['"]""", src))
    keys = sorted(k for k in keys if k in T['en'])
    missing_en = sorted(k for a, b in mk for i in range(a, b + 1) for k in re.findall(r'data-i18n="([^"]+)"', L[i-1]) if k not in T['en'])
    probs = [f'{k} [en] missing (data-i18n with no key)' for k in missing_en]
    for k in keys:
        for lg in ('en', 'fr', 'es', 'tr'):
            if k not in T[lg]: probs.append(f'{k} [{lg}] missing'); continue
            v = T[lg][k][0]
            for w in sorted(set(x if isinstance(x, str) else ''.join(x) for x in re.findall(BANNED[lg], v, re.I))):
                probs.append(f'{k} [{lg}] §7 word "{w}"')
            em = set(EMOJI.findall(v))
            if em: probs.append(f'{k} [{lg}] emoji {"".join(sorted(em))}')
            if lg != 'en' and v == T['en'][k][0] and re.search(r'[A-Za-z]{4,} [A-Za-z]{3,}', v): probs.append(f'{k} [{lg}] same as English')
    print(f'\n## {name}: {len(keys)} keys · markup {mk} · code {js}')
    for i, h in hard: print(f'  hard-coded (line {i}): {h}')
    for p in probs: print('  ' + p)
