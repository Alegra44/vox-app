#!/bin/bash
# Release H (design/reliability/RELEASE_H.md) CHECKS, one at a time under the run lock, each under its own time limit, on
# AC power only, against the LOCAL Supabase stack (VOX_BACKEND=local, scripts/localBackend.js: no request reaches
# production).
#   outoforder         the new check on this branch: must pass
#   outoforder-master  the same check on master's deploy/: must fail (the bug reproduced)
#   then progresssave, erasecheck, the vocal-load suite with the outbox (verify, persist, outbox, live, pilot, batch1,
#   batch2, batch3a, batch3b, batch3c), roundtrip, streak, warmup-tracking, levelup, youstates, house, hooks, bootcheck
# Logs: scripts/reliability-verify/logs/checksH-<stamp>/. Usage: bash scripts/reliability-verify/checksH.sh [step …]
# "expect-fail" steps must exit non-zero.
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksH $*" --limit-min 0 -- bash "$PWD/scripts/reliability-verify/checksH.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/reliability-verify/logs/checksH-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js"
STEPS=(
  "outoforder|6|node scripts/reliability-verify/outoforder.js"
  "outoforder-master|6|expect-fail node scripts/reliability-verify/outoforder.js --ref master"
  "progresssave|6|node scripts/backend-verify/progresssave.js"
  "erasecheck|4|node scripts/backend-verify/erasecheck.js"
  "verify|4|node scripts/vocal-load-verify/verify.js"
  "persist|3|env TZ=UTC node scripts/vocal-load-verify/persist.js"
  "outbox|12|node scripts/vocal-load-verify/outbox.js"
  "live|16|node scripts/vocal-load-verify/live.js"
  "pilot|20|node scripts/vocal-load-verify/pilot.js"
  "batch1|34|node scripts/vocal-load-verify/batch1.js"
  "batch2|40|node scripts/vocal-load-verify/batch2.js"
  "batch3a|40|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|50|node scripts/vocal-load-verify/batch3b.js"
  "batch3c|20|node scripts/vocal-load-verify/batch3c.js"
  "roundtrip|3|node scripts/warmup-verify/roundtrip.js"
  "streak|8|node scripts/warmup-verify/streak.js $OUT/streak.json"
  "warmup-tracking|8|node scripts/warmup-verify/tracking.js"
  "levelup|5|node scripts/levelup-verify/levelup.js"
  "youstates|4|node scripts/design-verify/youstates.js"
  "house|94|node scripts/design-verify/house.js"
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
