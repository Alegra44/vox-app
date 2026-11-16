# Release C: the UTC day

The review message, verbatim:

```
The UTC day, release C. Branch day/local from master. Save this message as design/day/DAY.md and commit it first. AC power, the run lock and time limits on. Rollback target: dpl_7n6H9JiTjJzz71wWpw948MUMD4a5. This release changes a rule on a live table, so the typed "deploy" gate is back: no deploy step runs until I type "deploy" after my review.

Build the plan in design/scoring/SCORING_SURVEY.md R3, with these decisions:
1. One function, localDayOf(ms): the device's local date (YYYY-MM-DD). todayStr(), last14Days(), VocalLoadStore.dayOf and every other place that makes a day from a time use it. List every use in DAY.md with what it's for, and grep that no UTC-sliced day (toISOString().slice(0,10) and the like) is left.
2. Vocal-load payloads carry tzOffsetMin (minutes east of UTC at the session's start). Migration 0010: tz_offset_min smallint with a CHECK of −720…+840, and the day CHECK becomes: when tz_offset_min is present, day = ((started_at + tz_offset_min minutes) at time zone 'UTC')::date; when it's null, the old UTC rule (old rows and old clients). Pruning gets one more day of slack. The api Edge Function accepts tzOffsetMin (allow-list, and the allowlist check).
3. progress.dayBasis = 'local', set at the first save after the switch, once per account. The switch-day rules exactly as R3 sets them out: the streak is kept (a gap of −1 or 0 against a UTC-era date counts as today or yesterday); history keys stay as they are; on the first local day the vocal-load gauge reads both keys.
4. Travel and clock changes: the day follows the device's current time zone, and a session keeps the offset it started with. No merging of days across a zone change; say so in DAY.md.
5. HANDOFF's release note: "Your day now ends at your midnight. On the day of the switch, one day of history may show twice or not at all; no streak is lost."

CHECKS
- day.js (new): Playwright timezoneId at UTC−8, UTC+5:30 and UTC+14, each across its own midnight and across UTC midnight: todayStr, a streak carried over the switch, history keys, the Journey day, the trial day count, One Take and the warm-up once a day, and a vocal-load session saved before and after midnight landing on the right day on the server.
- Everything that touches a database runs against a local Supabase (supabase start) or a throwaway project, never production before the deploy. If neither is possible on this Mac, report and stop.
- The migration on a copy of the production schema: old rows (null offset) still valid, new rows checked, a forged offset (day not matching started_at plus the offset) refused.
- The vocal-load suite with the outbox, allowlist, progresssave, home, youstates, warmup-verify, house, hooks, bootcheck.
Secret check, push day/local. REPORT, then stop.
```
