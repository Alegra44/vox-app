# House Lights phase 2 (Lighting): production screenshots

Screenshots only, no code. Taken on https://deploy-alegra1122.vercel.app after the phase 2 deploy
(dpl_CLqPg1gb25R563tBixH4WCXsUrNT, master 3b29e93), signed in with a throwaway account (deleted after).

- `sheets/states.jpg`: every singing state (rows) at 390, Light and Dark.
- `sheets/motion.jpg`: the Tuner at 390 Light, lights going down (start) and coming up (stop), 0–1300 ms after the click.
- `states/390-light|390-dark/<state>.jpg` and `motion/`: full size. `notes.txt` has the exact frame times.
- `checks/`: the production checks (prod.sh): house 111/0, system 7/7, contrast, batch1 112/0, batch3c 40/0,
  warm-up entries 52/0, listenwin 27/0, picker 93/0, glider-courses 50/0.
