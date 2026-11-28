#!/bin/bash
# Release J: rerun named phase-B checks of checksJ.sh on master and the branch, in the same log dir, labelled
# <name>-<side>-<round>-rerun (checksJ round 2's streak, levelup and outbox broke on both sides when the Mac woke from a
# 5.5 h sleep on battery: the page didn't load or wasn't initialised). Same rules: run lock, time limits, AC power, the
# local stack through the slow proxy. Usage: OUT=<checksJ log dir> ROUND=2 bash scripts/release-j/rerunJ.sh streak levelup outbox
cd "$(dirname "$0")/../.."
B_DIR=$PWD; M_DIR=${M:-$(cd ../voxcoach-jm && pwd)}
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "rerunJ $*" --limit-min 0 -- bash "$PWD/scripts/release-j/rerunJ.sh" "$@"
export VOX_BACKEND=local
run() { local dir=$1 label=$2 mins=$3 cmd=$4
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  local t0=$(date +%s); echo "$(date +%T) start $label" >> "$OUT/progress.txt"
  (cd "$dir" && NODE_OPTIONS="--require $dir/scripts/localBackend.js" node scripts/runguard.js run --name "$label" --limit-min "$mins" -- bash -c "$cmd") > "$OUT/$label.log" 2>&1
  local code=$?; [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $label $v ($(( ($(date +%s) - t0) / 60 )) min) $(grep -E 'passed|PASS|FAIL' "$OUT/$label.log" | tail -1 | cut -c1-110)" >> "$OUT/progress.txt"; }
spec() { case $1 in streak) echo "16|node scripts/warmup-verify/streak.js @O@.json";; levelup) echo "10|node scripts/levelup-verify/levelup.js";;
  outbox) echo "24|node scripts/vocal-load-verify/outbox.js";; esac; }
for name in "$@"; do IFS='|' read -r mins cmd <<< "$(spec $name)"
  for side in master branch; do dir=$B_DIR; [ $side = master ] && dir=$M_DIR
    run "$dir" "$name-$side-$ROUND-rerun" "$mins" "${cmd//@O@/$OUT/$name-$side-$ROUND-rerun}"; done; done
echo "$(date +%T) RERUN DONE" >> "$OUT/progress.txt"
