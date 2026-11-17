#!/bin/bash
# Release D (design/accuracy/RELEASE_D.md) CHECKS, one at a time under the run lock, each under its own time limit, on
# AC power only, against the LOCAL Supabase stack (VOX_BACKEND=local, scripts/localBackend.js: no request reaches
# production). Branch = accuracy/d's working copy; master = master's build in the same run.
# tuner, glider: master's build and the branch's (glider: the guard off is master's behaviour, in the same run).
# bleed: master's build, then the branch with the guard (its own measurement). voiceguard: the branch, gains 0–1.
# hygiene: master and the branch. scores, scores4b, scores6: master vs the branch (D4: a browser per run, the canceller
# off, both sides).
# Logs: scripts/survey-d/logs/checksD-<stamp>/. Usage: bash scripts/survey-d/checksD.sh [step …]   (no steps: all)
cd "$(dirname "$0")/../.."
[ -z "$VOXCOACH_RUN_LOCK" ] && exec node scripts/runguard.js run --name "checksD $*" --limit-min 0 -- bash "$PWD/scripts/survey-d/checksD.sh" "$@"
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/survey-d/logs/checksD-$STAMP; mkdir -p "$OUT"
export VOX_BACKEND=local NODE_OPTIONS="--require $PWD/scripts/localBackend.js"
STEPS=(
  "tuner-master|15|node scripts/survey-d/tuner.js --ref master --out $OUT/tuner-master.json"
  "tuner|15|node scripts/survey-d/tuner.js --out $OUT/tuner.json"
  "glider|60|node scripts/survey-d/glider.js --noises white,babble,talker,tv --snrs 20,10 --out $OUT/glider.json"
  "bleed-master|90|node scripts/survey-d/bleed.js --ref master --runs 2 --out $OUT/bleed-master.json"
  "bleed|90|node scripts/survey-d/bleed.js --guard-only --runs 2 --out $OUT/bleed.json"
  "voiceguard|40|node scripts/survey-d/voiceguard.js --runs 2"
  "hygiene-master|60|node scripts/survey-d/hygiene.js --ref master --runs 5 --out $OUT/hygiene-master.json"
  "hygiene|60|node scripts/survey-d/hygiene.js --runs 5 --out $OUT/hygiene.json"
  "scores|60|node scripts/design-verify/scores.js"
  "scores4b|80|node scripts/design-verify/scores.js --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode"
  "scores6|70|node scripts/design-verify/scores.js --tools pd,staykey,karaoke,emotion"
  "house|94|node scripts/design-verify/house.js --base master"
  "hooks|3|node scripts/design-verify/hooks.js --base master"
  "contrast|86|node scripts/design-verify/contrast.js"
  "copyscan|30|node scripts/design-verify/copyscan.js --all"
  "names|25|node scripts/design-verify/names.js"
  "focus|30|node scripts/design-verify/focus.js"
  "targets|15|node scripts/design-verify/targets.js"
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
