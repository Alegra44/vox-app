#!/bin/bash
# Phase 5 checks (PHASE5.md §3), one at a time on the working build (redesign/phase5), AC power only (waits while on
# battery). Each check's output goes to <out>/<name>.log; <out>/progress.txt has a line per start and end with its exit.
# Usage: bash scripts/design-verify/checks5.sh <set>   sets: guards | after | <name,name…>
#   guards  house stopcheck modecheck contrast copyscan (Choir World, four languages) hooks navcheck
#   after   batch1 batch3a batch3b picker warmup-entries warmup-tracking levelup home loopback
# The gate, choirregress.sh, runs on its own: bash scripts/choir-verify/choirregress.sh working
cd "$(dirname "$0")/../.."
SET=${1:?usage: checks5.sh guards|after|name,name}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks5-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  house) echo "node scripts/design-verify/house.js";;
  stopcheck) echo "node scripts/design-verify/stopcheck.js";;
  modecheck) echo "node scripts/audio-verify/modecheck.js";;
  contrast) echo "node scripts/design-verify/contrast.js --json $OUT/contrast.json";;
  copyscan) echo "node scripts/design-verify/copyscan.js --tools --set choir";;
  hooks) echo "node scripts/design-verify/hooks.js --base master";;
  navcheck) echo "node scripts/design-verify/navcheck.js";;
  batch1) echo "node scripts/vocal-load-verify/batch1.js";;
  batch3a) echo "node scripts/vocal-load-verify/batch3a.js";;
  batch3b) echo "node scripts/vocal-load-verify/batch3b.js";;
  picker) echo "env PK_BEFORE=master node scripts/vq-verify/picker.js";;
  warmup-entries) echo "node scripts/warmup-verify/entries.js";;
  warmup-tracking) echo "node scripts/warmup-verify/tracking.js";;
  levelup) echo "node scripts/levelup-verify/levelup.js";;
  home) echo "node scripts/design-verify/home.js --base master";;
  loopback) echo "env LB_BEFORE=master node scripts/vq-verify/loopback.js";;
  *) echo "false";;
esac; }
case $SET in
  guards) LIST="house stopcheck modecheck contrast copyscan hooks navcheck";;
  after) LIST="batch1 batch3a batch3b picker warmup-entries warmup-tracking levelup home loopback";;
  *) LIST=${SET//,/ };;
esac
echo "checks5 $SET on $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + working changes')" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 20
done
echo "$(date -u +%H:%M:%S) ALL DONE → $OUT" >> "$OUT/progress.txt"
echo "$OUT"
