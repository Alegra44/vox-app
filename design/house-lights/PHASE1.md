Redesign phase 1: Foundation. Work on a branch and don't deploy. I review the screenshots and the diff before anything ships.

0. SETUP
- git checkout master && git pull, then git checkout -b redesign/phase1
- Save this whole message as design/house-lights/PHASE1.md and commit it first ("Phase 1 spec"), before any code.
- Read design/house-lights/HOUSE_LIGHTS.md v1.1 (§3, §6, §8, and the protected hooks and strings in §9). Keep house-lights.html open for reference.

1. GUARDS FIRST. Commit these before touching the app, and run each on master for a baseline.
a) scripts/design-verify/hooks.js. A static comparison of master (git show master:deploy/index.html) against the working copy. It checks:
   - Every id, data-i18n, data-panel, data-shell and data-enter-panel value in master still exists.
   - Every protected class and English protected string in §9 still occurs.
   - Every TRANSLATIONS key exists in en, es, fr and tr.
   - The block between /* ===== HOUSE LIGHTS v1.2 BEGIN */ and /* ===== HOUSE LIGHTS v1.2 END */ in index.html equals design/house-lights/house-lights.css byte for byte.
   - The legacy variables --bg --surface --surface-raised --hairline --cream --muted --brass --brass-dim --teal --coral are still defined (choir-verify/fix.js reads them).
   - Zero font-name matches for Fraunces, Space Mono / Space+Mono, or Inter used as a family name (quoted or unquoted, e.g. "font:600 11px Inter,sans-serif"; don't match words like Interval).
   - Zero emoji in the header and tab-bar markup, and in renderAccountBar and updateShellTopbar.
   - Zero hex, rgb or rgba colour literals, outside these exemptions:
     · the House Lights block;
     · canvas drawing code (exempt by function: gliderLoop, bridgeLoop, the warm-up canvas, drawResonanceFrame, renderVoiceCard, arcade games);
     · the voice ambient glow (tickVoiceAmbient, phase 2);
     · rgba(0,0,0,…) shadows and backdrops;
     · the theme-color meta tags.
   - Allowed removals are listed in the script with a reason. Expected: only the four old theme swatches' uses of the theme_default, theme_cyberpunk, theme_aurora and theme_velvetopera keys (the keys stay in TRANSLATIONS). Anything else missing is a fail.
b) scripts/design-verify/contrast.js. Runs on the local build with a fresh signed-in test account (track(), deleted at exit) at 390x844, on all 46 panels, in Light and in Dark.
   - For each visible element with its own text: WCAG contrast of its colour against the effective background. Walk up the ancestors, compositing alpha. For a gradient, use its worst colour stop. Only an image counts as "unknown".
   - Thresholds: 4.5:1, or 3:1 for text ≥24px, or ≥18.66px and bold.
   - Output: JSON, plus a per-panel table of fails under 3, fails between 3 and 4.5, and unknown.
   - Baseline: master in Dark only (master has no Light theme).
c) scripts/design-verify/shots.js: screenshots, described in section 4.

2. BUILD. One commit per item, in this order.

2.1 House Lights v1.2. Design files first, then the app.
- Font sizes onto the ten-size scale, using the --hl-t-* variables rather than px:
  .hl-btn 15→16 (t-body), .hl-chip 13→14 (t-small), .hl-item-meta 13.5→14, .hl-stat-value 22→24 (t-h2), .hl-stat-change 13→14, .hl-tab 11→12 (t-label), .hl-steps 15→16, .hl-error details 13→14.
  Remove the .hl-empty .hl-h3 20px override. The 12px sizes use var(--hl-t-label).
- Touch targets:
  · .hl-seg button: min-height 36→44.
  · .hl-chip: keeps its 32px look but gets a 44px hit area (::after with inset:-6px 0).
- .hl-seg also matches [aria-pressed="true"], next to [aria-selected="true"].
- Light colours that fall under 4.5:1 on --hl-sunk. With these values all pass on bg, raised and sunk; Dusk and Stage already pass:
  · ink-3 #646A73→#616770
  · miss #C2381F→#BD361E
  · warn #9A6200→#905C00
  · ok #1F7A45→#1E7542
  · lead #9A5800→#985700
  · ten #0A747B→#0A7279
  · bass #5B7314→#576E13
  · game-gold #B07A00→#895F00
- New tokens in the light, dusk (both dark blocks) and stage colour blocks:
  · --hl-piano-white: light #FFFFFF, dusk #D9DBDF, stage #C9CCD1
  · --hl-piano-black: light #111316, dusk #060708, stage #000000
