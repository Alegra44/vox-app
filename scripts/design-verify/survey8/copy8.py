# Phases 8 and 9 survey (PHASE8_SURVEY.md, "Copy problems"): per remaining screen, its translation keys checked in
# en/fr/es/tr for §7 words, emoji and a missing or untranslated language; English text in markup without data-i18n
# (it may still be set from code by id: the survey's French screenshots tell which); and English literals in code
# (showToast, textContent / innerHTML strings) that skip t(). The same checks as survey7/copy7.py; markup ranges are found
# by element id (balanced tags) and code ranges by function name.
# Usage: python3 scripts/design-verify/survey8/copy8.py
import re, os
L = open(os.path.join(os.path.dirname(__file__), '../../../deploy/index.html'), encoding='utf8').read().split('\n')
T = {}; cur = None
for i, line in enumerate(L, 1):
    m = re.match(r'^  (en|fr|es|tr): *\{', line)
    if m: cur = m.group(1); T[cur] = {}; continue
    if cur and re.match(r'^  \};?\s*$', line): cur = None; continue
    if cur:
        for m in re.finditer(r"""([A-Za-z0-9_]+)\s*:\s*('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`)""", line):
            T[cur][m.group(1)] = (m.group(2)[1:-1], i)
def el(eid):  # markup lines of the element with this id, to its balanced closing tag
    a = next(i for i, l in enumerate(L, 1) if re.search(rf'\bid="{re.escape(eid)}"', l) and '<' in l)
    tag = re.search(rf'<([a-z]+)\b[^>]*\bid="{re.escape(eid)}"', L[a-1]).group(1); depth = 0
    for i in range(a, len(L) + 1):
        seg = L[i-1] if i > a else L[a-1][L[a-1].index(f'id="{eid}"'):]
        depth += len(re.findall(rf'<{tag}\b', seg)) + (1 if i == a else 0) - len(re.findall(rf'</{tag}>', seg))
        if depth <= 0: return (a, i)
    return (a, len(L))
FN = [(i, m.group(1)) for i, l in enumerate(L, 1) for m in [re.match(r'^(?:async )?function ([A-Za-z0-9_]+)\(', l)] if m]
def fn(name):
    k = next(j for j, (_, n) in enumerate(FN) if n == name)
    return (FN[k][0], (FN[k+1][0] - 1) if k + 1 < len(FN) else len(L))
