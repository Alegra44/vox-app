#!/bin/bash
# Release H on production (design/reliability/RELEASE_H.md, "Review and deploy", step 3), against
# https://deploy-alegra1122.vercel.app/ and the production backend (H is app-only: no migration, no Edge Function):
#   core          prod.sh's core run (bootcheck, house, warmup-tracking, levelup, youstates, scores and the rest;
#                 SCORES_BASE = master before H's merge, release F's build, served locally)
#   outoforder    the out-of-order answers check, on the deployed page
#   progresssave  outbox  streak   on the deployed page (DV_URL / WU_URL)
#   roundtrip     the two warm-up columns through PATCH/GET, and a save without them
# Under the run lock, on AC power only, each under its own time limit (prod.sh keeps its own per-suite limits). Every
# script deletes its test accounts. Logs: prod.sh's own (scripts/design-verify/logs/prod-<stamp>/) and
# scripts/reliability-verify/logs/prodH-<stamp>/. Usage: bash scripts/reliability-verify/prodH.sh [step …]  (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prodH $*" --limit-min 0 -- bash "$PWD/scripts/reliability-verify/prodH.sh" "$@"
unset VOX_BACKEND NODE_OPTIONS
P=https://deploy-alegra1122.vercel.app/
MERGE=${MERGE:-$(git log --merges -1 --format=%H master)}
BASE=$(git log -1 --format=%P "$MERGE" | cut -d' ' -f1)
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/reliability-verify/logs/prodH-$STAMP; mkdir -p "$OUT"
STEPS=(
  "core|0|env SCORES_BASE=$BASE bash scripts/design-verify/prod.sh $OUT/shots"
  "rerun|0|env SCORES_BASE=$BASE ONLY=\"$RERUN\" bash scripts/design-verify/prod.sh $OUT/shots"
  "outoforder|6|env DV_URL=$P node scripts/reliability-verify/outoforder.js"
  "progresssave|6|env DV_URL=$P node scripts/backend-verify/progresssave.js"
  "outbox|12|env DV_URL=$P node scripts/vocal-load-verify/outbox.js"
  "roundtrip|3|node scripts/warmup-verify/roundtrip.js"
  "streak|12|env WU_URL=$P node scripts/warmup-verify/streak.js $OUT/streak.json"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -z "$*" ] && [ "$name" = rerun ] && continue
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  t0=$(date +%s); echo "$(date +%T) start $name (merge $MERGE, base $BASE)" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $name $v ($(( ($(date +%s) - t0) / 60 )) min)" >> "$OUT/progress.txt"
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