- The wordmark's mark is drawn in ink, not voice (rule 1). Fix .m-mark in page.html.
- Font ranges, here and in §3: Archivo wdth 75..125 and wght 200..800. That covers everything the system uses and makes a smaller download.
- Add "v1.2" to the title and a changelog line in HOUSE_LIGHTS.md, then run python3 build.py.

2.2 Fonts and the House Lights block
- Fonts link: https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@75..125,200..800&family=Spectral:ital,wght@1,400;1,500&display=swap
- Paste house-lights.css v1.2 as the marked block at the top of the existing <style>.
- Paste house-lights-icons.svg right after <body>.
- Set <title>VoxCoach</title>.
- Add <meta name="theme-color"> tags: #F2F3EF for light, #16181C for dark. setTheme keeps them in step with an explicit Light or Dark choice.

2.3 Legacy remap, so screens not yet rebuilt follow the theme
- Delete the old :root colour block and the three [data-theme="cyberpunk|aurora|velvetopera"] blocks.
- Declare the new block on ":root, [data-house]". Both selectors are needed: a custom property resolves where it is declared, so a data-house="down" panel in phase 2 has to re-declare it to pick up the stage values.
    --bg:var(--hl-bg); --surface:var(--hl-raised); --surface-raised:var(--hl-sunk); --hairline:var(--hl-rule);
    --cream:var(--hl-ink); --text:var(--hl-ink); --muted:var(--hl-ink-3); --brass:var(--hl-ink); --brass-dim:var(--hl-rule-strong);
    --teal:var(--hl-voice); --coral:var(--hl-miss); --on-brass:var(--hl-bg); --on-teal:var(--hl-on-voice); --on-part:var(--hl-on-voice);
    --shadow:none; --bg-glow-1:transparent; --bg-glow-2:transparent;
  Why: teal mostly draws the singer's own data (pitch traces, vibrato, breath ring, skill radar, in tune), which is the voice colour. Brass was the general accent, and becomes ink, the House Lights main action. Some non-voice teal (a few buttons) will be blue until its screen is rebuilt; rule 1 is enforced screen by screen from phase 2. Don't fix those now.
