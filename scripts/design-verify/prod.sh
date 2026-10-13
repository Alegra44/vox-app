#!/bin/bash
# Phase 1, section F: the checks on production after the deploy, one at a time, paced (60 s between suites; Vercel
# challenges ~35 headless sessions in ~10 min). Test accounts are deleted by each script (track()).
# Logs: scripts/design-verify/logs/prod-<stamp>/; production shots go to <scratchpad or tmp>/voxcoach-shots-prod.
# Usage: [ONLY="house contrast …"] bash scripts/design-verify/prod.sh [shots out dir]   (phase 2 added house, batch3c,
#   listenwin, picker and states-shots: the singing states and the motion at 390, Light and Dark; phase 3 added cv-p9,
#   cv-p10 and home-shots: Home in the 7 seeded states and the Coach tab at 390, Light and Dark)
cd "$(dirname "$0")/../.."
P=https://deploy-alegra1122.vercel.app/
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/prod-$STAMP; mkdir -p "$OUT"
SHOTS=${1:-${TMPDIR:-/tmp}/voxcoach-shots-prod}
SUITES=(
  "house|env DV_URL=$P node scripts/design-verify/house.js"
  "system|env DV_URL=$P node scripts/design-verify/system.js"
  "contrast|env DV_URL=$P node scripts/design-verify/contrast.js --json $OUT/contrast-prod.json"
  "batch1|node scripts/vocal-load-verify/batch1.js $P"
  "batch3c|node scripts/vocal-load-verify/batch3c.js $P"
  "warmup-entries|node scripts/warmup-verify/entries.js $P"
  "warmup-tracking|node scripts/warmup-verify/tracking.js $P"
  "levelup|node scripts/levelup-verify/levelup.js $P"
  "cv-live7|node scripts/choir-verify/live7.js $P"
  "cv-modalz|node scripts/choir-verify/modalz.js $P"
  "cv-p9|node scripts/choir-verify/p9.js $P"
  "cv-p10|node scripts/choir-verify/p10.js all $P"
  "listenwin|env LW_URL=$P node scripts/vq-verify/listenwin.js"
  "picker|env PK_URL=$P node scripts/vq-verify/picker.js"
  "glider-courses|node scripts/glider-verify/courses.js $P"
  "pageload|env PL_LOADS=10 node scripts/vq-verify/pageload.js"
  "states-shots|env DV_URL=$P node scripts/design-verify/shots.js --states-only --sizes 390 --out $SHOTS-states"
  "home-shots|env DV_URL=$P node scripts/design-verify/shots.js --home-only --sizes 390 --out $SHOTS-home"
  "shots|env DV_URL=$P node scripts/design-verify/shots.js --panels home,train-hub,songs-hub,arcade,you-hub --sizes 390 --no-extras --out $SHOTS"
)
for s in "${SUITES[@]}"; do
  name=${s%%|*}; cmd=${s#*|}
  if [ -n "$ONLY" ]; then case " $ONLY " in *" $name "*) ;; *) continue;; esac; fi
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $name" >> "$OUT/progress.txt"
  $cmd > "$OUT/$name.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $name exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
