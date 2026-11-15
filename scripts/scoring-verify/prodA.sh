#!/bin/bash
# Scoring batch release A on production (design/scoring/SCORING.md, "Release A deploy, release B build", 3):
# prod.sh's core suites (no choir group), then the vocal-load suite with the outbox cases, progresssave, allowlist and the
# end-to-end outbox case against the site, one at a time under the run lock, each under its own limit, 60 s apart.
# Logs: scripts/scoring-verify/logs/prodA-<stamp>/ (prod.sh's own under scripts/design-verify/logs/prod-<stamp>/).
# Usage: bash scripts/scoring-verify/prodA.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "prodA $*" --limit-min 0 -- bash "$PWD/scripts/scoring-verify/prodA.sh" "$@"
P=https://deploy-alegra1122.vercel.app/
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/scoring-verify/logs/prodA-$STAMP; mkdir -p "$OUT"
STEPS=(
  "prod|420|bash scripts/design-verify/prod.sh"
  "outbox|12|env DV_URL=$P node scripts/vocal-load-verify/outbox.js"
  "vl-engine|3|node scripts/vocal-load-verify/verify.js"
  "vl-persist|3|node scripts/vocal-load-verify/persist.js"
  "batch2|26|node scripts/vocal-load-verify/batch2.js $P"
  "batch3a|32|node scripts/vocal-load-verify/batch3a.js $P"
  "batch3b|40|node scripts/vocal-load-verify/batch3b.js $P"
  "progresssave|6|env DV_URL=$P node scripts/backend-verify/progresssave.js"
  "allowlist|3|env DV_URL=$P node scripts/backend-verify/allowlist.js"
  "prodE2E|6|node scripts/scoring-verify/prodE2E.js $P"
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
