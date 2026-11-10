#!/bin/bash
# Phase 10 checks (PHASE10.md A3), one at a time on the working build (redesign/phase10), AC power only (waits while on
# battery). Each check's output goes to <out>/<name>.log; <out>/progress.txt has a line per start and end with its exit.
# Usage: bash scripts/design-verify/checks10.sh <set>   sets: a3 | all | <name,name…>
#   a3   PHASE10.md A3, the checks for A1: hooks contrast copyscan-all bootcheck navcheck home warmup-entries
#        warmup-tracking, states9 (screens9.js changed with .legacy-tabs; master = phase 9 vs the branch), datelocale
#        (A1's English dates), unusedkeys (A1's keys: 0 referenced nowhere)
#   all  as checks9.sh's all, plus datelocale and unusedkeys
cd "$(dirname "$0")/../.."
SET=${1:?usage: checks10.sh all|name,name}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks10-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  states9) echo "node scripts/design-verify/states9.js --out $OUT/states9";;
  onboard) echo "node scripts/design-verify/onboard.js --out $OUT/onboard";;
  checkout) echo "node scripts/design-verify/checkout.js --out $OUT/checkout";;
  feedback) echo "node scripts/design-verify/feedback.js";;
  posters) echo "node scripts/design-verify/posters.js --out $OUT/posters";;
  moments9) echo "node scripts/design-verify/moments9.js";;
  levelup) echo "node scripts/levelup-verify/levelup.js";;
  home) echo "node scripts/design-verify/home.js";;
  cv-paywall) echo "node scripts/choir-verify/paywall.js";;
  cv-p8) echo "node scripts/choir-verify/p8.js all";;
  warmup-entries) echo "node scripts/warmup-verify/entries.js";;
  warmup-tracking) echo "node scripts/warmup-verify/tracking.js";;
  tools) echo "node scripts/design-verify/scores.js";;
  house) echo "node scripts/design-verify/house.js";;
  contrast) echo "node scripts/design-verify/contrast.js --json $OUT/contrast.json";;
  copyscan-all) echo "node scripts/design-verify/copyscan.js --all";;
  hooks) echo "node scripts/design-verify/hooks.js --base master";;
  navcheck) echo "node scripts/design-verify/navcheck.js";;
  bootcheck) echo "node scripts/design-verify/bootcheck.js";;
  youstates) echo "node scripts/design-verify/youstates.js";;
  datelocale) echo "node scripts/design-verify/datelocale.js";;
  unusedkeys) echo "node scripts/design-verify/unusedkeys.js";;
  *) echo "false";;
esac; }
case $SET in
  a3) LIST="hooks unusedkeys datelocale copyscan-all bootcheck navcheck home warmup-entries warmup-tracking states9 contrast";;
  all) LIST="datelocale unusedkeys states9 onboard checkout feedback posters moments9 levelup home cv-paywall cv-p8 warmup-entries warmup-tracking tools house contrast copyscan-all hooks navcheck bootcheck youstates";;
  *) LIST=${SET//,/ };;
esac
case " $LIST " in *" cv-paywall "*|*" cv-p8 "*) # the choir scripts take the working build at :8765 (as in checks7)
  (cd deploy && exec python3 -m http.server 8765 >/dev/null 2>&1) & DS=$!; trap 'kill $DS 2>/dev/null' EXIT; sleep 2;;
esac
echo "checks10 $SET on $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + working changes')" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 20
done
echo "$(date -u +%H:%M:%S) ALL DONE → $OUT" >> "$OUT/progress.txt"
echo "$OUT"
