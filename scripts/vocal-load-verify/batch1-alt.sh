#!/bin/bash
# 4b.1 §3b (PHASE4B.md): batch1 N times on master and N on the branch, alternating (master first), each with the
# vocal-load trace (vltrace.js) saved per run. Both sides served the same way, from git: master on :8766, the branch's
# HEAD at the start on :8767 (so deploy/ can change while it runs). AC power only (waits on battery).
# Usage: bash scripts/vocal-load-verify/batch1-alt.sh [N=5] [sides="master branch"]
cd "$(dirname "$0")/../.."
N=${1:-5}; SIDES=${2:-master branch}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/vocal-load-verify/logs/batch1-alt-$STAMP; mkdir -p "$OUT"
MDIR=$(node -e "console.log(require('./scripts/design-verify/common').buildDir('master'))")
BREF=$(git rev-parse --short HEAD); BDIR=$(node -e "console.log(require('./scripts/design-verify/common').buildDir('$BREF'))")
(cd "$MDIR" && exec python3 -m http.server 8766 >/dev/null 2>&1) & MSRV=$!
(cd "$BDIR" && exec python3 -m http.server 8767 >/dev/null 2>&1) & BSRV=$!
trap 'kill $MSRV $BSRV 2>/dev/null' EXIT
echo "master $(git rev-parse --short master) · branch $BREF" > "$OUT/progress.txt"
for i in $(seq 1 "$N"); do for side in $SIDES; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting before $side #$i" >> "$OUT/progress.txt"; sleep 300; done
  url=http://localhost:8767/; [ "$side" = master ] && url=http://localhost:8766/
  VLB_TRACE="$OUT/$side-$i.trace.json" node scripts/vocal-load-verify/batch1.js $url > "$OUT/$side-$i.log" 2>&1
  echo "$(date -u +%H:%M:%S) $side #$i exit $? · $(grep -E '^[0-9]+ passed' "$OUT/$side-$i.log" | tail -1)" >> "$OUT/progress.txt"
  sleep 20
done; done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
