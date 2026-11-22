// WARMUP.md item 5: the four proposals as 390 × 844 mockups in House Lights. Each is the real app (deploy/, the local
// stack, a throwaway account) with the proposal's markup put into the screen it belongs to, built only from the app's
// own House Lights classes and tokens (hl-label, hl-item, hl-spread, hl-meter, hl-coach, hl-btn, wu-item, vl-break …).
// No app change: the markup exists only in the page the screenshot is taken of. The numbers in them are examples, each
// one of the kind the app measures today or could measure from what it already reads (see WARMUP.md).
// Usage: VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js" node scripts/warmup-verify/mockups.js [outdir]
require('../runguard').auto();
const fs = require('fs'), path = require('path');
const { sleep, tone, launch, openPage } = require('./common');
const { cleanup } = require('../choir-verify/testAccounts');
const OUT = process.argv[2] && !/^https?:/.test(process.argv[2]) ? process.argv[2] : 'design/warmup/shots';
fs.mkdirSync(OUT, { recursive: true });

// The warm-up overlay, open, with its list put aside: the screen the summary, the streak line and the banner fix go into.
const OPEN_WU = () => { window.__wuAllow = true; wuPassedKey = null; try { localStorage.removeItem(wuKey()); } catch (e) {} wuOpen(); };
const MOCKS = {
  // 1. the summary at the end of the warm-up: only measured things, and the one next step
  summary: () => {
    const ROW = (label, val, meter, note) => `<div style="padding:10px 0;border-top:1px solid var(--hl-rule)">
      <div class="hl-spread"><span>${label}</span><span class="hl-tabular" style="font-weight:560">${val}</span></div>
      ${meter != null ? `<div class="hl-meter" style="margin-top:6px;--part:var(--hl-voice)"><i style="--val:${meter}%"></i></div>` : ''}
      ${note ? `<div class="hl-item-meta" style="margin-top:4px">${note}</div>` : ''}</div>`;
    const card = document.querySelector('#warmupOverlay .wu-card');
    card.querySelector('.wu-tabs').style.display = 'none'; document.getElementById('warmupList').style.display = 'none';
    document.getElementById('warmupTitle').textContent = 'Warmed up'; document.getElementById('warmupSkipBtn').style.visibility = 'hidden';
    card.querySelector('.trial-modal-sub').textContent = '3 exercises · 1 min 10 s sung';
    const box = document.createElement('div'); box.id = 'mockSummary';
    box.innerHTML = `
      <div class="hl-label" style="margin:4px 0 2px">Range reached</div>
      <div class="hl-spread" style="padding:6px 0 10px"><span class="hl-stat-value">C3 – G4</span><span class="hl-item-meta">your stored range C3 – C5</span></div>
      <div class="hl-label" style="margin-top:6px">How closely you followed the line</div>
      ${ROW('Lip trills', '82 %', 82, 'of the sung time within a semitone of the line')}
      ${ROW('Sirens', '64 %', 64, 'lost the line above E4 on the way up')}
      ${ROW('Humming', '91 %', 91, 'steady: ±12 cents around D3')}
      <p class="hl-coach" style="margin:16px 0 8px">Your sirens stopped at G4 today, five semitones under your top note. That's normal early on; go easy upward.</p>
      <div style="padding:12px 0;border-top:1px solid var(--hl-rule)">
        <div class="hl-label">Next</div>
        <div class="hl-spread" style="margin-top:4px"><b>Register Coach</b><span class="hl-item-meta">the sirens broke at E4</span></div>
      </div>`;
    document.getElementById('warmupStatus').before(box);
    const c = document.getElementById('warmupContinueBtn'); c.style.display = 'flex'; c.textContent = 'Start my session';
    const q = document.createElement('button'); q.className = 'hl-btn hl-btn--quiet'; q.textContent = 'Open Register Coach'; c.before(q);
  },
  // 2. the warm-up streak: in the warm-up's own header, and on Home next to the practice streak
  streak_overlay: () => {
    const sub = document.querySelector('#warmupOverlay .trial-modal-sub');
    const line = document.createElement('div'); line.className = 'hl-row hl-meta'; line.style.margin = '0 0 12px';
    line.innerHTML = '<svg class="hl-icon hl-icon--s" aria-hidden="true"><use href="#hl-warmup"/></svg><span><b>4 days</b> warmed up in a row · one exercise keeps it</span>';
    sub.after(line);
  },
  streak_home: () => {
    const s = document.getElementById('homeStatsLine'); s.hidden = false;
    s.querySelector('.shell-streak-n').textContent = '12';
    s.querySelector('.shell-level-n').textContent = '7';
    const sep = document.createElement('span'); sep.className = 'home-stats-sep'; sep.setAttribute('aria-hidden', 'true'); sep.textContent = '·';
    const wu = document.createElement('span'); wu.className = 'shell-streak'; wu.style.color = 'var(--hl-ink-2)';
    wu.innerHTML = '<svg class="hl-icon hl-icon--s" aria-hidden="true"><use href="#hl-warmup"/></svg><span>4</span>';
    s.append(sep, wu);
    document.getElementById('homeStreakLine').textContent = '12 days practising · warmed up 4 of them in a row';
  },
  // 3. one warm-up: Coach → Warm-up is the same exercises as the pre-session one; once a day; one XP rule
  one: () => {
    const p = document.getElementById('panel-warmup');
    p.querySelector('.j-title').textContent = 'Warm-up';
    p.querySelector('.j-sub').textContent = "The same warm-up that's offered before your first session. Sing at least one exercise to count today.";
    const kc = p.querySelector('.key-card');
    kc.innerHTML = `
      <p class="hl-meta" style="margin:0 0 12px">Morning: longer, gentler slides. You haven't sung for 2 days. Starts low for your weakest area, Range.</p>
      <div class="wu-list">
        <button class="wu-item done"><span class="wu-text"><b>Lip trills</b><small>Loose lips, blow a “brrr” and ride the little waves.</small></span><span class="wu-go"><svg class="hl-icon hl-icon--s" aria-hidden="true"><use href="#hl-check"/></svg>Done</span></button>
        <button class="wu-item"><span class="wu-text"><b>Sirens</b><small>Slide on “woo” from low to high and back, like a siren.</small></span><span class="wu-go">Start</span></button>
        <button class="wu-item"><span class="wu-text"><b>Sustained glides</b><small>One long, slow slide up and down on “ah”.</small></span><span class="wu-go">Start</span></button>
        <button class="wu-item"><span class="wu-text"><b>Humming</b><small>Lips closed, hum “mmm” on one comfy note.</small></span><span class="wu-go">Start</span></button>
        <button class="wu-item"><span class="wu-text"><b>Song warm-up</b><small>A song you know, on the roll, with the backing chords</small></span><span class="wu-go">Choose</span></button>
      </div>
      <div class="hl-raised" style="padding:14px 16px;border-radius:var(--hl-r2)">
        <div class="hl-spread"><b>Warmed up today</b><span class="hl-item-meta">+5 XP · once a day</span></div>
        <div class="hl-item-meta" style="margin-top:4px">Counted when you finish one exercise (20 s). Doing more today is welcome; it doesn't add XP.</div>
      </div>`;
  },
  // 4. the banner fix: the break banner on the warm-up's own stage, above the exercises
  banner: () => {
    const card = document.querySelector('#warmupOverlay .wu-card');
    const b = document.createElement('div'); b.className = 'vl-break'; b.setAttribute('role', 'status');
    b.innerHTML = `<p class="vl-break-msg">${t('vl_break_80')}</p><p class="fine-print vl-disclaimer">${t('vl_disclaimer')}</p><button class="ghost-btn vl-break-close">${t('vl_break_dismiss')}</button>`;
    card.querySelector('.trial-modal-sub').after(b);
  },
};

