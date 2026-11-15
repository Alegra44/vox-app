// Release B (B2): a microphone that hears the app's own output, D ms late, for the speaker-delay measurement on a rig
// (latency.js --rig, shotsB.js). Every node the app connects to its AudioContext's destination is also sent through a
// MediaStream to a second AudioContext, delayed there by exactly D ms (a DelayNode) over a faint noise floor
// (−60 dBFS), and that is what getUserMedia answers with. D = null: no loop (the mic hears only the noise floor).
// Usage: openPage(b, { prepare: c => c.addInitScript(LOOP, D) })
const LOOP = D => {
  const AC = window.AudioContext, conn = AudioNode.prototype.connect;
  let synth = null, dest = null, app = null;
  const ensure = () => {
    if (synth) return;
    synth = new AC(); dest = synth.createMediaStreamDestination();
    const n = synth.sampleRate * 2, nb = synth.createBuffer(1, n, synth.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.001 * Math.sqrt(3); // −60 dBFS rms
    const ns = synth.createBufferSource(); ns.buffer = nb; ns.loop = true; conn.call(ns, dest); ns.start();
  };
  const link = () => {
    if (!app || !synth || app.__linked || D === null) return;
    app.__linked = true;
    const src = synth.createMediaStreamSource(app.__tap.stream), dl = synth.createDelay(2); dl.delayTime.value = D / 1000; window.__loopDelay = dl;
    conn.call(src, dl); conn.call(dl, dest);
  };
  window.AudioContext = function (...a) {
    const ctx = new AC(...a);
    if (!app) { app = ctx; ctx.__tap = ctx.createMediaStreamDestination(); window.__appCtx = ctx; ensure(); link(); }
    return ctx;
  };
  window.AudioContext.prototype = AC.prototype; window.webkitAudioContext = window.AudioContext;
  AudioNode.prototype.connect = function (dst, ...r) {
    const out = conn.call(this, dst, ...r);
    if (D !== null && app && this.context === app && dst === app.destination) conn.call(this, app.__tap);
    return out;
  };
  const md = navigator.mediaDevices;
  md.getUserMedia = async () => { ensure(); if (synth.state !== 'running') await synth.resume(); link(); return new MediaStream(dest.stream.getAudioTracks().map(t => t.clone())); };
};
module.exports = { LOOP };
