// Phase 3 (PHASE3.md §1a): the seeded states Home and the Coach tab are checked and photographed in. Each one is set in
// the page's memory (profile and progress) on a signed-in test account, then Home is drawn through the app's own
// showShellSection('home'). Nothing is saved: the same seed gives the same values on master and on the branch.
// signedout is a page without the account.
const HOME_STATES = ['new', 'priority', 'weakest', 'struggling', 'today', 'expired', 'signedout'];

// Runs in the page. Resets every field the two screens read, then adds the state's own.
function seedInPage(name) {
  const today = todayStr(), daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  Object.assign(profile, { onboardingPriority: null, trialStartDate: today, subscriptionPlan: null });
  Object.assign(progress, {
    pitchScores: [], breathScores: [], agilityScores: [], lowestMidi: null, highestMidi: null, noteAttemptHistory: {},
    sessionSnapshot: null, history: {}, weeklyLog: [], dailyMetrics: {}, bestBreathDuration: 0, bestBridgeSeconds: 0,
    gliderBest: 0, bridgeBest: 0, bossVictories: 0, harmonyBest: 0, xp: 0, streak: 0, lastPracticeDate: null, totalSessions: 0,
    choirReadiness: {},
  });
  if (name === 'priority') profile.onboardingPriority = 'breath';
  if (['weakest', 'struggling', 'today'].includes(name)) {
    Object.assign(progress, {
      pitchScores: [80, 84, 82], breathScores: [52, 58], agilityScores: [70, 74], lowestMidi: 45, highestMidi: 69,
      bestBreathDuration: 12.4, bestBridgeSeconds: 3.2, dailyMetrics: { [daysAgo(1)]: { stability: [61.6, 74.2] } },
      xp: 340, streak: 3, lastPracticeDate: daysAgo(1), totalSessions: 6, gliderBest: 1200, bossVictories: 1,
      // a rising pitch trend over the last two weeks: the coach sentence
      weeklyLog: [[12, 60], [11, 62], [10, 61], [9, 63], [4, 78], [3, 80], [2, 81], [1, 83]].map(([d, score]) => ({ date: daysAgo(d), type: 'pitch', score })),
      // one Choir World part in progress, with a snapshot from two days ago (the card's delta line)
      choirReadiness: { parts: { hymn: { Alto: { levels: [0, 1, 2, 3], hm: [95], bosses: [], updated: new Date().toISOString(),
        snap: { levels: 1, hm: 0, bosses: 0, status: 'learning', ts: Date.now() - 2 * 86400000 } } } }, log: [], runs: [], ycTakes: 0 },
    });
  }
  if (['struggling', 'today'].includes(name)) progress.noteAttemptHistory = { 57: { attempts: 4, sumAccuracy: 220 }, 60: { attempts: 3, sumAccuracy: 240 } };
  if (name === 'today') {
    progress.history = { [today]: 2 }; progress.lastPracticeDate = today; progress.totalSessions = 7;
    progress.sessionSnapshot = { pitch: 78, range: 80, breath: 50, agility: 72, expression: null, capturedAt: today };
  }
  if (name === 'expired') profile.trialStartDate = daysAgo(30);
}

// Seeds the state (signed in) and shows Home.
// It waits for the page's own loads to finish first: a late progress load would replace the seeded values.
async function seed(page, name) {
  await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
  if (name !== 'signedout') await page.evaluate(seedInPage, name);
  await page.evaluate(() => { showShellSection('home'); window.scrollTo(0, 0); });
  await new Promise(r => setTimeout(r, 400));
}

module.exports = { HOME_STATES, seedInPage, seed };