(async () => {
  const t = tone(60), b = await launch(t.wav);
  try {
    const { page } = await openPage(b, { viewport: { width: 390, height: 844 } });
    const shoot = async (name, fn, setup, theme) => {
      await page.reload({ waitUntil: 'load' }); await sleep(2500);
      await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; });
      if (theme) await page.evaluate(th => document.documentElement.setAttribute('data-theme', th), theme);
      if (setup) await page.evaluate(setup);
      await sleep(600);
      await page.evaluate(fn); await sleep(400);
      await page.screenshot({ path: path.join(OUT, `mock-${name}.png`) });
      console.log('  ' + name);
    };
    await shoot('1-summary', MOCKS.summary, OPEN_WU);
    await shoot('2-streak-warmup', MOCKS.streak_overlay, OPEN_WU);
    await shoot('2-streak-home', MOCKS.streak_home, null, 'light');
    await page.reload({ waitUntil: 'load' }); await sleep(2500);
    await page.evaluate(() => { const o = document.getElementById('onboardingOverlay'); if (o) o.style.display = 'none'; window.__wuAllow = true; });
    await page.locator('.snb-item[data-shell="train"]').click(); await sleep(500);
    await page.locator('#panel-train-hub [data-enter-panel="warmup"]').click(); await sleep(800);
    await page.evaluate(MOCKS.one); await sleep(400);
    await page.screenshot({ path: path.join(OUT, 'mock-3-one-warmup.png') }); console.log('  3-one-warmup');
    await shoot('4-banner-fix', MOCKS.banner, OPEN_WU);
  } finally { await b.close(); await cleanup(); }
})().catch(async e => { console.error(e); try { await cleanup(); } catch {} process.exit(2); });
