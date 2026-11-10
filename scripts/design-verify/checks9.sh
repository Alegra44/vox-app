#!/bin/bash
# Phase 9 checks (PHASE9.md §3), one at a time on the working build (redesign/phase9), AC power only (waits while on
# battery). Each check's output goes to <out>/<name>.log; <out>/progress.txt has a line per start and end with its exit.
# Usage: bash scripts/design-verify/checks9.sh <set>   sets: all | <name,name…>
#   all  states9 (the gate) onboard checkout feedback posters moments9 levelup home cv-paywall cv-p8
#        warmup-entries (§3 "entries") warmup-tracking tools house contrast copyscan-all hooks navcheck bootcheck youstates
# signUp through common.js runs in every one of them (each signs its own test account up). "tools" is scores.js: the
# 14 Coach tools of tools.js through their own buttons, master vs the branch (Vocal Lab and the Key tool are on it).
# cv-paywall and cv-p8 are choir-verify's paywall.js and p8.js (prod.sh's names; ONLY=choir there).
cd "$(dirname "$0")/../.."
SET=${1:?usage: checks9.sh all|name,name}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks9-$STAMP; mkdir -p "$OUT"
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
  *) echo "false";;
esac; }
case $SET in
  all) LIST="states9 onboard checkout feedback posters moments9 levelup home cv-paywall cv-p8 warmup-entries warmup-tracking tools house contrast copyscan-all hooks navcheck bootcheck youstates";;
  *) LIST=${SET//,/ };;
esac
case " $LIST " in *" cv-paywall "*|*" cv-p8 "*) # the choir scripts take the working build at :8765 (as in checks7)
  (cd deploy && exec python3 -m http.server 8765 >/dev/null 2>&1) & DS=$!; trap 'kill $DS 2>/dev/null' EXIT; sleep 2;;
esac
echo "checks9 $SET on $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + working changes')" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 20
done
echo "$(date -u +%H:%M:%S) ALL DONE → $OUT" >> "$OUT/progress.txt"
echo "$OUT"
