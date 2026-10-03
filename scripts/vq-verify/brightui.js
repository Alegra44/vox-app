// Brightness as the panel shows it, at the band lines. Two parts:
//  1. sweep: renderVoiceQuality() fed exact centroid ÷ f0 ratios in 0.0005 steps across both lines at 110–880 Hz, in
//     en and fr (decimal comma). Every shown ratio must map to one band, and the bands must run dark → balanced → bright.
//  2. holds: a real click on "Hold a note" with 220 Hz tones rolling off at 13.5 / 13 / 12.5 / 9.5 / 9 / 8.5 dB/oct
//     (and the outer two with ±50 ct vibrato); prints the shown text and checks it against the expected band.
// Locally the sign-in gate is stubbed; with a URL (production) a fresh account signs up through the auth modal and is
// deleted at exit (testAccounts.js).
// Usage: node scripts/vq-verify/brightui.js [url]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const url = process.argv[2];
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let A = null;
if (url) { const { track } = require('../choir-verify/testAccounts'); A = { email: track(`voxcoach-vqb-${Date.now()}@example.com`), password: 'VQ-' + Math.random().toString(36).slice(2) + '!x9' }; }
let signedUp = false;

async function session(wav, fn) {
  const b = await chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${wav}`] });
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 } });
  if (!url) await ctx.route('http://localhost:8765/', r => r.fulfill({ path: path.resolve(__dirname, '../../deploy/index.html'), contentType: 'text/html' }));
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  try {
    await page.goto(url || 'http://localhost:8765/', { waitUntil: 'load' }); await sleep(3000);
    const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
    if (url) {
      await page.evaluate(() => openAuthModal());
      if (signedUp) await page.locator('#authModeToggle').click(); else await page.locator('#authName').fill('VQ Bright');
      await page.locator('#authEmail').fill(A.email); await page.locator('#authPassword').fill(A.password);
      await page.locator('#authCreateBtn').click();
      await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
      signedUp = true;
      await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
      await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400);
      await page.locator('#panel-train-hub [data-enter-panel="voicequality"]').click(); await sleep(500);
    } else await page.evaluate(() => { blockExercise = () => false; enterPanel('voicequality'); });
    await fn(page);
  } finally { if (errors.length) console.log('page errors:', errors); await b.close(); }
}

function genWav(name, spec) { const f = path.join(TMP, name + '.wav'); execFileSync('python', [path.join(__dirname, 'gen.py'), f, JSON.stringify(spec)]); return f; }

(async () => {
  const probe = genWav('bui-probe', { f0: 220, harmonics: [1, 0.5] });
  await session(probe, async page => {
    console.log(`== sweep (${url || 'local'})`);
    const res = await page.evaluate(() => {
      const out = [];
      for (const lg of ['en', 'fr']) {
        setLanguage(lg);
        const names = { [t('vq_bright_dark')]: 'dark', [t('vq_bright_balanced')]: 'balanced', [t('vq_bright_bright')]: 'bright' };
        for (const f0 of [110, 220, 330, 440, 880]) {
          const [dk, br] = vqBrightBounds(f0), seen = new Map(), order = [];
          let bad = [];
          for (const [lo, hi] of [[dk - 0.03, dk + 0.03], [br - 0.03, br + 0.03]]) {
            for (let x = lo; x <= hi; x += 0.0005) {
              vqLast = { ok: true, midi: 57, f0, seconds: 4, vib: { ok: false }, hnr: null, centroid: x * f0 };
              renderVoiceQuality();
              const shown = document.getElementById('vqBrightVal').textContent.match(/·\s*([\d.,]+)/)[1];
              const b = names[document.getElementById('vqBrightRead').textContent];
              if (seen.has(shown) && seen.get(shown) !== b) bad.push(`${shown} is both ${seen.get(shown)} and ${b}`);
              seen.set(shown, b); if (order[order.length - 1] !== b) order.push(b);
            }
          }
          const lines = [...seen].reduce((acc, [s, b], i, arr) => (i && arr[i - 1][1] !== b ? acc.concat(`${arr[i - 1][0]} ${arr[i - 1][1]} | ${s} ${b}`) : acc), []);
          out.push(`${lg} ${f0} Hz  bounds ${dk.toFixed(4)} / ${br.toFixed(4)}  lines at: ${lines.join('  ;  ')}  order ${order.join('→')}  ${bad.length ? '✗ ' + bad.join(', ') : '✓ one band per shown value'}`);
        }
      }
      setLanguage('en');
      return out;
    });
    res.forEach(l => console.log(l));
  });

  console.log('\n== holds (real click), 220 Hz tones at the lines');
  const K = Math.floor(6000 / 220);
  const cases = [[13.5, 0, 'dark'], [13.5, 50, 'dark'], [13, 0, 'on the line'], [12.5, 0, 'balanced'], [9.5, 0, 'balanced'], [9, 0, 'on the line'], [8.5, 0, 'bright'], [8.5, 50, 'bright']];
  let ok = 0, n = 0;
  for (const [dbo, d, want] of cases) {
    const wav = genWav('bui', { f0: 220, harmonics: [...Array(K).keys()].map(k => Math.pow(k + 1, -dbo / 6.0206)), ...(d ? { vibRate: 6, vibCents: d } : {}) });
    await session(wav, async page => {
      await page.locator('#vqStartBtn').click(); await sleep(400);
      await page.waitForFunction(() => !vqActive && vqLast, null, { timeout: 15000 });
      const r = await page.evaluate(() => {
        const names = { [t('vq_bright_dark')]: 'dark', [t('vq_bright_balanced')]: 'balanced', [t('vq_bright_bright')]: 'bright' };
        return { val: document.getElementById('vqBrightVal').textContent, band: names[document.getElementById('vqBrightRead').textContent], text: document.getElementById('vqBrightRead').textContent, raw: vqLast.centroid / vqLast.f0, bounds: vqBrightBounds(vqLast.f0) };
      });
      const pass = want === 'on the line' ? null : r.band === want;
      if (pass !== null) { n++; if (pass) ok++; }
      console.log(`${String(dbo).padStart(4)} dB/oct${d ? ' ±' + d + ' ct' : '       '}  shown "${r.val}" → ${r.band} (raw ${r.raw.toFixed(4)}, lines ${r.bounds[0].toFixed(4)} / ${r.bounds[1].toFixed(4)})${pass === null ? '' : pass ? ' ✓' : ' ✗ want ' + want}  "${r.text}"`);
    });
  }
  console.log(`\n${ok}/${n} holds in the expected band`);
})().catch(e => { console.error(e); process.exitCode = 1; });
