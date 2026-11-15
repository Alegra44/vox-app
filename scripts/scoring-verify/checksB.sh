#!/bin/bash
# Scoring batch release B (design/scoring/SCORING.md, "Release A deploy, release B build", 4): the checks, one at a time
# under the run lock, each under its own time limit (about 2× its normal time). Logs:
# scripts/scoring-verify/logs/checksB-<stamp>/<step>.log, progress.txt (step, exit code, minutes).
# The first group measures what B's numbers are set from (PD's onsets, the VocalSet takes) and checks the migration and
# the speaker-delay rig; the second is B's checks. PGLITE_DIR: a folder with @electric-sql/pglite@0.2.17 installed.
# Usage: bash scripts/scoring-verify/checksB.sh [step …]   (no steps: all, in this order)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksB $*" --limit-min 0 -- bash "$PWD/scripts/scoring-verify/checksB.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/scoring-verify/logs/checksB-$STAMP; mkdir -p "$OUT"
STEPS=(
  "migrations|3|node scripts/backend-verify/migrations.js"
  "pd-onsets|30|node scripts/scoring-verify/survey.js --tools pd,karaoke --stims ontime,late150 --runs 2 --out $OUT/pd-onsets.json"
  "pd-onsets-nolanes|20|node scripts/scoring-verify/survey.js --tools pd --stims ontime,late150 --runs 2 --stub-lanes --out $OUT/pd-onsets-nolanes.json"
  "vocalset|120|bash scripts/scoring-verify/vocalset.sh $OUT"
  "latency-rig|10|node scripts/scoring-verify/latency.js --rig 0,120,250 --runs 2"
  "device|30|node scripts/scoring-verify/device.js --out $OUT/device.json"
  "allowlist|3|node scripts/backend-verify/allowlist.js"
  "survey-master|50|node scripts/scoring-verify/survey.js --ref master --runs 2 --out $OUT/survey-master.json"
  "survey-branch|50|node scripts/scoring-verify/survey.js --runs 2 --out $OUT/survey-branch.json"
  "scores|36|node scripts/design-verify/scores.js"
  "scores4b|44|node scripts/design-verify/scores.js --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode"
  "scores6|40|node scripts/design-verify/scores.js --tools pd,staykey,karaoke,emotion"
  "house|94|node scripts/design-verify/house.js --base master"
  "hooks|3|node scripts/design-verify/hooks.js --base master"
  "contrast|86|node scripts/design-verify/contrast.js"
  "copyscan-all|3|node scripts/design-verify/copyscan.js --all"
  "names|25|node scripts/design-verify/names.js"
  "focus|30|node scripts/design-verify/focus.js"
  "targets|15|node scripts/design-verify/targets.js"
  "bootcheck|3|node scripts/design-verify/bootcheck.js"
  "youstates|4|node scripts/design-verify/youstates.js"
  "erasecheck|4|node scripts/backend-verify/erasecheck.js"
  "shotsB|40|node scripts/scoring-verify/shotsB.js --out $OUT/shots"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  expect=0; [[ "$cmd" == expect-fail* ]] && { expect=1; cmd=${cmd#expect-fail }; }
  t0=$(date +%s); echo "$(date +%T) start $name" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  m=$(( ($(date +%s) - t0) / 60 ))
  if [ $expect = 1 ]; then [ $code != 0 ] && v=PASS || v=FAIL; v="$v (expected to fail: exit $code)"; else [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"; fi
  echo "$(date +%T) done  $name $v ($m min)" >> "$OUT/progress.txt"
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
