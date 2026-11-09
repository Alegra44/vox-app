#!/bin/bash
# Phase 8 checks (PHASE8.md §3), one at a time on the working build (redesign/phase8), AC power only (waits while on
# battery). Each check's output goes to <out>/<name>.log; <out>/progress.txt has a line per start and end with its exit.
# Usage: bash scripts/design-verify/checks8.sh <set>   sets: all | <name,name…>
#   all  gamestates (the gate) checkout stopcheck treecheck, the game scripts (glider-flight glider-courses regfix
#        batch3a batch3b warmup-entries warmup-tracking loopback), house contrast copyscan-world hooks navcheck bootcheck
#        batch1 picker
# stopcheck runs in full (every tool, Choir World, the Songs tools, the games): stopAllActiveSessions changed.
cd "$(dirname "$0")/../.."
SET=${1:?usage: checks8.sh all|name,name}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks8-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  gamestates) echo "node scripts/design-verify/gamestates.js";;
  checkout) echo "node scripts/design-verify/checkout.js --out $OUT/checkout";;
  stopcheck) echo "node scripts/design-verify/stopcheck.js";;
  treecheck) echo "node scripts/design-verify/treecheck.js";;
  glider-flight) echo "node scripts/glider-verify/flight.js";;
  glider-courses) echo "node scripts/glider-verify/courses.js";;
  regfix) echo "node scripts/vq-verify/regfix.js all";;
  batch3a) echo "node scripts/vocal-load-verify/batch3a.js";;
  batch3b) echo "node scripts/vocal-load-verify/batch3b.js";;
  warmup-entries) echo "node scripts/warmup-verify/entries.js";;
  warmup-tracking) echo "node scripts/warmup-verify/tracking.js";;
  loopback) echo "node scripts/vq-verify/loopback.js";;
  house) echo "node scripts/design-verify/house.js";;
  contrast) echo "node scripts/design-verify/contrast.js --json $OUT/contrast.json";;
  copyscan-world) echo "node scripts/design-verify/copyscan.js --world";;
  hooks) echo "node scripts/design-verify/hooks.js --base master";;
  navcheck) echo "node scripts/design-verify/navcheck.js";;
  bootcheck) echo "node scripts/design-verify/bootcheck.js";;
  batch1) echo "node scripts/vocal-load-verify/batch1.js";;
  picker) echo "env PK_BEFORE=master node scripts/vq-verify/picker.js";;
  *) echo "false";;
esac; }
case $SET in
  all) LIST="gamestates checkout stopcheck treecheck glider-flight glider-courses regfix batch3a batch3b warmup-entries warmup-tracking loopback house contrast copyscan-world hooks navcheck bootcheck batch1 picker";;
  *) LIST=${SET//,/ };;
esac
echo "checks8 $SET on $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + working changes')" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 20
done
echo "$(date -u +%H:%M:%S) ALL DONE → $OUT" >> "$OUT/progress.txt"
echo "$OUT"
