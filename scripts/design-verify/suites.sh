#!/bin/bash
# Phase 1, section 3: every verify suite once on the branch (local build, production backend), one at a time, paced.
# Logs: scripts/design-verify/logs/suites-<stamp>/<suite>.log; progress: .../progress.txt (suite, exit code, minutes).
# A suite that fails is re-run on master afterwards (suites-master.sh) to classify it Regression or Already failing.
# listenwin / picker / loopback compare against master themselves (*_BEFORE=master); vibfix and noisegate run regress mode.
# The choir group (phase 5a), opt-in: ONLY="choir", or WITH_CHOIR=1 for everything plus the group. Required for phases
# 5, 6 and 10 (with choirregress.sh, the choir gate). cv-live runs against production (it checks the live HTML equals deploy/index.html, so it
# can only pass after a deploy); p8.js makes its own tier accounts. Choir suites carry a usual run time: 3× it (30 min at
# most) is their limit, on top of the idle watchdog.
# Single stream (2026-10-15): also modecheck (three engines), vlcompare, regfix against master, Voice Quality (vq, livevq,
# bands, cvib: measured on one build, re-run on master by suites-master.sh to read the shift), house/home/hooks/contrast
# against master. Long jobs on AC power only: before each suite the run waits while the Mac is on battery.
# Usage: bash scripts/design-verify/suites.sh [first suite to run]
#        ONLY="warmup-tracking levelup" bash scripts/design-verify/suites.sh   (just those suites, in this file's order)
cd "$(dirname "$0")/../.."
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/suites-$STAMP; mkdir -p "$OUT"
L=http://localhost:8765/
WATCHDOG=${WATCHDOG:-15}
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
  # the choir group (phase 5a; ONLY="choir"): the number is the usual minutes, the limit 3× that, 30 at most
  "cv-desc|node scripts/choir-verify/desc.js $L|1"
  "cv-shot|node scripts/choir-verify/shot.js $L|1"
  "cv-verify|node scripts/choir-verify/verify.js all $L|2"
  "cv-fix|node scripts/choir-verify/fix.js $L|2"
  "cv-s6fr|node scripts/choir-verify/s6fr.js $L|1"
  "cv-live|node scripts/choir-verify/live.js|1"
  "cv-live5|node scripts/choir-verify/live5.js $L|2"
  "cv-live6|node scripts/choir-verify/live6.js $L|2"
  "cv-live7|node scripts/choir-verify/live7.js $L|2"
  "cv-live9|node scripts/choir-verify/live9.js $L|2"
  "cv-modalz|node scripts/choir-verify/modalz.js $L|1"
  "cv-p5|node scripts/choir-verify/p5.js all $L|5"
  "cv-p7|node scripts/choir-verify/p7.js all $L|3"
  "cv-p7signed|node scripts/choir-verify/p7signed.js $L|3"
  "cv-p8|node scripts/choir-verify/p8.js all $L|6"
  "cv-p9|node scripts/choir-verify/p9.js $L|10"
  "cv-p10|node scripts/choir-verify/p10.js all $L|11"
  "cv-paywall|node scripts/choir-verify/paywall.js $L|1"
  "cv-peaks|node scripts/choir-verify/peaks.js $L|4"
  "cv-timing|node scripts/choir-verify/timing.js $L|2"
  "cv-yc|node scripts/choir-verify/yc.js $L|7"
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
CHOIR="cv-desc cv-shot cv-verify cv-fix cv-s6fr cv-live cv-live5 cv-live6 cv-live7 cv-live9 cv-modalz cv-p5 cv-p7 cv-p7signed cv-p8 cv-p9 cv-p10 cv-paywall cv-peaks cv-timing cv-yc"
ONLY=$(echo " $ONLY " | sed "s/ choir / $CHOIR /"); ONLY=${ONLY# }; ONLY=${ONLY% } # ONLY="choir": the choir group
started=${1:+0}; [ -z "$1" ] && started=1
for s in "${SUITES[@]}"; do
  name=${s%%|*}; cmd=${s#*|}; usual=; case $cmd in *"|"*) usual=${cmd##*|}; cmd=${cmd%|*};; esac
  [ "$started" = 0 ] && [ "$name" = "$1" ] && started=1; [ "$started" = 0 ] && continue
  if [ -n "$ONLY" ]; then case " $ONLY " in *" $name "*) ;; *) continue;; esac; fi
  case $name in cv-*) [ -z "$ONLY" ] && [ -z "$WITH_CHOIR" ] && continue;; esac # the choir group is opt-in
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $name" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $name" >> "$OUT/progress.txt"
  $cmd > "$OUT/$name.log" 2>&1 & PID=$!
  limit=; [ -n "$usual" ] && limit=$(( usual * 3 )) && [ $limit -gt 30 ] && limit=30
  while kill -0 $PID 2>/dev/null; do # a suite with no output for WATCHDOG minutes is killed (cv-s6fr hung for 44 h on 2026-10-16)
    sleep 20
    idle=$(( ($(date +%s) - $(stat -f %m "$OUT/$name.log")) / 60 ))
    if [ $idle -ge $WATCHDOG ]; then pkill -P $PID 2>/dev/null; kill $PID 2>/dev/null
      echo "$(date -u +%H:%M:%S) $name killed: no output for $WATCHDOG min" >> "$OUT/progress.txt"; fi
    if [ -n "$limit" ] && [ $(( $(date +%s) - t0 )) -ge $(( limit * 60 )) ]; then pkill -P $PID 2>/dev/null; kill $PID 2>/dev/null
      echo "$(date -u +%H:%M:%S) $name killed: over its limit of $limit min" >> "$OUT/progress.txt"; fi
  done
  wait $PID; rc=$?
  echo "$(date -u +%H:%M:%S) done  $name exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
