// Production check for Voice Quality + the Vibrato Analyzer's shared capture. Signs up one fresh account through the
// auth modal (voxcoach-vq-<ts>@example.com, deleted at exit by testAccounts.js), then with a WAV of known properties
// as the mic: real clicks Train → Expression → Vibrato → Hold a note, and Train → Expression → Voice Quality → Hold a
// note. Every getUserMedia call the page makes is logged with its constraints and the track's settings.
// Usage: node scripts/vq-verify/livevq.js [url]
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track } = require('../choir-verify/testAccounts');
const url = process.argv[2] || 'https://deploy-alegra1122.vercel.app/';
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const A = { email: track(`voxcoach-vq-${Date.now()}@example.com`), password: 'VQ-' + Math.random().toString(36).slice(2) + '!x9' };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const gen = (name, spec) => { const f = path.join(TMP, name + '.wav'); return { f, truth: JSON.parse(execFileSync('python', [path.join(__dirname, 'gen.py'), f, JSON.stringify(spec)], { encoding: 'utf8' })) }; };

async function session(wav, fn) {
  const browser = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(() => {
    window.__gum = [];
    const g = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async c => { const st = await g(c); const tr = st.getAudioTracks()[0]; __gum.push({ asked: c.audio, got: tr && (({ echoCancellation, noiseSuppression, autoGainControl }) => ({ echoCancellation, noiseSuppression, autoGainControl }))(tr.getSettings()), track: tr }); return st; };
  });
  const page = await ctx.newPage();
  const errors = []; page.on('pageerror', e => errors.push(String(e))); page.on('console', m => { if (m.type() === 'error' && !/progress (load|save) error|Not signed in/.test(m.text())) errors.push(m.text()); });
  try {
    await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
    await fn(page);
  } finally { if (errors.length) console.log('page errors:', errors); await browser.close(); }
}
async function auth(page, mode) {
  await page.evaluate(() => openAuthModal());
  if (mode === 'signin') await page.locator('#authModeToggle').click(); else await page.locator('#authName').fill('VQ Live');
  await page.locator('#authEmail').fill(A.email); await page.locator('#authPassword').fill(A.password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
}
async function openTool(page, panel) {
  await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
  await page.locator(`#panel-train-hub [data-enter-panel="${panel}"]`).click(); await sleep(500);
  return page.evaluate(() => document.querySelector('.panel.active').id);
}
const gum = page => page.evaluate(() => __gum.map(x => ({ asked: x.asked, got: x.got, track: x.track.readyState })));

(async () => {
  const vib = gen('live-vib', { f0: 330, harmonics: [1, 0.5, 0.33, 0.25], vibRate: 6, vibCents: 50 });
  let first = true;
  await session(vib.f, async page => {
    await auth(page, 'signup'); first = false;
    console.log('account', A.email, '| tier', await page.evaluate(() => currentTier()));
    console.log('\n== Vibrato Analyzer (injected 6 Hz ±50 ct, 330 Hz tone)');
    console.log('panel:', await openTool(page, 'vibrato'));
    await page.locator('#vibratoStartBtn').click(); await sleep(400);
    console.log('during:', JSON.stringify(await page.locator('#vibratoStartLabel').innerText()));
    await page.waitForFunction(() => !vibratoActive, null, { timeout: 15000 });
    console.log('shown:', JSON.stringify(await page.evaluate(() => ({ rate: vibratoRateStat.textContent, depth: vibratoDepthStat.textContent, consistency: vibratoConsistencyStat.textContent, feedback: vibratoFeedback.textContent }))));
    console.log('getUserMedia calls:', JSON.stringify(await gum(page)));

    console.log('\n== Voice Quality, same signal (clean tone, harmonics 1, ½, ⅓, ¼ → centroid ' +
      (vib.truth.harmonicAmps.reduce((a, v, k) => a + 330 * (k + 1) * v, 0) / vib.truth.harmonicAmps.reduce((a, v) => a + v, 0)).toFixed(0) + ' Hz)');
    console.log('panel:', await openTool(page, 'voicequality'));
    await page.locator('#vqStartBtn').click(); await sleep(400);
    await page.waitForFunction(() => !vqActive && vqLast, null, { timeout: 15000 });
    console.log('shown:', await page.evaluate(() => [...document.querySelectorAll('#vqNote, .vq-row')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' | ')));
    console.log('getUserMedia calls:', JSON.stringify((await gum(page)).slice(-1)));
  });

  // Breathiness at a known HNR: 220 Hz, harmonics 1…⅕, white noise scaled to 15 dB over f0/2–5 kHz, no vibrato
  const H = [1, 0.5, 0.33, 0.25, 0.2], amps = gen('live-probe', { f0: 220, harmonics: H }).truth.harmonicAmps;
  const P = amps.reduce((a, v) => a + v * v / 2, 0), sigma = Math.sqrt(P / Math.pow(10, 1.5) / ((5000 - 110) / 24000));
  const br = gen('live-hnr', { f0: 220, harmonics: H, noiseRms: sigma, seed: 7 });
  await session(br.f, async page => {
    await auth(page, 'signin');
    console.log('\n== Voice Quality, breathiness (injected HNR 15 dB, no vibrato)');
    console.log('panel:', await openTool(page, 'voicequality'));
    await page.locator('#vqStartBtn').click(); await sleep(400);
    await page.waitForFunction(() => !vqActive && vqLast, null, { timeout: 15000 });
    console.log('shown:', await page.evaluate(() => [...document.querySelectorAll('#vqNote, .vq-row')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' | ')));
    for (const lg of ['fr', 'es', 'tr']) { await page.evaluate(l => setLanguage(l), lg); await sleep(250); console.log(`[${lg}]`, await page.evaluate(() => [...document.querySelectorAll('.vq-row')].map(e => e.innerText.replace(/\s+/g, ' ').trim()).join(' | '))); }
    console.log('getUserMedia calls:', JSON.stringify(await gum(page)));
  });
})().catch(e => { console.error(e); process.exitCode = 1; });
