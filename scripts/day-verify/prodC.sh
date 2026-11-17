#!/bin/bash
# Release C on production (design/day/DAY.md, "Deploy, and release D", PRODUCTION CHECKS): day.js (three zones and the
# switch), pilot (the page-leave save), the vocal-load suite with the outbox, allowlist, progresssave, erasecheck, home,
# youstates, warmup-entries, warmup-tracking, bootcheck, house, against https://deploy-alegra1122.vercel.app/ and the
# production backend. One at a time under the run lock, each under its own limit (checksC.sh's), on AC power only.
# Every script signs up its own throwaway accounts and deletes them (and their vocal-load rows, by cascade) at exit.
# youstates: master before the merge (the merge's first parent) served locally vs the site.
# Logs: scripts/day-verify/logs/prodC-<stamp>/. Usage: bash scripts/day-verify/prodC.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prodC $*" --limit-min 0 -- bash "$PWD/scripts/day-verify/prodC.sh" "$@"
unset VOX_BACKEND NODE_OPTIONS
P=https://deploy-alegra1122.vercel.app/
BASE=$(git log --merges -1 --format=%P 511eeb5 | cut -d' ' -f1)
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/day-verify/logs/prodC-$STAMP; mkdir -p "$OUT"
STEPS=(
  "bootcheck|3|env DV_URL=$P node scripts/design-verify/bootcheck.js"
  "apicheck|4|env DV_URL=$P node scripts/day-verify/apicheck.js"
  "day|40|env DV_URL=$P node scripts/day-verify/day.js"
  "pilot|20|node scripts/vocal-load-verify/pilot.js $P"
  "verify|3|node scripts/vocal-load-verify/verify.js"
  "persist|3|env TZ=UTC node scripts/vocal-load-verify/persist.js"
  "outbox|12|env DV_URL=$P node scripts/vocal-load-verify/outbox.js"
  "live|16|node scripts/vocal-load-verify/live.js"
  "batch1|30|node scripts/vocal-load-verify/batch1.js $P"
  "batch2|40|node scripts/vocal-load-verify/batch2.js $P"
  "batch3a|40|node scripts/vocal-load-verify/batch3a.js $P"
  "batch3b|50|node scripts/vocal-load-verify/batch3b.js $P"
  "batch3c|20|node scripts/vocal-load-verify/batch3c.js $P"
  "allowlist|3|env DV_URL=$P node scripts/backend-verify/allowlist.js"
  "progresssave|6|env DV_URL=$P node scripts/backend-verify/progresssave.js"
  "erasecheck|4|env DV_URL=$P node scripts/backend-verify/erasecheck.js"
  "home|20|env DV_URL=$P node scripts/design-verify/home.js"
  "youstates|4|node scripts/design-verify/youstates.js --base $BASE --branch-url $P"
  "warmup-entries|17|node scripts/warmup-verify/entries.js $P"
  "warmup-tracking|8|node scripts/warmup-verify/tracking.js $P"
  "house|94|env DV_URL=$P node scripts/design-verify/house.js"
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
  sleep 20
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
