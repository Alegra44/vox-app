// The speaker-delay stub of noWarmup.js (3), alone and without side effects: noWarmup.js adds it to every context, and
// warmup-verify/common.js adds it to the pages that see the warm-up on purpose (entries.js, tracking.js).
// Without it, those two saw release B's speaker-delay sheet open over their first timing take (Rhythm), as a new device
// would, and stay open over every later one (production checks 2026-11-16: warmup-entries 7 of 43).
// gain: null (release D3): no bleed gain measured, so the speaker guard stays off and the sheet does not ask again.
const SD_RIG = () => {
  const tick = () => {
    try {
      if (!window.__sdWrapped && typeof sdGate === 'function' && typeof sdSave === 'function' && typeof sdOutputKey === 'function') {
        window.__sdWrapped = true; const orig = sdGate;
        sdGate = async function () {
          if (!window.__sdAllow) { const k = await sdOutputKey(); if (!sdAll()[k]) sdSave(k, { ms: 0, how: 'measured', heard: 10, gain: null, rig: true, at: Date.now() }); }
          return orig.apply(this, arguments);
        };
      }
    } catch (e) {}
    if (!window.__sdWrapped) setTimeout(tick, 25);
  };
  tick(); document.addEventListener('DOMContentLoaded', tick);
};

module.exports = { SD_RIG };
