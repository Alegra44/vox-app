// PHASE10.md B3: Rule 1 as a check. The voice colour (--hl-voice of the theme) is only for the singer and the
// start-singing buttons. tour10.js's shots pass (390, Light and Dark, every screen and sheet at rest) lists every visible
// element whose colour, background, border, outline, box-shadow, fill or stroke is the voice colour; each one must match
// the allowed list below. Then the states the tour doesn't reach, in the page: the warm-up with an item running (its Stop).
// The allowed list is the one HOUSE_LIGHTS.md v3.0 prints (Rule 1).
// Usage: node scripts/design-verify/rule1.js [--out <dir>] [--ref <git ref>]   exit 1 on any element outside the list
const fs = require('fs'), path = require('path'), os = require('os');
const { spawnSync } = require('child_process');
const C = require('./common'), S9 = require('./screens9');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const OUT = arg('--out') || fs.mkdtempSync(path.join(os.tmpdir(), 'vc-rule1-')), REF = arg('--ref');

// Each entry: what it is, and a test on the hit's path (tag#id.class > … , the last 5 ancestors).
const ALLOWED = [
  ['a start-singing button (.mic-btn / .vc-take-pill) or anything inside one', p => /(^| > )button[^ >]*\.(mic-btn|vc-take-pill)/.test(p)],
  ['Daily Exercises\' Listen & score (it opens the mic)', p => /#pitchListenBtn/.test(p)],
  ['the singer\'s trace: Part Rehearsal\'s line (path.cw-voice)', p => /path\.cw-voice$/.test(p)],
  ['the singer\'s range: Range Finder\'s and Progress\'s range bars', p => /#(rangeFill|dashRangeFill)$/.test(p)],
  ['the singer\'s range: the range poster\'s keys', p => /\.pk-[wb]\.on$/.test(p)],
  ['the singer\'s range: Vocal Lab\'s segments', p => /\.vlab-seg$/.test(p)],
  ['a live measure of the singer: Breath Control\'s hold ring', p => /#breathRingFill$/.test(p)],
];
const allowedBy = p => (ALLOWED.find(([, f]) => f(p)) || [null])[0];

let fails = 0;
const check = (name, ok, detail) => { console.log(`${ok ? '✓' : '✗'} ${name}${detail ? ` — ${detail}` : ''}`); if (!ok) fails++; };

(async () => {
  // 1. the tour at rest
  const r = spawnSync('node', [path.join(__dirname, 'tour10.js'), '--passes', 'shots', '--combos', '390-light,390-dark', '--out', OUT, ...(REF ? ['--ref', REF] : [])], { stdio: 'inherit' });
  if (r.status !== 0) { console.log('tour10 failed'); process.exit(1); }
  const audit = JSON.parse(fs.readFileSync(path.join(OUT, 'audit.json'), 'utf8'));
  const outside = {}, inside = {};
  for (const [combo, shots] of Object.entries(audit.combos))
    for (const [screen, a] of Object.entries(shots))
      for (const h of a.voiceHits || []) {
        const by = allowedBy(h.path), key = `${h.path} [${h.props.join(',')}]${h.text ? ` «${h.text}»` : ''}`;
        const into = by ? inside : outside; (into[key] = into[key] || { by, screens: new Set() }).screens.add(`${screen} (${combo})`);
      }
  console.log(`\nallowed uses: ${Object.keys(inside).length} distinct elements`);
  for (const [k, v] of Object.entries(inside)) console.log(`  · ${v.by}: ${k.split(' > ').slice(-2).join(' > ')} on ${v.screens.size} screen-states`);
  for (const [k, v] of Object.entries(outside)) console.log(`  ✗ ${k} on ${[...v.screens].slice(0, 4).join(', ')}${v.screens.size > 4 ? ` +${v.screens.size - 4}` : ''}`);
  check('every voice-coloured element at rest is on the allowed list (390, Light and Dark)', Object.keys(outside).length === 0, `${Object.keys(outside).length} outside`);

  // 2. the warm-up with an item running: its Stop and the running row
  const b = await C.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
  try {
    const a = await C.openPage(b, { dir: C.buildDir(REF) }); await C.signUp(a.page, 'dvrule1', 'Alex Rivera'); const state = await a.ctx.storageState(); await a.ctx.close();
    for (const theme of ['light', 'dark']) {
      const { ctx, page } = await C.openPage(b, { dir: C.buildDir(REF), theme, storageState: state });
      await C.clearOverlays(page);
      await page.evaluate(S9.stateInPage, 'new');
      const wu = S9.SCREENS.find(s => s.key === 'warmup');
      await page.evaluate(code => (0, eval)(code), wu.open); await C.sleep(1200);
      await page.evaluate(() => document.querySelector('#warmupList [data-wu-item]').click()); await C.sleep(2500);
      const hits = await page.evaluate(() => {
        const probe = document.createElement('span'); probe.style.color = 'var(--hl-voice)'; document.getElementById('warmupOverlay').appendChild(probe);
        const voice = getComputedStyle(probe).color; probe.remove();
        const out = [];
        for (const e of document.querySelectorAll('#warmupList, #warmupList *')) {
          if (!e.getClientRects().length) continue; const cs = getComputedStyle(e), p = [];
          if (cs.color === voice && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim())) p.push('color');
          if (cs.backgroundColor === voice) p.push('background'); if (cs.borderLeftColor === voice && parseFloat(cs.borderLeftWidth) > 0) p.push('border');
          if (cs.boxShadow.includes(voice)) p.push('shadow');
          if (p.length) out.push(`${e.tagName.toLowerCase()}.${[...e.classList].join('.')} [${p}] «${(e.textContent || '').trim().slice(0, 30)}»`);
        }
        return { running: !!document.querySelector('.wu-item.running'), out };
      });
      check(`the warm-up with an item running (${theme}): no voice colour on its list (the Stop, the running row)`, hits.running && hits.out.length === 0, hits.running ? hits.out.join('; ') || 'none' : 'no item running');
      await page.evaluate(() => { try { wuStop(); } catch (e) {} }); await ctx.close();
    }
  } finally { await b.close(); C.cleanup(); }
  console.log(`\n${fails ? 'RULE1: FAIL' : 'RULE1: PASS'} (${fails} failed)`);
  process.exit(fails ? 1 : 0);
})();
