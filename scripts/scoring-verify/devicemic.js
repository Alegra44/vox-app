// Release B, B7: a real device modelled inside the app's own AudioContext (see device.js): output delay Do, a room at
// roomDb (default −30 dB) with a −60 dBFS noise floor and a singer (__dev.sing), input delay Di; the device reports outputLatency Do,
// baseLatency 0 and the mic track's latency Di. Usage: openPage(b, { prepare: c => c.addInitScript(DEVICE, [Do, Di]) })
const DEVICE = ([Do, Di, roomDb = -30]) => {
  const AC = window.AudioContext, conn = AudioNode.prototype.connect;
  let app = null; const dev = window.__dev = { Do, Di, roomDb };
  const build = ctx => {
    const tap = ctx.createGain(), dOut = ctx.createDelay(2), room = ctx.createGain(), air = ctx.createGain(), dIn = ctx.createDelay(2), mic = ctx.createGain();
    dOut.delayTime.value = Do / 1000; dIn.delayTime.value = Di / 1000; room.gain.value = Math.pow(10, roomDb / 20);
    conn.call(tap, dOut); conn.call(dOut, room); conn.call(room, air); conn.call(air, dIn); conn.call(dIn, mic);
    const n = ctx.sampleRate * 2, nb = ctx.createBuffer(1, n, ctx.sampleRate), d = nb.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * 0.001 * Math.sqrt(3); // −60 dBFS rms
    const ns = ctx.createBufferSource(); ns.buffer = nb; ns.loop = true; conn.call(ns, air); ns.start();
    // the singer: a voice-like tone (harmonics 1 : 0.5 : 0.3 : 0.2), its level and pitch scheduled on the audio clock
    const osc = ctx.createOscillator(), env = ctx.createGain();
    osc.setPeriodicWave(ctx.createPeriodicWave(new Float32Array([0, 0, 0, 0, 0]), new Float32Array([0, 1, 0.5, 0.3, 0.2])));
    env.gain.value = 0; conn.call(osc, env); conn.call(env, air); osc.start();
    Object.defineProperty(ctx, 'outputLatency', { get: () => Do / 1000 });
    Object.defineProperty(ctx, 'baseLatency', { get: () => 0 });
    ctx.createMediaStreamSource = () => { const g = ctx.createGain(); conn.call(mic, g); return g; };
    Object.assign(dev, { ctx, tap });
    // notes [{midi, on, off}] in audio-clock seconds; returns each note's actual start (a time already past starts now)
    // legato: one sound from the first note's start to the last's end, the pitch changing at each note's start
    dev.sing = (notes, legato) => {
      const now = ctx.currentTime + 0.003, A = 0.3;
      env.gain.cancelScheduledValues(0); env.gain.setValueAtTime(0, now); osc.frequency.cancelScheduledValues(0);
      if (legato && notes.length) {
        const on0 = Math.max(now, notes[0].on), end = notes[notes.length - 1].off;
        env.gain.setValueAtTime(0, on0); env.gain.linearRampToValueAtTime(A, on0 + 0.04); env.gain.setValueAtTime(A, end); env.gain.linearRampToValueAtTime(0, end + 0.06);
        return notes.map(nt => { const on = Math.max(now, nt.on); osc.frequency.setValueAtTime(440 * Math.pow(2, (nt.midi - 69) / 12), on); return on; });
      }
      return notes.map(nt => {
        const on = Math.max(now, nt.on), off = Math.max(on + 0.1, nt.off);
        osc.frequency.setValueAtTime(440 * Math.pow(2, (nt.midi - 69) / 12), Math.max(now, on - 0.004));
        env.gain.setValueAtTime(0, on); env.gain.linearRampToValueAtTime(A, on + 0.04);
        env.gain.setValueAtTime(A, off); env.gain.linearRampToValueAtTime(0, off + 0.06);
        return on;
      });
    };
  };
  window.AudioContext = function (...a) { const ctx = new AC(...a); if (!app) { app = ctx; build(ctx); } return ctx; };
  window.AudioContext.prototype = AC.prototype; window.webkitAudioContext = window.AudioContext;
  AudioNode.prototype.connect = function (dst, ...r) {
    const out = conn.call(this, dst, ...r);
    // a silent sink (a gain of 0: the ticker's, the recorder's) isn't output
    if (app && dev.tap && this.context === app && dst === app.destination && !(this instanceof GainNode && this.gain.value === 0)) conn.call(this, dev.tap);
    return out;
  };
  // the mic: a real track (silent; the app's audio comes from the room), reporting the input latency
  let silent = null;
  navigator.mediaDevices.getUserMedia = async () => {
    if (!silent) { const c = new AC(); silent = c.createMediaStreamDestination(); if (c.state !== 'running') await c.resume(); }
    return new MediaStream(silent.stream.getAudioTracks().map(t => t.clone()));
  };
  const gs = MediaStreamTrack.prototype.getSettings;
  MediaStreamTrack.prototype.getSettings = function () { return { ...gs.call(this), latency: Di / 1000 }; };
};
module.exports = { DEVICE };
