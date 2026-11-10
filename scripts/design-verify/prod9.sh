#!/bin/bash
# PHASE9.md "Deploy" §3: phase 9's own checks on production, one at a time, AC power only (waits while on battery).
#   checkout, posters  DV_URL=the site
#   onboard, feedback, moments9  --base <the previous production master> (phase 8, 27eab03) --branch-ref the site
# Then prod.sh WITH_CHOIR=1 (its own log dir). Logs: scripts/design-verify/logs/prod9-<stamp>/.
# Usage: [ONLY="feedback moments9"] [NO_PROD=1] bash scripts/design-verify/prod9.sh
cd "$(dirname "$0")/../.."
P=https://deploy-alegra1122.vercel.app/
BASE=${BASE:-27eab03}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/prod9-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  checkout) echo "env DV_URL=$P node scripts/design-verify/checkout.js --out $OUT/checkout";;
  posters) echo "env DV_URL=$P node scripts/design-verify/posters.js --out $OUT/posters";;
  onboard) echo "node scripts/design-verify/onboard.js --base $BASE --branch-ref $P --out $OUT/onboard";;
  feedback) echo "node scripts/design-verify/feedback.js --base $BASE --branch-ref $P";;
  moments9) echo "node scripts/design-verify/moments9.js --base $BASE --branch-ref $P";;
esac; }
LIST=${ONLY:-checkout onboard feedback posters moments9}
echo "prod9 on $(git rev-parse --short HEAD) vs $P (base $BASE)" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) phase 9 checks done → $OUT" >> "$OUT/progress.txt"
if [ -z "$NO_PROD" ]; then
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before prod.sh" >> "$OUT/progress.txt"; sleep 300; done
  echo "$(date -u +%H:%M:%S) start prod.sh WITH_CHOIR=1 SCORES_BASE=$BASE" >> "$OUT/progress.txt"
  WITH_CHOIR=1 SCORES_BASE=$BASE bash scripts/design-verify/prod.sh; echo "$(date -u +%H:%M:%S) prod.sh exit $? (logs: $(ls -td scripts/design-verify/logs/prod-* | head -1))" >> "$OUT/progress.txt"
fi
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
