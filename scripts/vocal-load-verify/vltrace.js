// 4b.1 §3a (PHASE4B.md): a test-only trace of the vocal-load sessions, in the page, from outside the app (so master
// and the branch are traced the same way). Once the app's script has run, vlStart, vlEnd and vlWrite are wrapped (they
// are classic-script globals, so the app's own calls go through the wrappers). Every start, end and session write goes
// into an in-memory ring buffer (window.__vlTrace, the last MAX), with no console output:
//   start: the run it opened (#n), the caller (the stack under vlFeed / vlStart)
//   end:   the run it ended (#n, or none), that run's opener, the caller, and whether the caller is the function that
//          opened it (a hint only: a tool can end its own session from another of its functions; read the stacks)
//   write: the run, ended or not, then ok / the error (a failed or missing write is a session that never arrives)
// 4b.3: also
//   feed:   vlFeed calls, one event per run of calls on the same panel and session (n calls, first and last time), with the
//           active panel at each call; window.__vlFeeds counts every call by panel
//   finish: a session added to today's total (vlDay.load before → after), and whether vlEnd had deferred it (the server
//           state hadn't arrived, r.ready false), with the time from that vlEnd
//   mark:   a label the script pushes (mark(page, label)), e.g. the moment it leaves a tool
// Usage: ctx.addInitScript(require('./vltrace').INIT); take(page) returns the events since the last take (and keeps them)
const MAX = 400;
const INIT = `(${(MAX) => {
  const buf = window.__vlTrace = [];
  const push = e => { e.t = Math.round(performance.now()); buf.push(e); if (buf.length > MAX) buf.shift(); };
  // the frames under the wrapper: "fn:line", without the wrappers themselves
  const caller = () => (new Error().stack || '').split('\n').slice(3, 9).map(l => {
    const m = l.match(/at (?:async )?([^ (]+)? ?\(?.*?:(\d+):\d+\)?$/); return m ? `${m[1] || '(anon)'}:${m[2]}` : l.trim();
  }).filter(s => !/^__vl/.test(s)).join(' < ');
  let n = 0; const ids = {}; // startedAtMs → run
  const wrap = () => {
    if (typeof vlStart !== 'function' || window.__vlWrapped) return; window.__vlWrapped = true;
    const start = vlStart, end = vlEnd, write = vlWrite, feed = vlFeed, finish = vlFinish;
    const panel = () => { const p = document.querySelector('section.panel.active'); return p ? p.id.replace(/^panel-/, '') : '(none)'; };
    window.__vlFeeds = {};
    window.vlFeed = function __vlFeed() {
      const p = panel(), r0 = vlRun, last = buf[buf.length - 1];
      window.__vlFeeds[p] = (window.__vlFeeds[p] || 0) + 1;
      const out = feed.apply(this, arguments), id = vlRun ? vlRun.__id : (r0 && r0.__id);
      const t = Math.round(performance.now());
      if (last && last.op === 'feed' && last.panel === p && last.run === id) { last.n++; last.t1 = t; } else push({ op: 'feed', panel: p, run: id, n: 1, t1: t });
      return out;
    };
    window.vlFinish = function __vlFinish(r) {
      const before = vlDay.load, out = finish.apply(this, arguments);
      push({ op: 'finish', run: r.__id, deferred: !!r.ending, after: r.__endT != null ? Math.round(performance.now() - r.__endT) : null,
        before: Math.round(before * 100) / 100, load: Math.round(vlDay.load * 100) / 100 });
      return out;
    };
    window.vlStart = function __vlStart() { start.apply(this, arguments); const r = vlRun; if (r) { r.__id = ++n; r.__by = caller(); ids[r.startedAtMs] = r.__id; } push({ op: 'start', run: r && r.__id, by: r && r.__by }); };
    window.vlEnd = function __vlEnd() {
      const r = vlRun, by = caller();
      const fn = f => (f || '').replace(/:\d+$/, ''), own = !!r && fn(r.__by.split(' < ')[1]) === fn(by.split(' < ')[0]); // opened via vlFeed from the same function that ends it
      if (r) r.__endT = performance.now();
      push({ op: 'end', run: r ? r.__id : null, opener: r ? r.__by : null, by, own, ready: r ? r.ready : null });
      return end.apply(this, arguments);
    };
    window.vlWrite = function __vlWrite(p) {
      const id = ids[Date.parse(p.startedAt)] || ids[p.startedAt] || ('at ' + p.startedAt);
      const e = { op: 'write', run: id, ended: !!p.ended, secs: Math.round(p.activeSeconds * 10) / 10 }; push(e);
      const w = write.apply(this, arguments);
      if (w && w.then) w.then(res => { e.res = res && res.ok === false ? 'not ok: ' + (res.reason || res.status || '') : 'ok'; }, err => { e.res = 'error: ' + String(err).slice(0, 80); });
      return w;
    };
  };
  document.addEventListener('DOMContentLoaded', wrap); window.addEventListener('load', wrap);
}})(${MAX})`;

const format = buf => (buf || []).map(e => e.op === 'start' ? `      ${e.t} start #${e.run} by ${e.by}`
  : e.op === 'end' ? `      ${e.t} end   ${e.run ? '#' + e.run : '(none open)'}${e.run ? (e.own ? ' own' : ' OPENER DIFFERS') : ''}${e.ready === false ? ' (server state not in yet: deferred)' : ''} by ${e.by}${e.run ? ' (opened by ' + e.opener + ')' : ''}`
  : e.op === 'feed' ? `      ${e.t} feed  #${e.run} on ${e.panel} × ${e.n}${e.n > 1 ? ' until ' + e.t1 : ''}`
  : e.op === 'finish' ? `      ${e.t} finish #${e.run}${e.deferred ? ' DEFERRED, ' + e.after + ' ms after its end' : ''} · vlDay ${e.before} → ${e.load}`
  : e.op === 'mark' ? `      ${e.t} ── ${e.label}`
  : `      ${e.t} write ${typeof e.run === 'number' ? '#' + e.run : e.run}${e.ended ? ' ended' : ''} ${e.secs} s → ${e.res || 'pending'}`).join('\n');

// the events since the last take on this page (the buffer is emptied), as a list
const take = page => page.evaluate(() => (window.__vlTrace || []).splice(0)).catch(() => []);

const mark = (page, label) => page.evaluate(l => { const b = window.__vlTrace; if (b) b.push({ op: 'mark', label: l, t: Math.round(performance.now()) }); }, label).catch(() => {});

module.exports = { INIT, format, take, mark };
