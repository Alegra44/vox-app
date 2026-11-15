#!/bin/bash
# Release B, B5: the level shape on real voices held at one level, for LS_FLAT_SD and LS_FULL_SD (SCORING.md, B5).
# The VocalSet takes in the test data (straight, vibrato, breathy, pp) are scales and arpeggios with phrase gaps, and
# their level drifts 10–25 dB inside a take (VocalSet labels a technique, not a level), so each is run two ways as the
# voice of an on-time take of Performance Director and Emotional Singing (survey.js --voice), once each:
#   steady: its steadiest voiced stretch (the longest whose 100 ms levels stay within ±3 dB of their median, picked by
#           the table below), looped, at a gain that puts it at −20 dBFS: a voice held at one level, at a singing level
#   whole:  the take looped from 0.5 s, as recorded (the drift and the quiet takes as they are; for the record)
# then the dynamic stimulus (S1, note levels −12 … 0 dB) and ontime twice.
# Usage: bash scripts/scoring-verify/vocalset.sh <out dir>   (inside a run that holds the lock: checksB.sh)
cd "$(dirname "$0")/../.."
OUT=${1:-scripts/scoring-verify/logs/vocalset}; mkdir -p "$OUT"
VS=${VOXCOACH_TESTDATA:-$HOME/VoxCoachTestData}/vocalset
# take, steady stretch from / to (s), gain to −20 dBFS (dB)
while read -r n from to gain; do
  [ -z "$n" ] && continue
  node scripts/scoring-verify/survey.js --tools pd,emotion --stims ontime --runs 1 --voice "$VS/$n.wav" --voice-from $from --voice-to $to --voice-gain-db $gain --out "$OUT/vs-steady-$n.json" > "$OUT/vs-steady-$n.log" 2>&1 || echo "steady $n: exit $?"
  node scripts/scoring-verify/survey.js --tools pd,emotion --stims ontime --runs 1 --voice "$VS/$n.wav" --voice-from 0.5 --out "$OUT/vs-whole-$n.json" > "$OUT/vs-whole-$n.log" 2>&1 || echo "whole $n: exit $?"
done <<'TABLE'
  breathy-1197 8.0 10.6 17.7
  breathy-1743 11.6 14.3 30.9
  breathy-2353 5.1 7.8 19.6
  breathy-3002 6.0 7.8 14.5
  breathy-5 0.5 1.5 25.7
  breathy-562 1.6 3.9 32.4
  pp-1717 4.5 9.1 20.9
  pp-2977 9.5 12.9 10.0
  pp-646 7.5 9.7 18.5
  pp-92 7.6 9.8 -1.8
  straight-286 3.6 5.9 6.3
  straight-625 8.1 9.9 15.0
  vibrato-1154 14.4 15.7 4.2
  vibrato-2417 16.1 17.7 0.9
  vibrato-2961 11.7 13.5 17.2
  vibrato-3131 6.6 9.2 14.9
  vibrato-628 23.6 25.5 5.9
  vibrato-772 1.6 3.7 6.1
TABLE
node scripts/scoring-verify/survey.js --tools pd,emotion --stims dynamic,ontime --runs 2 --out "$OUT/vs-dynamic.json" > "$OUT/vs-dynamic.log" 2>&1 || echo "dynamic: exit $?"
echo done
