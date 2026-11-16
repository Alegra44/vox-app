#!/bin/bash
# Release C (design/day/DAY.md): the checks, one at a time under the run lock, each under its own time limit (about 2×
# its normal time), every one against the LOCAL Supabase stack (supabase start on Colima; HANDOFF "Local database"):
# VOX_BACKEND=local and scripts/localBackend.js preloaded, so the app's requests for the production project go to the
# local stack and testAccounts queries the local database. A step that can't reach the local stack fails; none can
# reach production. Logs: scripts/day-verify/logs/checksC-<stamp>/<step>.log, progress.txt (step, exit code, minutes).
# migration resets the local database to 0009, then applies 0010 (it runs first). PGLITE_DIR: a folder with
# @electric-sql/pglite@0.2.17 installed (migrations, persist). persist runs with TZ=UTC: it applies 0005 alone (the UTC
# rule) and its days are worked out by hand as UTC days; a device at UTC+0 has the same local days (day.js covers the rest).
# Usage: bash scripts/day-verify/checksC.sh [step …]   (no steps: all, in this order)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksC $*" --limit-min 0 -- bash "$PWD/scripts/day-verify/checksC.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/day-verify/logs/checksC-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js"
STEPS=(
  "migration|10|node scripts/day-verify/migration.js"
  "migrations|3|node scripts/backend-verify/migrations.js"
  "day|40|node scripts/day-verify/day.js"
  "verify|3|node scripts/vocal-load-verify/verify.js"
  "persist|3|env TZ=UTC node scripts/vocal-load-verify/persist.js"
  "outbox|12|node scripts/vocal-load-verify/outbox.js"
  "live|16|node scripts/vocal-load-verify/live.js"
  "pilot|20|node scripts/vocal-load-verify/pilot.js"
  "batch1|30|node scripts/vocal-load-verify/batch1.js"
  "batch2|40|node scripts/vocal-load-verify/batch2.js"
  "batch3a|40|node scripts/vocal-load-verify/batch3a.js"
  "batch3b|50|node scripts/vocal-load-verify/batch3b.js"
  "batch3c|20|node scripts/vocal-load-verify/batch3c.js"
  "allowlist|3|node scripts/backend-verify/allowlist.js"
  "progresssave|6|node scripts/backend-verify/progresssave.js"
  "erasecheck|4|node scripts/backend-verify/erasecheck.js"
  "home|20|node scripts/design-verify/home.js"
  "youstates|4|node scripts/design-verify/youstates.js"
  "warmup-entries|17|node scripts/warmup-verify/entries.js"
  "warmup-tracking|3|node scripts/warmup-verify/tracking.js"
  "house|94|node scripts/design-verify/house.js"
  "hooks|3|node scripts/design-verify/hooks.js --base master"
  "bootcheck|3|node scripts/design-verify/bootcheck.js"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  t0=$(date +%s); echo "$(date +%T) start $name" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  m=$(( ($(date +%s) - t0) / 60 ))
  [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $name $v ($m min)" >> "$OUT/progress.txt"
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
