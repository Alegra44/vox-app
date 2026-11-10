// Phase 9's screens (PHASE9.md 1a, 1g, §4), shared by shots9.js and states9.js: how each opens (page code, run with
// eval), the overlay or panel it must show, the root that contrast and the button scan read, and its states.
// States: signedout · new (fresh account, in the trial) · active (Level 7) · expired (active, trial over, no plan) ·
// teacher (active on the Teacher plan, two students, one assignment). Signed-in states are set in the page only:
// saveProfile and saveProgress are stubbed (stateInPage), and the Feedback form's insert into public.feedback is
// recorded in the page (window.__fbRows) instead of sent, so nothing a screen does is written anywhere.
const SO = ['signedout'];
// the warm-up as the app opens it (warmupGate: the gate's promise is what lets an exercise start), today's skip cleared
const WU = `window.__wuAllow = true; try { localStorage.removeItem(wuKey()); } catch (e) {} wuPassedKey = null; wuPending = null; warmupGate();`;
const momentOpen = (fn, timer) => ({ then: `clearTimeout(window.${timer});`, open: fn });
const SCREENS = [
  { key: 'signup', open: `openAuthModal(); setAuthMode('signup');`, overlay: 'authModalOverlay', root: '#authModalOverlay', states: SO },
  { key: 'signin', open: `openAuthModal(); setAuthMode('signin');`, overlay: 'authModalOverlay', root: '#authModalOverlay', states: SO },
  { key: 'signinrequired', open: `requireSignIn('The Vocal Rift');`, overlay: 'signinRequiredOverlay', root: '#signinRequiredOverlay', states: SO },
  { key: 'signinplan', open: `enterPanel('pricing'); document.querySelector('.plan-btn[data-plan="monthly"]').click();`, overlay: 'signinRequiredOverlay', root: '#signinRequiredOverlay', states: SO },
  { key: 'language', open: `document.getElementById('languageSelectOverlay').style.display='flex';`, overlay: 'languageSelectOverlay', root: '#languageSelectOverlay', states: SO },
  ...[0, 1, 2, 3, 4, 5, 6].map(n => ({ key: `onboarding${n}`, open: `openOnboarding(); obStepIndex=${n}; renderOnboardingStep();`, overlay: 'onboardingOverlay', root: '#onboardingOverlay', states: ['new'] })),
  { key: 'onboarding6set', open: `openOnboarding(); for (const [g, i] of [['obSingerTypeGrid',0],['obLevelGrid',1],['obGenreGrid',0],['obGenreGrid',2],['obGoalsGrid',1],['obPriorityGrid',0]]) document.querySelectorAll('#'+g+' [data-ob-value]')[i].click(); obStepIndex=6; renderOnboardingStep();`, overlay: 'onboardingOverlay', root: '#onboardingOverlay', states: ['new'] },
  { key: 'pricing', open: `enterPanel('pricing');`, panel: 'pricing', root: '#panel-pricing', states: ['signedout', 'new', 'active', 'expired'] },
  { key: 'plansoon', open: `enterPanel('pricing'); document.querySelector('.plan-btn[data-plan="monthly"]').click();`, overlay: 'plansSoonOverlay', root: '#plansSoonOverlay', states: ['new', 'expired'] },
  { key: 'paywall', open: `openPaywallPrompt(translateFeatureLabel('Resonance Visualizer'), 'monthly', false);`, overlay: 'paywallModalOverlay', root: '#paywallModalOverlay', states: ['new', 'expired'] },
  { key: 'paywallreal', open: `requireProFeature('The Vocal Rift');`, overlay: 'paywallModalOverlay', root: '#paywallModalOverlay', states: ['expired'] },
  { key: 'paywallchoir', open: `requireChoirWorld('Sonic X-Ray');`, overlay: 'paywallModalOverlay', root: '#paywallModalOverlay', states: ['expired'] },
  { key: 'teacher', open: `enterPanel('teacher');`, panel: 'teacher', root: '#panel-teacher', states: ['teacher'],
    skipIf: `!document.querySelector('.legacy-tabs button[data-panel="teacher"]')`, skipWhy: 'phase 9 hides the Teacher Dashboard' },
  { key: 'feedback', open: `enterPanel('feedback');`, panel: 'feedback', root: '#panel-feedback', states: ['signedout', 'new'] },
  { key: 'feedbackthanks', open: `enterPanel('feedback'); document.getElementById('feedbackFormCard').style.display='none'; document.getElementById('feedbackThanksCard').style.display='';`, panel: 'feedback', root: '#panel-feedback', states: ['new'] },
  { key: 'warmup', open: WU, overlay: 'warmupOverlay', root: '#warmupOverlay', states: ['new'] },
  { key: 'warmupsong', open: WU + ` document.querySelector('[data-wu-mode="song"]').click();`, overlay: 'warmupOverlay', root: '#warmupOverlay', states: ['new'] },
  { key: 'warmupstage', open: WU + ` document.querySelector('#warmupList [data-wu-item]').click();`, overlay: 'warmupOverlay', root: '#warmupOverlay', states: ['new'], wait: 2500 },
  { key: 'levelup', ...momentOpen(`showLevelUp(7, levelForXp(340).name, levelupWhyText({}, {sessions:3, records:2, streak:4}));`, '_levelupTimer'), overlay: 'levelupOverlay', root: '#levelupOverlay', states: ['active'] },
  { key: 'newrecord', ...momentOpen(`triggerNewRecord(t('record_label_longest_breath'), '12.4s', '+1.8s ' + t('record_delta_suffix'));`, '_newRecordTimer'), overlay: 'newRecordOverlay', root: '#newRecordOverlay', states: ['active'] },
  { key: 'breakthrough', ...momentOpen(`triggerBreakthrough(67, 61);`, '_breakthroughTimer'), overlay: 'breakthroughOverlay', root: '#breakthroughOverlay', states: ['active'] },
  { key: 'sharerange', open: `lowNote = {midi:45, name:'A', octave:2, freq:110}; highNote = {midi:69, name:'A', octave:4, freq:440}; document.getElementById('shareRangeBtn').click();`, overlay: 'shareRangeOverlay', root: '#shareRangeOverlay', states: ['active'], exportBtn: 'downloadRangePosterBtn', poster: 'rangePoster' },
  { key: 'sharerecap', open: `document.getElementById('shareRecapBtn').click();`, overlay: 'shareRecapOverlay', root: '#shareRecapOverlay', states: ['active'], exportBtn: 'downloadRecapPosterBtn', poster: 'recapPoster' },
  { key: 'vocallab', open: `enterPanel('vocallab');`, panel: 'vocallab', root: '#panel-vocallab', states: ['signedout', 'new', 'active'] },
];
// 9.1's extra shots (PHASE9.md 9.1, SCREENSHOTS): shots9.js --set 91 adds them; states9 doesn't (its list stays §1's)
const FR = `window.__langSet = true; setLanguage('fr');`;
const SCREENS_91 = [
  { key: 'feedbackempty', open: `enterPanel('feedback'); document.getElementById('feedbackSubmitBtn').click();`, panel: 'feedback', root: '#panel-feedback', states: ['new'] },
  { key: 'rangeresult-fr', open: FR + ` enterPanel('range'); lowNote = {midi:45, name:'A', octave:2, freq:110}; highNote = {midi:69, name:'A', octave:4, freq:440}; renderRangeResult(); showStep('rangeResult');`, panel: 'range', root: '#panel-range', states: ['active'] },
  { key: 'profile-fr', open: FR + ` enterPanel('profile');`, panel: 'profile', root: '#panel-profile', states: ['active'] },
  { key: 'onboarding1set', open: `openOnboarding(); document.querySelectorAll('#obSingerTypeGrid [data-ob-value]')[1].click(); obStepIndex=1; renderOnboardingStep();`, overlay: 'onboardingOverlay', root: '#onboardingOverlay', states: ['new'] },
  { key: 'onboarding3set', open: `openOnboarding(); for (const i of [0, 2, 5]) document.querySelectorAll('#obGenreGrid [data-ob-value]')[i].click(); obStepIndex=3; renderOnboardingStep();`, overlay: 'onboardingOverlay', root: '#onboardingOverlay', states: ['new'] },
];

