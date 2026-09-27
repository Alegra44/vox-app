// Vocal Load phase 3c: the Home card, the break-suggestion banner and the disclaimer, on a real throwaway account.
//   - Home card: right after the Choir card, today's total in the gauges' style, the disclaimer under it; the total
//     survives a reload; all four languages; shown with a Safari user agent (it only reads the total); hidden signed out
//   - banner at 80%: today's total is brought to 79.8% with stored sessions (under 60 active s each, so the rolling
//     baseline and the load rate are untouched), then Register Coach sings across 80%. It appears inside the Coach's
//     panel within one poll of the crossing, with the disclaimer (the day's first banner), in all four languages; the
//     Coach keeps listening and its button stays clickable; dismissed, it stays away, also after a reload
//   - banner at 100%: brought to 99.8%, then the Tuner (a shared-mic feature) sings across 100%: in the Tuner's panel,
//     without the disclaimer; not dismissed, it comes back after a reload; dismissed, it stays away, also after a reload
//   - a Safari user agent (a fresh browser, so none of the dismissals above): the Tuner can't feed the load there, so
//     no banner; Register Coach does, and shows the 100% banner, with the disclaimer (this browser's first today)
//   - signed out: no Home card, no banner
// The test account is deleted however the run ends (testAccounts.js).
// Usage: node scripts/vocal-load-verify/batch3c.js [url]   (no url: deploy/ served locally, production backend)
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const path = require('path'), os = require('os'), fs = require('fs');
const { track, db, cleanup } = require('../choir-verify/testAccounts');

