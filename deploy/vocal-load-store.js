// Vocal Load Dosimetry, phase 2: when and what to save of a running session (deploy/vocal-load.js), and the same
// sanity bounds the database enforces (supabase/migrations/0005_vocal_load.sql), checked before anything is sent.
// No network or DOM here: the caller passes write(payload, { keepalive }) (in the app, a PUT to
// /api/me/vocal-load/sessions/:id). Loads as a classic <script> (window.VocalLoadStore) or with require().
// Not referenced by index.html yet (phase 3 wires it).
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
// A failed write stays unsaved and goes again at the next checkpoint.
(function (root) {
  'use strict';
  const B = Object.freeze({      // mirrors the CHECKs and guard trigger in 0005_vocal_load.sql
    MAX_ACTIVE_S: 28800, MAX_RATE: 37.1, RMS_MIN: 0.008, RMS_MAX: 1, MIDI_MIN: 31.3, MIDI_MAX: 90.9,
    CLOCK_ALLOWANCE_S: 600, FUTURE_START_S: 600, MAX_AGE_S: 36 * 3600,
  });
  const CADENCE = Object.freeze({ EVERY_ACTIVE_S: 60, PAUSE_MS: 5000, MIN_GAP_MS: 10000 });
  const EPS = 1e-6;
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  // The app's todayStr() (index.html): the UTC date. Same expression, so "today" has one meaning.
  const dayOf = ms => new Date(ms).toISOString().slice(0, 10);
  const fin = v => typeof v === 'number' && Number.isFinite(v);

  // Reasons a checkpoint payload is impossible (empty = fine). The database is the authority; this keeps the client
  // from sending values it would reject.
  function validateCheckpoint(p, nowMs) {
    const e = [], start = Date.parse(p.startedAt);
    if (!UUID.test(p.sessionId || '')) e.push('sessionId is not a uuid');
    if (!fin(start)) e.push('startedAt is not a time');
    else {
      if (p.day !== dayOf(start)) e.push('day is not the UTC date of startedAt');
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
  function createCheckpointer({ session, sessionId, startedAtMs, write, day = dayOf(startedAtMs), cadence = CADENCE }) {
    let saved = 0, lastActive = 0, lastActiveChangeMs = startedAtMs, lastWriteMs = -Infinity, ended = false, inflight = false;
    const payload = isEnd => {
      const s = session.snapshot();
      // active seconds to the millisecond: the engine sums frame lengths, so exactly 60 s of singing can come out as
      // 59.999999999998 and miss the 60 s a session needs to count toward the baseline
      return { sessionId, day, startedAt: new Date(startedAtMs).toISOString(), activeSeconds: Math.round(s.activeSeconds * 1000) / 1000, load: s.load,
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

  const api = { BOUNDS: B, CADENCE, dayOf, validateCheckpoint, createCheckpointer };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.VocalLoadStore = api;
})(typeof window !== 'undefined' ? window : this);
