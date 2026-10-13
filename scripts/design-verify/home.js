// Phase 3 guard (PHASE3.md §1a): Home and the Coach tab, master against the branch, in the same seeded states
// (homeStates.js: new, priority, weakest, struggling, today, expired, signedout). One throwaway account (deleted at exit),
// the local builds against the production backend, 390x844, English. For each state:
//  - Home's mission label, percentage, message and CTA target panel identical on master and the branch; on the branch
//    computeTodaysFocus() returns the same values.
//  - which hero shows (mission, signed out, trial complete) identical.
//  - the Coach tab's #coachFocus (branch) shows the same label and target; hidden signed out.
//  - all 23 [data-enter-panel] buttons in #panel-train-hub exist, and clicking each opens its panel (as on master).
//  - every "Best" value on a Coach row equals the Personal Records value for the same progress (branch).
//  - the Personal Records list (renderRecordsList) renders byte-identical HTML on master and the branch.
//  - #homeVlCard's previous element sibling is #homeChoirCard (batch3c), and #homeChoirCard's text is identical on
//    master and the branch, whitespace aside (p9/p10): its DOM text (textContent; the label's CSS uppercase aside), with
//    emoji dropped (Home's 🎼 and 📈 become sprite icons); #homeCwDelta's innerText (what p10 reads) identical.
// Usage: node scripts/design-verify/home.js [--base <git ref>]   (default base: master)
const C = require('./common'), H = require('./homeStates');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'master';
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(70)} ${detail}`); };
const short = v => { const s = typeof v === 'string' ? v : JSON.stringify(v); return s && s.length > 110 ? s.slice(0, 107) + '…' : s; };

// In the page, Home drawn: what it shows, and where its button goes (enterPanel stubbed for the click).
function readHome() {
  const vis = id => { const el = document.getElementById(id); return !!el && el.getClientRects().length > 0 && getComputedStyle(el).display !== 'none'; };
  const go = sel => { const el = document.querySelector(sel); if (!el) return null; const real = window.enterPanel; let to = null;
    window.enterPanel = p => { to = p; }; try { el.click(); } finally { window.enterPanel = real; } return to; };
  const norm = s => (s || '').replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '').replace(/\s+/g, ' ').trim();
  const card = document.getElementById('homeChoirCard');
  return {
    hero: vis('homeMissionCard') ? 'mission' : vis('homeSignedOutCard') ? 'signedout' : vis('homeTrialCompleteCard') ? 'trialcomplete' : 'none',
    label: document.getElementById('homeMissionLabel').textContent, pct: document.getElementById('homeMissionPct').textContent,
    msg: document.getElementById('homeMissionMsg').textContent, panel: vis('homeMissionCard') ? go('#homeMissionCta') : null,
    choirText: card && card.style.display !== 'none' ? norm(card.textContent) : '(hidden)',
    delta: (() => { const d = document.getElementById('homeCwDelta'); return d ? d.innerText.replace(/^📈\s*/, '').replace(/\s+/g, ' ').trim() : null; })(),
    vlPrev: (document.getElementById('homeVlCard').previousElementSibling || {}).id || null,
    focus: typeof computeTodaysFocus === 'function' && profile ? computeTodaysFocus() : null,
  };
}
// In the page: the Coach tab (the hub shown), its focus block and the rows' end values.
function readCoach() {
  showShellSection('train');
  const f = document.getElementById('coachFocus');
  const shown = !!f && f.getClientRects().length > 0 && getComputedStyle(f).display !== 'none';
  let panel = null;
  if (shown) { const btn = f.querySelector('button'), real = window.enterPanel; window.enterPanel = p => { panel = p; }; try { btn.click(); } finally { window.enterPanel = real; } }
  const label = shown ? (f.querySelector('.hl-h3') || {}).textContent : null;
  const ends = {};
  document.querySelectorAll('#panel-train-hub [data-enter-panel]').forEach(b => { const e = b.querySelector('.coach-best'); ends[b.dataset.enterPanel] = e && e.textContent.trim() ? e.textContent.trim() : null; });
  // the Personal Records list for the same progress
  renderRecordsList();
  const html = ['recordsListVoice', 'recordsListWorld', 'recordsListSongs'].map(id => document.getElementById(id).innerHTML).join('\n');
  const rec = {}; document.querySelectorAll('#recordsListVoice .record-row').forEach(r => { const v = r.querySelector('.record-val'); rec[r.querySelector('.record-label').textContent] = v.classList.contains('untracked') ? null : v.textContent; });
  const L = k => rec[t(k)];
  const lo = L('record_label_lowest_note'), hi = L('record_label_highest_note');
  const fill = v => v === null || v === undefined ? null : t('coach_best_tpl').replace('{v}', v);
  const expected = typeof personalRecordValues === 'function' ? {
    tuner: fill(L('record_label_best_stability')), range: lo && hi ? `${lo}–${hi}` : null, register: fill(L('record_label_longest_crossing')),
    breath: fill(L('record_label_longest_breath')), exercises: fill(L('record_label_best_pitch_acc')) } : null;
  return { shown, label, panel, ends, expected, html, n: document.querySelectorAll('#panel-train-hub [data-enter-panel]').length };
}
// In the page: click each tool button on the Coach tab; which panels opened.
async function clickTools() {
  const keys = [...document.querySelectorAll('#panel-train-hub [data-enter-panel]')].map(b => b.dataset.enterPanel), out = {};
  for (const k of keys) {
    showShellSection('train');
    for (const id of ['onboardingOverlay', 'levelupOverlay', 'newRecordOverlay', 'breakthroughOverlay', 'paywallModalOverlay', 'signinRequiredOverlay']) { const o = document.getElementById(id); if (o) o.style.display = 'none'; }
    document.querySelector(`#panel-train-hub [data-enter-panel="${k}"]`).click();
    await new Promise(r => setTimeout(r, 150));
    out[k] = !!document.querySelector(`#panel-${k}.active`);
    if (typeof stopAllActiveSessions === 'function') stopAllActiveSessions();
  }
  showShellSection('train');
  return out;
}

