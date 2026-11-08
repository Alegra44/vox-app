// Phase 3 (PHASE3.md §2.5): every text shown on Home and the Coach tab, in each seeded state (homeStates.js), signed in
// and out, searched for the §7 words that never appear in user-facing text. Prints each hit with the text around it.
// Phase 4a (PHASE4A.md §1d), --tools: the 14 tools (tools.js) in en, fr, es and tr (or --lang), signed in, the fake mic
// singing the steady A4: every text in each tool's panel at idle, on the stage and with its result (the dynamic copy),
// plus every TRANSLATIONS value its panel's data-i18n keys point to. Untranslated English shows in every language, so a
// language's scan also looks for the English words.
// Phase 4b (PHASE4B.md §1f): --tools covers the 10 tools with their own displays (tools4b.js) too; --set 4a | 4b | all
// (the default) picks them.
// Phase 6 (PHASE6.md §1f): --set 6 scans the six Songs-tab solo tools and the Songs tab (tools6.js).
// Phase 7 (PHASE7.md §1b), --you: the You screens (the hub, Journey, Progress, Records, Vocal Passport, Voice Health,
// Profile & settings) in en, fr, es and tr (or --lang), in the seeded states of youSeed.js (signed out, new, active,
// activecw): every text node of each panel plus every TRANSLATIONS value its data-i18n keys point to. Reports the §7
// words and, separately, emoji (PHASE7.md 2.10: none on these screens); exit 1 if either is found.
// Usage: node scripts/design-verify/copyscan.js [--lang en] [--tools] [--set 4b] [--you]
const C = require('./common'), H = require('./homeStates');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const LANG = arg('--lang') || 'en';
const COMMON = 'PRD|GainNode|AudioContext|AnalyserNode|autocorrelation|autocorrélation|autocorrelación|otokorelasyon|Web Audio|API';
// the §7 words, and what each language uses for them
const WORDS = { en: 'real|really|genuinely|honest|honestly|fake|not a demo',
  fr: 'vrai|vraie|vrais|vraies|vraiment|réel|réelle|réels|réelles|réellement|honnête|honnêtement|faux|fausse|pas une démo',
  es: 'real|reales|realmente|de verdad|honesto|honesta|honestamente|falso|falsa|no es una demo',
  tr: 'gerçek\\p{L}*|dürüst\\p{L}*|sahte|demo değil' }; // Turkish adds suffixes: any word that starts with them (review the hits)
