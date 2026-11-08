// Stay in Key's ring at its real in/out-of-key edges (the steady A4 against the song's chords), and Breath's ring while
// locked-pulse is on (added by hand: its real trigger is reaching the goal). contrast.js's measure, read mid-transition.
const R = __dirname + '/'; // usage: node scripts/design-verify/rings7.js [<git ref>]  (default: the working copy)
const fs = require('fs'), C = require(R + 'common'), St = require(R + 'stage'), T6 = require(R + 'tools6');
const src = fs.readFileSync(R + 'contrast.js', 'utf8'); const i0 = src.indexOf('async function measure('), i1 = src.indexOf('\n}\n', i0) + 2;
const MEASURE = src.slice(i0, i1);
const BASE = process.argv[2] || null;
(async () => {
  St.ensureStimuli(); const dir = C.buildDir(BASE);
  const b0 = await C.chromium.launch(); const o = await C.openPage(b0, { dir }); await C.signUp(o.page, 'dvrg'); const state = await o.ctx.storageState(); await b0.close();
  const tool = T6.TOOLS.find(t => t.key === 'staykey');
  for (const theme of ['light', 'dark']) {
    const b = await St.launchMic(St.STIM.steady);
    try {
      const { page } = await C.openPage(b, { dir, theme, storageState: state }); await C.clearOverlays(page); await St.warmMic(page);
      await tool.open(page); await tool.act(page); await C.sleep(2500);
      const r = await page.evaluate(async ([msrc, edges]) => {
        const m = eval('(' + msrc + ')'), w = document.getElementById('stayKeyRingWrap'), on = () => w.classList.contains('locked-pulse');
        const out = []; const tEnd = performance.now() + 25000;
        while (out.length < edges && performance.now() < tEnd && stayKeyActive) {
          const was = on(); while (on() === was && performance.now() < tEnd && stayKeyActive) await new Promise(r => requestAnimationFrame(r));
          if (!stayKeyActive) break;
          const edge = on() ? 'on' : 'off', te = performance.now(); let worst = null, n = 0, below3 = 0;
          while (performance.now() - te < 200) { const it = await m({ sel: '#stayKeyRingWrap', now: true }); n++;
            for (const x of it) { if (x.ratio < 3) below3++; if (!worst || x.ratio < worst.ratio) worst = { ratio: x.ratio, text: x.text, fg: x.fg, bg: x.bg, ms: Math.round(performance.now() - te) }; }
            await new Promise(r => requestAnimationFrame(r)); }
          out.push({ edge, frames: n, below3, worst });
        }
        return out;
      }, [MEASURE, 12]);
      for (const e of r) console.log(`${BASE || 'branch'} ${theme} staykey ${e.edge.padEnd(3)} ${e.frames} frames  below 3:1 ${e.below3}  worst ${e.worst ? `${e.worst.ratio} "${e.worst.text}" ${e.worst.fg} on ${e.worst.bg} at ${e.worst.ms} ms` : '—'}`);
      if (!r.length) console.log(`${BASE || 'branch'} ${theme} staykey: no in/out-of-key edge in 25 s`);
      await page.evaluate(() => { if (stayKeyActive) document.getElementById('stayKeyStartBtn').click(); }); await C.sleep(800);
      // Breath: live, then locked-pulse by hand for its 1.1 s
      await C.showPanel(page, 'breath'); await C.clearOverlays(page);
      await page.evaluate(() => document.getElementById('breathStartBtn').click()); await C.sleep(1500);
      const br = await page.evaluate(async msrc => { const m = eval('(' + msrc + ')'); const w = document.getElementById('breathRingWrap');
        w.classList.add('locked-pulse'); await new Promise(r => setTimeout(r, 300));
        const it = await m({ sel: '#breathRingWrap', now: true }); w.classList.remove('locked-pulse');
        return it.map(x => ({ text: x.text, ratio: x.ratio, fg: x.fg, bg: x.bg })); }, MEASURE);
      console.log(`${BASE || 'branch'} ${theme} breath locked-pulse: ${br.map(x => `"${x.text}" ${x.ratio} (${x.fg} on ${x.bg})`).join(' · ')}`);
      await page.evaluate(() => { if (breathActive) document.getElementById('breathStartBtn').click(); });
    } finally { await b.close(); }
  }
  C.cleanup();
})();
