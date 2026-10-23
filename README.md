# Phase 4a in production: screenshots

House Lights phase 4a (the 14 Coach tools on the take stage and result, with fix rounds 4a.1–4a.3), merged into master at
296d530 and live as **dpl_FCwcfBpeCmDP6mZ9AyK3A8cftDdg** since 2026-10-22. Rollback target was dpl_6FBgCU661see6RBdPhXoMniCp42s
(not used). Taken on https://deploy-alegra1122.vercel.app/ at 390 px, Light and Dark, signed in as a throwaway account
(deleted afterwards), the fake mic singing a steady A4.

- `shots/sheets/tools.jpg`: the 14 tools, idle, on stage and with their result.
- `shots/sheets/`: Home, Coach (train), Songs, World, You, the singing states and the house-lights motion.
- `states/`: the singing states and motion (`states/sheets/`).
- `home/`: Home in the 7 seeded states and the Coach tab (`home/sheets/`).

Production checks (`scripts/design-verify/prod.sh`, logs `prod-2026-10-23T07-03-38`): house 351/0, system 7/7, batch1
112/0, batch3c 40/0, warm-up entries 52/0 and tracking 27/0, levelup 45/0, cv-live7, cv-modalz, cv-p9, cv-p10 (MATCH),
listenwin 27/0, picker 93/0, glider-courses 50/0, pageload, modecheck and stopcheck all passed, scores.js (master before
4a served locally vs production, 3 runs) every median within ±2. Contrast: dark 0 of 4,165; light after the transition
fix in contrast.js 0 below 3:1 and the same 32 choir / part-rehearsal rows between 3 and 4.5 as before 4a.
