// Shared by the redesign checks: serve a build locally (the working copy, or deploy/index.html from a git ref) against
// the production backend, open a page, sign a throwaway account up (track(): deleted at exit), and show any of the
// 46 panels through the app's own routing.
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped (see that file)
const fs = require('fs'), os = require('os'), path = require('path');
const { execFileSync } = require('child_process');
const { track, cleanup } = require('../choir-verify/testAccounts');

const ROOT = path.resolve(__dirname, '../..'), DEPLOY = path.join(ROOT, 'deploy'), LOCAL = 'http://localhost:8765/';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// The build to serve: null = the working copy's deploy/, or a git ref whose deploy/ files are written to a temp dir.
function buildDir(ref) {
  if (!ref) return DEPLOY;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vc-design-'));
  const files = execFileSync('git', ['ls-tree', '-r', '--name-only', ref, 'deploy/'], { cwd: ROOT, encoding: 'utf8' }).split('\n').filter(Boolean);
  for (const f of files) fs.writeFileSync(path.join(dir, path.basename(f)), execFileSync('git', ['show', `${ref}:${f}`], { cwd: ROOT, maxBuffer: 64 << 20 }));
  return dir;
}

// The four hubs are shown with showShellSection (World is the arcade panel); every other panel through enterPanel.
const HUBS = { home: 'home', 'train-hub': 'train', 'songs-hub': 'songs', 'you-hub': 'you' };
async function showPanel(page, key) {
  await page.evaluate(k => {
    const hubs = { home: 'home', 'train-hub': 'train', 'songs-hub': 'songs', 'you-hub': 'you' };
    if (hubs[k]) showShellSection(hubs[k]); else enterPanel(k);
    window.scrollTo(0, 0);
  }, key);
  await sleep(700);
  return page.evaluate(k => !!document.querySelector(`#panel-${k}.active`), key);
}
const panelKeys = page => page.evaluate(() => [...document.querySelectorAll('.panel')].map(p => p.id.replace(/^panel-/, '')));

// theme: 'light' | 'dark' | 'system' | null (leave the page's default). The device scheme follows the theme unless given.
async function openPage(b, { dir = DEPLOY, viewport = { width: 390, height: 844 }, storageState, scheme, theme, reducedMotion, lang = 'en' } = {}) {
  const ctx = await b.newContext({ viewport, deviceScaleFactor: 1, ...(storageState ? { storageState } : {}),
    colorScheme: scheme || (theme === 'light' ? 'light' : 'dark'), ...(reducedMotion ? { reducedMotion } : {}) });
  await ctx.route(LOCAL + '**', r => {
    const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html', f = path.join(dir, p);
    if (!fs.existsSync(f)) return r.fulfill({ status: 404, body: '' });
    r.fulfill({ path: f, contentType: p.endsWith('.js') ? 'text/javascript' : p.endsWith('.css') ? 'text/css' : 'text/html' });
  });
  if (theme) await ctx.addInitScript(t => { try { t === 'system' ? localStorage.removeItem('theme') : localStorage.setItem('theme', t); } catch (e) {} }, theme);
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  await page.goto(LOCAL, { waitUntil: 'load' }); await sleep(2500);
  if (storageState) await page.waitForFunction(() => { try { return !!profile && !!progress; } catch (e) { return false; } }, null, { timeout: 30000 });
  const ov = page.locator(`#languageSelectOverlay [data-lang="${lang}"]`); if (await ov.isVisible().catch(() => false)) { await ov.click(); await sleep(300); }
  if (lang !== 'en') { await page.evaluate(l => setLanguage(l), lang); await sleep(300); }
  if (theme) await applyTheme(page, theme);
  return { ctx, page, errors };
}
// Light / Dark through the app's setTheme when the build has them (the branch); on a build without them (master) the
// default look is its only (dark) theme.
async function applyTheme(page, theme) {
  await page.evaluate(async t => {
    const has = !!document.querySelector('[data-theme-choice="light"]');
    if (has && typeof setTheme === 'function') await setTheme(t, false);
  }, theme);
  await sleep(200);
}

async function signUp(page, prefix, name = 'Design Check') {
  const email = track(`voxcoach-${prefix}-${Date.now()}@example.com`), password = 'DV-' + Math.random().toString(36).slice(2) + '!x9';
  await page.evaluate(() => { openAuthModal(); setAuthMode('signup'); });
  await page.locator('#authName').fill(name);
  await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 30000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  await sleep(800);
  return { email, password };
}
// Closes overlays a fresh account or a panel can leave open (onboarding, level-up, paywall), without changing state.
async function clearOverlays(page) {
  await page.evaluate(() => {
    for (const id of ['onboardingOverlay', 'levelupOverlay', 'newRecordOverlay', 'breakthroughOverlay', 'paywallModalOverlay', 'signinRequiredOverlay']) {
      const o = document.getElementById(id); if (o) { o.style.display = 'none'; o.classList.remove('levelup-show'); }
    }
  });
}

module.exports = { chromium, ROOT, DEPLOY, LOCAL, sleep, buildDir, HUBS, showPanel, panelKeys, openPage, applyTheme, signUp, clearOverlays, cleanup };
