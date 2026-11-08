#!/bin/bash
# Phase 7 checks (PHASE7.md §3), one at a time on the working build (redesign/phase7), AC power only (waits while on
# battery). Each check's output goes to <out>/<name>.log; <out>/progress.txt has a line per start and end with its exit.
# Usage: bash scripts/design-verify/checks7.sh <set>   sets: all | <name,name…>
#   all  youstates (the gate) youstates-fr contrast-you contrast copyscan-you copyscan hooks navcheck bootcheck home levelup
#        p9 voicecard batch1 picker
# p9 reads the build at http://localhost:8765/ (deploy/ served here for it).
cd "$(dirname "$0")/../.."
SET=${1:?usage: checks7.sh all|name,name}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks7-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  youstates) echo "node scripts/design-verify/youstates.js";;
  youstates-fr) echo "node scripts/design-verify/youstates.js --lang fr";;
  contrast-you) echo "node scripts/design-verify/contrast.js --you --json $OUT/contrast-you.json";;
  contrast) echo "node scripts/design-verify/contrast.js --json $OUT/contrast.json";;
  copyscan-you) echo "node scripts/design-verify/copyscan.js --you";;
  copyscan) echo "node scripts/design-verify/copyscan.js";;
  hooks) echo "node scripts/design-verify/hooks.js --base master";;
  navcheck) echo "node scripts/design-verify/navcheck.js";;
  bootcheck) echo "node scripts/design-verify/bootcheck.js";;
  home) echo "node scripts/design-verify/home.js --base master";;
  levelup) echo "node scripts/levelup-verify/levelup.js";;
  p9) echo "node scripts/choir-verify/p9.js http://localhost:8765/";;
  voicecard) echo "node scripts/design-verify/voicecard.js --out $OUT/voicecard";;
  batch1) echo "node scripts/vocal-load-verify/batch1.js";;
  picker) echo "env PK_BEFORE=master node scripts/vq-verify/picker.js";;
  *) echo "false";;
esac; }
case $SET in
  all) LIST="youstates youstates-fr contrast-you contrast copyscan-you copyscan hooks navcheck bootcheck home levelup p9 voicecard batch1 picker";;
  *) LIST=${SET//,/ };;
esac
case " $LIST " in *" p9 "*)
  (cd deploy && exec python3 -m http.server 8765 >/dev/null 2>&1) & DS=$!; trap 'kill $DS 2>/dev/null' EXIT; sleep 2;;
esac
echo "checks7 $SET on $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + working changes')" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 20
done
echo "$(date -u +%H:%M:%S) ALL DONE → $OUT" >> "$OUT/progress.txt"
echo "$OUT"
