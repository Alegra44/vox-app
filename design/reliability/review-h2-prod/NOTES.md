# Release H2 on production (2026-11-24/25)

Deployed: **dpl_A5EJRUAnPUdykqW7nckBa8957xx3** (deploy-d6ivu1hun-alegra1122.vercel.app), master fee7bcf (save/h2 merged
--no-ff). deploy-alegra1122.vercel.app serves it: `vercel inspect` shows that dpl id, and its index.html and
vocal-load-store.js match master's deploy/ byte for byte. F's deployment, for comparisons:
https://deploy-d36t8mpvs-alegra1122.vercel.app (dpl_Ca1xNVr4JqZpFLi5xTqyYcUmZK5h).

## First run (prodH.sh, 17:33–21:53 UTC)

| check | result |
|---|---|
| core (prod.sh): bootcheck, house, system, contrast, batch1, warmup-entries, warmup-tracking, levelup, listenwin, picker, glider-courses, states/home/tools shots, shots, modecheck, scores, scores4b, live, youstates, navcheck, livevq | pass |
| core: batch3c | **fail**: the seed SQL refused (below) |
| core: pageload | **fail**: the first sign-up's `GET /me` answered 404 (profile never set) |
| core: stopcheck | **fail**: sign-up not ready in 30 s |
| outoforder | **fail**: sign-up not ready in 30 s |
| progresssave, outbox, roundtrip, streak | pass |

## Reruns: the site (H2) and F's deployment alternating, same run

`prodH2-rerun-2026-11-24T21-54-15/`: batch3c fails the same on H2 and F (3 passed, 1 failed: the seed insert). Its
pageload, stopcheck and outoforder lines don't count: my rerun script's URL placeholder also replaced the `URL` in
`DV_URL`/`PL_URL` (outoforder got no URL; pageload ran on the site both times), and stopcheck's 10-minute limit was
under its usual 18 minutes.

`prodH2-rerun-2026-11-24T22-26-58/` (placeholder fixed, stopcheck 30 min; batch3c with the seed fix):

| check | H2 (the site) | F |
|---|---|---|
| batch3c | 40 passed, 0 failed | page not ready in 20 s, before any check (0/1) |
| outoforder | PASS 22/22 | 11 passed, 11 failed (F has no save numbering: expected) |
| pageload (10 loads) | pass | pass |
| stopcheck | all passed | all passed |

Every failure passed on the rerun on the site: no rollback.

## batch3c: the cause (test-only)

The seed rows went in with the local day (my pre-deploy fix, b344458) but no `tz_offset_min`. Without an offset,
0010's day CHECK (`vls_day_is_start_date`) wants the UTC date of `started_at`, so from local midnight to UTC midnight
(00:00–05:30 IST, where this ran) the insert is refused. The H2 local runs fell in daytime, when the two dates agree.
Fix (this branch, scripts/vocal-load-verify/batch3c.js): the seed sends `tz_offset_min` = the device's offset, as the
app does. 40/40 on the site at 22:30 UTC (04:00 IST), inside the window.

## Sign-up

Four sign-ups timed out or got `/me` 404 tonight (pageload, stopcheck, outoforder, F's batch3c). The same pageload
404 is in earlier production logs, F's included (2026-11-23, 11-14, 11-08). H2 doesn't change sign-up or `/me`.
Every one passed on a rerun.

Test accounts: every script deletes its own; `auth.users` has 0 `voxcoach-%@example.com` left.
