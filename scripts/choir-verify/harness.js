// What every Choir World script shares (PHASE5A.md): its own test account, time limits, and cleanup however it ends.
//  - signUp(page, prefix): a fresh voxcoach-<prefix>-<ts>@example.com signed up through the auth modal the way yc.js does,
//    passed through track() first, so testAccounts.js deletes it when the script exits (passed, failed, stalled or killed).
//  - start(name, { limitMin }): the overall limit (10 min unless the script says why it needs longer).
//  - step(name, limitS): names what the script is doing now and gives it a limit; a step that runs over it (a wait for
//    a run that never starts, a song clock that never reaches its time, a hung evaluate) fails the script with the
//    step's name. Every wait in a script is inside a step, so every wait has a limit.
//  - A failure (a stalled step, the overall limit, an uncaught error) prints "FAILED (<script>): <why>", closes the
//    browsers, deletes the accounts and exits 1. finish() closes the browsers and deletes the accounts on success.
//  - Choir regress mode (5a.1): with CV_JSON=<file> set, everything the script prints (its measurements, as it has always
//    printed them) is also written to that file as JSON when it exits, however it exits: { script, args, exit, lines }.
//    choircompare.js reads the numbers and the words out of those lines; nothing a script measures changes.
const { chromium } = require('playwright');
const { track, cleanup } = require('./testAccounts');
const sleep = ms => new Promise(r => setTimeout(r, ms));
if (process.env.CV_JSON) {
  const lines = [], fs = require('fs'), keep = f => (...a) => { lines.push(require('util').format(...a)); f(...a); };
  console.log = keep(console.log); console.error = keep(console.error);
  process.on('exit', code => fs.writeFileSync(process.env.CV_JSON, JSON.stringify({ script: NAME || require('path').basename(process.argv[1], '.js'), args: process.argv.slice(2), exit: code, lines }, null, 1)));
}
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

// Phase 5 (PHASE5.md §1a): Choir World's song page shows one tab at a time ('rehearse' | 'songlab' | 'trainers' |
// 'yourchoir' | 'passport'; Trainers shows one trainer alone: 'hm' | 'boss' | 'chaos' | 'ladder' | 'timing').
// cwTab(page, tab, trainer) shows it before a script clicks or reads what is on it; cwFor(page, selector) shows the tab
// (and trainer) the element is on. If its panel is already the active one only the tab changes (nothing is re-entered,
// so what the script set up stays). On a build without the tabs (master) both do nothing: everything is shown there.
const CW_SHOW = ({ tab, trainer, sel }) => {
  if (typeof cwShowTab !== 'function') return null;
  const TAB_PANEL = { rehearse: 'partrehearsal', songlab: 'choir', trainers: 'partrehearsal', yourchoir: 'choir', passport: 'choirpassport' };
  if (sel) {
    const el = document.querySelector(sel), sec = el && el.closest('[data-cw-sec]'), panel = el && el.closest('section.panel');
    if (!sec || !panel) return null;
    tab = sec.dataset.cwSec.split(' ').find(k => TAB_PANEL[k] === panel.id.replace('panel-', '')) || null;
    trainer = (el.closest('[data-cw-card]') || {}).dataset?.cwCard || null;
    if (!tab) return null;
  }
  const panel = document.getElementById('panel-' + TAB_PANEL[tab]);
  if (panel.classList.contains('active')) {
    panel.dataset.cwTab = tab;
    if (tab === 'trainers' && trainer) panel.dataset.cwTrainer = trainer; else delete panel.dataset.cwTrainer;
    renderCwStructure();
  } else cwShowTab(tab, trainer);
  return { tab, trainer };
};
const cwTab = async (page, tab, trainer = null) => { const r = await page.evaluate(CW_SHOW, { tab, trainer }); if (r) await sleep(300); return r; };
const cwFor = async (page, sel) => { const r = await page.evaluate(CW_SHOW, { sel }); if (r) await sleep(300); return r; };

module.exports = { start, step, launch, finish, fail, signUp, sleep, cwTab, cwFor };
