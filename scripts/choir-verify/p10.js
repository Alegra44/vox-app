// Phase 10 Growth Hooks check, signed in, with real runs. Signs up one fresh trial account (voxcoach-p10-<ts>-a@example.com)
// through the real auth modal; it is deleted when the script exits (testAccounts.js), pass or fail.
//  delta: on Demo Hymn / Alto, with a stand-in singer: a failed Harmony Memory run (Learning, no snapshot), stage 1
//    passed (Learning → Developing: snapshot taken), stage 2 passed, Boss 1 won, then 5 level play-throughs, stages 3–5
//    and Boss 2 (Developing → Ready: the snapshot moves). After each run the Home card's delta line is compared with
//    one recomputed independently from the DB row (npx supabase db query --linked). Then a second device, en/fr/es/tr,
//    and the "when" wording for older snapshots (cwWhen, pure date formatting).
//  export: Soprano, Alto and Bass recorded through the real record button, each "sung" by a sine stand-in playing
//    that part's written notes; the real Download button is clicked and the WAV is saved, then decoded outside the
//    browser by wavcheck.py. A second export with Bass muted and Alto at 50% on the mixer (real clicks) must match.
// Usage: node scripts/choir-verify/p10.js [delta|export|all] [url]
const { chromium } = require('playwright');
require('../warmup-verify/noWarmup'); // the pre-session warm-up is skipped for this script (see that file)
const { execFileSync } = require('child_process');
const path = require('path'), fs = require('fs');
const { track, db } = require('./testAccounts');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const mode = process.argv[2] || 'all';
const url = process.argv[3] || 'http://localhost:8765/';
const OUT = process.env.P10_OUT || require('os').tmpdir();
const A = { email: track(`voxcoach-p10-${Date.now()}-a@example.com`), password: 'P10-' + Math.random().toString(36).slice(2) + '!x9' };