// Runs in the page: the state on top of youSeed's (expired and teacher build on active); nothing is saved.
function stateInPage(st) {
  // the Feedback form's insert is recorded, never sent (states9 clicks Submit)
  if (typeof sb !== 'undefined' && !sb.__fbStub) { const from = sb.from.bind(sb); sb.from = t => t === 'feedback' ? { insert: async row => { (window.__fbRows = window.__fbRows || []).push(row); return { error: null }; } } : from(t); sb.__fbStub = true; }
  if (st === 'signedout') return;
  window.saveProgress = async () => {}; window.saveProfile = async p => { profile = p; };
  if (st === 'expired') { const d = new Date(); d.setDate(d.getDate() - 30); profile.trialStartDate = d.toISOString(); profile.subscriptionPlan = null; }
  if (st === 'teacher') {
    profile.subscriptionPlan = 'teacher';
    profile.teacherRoster = [{ id: 's1', name: 'Maya' }, { id: 's2', name: 'Leo' }];
    profile.teacherAssignments = [{ id: 'a1', exerciseType: 'pitch', note: 'Five takes on G4, then two on A4.', completions: { s1: true } }];
  }
  if (typeof renderHomeScreen === 'function') try { renderHomeScreen(); } catch (e) {}
}
// Runs in the page: hide every overlay (the moment overlays lose clearOverlays' inline display:none, so their class can
// show them again) and stop anything a screen opened.
function resetInPage() {
  window.__wuAllow = false;
  if (window.__langSet) { window.__langSet = false; try { setLanguage('en'); } catch (e) {} }
  try { if (typeof showStep === 'function') showStep('rangeIntro'); } catch (e) {}
  try { if (typeof wuStop === 'function') wuStop(); } catch (e) {}
  document.querySelectorAll('.modal-overlay, .share-overlay').forEach(o => { o.style.display = 'none'; });
  document.querySelectorAll('.levelup-overlay').forEach(o => { o.classList.remove('levelup-show'); o.style.display = ''; });
  for (const id of ['feedbackFormCard']) { const e = document.getElementById(id); if (e) e.style.display = ''; }
  { const e = document.getElementById('feedbackThanksCard'); if (e) e.style.display = 'none'; }
  document.body.style.overflow = '';
}
// Runs in the page: what's on screen: the open overlays' ids, the active panel, the house.
function openOverlays() {
  const shown = e => { const cs = getComputedStyle(e); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05 && e.getClientRects().length; };
  const overlays = [...document.querySelectorAll('.modal-overlay, .share-overlay, .levelup-overlay, [role="dialog"]')]
    .filter(e => e.id && shown(e)).map(e => e.id);
  const p = document.querySelector('.panel.active');
  return { overlays: [...new Set(overlays)], panel: p ? p.id.replace(/^panel-/, '') : null, house: document.body.dataset.house || null };
}
module.exports = { SCREENS, SCREENS_91, stateInPage, resetInPage, openOverlays };
