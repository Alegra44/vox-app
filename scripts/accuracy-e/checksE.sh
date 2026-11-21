#!/bin/bash
# Release E (design/accuracy/RELEASE_E.md) CHECKS, one at a time under the run lock, each under its own time limit, on AC
# power only, against the LOCAL Supabase stack (VOX_BACKEND=local, scripts/localBackend.js: no request reaches
# production). Branch = accuracy/e's working copy; master = master's build in the same run.
#   blend-master, blend   the offline harness (blend.js) on each build; vsmaster.py: S1's spread, VocalSet per note and
#                         per take, the wobbles "no better"
#   vs-<side>-<take>      the VocalSet vibrato and straight takes as the voice of Performance Director, Karaoke Coach and
#                         Emotional Singing (survey.js --voice, its steadiest stretch at −20 dBFS, as vocalset.sh)
#   scores, scores4b, scores6   master vs the branch (scores.js: its own ±2 / master-range gates)
#   survey-master, survey       survey.js on each build, compared with compare.js
# Logs: scripts/accuracy-e/logs/checksE-<stamp>/. Usage: bash scripts/accuracy-e/checksE.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksE $*" --limit-min 0 -- bash "$PWD/scripts/accuracy-e/checksE.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/accuracy-e/logs/checksE-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js"
VS=${VOXCOACH_TESTDATA:-$HOME/VoxCoachTestData}/vocalset
STEPS=(
  "blend-master|10|node scripts/accuracy-e/blend.js --ref master --out $OUT/blend-master.json"
  "blend|10|node scripts/accuracy-e/blend.js --out $OUT/blend.json && python3 scripts/accuracy-e/vsmaster.py $OUT/blend-master.json $OUT/blend.json"
)
# take, steady stretch from / to (s), gain to −20 dBFS (dB): vocalset.sh's table
while read -r n from to gain; do
  for side in master branch; do
    ref=""; [ $side = master ] && ref="--ref master"
    STEPS+=("vs-$side-$n|12|node scripts/scoring-verify/survey.js $ref --tools pd,karaoke,emotion --stims ontime --runs 1 --voice $VS/$n.wav --voice-from $from --voice-to $to --voice-gain-db $gain --out $OUT/vs-$side-$n.json")
  done
done <<'TABLE'
vibrato-1154 14.4 15.7 4.2
vibrato-2417 16.1 17.7 0.9
vibrato-2961 11.7 13.5 17.2
vibrato-3131 6.6 9.2 14.9
vibrato-628 23.6 25.5 5.9
vibrato-772 1.6 3.7 6.1
straight-286 3.6 5.9 6.3
straight-625 8.1 9.9 15.0
TABLE
STEPS+=(
  "scores|60|node scripts/design-verify/scores.js"
  "scores4b|80|node scripts/design-verify/scores.js --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode"
  "scores6|90|node scripts/design-verify/scores.js --tools pd,staykey,karaoke,emotion --runs 5"
  "survey-master|50|node scripts/scoring-verify/survey.js --ref master --out $OUT/survey-master.json"
  "survey|50|node scripts/scoring-verify/survey.js --out $OUT/survey.json && node scripts/scoring-verify/compare.js $OUT/survey-master.json $OUT/survey.json"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  t0=$(date +%s); echo "$(date +%T) start $name" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  m=$(( ($(date +%s) - t0) / 60 ))
  [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $name $v ($m min)" >> "$OUT/progress.txt"
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
