#!/bin/bash
# Release E: the VocalSet vibrato and straight takes, on pitch, as the voice of Performance Director, Karaoke Coach and
# Emotional Singing (survey.js --voice … --voice-midi: each take's steadiest stretch, vocalset.sh's table, shifted from its
# own measured pitch onto each Lead note), master and the branch, 2 runs each, then compare.js per take.
# Usage: bash scripts/accuracy-e/vocalsetE.sh <out dir>   (inside a run that holds the lock: checksE.sh)
cd "$(dirname "$0")/../.."
OUT=${1:?out dir}; mkdir -p "$OUT"
VS=${VOXCOACH_TESTDATA:-$HOME/VoxCoachTestData}/vocalset
# take, stretch from / to (s), gain to −20 dBFS (dB), its pitch (MIDI, median of the stretch, measured 2026-11-22)
while read -r n from to gain midi; do
  [ -z "$n" ] && continue
  for side in master branch; do
    ref=""; [ $side = master ] && ref="--ref master"
    node scripts/scoring-verify/survey.js $ref --tools pd,karaoke,emotion --stims ontime --runs 2 --voice "$VS/$n.wav" --voice-from $from --voice-to $to --voice-gain-db $gain --voice-midi $midi --out "$OUT/vsp-$side-$n.json" > "$OUT/vsp-$side-$n.log" 2>&1 || echo "$side $n: exit $?"
  done
  echo "=== $n"; node scripts/scoring-verify/compare.js "$OUT/vsp-master-$n.json" "$OUT/vsp-branch-$n.json"
done <<'TABLE'
vibrato-1154 14.4 15.7 4.2 71.45
vibrato-2417 16.1 17.7 0.9 51.34
vibrato-2961 11.7 13.5 17.2 48.96
vibrato-3131 6.6 9.2 14.9 51.49
vibrato-628 23.6 25.5 5.9 70.02
vibrato-772 1.6 3.7 6.1 65.88
straight-286 3.6 5.9 6.3 72.47
straight-625 8.1 9.9 15.0 65.88
TABLE
