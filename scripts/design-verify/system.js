// Phase 1 checks on the local build: the System theme follows the device (with colorScheme light the body's --hl-bg is
// paper, with dark it's dusk; an explicit Light / Dark wins over the device), and with prefers-reduced-motion the header
// and tab bar have no transitions or animations. No account.
// Usage: node scripts/design-verify/system.js
const C = require('./common');
let pass = 0, fail = 0;
const check = (label, ok, detail = '') => { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(60)} ${detail}`); };
const PAPER = '#F2F3EF', DUSK = '#16181C';

(async () => {
  const b = await C.chromium.launch();
  try {
    for (const [theme, scheme, want] of [['system', 'light', PAPER], ['system', 'dark', DUSK], ['light', 'dark', PAPER], ['dark', 'light', DUSK]]) {
      const { ctx, page, errors } = await C.openPage(b, { theme, scheme });
      const got = await page.evaluate(() => ({ bg: getComputedStyle(document.body).getPropertyValue('--hl-bg').trim(), attr: document.documentElement.getAttribute('data-theme') }));
      check(`${theme} theme, device ${scheme}: body --hl-bg`, got.bg.toUpperCase() === want, `${got.bg} (data-theme ${got.attr})${errors.length ? ' errors: ' + errors[0] : ''}`);
      await ctx.close();
    }
    for (const w of [390, 1280]) {
      const { ctx, page } = await C.openPage(b, { theme: 'light', reducedMotion: 'reduce', viewport: { width: w, height: 844 } });
      const moving = await page.evaluate(() => {
        const out = [];
        for (const el of document.querySelectorAll('header.shell-topbar, header.shell-topbar *, nav.shell-bottomnav, nav.shell-bottomnav *')) {
          for (const pseudo of [null, '::before', '::after']) {
            const s = getComputedStyle(el, pseudo);
            const tr = s.transitionDuration.split(',').some(d => parseFloat(d) > 0), an = s.animationName !== 'none' && s.animationName !== '';
            if (tr || an) out.push(`${el.tagName.toLowerCase()}.${String(el.className.baseVal ?? el.className).split(' ')[0]}${pseudo || ''}: ${tr ? 'transition ' + s.transitionProperty : ''}${an ? ' animation ' + s.animationName : ''}`);
          }
        }
        return out;
      });
      check(`reduced motion, ${w}px: no transitions on the header or tab bar`, moving.length === 0, moving.length ? moving.slice(0, 4).join(' | ') : 'none');
      await ctx.close();
    }
  } finally { await b.close(); }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
