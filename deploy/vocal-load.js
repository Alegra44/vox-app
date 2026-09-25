// Vocal Load Dosimetry, phase 1: the calculation engine. Pure (no DOM, audio, storage or network), so it can be verified
// in isolation (scripts/vocal-load-verify/verify.js) before it is wired into the app. Loads as a classic <script>
// (window.VocalLoad) or with require(). Not referenced by index.html yet.
//
// Input: one frame per analysis tick, { dt (s since the previous frame), rms (computeRMS of the mic buffer), f0 (Hz from
// autoCorrelate; ≤ 0 = no pitch) }.
//
// Per active-singing second (a block of 1 s of active time):
//   loudness_ratio = block RMS ÷ baseline RMS, floored at 1, capped at 4 (+12 dB)   (block RMS = √(time-weighted mean of rms²))
//   pitch_ratio    = (block pitch − range low) ÷ (passaggio − range low), floored at 0
//                    → 0 at the bottom of the range, 1 at the passaggio, 1.67 at the top (the passaggio sits at 60% of
//                      the range, as in Register Coach's drawBridgeZones)
//   load_rate      = loudness_ratio × (1 + pitch_ratio)
// Session load = Σ load_rate × block length (1 s; the session's last block may be shorter).
// % of the day = (load of today's earlier sessions + this session's) ÷ DAILY_BUDGET.
//
// A frame is active singing when it has a pitch (or is within HOLD_S of the last active pitched frame, so a brief
// detector dropout mid-note doesn't count as a pause) AND its rms ≥ max(ABS_FLOOR_RMS, REL_FLOOR × baseline RMS).
// Everything else (silence, breaths, pauses, unpitched noise) adds nothing, neither load nor time. Pitch-detector slips
// (octave/fifth errors) are rejected first, by the Vibrato Analyzer's rule over a short centred window (pitchOf).
(function (root) {
  'use strict';
  const C = Object.freeze({
    ABS_FLOOR_RMS: 0.008,   // autoCorrelate's own gate: below it the app reports no pitch anyway
    REL_FLOOR: 0.1,         // −20 dB under the singer's baseline: much quieter than their usual singing is not singing
    HOLD_S: 0.25,           // a pitch dropout shorter than this, at singing level, stays active on the last pitch
    MAX_FRAME_S: 0.1,       // a longer gap between frames (tab in the background, a stall) counts as 0.1 s at most
    MIN_F0: 50, MAX_F0: 1500,
    PASSAGGIO_AT: 0.6,      // Register Coach: passaggio = low + 0.6 × (high − low)
    DEFAULT_LOW_MIDI: 45, DEFAULT_HIGH_MIDI: 72, // A2–C5, Register Coach's default range
    MIN_RANGE_ST: 12,       // a range narrower than an octave (a one-note session, a sloppy capture) isn't trusted
    BASELINE_SESSIONS: 5,   // rolling baseline: the last 5 sessions with at least…
    MIN_SESSION_ACTIVE_S: 60, // …a minute of active singing
    MIN_SESSIONS_FOR_RANGE: 3,
    CALIBRATION_S: 30,      // no RMS baseline yet: the first 30 active seconds count at loudness_ratio 1, and their
                            // median block RMS becomes this session's baseline
    LOUDNESS_CAP: 4,        // loudness_ratio ≤ 4, i.e. +12.0 dB (20·log10 4) over the singer's median. That keeps forte to
                            // fortissimo (roughly +6 to +12 dB over a mezzo-forte median) proportional, where 3× (+9.5 dB)
                            // would already flatten ordinary forte for a singer whose median is mezzo-piano. Above it are
                            // the levels a clipped buffer (RMS up to ~0.7–1.0, +23–26 dB over a 0.05 median), a cough into
                            // the mic or a bump reach. One capped second is at most 4 × 2.67 = 10.7 load-seconds, 0.16% of
                            // the daily budget, so a stray artifact can't matter.
    SLIP_ST: 3, SLIP_HALF_WINDOW: 9, SLIP_MIN_PITCHED: 3, // pitch-slip rejection, see pitchOf
  });
  // The daily budget, in load-seconds. Reference "typical" singing: comfortable loudness, i.e. block levels spread
  // around the singer's median with a 3 dB standard deviation (phrase-to-phrase dynamics), which gives
  // E[loudness_ratio] = E[max(1, 10^(X/20))], X ~ N(0, 3 dB) = 0.5 + e^(σ²/2)·Φ(σ) with σ = 3·ln10/20 = 0.3454, = 1.1741;
  // and mixed voice at mid-range (pitch_ratio 0.5/0.6, so 1 + pitch_ratio = 11/6). E[load_rate] = 1.1741 × 11/6 = 2.1526.
  // 52.5 min (the middle of 45–60) of active singing like that = 2.1526 × 3150 s = 6781 → rounded to 6800:
  // 100% after 52.7 min of it, 45 min ≈ 85%, 60 min ≈ 114%. Steady singing exactly at the median (ratio 1) at mid-range
  // reaches 100% after 61.8 min. This is a starting constant, not a clinical limit.
  const DAILY_BUDGET = 6800;
  const EPS = 1e-9;

  const freqToMidi = f => 69 + 12 * Math.log2(f / 440);
  function median(xs) {
    const s = [...xs].sort((a, b) => a - b), n = s.length;
    return n ? (n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2) : null;
  }
  // The smallest value whose cumulative weight reaches q of the total (the lower weighted quantile).
  function weightedQuantile(vals, ws, q) {
    if (!vals.length) return null;
    const idx = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
    const total = ws.reduce((a, b) => a + b, 0), target = q * total;
    let c = 0;
    for (const i of idx) { c += ws[i]; if (c >= target - EPS * total) return vals[i]; }
    return vals[idx[idx.length - 1]];
  }

  const withPassaggio = (low, high, rangeSource) => ({ low, high, passaggio: low + C.PASSAGGIO_AT * (high - low), rangeSource });

  // sessions: summaries from finish(), oldest first ({ activeSeconds, medianRms, p5Midi, p95Midi }).
  // rangeFinder: the saved Range Finder range, { lowMidi, highMidi } (progress.lowestMidi / highestMidi), or null.
  // RMS baseline: the median of the last 5 qualifying sessions' median block RMS; null with no qualifying session
  // (then the session calibrates itself). Range, first that applies: the widest range used across those sessions
  // (lowest 5th and highest 95th percentile of pitch) when there are ≥ 3 of them; else the Range Finder range; else A2–C5.
  function computeBaseline(sessions, rangeFinder) {
    const used = (sessions || []).filter(s => s && s.activeSeconds >= C.MIN_SESSION_ACTIVE_S && s.medianRms > 0).slice(-C.BASELINE_SESSIONS);
    let range = null;
    if (used.length >= C.MIN_SESSIONS_FOR_RANGE) {
      const lo = Math.min(...used.map(s => s.p5Midi)), hi = Math.max(...used.map(s => s.p95Midi));
      if (hi - lo >= C.MIN_RANGE_ST) range = withPassaggio(lo, hi, 'sessions');
    }
    const rf = rangeFinder;
    if (!range && rf && Number.isFinite(rf.lowMidi) && Number.isFinite(rf.highMidi) && rf.highMidi - rf.lowMidi >= C.MIN_RANGE_ST) range = withPassaggio(rf.lowMidi, rf.highMidi, 'rangeFinder');
    if (!range) range = withPassaggio(C.DEFAULT_LOW_MIDI, C.DEFAULT_HIGH_MIDI, 'default');
    return { rms: used.length ? median(used.map(s => s.medianRms)) : null, sessionsUsed: used.length, ...range };
  }

  const loudnessRatio = (rms, baseRms) => baseRms > 0 ? Math.min(C.LOUDNESS_CAP, Math.max(1, rms / baseRms)) : 1;
  const pitchRatio = (midi, b) => Math.max(0, (midi - b.low) / (b.passaggio - b.low));
  const loadRate = (rms, midi, b, baseRms = b.rms) => loudnessRatio(rms, baseRms) * (1 + pitchRatio(midi, b));

  // A frame's pitch, or null when it is a detector slip: more than SLIP_ST semitones from the median raw pitch of the
  // pitched frames within SLIP_HALF_WINDOW frames either side. The Vibrato Analyzer's rule (analyzeVibrato: frames more
  // than 3 semitones from the median are octave or fifth errors), with the median taken over a centred window instead
  // of the whole capture, since a song moves where a vibrato hold doesn't. A centred median follows a real note change
  // at once (the new note is the majority from its first frame) and removes a slip of up to 9 frames (0.15 s at
  // 60 frames/s); a longer misreading looks like a real note to it. A rejected frame is treated as unpitched, so at
  // singing level it is held on the last good pitch (HOLD_S) rather than dropped.
  function pitchOf(seq, j) {
    const raw = seq[j].raw;
    if (raw === null) return null;
    const w = seq.slice(Math.max(0, j - C.SLIP_HALF_WINDOW), j + C.SLIP_HALF_WINDOW + 1).map(x => x.raw).filter(x => x !== null);
    if (w.length < C.SLIP_MIN_PITCHED) return raw;
    return Math.abs(raw - median(w)) > C.SLIP_ST ? null : raw;
  }

  // One singing session. push(frame) after every analysis frame; finish() at the end gives the summary to store (and to
  // pass back to computeBaseline later). A frame's pitch is decided once the 9 frames after it have arrived (the slip
  // check looks both ways), so push() returns what the session would total if it ended now: the decided frames plus
  // the waiting ones judged with the look-ahead there is. onBlock({ rate, rms, midi, seconds, load }) is called as each
  // 1 s block is final.
  function createSession(baseline, { priorLoadToday = 0, onBlock = null } = {}) {
    const blocks = { rms: [], midi: [], t: [] };
    const S = { done: 0, blk: { e2: 0, m: 0, t: 0 }, baseRms: baseline.rms > 0 ? baseline.rms : null, cal: { rms: [], t: [], total: 0 }, activeS: 0, lastMidi: null, sinceVoiced: Infinity };
    const Q = [], prev = []; // Q: frames waiting for their look-ahead; prev: the last 9 decided frames (raw pitch)
    let finished = false;
    const clone = s => ({ ...s, blk: { ...s.blk }, cal: { rms: [...s.cal.rms], t: [...s.cal.t], total: s.cal.total } });
    const blockRms = b => Math.sqrt(b.e2 / b.t), blockMidi = b => b.m / b.t;
    function close(s, real) {
      if (!(s.blk.t > 0)) return;
      const b = s.blk, rms = blockRms(b), midi = blockMidi(b), r = loadRate(rms, midi, baseline, s.baseRms);
      s.done += r * b.t;
      if (s.baseRms === null) {
        s.cal.rms.push(rms); s.cal.t.push(b.t); s.cal.total += b.t;
        if (s.cal.total >= C.CALIBRATION_S - EPS) s.baseRms = weightedQuantile(s.cal.rms, s.cal.t, 0.5);
      }
      if (real) { blocks.rms.push(rms); blocks.midi.push(midi); blocks.t.push(b.t); if (onBlock) onBlock({ rate: r, rms, midi, seconds: b.t, load: s.done }); }
      s.blk = { e2: 0, m: 0, t: 0 };
    }
    // One decided frame { d, rms, midi (null: unpitched or a slip) } into state s.
    function accept(s, f, real) {
      const floor = s.baseRms === null ? C.ABS_FLOOR_RMS : Math.max(C.ABS_FLOOR_RMS, C.REL_FLOOR * s.baseRms);
      let midi = f.midi;
      if (midi === null && s.lastMidi !== null && s.sinceVoiced < C.HOLD_S - EPS) midi = s.lastMidi;
      const active = midi !== null && f.rms >= floor && f.d > 0;
      if (f.midi !== null && active) { s.lastMidi = midi; s.sinceVoiced = 0; } else s.sinceVoiced += f.d;
      if (active) {
        s.blk.e2 += f.rms * f.rms * f.d; s.blk.m += midi * f.d; s.blk.t += f.d; s.activeS += f.d;
        if (s.blk.t >= 1 - EPS) close(s, real);
      }
    }
    const decide = (s, seq, j, real) => accept(s, { d: seq[j].d, rms: seq[j].rms, midi: pitchOf(seq, j) }, real);
    // The waiting frames, with the look-ahead there is, then the last partial block.
    function drain(s, real) { const seq = prev.concat(Q); for (let j = prev.length; j < seq.length; j++) decide(s, seq, j, real); close(s, real); }
    function push({ dt, rms, f0 }) {
      if (finished) throw new Error('session already finished');
      const d = Math.min(Math.max(0, dt || 0), C.MAX_FRAME_S);
      Q.push({ d, rms, raw: f0 >= C.MIN_F0 && f0 <= C.MAX_F0 ? freqToMidi(f0) : null });
      if (Q.length > C.SLIP_HALF_WINDOW) {
        decide(S, prev.concat(Q), prev.length, true);
        prev.push(Q.shift()); if (prev.length > C.SLIP_HALF_WINDOW) prev.shift();
      }
      const p = clone(S); drain(p, false);
      return { load: p.done, activeSeconds: p.activeS, percentOfDay: (priorLoadToday + p.done) / DAILY_BUDGET * 100, baselineRms: S.baseRms, calibrating: S.baseRms === null };
    }
    function finish() {
      if (!finished) { drain(S, true); Q.length = 0; finished = true; }
      return {
        activeSeconds: S.activeS, load: S.done, sessionPercent: S.done / DAILY_BUDGET * 100, percentOfDay: (priorLoadToday + S.done) / DAILY_BUDGET * 100,
        medianRms: weightedQuantile(blocks.rms, blocks.t, 0.5), p5Midi: weightedQuantile(blocks.midi, blocks.t, 0.05),
        p95Midi: weightedQuantile(blocks.midi, blocks.t, 0.95), baselineRms: S.baseRms,
      };
    }
    return { push, finish };
  }

  const api = { CONSTANTS: C, DAILY_BUDGET, computeBaseline, createSession, loudnessRatio, pitchRatio, loadRate, freqToMidi, weightedQuantile };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.VocalLoad = api;
})(typeof window !== 'undefined' ? window : this);
