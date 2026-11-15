// Scoring survey item 5: this Mac's audio latency in Chrome and Safari (latency.html: outputLatency, baseLatency, the mic
// track's reported latency, and a speaker-to-mic click round trip on the AudioContext clock), mic echo cancellation off
// and on (the app's mic has it on). Chrome through Playwright (the installed Google Chrome, a window of its own: headless
// has no real audio device); Safari through safaridriver when remote automation is on, else the page is left open in
// Safari for one click. Results: logs/latency-<stamp>.json.
// Release B (B2) added --rig: the app's own speaker-delay measurement (sdOpen → sdMeasure, deploy/ served locally) in
// headless Chromium with a known delay between the app's output and its mic. Every node the app connects to its
// AudioContext's destination is also sent through a MediaStream to a second AudioContext, delayed there by exactly D ms
// (a DelayNode) over a faint noise floor (−60 dBFS), and that is the app's microphone. The rig's own path (D = 0) is
// measured first, then each known D in the same page: measured(D) − measured(0) = D within ±5 ms. With the loop cut (no
// output reaches the mic) the sheet must say it couldn't hear the clicks and use the estimate (reported + 50 ms, read live).
// Usage: node scripts/scoring-verify/latency.js [--runs 3] [--browsers chrome,safari]
//        node scripts/scoring-verify/latency.js --rig 0,120,250 [--runs 2]
require('../runguard').auto();
const http = require('http'), fs = require('fs'), path = require('path');
const { spawn, execFileSync } = require('child_process');
const { chromium } = require('playwright');
const G = require('../runguard');
const arg = n => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : null; };
const RUNS = +(arg('--runs') || 3), BROWSERS = (arg('--browsers') || 'chrome,safari').split(',');
const PORT = 8790, PAGE = fs.readFileSync(path.join(__dirname, 'latency.html'));
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19), OUT = path.join(__dirname, 'logs', `latency-${stamp}.json`);
fs.mkdirSync(path.dirname(OUT), { recursive: true });
const RIG = arg('--rig') ? arg('--rig').split(',').map(Number) : null;
const results = []; let waiting = null;
const server = http.createServer((q, r) => {
  if (q.method === 'POST' && q.url === '/result') { let b = ''; q.on('data', c => b += c); q.on('end', () => { const j = JSON.parse(b); results.push(j); if (waiting) waiting(j); r.end('ok'); }); return; }
  r.writeHead(200, { 'Content-Type': 'text/html' }); r.end(PAGE);
});
const sleep = ms => new Promise(r => setTimeout(r, ms));
const next = s => new Promise((res, rej) => { const t = setTimeout(() => rej(new Error('no result in ' + s + ' s')), s * 1000); waiting = j => { clearTimeout(t); waiting = null; res(j); }; });
const show = (b, j) => console.log(`${b} aec ${j.aec ? 'on ' : 'off'}: base ${fmt(j.baseLatency)} out ${fmt(j.outputLatency)} track ${fmt(j.track && j.track.latency)} · clicks ${j.clicks ? `${j.clicks.heard}/10, median ${j.clicks.medianMs} ms, spread ${j.clicks.spreadMs} ms` : '—'}${j.error ? ' · error ' + j.error : ''}`);
const fmt = s => s === null || s === undefined ? '—' : (s * 1000).toFixed(1) + ' ms';

