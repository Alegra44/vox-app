#!/bin/bash
# Release D on production (design/accuracy/RELEASE_D.md, "Review and deploy", step 4): prod.sh's core run (every non-choir
# suite, scores and scores4b among them; SCORES_BASE = master before the merge, release C's build, served locally) and
# scores6 (5 runs a side), against https://deploy-alegra1122.vercel.app/ and the production backend. Under the run lock,
# on AC power only (prod.sh keeps its own per-suite limits; scores6 has 90 min). Every script deletes its test accounts.
# Logs: prod.sh's own (scripts/design-verify/logs/prod-<stamp>/) and scripts/survey-d/logs/prodD-<stamp>/.
# Usage: bash scripts/survey-d/prodD.sh [core] [scores6]   (no steps: both)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prodD $*" --limit-min 0 -- bash "$PWD/scripts/survey-d/prodD.sh" "$@"
unset VOX_BACKEND NODE_OPTIONS
P=https://deploy-alegra1122.vercel.app/
BASE=$(git log --merges -1 --format=%P dc64605 | cut -d' ' -f1)
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/survey-d/logs/prodD-$STAMP; mkdir -p "$OUT"
STEPS=(
  "core|0|env SCORES_BASE=$BASE bash scripts/design-verify/prod.sh $OUT/shots"
  "scores6|90|node scripts/design-verify/scores.js --base $BASE --branch-url $P --tools pd,staykey,karaoke,emotion --runs 5"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  t0=$(date +%s); echo "$(date +%T) start $name (base $BASE)" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $name $v ($(( ($(date +%s) - t0) / 60 )) min)" >> "$OUT/progress.txt"
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
