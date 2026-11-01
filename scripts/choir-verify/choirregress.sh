#!/bin/bash
# Choir regress mode (PHASE5A.md 5a.1), the gate for phases 5, 6 and 10: every choir script on the base build (master) and on
# a branch's build in the same run, RUNS (3) per side, one script at a time; each run's printed measurements go to
# <out>/base|branch/<script>-<n>.json (harness.js, CV_JSON), then choircompare.js compares the medians (±2, or the base's
# own A/A range: aa-ranges.json, from the proof run of master against itself).
# Both builds are served locally (base :8766, branch :8767) against the production backend; each script signs up and
# deletes its own test account. Within a run the side that goes first alternates (base first on odd runs). AC power only:
# before each script the run waits while the Mac is on battery. Before each script Supabase must answer (5 tries, 60 s
# apart, else STOPPED). Each script has a limit of 3× its usual minutes (30 at most).
# Usage: [ONLY="cv-p9 cv-yc"] [RUNS=3] bash scripts/choir-verify/choirregress.sh <branch ref | working> [base ref, default master]
#        PROOF=1 bash scripts/choir-verify/choirregress.sh master   the A/A proof: writes scripts/choir-verify/aa-ranges.json
cd "$(dirname "$0")/../.."
BR=${1:?usage: choirregress.sh <branch ref | working> [base ref]}; BASE=${2:-master}; RUNS=${RUNS:-3}
STAMP=$(date -u +%Y-%m-%dT%H-%M-%S); OUT=scripts/choir-verify/logs/regress-$STAMP; mkdir -p "$OUT/base" "$OUT/branch"
SB=https://ccharikhpeqtzpobarxi.supabase.co
build() { [ "$1" = working ] && echo "$PWD/deploy" || node -e "console.log(require('./scripts/design-verify/common').buildDir(process.argv[1]))" "$1"; }
BDIR=$(build "$BASE"); RDIR=$(build "$BR")
echo "base $BASE ($(git rev-parse --short "$BASE")) → $BDIR | branch $BR ($([ "$BR" = working ] && echo working tree || git rev-parse --short "$BR")) → $RDIR" > "$OUT/progress.txt"
(cd "$BDIR" && exec python3 -m http.server 8766 >/dev/null 2>&1) & S1=$!
(cd "$RDIR" && exec python3 -m http.server 8767 >/dev/null 2>&1) & S2=$!
trap 'kill $S1 $S2 2>/dev/null' EXIT
sleep 2
# name|usual minutes|arguments before the url (the url is the build's)
SCRIPTS=(
  "desc|1|" "shot|1|" "verify|2|all" "fix|2|" "s6fr|1|" "live|1|" "live5|2|" "live6|2|" "live7|2|" "live9|2|" "modalz|1|"
  "p5|5|all" "p7|3|all" "p7signed|3|" "p8|6|all" "p9|10|" "p10|11|all" "paywall|1|" "peaks|4|" "timing|2|" "yc|7|"
)
reachable() { local c; c=$(curl -s -o /dev/null -m 10 -w '%{http_code}' "$SB/auth/v1/health"); [[ $c =~ ^[1-4][0-9][0-9]$ ]]; }
runone() { # side n name usual args
  local side=$1 n=$2 name=$3 usual=$4 args=$5 url limit t0 pid dog res rc
  [ "$side" = base ] && url=http://localhost:8766/ || url=http://localhost:8767/
  while pmset -g batt | head -1 | grep -q "Battery Power"; do echo "$(date -u +%H:%M:%S) on battery: waiting for AC before $name" >> "$OUT/progress.txt"; sleep 300; done
  local tries=0; while ! reachable; do tries=$((tries+1)); echo "$(date -u +%H:%M:%S) Supabase unreachable before $name, try $tries of 5" >> "$OUT/progress.txt"
    [ $tries -ge 5 ] && { echo "$(date -u +%H:%M:%S) STOPPED: Supabase unreachable 5 times" >> "$OUT/progress.txt"; exit 2; }; sleep 60; done
  limit=$(( usual * 3 )); [ $limit -gt 30 ] && limit=30
  t0=$(date +%s); echo "$(date -u +%H:%M:%S) start $side $name #$n" >> "$OUT/progress.txt"
  CV_JSON="$OUT/$side/$name-$n.json" node scripts/choir-verify/$name.js $args $url > "$OUT/$side/$name-$n.log" 2>&1 & pid=$!
  ( sleep $(( limit * 60 )); kill -0 $pid 2>/dev/null && touch "$OUT/.timedout" && kill -TERM $pid; sleep 15; kill -KILL $pid 2>/dev/null ) & dog=$!
  wait $pid; rc=$?; kill $dog 2>/dev/null; wait $dog 2>/dev/null
  if [ -f "$OUT/.timedout" ]; then rm -f "$OUT/.timedout"; res="timed out after $limit min"; else res="exit $rc"; fi
  echo "$(date -u +%H:%M:%S) done  $side $name #$n $res ($(( ($(date +%s)-t0)/60 )) min)" >> "$OUT/progress.txt"
  sleep 30
}
for n in $(seq 1 $RUNS); do
  for s in "${SCRIPTS[@]}"; do
    IFS='|' read -r name usual args <<< "$s"
    if [ -n "$ONLY" ]; then case " $ONLY " in *" $name "*|*" cv-$name "*) ;; *) continue;; esac; fi
    if [ $((n % 2)) = 1 ]; then runone base $n $name $usual "$args"; runone branch $n $name $usual "$args"
    else runone branch $n $name $usual "$args"; runone base $n $name $usual "$args"; fi
  done
done
echo "$(date -u +%H:%M:%S) ALL DONE" >> "$OUT/progress.txt"
if [ -n "$PROOF" ]; then node scripts/choir-verify/choircompare.js "$OUT" --write-aa scripts/choir-verify/aa-ranges.json
else node scripts/choir-verify/choircompare.js "$OUT" --aa scripts/choir-verify/aa-ranges.json; fi