async function side(b, dir, state, name) {
  const { ctx, page, errors } = await C.openPage(b, { dir, storageState: name === 'signedout' ? undefined : state });
  try {
    await C.clearOverlays(page);
    await H.seed(page, name);
    const home = await page.evaluate(readHome);
    if (name !== 'signedout') await page.evaluate(H.seedInPage, name); // again, right before the Coach tab is read
    const coach = await page.evaluate(readCoach);
    const tools = await page.evaluate(clickTools);
    return { home, coach, tools, errors };
  } finally { await ctx.close(); }
}

(async () => {
  const dirs = { master: C.buildDir(BASE), branch: C.buildDir(null) };
  const b = await C.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  try {
    console.log(`== home · ${BASE} vs branch (working copy)`);
    const { ctx, page } = await C.openPage(b, { dir: dirs.branch });
    await C.signUp(page, 'dvhome', 'Home Check');
    const state = await ctx.storageState(); await ctx.close();
    for (const name of H.HOME_STATES) {
      console.log(`\n-- ${name}`);
      const m = await side(b, dirs.master, state, name), r = await side(b, dirs.branch, state, name);
      check('hero shown', m.home.hero === r.home.hero, `${m.home.hero} | ${r.home.hero}`);
      for (const k of ['label', 'pct', 'msg', 'panel']) check(`mission ${k}`, m.home[k] === r.home[k], short(r.home[k]));
      if (m.home.hero === 'mission') {
        const f = r.home.focus;
        check('computeTodaysFocus() = Home', !!f && f.label === r.home.label && f.pct + '%' === r.home.pct && f.msg === r.home.msg && f.panel === r.home.panel, short(f));
      }
      const signedIn = name !== 'signedout';
      if (signedIn) check('Coach focus: same label and target as Home\'s focus', r.coach.shown && !!r.home.focus && r.coach.label === r.home.focus.label && r.coach.panel === r.home.focus.panel, `${r.coach.label} → ${r.coach.panel}`);
      else check('Coach focus hidden signed out', !r.coach.shown);
      check('23 tool buttons on the Coach tab', m.coach.n === 23 && r.coach.n === 23, `${m.coach.n} | ${r.coach.n}`);
      const opened = Object.values(r.tools).filter(Boolean).length, mOpened = Object.values(m.tools).filter(Boolean).length;
      const differ = Object.keys(m.tools).filter(k => m.tools[k] !== r.tools[k]);
      check('each tool button opens its panel (as on master)', opened === 23 && !differ.length, `${mOpened} | ${opened}${differ.length ? ' differ: ' + differ.join(',') : ''}`);
      if (signedIn) {
        const keys = Object.keys(r.coach.ends), exp = r.coach.expected || {}, bad = r.coach.expected ? keys.filter(k => (exp[k] ?? null) !== r.coach.ends[k]) : ['(no personalRecordValues on this build)'];
        check('Coach "Best" values = Personal Records', !bad.length, bad.length ? bad.map(k => `${k}: ${r.coach.ends[k]} vs ${exp[k] ?? null}`).join('; ') : short(Object.fromEntries(keys.filter(k => r.coach.ends[k]).map(k => [k, r.coach.ends[k]]))));
      }
      check('Personal Records list: same HTML', m.coach.html === r.coach.html, `${m.coach.html.length} chars`);
      if (m.coach.html !== r.coach.html && process.env.HOME_DEBUG) console.log(m.coach.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), '\n---\n', r.coach.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
      check('#homeVlCard follows #homeChoirCard', m.home.vlPrev === 'homeChoirCard' && r.home.vlPrev === 'homeChoirCard', r.home.vlPrev);
      check('#homeChoirCard text identical', m.home.choirText === r.home.choirText, short(r.home.choirText));
      check('#homeCwDelta as p10 reads it identical', m.home.delta === r.home.delta, short(r.home.delta));
      check('no page errors', !m.errors.length && !r.errors.length, [...m.errors, ...r.errors].slice(0, 2).join(' | ') || 'none');
    }
  } finally {
    await b.close();
    console.log(`\n${pass} passed, ${fail} failed`);
    process.exitCode = fail ? 1 : 0;
    C.cleanup();
  }
})();