def fns(*names): return [fn(n) for n in names]
SECTIONS = {
 # phase 8: Vocal World
 '8 · World hub':      ([el('arcadeHub')], fns('showArcadeHub', 'showArcadeGame', 'renderArcadeLocks', 'updateArcadeBestLabels')),
 '8 · Pitch Mountain (Glider)': ([el('gameGlider')], fns('gliderComputeDifficulty', 'startGlider', 'gliderLoop', 'finishGlider')),
 '8 · Register Canyon (Bridge)': ([el('gameBridge')], fns('startBridgeRunner', 'bridgeLoop', 'finishBridgeRunner')),
 '8 · Boss Arena':     ([el('gameBoss')], fns('startBoss', 'bossFinalizeNote', 'bossLoop', 'finishBoss', 'renderBossMemoryAndRecommendation')),
 '8 · Harmony Castle': ([el('gameHarmony')], fns('scheduleHarmonyDistraction', 'startHarmonyArena', 'harmonyLoop', 'finishHarmonyArena')),
 '8 · Skill Tree':     ([el('gameSkillTree')], fns('renderSkillTree')),
 '8 · Vocal Rift':     ([el('gameRift')], fns('riftGenerateTarget', 'riftParamsFor', 'riftTimerTick', 'riftRunNextRound', 'finishRift')),
 # phase 9: everything else
 '9 · Sign in / sign up': ([el('authModalOverlay'), el('signinRequiredOverlay')], fns('setAuthMode', 'openAuthModal', 'closeAuthModal', 'translateAuthError', 'requireSignIn')),
 '9 · Onboarding':     ([el('onboardingOverlay')], fns('populateOnboardingGrids', 'renderOnboardingStep', 'renderObPlanSummary', 'openOnboarding')),
 '9 · Language chooser': ([el('languageSelectOverlay')], []),
 '9 · Plan & Pricing': ([el('panel-pricing')], fns('showPricingPanel', 'renderPricingState', 'renderTrialCompareRows')),
 '9 · Paywall + checkout': ([el('paywallModalOverlay'), el('checkoutModalOverlay')], fns('openPaywallPrompt', 'closeCheckoutModal')),
 '9 · Teacher Dashboard': ([el('panel-teacher')], fns('renderTeacherDashboard', 'renderTeacherRoster', 'renderTeacherAssignments')),
 '9 · Feedback':       ([el('panel-feedback')], []),
 '9 · Warm-up (pre-session)': ([el('warmupOverlay')], fns('wuOpen', 'wuRender', 'wuStartExercise', 'wuStartSong', 'wuEndRun')),
 '9 · Level up / record / breakthrough': ([el('levelupOverlay'), el('newRecordOverlay'), el('breakthroughOverlay')], fns('levelupWhyText', 'showLevelUp', 'triggerNewRecord', 'triggerBreakthrough')),
 '9 · Share posters':  ([el('shareRangeOverlay'), el('shareRecapOverlay')], fns('exportPoster')),
 '9 · Vocal Lab':      ([el('panel-vocallab')], fns('computeVocalLabTiers', 'renderVocalLab')),
}
BANNED = {
 'en': r"\b(real|really|genuinely|genuine|honest|honestly|not a demo|fake|PRD|GainNode|autocorrelation|engine)\b|§",
 'fr': r"\b(vrai|vraie|vrais|vraies|vraiment|réel|réelle|réels|réelles|réellement|honnête|honnêtement|factice|PRD|GainNode|autocorrélation)\b|§",
 'es': r"\b(real|reales|realmente|de verdad|honesto|honesta|honestamente|falso|falsa|PRD|GainNode|autocorrelación)\b|§",
 'tr': r"(gerçek|gerçekten|dürüst|sahte|\bPRD\b|GainNode|otokorelasyon|§)",
}
EMOJI = re.compile('[\U0001F300-\U0001FAFF☀-➿⭐⬆⬇⏱⏸⏹▶⬛]')
LIT = re.compile(r"""(?:showToast\(|textContent\s*=\s*|innerHTML\s*[+]?=\s*)(['"`])([^'"`]*[A-Za-z]{3,} [A-Za-z]{2,}[^'"`]*)\1""")
total = {}
for name, (mk, js) in SECTIONS.items():
    keys = set(); hard = []; lits = []; emo = []
    for a, b in mk:
        for i in range(a, b + 1):
            line = L[i-1]
            keys.update(re.findall(r'data-i18n="([^"]+)"', line))
            for m in re.finditer(r'<(button|span|div|p|label|h2|h3|small|a|li|option)\b([^>]*)>([^<]*[A-Za-z]{3,}[^<]*)<', line):
                if 'data-i18n' in m.group(2): continue
                txt = m.group(3).strip()
                if txt: hard.append((i, txt[:90]))
            for m in re.finditer(r'placeholder="([^"]*[A-Za-z]{3,}[^"]*)"', line):
                if 'data-i18n-placeholder' not in line: hard.append((i, f'placeholder "{m.group(1)}"'))
            e = set(EMOJI.findall(re.sub(r'<!--.*?-->', '', line)))
            if e: emo.append((i, ''.join(sorted(e))))
    for a, b in js:
        src = '\n'.join(L[a-1:b])
        keys.update(re.findall(r"""\bt\(\s*['"]([A-Za-z0-9_]+)['"]""", src))
        for j, line in enumerate(L[a-1:b], a):
            if line.strip().startswith('//'): continue
            for m in LIT.finditer(line): lits.append((j, m.group(2)[:90]))
            e = set(EMOJI.findall(line.split('//')[0]))
            if e: emo.append((j, ''.join(sorted(e))))
    keys = sorted(k for k in keys if k in T['en'])
    probs = []
    for k in keys:
        for lg in ('en', 'fr', 'es', 'tr'):
            if k not in T[lg]: probs.append(f'{k} [{lg}] missing'); continue
            v = T[lg][k][0]
            for w in sorted(set(x if isinstance(x, str) else ''.join(x) for x in re.findall(BANNED[lg], v, re.I))):
                probs.append(f'{k} [{lg}] §7 word "{w}"')
            em = set(EMOJI.findall(v))
            if em: probs.append(f'{k} [{lg}] emoji {"".join(sorted(em))}')
            if lg != 'en' and v == T['en'][k][0] and re.search(r'[A-Za-z]{4,} [A-Za-z]{3,}', v): probs.append(f'{k} [{lg}] same as English')
    s7 = sorted({p.split(' [')[0] for p in probs if '§7' in p}); ek = sorted({p.split(' [')[0] for p in probs if 'emoji' in p})
    total[name] = (len(keys), len(s7), len(ek), len(hard), len(lits), len(emo))
    print(f'\n## {name}: {len(keys)} keys · markup {mk} · code {js}')
    print(f'  keys with a §7 word ({len(s7)}): {", ".join(s7) or "none"}')
    print(f'  keys with emoji ({len(ek)}): {", ".join(ek) or "none"}')
    for p in probs:
        if '§7' not in p and 'emoji' not in p: print('  ' + p)
    for i, h in hard: print(f'  markup without data-i18n (line {i}): {h}')
    for i, h in lits: print(f'  English literal in code (line {i}): {h}')
    for i, e in emo: print(f'  emoji in markup/code (line {i}): {e}')
print('\n## Summary: keys · §7 keys · emoji keys · markup w/o data-i18n · code literals · emoji lines')
for n, v in total.items(): print(f'  {n:40} ' + ' · '.join(str(x) for x in v))
