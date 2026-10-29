#!/bin/bash
# Phase 1, section F: the checks on production after the deploy, one at a time, paced (60 s between suites; Vercel
# challenges ~35 headless sessions in ~10 min). Test accounts are deleted by each script (track()).
# Logs: scripts/design-verify/logs/prod-<stamp>/; production shots go to <scratchpad or tmp>/voxcoach-shots-prod.
# Usage: [ONLY="house contrast …"] bash scripts/design-verify/prod.sh [shots out dir]   (phase 2 added house, batch3c,
#   listenwin, picker and states-shots: the singing states and the motion at 390, Light and Dark; phase 3 added cv-p9,
#   cv-p10 and home-shots: Home in the 7 seeded states and the Coach tab at 390, Light and Dark; phase 4a added
#   modecheck, scores (the previous production master served locally vs the site, SCORES_BASE, default the first parent
#   of the last merge) and stopcheck, and made the run survive a dropped connection:
#   - before each suite the site and Supabase must answer (one request each, 10 s; a 5xx or no answer fails): on a failure
#     wait 60 s and retry, up to 5 times; still failing → the run stops with "STOPPED: … unreachable" in progress.txt
#   phase 4b added scores4b (the 4b take tools), live (Register Coach, Live Feedback, Resonance, SCORES_BASE vs the
#   site), navcheck, livevq and tools-shots (the 4b tools at 390 and 1280, Light and Dark)
#   - each suite has a limit of 3× its usual minutes (the number after its name), 30 min at most; one that hits it is
#     stopped and logged "timed out", and the run carries on)
cd "$(dirname "$0")/../.."
P=https://deploy-alegra1122.vercel.app/
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/design-verify/logs/prod-$STAMP; mkdir -p "$OUT"
SHOTS=${1:-${TMPDIR:-/tmp}/voxcoach-shots-prod}
SB=https://ccharikhpeqtzpobarxi.supabase.co
SCORES_BASE=${SCORES_BASE:-$(git log --merges -1 --format=%P | cut -d' ' -f1)}
SUITES=(
  "house|14|env DV_URL=$P node scripts/design-verify/house.js"
  "system|1|env DV_URL=$P node scripts/design-verify/system.js"
  "contrast|10|env DV_URL=$P node scripts/design-verify/contrast.js --json $OUT/contrast-prod.json"
  "batch1|16|node scripts/vocal-load-verify/batch1.js $P"
  "batch3c|4|node scripts/vocal-load-verify/batch3c.js $P"
  "warmup-entries|17|node scripts/warmup-verify/entries.js $P"
  "warmup-tracking|3|node scripts/warmup-verify/tracking.js $P"
  "levelup|1|node scripts/levelup-verify/levelup.js $P"
  "cv-live7|2|node scripts/choir-verify/live7.js $P"
  "cv-modalz|1|node scripts/choir-verify/modalz.js $P"
  "cv-p9|9|node scripts/choir-verify/p9.js $P"
  "cv-p10|11|node scripts/choir-verify/p10.js all $P"
  "listenwin|2|env LW_URL=$P node scripts/vq-verify/listenwin.js"
  "picker|2|env PK_URL=$P node scripts/vq-verify/picker.js"
  "glider-courses|5|node scripts/glider-verify/courses.js $P"
  "pageload|5|env PL_LOADS=10 node scripts/vq-verify/pageload.js"
  "states-shots|3|env DV_URL=$P node scripts/design-verify/shots.js --states-only --sizes 390 --out $SHOTS-states"
  "home-shots|2|env DV_URL=$P node scripts/design-verify/shots.js --home-only --sizes 390 --out $SHOTS-home"
  "shots|10|env DV_URL=$P node scripts/design-verify/shots.js --panels home,train-hub,songs-hub,arcade,you-hub --sizes 390 --no-extras --out $SHOTS"
  "modecheck|3|env MC_URL=$P node scripts/audio-verify/modecheck.js"
  "scores|17|node scripts/design-verify/scores.js --base $SCORES_BASE --branch-url $P"
  "stopcheck|7|env DV_URL=$P node scripts/design-verify/stopcheck.js"
  "scores4b|22|node scripts/design-verify/scores.js --base $SCORES_BASE --branch-url $P --tools onetake,mirror,rhythm,registerdrills,vibrato,voicequality,emotionmode"
  "live|7|node scripts/design-verify/live.js --base $SCORES_BASE --branch-url $P --runs 3 --at 4100,5100,7100"
  "navcheck|2|env DV_URL=$P node scripts/design-verify/navcheck.js"
  "livevq|3|node scripts/vq-verify/livevq.js $P"
  "tools-shots|20|env DV_URL=$P node scripts/design-verify/shots.js --tools-only --set 4b --out $SHOTS-tools"
)
reachable() { local u c; for u in "$P" "$SB/auth/v1/health"; do
  c=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$u"); [[ $c =~ ^[1-4][0-9][0-9]$ ]] || { echo "$u → ${c:-no answer}"; return 1; }; done; }
for s in "${SUITES[@]}"; do
  name=${s%%|*}; rest=${s#*|}; usual=${rest%%|*}; cmd=${rest#*|}
  if [ -n "$ONLY" ]; then case " $ONLY " in *" $name "*) ;; *) continue;; esac; fi
  tries=0; while ! why=$(reachable); do
    tries=$((tries+1)); echo "$(date -u +%H:%M:%S) unreachable before $name ($why), try $tries of 5" >> "$OUT/progress.txt"
    if [ $tries -ge 5 ]; then echo "$(date -u +%H:%M:%S) STOPPED: the site or Supabase unreachable 5 times before $name" >> "$OUT/progress.txt"; exit 2; fi
    sleep 60; done
  limit=$(( usual * 3 )); [ $limit -gt 30 ] && limit=30
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $name (limit $limit min)" >> "$OUT/progress.txt"
  $cmd > "$OUT/$name.log" 2>&1 & pid=$!
  ( sleep $(( limit * 60 )); kill -0 $pid 2>/dev/null && touch "$OUT/.timedout-$name" && kill -TERM $pid; sleep 10; kill -KILL $pid 2>/dev/null ) & dog=$!
  wait $pid; rc=$?; kill $dog 2>/dev/null; wait $dog 2>/dev/null
  if [ -f "$OUT/.timedout-$name" ]; then rm -f "$OUT/.timedout-$name"; res="timed out after $limit min"; else res="exit $rc"; fi
  echo "$(date -u +%H:%M:%S) done  $name $res ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 60
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
