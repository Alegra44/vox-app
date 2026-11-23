#!/bin/bash
# Release G (design/accuracy/RELEASE_G.md) CHECKS, one at a time under the run lock, each under its own time limit, on AC
# power only, against the LOCAL Supabase stack (VOX_BACKEND=local, scripts/localBackend.js: no request reaches
# production). Branch = accuracy/g's working copy; master = master's build in the same run.
#   octave              octave.js on the branch: the windows lost to octave slips with and without the hold (the gate),
#                       the leaps, clean takes, and the other tools that drop frames the same way (measure only)
#   scores, scores4b    master vs the branch (scores.js: its own ±2 / master-range gates)
#   gamestates          the five Vocal World games, master vs the branch (Pitch Dragon and the Rift among them)
#   hooks, bootcheck    nothing removed by accident; the page loads in every startup state
# Logs: scripts/accuracy-g/logs/checksG-<stamp>/. Usage: bash scripts/accuracy-g/checksG.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksG $*" --limit-min 0 -- bash "$PWD/scripts/accuracy-g/checksG.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/accuracy-g/logs/checksG-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js"
STEPS=(
  "octave|40|node scripts/accuracy-g/octave.js --out $OUT/octave.json"
  "scores|60|node scripts/design-verify/scores.js"
  "scores4b|80|node scripts/design-verify/scores.js --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode"
  "gamestates|40|node scripts/design-verify/gamestates.js"
  "hooks|10|node scripts/design-verify/hooks.js"
  "bootcheck|6|node scripts/design-verify/bootcheck.js"
)
want=" $* "
for s in "${STEPS[@]}"; do
  IFS='|' read -r name mins cmd <<< "$s"
  [ -n "$*" ] && [[ "$want" != *" $name "* ]] && continue
  while pmset -g batt | grep -q "Battery Power"; do echo "$(date +%T) on battery: waiting" >> "$OUT/progress.txt"; sleep 60; done
  t0=$(date +%s); echo "$(date +%T) start $name" >> "$OUT/progress.txt"
  node scripts/runguard.js run --name "$name" --limit-min "$mins" -- bash -c "$cmd" > "$OUT/$name.log" 2>&1; code=$?
  [ $code = 0 ] && v=PASS || v="FAIL (exit $code)"
  echo "$(date +%T) done  $name $v ($(( ($(date +%s) - t0) / 60 )) min)" >> "$OUT/progress.txt"
done
echo "$(date +%T) ALL DONE" >> "$OUT/progress.txt"
echo "$OUT"
