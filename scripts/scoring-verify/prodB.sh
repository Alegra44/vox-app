#!/bin/bash
# Scoring batch release B on production (design/scoring/SCORING.md, "Release B review and deploy", PRODUCTION CHECKS):
# prod.sh with the choir group (WITH_CHOIR=1: house and bootcheck among its suites), then scores, scores4b and scores6
# (release A 3fff3b3 vs master, the live build), the speaker-delay sheet on the site (device.js: the measurement on
# two modelled devices and the onsets; shotsB.js: the sheet and the Profile row), an Expression score surviving a reload,
# the erase check (with expression_scores now), allowlist, one at a time under the run lock, each under its own limit, 60 s apart.
# Logs: scripts/scoring-verify/logs/prodB-<stamp>/ (prod.sh's own under scripts/design-verify/logs/prod-<stamp>/).
# Usage: bash scripts/scoring-verify/prodB.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prodB $*" --limit-min 0 -- bash "$PWD/scripts/scoring-verify/prodB.sh" "$@"
P=https://deploy-alegra1122.vercel.app/
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/scoring-verify/logs/prodB-$STAMP; mkdir -p "$OUT"
STEPS=(
  "device|30|env DV_URL=$P node scripts/scoring-verify/device.js --out $OUT/device.json"
  "exprtrip|4|env DV_URL=$P node scripts/backend-verify/exprtrip.js"
  "erasecheck|4|env DV_URL=$P node scripts/backend-verify/erasecheck.js"
  "allowlist|3|env DV_URL=$P node scripts/backend-verify/allowlist.js"
  "prod|900|env WITH_CHOIR=1 bash scripts/design-verify/prod.sh"
  "scores|36|node scripts/design-verify/scores.js --base 3fff3b3"
  "scores4b|44|node scripts/design-verify/scores.js --base 3fff3b3 --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode"
  "scores6|40|node scripts/design-verify/scores.js --base 3fff3b3 --tools pd,staykey,karaoke,emotion"
  "shotsB|40|env DV_URL=$P node scripts/scoring-verify/shotsB.js --out $OUT/shots"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  t0=$(date +%s); echo "$(date +%T) start $name" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  # prod.sh exits 0 whatever its steps did: its own progress.txt says which failed (a "done" line not "exit 0")
  if [ $name = prod ] && [ $code = 0 ]; then
    pp=$(ls -td scripts/design-verify/logs/prod-* | head -1)/progress.txt
    bad=$(grep ' done ' "$pp" | grep -v ' exit 0 ' | awk '{print $3}' | tr '\n' ' ')
    [ -n "$bad" ] && code=1 && echo "$(date +%T) prod.sh steps failed: $bad(rerun each; $pp)" >> "$OUT/progress.txt"
  fi
  [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $name $v ($(( ($(date +%s) - t0) / 60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