async function openPage(browser, errors) {
  const ctx = await browser.newContext({ permissions: ['microphone'], viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  const page = await ctx.newPage();
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error' && !/progress (load|save) error|Not signed in/.test(m.text())) errors.push(m.text()); });
  await page.goto(url, { waitUntil: 'load' }); await sleep(3000);
  const lang = page.locator('#languageSelectOverlay [data-lang="en"]');
  if (await lang.isVisible()) { await lang.click(); await sleep(300); }
  return page;
}
async function auth(page, a, m) {
  await page.evaluate(() => openAuthModal());
  if (m === 'signin') await page.locator('#authModeToggle').click();
  else await page.locator('#authName').fill('P10 Growth');
  await page.locator('#authEmail').fill(a.email); await page.locator('#authPassword').fill(a.password);
  await page.locator('#authCreateBtn').click();
  await page.waitForFunction(() => !!profile && document.getElementById('authModalOverlay').style.display === 'none', null, { timeout: 20000 });
  await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
  return page.evaluate(async () => (await sb.auth.getSession()).data.session.user.id);
}
const txt = (page, sel) => page.evaluate(s => { const el = document.querySelector(s); return el ? el.innerText.replace(/\s+/g, ' ').trim() : null; }, sel);
async function home(page) { await page.locator('.snb-item[data-shell="home"]').click(); await sleep(300); return { card: await txt(page, '#homeChoirCard'), delta: await txt(page, '#homeCwDelta') }; }

// The English delta line recomputed from the stored row alone (not from the page's functions).
function expectedDelta(row) {
  const s = row.snap;
  if (!s) return null;
  const n = [['levels', row.levels.length - s.levels, 'rehearsal level played', 'rehearsal levels played'],
    ['hm', row.hmPassed - s.hm, 'Harmony Memory stage', 'Harmony Memory stages'], ['bosses', row.bossesBeaten - s.bosses, 'boss beaten', 'bosses beaten']]
    .filter(x => x[1] > 0).map(x => `+${x[1]} ${x[1] === 1 ? x[2] : x[3]}`);
  if (!n.length) return null;
  const st = { learning: 'Learning', developing: 'Developing', ready: 'Ready' }[s.status];
  const sameDay = s.ts && new Date(s.ts).toDateString() === new Date().toDateString();
  return (s.ts ? `Since you were ${st} (${sameDay ? 'today' : '?'}): ` : 'Since you started: ') + n.join(' · ');
}

(async () => {
  const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const errors = [];
  const page = await openPage(browser, errors);
  const ev = (f, a) => page.evaluate(f, a);
  let saves = 0;
  page.on('response', r => { if (/\/me\/progress$/.test(r.url()) && r.request().method() === 'PATCH') saves++; });
  const settle = async before => { for (let i = 0; i < 100 && saves <= before; i++) await sleep(200); let n = -1; while (n !== saves) { n = saves; await sleep(1500); } };
  const uid = await auth(page, A, 'signup');
  console.log('account', A.email, uid, '| plan:', JSON.stringify(await ev(() => ({ tier: currentTier(), inTrial: isInTrial(), choirWorld: hasChoirWorldAccess() }))));
  await ev(() => ['choirChallengeBest', 'harmonyMemoryBest', 'rehearsalPasses', 'yourChoirTakes'].forEach(k => localStorage.removeItem(k)));

  if (mode === 'delta' || mode === 'all') {
    console.log('\n==== DELTA (Demo Hymn, Alto)');
    await ev(() => { enterPanel('partrehearsal'); selectSong('hymn'); setRehearsalPart('Alto'); setRehearsalLevel(0); harmonyMemory.stage = 0; renderPartRehearsal(); });
    const standIn = silent => ev(sil => {
      const osc = audioCtx.createOscillator(), g = audioCtx.createGain(), an = audioCtx.createAnalyser();
      an.fftSize = 2048; g.gain.value = 0; osc.connect(g).connect(an); osc.start();
      const run = harmonyMemory.active ? harmonyMemory : challenge;
      run.notes.forEach(nt => { const on = choirStartCtxTime + nt.start; osc.frequency.setValueAtTime(noteToFreq(nt.midi), on); g.gain.setValueAtTime(sil ? 0 : 0.3, on); g.gain.setValueAtTime(0, choirStartCtxTime + nt.end - 0.01); });
      analyser = an;
    }, !!silent);
    const waitDone = () => ev(async () => { while (harmonyMemory.active || challenge.active) await new Promise(r => setTimeout(r, 50)); });
    const check = async label => {
      const h = await home(page);
      const row = db(`select choir_readiness->'parts'->'hymn'->'Alto' as alto from public.user_progress where user_id = '${uid}'`)[0].alto;
      const exp = expectedDelta(row);
      const shown = h.delta ? h.delta.replace(/^📈\s*/, '') : null;
      console.log(`\n--- ${label}\n[home] ${h.card}\n[DB] status ${row.status} | now levels ${row.levels.length} hm ${row.hmPassed} bosses ${row.bossesBeaten} | snap ${JSON.stringify(row.snap || null)}${row.snap && row.snap.ts ? ' (' + new Date(row.snap.ts).toISOString() + ')' : ''}\n[delta shown]    ${shown}\n[delta from DB]  ${exp}\n${shown === exp ? 'MATCH' : 'MISMATCH'}`);
      await ev(() => enterPanel('partrehearsal'));
      return row;
    };
    const hm = async (stage, silent) => {
      const before = saves;
      await ev(s => { harmonyMemory.stage = s; renderPartRehearsal(); }, stage);
      await ev(async () => { document.getElementById('hmemStartBtn').click(); while (!(harmonyMemory.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
      await standIn(silent); await waitDone(); await settle(before);
      return ev(() => ({ score: harmonyMemory.lastRun.score, passed: harmonyMemory.lastRun.passed }));
    };
    const boss = async slot => {
      const before = saves;
      await ev(s => { chSel.boss = s; renderChoirBosses(); }, slot);
      await ev(async () => { document.getElementById('cbStartBtn').click(); while (!(challenge.active && choirIsPlaying)) await new Promise(r => setTimeout(r, 20)); });
      await standIn(false); await waitDone(); await settle(before);
      return ev(() => ({ score: challenge.lastRun.boss.score, passed: challenge.lastRun.boss.passed }));
    };

    await check(`HM stage 1, silent (fails): ${JSON.stringify(await hm(0, true))}`);
    const r1 = await check(`HM stage 1 passed: ${JSON.stringify(await hm(0))}`);
    await check(`HM stage 2 passed: ${JSON.stringify(await hm(1))}`);
    await check(`Boss 1: ${JSON.stringify(await boss(0))}`);
    let before = saves;
    for (let L = 0; L < 5; L++) await ev(async l => { setRehearsalLevel(l); await startPartRehearsal(0); const s0 = choirStartCtxTime; while (choirStartCtxTime === s0) await new Promise(r => setTimeout(r, 50)); stopPartRehearsal(); }, L);
    await settle(before);
    await check('5 level play-throughs');
    for (let s = 2; s < 5; s++) console.log(`HM stage ${s + 1}:`, JSON.stringify(await hm(s)));
    await check('HM stages 3–5 passed (still Developing: 1 boss)');
    const rR = await check(`Boss 2: ${JSON.stringify(await boss(1))} (→ Ready: the snapshot moves to the Developing record)`);
    console.log('\nsnapshot after 1st change kept its ts until the 2nd change:', r1.snap.ts, '→', rR.snap.ts);
    const log = db(`select choir_readiness->'log' as log from public.user_progress where user_id = '${uid}'`)[0].log;
    console.log('status log:', JSON.stringify(log.map(l => ({ ts: new Date(l.ts).toISOString(), from: l.from, to: l.status }))));

    // second device, empty localStorage: the snapshot comes from the account
    const errors2 = [], page2 = await openPage(browser, errors2);
    await auth(page2, A, 'signin');
    const d1 = await home(page), d2 = await home(page2);
    console.log('\nsecond device delta:', d2.delta, '| same as device 1:', d2.delta === d1.delta);
    await page2.context().close();

    for (const lg of ['fr', 'es', 'tr', 'en']) { await ev(l => setLanguage(l), lg); await sleep(300); console.log(`[${lg}]`, (await home(page)).delta); }
    // Older snapshots: the "when" part, from the same function the card uses (date formatting only).
    for (const lg of ['en', 'fr', 'es', 'tr']) {
      await ev(l => setLanguage(l), lg);
      console.log(`cwWhen ${lg}:`, JSON.stringify(await ev(() => [0, 1, 3, 7, 13, 20, 60].map(d => `${d}d → ${cwWhen(Date.now() - d * 86400000)}`))));
    }
    await ev(() => setLanguage('en'));
  }

  if (mode === 'export' || mode === 'all') {
    console.log('\n==== EXPORT (Demo Hymn: Soprano, Alto, Bass)');
    await ev(async () => {
      enterPanel('choir'); selectSong('hymn'); await initAudioOnly(); ensureChoirGainNodes();
      const dest = audioCtx.createMediaStreamDestination(), osc = audioCtx.createOscillator(), g = audioCtx.createGain();
      g.gain.value = 0; osc.connect(g).connect(dest); osc.start();
      window.__mic = { osc, g }; micStream = dest.stream;
    });
    const record = async part => {
      await page.locator(`#ycParts [data-yc-rec="${part}"]`).click();
      await ev(async () => { while (!(yourChoir.recording && yourChoir.recording.downbeat)) await new Promise(r => setTimeout(r, 10)); });
      await ev(p => {
        const cd = songChordDurMs() / 1000, t0 = yourChoir.recording.downbeat, { osc, g } = __mic;
        SONG.parts[p].notes.forEach((m, i) => { osc.frequency.setValueAtTime(noteToFreq(m), t0 + i * cd); g.gain.setValueAtTime(0.4, t0 + i * cd); g.gain.setValueAtTime(0, t0 + (i + CHOIR_NOTE_FRACTION) * cd); });
      }, part);
      await ev(async () => { while (yourChoir.recording) await new Promise(r => setTimeout(r, 50)); });
      console.log(`recorded ${part}:`, await txt(page, '#ycStatus'));
    };
    for (const p of ['Soprano', 'Alto', 'Bass']) await record(p);
    const expect = await ev(() => ({ chordDur: songChordDurMs() / 1000, parts: Object.fromEntries(['Soprano', 'Alto', 'Bass'].map(p => [p, SONG.parts[p].notes])), total: songTotalDurMs() / 1000 }));
    const expFile = path.join(OUT, 'p10-expect.json'); fs.writeFileSync(expFile, JSON.stringify(expect));
    console.log('song total', expect.total, 's; mixer', JSON.stringify(await ev(() => Object.fromEntries(Object.entries(choirState).map(([p, s]) => [p, { vol: s.volume, muted: s.muted, solo: s.solo }])))));

    const doExport = async label => {
      console.log(`\n-- ${label}`);
      console.log('before: button', JSON.stringify(await txt(page, '#ycExportBtn')), '| note', JSON.stringify(await txt(page, '#ycExportNote')));
      const dl = page.waitForEvent('download', { timeout: (expect.total + 60) * 1000 });
      await page.locator('#ycExportBtn').click();
      await sleep(1500);
      console.log('during: button', JSON.stringify(await txt(page, '#ycExportBtn')), 'disabled', await page.locator('#ycExportBtn').isDisabled(), '| record buttons disabled', await page.locator('#ycParts [data-yc-rec="Tenor"]').isDisabled(), '| status', JSON.stringify(await txt(page, '#ycStatus')));
      const d = await dl;
      const file = path.join(OUT, `p10-${label.replace(/\W+/g, '-')}-${d.suggestedFilename()}`);
      await d.saveAs(file);
      await sleep(300);
      console.log('after: status', JSON.stringify(await txt(page, '#ycStatus')), '| button', JSON.stringify(await txt(page, '#ycExportBtn')), 'disabled', await page.locator('#ycExportBtn').isDisabled());
      console.log('saved', file, fs.statSync(file).size, 'bytes; first bytes', JSON.stringify(fs.readFileSync(file).subarray(0, 16).toString('latin1')));
      const out = execFileSync('python', [path.join(__dirname, 'wavcheck.py'), file, expFile], { encoding: 'utf8' });
      console.log(out.trim());
      return JSON.parse(out.slice(out.indexOf('JSON ') + 5));
    };
    const e1 = await doExport('all three at default mixer');
    // Real mixer clicks: Bass muted, Alto fader to 50%
    await page.locator('#muteBass').click();
    const altoBefore = await ev(() => choirState.Alto.volume);
    await page.locator('#volAlto').fill(String(Math.round(altoBefore * 50)));
    console.log('\nmixer now', JSON.stringify(await ev(() => ({ Alto: choirState.Alto.volume, BassMuted: choirState.Bass.muted }))));
    const e2 = await doExport('Bass muted, Alto at half');
    const ratio = (e, p) => e.parts[p].medianAmp / e.parts.Soprano.medianAmp;
    console.log(`\nAlto/Soprano amplitude: ${ratio(e1, 'Alto').toFixed(3)} → ${ratio(e2, 'Alto').toFixed(3)} (×${(ratio(e2, 'Alto') / ratio(e1, 'Alto')).toFixed(3)}; fader ×${(await ev(() => choirState.Alto.volume) / altoBefore).toFixed(3)})`);
    console.log(`Bass: heard on ${e1.parts.Bass.heard}/${e1.parts.Bass.chords} chords → ${e2.parts.Bass.heard}/${e2.parts.Bass.chords} muted (median amp ${e1.parts.Bass.medianAmp} → ${e2.parts.Bass.medianAmp})`);
    await page.locator('#muteBass').click();
    await page.locator('#volAlto').fill(String(Math.round(altoBefore * 100)));

    // Stop mid-export: nothing may download
    let got = false; page.once('download', () => { got = true; });
    await page.locator('#ycExportBtn').click(); await sleep(3000);
    await page.locator('#ycStopBtn').click(); await sleep(1500);
    console.log('\nstopped mid-export: status', JSON.stringify(await txt(page, '#ycStatus')), '| download fired:', got, '| button enabled again:', !(await page.locator('#ycExportBtn').isDisabled()));

    for (const lg of ['fr', 'es', 'tr', 'en']) { await ev(l => setLanguage(l), lg); await sleep(200); console.log(`[${lg}] button ${JSON.stringify(await txt(page, '#ycExportBtn'))} | note ${JSON.stringify(await txt(page, '#ycExportNote'))} | ${JSON.stringify(await ev(l => ['yc_exporting_btn', 'yc_exporting_tpl', 'yc_exported_tpl', 'yc_export_cancelled', 'yc_export_failed'].map(k => t(k))))}`); }
  }

  console.log('\npage errors:', errors);
  await browser.close();
})().catch(e => { console.error(e); process.exitCode = 1; });
