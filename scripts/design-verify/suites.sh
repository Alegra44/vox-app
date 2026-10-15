#!/bin/bash
# Phase 1, section 3: every verify suite once on the branch (local build, production backend), one at a time, paced.
# Logs: scripts/design-verify/logs/suites-<stamp>/<suite>.log; progress: .../progress.txt (suite, exit code, minutes).
# A suite that fails is re-run on master afterwards (suites-master.sh) to classify it Regression or Already failing.
# listenwin / picker / loopback compare against master themselves (*_BEFORE=master); vibfix and noisegate run regress mode.
# Not run here: choir-verify/live.js (hard-wired to production: checks the live HTML equals deploy/index.html, so it can
# only pass after a deploy) and p8.js (needs a file of tier accounts).
# Single stream (2026-10-15): also modecheck (three engines), vlcompare, regfix against master, Voice Quality (vq, livevq,
# bands, cvib: measured on one build, re-run on master by suites-master.sh to read the shift), house/home/hooks/contrast
# against master. Long jobs on AC power only: before each suite the run waits while the Mac is on battery.
# Usage: bash scripts/design-verify/suites.sh [first suite to run]
#        ONLY="warmup-tracking levelup" bash scripts/design-verify/suites.sh   (just those suites, in this file's order)
cd "$(dirname "$0")/../.."
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/suites-$STAMP; mkdir -p "$OUT"
L=http://localhost:8765/
(cd deploy && exec python3 -m http.server 8765 >/dev/null 2>&1) & SRV=$!
trap 'kill $SRV 2>/dev/null' EXIT
SUITES=(
  "modecheck|node scripts/audio-verify/modecheck.js"
  "house|node scripts/design-verify/house.js --base master"
  "home|node scripts/design-verify/home.js --base master"
  "hooks|node scripts/design-verify/hooks.js --base master"
  "contrast|node scripts/design-verify/contrast.js --base master"
  "batch1|node scripts/vocal-load-verify/batch1.js"
  "batch2|node scripts/vocal-load-verify/batch2.js"
  "batch3a|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|node scripts/vocal-load-verify/batch3b.js"
  "batch3c|node scripts/vocal-load-verify/batch3c.js"
  "warmup-entries|node scripts/warmup-verify/entries.js"
  "warmup-tracking|node scripts/warmup-verify/tracking.js"
  "levelup|node scripts/levelup-verify/levelup.js"
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
  "cv-p10|node scripts/choir-verify/p10.js all $L"
  "cv-paywall|node scripts/choir-verify/paywall.js $L"
  "cv-desc|node scripts/choir-verify/desc.js"
  "cv-shot|node scripts/choir-verify/shot.js"
  "cv-live5|node scripts/choir-verify/live5.js $L"
  "cv-live6|node scripts/choir-verify/live6.js $L"
  "cv-live7|node scripts/choir-verify/live7.js $L"
  "cv-live9|node scripts/choir-verify/live9.js $L"
  "glider-courses|node scripts/glider-verify/courses.js"
  "glider-flight|node scripts/glider-verify/flight.js"
  "range-reload|node scripts/range-verify/reload.js"
  "tt-firsttick|node scripts/tt-verify/firsttick.js"
  "listenwin|env LW_BEFORE=master node scripts/vq-verify/listenwin.js"
  "picker|env PK_BEFORE=master node scripts/vq-verify/picker.js"
  "pmframes1|env PF_BEFORE=master node scripts/vq-verify/pmframes.js"
  "pmframes2|env PF_BEFORE=master node scripts/vq-verify/pmframes.js"
  "pmframes3|env PF_BEFORE=master node scripts/vq-verify/pmframes.js"
  "loopback|env LB_BEFORE=master node scripts/vq-verify/loopback.js"
  "levels|node scripts/vq-verify/levels.js"
  "rtfsoft|env RS_BEFORE=master node scripts/vq-verify/rtfsoft.js"
  "regfix|env REG_BEFORE=master node scripts/vq-verify/regfix.js all"
  "vq|node scripts/vq-verify/vq.js all"
  "livevq|node scripts/vq-verify/livevq.js $L"
  "bands|node scripts/vq-verify/bands.js"
  "cvib|node scripts/vq-verify/cvib.js"
  "vlcompare|node scripts/audio-verify/vlcompare.js"
  "vibfix-regress|env VF_MODE=regress VF_BEFORE=master node scripts/vq-verify/vibfix.js"
  "noisegate-regress|env NG_MODE=regress NG_BEFORE=master node scripts/vq-verify/noisegate.js"
)
started=${1:+0}; [ -z "$1" ] && started=1
for s in "${SUITES[@]}"; do
  name=${s%%|*}; cmd=${s#*|}
  [ "$started" = 0 ] && [ "$name" = "$1" ] && started=1; [ "$started" = 0 ] && continue
  if [ -n "$ONLY" ]; then case " $ONLY " in *" $name "*) ;; *) continue;; esac; fi
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $name" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $name" >> "$OUT/progress.txt"
  $cmd > "$OUT/$name.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $name exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
