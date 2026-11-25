// Release J (design/reliability/RELEASE_J.md): progressMerge3's rules, column class by class, in node (no browser, no
// backend): the J block of deploy/index.html evaluated as it is. Usage: node scripts/release-j/merge-unit.js
const fs=require('fs');const s=fs.readFileSync('/Users/alegramusenge/Documents/voxcoach-j/deploy/index.html','utf8');
const a=s.indexOf('const PJ_COLS = ['), b=s.indexOf('const pjCols = p =>');
const daysBetween=(x,y)=>Math.round((Date.parse(y)-Date.parse(x))/864e5);
eval(s.slice(a,b).replace(/^const |^let /gm,'var '));
let nf=0;const eq=(n,x,y)=>{if(JSON.stringify(x)!==JSON.stringify(y))nf++;const ok=JSON.stringify(x)===JSON.stringify(y);console.log((ok?'ok  ':'FAIL')+' '+n+(ok?'':' got '+JSON.stringify(x)+' want '+JSON.stringify(y)));};
const base={xp:10,totalSessions:1,pitchScores:[60],history:{'2026-11-25':1},streak:3,lastPracticeDate:'2026-11-25',lastExerciseDate:'2026-11-25',exercisesToday:1,highestMidi:70,triedKaraoke:false,timelineEvents:[{ts:1}],levelupSnapshot:{level:1},lastWarmupDay:'2026-11-24',warmupStreak:2};
const phone={...base,xp:65,totalSessions:3,pitchScores:[60,85],history:{'2026-11-25':3},exercisesToday:2,highestMidi:74,triedKaraoke:true,timelineEvents:[{ts:1},{ts:2}],levelupSnapshot:{level:2},lastWarmupDay:'2026-11-25',warmupStreak:3};
const lap={...base,xp:15,breathScores:[55]};
let m=progressMerge3(base,lap,phone);
eq('xp',m.xp,70);eq('sessions',m.totalSessions,3);eq('pitch',m.pitchScores,[60,85]);eq('breath',m.breathScores,[55]);eq('history',m.history,{'2026-11-25':3});
eq('exToday',m.exercisesToday,2);eq('hi',m.highestMidi,74);eq('flag',m.triedKaraoke,true);eq('tl',m.timelineEvents.length,2);eq('snap',m.levelupSnapshot,{level:2});eq('wu',[m.lastWarmupDay,m.warmupStreak],['2026-11-25',3]);
// both did an exercise and a session same day
const lap2={...base,xp:15,totalSessions:2,history:{'2026-11-25':2},exercisesToday:2,timelineEvents:[{ts:1},{ts:3}]};
m=progressMerge3(base,lap2,phone);eq('xp2',m.xp,70);eq('sess2',m.totalSessions,4);eq('hist2',m.history,{'2026-11-25':4});eq('ex2',m.exercisesToday,3);eq('tl2',m.timelineEvents.map(e=>e.ts),[1,2,3]);
// erase on phone; laptop loaded yesterday-ish morning, practises today (new day)
const b3={...base,lastPracticeDate:'2026-11-24',streak:5,lastExerciseDate:'2026-11-24',exercisesToday:4,totalSessions:9,pitchScores:[1,2,3]};
const erased={...b3,streak:0,totalSessions:0,lastPracticeDate:null,lastExerciseDate:null,exercisesToday:0,pitchScores:[],history:{},highestMidi:null,timelineEvents:[]};
const lap3={...b3,xp:b3.xp+5,totalSessions:10,lastPracticeDate:'2026-11-25',streak:6,lastExerciseDate:'2026-11-25',exercisesToday:1,pitchScores:[1,2,3,80],history:{...b3.history,'2026-11-25':(b3.history['2026-11-25']||0)+1}};
m=progressMerge3(b3,lap3,erased);eq('e sess',m.totalSessions,1);eq('e streak',[m.lastPracticeDate,m.streak],['2026-11-25',1]);eq('e ex',[m.lastExerciseDate,m.exercisesToday],['2026-11-25',1]);eq('e pitch',m.pitchScores,[80]);eq('e hist',m.history,{'2026-11-25':1});eq('e hi',m.highestMidi,null);eq('e xp',m.xp,15);
// erase same day as laptop's base, laptop exercises again today
const b4={...base,exercisesToday:3,totalSessions:5};const er4={...b4,exercisesToday:0,lastExerciseDate:null,totalSessions:0,streak:0,lastPracticeDate:null};
const l4={...b4,exercisesToday:4,totalSessions:6};m=progressMerge3(b4,l4,er4);eq('e4 ex',[m.lastExerciseDate,m.exercisesToday],['2026-11-25',1]);eq('e4 sess',m.totalSessions,1);eq('e4 streak',[m.lastPracticeDate,m.streak],[null,0]);
// streak: phone practised yesterday->today? phone day later
m=progressMerge3({...base,lastPracticeDate:'2026-11-23',streak:2},{...base,lastPracticeDate:'2026-11-23',streak:2,xp:12},{...base,lastPracticeDate:'2026-11-24',streak:3});eq('st theirs later',[m.lastPracticeDate,m.streak],['2026-11-24',3]);
// list cap 20
const L20=Array.from({length:20},(_, i)=>i);m=progressMerge3({pitchScores:L20},{pitchScores:[...L20.slice(1),100]},{pitchScores:[...L20.slice(2),200,201]});eq('cap',m.pitchScores,[...L20.slice(3),200,201,100]);
// equal scores both sides stay two
m=progressMerge3({pitchScores:[1]},{pitchScores:[1,85]},{pitchScores:[1,85]});eq('two 85s',m.pitchScores,[1,85,85]);
// weekly log same entry not twice
const w={type:'pitch',score:85,date:'2026-11-25'};m=progressMerge3({weeklyLog:[]},{weeklyLog:[w]},{weeklyLog:[w]});eq('weekly dedupe',m.weeklyLog,[w]);
// plain: mine changed -> mine; mine unchanged -> theirs
m=progressMerge3({lastBossWeakness:'a'},{lastBossWeakness:'b'},{lastBossWeakness:'c'});eq('plain mine',m.lastBossWeakness,'b');
m=progressMerge3({lastBossWeakness:'a'},{lastBossWeakness:'a'},{lastBossWeakness:'c'});eq('plain theirs',m.lastBossWeakness,'c');
console.log('cols',PJ_COLS.length,new Set(PJ_COLS).size);
// erase same day, laptop session again today: streak 1 from today
const b5={...base,history:{'2026-11-25':1},totalSessions:1,streak:4,lastPracticeDate:'2026-11-25'};
const e5={...b5,history:{},totalSessions:0,streak:0,lastPracticeDate:null};
m=progressMerge3(b5,{...b5,history:{'2026-11-25':2},totalSessions:2},e5);eq('e5 streak',[m.lastPracticeDate,m.streak],['2026-11-25',1]);eq('e5 hist',m.history,{'2026-11-25':1});
// normal: phone practised today too: unchanged
m=progressMerge3(b5,{...b5,history:{'2026-11-25':2},totalSessions:2},{...b5,history:{'2026-11-25':2},totalSessions:2});eq('n5',[m.lastPracticeDate,m.streak,m.totalSessions],['2026-11-25',4,3]);
console.log(`MERGE-UNIT: ${nf?'FAIL':'PASS'} (${nf} failed)`);process.exit(nf?1:0);
