#!/bin/bash
# Phase 1, section 3: the suites that failed on the branch, re-run on master in the same session to classify each one
# Regression or Already failing. Same scripts as the branch (the branch's scripts/ copied over a master worktree, so a
# script fix counts on both sides), master's deploy/ served at localhost:8765, production backend, one at a time, paced.
# A suite with no output for WATCHDOG minutes is killed (the branch run's signed-out hangs were killed the same way).
# Usage: bash scripts/design-verify/suites-master.sh <worktree dir> [suite ...]   (default: every suite listed below)
cd "$(dirname "$0")/../.."; REPO=$PWD; WT=${1:?worktree dir}; shift
WATCHDOG=${WATCHDOG:-15}
[ -d "$WT" ] || git worktree add --detach "$WT" master >/dev/null
rm -rf "$WT/scripts"; cp -R "$REPO/scripts" "$WT/scripts"; ln -sfn "$REPO/node_modules" "$WT/node_modules"; ln -sfn "$REPO/supabase/.temp" "$WT/supabase/.temp" # the Supabase link (test-account cleanup)
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=$REPO/scripts/design-verify/logs/suites-master-$STAMP; mkdir -p "$OUT"
echo "master $(git -C "$WT" rev-parse --short HEAD), scripts from $(git rev-parse --short HEAD) + working copy" > "$OUT/progress.txt"
L=http://localhost:8765/
(cd "$WT/deploy" && exec python3 -m http.server 8765 >/dev/null 2>&1) & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
ALL=(
  "batch1|node scripts/vocal-load-verify/batch1.js"
  "batch3c|node scripts/vocal-load-verify/batch3c.js"
  "glider-courses|node scripts/glider-verify/courses.js"
  "warmup-tracking|node scripts/warmup-verify/tracking.js"
  "cv-verify|node scripts/choir-verify/verify.js all"
  "cv-s6fr|node scripts/choir-verify/s6fr.js $L"
  "cv-fix|node scripts/choir-verify/fix.js $L"
  "cv-p5|node scripts/choir-verify/p5.js all $L"
  "cv-peaks|node scripts/choir-verify/peaks.js $L"
  "cv-timing|node scripts/choir-verify/timing.js $L"
  "cv-yc|node scripts/choir-verify/yc.js $L"
  "cv-p7|node scripts/choir-verify/p7.js all $L"
  "cv-p7signed|node scripts/choir-verify/p7signed.js $L"
  "cv-modalz|node scripts/choir-verify/modalz.js $L"
  "cv-p9|node scripts/choir-verify/p9.js $L"
  "cv-desc|node scripts/choir-verify/desc.js"
  "cv-shot|node scripts/choir-verify/shot.js"
  "cv-live5|node scripts/choir-verify/live5.js $L"
  "cv-live6|node scripts/choir-verify/live6.js $L"
  "cv-p10|node scripts/choir-verify/p10.js all $L"
  "cv-live7|node scripts/choir-verify/live7.js $L"
  "cv-live9|node scripts/choir-verify/live9.js $L"
  "batch2|node scripts/vocal-load-verify/batch2.js"
  "batch3a|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|node scripts/vocal-load-verify/batch3b.js"
  "vq|node scripts/vq-verify/vq.js all"
  "livevq|node scripts/vq-verify/livevq.js $L"
  "bands|node scripts/vq-verify/bands.js"
  "cvib|node scripts/vq-verify/cvib.js"
)
cd "$WT"
for s in "${ALL[@]}"; do
  name=${s%%|*}; cmd=${s#*|}
  if [ $# -gt 0 ]; then case " $* " in *" $name "*) ;; *) continue;; esac; fi
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $name" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $name" >> "$OUT/progress.txt"
  $cmd > "$OUT/$name.log" 2>&1 & PID=$!
  while kill -0 $PID 2>/dev/null; do
    sleep 20
    idle=$(( ($(date +%s) - $(stat -f %m "$OUT/$name.log")) / 60 ))
    if [ $idle -ge $WATCHDOG ]; then pkill -P $PID 2>/dev/null; kill $PID 2>/dev/null
      echo "$(date -u +%H:%M:%S) $name killed: no output for $WATCHDOG min" >> "$OUT/progress.txt"; fi
  done
  wait $PID; rc=$?
  echo "$(date -u +%H:%M:%S) done  $name exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
