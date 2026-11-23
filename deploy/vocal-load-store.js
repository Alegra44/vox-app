// Vocal Load Dosimetry, phase 2: when and what to save of a running session (deploy/vocal-load.js), and the same
// sanity bounds the database enforces (supabase/migrations/0005_vocal_load.sql), checked before anything is sent.
// No network or DOM here: the caller passes write(payload, { keepalive }) (in the app, a PUT to
// /api/me/vocal-load/sessions/:id). Loads as a classic <script> (window.VocalLoadStore) or with require().
//
// Write cadence. The app has no in-progress saving anywhere today: a Your Choir take is saved (to this device) only when
// it finishes and a tab closed mid-take loses it, and nothing listens for pagehide. A dose total that silently drops
// the end of every session would understate the number this feature exists to show, so a running session is saved:
//   • every 60 s of active singing ("minute")        → a crash loses at most ~1 minute of singing
//   • at a natural pause: 5 s with no new singing, if anything is unsaved ("pause") → a session that stops mid-way is
//     already saved when the singer walks away
//   • when the page is hidden or closed ("hidden": pagehide / visibilitychange → hidden, sent with fetch keepalive)
//   • at the session's end ("end", marks it ended)
// At most one write per 10 s except "hidden" and "end". Each write carries the session's absolute totals so far (not
// an increment), and the server upserts that one session's row, so a retry or a repeated write never double-counts.
// In the app, write() puts the payload in the outbox below (kept on the device until the server confirms it, retried
// with back-off), so a checkpoint counts as saved once it is stored there.
(function (root) {
  'use strict';
  const B = Object.freeze({      // mirrors the CHECKs and guard trigger in 0005_vocal_load.sql
    MAX_ACTIVE_S: 28800, MAX_RATE: 37.1, RMS_MIN: 0.008, RMS_MAX: 1, MIDI_MIN: 31.3, MIDI_MAX: 90.9,
    CLOCK_ALLOWANCE_S: 600, FUTURE_START_S: 600, MAX_AGE_S: 36 * 3600,
  });
  const CADENCE = Object.freeze({ EVERY_ACTIVE_S: 60, PAUSE_MS: 5000, MIN_GAP_MS: 10000 });
  const EPS = 1e-6;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // Release C (design/day/DAY.md): the app's one day function. localDayOf(ms) is the device's local date of a time,
  // YYYY-MM-DD, in the time zone the device is in now (index.html's todayStr() and last14Days() use it; so does dayOf,
  // a session's day). tzOffsetOf(ms): minutes east of UTC at that time (what a session carries as tzOffsetMin).
  // dayAtOffset(ms, off): the date at a fixed offset, the rule the database checks a session's day by; for any time,
  // dayAtOffset(ms, tzOffsetOf(ms)) === localDayOf(ms). utcDayOf(ms): the UTC date, the rule before release C, kept for
  // the old rows and the switch day only (validateCheckpoint without an offset; the first local day's second key).
  const pad = n => String(n).padStart(2, '0');
  const ymd = (y, m, d) => `${String(y).padStart(4, '0')}-${pad(m + 1)}-${pad(d)}`;
  const localDayOf = ms => { const d = new Date(ms); return ymd(d.getFullYear(), d.getMonth(), d.getDate()); };
  const dayAtOffset = (ms, off) => { const d = new Date(ms + off * 60000); return ymd(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
  const utcDayOf = ms => dayAtOffset(ms, 0);
  const tzOffsetOf = ms => 0 - new Date(ms).getTimezoneOffset() || 0; // || 0: no -0
  const dayOf = localDayOf;
  const fin = v => typeof v === 'number' && Number.isFinite(v);

  // Reasons a checkpoint payload is impossible (empty = fine). The database is the authority; this keeps the client
  // from sending values it would reject.
  function validateCheckpoint(p, nowMs) {
    const e = [], start = Date.parse(p.startedAt);
    if (!UUID.test(p.sessionId || '')) e.push('sessionId is not a uuid');
    if (!fin(start)) e.push('startedAt is not a time');
    else {
      const off = p.tzOffsetMin;
      if (off !== undefined && off !== null) {
        if (!Number.isInteger(off) || off < -720 || off > 840) e.push('tzOffsetMin out of range');
        else if (p.day !== dayAtOffset(start, off)) e.push('day is not the date of startedAt at tzOffsetMin');
      } else if (p.day !== utcDayOf(start)) e.push('day is not the UTC date of startedAt (no tzOffsetMin)');
      if (start > nowMs + B.FUTURE_START_S * 1000) e.push('startedAt is in the future');
      if (start < nowMs - B.MAX_AGE_S * 1000) e.push('startedAt is too long ago');
    }
    if (!fin(p.activeSeconds) || p.activeSeconds < 0 || p.activeSeconds > B.MAX_ACTIVE_S) e.push('activeSeconds out of range');
    else if (fin(start) && p.activeSeconds > (nowMs - start) / 1000 + B.CLOCK_ALLOWANCE_S) e.push('more active seconds than time since the start');
    if (!fin(p.load) || p.load < p.activeSeconds - 0.001 || p.load > B.MAX_RATE * p.activeSeconds + 0.001) e.push('load out of range for the active seconds');
    const has = [p.medianRms, p.p5Midi, p.p95Midi].map(v => v !== null && v !== undefined);
    if (has.some(h => h !== (p.activeSeconds > 0))) e.push('summary must be present exactly when there was singing');
    if (has[0] && !(fin(p.medianRms) && p.medianRms >= B.RMS_MIN && p.medianRms <= B.RMS_MAX)) e.push('medianRms out of range');
    if (has[1] && has[2] && !(fin(p.p5Midi) && fin(p.p95Midi) && p.p5Midi >= B.MIDI_MIN && p.p95Midi <= B.MIDI_MAX && p.p5Midi <= p.p95Midi)) e.push('pitch percentiles out of range');
    if (typeof p.ended !== 'boolean') e.push('ended is not a boolean');
    return e;
  }

  // session: a createSession() from vocal-load.js. Call frame(pushResult, nowMs) after every push; hidden(nowMs) on
  // pagehide / visibilitychange → hidden; end(nowMs) when the session ends. Each returns null or the write's promise,
  // resolving to { ok, reason, payload | errors | error }.
  // A session keeps the offset it started with (tzOffsetMin), and its day is the local date at that offset: a time-zone
  // or clock change mid-session doesn't move it.
  function createCheckpointer({ session, sessionId, startedAtMs, write, tzOffsetMin = tzOffsetOf(startedAtMs),
                                day = dayAtOffset(startedAtMs, tzOffsetMin), cadence = CADENCE }) {
    let saved = 0, lastActive = 0, lastActiveChangeMs = startedAtMs, lastWriteMs = -Infinity, ended = false, inflight = false;
    const payload = isEnd => {
      const s = session.snapshot();
      // active seconds to the millisecond: the engine sums frame lengths, so exactly 60 s of singing can come out as
      // 59.999999999998 and miss the 60 s a session needs to count toward the baseline
      return { sessionId, day, startedAt: new Date(startedAtMs).toISOString(), tzOffsetMin, activeSeconds: Math.round(s.activeSeconds * 1000) / 1000, load: s.load,
        medianRms: s.medianRms, p5Midi: s.p5Midi, p95Midi: s.p95Midi, ended: isEnd };
    };
    async function save(nowMs, reason, isEnd, opts) {
      const p = payload(isEnd), errors = validateCheckpoint(p, nowMs);
      if (errors.length) return { ok: false, reason, errors };
      inflight = true; lastWriteMs = nowMs;
      try { await write(p, opts || {}); saved = Math.max(saved, p.activeSeconds); return { ok: true, reason, payload: p }; }
      catch (error) { return { ok: false, reason, error }; }
      finally { inflight = false; }
    }
    function frame(state, nowMs) {
      if (ended) return null;
      if (state.activeSeconds > lastActive + EPS) { lastActive = state.activeSeconds; lastActiveChangeMs = nowMs; }
      const unsaved = lastActive - saved;
      if (inflight || unsaved <= EPS || nowMs - lastWriteMs < cadence.MIN_GAP_MS) return null;
      if (unsaved >= cadence.EVERY_ACTIVE_S - EPS) return save(nowMs, 'minute', false);
      if (nowMs - lastActiveChangeMs >= cadence.PAUSE_MS) return save(nowMs, 'pause', false);
      return null;
    }
    function hidden(nowMs) {
      if (ended || lastActive - saved <= EPS) return null;
      return save(nowMs, 'hidden', false, { keepalive: true });
    }
    function end(nowMs) {
      if (ended) return null;
      ended = true;
      if (lastActive <= EPS && saved <= EPS) return null; // never sang: nothing to store
      return save(nowMs, 'end', true);
    }
    return { frame, hidden, end };
  }

  // ---- The outbox (scoring batch release A, A1: SCORING_SURVEY.md R1) -------------------------------------------------
  // Every checkpoint is kept on the device until the server confirms it, so a failed write (a 503, no network, the page
  // closing) no longer loses the session. One outbox per signed-in user (its storage key), holding per session the
  // latest payload not yet confirmed. put() stores the payload first, then sends it. A 2xx removes the entry, but only if
  // the payload sent is still the session's latest (a newer one stays and goes next). A network error, a 5xx or a 429
  // is retried at 2 s, 5 s, 15 s and 60 s, then every 5 min while the page is open, each ±20 % jitter; so is a 401 (not
  // signed in: a token revoked mid-send, as at sign-out), since the payload is fine; any other 4xx is a payload the
  // database rejects: logged and dropped, since sending it again can't help. One send in flight per session:
  // in this page (a promise per session) and across tabs (a lease on the entry, LEASE_MS, re-read after taking it).
  // drain() sends everything now (on sign-in, on `online`, before a new session); entries whose session started more
  // than 35 h ago are dropped, logged (the database refuses a start over 36 h old). The server's upsert takes absolute
  // totals per session, so a payload sent twice (a retry after a lost reply, two tabs) changes nothing.
  // confirmedCount() and sending() (release H): how many checkpoints this page has had confirmed, and the sends now out,
  // so a read of the day's total can tell a checkpoint landed (or may have landed) while it was out.
  // pendingLoad(day): the load still waiting for that day, net of what the server already has for each session (its last
  // confirmed load), so the gauge can add it to the server's dayLoad without counting anything twice.
  // storage: { getItem, setItem, removeItem } (localStorage in the app); any of them may throw (private mode, full), and
  // the outbox then keeps working in memory for this page. send(payload, opts) resolves on a 2xx and rejects otherwise,
  // with error.status set when there was a response.
  const OUTBOX = Object.freeze({ BACKOFF_MS: [2000, 5000, 15000, 60000], EVERY_MS: 300000, JITTER: 0.2, MAX_AGE_MS: 35 * 3600 * 1000, LEASE_MS: 20000 });
  const retriable = e => !e || e.status === undefined || e.status === null || e.status >= 500 || e.status === 429 || e.status === 401; // 401: not signed in (a token revoked mid-send), not a refused payload
  function createOutbox({ storage, key, send, nowMs = () => Date.now(), random = Math.random, setTimer = setTimeout, clearTimer = clearTimeout,
                          log = () => {}, tabId = Math.random().toString(36).slice(2), config = OUTBOX }) {
    let mem = { entries: {}, confirmed: {} };
    const inflight = {}, timers = {}, tries = {};
    let confirms = 0; // release H: checkpoints this page has had confirmed (confirmedCount), so a read can tell one landed while it was out
    const read = () => {
      try { const s = storage && storage.getItem(key); if (s) { const j = JSON.parse(s); mem = { entries: j.entries || {}, confirmed: j.confirmed || {} }; } else mem = { entries: {}, confirmed: {} }; }
      catch (e) { /* storage unreadable: the page's own copy stands */ }
      return mem;
    };
    const write = () => { try { if (storage) storage.setItem(key, JSON.stringify(mem)); } catch (e) { log('outbox not stored on the device', e); } };
    const startMs = p => Date.parse(p.startedAt);
    const tooOld = p => !(startMs(p) > nowMs() - config.MAX_AGE_MS);
    function prune() { // confirmed loads only matter while a session can still write
      for (const [id, c] of Object.entries(mem.confirmed)) if (!(c.startMs > nowMs() - config.MAX_AGE_MS - 3600000)) delete mem.confirmed[id];
    }
    function delay(n) {
      const base = n < config.BACKOFF_MS.length ? config.BACKOFF_MS[n] : config.EVERY_MS;
      return Math.round(base * (1 + (random() * 2 - 1) * config.JITTER));
    }
    function schedule(id) {
      if (timers[id]) clearTimer(timers[id]);
      const n = tries[id] || 0; tries[id] = n + 1;
      const ms = delay(n);
      timers[id] = setTimer(() => { delete timers[id]; trySend(id); }, ms);
      return ms;
    }
    function trySend(id, opts) {
      if (inflight[id]) return inflight[id];
      read();
      const e = mem.entries[id];
      if (!e) return Promise.resolve({ ok: true, reason: 'nothing to send' });
      if (tooOld(e.payload)) { delete mem.entries[id]; write(); log('outbox: dropped a session older than 35 h', id); return Promise.resolve({ ok: false, reason: 'too old' }); }
      if (e.lease && e.lease.tab !== tabId && e.lease.until > nowMs()) { // another tab is sending it: look again when its lease ends
        if (!timers[id]) timers[id] = setTimer(() => { delete timers[id]; trySend(id); }, e.lease.until - nowMs() + 50);
        return Promise.resolve({ ok: false, reason: 'another tab is sending' });
      }
      e.lease = { tab: tabId, until: nowMs() + config.LEASE_MS }; write();
      read(); if (!mem.entries[id] || !mem.entries[id].lease || mem.entries[id].lease.tab !== tabId) return Promise.resolve({ ok: false, reason: 'another tab took it' });
      const sent = mem.entries[id].payload, seq = mem.entries[id].seq;
      const p = Promise.resolve().then(() => send(sent, opts || {})).then(() => {
        delete inflight[id]; tries[id] = 0; if (timers[id]) { clearTimer(timers[id]); delete timers[id]; }
        confirms++;
        read();
        mem.confirmed[id] = { load: sent.load, day: sent.day, startMs: startMs(sent) };
        const now = mem.entries[id];
        if (now && now.seq === seq) delete mem.entries[id];
        else if (now) now.lease = null;
        prune(); write();
        if (now && now.seq !== seq) return trySend(id); // a newer checkpoint came while this one was out
        return { ok: true, reason: 'sent', payload: sent };
      }, err => {
        delete inflight[id];
        read(); const now = mem.entries[id]; if (now) now.lease = null;
        if (!retriable(err)) { if (now && now.seq === seq) delete mem.entries[id]; write(); log('outbox: the server refused a checkpoint, dropped', id, err); return { ok: false, reason: 'refused', error: err }; }
        write();
        const ms = schedule(id);
        return { ok: false, reason: 'retry', retryInMs: ms, error: err };
      });
      inflight[id] = p;
      return p;
    }
    // Stores the payload (this session's latest) and sends it; resolves once it is stored, with the send's promise.
    function put(payload, opts) {
      read();
      const prev = mem.entries[payload.sessionId];
      mem.entries[payload.sessionId] = { payload, seq: (prev ? prev.seq : 0) + 1, lease: prev ? prev.lease : null };
      write();
      const sending = inflight[payload.sessionId] ? inflight[payload.sessionId] : trySend(payload.sessionId, opts);
      return { stored: true, sending };
    }
    function drain() {
      read();
      return Promise.all(Object.keys(mem.entries).map(id => { tries[id] = 0; if (timers[id]) { clearTimer(timers[id]); delete timers[id]; } return trySend(id); }));
    }
    // sinceMs (optional): only sessions started from then on (the first local day's read of the UTC-dated key)
    function pendingLoad(day, sinceMs) {
      read(); let sum = 0;
      for (const [id, e] of Object.entries(mem.entries)) {
        if (e.payload.day !== day || tooOld(e.payload)) continue;
        if (sinceMs !== undefined && !(Date.parse(e.payload.startedAt) >= sinceMs)) continue;
        const c = mem.confirmed[id]; sum += Math.max(0, e.payload.load - (c ? c.load : 0));
      }
      return sum;
    }
    const size = () => Object.keys(read().entries).length;
    function stop() { for (const id of Object.keys(timers)) { clearTimer(timers[id]); delete timers[id]; } }
    return { put, drain, pendingLoad, size, stop, confirmedCount: () => confirms, sending: () => Object.values(inflight), _state: () => read() };
  }

  const api = { BOUNDS: B, CADENCE, OUTBOX, dayOf, localDayOf, dayAtOffset, utcDayOf, tzOffsetOf, validateCheckpoint, createCheckpointer, createOutbox };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.VocalLoadStore = api;
})(typeof window !== 'undefined' ? window : this);