const URL_ = process.argv[2], LOCAL = 'http://localhost:8765/', DEPLOY = path.resolve(__dirname, '../../deploy');
const TMP = path.join(os.tmpdir(), 'vq-verify'); fs.mkdirSync(TMP, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const email = track(`voxcoach-vlc-${Date.now()}@example.com`), password = 'VC-' + Math.random().toString(36).slice(2) + '!x9';
let pass = 0, fail = 0, auth = null;
function check(label, ok, detail = '') { ok ? pass++ : fail++; console.log(`  ${ok ? '✓' : '✗'} ${label.padEnd(72)} ${detail}`); }

const BUDGET = 6800, TONE = { midi: 60 };
TONE.wav = path.join(TMP, 'vlh-c4.wav'); TONE.hz = 440 * Math.pow(2, (TONE.midi - 69) / 12);
execFileSync('python', [path.join(__dirname, '../vq-verify/gen.py'), TONE.wav, JSON.stringify({ f0: TONE.hz, harmonics: [1, 0.5, 0.33, 0.25, 0.2], seconds: 60 })]);
const LANGS = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', tr: 'tr-TR' };
const GAUGE_TPL = { en: n => `${n}% of daily budget`, fr: n => `${n} % du budget quotidien`, es: n => `${n} % del presupuesto diario`, tr: n => `Günlük bütçe: %${n}` };
const shown = (pct, lang) => { const v = pct < 10 ? Math.round(pct * 10) / 10 : Math.round(pct); return GAUGE_TPL[lang](v.toLocaleString(LANGS[lang], { maximumFractionDigits: 1 })); };
// the expected texts, written out here rather than read from the page
const TXT = {
  en: { label: 'Vocal load today', disc: 'This is an estimate based on your pitch and loudness, not a medical measurement. If you have pain or hoarseness, see a voice professional.',
    b80: "You've reached 80% of today's vocal load budget. This is a good moment for a break: rest your voice for a while and drink some water.",
    b100: "You've reached 100% of today's vocal load budget. Consider resting your voice for the rest of the day, or keeping your singing light.", close: 'Dismiss' },
  fr: { label: 'Charge vocale du jour', disc: 'Il s’agit d’une estimation fondée sur la hauteur et le volume de votre voix, pas d’une mesure médicale. En cas de douleur ou d’enrouement, consultez un professionnel de la voix.',
    b80: 'Vous avez atteint 80 % du budget de charge vocale du jour. C’est un bon moment pour faire une pause : reposez votre voix un moment et buvez un peu d’eau.',
    b100: 'Vous avez atteint 100 % du budget de charge vocale du jour. Pensez à reposer votre voix pour le reste de la journée, ou à chanter légèrement.', close: 'Fermer' },
  es: { label: 'Carga vocal de hoy', disc: 'Es una estimación basada en el tono y el volumen de tu voz, no una medición médica. Si tienes dolor o ronquera, consulta a un profesional de la voz.',
    b80: 'Has llegado al 80 % del presupuesto de carga vocal de hoy. Es un buen momento para hacer una pausa: descansa la voz un rato y bebe un poco de agua.',
    b100: 'Has llegado al 100 % del presupuesto de carga vocal de hoy. Considera descansar la voz el resto del día o cantar de forma ligera.', close: 'Cerrar' },
  tr: { label: 'Bugünkü ses yükü', disc: 'Bu, sesinizin perdesine ve yüksekliğine dayalı bir tahmindir, tıbbi bir ölçüm değildir. Ağrınız veya ses kısıklığınız varsa bir ses uzmanına başvurun.',
    b80: 'Bugünkü ses yükü bütçenizin %80’ine ulaştınız. Mola vermek için iyi bir an: sesinizi bir süre dinlendirin ve biraz su için.',
    b100: 'Bugünkü ses yükü bütçenizin %100’üne ulaştınız. Günün geri kalanında sesinizi dinlendirmeyi ya da hafif şarkı söylemeyi düşünün.', close: 'Kapat' },
};
const SAFARI_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';

async function openPage(b, { signedIn = true, ua } = {}) {
  const ctx = await b.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, ...(ua ? { userAgent: ua } : {}), ...(signedIn && auth ? { storageState: auth } : {}) });
  if (!URL_) await ctx.route(LOCAL + '**', r => { const p = new URL(r.request().url()).pathname.replace(/^\//, '') || 'index.html'; r.fulfill({ path: path.join(DEPLOY, p), contentType: p.endsWith('.js') ? 'text/javascript' : 'text/html' }); });
  const page = await ctx.newPage(), errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && /vocal load/i.test(m.text())) errors.push(m.text()); });
  const resp = await page.goto(URL_ || LOCAL, { waitUntil: 'load' }); await sleep(3000);
  if (!resp || resp.status() >= 400) throw new Error('page answered ' + (resp && resp.status()));
  if (!await page.evaluate(() => { try { return typeof sb !== 'undefined'; } catch { return false; } })) throw new Error('Supabase client missing (CDN script failed to load)');
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]'); if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  if (signedIn && !auth) {
    await page.evaluate(() => openAuthModal());
    await page.locator('#authName').fill('VL 3c'); await page.locator('#authEmail').fill(email); await page.locator('#authPassword').fill(password);
    await page.locator('#authCreateBtn').click();
    await page.waitForFunction(() => !!profile && !!progress && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
    auth = await ctx.storageState(); console.log(`   signed up ${email}`);
  }
  if (signedIn) await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  if (signedIn) await page.waitForFunction(() => getComputedStyle(document.getElementById('homeVlCard')).display !== 'none', null, { timeout: 15000 }).catch(() => {});
  return { ctx, page, errors };
}
// Chromium's file mic is silent for its first ~1.5 s: warm it on a throwaway stream before the app opens its own.
const warm = page => page.evaluate(async () => {
  const st = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
  const ac = new AudioContext(), an = ac.createAnalyser(), buf = new Float32Array(2048), t0 = performance.now(); ac.createMediaStreamSource(st).connect(an);
  let heard = false; while (!heard && performance.now() - t0 < 5000) { await new Promise(r => setTimeout(r, 20)); an.getFloatTimeDomainData(buf); heard = buf.some(v => Math.abs(v) > 0.001); }
  st.getTracks().forEach(t => t.stop()); await ac.close(); return heard;
});
const home = page => page.evaluate(() => {
  const c = document.getElementById('homeVlCard'), g = document.getElementById('vlGaugeHome');
  return { card: !!c && getComputedStyle(c).display !== 'none', afterChoir: !!c && c.previousElementSibling && c.previousElementSibling.id === 'homeChoirCard',
    gauge: !!g && getComputedStyle(g).display !== 'none', label: g?.querySelector('[data-i18n="vl_gauge_label"]')?.textContent, val: g?.querySelector('.vl-gauge-val')?.textContent,
    aria: g?.getAttribute('aria-valuetext'), over: !!g && g.classList.contains('over'), disc: c?.querySelector('.vl-disclaimer')?.textContent,
    discShown: !!c && !!c.querySelector('.vl-disclaimer') && getComputedStyle(c.querySelector('.vl-disclaimer')).display !== 'none', pct: vlPercent() };
});
const banner = page => page.evaluate(() => {
  const b = document.getElementById('vlBreak'); if (!b) return { up: false };
  const d = document.getElementById('vlBreakDisclaimer'), panel = b.closest('section.panel');
  return { up: getComputedStyle(b).display !== 'none' && !!b.offsetParent, level: b.dataset.level, panel: panel && panel.id, panelActive: !!panel && panel.classList.contains('active'),
    underHero: !!b.previousElementSibling && b.previousElementSibling.classList.contains('journey-hero'),
    msg: document.getElementById('vlBreakMsg').textContent, disc: getComputedStyle(d).display !== 'none' ? d.textContent : null,
    close: document.getElementById('vlBreakClose').textContent, role: b.getAttribute('role'), live: b.getAttribute('aria-live'), pct: vlPercent() };
});
// the control under a button's centre is the button itself: the banner covers nothing
const topmost = (page, id) => page.evaluate(id => { const e = document.getElementById(id), r = e.getBoundingClientRect(); const hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!hit && (hit === e || e.contains(hit)); }, id);
const setLang = async (page, l) => { await page.evaluate(l => document.querySelector(`#profileLanguageRow [data-profile-lang="${l}"]`).click(), l); await sleep(600); };
async function goHome(page) { await page.locator('.snb-item[data-shell="home"]').click(); await sleep(600); }
async function enter(page, p) { await page.locator('.snb-item[data-shell="train"]').click(); await sleep(400); await page.locator(`#panel-train-hub [data-enter-panel="${p}"]`).click(); await sleep(800); }

