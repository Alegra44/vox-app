#!/bin/bash
# Scoring batch release A (design/scoring/SCORING.md): the checks, one at a time under the run lock, each under its own
# time limit (run-limits.json, about 2× its normal time). Logs: scripts/scoring-verify/logs/checksA-<stamp>/<step>.log,
# progress.txt (step, exit code, minutes). "expect-fail" steps must exit non-zero (the guard shown catching a drop).
# Usage: bash scripts/scoring-verify/checksA.sh [step …]   (no steps: all, in this order)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksA $*" --limit-min 0 -- bash "$PWD/scripts/scoring-verify/checksA.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/scoring-verify/logs/checksA-$STAMP; mkdir -p "$OUT"
STEPS=(
  "allowlist|3|node scripts/backend-verify/allowlist.js"
  "allowlist-master|3|expect-fail node scripts/backend-verify/allowlist.js --only source --ref master"
  "progresssave|6|node scripts/backend-verify/progresssave.js"
  "outbox|12|node scripts/vocal-load-verify/outbox.js"
  "vl-engine|3|node scripts/vocal-load-verify/verify.js"
  "vl-persist|3|node scripts/vocal-load-verify/persist.js"
  "batch1|34|node scripts/vocal-load-verify/batch1.js"
  "batch2|26|node scripts/vocal-load-verify/batch2.js"
  "batch3a|32|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|40|node scripts/vocal-load-verify/batch3b.js"
  "batch3c|12|node scripts/vocal-load-verify/batch3c.js"
  "survey-master|50|node scripts/scoring-verify/survey.js --ref master --runs 2 --out $OUT/survey-master.json"
  "survey-branch|50|node scripts/scoring-verify/survey.js --runs 2 --out $OUT/survey-branch.json"
  "scores|36|node scripts/design-verify/scores.js"
  "scores-a3|36|node scripts/design-verify/scores.js --tools pd,karaoke,registerdrills"
  "stopcheck|38|node scripts/design-verify/stopcheck.js"
  "house|94|node scripts/design-verify/house.js --base master"
  "hooks|3|node scripts/design-verify/hooks.js --base master"
  "bootcheck|3|node scripts/design-verify/bootcheck.js"
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
