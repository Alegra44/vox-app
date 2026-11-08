// Sign-up timing (phase 6 deploy, 2026-11-08): three suites' sign-ups timed out on production (scores on the local
// master build, tools-shots and cv-live on the site). This times the same sign-up, alternating the previous master
// (served locally, same backend) and the site: click → profile, → progress, → modal hidden (60 s cap), with page errors
// and failed or slow (> 5 s) requests. Each account is deleted at exit (track()).
// Usage: node scripts/design-verify/signuptime.js [--base <ref>] [--site <url>] [--n 10] [--gap 15]
const fs = require('fs'), path = require('path');
const C = require('./common');
const arg = k => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const BASE = arg('--base') || 'bf9cf5d', SITE = arg('--site') || 'https://deploy-alegra1122.vercel.app/';
const N = +(arg('--n') || 10), GAP = +(arg('--gap') || 15) * 1000;
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = path.join(__dirname, 'logs', `signuptime-${stamp}.json`);

async function one(b, dir, side, i) {
  const { ctx, page, errors } = await C.openPage(b, { dir });
  const reqs = new Map(), slow = [], failed = [];
  page.on('request', r => reqs.set(r, Date.now()));
  page.on('requestfinished', r => { const ms = Date.now() - (reqs.get(r) || Date.now()); if (ms > 5000) slow.push(`${ms} ms ${r.method()} ${r.url().slice(0, 110)}`); });
  page.on('requestfailed', r => failed.push(`${r.method()} ${r.url().slice(0, 110)} ${r.failure() && r.failure().errorText}`));
  page.on('response', r => { if (r.status() >= 400) failed.push(`${r.status()} ${r.request().method()} ${r.url().slice(0, 110)}`); });
  const email = require('../choir-verify/testAccounts').track(`voxcoach-dvsut-${Date.now()}@example.com`);
  await page.evaluate(() => { openAuthModal(); setAuthMode('signup'); });
  await page.locator('#authName').fill('Signup Timing'); await page.locator('#authEmail').fill(email);
  await page.locator('#authPassword').fill('DV-' + Math.random().toString(36).slice(2) + '!x9');
  const t0 = Date.now(); await page.locator('#authCreateBtn').click();
  const at = {};
  while (Date.now() - t0 < 60000) {
    const s = await page.evaluate(() => { try { return { profile: !!profile, progress: !!progress, hidden: document.getElementById('authModalOverlay').style.display === 'none', msg: (document.getElementById('appToastWrap') || {}).textContent || '' }; } catch (e) { return { err: String(e) }; } });
    for (const k of ['profile', 'progress', 'hidden']) if (s[k] && at[k] === undefined) at[k] = Date.now() - t0;
    at.msg = s.msg || s.err || at.msg;
    if (at.profile !== undefined && at.progress !== undefined && at.hidden !== undefined) break;
    await C.sleep(100);
  }
  const done = at.profile !== undefined && at.progress !== undefined && at.hidden !== undefined;
  const r = { side, i, done, ms: at, over30: !done || Math.max(at.profile, at.progress, at.hidden) > 30000, errors: errors.slice(), slow, failed };
  console.log(`${side.padEnd(6)} #${i}  ${done ? 'done' : 'NOT DONE in 60 s'}  profile ${at.profile ?? '—'} ms · progress ${at.progress ?? '—'} ms · modal hidden ${at.hidden ?? '—'} ms${at.msg ? ` · msg "${at.msg.trim().slice(0, 80)}"` : ''}${errors.length ? ` · page errors ${errors.slice(0, 2).join(' | ')}` : ''}${slow.length ? ` · slow ${slow.join(' ; ')}` : ''}${failed.length ? ` · failed ${failed.slice(0, 3).join(' ; ')}` : ''}`);
  await ctx.close();
  return r;
}

(async () => {
  const dirs = { master: C.buildDir(BASE), site: SITE };
  console.log(`== signuptime ${stamp}: ${BASE} (local) vs ${SITE}, ${N} each, alternating, ${GAP / 1000} s apart`);
  const b = await C.chromium.launch(), rows = [];
  try {
    for (let i = 1; i <= N; i++) for (const side of (i % 2 ? ['master', 'site'] : ['site', 'master'])) {
      rows.push(await one(b, dirs[side], side, i)); await C.sleep(GAP);
    }
  } finally {
    await b.close();
    const sum = {};
    for (const side of ['master', 'site']) {
      const v = rows.filter(r => r.side === side), t = v.filter(r => r.done).map(r => Math.max(r.ms.profile, r.ms.progress, r.ms.hidden)).sort((a, b) => a - b);
      sum[side] = { n: v.length, done: t.length, over30: v.filter(r => r.over30).length, median: t.length ? t[t.length >> 1] : null, max: t.length ? t[t.length - 1] : null };
      console.log(`${side}: ${sum[side].done}/${sum[side].n} done · over 30 s ${sum[side].over30} · median ${sum[side].median} ms · max ${sum[side].max} ms`);
    }
    fs.writeFileSync(OUT, JSON.stringify({ base: BASE, site: SITE, rows, sum }, null, 1));
    console.log(`json: ${path.relative(C.ROOT, OUT)}`);
    C.cleanup();
  }
})();
