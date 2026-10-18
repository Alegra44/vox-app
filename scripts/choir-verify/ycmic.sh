#!/bin/bash
# Your Choir on the one stream: yc.js (real-mic take + the stacked-playback checks) RUNS times each on master and on
# this working tree, alternating, both on the production backend. The MICTAKE lines give each side's take level and
# gaps: the branch's level must sit within master's spread, with no gaps.
# Logs: scripts/choir-verify/logs/ycmic-<stamp>/{master,branch}-<n>.log
# Usage: [RUNS=3] [MASTER_WT=../voxcoach-master-wt] bash scripts/choir-verify/ycmic.sh
cd "$(dirname "$0")/../.."
RUNS=${RUNS:-3}; MWT=${MASTER_WT:-../voxcoach-master-wt}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/choir-verify/logs/ycmic-$STAMP; mkdir -p "$OUT"
git -C "$MWT" log --oneline -1 > "$OUT/master-ref.txt"
(cd deploy && exec python3 -m http.server 8765 >/dev/null 2>&1) & B=$!
(cd "$MWT/deploy" && exec python3 -m http.server 8767 >/dev/null 2>&1) & M=$!
trap 'kill $B $M 2>/dev/null' EXIT
sleep 1
for n in $(seq 1 "$RUNS"); do
  for side in master branch; do
    port=$([ $side = master ] && echo 8767 || echo 8765)
    node scripts/choir-verify/yc.js "http://localhost:$port/" > "$OUT/$side-$n.log" 2>&1; rc=$?
    echo "$side #$n exit $rc $(grep -h '^MICTAKE' "$OUT/$side-$n.log")" | tee -a "$OUT/summary.txt"
    sleep 30
  done
done
echo "log: $OUT"
