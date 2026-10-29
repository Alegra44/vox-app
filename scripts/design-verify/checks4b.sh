#!/bin/bash
# Phase 4b, section 3 (PHASE4B.md): the checks, one at a time, on the working copy (local build, production backend),
# each against master where the suite compares. The 4b guards first, then the existing suites for these tools, then the
# app-wide ones. Logs: scripts/design-verify/logs/checks4b-<stamp>/<suite>.log; progress.txt (suite, exit code, minutes).
# A failing suite is re-run on master afterwards and classified (Regression / Already failing / expected change).
# AC power only: before each suite the run waits while the Mac is on battery. A suite silent for WATCHDOG minutes is killed.
# The master build is served on :8766 for the suites that take a URL ($M).
# Usage: bash scripts/design-verify/checks4b.sh [first suite]     ONLY="scores live" bash …   (just those, in this order)
cd "$(dirname "$0")/../.."
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks4b-$STAMP; mkdir -p "$OUT"
L=http://localhost:8765/
WATCHDOG=${WATCHDOG:-20}
(cd deploy && exec python3 -m http.server 8765 >/dev/null 2>&1) & SRV=$!
MDIR=$(node -e "console.log(require('./scripts/design-verify/common').buildDir('master'))"); M=http://localhost:8766/
(cd "$MDIR" && exec python3 -m http.server 8766 >/dev/null 2>&1) & MSRV=$!
trap 'kill $SRV $MSRV 2>/dev/null' EXIT
T4=onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode
SUITES=(
  "hooks|node scripts/design-verify/hooks.js --base master"
  "scores|node scripts/design-verify/scores.js --tools $T4 --runs 3"
  "scores-aa-rhythm|node scripts/design-verify/scores.js --tools rhythm --stims onbeat,late60 --runs 3 --branch-ref master"
  "scores-aa-emotion|node scripts/design-verify/scores.js --tools emotionmode --stims louder --runs 3 --branch-ref master"
  "live|node scripts/design-verify/live.js --runs 3 --at 4100,5100,7100"
  "copyscan|node scripts/design-verify/copyscan.js --tools --set 4b"
  "house|node scripts/design-verify/house.js"
  "stopcheck|node scripts/design-verify/stopcheck.js"
  "stopcheck-master|node scripts/design-verify/stopcheck.js --base master --only4b"
  "batch2|node scripts/vocal-load-verify/batch2.js"
  "batch3a|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|node scripts/vocal-load-verify/batch3b.js"
  "batch3c|node scripts/vocal-load-verify/batch3c.js"
  "batch2-master|node scripts/vocal-load-verify/batch2.js $M"
  "batch3a-master|node scripts/vocal-load-verify/batch3a.js $M"
  "batch3b-master|node scripts/vocal-load-verify/batch3b.js $M"
  "batch3c-master|node scripts/vocal-load-verify/batch3c.js $M"
  "contrast|node scripts/design-verify/contrast.js --tools-only --set 4b"
  "navcheck|node scripts/design-verify/navcheck.js"
  "navcheck-master|node scripts/design-verify/navcheck.js --base master"
  "rtfsteady|node scripts/vq-verify/rtfsteady.js"
  "rtfsoft|env RS_BEFORE=master node scripts/vq-verify/rtfsoft.js"
  "regfix|env REG_BEFORE=master node scripts/vq-verify/regfix.js all"
  "vq|node scripts/vq-verify/vq.js all"
  "bands|node scripts/vq-verify/bands.js"
  "cvib|node scripts/vq-verify/cvib.js"
  "brightui|node scripts/vq-verify/brightui.js"
  "modecheck|node scripts/audio-verify/modecheck.js"
  "batch1|node scripts/vocal-load-verify/batch1.js"
  "picker|env PK_BEFORE=master node scripts/vq-verify/picker.js"
  "warmup-entries|node scripts/warmup-verify/entries.js"
  "warmup-tracking|node scripts/warmup-verify/tracking.js"
  "levelup|node scripts/levelup-verify/levelup.js"
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
  $cmd > "$OUT/$name.log" 2>&1 & PID=$!
  while kill -0 $PID 2>/dev/null; do
    sleep 20
    idle=$(( ($(date +%s) - $(stat -f %m "$OUT/$name.log")) / 60 ))
    if [ $idle -ge $WATCHDOG ]; then pkill -P $PID 2>/dev/null; kill $PID 2>/dev/null
      echo "$(date -u +%H:%M:%S) $name killed: no output for $WATCHDOG min" >> "$OUT/progress.txt"; fi
  done
  wait $PID; rc=$?
  echo "$(date -u +%H:%M:%S) done  $name exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 30
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
