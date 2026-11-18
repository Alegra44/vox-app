# Release D on production (dpl_HNBqZiW6idUPUjFccqbhvLnX8hsm, 2026-11-18)

master dc64605 (the --no-ff merge of accuracy/d); https://deploy-alegra1122.vercel.app serves it, byte-identical to
master's deploy/index.html. Run by scripts/survey-d/prodD.sh: prod.sh's core run, then scores6 (5 runs a side); scores
compared against a0fb7aa (release C's master) served locally.

- prod-2026-11-18T11-15-07/: every core suite exit 0 (house 1051/0, system 7/0, batch1 112/0; scores, scores4b, live
  within every gate) except livevq, exit 1 at sign-in ("JWT issued at future": the auth server's clock against the
  token's, before any app code ran); re-run alone: exit 0 (livevq-rerun.log).
- prodD-2026-11-18T11-15-07/scores6.log: every gated value within its gate.
- Test accounts: every script deleted its own; all 23 cleanup lines "0 left".