- body: flat var(--hl-bg), font-family var(--hl-font), and no radial glows.
- Replace rgba(var(--bg-rgb),α) (3 places) with color-mix(in srgb, var(--hl-bg) α%, transparent), then delete --bg-rgb.
- Literal colours in CSS, inline style attributes, and HTML/SVG built in JS strings (not canvas code):
  · rgba(79,214,196,α) → color-mix(in srgb, var(--teal) α%, transparent). Same pattern for rgba(232,163,61,α) with --brass and rgba(232,115,93,α) with --coral.
  · #4fd6c4→var(--teal), #e8a33d→var(--brass), #e8735d→var(--coral), #f1ead9→var(--cream), #8a8272→var(--muted), #33301f→var(--hairline).
  · #0e0d0b → var(--bg), or var(--on-brass)/var(--on-teal) when it's text on a brass or teal fill.
  · Text on teal fills (#082722) → var(--on-teal). Text on brass fills (#1a1305) → var(--on-brass). Note labels on part-coloured shapes (#1a1305 in SVG note text) → var(--on-part).
  · Parts: PART_COLORS (~13255) and HARMONY_PART_COLORS (~17845) become {Soprano:'var(--hl-sop)', Lead:'var(--hl-lead)', Alto:'var(--hl-alto)', Tenor:'var(--hl-ten)', Bass:'var(--hl-bass)'}. The five Choir track rows' --part-color and swatches change the same way. This applies the §8 decision (alto rose, bass moss) and stops Tenor turning into the voice colour.
  · Everything else (#a78bda, #c9b98a, #c94a35, #a89f8f, #6b6355, #2a2419 outside canvas, rgba(8,7,5,…), rgba(255,255,255,…)): pick the nearest token. Part tokens for hue identity, --hl-warn or --hl-miss for meaning, ink shades otherwise. List each in the report as old → new, and where.
- Canvas code keeps its literal colours this phase:
  · Glider, Bridge, the warm-up canvas and the Voice Card export paint their own dark backgrounds and stay dark: they're stage surfaces.
  · The Resonance canvas clears to transparent. Check it in both themes in the screenshots and report what you see.
- Piano keyboards (the Key Finder SVG ~2500 and any keyboard drawn in JS): white keys var(--hl-piano-white), black keys var(--hl-piano-black), outlines var(--hl-rule-strong). The black keys use var(--bg) today, which would turn them paper-coloured in Light.

2.4 Font sweep
- 'Fraunces',serif → font-family:var(--hl-font);font-stretch:var(--hl-w-wide)
- 'Space Mono',monospace → font-family:var(--hl-font);font-variant-numeric:tabular-nums
- 'Inter',sans-serif → font-family:var(--hl-font)
- Do the same in inline styles, SVG font-family attributes, font shorthands in JS strings, and the two canvas "Space Mono" fonts (→ Archivo). Leave the canvas Georgia on the Voice Card for phase 7.
- Don't change any sizes or weights this phase beyond what's listed here.

2.5 Header (header.shell-topbar)
- Left: the wordmark. The #hl-mark symbol in ink, then "VoxCoach" in Archivo 760, width 114%, 16px. Recreate page.html's m-brand/m-word as vc-brand/vc-word.
- Right, signed in: a 32px round avatar button showing the initial. Uppercase it with toLocaleUpperCase(currentLanguage), so a Turkish i becomes İ.
  · aria-label "{name} · {tier label}". Keep today's tier computation so that information isn't lost.
  · On click, it clicks .snb-item[data-shell="you"], which reuses the routing and its stopAllActiveSessions.
- Right, signed out: a quiet button #signInBtn, labelled with the existing auth_signin_btn key ("Sign in"). On click it runs openAuthModal(); setAuthMode('signin'). Leave openAuthModal() itself unchanged: the scripts call it and expect sign-up mode.
- renderAccountBar (~11104) builds with createElement and textContent. Today profile.name is pasted into innerHTML; stop doing that.
- The header no longer shows the name, tier badge or streak. Background is solid var(--hl-bg) with a bottom hairline, no blur.
- #shellStreak and #shellLevel keep their IDs and updateShellTopbar, but move into the Home greeting row as one line under the greeting: flame icon + streak number · "Level N".
  · "Level" uses the existing journey_level_label key.
  · updateShellTopbar writes the numbers into inner spans, so the icon stays.
  · Signed in: that line shows and #homeStreakLine is hidden.
  · Signed out: that line is hidden (nobody sees a zero streak) and #homeStreakLine shows its sign-in sentence.
  · Remove the 🔥 from homeStreakLine.

2.6 Tab bar (nav.shell-bottomnav). No new <nav> element.
- Add hl-tabbar and hl-tab next to the old classes. Replace the old SIGNAL SHELL nav rules rather than layering on top of them.
- Icons in the existing .snb-icon spans: hl-home, hl-coach, hl-songs, hl-world, hl-you.
- The active tab keeps aria-current="page" (showShellSection already sets it) and gets the 2px playhead line in the voice colour. That's the one non-singer use rule 1 allows.
- Labels are 12px and not uppercased (a script matches the "Songs" text).
- nav_train becomes "Coach" in en, fr and es, and "Koç" in tr. Grep scripts/ for the old labels first.
- Under 960px: a fixed bottom bar, full width, var(--hl-bg) with a top hairline and safe-area padding. No floating dock, blur or shadow.
- 960px and up: the same nav sits in the header row (fixed, top:0, centred, header height), icon and label inline, playhead along the header's bottom edge. body padding-bottom 0, and toasts at bottom 24px.
- The auth modal and other overlays must still sit above the nav (choir-verify live7.js and modalz.js check this).

2.7 Smaller shell items
- Remove <footer class="note"> (~4430), the developer note.
- Hub headings: remove the emoji, rename Train to Coach, and replace the subtitles that break §7. In every row below, the order is en / fr / es / tr:
  hub_train_title: Coach / Coach / Coach / Koç
  hub_train_sub: Exercises and tools for pitch, range, breath and tone. / Exercices et outils pour la justesse, la tessiture, le souffle et le timbre. / Ejercicios y herramientas para afinación, rango, respiración y timbre. / Perde, ses aralığı, nefes ve tını için egzersizler ve araçlar.
  hub_songs_title: Songs / Chansons / Canciones / Şarkılar
  hub_songs_sub: Rehearse your choir part, or practice a song on your own. / Répétez votre voix du chœur, ou travaillez une chanson seul. / Ensaya tu voz del coro o practica una canción por tu cuenta. / Koro partini çalış ya da bir şarkıyı tek başına çalış.
  hub_you_title: You / Vous / Tú / Sen
  hub_you_sub: Your range, progress and plan. / Votre tessiture, vos progrès et votre forfait. / Tu rango, tu progreso y tu plan. / Ses aralığın, ilerlemen ve planın.
  hub_world_title: Vocal World / Monde Vocal / Mundo Vocal / Vokal Dünyası
- Toast (.app-toast, class kept): ink background, var(--hl-bg) text, radius --hl-r2, no coloured left border. .warn toasts start with the hl-info icon instead.
- Splash: the same wordmark as the header. Its ring already follows the remap; just check it.

2.8 Themes: System / Light / Dark
- Replace the four swatches in #themePickerGrid with an hl-seg of three buttons. Keep the theme-swatch-btn class and the data-theme-choice attribute, with values system | light | dark.
- New keys (en / fr / es / tr):
  theme_system: System / Système / Sistema / Sistem
  theme_light: Light / Clair / Claro / Açık
  theme_dark: Dark / Sombre / Oscuro / Koyu
- settings_theme_title loses its emoji.
- settings_theme_sub: System follows your device's light or dark setting. / Système suit le réglage clair ou sombre de votre appareil. / Sistema sigue el ajuste claro u oscuro de tu dispositivo. / Sistem, cihazının açık veya koyu ayarını izler.
- setTheme (~21168): system removes data-theme; light or dark sets data-theme="light|dark".
- initTheme maps stored values and writes the result back: null or default → system; cyberpunk, aurora, velvetopera → dark. An old build reading system or light just shows its default look, so a rollback is safe.
- A tiny inline script in <head> sets data-theme from localStorage (in try/catch) before first paint, so there's no dark-to-light flash.

2.9 Turkish uppercase
- applyTranslations (~10838) sets document.documentElement.lang = currentLanguage. That covers page load and every language switch.
- Check that in tr, an uppercased label containing "i" renders "İ" (screenshot it).
- Mark the roadmap's "Page lang stays en" entry fixed once phase 1 is live.

2.10 Page load: profile and progress in parallel. Its own commit.
- loadProfile and loadProgress don't depend on each other: each does its own getSession and a plain select, and neither reads the other's result. At both call sites (onSignedIn ~11167 and initAccountAndDashboard ~11328), use await Promise.all([loadProfile(), loadProgress()]).
- Measure with pageload.js, master against the branch:
  · same run, local build routed the way shotlang.js does it, against the production backend;
  · PL_LOADS=10 per side, paced.
- Report the median time until both profile and progress are loaded, plus any 4xx or 5xx responses. Keep the change only if it's faster or equal with no new errors; otherwise drop the commit and say so.

3. CHECKS. All on the branch, local build, same machine.
- hooks.js: 0 failures, apart from the listed allowed removals.
- contrast.js, Light and Dark, all 46 panels. Gate:
  · The header, tab bar, toast, Home and the four hubs are all ≥4.5:1, with 0 unknown.
  · No text under 3:1 anywhere.
  · Text between 3 and 4.5 elsewhere is listed per panel and waits for that screen's phase. The exception is a remap side effect that one token fixes: fix it and say so.
- Every verify suite once on the branch, one at a time, paced, with test accounts cleaned up:
  · batch1, batch2, batch3a–c
  · warmup entries and tracking
  · levelup
  · choir-verify (all scripts)
  · glider courses and flight
  · range reload
  · tt firsttick
  · vq-verify listenwin, picker, loopback, levels and rtfsoft
  · vibfix and noisegate in their regress mode
  Any failure: run that suite on master in the same session and classify it Regression or Already failing. Only a Regression blocks.
- System follows the device: with colorScheme light the body's computed --hl-bg is paper; with dark it's dusk.
- prefers-reduced-motion: no transitions on the header or tab bar.

4. SCREENSHOTS (shots.js)
- Two states: a fresh signed-in account with a captured range (recordRangeCapture(45,69), so Home has content), and signed out.
- All 46 panels, at 390x844 and 1280x800, in Light and Dark:
  · a viewport JPEG at quality 85 for every combination;
  · a full-page JPEG at 390 in both themes.
- Extra shots:
  · signed-out Home;
  · the auth modal in sign-in mode;
  · Profile with the theme control;
  · a toast;
  · the splash;
  · Turkish: Home and a screen with uppercase labels;
  · System with the device in dark.
- Contact sheets, one per hub group: each row shows 390 Light | 390 Dark | 1280 Light | 1280 Dark. Render a grid page with Playwright to make them. These are for the user to glance at.
- Push the images, contact sheets and the hooks and contrast JSON to an orphan branch review/phase1 (no code; it gets deleted after review). Also push the code branch redesign/phase1, unmerged.
- The repo is public: check both branches for secrets, .env content and tokens before pushing.

5. REPORT, then stop
- Commits; hooks and contrast summaries; the literal-colour table (old → new, where); the suite table (pass / Regression / Already failing); page-load numbers; anything you couldn't do.
- Update HANDOFF.md.
- No merge to master and no deploy until the review is done.
- If the work runs long, push what's done to redesign/phase1 and report progress. Don't drop checks to finish faster.

Rules throughout:
- Keep every ID, data-i18n key, data-panel, data-shell and data-enter-panel value, and every protected class and protected string in §9.
- Grep scripts/ before changing any visible text.
- No new dependencies.
- Every new or changed string in en, es, fr and tr.
- Screens not yet rebuilt will look mixed: old layouts in the new colours and type. That's expected. Phase 1 is judged on the shell, type, colour and readability.