const uid = () => db(`select id from auth.users where email = '${email}'`)[0].id;
const dayTotal = () => Number(db(`select coalesce(sum(load), 0) as s from public.vocal_load_sessions where user_id = '${uid()}' and day = (now() at time zone 'UTC')::date`)[0].s);
// Stored sessions that bring today's total to pct % of the budget: each under 60 active s, so none counts toward the
// rolling baseline (the last 5 sessions with ≥ 60 s), and none over 37.1 load per active second (the table's bound).
function seedTo(pct) {
  const id = uid(), need = pct / 100 * BUDGET - dayTotal();
  if (need <= 0) throw new Error(`already at ${(dayTotal() / BUDGET * 100).toFixed(3)}%`);
  const n = Math.ceil(need / (37 * 59)), each = need / n;
  // (one line: the CLI call can't take a line break)
  for (let i = 0; i < n; i++) db('insert into public.vocal_load_sessions (user_id, session_id, day, started_at, ended, active_seconds, load, median_rms, p5_midi, p95_midi) '
    + `values ('${id}', gen_random_uuid(), (now() at time zone 'UTC')::date, now(), true, 59, ${each.toFixed(6)}, 0.27, 60, 60)`);
  return dayTotal();
}
// sings in a feature until the banner is up (or the time runs out), polling every 100 ms; returns the banner at the
// first poll that saw it, and the % one poll earlier
async function singUntilBanner(page, active, ms) {
  let prev = await page.evaluate(() => vlPercent()), t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const b = await banner(page), live = await page.evaluate(active);
    if (b.up) return { b, before: prev, live };
    prev = b.pct ?? await page.evaluate(() => vlPercent());
    await sleep(100);
  }
  return { b: await banner(page), before: prev, live: await page.evaluate(active) };
}
const COACH = "mode==='register'", TUNER = "mode==='tuner'";
async function startCoach(page) { await enter(page, 'register'); await warm(page); await page.locator('#regMicBtn').click(); await page.waitForFunction(COACH, null, { timeout: 15000 }); }
async function stopCoach(page) { if (await page.evaluate(COACH)) await page.locator('#regMicBtn').click(); await sleep(4000); } // the session ends and saves
async function startTuner(page) { await enter(page, 'tuner'); await warm(page); await page.locator('#micBtn').click(); await page.waitForFunction(TUNER, null, { timeout: 15000 }); }
async function stopTuner(page) { if (await page.evaluate(TUNER)) await page.locator('#micBtn').click(); await sleep(4000); }

