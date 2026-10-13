# House Lights phase 3 (Home and the Coach tab): production screenshots

Screenshots only, no code. Taken on production (https://deploy-alegra1122.vercel.app, dpl_CAMGry4a7b8RewSA6bJNST64PVv7,
master 7996514) after the phase 3 deploy, 2026-10-13.

- `home/390-<theme>/<row>.jpg`: the viewport; `home/390-<theme>-full/<row>.jpg`: the full page. Rows: Home in the 7
  seeded states (new, priority, weakest, struggling, today, expired, signedout; `scripts/design-verify/homeStates.js`,
  set in the page's memory on a throwaway account, nothing saved), then the Coach tab signed in and signed out.
- `sheets/home.jpg`: every row, full page, Light and Dark.
- In the full-page shots the tab bar sits mid-page: it is fixed to the viewport, and the capture keeps it where the
  viewport ends.

Production checks: `scripts/design-verify/logs/prod-2026-10-13T08-23-21/` on master.
