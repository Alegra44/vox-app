#!/bin/bash
# Phase 6 checks (PHASE6.md §3), one at a time on the working build (redesign/phase6), AC power only (waits while on
# battery). Each check's output goes to <out>/<name>.log; <out>/progress.txt has a line per start and end with its exit.
# Usage: bash scripts/design-verify/checks6.sh <set>   sets: all | <name,name…>
#   all  hooks scores6 house stopcheck modecheck batch1 batch2 batch3a batch3b (each also on master, served on :8766, for
#        vocal load = master ±2) warmup-entries warmup-tracking vibfix noisegate (regress) vlcompare yc contrast copyscan
#        navcheck picker levelup home, then scores (4a) and scores4b (the other tools' scores, unchanged by the shared code)
cd "$(dirname "$0")/../.."
SET=${1:?usage: checks6.sh all|name,name}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/checks6-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  hooks) echo "node scripts/design-verify/hooks.js --base master";;
  scores6) echo "node scripts/design-verify/scores.js --tools pd,staykey,karaoke,emotion --stims steady,lead";;
  scores) echo "node scripts/design-verify/scores.js";;
  scores4b) echo "node scripts/design-verify/scores.js --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode";;
  house) echo "node scripts/design-verify/house.js";;
  stopcheck) echo "node scripts/design-verify/stopcheck.js";;
  modecheck) echo "node scripts/audio-verify/modecheck.js";;
  batch1|batch2|batch3a|batch3b) echo "node scripts/vocal-load-verify/$1.js";;
  batch1-master|batch2-master|batch3a-master|batch3b-master) echo "node scripts/vocal-load-verify/${1%-master}.js $M";;
  warmup-entries) echo "node scripts/warmup-verify/entries.js";;
  warmup-tracking) echo "node scripts/warmup-verify/tracking.js";;
  vibfix) echo "env VF_MODE=regress node scripts/vq-verify/vibfix.js";;
  noisegate) echo "env NG_MODE=regress node scripts/vq-verify/noisegate.js";;
  vlcompare) echo "node scripts/audio-verify/vlcompare.js";;
  yc) echo "node scripts/choir-verify/yc.js";;
  contrast) echo "node scripts/design-verify/contrast.js --set 6 --json $OUT/contrast.json";;
  copyscan) echo "node scripts/design-verify/copyscan.js --tools --set 6";;
  navcheck) echo "node scripts/design-verify/navcheck.js";;
  picker) echo "env PK_BEFORE=master node scripts/vq-verify/picker.js";;
  levelup) echo "node scripts/levelup-verify/levelup.js";;
  home) echo "node scripts/design-verify/home.js --base master";;
  *) echo "false";;
esac; }
case $SET in
  all) LIST="hooks scores6 house stopcheck modecheck batch1 batch1-master batch2 batch2-master batch3a batch3a-master batch3b batch3b-master warmup-entries warmup-tracking vibfix noisegate vlcompare yc contrast copyscan navcheck picker levelup home scores scores4b";;
  *) LIST=${SET//,/ };;
esac
case " $LIST " in *-master*) # master's build on :8766 for the *-master checks
  MDIR=$(node -e "console.log(require('./scripts/design-verify/common').buildDir('master'))"); M=http://localhost:8766/
  (cd "$MDIR" && exec python3 -m http.server 8766 >/dev/null 2>&1) & MS=$!; trap 'kill $MS 2>/dev/null' EXIT; sleep 2;;
esac
echo "checks6 $SET on $(git rev-parse --short HEAD)$(git diff --quiet || echo ' + working changes')" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 20
done
echo "$(date -u +%H:%M:%S) ALL DONE → $OUT" >> "$OUT/progress.txt"
echo "$OUT"
