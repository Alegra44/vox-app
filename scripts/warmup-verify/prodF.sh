#!/bin/bash
# Release F on production (design/warmup/RELEASE_F.md, "Review and deploy", step 3), against
# https://deploy-alegra1122.vercel.app/ and the production backend (0011 and the api function on since step a/b):
#   core          prod.sh's core run (bootcheck, house, warmup-entries, warmup-tracking, levelup, youstates, scores,
#                 scores4b and the rest; SCORES_BASE = master before F's merge, release E's build, served locally)
#   bannerbehind  whyline  keeps  summary  streak (two contexts as two devices)  streakline   the deployed page (WU_URL)
#   allowlist     the source and the app's PATCH bodies against the deployed function's allow-list
#   home          Home and the Coach tab, E's build against master (F, the deployed page's file), production backend
#   roundtrip     the two warm-up columns through PATCH/GET, and a save without them
# Under the run lock, on AC power only, each under its own time limit (prod.sh keeps its own per-suite limits). Every
# script deletes its test accounts. Logs: prod.sh's own (scripts/design-verify/logs/prod-<stamp>/) and
# scripts/warmup-verify/logs/prodF-<stamp>/. Usage: bash scripts/warmup-verify/prodF.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prodF $*" --limit-min 0 -- bash "$PWD/scripts/warmup-verify/prodF.sh" "$@"
unset VOX_BACKEND NODE_OPTIONS
P=https://deploy-alegra1122.vercel.app/
BASE=$(git log --merges -1 --format=%P dc3abb2 | cut -d' ' -f1)
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/warmup-verify/logs/prodF-$STAMP; mkdir -p "$OUT"
STEPS=(
  "core|0|env SCORES_BASE=$BASE bash scripts/design-verify/prod.sh $OUT/shots"
  "rerun|0|env SCORES_BASE=$BASE ONLY=\"$RERUN\" bash scripts/design-verify/prod.sh $OUT/shots"
  "bannerbehind|12|env WU_URL=$P node scripts/warmup-verify/bannerbehind.js $OUT/shots"
  "whyline|8|env WU_URL=$P node scripts/warmup-verify/whyline.js $OUT/whyline.json"
  "keeps|16|env WU_URL=$P node scripts/warmup-verify/keeps.js $OUT/keeps.json"
  "summary|20|env WU_URL=$P node scripts/warmup-verify/summary.js $OUT/summary.json"
  "streak|12|env WU_URL=$P node scripts/warmup-verify/streak.js $OUT/streak.json"
  "streakline|10|env WU_URL=$P node scripts/warmup-verify/streakline.js"
  "allowlist|4|node scripts/backend-verify/allowlist.js"
  "home|25|node scripts/design-verify/home.js --base $BASE"
  "roundtrip|3|node scripts/warmup-verify/roundtrip.js"
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
