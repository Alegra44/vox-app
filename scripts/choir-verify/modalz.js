// Sign-in modal vs the bottom nav: at small windows the nav (z-index 50) used to sit over the modal and
// swallow clicks on "Already have an account? Sign in". Signs up an account at 1280x900, then, per
// viewport, opens the modal with a real click on the Sign in button, checks which element is on top at
// the toggle's centre, clicks the toggle and the submit button for real (no force), and waits for sign-in.
// Usage: node scripts/choir-verify/modalz.js [url] [email password]  (no credentials: signs up a new account)
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const sleep = ms => new Promise(r => setTimeout(r, ms));
const url = process.argv[2] || 'http://localhost:8765/';
let [email, password] = process.argv.slice(3);

async function open(browser, viewport) {
  const ctx = await browser.newContext({ viewport });
  const p = await ctx.newPage();
  await p.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const lang = p.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) await lang.click();
  return p;
}
(async () => {
  const b = await chromium.launch();
  if (!email) {
    email = require('./testAccounts').track(`voxcoach-modalz-${Date.now()}@example.com`); // deleted when this run exits password = 'Mz-' + Date.now() + '!x';
    const p = await open(b, { width: 1280, height: 900 });
    await p.evaluate(async ([e, pw]) => { const { error } = await sb.auth.signUp({ email: e, password: pw, options: { data: { name: 'modalz' } } }); if (error) throw error; }, [email, password]);
    console.log('signed up', email, '| user_id', await p.evaluate(async () => (await sb.auth.getSession()).data.session.user.id));
    await p.context().close();
  }
  for (const vp of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
    const p = await open(b, vp);
    const z = await p.evaluate(() => ({ modal: getComputedStyle(document.getElementById('authModalOverlay')).zIndex, nav: getComputedStyle(document.querySelector('.shell-bottomnav')).zIndex, navShown: getComputedStyle(document.querySelector('.shell-bottomnav')).display !== 'none' }));
    const signInBtn = p.locator('#dashSignInBtn');
    let opened = 'openAuthModal()';
    if (await signInBtn.isVisible()) { await signInBtn.click(); opened = 'clicked #dashSignInBtn'; } else await p.evaluate(() => openAuthModal());
    const toggle = p.locator('#authModeToggle');
    await toggle.scrollIntoViewIfNeeded();
    const top = await toggle.evaluate(el => { const r = el.getBoundingClientRect(), hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return { hit: hit === el ? 'the toggle itself' : (hit && (hit.id || hit.className || hit.tagName)), y: Math.round(r.y), vh: innerHeight }; });
    await toggle.click({ timeout: 5000 });
    const mode = await p.evaluate(() => authMode);
    await p.locator('#authEmail').fill(email); await p.locator('#authPassword').fill(password);
    await p.locator('#authCreateBtn').click({ timeout: 5000 });
    await p.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    console.log(`${vp.width}x${vp.height}: z modal ${z.modal} / nav ${z.nav} (nav shown: ${z.navShown}) | modal ${opened} | element on top at toggle (y ${top.y} of ${top.vh}): ${top.hit} | after toggle click authMode=${mode} | signed in as`, await p.evaluate(() => profile && (profile.email || profile.name)));
    await p.context().close();
  }
  await b.close();
})();