const BANNED = new RegExp(`(?<![\\p{L}])(${WORDS[LANG]}|${COMMON})(?![\\p{L}])|§`, 'iu');
async function toolsScan() {
  const S = require('./stage'), T = require('./tools');
  S.ensureStimuli();
  const langs = arg('--lang') ? [LANG] : ['en', 'fr', 'es', 'tr'];
  const b = await S.launchMic(S.STIM.steady); let total = 0;
  try {
    const { ctx, page } = await C.openPage(b, {}); await C.signUp(page, 'dvcopy', 'Copy Check');
    const state = await ctx.storageState(); await ctx.close();
    for (const lang of langs) {
      const re = new RegExp(`(?<![\\p{L}])(${WORDS[lang]}${lang === 'en' ? '' : '|' + WORDS.en}|${COMMON})(?![\\p{L}])|§`, 'iu');
      const hits = new Map(); let n = 0;
      const { ctx, page } = await C.openPage(b, { storageState: state, lang });
      try {
        await C.clearOverlays(page); await S.warmMic(page);
        const add = (tx, where) => { n++; if (re.test(tx)) hits.set(tx, (hits.get(tx) || new Set()).add(where)); };
        const grab = sel => page.evaluate(sel => { const out = []; const w = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
          while (w.nextNode()) { const v = w.currentNode.textContent.replace(/\s+/g, ' ').trim(); if (v) out.push(v); } return out; }, sel);
        for (const tool of require('./tools4b').toolSet().tools) {
          await T.toolStates(page, tool, async (name, root) => { for (const tx of await grab(root)) add(tx, name); });
          // the translations the panel's keys point to (hidden variants included)
          const vals = await page.evaluate(panel => [...new Set([...document.querySelectorAll(`#panel-${panel} [data-i18n]`)].map(e => e.dataset.i18n))].map(k => [k, t(k)]), tool.panel);
          for (const [k, v] of vals) add(v, `${tool.key}: ${k}`);
          await page.evaluate(() => stopAllActiveSessions());
        }
      } finally { await ctx.close(); }
      total += hits.size;
      console.log(`\n== ${lang}: ${n} texts scanned; ${hits.size} with a §7 word:`);
      for (const [tx, where] of hits) console.log(`  [${[...where].slice(0, 4).join(', ')}${where.size > 4 ? ', …' : ''}] ${tx}`);
    }
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${total} texts with a §7 word across ${langs.join(', ')}`);
  process.exitCode = total ? 1 : 0;
}

const YOU_PANELS = ['you-hub', 'journey', 'dashboard', 'records', 'passport', 'voicehealth', 'profile'];
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{23F1}\u{23F8}\u{23F9}\u{25B6}\u{2B1B}\u{1F1E6}-\u{1F1FF}]/u;
async function youScan() {
  const Y = require('./youSeed');
  const langs = arg('--lang') ? [LANG] : ['en', 'fr', 'es', 'tr'];
  const b = await C.chromium.launch(); let total = 0, totalEmoji = 0;
  try {
    const { ctx, page } = await C.openPage(b, {}); await C.signUp(page, 'dvcopy', 'Copy Check');
    const state = await ctx.storageState(); await ctx.close();
    for (const lang of langs) {
      const re = new RegExp(`(?<![\\p{L}])(${WORDS[lang]}${lang === 'en' ? '' : '|' + WORDS.en}|${COMMON})(?![\\p{L}])|§`, 'iu');
      const hits = new Map(), emo = new Map(); let n = 0;
      const add = (tx, where) => { n++;
        if (re.test(tx)) hits.set(tx, (hits.get(tx) || new Set()).add(where));
        // the four language buttons keep their flags (a language picker shows each language its own way)
        if (EMOJI.test(tx) && !/^(🇬🇧 English|🇫🇷 Français|🇪🇸 Español|🇹🇷 Türkçe)$/u.test(tx)) emo.set(tx, (emo.get(tx) || new Set()).add(where)); };
      for (const st of Y.YOU_STATES) {
        const { ctx, page } = await C.openPage(b, { storageState: st === 'signedout' ? undefined : state, lang });
        try {
          await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
          await C.clearOverlays(page);
          if (st !== 'signedout') await page.evaluate(Y.seedInPage, st);
          for (const panel of YOU_PANELS) {
            await page.evaluate(p => { if (p === 'you-hub') showShellSection('you'); else enterPanel(p); }, panel);
            await new Promise(r => setTimeout(r, 450));
            const texts = await page.evaluate(sel => { const out = []; const w = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
              while (w.nextNode()) { const v = w.currentNode.textContent.replace(/\s+/g, ' ').trim(); if (v) out.push(v); } return out; }, `#panel-${panel}`);
            for (const tx of texts) add(tx, `${st}/${panel}`);
            const vals = await page.evaluate(p => [...new Set([...document.querySelectorAll(`#panel-${p} [data-i18n]`)].map(e => e.dataset.i18n))].map(k => [k, t(k)]), panel);
            for (const [k, v] of vals) add(v, `${panel}: ${k}`);
          }
        } finally { await ctx.close(); }
      }
      total += hits.size; totalEmoji += emo.size;
      console.log(`\n== ${lang}: ${n} texts scanned; ${hits.size} with a §7 word, ${emo.size} with an emoji:`);
      for (const [tx, where] of hits) console.log(`  §7 [${[...where].slice(0, 3).join(', ')}${where.size > 3 ? ', …' : ''}] ${tx.slice(0, 160)}`);
      for (const [tx, where] of emo) console.log(`  emoji [${[...where].slice(0, 3).join(', ')}${where.size > 3 ? ', …' : ''}] ${tx.slice(0, 160)}`);
    }
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${total} texts with a §7 word, ${totalEmoji} with an emoji, across ${langs.join(', ')}`);
  process.exitCode = total || totalEmoji ? 1 : 0;
}

(async () => {
  if (process.argv.includes('--you')) return youScan();
  if (process.argv.includes('--tools')) return toolsScan();
  const b = await C.chromium.launch(); const hits = new Map(); let n = 0;
  try {
    const { ctx, page } = await C.openPage(b, {}); await C.signUp(page, 'dvcopy', 'Copy Check');
    const state = await ctx.storageState(); await ctx.close();
    for (const name of H.HOME_STATES) {
      const { ctx, page } = await C.openPage(b, { storageState: name === 'signedout' ? undefined : state, lang: LANG });
      try {
        await C.clearOverlays(page); await H.seed(page, name);
        for (const panel of ['home', 'train-hub']) {
          if (panel === 'train-hub') await page.evaluate(() => showShellSection('train'));
          // every element's own text nodes, visible or not (the hidden ones are shown in other states)
          const texts = await page.evaluate(sel => { const out = []; const w = document.createTreeWalker(document.querySelector(sel), NodeFilter.SHOW_TEXT);
            while (w.nextNode()) { const v = w.currentNode.textContent.replace(/\s+/g, ' ').trim(); if (v) out.push(v); } return out; }, `#panel-${panel}`);
          for (const tx of texts) { n++; if (BANNED.test(tx)) hits.set(tx, (hits.get(tx) || []).concat(`${name}/${panel}`)); }
        }
      } finally { await ctx.close(); }
    }
    console.log(`${n} texts scanned (${LANG}); ${hits.size} with a §7 word:`);
    for (const [tx, where] of hits) console.log(`  [${[...new Set(where)].join(', ')}] ${tx}`);
  } finally { await b.close(); C.cleanup(); }
})();
