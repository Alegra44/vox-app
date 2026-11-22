#!/bin/bash
# Release F (design/warmup/RELEASE_F.md) CHECKS, one at a time under the run lock, each under its own time limit (about 2×
# its normal time), on AC power only, against the LOCAL Supabase stack started from this checkout (VOX_BACKEND=local,
# scripts/localBackend.js: no request reaches production; 0011 and the api's allow-list as this branch has them).
#   migration11   0011 on the local stack (reset to 0010, an old row, migration up; ends with every migration applied)
#   bannerbehind  F1   whyline F2   keeps F3 (and F2/F5's expectations)   summary F4   streak F5   shots (shotsF.js)
#   then the standing checks: warmup-entries, warmup-tracking, allowlist, levelup, home, youstates, house, contrast,
#   copyscan (--all), names, focus, targets, hooks (against master), bootcheck
# Logs and outputs: scripts/warmup-verify/logs/checksF-<stamp>/. Usage: bash scripts/warmup-verify/checksF.sh [step …]
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksF $*" --limit-min 0 -- bash "$PWD/scripts/warmup-verify/checksF.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/warmup-verify/logs/checksF-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js"
STEPS=(
  "migration11|10|node scripts/warmup-verify/migration11.js"
  "bannerbehind|12|node scripts/warmup-verify/bannerbehind.js $OUT/shots"
  "whyline|6|node scripts/warmup-verify/whyline.js $OUT/whyline.json"
  "keeps|14|node scripts/warmup-verify/keeps.js $OUT/keeps.json"
  "summary|15|node scripts/warmup-verify/summary.js $OUT/summary.json"
  "streak|8|node scripts/warmup-verify/streak.js $OUT/streak.json"
  "shots|15|node scripts/warmup-verify/shotsF.js $OUT/shots"
  "warmup-entries|20|node scripts/warmup-verify/entries.js"
  "warmup-tracking|8|node scripts/warmup-verify/tracking.js"
  "allowlist|3|node scripts/backend-verify/allowlist.js"
  "levelup|5|node scripts/levelup-verify/levelup.js"
  "home|20|node scripts/design-verify/home.js"
  "youstates|4|node scripts/design-verify/youstates.js"
  "house|94|node scripts/design-verify/house.js"
  "contrast|84|node scripts/design-verify/contrast.js --json $OUT/contrast.json"
  "copyscan|30|node scripts/design-verify/copyscan.js --all"
  "names|25|node scripts/design-verify/names.js --out $OUT/names"
  "focus|30|node scripts/design-verify/focus.js --out $OUT/focus"
  "targets|15|node scripts/design-verify/targets.js --out $OUT/targets"
  "hooks|3|node scripts/design-verify/hooks.js --base master"
  "bootcheck|3|node scripts/design-verify/bootcheck.js"
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
