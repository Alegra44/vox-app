// Phase 7: the seeded states of the You screens, shared by shots7before.js, youstates.js and shots7.js. Each is set in
// the page's memory (profile and progress) on a signed-in test account, the way homeStates.js seeds Home. Nothing is
// saved: saveProgress is stubbed, so the achievements' timeline logging can't write the seed to the account.
//   new       a fresh account: nothing practised
//   active    a singer some days in: Skill Profile scores (pitch, breath, agility, plus Emotional Singing's expression),
//             a range, 14 days of history, Voice Health readings on six days, timeline events, a Karaoke song best,
//             the Journey on day 6 with a Day 1 snapshot, one Choir World part in progress with one Harmony Memory run
//   activecw  active, plus a Choir World singer's record: five runs with Performance Report pitches (Harmony Memory and
//             bosses, over the last week), Soprano Ready with two bosses beaten, Alto developing, a Your Choir take
// signedout is a page without the account (nothing to seed).
const YOU_STATES = ['signedout', 'new', 'active', 'activecw'];

// Runs in the page.
function seedInPage(name) {
  window.saveProgress = async () => {};
  const today = todayStr(), daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  for (const k of ['day1Snapshot', 'day1Goal', 'day1StartDate']) delete profile[k];
  Object.assign(profile, { onboardingPriority: null });
  Object.assign(progress, {
    pitchScores: [], breathScores: [], agilityScores: [], expressionScores: [], lowestMidi: null, highestMidi: null,
    noteAttemptHistory: {}, sessionSnapshot: null, history: {}, weeklyLog: [], dailyMetrics: {}, bestBreathDuration: 0,
    bestBridgeSeconds: 0, gliderBest: 0, bridgeBest: 0, bossVictories: 0, harmonyBest: 0, xp: 0, streak: 0,
    lastPracticeDate: null, totalSessions: 0, choirReadiness: {}, timelineEvents: [], notifiedAchievements: [],
    songBestScores: {}, curriculumDaysCompleted: {}, breakthroughCount: 0, triedKaraoke: false, triedEmotion: false,
  });
  if (name === 'new') return;
  const hist = {}; [0, 1, 2, 4, 5, 7, 9, 12].forEach((d, i) => { hist[daysAgo(d)] = 1 + (i % 3); });
  const dm = {}; [[1, 71, 64], [2, 74, 66], [4, 69, null], [5, 76, 70], [7, 72, 62], [9, 70, 60]].forEach(([d, s, br]) => {
    dm[daysAgo(d)] = { stability: [s, s + 3], ...(br !== null ? { breath: [br] } : {}) }; });
  Object.assign(progress, {
    pitchScores: [62, 70, 76, 81, 84], breathScores: [55, 60], agilityScores: [64, 72], expressionScores: [48],
    lowestMidi: 45, highestMidi: 69, bestBreathDuration: 12.4, bestBridgeSeconds: 3.2, gliderBest: 1200, bossVictories: 1,
    harmonyBest: 78, xp: 340, streak: 3, lastPracticeDate: today, totalSessions: 14, history: hist, dailyMetrics: dm,
    weeklyLog: [[12, 60], [9, 63], [5, 78], [2, 81], [0, 84]].map(([d, score]) => ({ date: daysAgo(d), type: 'pitch', score })),
    songBestScores: { hymn: 72 }, triedKaraoke: true, triedEmotion: true, breakthroughCount: 2,
    curriculumDaysCompleted: { 1: true, 2: true, 3: true, 4: true, 5: true },
    noteAttemptHistory: { 57: { attempts: 4, sumAccuracy: 220 } },
    timelineEvents: [
      { date: daysAgo(5), type: 'assessment', label: 'Day 1 baseline set', ts: Date.now() - 5 * 86400000 },
      { date: daysAgo(2), type: 'breakthrough', label: 'Pitch broke 80% for the first time', ts: Date.now() - 2 * 86400000 },
      { date: daysAgo(1), type: 'levelup', label: 'Reached Level 7', ts: Date.now() - 86400000 },
    ],
    choirReadiness: { parts: { hymn: { Alto: { levels: [0, 1, 2, 3], hm: [95], bosses: [], hmPassed: 1, bossesBeaten: 0, wins: 0, losses: 0,
      status: 'developing', updated: new Date().toISOString() } } },
      log: [], ycTakes: 0,
      runs: [{ ts: Date.now() - 86400000, kind: 'hm', song: 'hymn', part: 'Alto', slot: 0, score: 95, passed: true, held: 7, n: 8, pitch: 88, timing: 92 }] },
  });
  Object.assign(profile, { day1Snapshot: { pitch: 62, range: 80, breath: 55, agility: 64, expression: null, date: daysAgo(5) },
    day1Goal: 0, day1StartDate: daysAgo(5) });
  if (name !== 'activecw') return;
  const run = (d, kind, part, slot, score, passed, held, n, pitch, timing) => ({ ts: Date.now() - d * 86400000, kind, song: 'hymn', part, slot, score, passed, held, n, pitch, timing });
  const cr = progress.choirReadiness;
  cr.parts.hymn.Soprano = { levels: [0, 1, 2, 3, 4], hm: [92, 90, 88, 85, 80], bosses: [82, 90], hmPassed: 5, bossesBeaten: 2,
    wins: 2, losses: 1, status: 'ready', updated: new Date().toISOString() };
  cr.ycTakes = 1;
  cr.log = [{ ts: Date.now() - 2 * 86400000, song: 'hymn', part: 'Soprano', from: 'developing', status: 'ready' }];
  cr.runs = [
    run(7, 'hm', 'Soprano', 0, 90, true, 8, 8, 91, 95), run(6, 'boss', 'Soprano', 0, 70, false, 6, 10, 66, 80),
    run(4, 'boss', 'Soprano', 0, 82, true, 9, 10, 85, 90), run(2, 'boss', 'Soprano', 1, 90, true, 9, 10, 74, 88),
    run(1, 'hm', 'Alto', 0, 95, true, 7, 8, 88, 92),
  ];
}

module.exports = { YOU_STATES, seedInPage };
