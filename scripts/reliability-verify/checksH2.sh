#!/bin/bash
# Release H2 (design/reliability/RELEASE_H.md, "H2") CHECKS, one at a time under the run lock, each under its own time
# limit, on AC power only, against the LOCAL Supabase stack (VOX_BACKEND=local, scripts/localBackend.js) through its
# slow, shuffled proxy (every answer 200–1500 ms late, some swapped; VOX_SLOW=0 would turn it off: not here).
#   phase A (races): outoforder, warmup-tracking, streak, progresssave, outbox, 5 times each on master and on this
#     branch, alternating master/branch. Master = a worktree of master (its deploy/) with this branch's scripts (the
#     proxy and the test fixes), M=<dir>, default ../voxcoach-m
#   phase B (the rest, this branch): erasecheck, the vocal-load suite (verify, persist, live, pilot, batch1, batch2,
#     batch3a, batch3b, batch3c; the outbox is in A), roundtrip, levelup, youstates, house, hooks, bootcheck
# Logs: scripts/reliability-verify/logs/checksH2-<stamp>/. Usage: bash scripts/reliability-verify/checksH2.sh [A] [B]
cd "$(dirname "$0")/../.."
B_DIR=$PWD; M_DIR=${M:-$(cd ../voxcoach-m && pwd)}
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksH2 $*" --limit-min 0 -- bash "$PWD/scripts/reliability-verify/checksH2.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=$B_DIR/scripts/reliability-verify/logs/checksH2-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local
PHASES=${*:-A B}
run() { # run <dir> <label> <minutes> <command>
  local dir=$1 label=$2 mins=$3 cmd=$4
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  local t0=$(date +%s); echo "$(date +%T) start $label" >> "$OUT/progress.txt"
  (cd "$dir" && NODE_OPTIONS="--require $dir/scripts/localBackend.js" node scripts/runguard.js run --name "$label" --limit-min "$mins" -- bash -c "$cmd") > "$OUT/$label.log" 2>&1
  local code=$?; [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $label $v ($(( ($(date +%s) - t0) / 60 )) min) $(grep -E 'passed|PASS|FAIL' "$OUT/$label.log" | tail -1 | cut -c1-90)" >> "$OUT/progress.txt"
}
RACES=(
  "outoforder|12|node scripts/reliability-verify/outoforder.js"
  "warmup-tracking|16|node scripts/warmup-verify/tracking.js"
  "streak|16|node scripts/warmup-verify/streak.js \$OUTJSON"
  "progresssave|12|node scripts/backend-verify/progresssave.js"
  "outbox|24|node scripts/vocal-load-verify/outbox.js"
)
REST=(
  "erasecheck|8|node scripts/backend-verify/erasecheck.js"
  "verify|8|node scripts/vocal-load-verify/verify.js"
  "persist|6|env TZ=UTC node scripts/vocal-load-verify/persist.js"
  "live|30|node scripts/vocal-load-verify/live.js"
  "pilot|40|node scripts/vocal-load-verify/pilot.js"
  "batch1|60|node scripts/vocal-load-verify/batch1.js"
  "batch2|70|node scripts/vocal-load-verify/batch2.js"
  "batch3a|70|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|90|node scripts/vocal-load-verify/batch3b.js"
  "batch3c|30|node scripts/vocal-load-verify/batch3c.js"
  "roundtrip|6|node scripts/warmup-verify/roundtrip.js"
  "levelup|10|node scripts/levelup-verify/levelup.js"
  "youstates|8|node scripts/design-verify/youstates.js"
  "house|150|node scripts/design-verify/house.js"
  "hooks|6|node scripts/design-verify/hooks.js --base master"
  "bootcheck|6|node scripts/design-verify/bootcheck.js"
)
if [[ " $PHASES " == *" A "* ]]; then
  for i in 1 2 3 4 5; do
    for s in "${RACES[@]}"; do
      IFS='|' read -r name mins cmd <<< "$s"
      for side in master branch; do
        dir=$B_DIR; [ $side = master ] && dir=$M_DIR
        run "$dir" "$name-$side-$i" "$mins" "${cmd//\$OUTJSON/$OUT/$name-$side-$i.json}"
      done
    done
  done
fi
if [[ " $PHASES " == *" B "* ]]; then
  for s in "${REST[@]}"; do
    IFS='|' read -r name mins cmd <<< "$s"
    run "$B_DIR" "$name" "$mins" "$cmd"
  done
fi
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
