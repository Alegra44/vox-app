Phase 6 production: approved, no rollback. Rollback target from now on: dpl_6EgEe6idPGDet91hDsVkkwc2YGXx.

1. prod.sh: raise the time limits for house and contrast to fit the six phase 6 tools (measure their usual times and use 1.5×, capped at 75 min). Test scripts only. Commit on master, push.
2. Start phase 7 on a new branch redesign/phase7 from master.
   a) First commit, the tuner fix (approved): when the voice leaves the lock, the note, octave and cents text change colour together with the lock fill's 120 ms fade instead of switching at once, so the text never sits on the fading blue in its normal colour. contrast.js on the Tuner in Light and Dark must show 0 below 3:1 across 10 runs of the drift-off moment. This goes out with phase 7.
   b) Then the read-only phase 7 survey, as in PHASE6.md's last step: the You hub, Journey, Dashboard, Records, Vocal Passport, Voice Health, Profile and settings, and where Choir World runs could feed the Skill Profile (describe the options, change nothing). Include Profile's achievement icon (3.38:1 in Dark, flagged since phase 5). Before-screenshots on review/phase7-before with a contact sheet. Push both, report, stop.
