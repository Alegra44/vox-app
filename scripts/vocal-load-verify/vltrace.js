// 4b.1 §3a (PHASE4B.md): a test-only trace of the vocal-load sessions, in the page, from outside the app (so master
// and the branch are traced the same way). Once the app's script has run, vlStart, vlEnd and vlWrite are wrapped (they
// are classic-script globals, so the app's own calls go through the wrappers). Every start, end and session write goes
// into an in-memory ring buffer (window.__vlTrace, the last MAX), with no console output:
//   start: the run it opened (#n), the caller (the stack under vlFeed / vlStart)
//   end:   the run it ended (#n, or none), that run's opener, the caller, and whether the caller is the function that
//          opened it (a hint only: a tool can end its own session from another of its functions; read the stacks)
//   write: the run, ended or not, then ok / the error (a failed or missing write is a session that never arrives)
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
    const start = vlStart, end = vlEnd, write = vlWrite;
    window.vlStart = function __vlStart() { start.apply(this, arguments); const r = vlRun; if (r) { r.__id = ++n; r.__by = caller(); ids[r.startedAtMs] = r.__id; } push({ op: 'start', run: r && r.__id, by: r && r.__by }); };
    window.vlEnd = function __vlEnd() {
      const r = vlRun, by = caller();
      const fn = f => (f || '').replace(/:\d+$/, ''), own = !!r && fn(r.__by.split(' < ')[1]) === fn(by.split(' < ')[0]); // opened via vlFeed from the same function that ends it
      push({ op: 'end', run: r ? r.__id : null, opener: r ? r.__by : null, by, own });
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
  : e.op === 'end' ? `      ${e.t} end   ${e.run ? '#' + e.run : '(none open)'}${e.run ? (e.own ? ' own' : ' OPENER DIFFERS') : ''} by ${e.by}${e.run ? ' (opened by ' + e.opener + ')' : ''}`
  : `      ${e.t} write ${typeof e.run === 'number' ? '#' + e.run : e.run}${e.ended ? ' ended' : ''} ${e.secs} s → ${e.res || 'pending'}`).join('\n');

// the events since the last take on this page (the buffer is emptied), as a list
const take = page => page.evaluate(() => (window.__vlTrace || []).splice(0)).catch(() => []);

module.exports = { INIT, format, take };
