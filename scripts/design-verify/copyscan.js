// Phase 3 (PHASE3.md §2.5): every text shown on Home and the Coach tab, in each seeded state (homeStates.js), signed in
// and out, searched for the §7 words that never appear in user-facing text. Prints each hit with the text around it.
// Usage: node scripts/design-verify/copyscan.js [--lang en]
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
(async () => {
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
