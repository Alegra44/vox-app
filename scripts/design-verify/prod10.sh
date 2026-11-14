#!/bin/bash
# PHASE10.md "Deploy" §3: the production checks after phase 10, the last phase, so the full run. One run at a time (the
# runner holds the runguard lock for all of it; each check under its run-limits.json limit), AC power only.
#   phase 9's: checkout, posters (DV_URL=the site); onboard, feedback, moments9 (--base the previous production master
#   --branch-ref the site)
#   phase 10's: rule1, targets, names, focus, motion (--ref the site), datelocale (DV_URL=the site)
#   then prod.sh WITH_CHOIR=1 SCORES_BASE=<the previous production master> (its own log dir, its own suite limits)
# Logs: scripts/design-verify/logs/prod10-<stamp>/. Usage: [ONLY="names focus"] [NO_PROD=1] [BASE=<ref>] bash prod10.sh
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prod10 $*${ONLY:+ ONLY=$ONLY}" --limit-min 0 -- bash "$PWD/scripts/design-verify/prod10.sh" "$@"
P=https://deploy-alegra1122.vercel.app/
BASE=${BASE:-$(git rev-parse --short HEAD^1)}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/prod10-$STAMP; mkdir -p "$OUT"
cmd(){ case $1 in
  checkout) echo "env DV_URL=$P node scripts/design-verify/checkout.js --out $OUT/checkout";;
  posters) echo "env DV_URL=$P node scripts/design-verify/posters.js --out $OUT/posters";;
  onboard) echo "node scripts/design-verify/onboard.js --base $BASE --branch-ref $P --out $OUT/onboard";;
  feedback) echo "node scripts/design-verify/feedback.js --base $BASE --branch-ref $P";;
  moments9) echo "node scripts/design-verify/moments9.js --base $BASE --branch-ref $P";;
  rule1|targets|names|focus|motion) echo "node scripts/design-verify/$1.js --ref $P --out $OUT/$1";;
  datelocale) echo "env DV_URL=$P node scripts/design-verify/datelocale.js";;
esac; }
LIST=${ONLY:-checkout onboard feedback posters moments9 rule1 targets names focus motion datelocale}
echo "prod10 on $(git rev-parse --short HEAD) vs $P (base $BASE)" > "$OUT/progress.txt"
for n in $LIST; do
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $n" >> "$OUT/progress.txt"; sleep 300; done
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $n" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name $n -- $(cmd $n) > "$OUT/$n.log" 2>&1; rc=$?
  echo "$(date -u +%H:%M:%S) done  $n exit $rc ($(( ($(date +%s)-t0)/60 )) min)$([ $rc = 124 ] && echo ' TIMED OUT: FAIL')" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) phase 9 and 10 checks done → $OUT" >> "$OUT/progress.txt"
if [ -z "$NO_PROD" ]; then
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before prod.sh" >> "$OUT/progress.txt"; sleep 300; done
  echo "$(date -u +%H:%M:%S) start prod.sh WITH_CHOIR=1 SCORES_BASE=$BASE" >> "$OUT/progress.txt"
  WITH_CHOIR=1 SCORES_BASE=$BASE bash scripts/design-verify/prod.sh; echo "$(date -u +%H:%M:%S) prod.sh exit $? (its log: $(ls -td scripts/design-verify/logs/prod-* | head -1))" >> "$OUT/progress.txt"
fi
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
