#!/bin/bash
# Release J (design/reliability/RELEASE_J.md) CHECKS, one at a time under the run lock, each under its own time limit,
# on AC power only, against the LOCAL Supabase stack (VOX_BACKEND=local, scripts/localBackend.js) through its slow,
# shuffled proxy (every answer 200–1500 ms late, some swapped). The stack runs J's backend (0012 and J's api, started
# from this worktree): the master side is master's app against it, the old-app case (no if_version: as before J).
# 5 runs each on master and on this branch, alternating master/branch. Master = a worktree of master (its deploy/ and
# scripts), M=<dir>, default ../voxcoach-jm. J's own checks (stale, lostanswer, erase, twotabs) run from this branch
# with --ref master on the master side; oldapp and merge-unit are J-only (branch); outoforder is master's own (H's
# rules) on master and J's rewrite here.
#   phase A: J's checks · phase B: progresssave, erasecheck, streak, roundtrip, levelup, outbox, warmup-tracking,
#   bootcheck · phase C: youstates, hooks (each compares master and the branch in one run) · phase D: house
# Logs: scripts/release-j/logs/checksJ-<stamp>/. Usage: bash scripts/release-j/checksJ.sh [A] [B] [C] [D]
cd "$(dirname "$0")/../.."
B_DIR=$PWD; M_DIR=${M:-$(cd ../voxcoach-jm && pwd)}
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksJ $*" --limit-min 0 -- bash "$PWD/scripts/release-j/checksJ.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=${OUT:-$B_DIR/scripts/release-j/logs/checksJ-$STAMP}; mkdir -p "$OUT"
export VOX_BACKEND=local
PHASES=${*:-A B C D}
run() { # run <dir> <label> <minutes> <command>
  local dir=$1 label=$2 mins=$3 cmd=$4
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  local t0=$(date +%s); echo "$(date +%T) start $label" >> "$OUT/progress.txt"
  (cd "$dir" && NODE_OPTIONS="--require $dir/scripts/localBackend.js" node scripts/runguard.js run --name "$label" --limit-min "$mins" -- bash -c "$cmd") > "$OUT/$label.log" 2>&1
  local code=$?; [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $label $v ($(( ($(date +%s) - t0) / 60 )) min) $(grep -E 'passed|PASS|FAIL|LOST|STALE' "$OUT/$label.log" | tail -1 | cut -c1-110)" >> "$OUT/progress.txt"
}
both() { # both <name> <minutes> <branch command> <master command> <master dir> <i>
  run "$5" "$1-master-$6" "$2" "$4"; run "$B_DIR" "$1-branch-$6" "$2" "$3"
}
J=(
  "stale|25|node scripts/survey-j/stale.js --out @O@|node scripts/survey-j/stale.js --ref master --out @O@|B"
  "lostanswer|6|node scripts/survey-j/lostanswer.js|node scripts/survey-j/lostanswer.js --ref master|B"
  "erase-stale|8|node scripts/release-j/erase.js|node scripts/release-j/erase.js --ref master|B"
  "twotabs|8|node scripts/release-j/twotabs.js|node scripts/release-j/twotabs.js --ref master|B"
  "outoforder|14|node scripts/reliability-verify/outoforder.js|node scripts/reliability-verify/outoforder.js|M"
)
REG=(
  "progresssave|12|node scripts/backend-verify/progresssave.js"
  "erasecheck|8|node scripts/backend-verify/erasecheck.js"
  "streak|16|node scripts/warmup-verify/streak.js @O@.json"
  "roundtrip|6|node scripts/warmup-verify/roundtrip.js"
  "levelup|10|node scripts/levelup-verify/levelup.js"
  "outbox|24|node scripts/vocal-load-verify/outbox.js"
  "warmup-tracking|16|node scripts/warmup-verify/tracking.js"
  "bootcheck|6|node scripts/design-verify/bootcheck.js"
)
for i in 1 2 3 4 5; do
  if [[ " $PHASES " == *" A "* ]]; then
    run "$B_DIR" "merge-unit-$i" 3 "node scripts/release-j/merge-unit.js"
    for s in "${J[@]}"; do
      IFS='|' read -r name mins bcmd mcmd where <<< "$s"
      mdir=$B_DIR; [ "$where" = M ] && mdir=$M_DIR
      both "$name" "$mins" "${bcmd//@O@/$OUT/$name-branch-$i}" "${mcmd//@O@/$OUT/$name-master-$i}" "$mdir" "$i"
    done
    run "$B_DIR" "oldapp-branch-$i" 8 "node scripts/release-j/oldapp.js"
  fi
  if [[ " $PHASES " == *" B "* ]]; then
    for s in "${REG[@]}"; do
      IFS='|' read -r name mins cmd <<< "$s"
      both "$name" "$mins" "${cmd//@O@/$OUT/$name-branch-$i}" "${cmd//@O@/$OUT/$name-master-$i}" "$M_DIR" "$i"
    done
  fi
  if [[ " $PHASES " == *" C "* ]]; then
    run "$B_DIR" "youstates-$i" 8 "node scripts/design-verify/youstates.js"
    run "$B_DIR" "hooks-$i" 6 "node scripts/design-verify/hooks.js --base master"
  fi
done
if [[ " $PHASES " == *" D "* ]]; then
  for i in 1 2 3 4 5; do both house 150 "node scripts/design-verify/house.js" "node scripts/design-verify/house.js" "$M_DIR" "$i"; done
fi
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
