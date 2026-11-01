// What every Choir World script shares (PHASE5A.md): its own test account, time limits, and cleanup however it ends.
//  - signUp(page, prefix): a fresh voxcoach-<prefix>-<ts>@example.com signed up through the auth modal the way yc.js does,
//    passed through track() first, so testAccounts.js deletes it when the script exits (passed, failed, stalled or killed).
//  - start(name, { limitMin }): the overall limit (10 min unless the script says why it needs longer).
//  - step(name, limitS): names what the script is doing now and gives it a limit; a step that runs over it (a wait for
//    a run that never starts, a song clock that never reaches its time, a hung evaluate) fails the script with the
//    step's name. Every wait in a script is inside a step, so every wait has a limit.
//  - A failure (a stalled step, the overall limit, an uncaught error) prints "FAILED (<script>): <why>", closes the
//    browsers, deletes the accounts and exits 1. finish() closes the browsers and deletes the accounts on success.
const { chromium } = require('playwright');
const { track, cleanup } = require('./testAccounts');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browsers = [];
let NAME = '', current = 'starting', stepTimer = null, overallTimer = null, ended = false;

async function closeAll() {
  await Promise.race([Promise.all(browsers.map(b => b.close().catch(() => {}))), sleep(10000)]);
}
async function fail(why) {
  if (ended) return; ended = true;
  clearTimeout(stepTimer); clearTimeout(overallTimer);
  console.log(`\nFAILED (${NAME}): ${why}`);
  await closeAll(); cleanup(); process.exit(1);
}
function start(name, { limitMin = 10 } = {}) {
  NAME = name;
  overallTimer = setTimeout(() => fail(`overall limit of ${limitMin} min reached in step "${current}"`), limitMin * 60000);
  process.on('unhandledRejection', e => fail(`step "${current}": ${(e && e.stack) || e}`));
  process.on('uncaughtException', e => fail(`step "${current}": ${(e && e.stack) || e}`));
}
function step(name, limitS = 120) {
  current = name; clearTimeout(stepTimer);
  stepTimer = setTimeout(() => fail(`step "${name}" stalled (over its ${limitS} s limit)`), limitS * 1000);
}
async function launch(opts) { const b = await chromium.launch(opts); browsers.push(b); return b; }
async function finish(code = 0) {
  if (ended) return; ended = true;
  clearTimeout(stepTimer); clearTimeout(overallTimer);
  await closeAll(); cleanup(); process.exit(code);
}
// The language chooser (first visit) is answered in English unless the script picked a language itself first.
async function signUp(page, prefix, name = 'Choir Check') {
  step(`sign up (${prefix})`, 60);
  const email = track(`voxcoach-${prefix}-${Date.now()}@example.com`), password = 'CV-' + Math.random().toString(36).slice(2) + '!x9';
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  await page.evaluate(() => openAuthModal());
  await page.locator('#authName').fill(name); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  console.log('signed up', email);
  return { email, password };
}

module.exports = { start, step, launch, finish, fail, signUp, sleep };