(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', `--use-file-for-fake-audio-capture=${TONE.wav}`] });
  let ctx, page, errors;
  const reopen = async opts => { if (ctx) await ctx.close(); ({ ctx, page, errors } = await openPage(b, opts)); };
  const reload = async () => { await page.reload({ waitUntil: 'load' }); await sleep(3000); await page.waitForFunction(() => !!profile && !!progress, null, { timeout: 20000 });
    await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
    await page.waitForFunction(() => getComputedStyle(document.getElementById('homeVlCard')).display !== 'none', null, { timeout: 15000 }).catch(() => {}); };
  const errCheck = () => check('page errors', errors.length === 0, errors.join(' | ') || 'none');
  try {
    console.log(`== ${URL_ || 'local deploy/ + production backend'}`);
    await reopen();

    console.log('\n-- Home card, a new account');
    let h = await home(page);
    check('card shown, right after the Choir card', h.card && h.afterChoir && h.gauge, JSON.stringify({ card: h.card, afterChoir: h.afterChoir, gauge: h.gauge }));
    check('gauge: label, today\'s total (0) in the gauges\' format', h.label === TXT.en.label && h.val === shown(0, 'en') && h.aria === h.val, `"${h.label}" "${h.val}"`);
    check('disclaimer under the gauge, in English', h.discShown && h.disc === TXT.en.disc, `"${h.disc}"`);

    console.log('\n-- 80%: Register Coach sings across it');
    const t79 = seedTo(79.8);
    await reload(); await goHome(page);
    h = await home(page);
    check('Home card after a reload: the stored total', Math.abs(h.pct - t79 / BUDGET * 100) < 1e-6 && h.val === shown(t79 / BUDGET * 100, 'en'), `"${h.val}" (${(t79 / BUDGET * 100).toFixed(3)}%)`);
    check('no banner below 80% (nothing singing)', !(await banner(page)).up, '');
    await startCoach(page);
    let r = await singUntilBanner(page, COACH, 30000);
    check('banner up at the crossing: the poll before it was under 80%', r.b.up && r.before < 80 && r.b.pct >= 80 && r.b.pct < 80.3, `before ${r.before?.toFixed(3)}%, at ${r.b.pct?.toFixed(3)}%`);
    check('in the Coach\'s panel, under its title', r.b.panel === 'panel-register' && r.b.panelActive && r.b.underHero, `${r.b.panel}, under title ${r.b.underHero}`);
    check('80% message, disclaimer (the day\'s first banner), Dismiss', r.b.level === '80' && r.b.msg === TXT.en.b80 && r.b.disc === TXT.en.disc && r.b.close === TXT.en.close, `"${r.b.msg}" | "${r.b.disc}"`);
    check('announced politely (role=status, aria-live=polite)', r.b.role === 'status' && r.b.live === 'polite', '');
    await sleep(1500);
    check('doesn\'t block: the Coach still listening, its button clickable', await page.evaluate(COACH) && await topmost(page, 'regMicBtn'), '');
    for (const l of ['fr', 'es', 'tr', 'en']) {
      await setLang(page, l); const x = await banner(page);
      check(`${l}: banner message, disclaimer and button`, x.up && x.msg === TXT[l].b80 && x.disc === TXT[l].disc && x.close === TXT[l].close, `"${x.msg}"`);
    }
    await page.locator('#vlBreakClose').click(); await sleep(300);
    check('Dismiss hides it', !(await banner(page)).up, '');
    await sleep(3000);
    check('dismissed: it stays away while the Coach keeps singing', !(await banner(page)).up && await page.evaluate(COACH), `${(await page.evaluate(() => vlPercent())).toFixed(3)}%`);
    await stopCoach(page);
    await reload(); await startCoach(page); await sleep(4000);
    check('dismissed: still away after a reload, singing again', !(await banner(page)).up && (await page.evaluate(() => vlPercent())) > 80, '');
    await stopCoach(page); errCheck();

    console.log('\n-- 100%: the Tuner (shared mic) sings across it');
    const t99 = seedTo(99.8);
    await reload(); await startTuner(page);
    r = await singUntilBanner(page, TUNER, 30000);
    check('banner up at the crossing: the poll before it was under 100%', r.b.up && r.before < 100 && r.b.pct >= 100 && r.b.pct < 100.3, `before ${r.before?.toFixed(3)}%, at ${r.b.pct?.toFixed(3)}% (seeded ${(t99 / BUDGET * 100).toFixed(3)}%)`);
    check('in the Tuner\'s panel, under its title', r.b.panel === 'panel-tuner' && r.b.panelActive && r.b.underHero, `${r.b.panel}`);
    check('100% message, no disclaimer (not the day\'s first banner)', r.b.level === '100' && r.b.msg === TXT.en.b100 && r.b.disc === null, `"${r.b.msg}"`);
    await sleep(1500);
    check('doesn\'t block: the Tuner still listening, its button clickable', await page.evaluate(TUNER) && await topmost(page, 'micBtn'), '');
    await stopTuner(page);
    await reload(); await startTuner(page);
    r = await singUntilBanner(page, TUNER, 10000);
    check('not dismissed: back after a reload, once singing', r.b.up && r.b.level === '100' && r.b.panel === 'panel-tuner' && r.b.disc === null, JSON.stringify({ up: r.b.up, level: r.b.level }));
    await page.locator('#vlBreakClose').click(); await sleep(3000);
    check('dismissed: stays away while the Tuner keeps singing', !(await banner(page)).up && await page.evaluate(TUNER), '');
    await stopTuner(page);
    await reload(); await startTuner(page); await sleep(4000);
    check('dismissed: still away after a reload, singing again', !(await banner(page)).up, '');
    await stopTuner(page); errCheck();

    console.log('\n-- reload: the Home card shows today\'s stored total, over 100%');
    const total = dayTotal(), p = total / BUDGET * 100;
    await reload(); await goHome(page); h = await home(page);
    check('Home card = today\'s stored total / 6800, marked over', h.card && Math.abs(h.pct - p) < 1e-6 && h.val === shown(p, 'en') && h.over, `"${h.val}" (${p.toFixed(3)}%)`);
    const daily = db(`select total_load from public.vocal_load_daily where user_id = '${uid()}' and day = (now() at time zone 'UTC')::date`);
    check('daily table = sum of today\'s sessions', daily.length === 1 && Math.abs(Number(daily[0].total_load) - total) < 1e-6, `${daily[0]?.total_load} vs ${total.toFixed(4)}`);
    for (const l of ['fr', 'es', 'tr', 'en']) {
      await setLang(page, l); const x = await home(page);
      check(`${l}: Home card label, value and disclaimer`, x.label === TXT[l].label && x.val === shown(p, l) && x.aria === x.val && x.disc === TXT[l].disc, `"${x.label}" "${x.val}"`);
    }
    errCheck();

    console.log('\n-- Safari user agent (a fresh browser: no dismissals, no disclaimer shown yet)');
    await reopen({ ua: SAFARI_UA });
    check('sidecar blocked for this user agent', await page.evaluate(() => VL_SIDECAR_BLOCKED), '');
    await goHome(page); h = await home(page);
    check('Home card shown, with today\'s total', h.card && h.gauge && h.val === shown(p, 'en'), `"${h.val}"`);
    await startTuner(page); await sleep(4000);
    check('Tuner can\'t feed the load here: no banner', !(await banner(page)).up && await page.evaluate(TUNER), '');
    await stopTuner(page);
    await startCoach(page);
    r = await singUntilBanner(page, COACH, 10000);
    check('Register Coach feeds it: the 100% banner, with the disclaimer', r.b.up && r.b.level === '100' && r.b.panel === 'panel-register' && r.b.disc === TXT.en.disc, JSON.stringify({ up: r.b.up, level: r.b.level, disc: !!r.b.disc }));
    await stopCoach(page); errCheck();

    console.log('\n-- signed out');
    await reopen({ signedIn: false });
    h = await home(page);
    check('no Home card, no banner', !h.card && !(await banner(page)).up, '');
    errCheck();
    await ctx.close(); ctx = null;
  } catch (e) { check('ran to the end', false, e.message.split('\n')[0]); }
  finally {
    try { cleanup(); } finally { await Promise.race([b.close().catch(() => {}), sleep(10000)]); }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exitCode = fail ? 1 : 0;
})();
