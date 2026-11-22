// candidate 1: strength = depth ramp 8→14 ct × periodicity ramp 0.3→0.5 × rate ramps (3.6→4.4, 7.6→8.4 Hz) × held ramp (1.5→2.5 periods) × width ramp (170→150 ct)
const lin = (x, a, b) => Math.max(0, Math.min(1, (x - a) / (b - a)));
const g = vibratoGate(pts);
if (!g.x || !g.periodMs) return { cents: pts.map(p => p.c), s: 0 };
const kept = g.kept || pts, held = (kept[kept.length - 1].t - kept[0].t) / g.periodMs;
const s = lin(g.depth, 8, 14) * lin(g.depth, 170, 150) * lin(g.periodicity, 0.3, 0.5) * lin(g.rateHz, 3.6, 4.4) * lin(g.rateHz, 8.4, 7.6) * lin(held, 1.5, 2.5);
if (s <= 0) return { cents: pts.map(p => p.c), s };
const x = g.x, P = g.periodMs / VIB_TOL.dtMs, t0 = kept[0].t, centre = new Float64Array(x.length);
for (let k = 0; k < x.length; k++) centre[k] = vibratoBoxMean(x, Math.max(0, Math.min(x.length - P, k - P / 2)), P);
return { s, cents: pts.map(p => { const u = Math.max(0, (p.t - t0) / VIB_TOL.dtMs), k = Math.floor(u), f = u - k, cc = k + 1 < centre.length ? centre[k] * (1 - f) + centre[k + 1] * f : centre[centre.length - 1]; return (1 - s) * p.c + s * cc; }) };
