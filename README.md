# Phase 10 on production

dpl_2g7Gq6fiY782p75a2tmokH2dJFLF, served at https://deploy-alegra1122.vercel.app (page sha256 a5e6bf0d77d22047…, the same
as master 3309686's deploy/index.html). Rollback target before it: dpl_9GFdNrb4LQJNRjfvtKfcdKUsPY5H.

- `prod10-2026-11-14T10-29-41`: phase 9's checks (checkout, onboard, feedback, posters, moments9) and phase 10's
  (rule1, targets, names, focus, motion, datelocale) against the site; then prod.sh WITH_CHOIR=1 SCORES_BASE=63a348a
  (`prod-2026-11-14T11-19-33`). All pass except:
  - moments9 and youstates: only B8's durations differ from the previous production ("15s" → "15 s", "12.4s" → "12.4 s").
  - names: names.js read the page with `git show <ref>`, which can't take a URL; it fetches the site now. Rerun: PASS.
  - system: its reduced-motion check counted any transition over 0 ms; B7's global rule makes them 0.01 ms (as
    specified). It counts over 0.01 ms now, as motion.js does. Rerun: 7/7.
  - pageload and tools-shots: sign-up timed out on Supabase. One sign-up through the page by script, three times:
    4.3 s, 2.7 s, 2.2 s, so the site's sign-up works. Reruns: pass.
- `prod-2026-11-14T17-06-47` and `prod10-2026-11-14T17-24-24`: those four reruns.
- Test accounts: 0 left. Feedback rows from test addresses: 0 (feedback.js deletes the one it sends).