async function wd(method, url, body) { // a WebDriver call to safaridriver
  const r = await fetch('http://localhost:4445' + url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
  return r.json();
}

const { LOOP } = require('./loopmic');
async function rig() {
  const C = require('../design-verify/common');
  const b = await C.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  let pass = 0, fail = 0; const check = (n, ok, d) => { console.log(`  ${ok ? '✓' : '✗'} ${n}${d ? ` — ${d}` : ''}`); ok ? pass++ : fail++; };
  // one sheet's measurement in an open page (the loop's delay set first, when there is a loop)
  const sheet = (page, D) => page.evaluate(async D => {
    window.__sdAllow = true; localStorage.removeItem(SD_STORE_KEY);
    await initAudio({ noWarmup: true }); // the loop is linked when the app opens the mic
    if (D !== null) { window.__loopDelay.delayTime.value = D / 1000; await new Promise(r => setTimeout(r, 300)); }
    sdKeyNow = await sdOutputKey(); sdOpen();
    const ov = document.getElementById('speakerDelayOverlay'), t0 = performance.now();
    while (ov.dataset.sdState === 'measuring' && performance.now() - t0 < 15000) await new Promise(r => setTimeout(r, 100));
    const st = sdStored(); const shown = { state: ov.dataset.sdState, title: document.getElementById('sdTitle').textContent, body: document.getElementById('sdBody').textContent };
    document.getElementById('sdContinueBtn').click();
    const rep = sdReportedMs(), now = sdNow(); // the estimate is live: read with the reported value in the same tick
    return { ...st, ms: st && st.how === 'measured' ? st.ms : now.ms, now, shown, reported: rep };
  }, D);
  try {
    // The rig's own path (D = 0) and each known D in the same page: the path between its two AudioContexts moves in
    // 10 ms chunks, and where they fall is set when the page opens, so measured(D) − measured(0) is taken in one page.
    for (let k = 0; k < RUNS; k++) {
      const { ctx, page } = await C.openPage(b, { prepare: c => c.addInitScript(LOOP, 0) });
      try {
        await C.clearOverlays(page);
        let base = null;
        for (const D of [0, ...RIG.filter(d => d !== 0)]) await G.step(`rig ${D} ms #${k + 1}`, 40, async () => { // normally 6 s
          const r = await sheet(page, D); results.push({ rig: D, run: k + 1, ...r });
          console.log(`rig ${String(D).padStart(3)} ms #${k + 1}: ${r.how} ${r.ms} ms (${r.heard} of 10 clicks) · "${r.shown.title}"`);
          if (D === 0) { check(`run ${k + 1}: the rig's own path (0 ms) is measured`, r.how === 'measured', `${r.how} ${r.ms} ms`); if (r.how === 'measured') base = r.ms; return; }
          check(`run ${k + 1}: a known ${D} ms comes back within ±5 ms`, base !== null && r.how === 'measured' && Math.abs(r.ms - base - D) <= 5,
            `measured ${r.ms} − rig ${base} = ${base === null ? 'n/a' : r.ms - base} ms`);
        });
        // past the 320 ms search (310 + the rig's own ~35): each click is heard only after the next one, whose aliases
        // disagree, so the sheet fails to the estimate rather than reading a short delay
        if (k === 0) await G.step('rig 310 ms (past the search)', 40, async () => {
          const r = await sheet(page, 310); results.push({ rig: 310, run: 1, ...r });
          console.log(`rig 310 ms #1: ${r.how} ${r.ms} ms (${r.heard} of 10 clicks) · "${r.shown.title}"`);
          check('a round trip past the search: the estimate, not a short reading', r.how === 'estimate' && r.shown.state === 'failed', `${r.how} ${r.ms} ms, ${r.heard} heard`);
        });
      } finally { await ctx.close(); }
    }
    await G.step('rig: no loop', 40, async () => {
      const { ctx, page } = await C.openPage(b, { prepare: c => c.addInitScript(LOOP, null) });
      try {
        await C.clearOverlays(page);
        const r = await sheet(page, null); results.push({ rig: null, ...r });
        check('no loop: "couldn\'t hear the clicks", the estimate used (reported + 50 ms, read live)', r.how === 'estimate' && r.shown.state === 'failed' && r.now.how === 'estimate' && r.now.ms === r.reported + 50, `${r.how} ${r.ms} ms, reported ${r.reported} ms, "${r.shown.body}"`);
      } finally { await ctx.close(); }
    });
  } finally { await b.close(); }
  console.log(`\n${fail ? 'LATENCY RIG: FAIL' : 'LATENCY RIG: PASS'} (${pass} passed, ${fail} failed)`);
  process.exitCode = fail ? 1 : 0;
}

(async () => {
  if (RIG) { try { await rig(); } finally { fs.writeFileSync(OUT, JSON.stringify(results, null, 1)); console.log('json:', path.relative(process.cwd(), OUT)); } return; }
  await new Promise(r => server.listen(PORT, r));
  try {
    if (BROWSERS.includes('chrome')) {
      const b = await chromium.launch({ channel: 'chrome', headless: false, args: ['--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
      try {
        for (let k = 0; k < RUNS; k++) for (const aec of [0, 1]) await G.step(`chrome aec ${aec} #${k + 1}`, 40, async () => { // normally 9 s
          const ctx = await b.newContext({ permissions: ['microphone'] }), p = await ctx.newPage();
          const got = next(30); await p.goto(`http://localhost:${PORT}/?auto=1&aec=${aec}`); const j = await got; j.browser = 'chrome'; show('chrome', j); await ctx.close();
        });
      } finally { await b.close(); }
    }
    if (BROWSERS.includes('safari')) {
      const sd = spawn('safaridriver', ['-p', '4445'], { stdio: 'ignore' }); await sleep(1500);
      try {
        const s = await wd('POST', '/session', { capabilities: { alwaysMatch: { browserName: 'safari' } } });
        const id = s.value && s.value.sessionId;
        if (!id) { console.log('safari: no WebDriver session —', JSON.stringify(s.value).slice(0, 200)); results.push({ browser: 'safari', error: 'safaridriver: ' + JSON.stringify(s.value).slice(0, 300) }); }
        else try {
          for (let k = 0; k < RUNS; k++) for (const aec of [0, 1]) await G.step(`safari aec ${aec} #${k + 1}`, 45, async () => {
            const got = next(35); await wd('POST', `/session/${id}/url`, { url: `http://localhost:${PORT}/?auto=0&aec=${aec}` }); await sleep(800);
            await wd('POST', `/session/${id}/element`, { using: 'css selector', value: '#go' }).then(e => wd('POST', `/session/${id}/element/${Object.values(e.value)[0]}/click`, {}));
            const j = await got.catch(e => ({ error: String(e.message), aec: !!aec })); j.browser = 'safari'; show('safari', j); if (j.error && !j.ua) results.push(j);
          });
        } finally { await wd('DELETE', `/session/${id}`); }
      } finally { sd.kill(); }
    }
  } finally {
    server.close(); fs.writeFileSync(OUT, JSON.stringify(results.filter(Boolean), null, 1)); console.log('json:', path.relative(process.cwd(), OUT));
  }
})();
