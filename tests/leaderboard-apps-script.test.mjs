import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(code, context);

const run = expression => vm.runInContext(expression, context);

test('Apps Script validates the agreed classes and student numbers', () => {
  assert.equal(run("validStudent_('1A', 1)"), true);
  assert.equal(run("validStudent_('1D', 33)"), true);
  assert.equal(run("validStudent_('1E', 1)"), false);
  assert.equal(run("validStudent_('1A', 34)"), false);
});

test('best attempts prioritise score, then time, then earlier submission', () => {
  assert.equal(run("better_({score:150,elapsedSeconds:100,submittedAt:3},{score:145,elapsedSeconds:1,submittedAt:1})"), true);
  assert.equal(run("better_({score:150,elapsedSeconds:90,submittedAt:3},{score:150,elapsedSeconds:100,submittedAt:1})"), true);
  assert.equal(run("better_({score:150,elapsedSeconds:90,submittedAt:1},{score:150,elapsedSeconds:90,submittedAt:3})"), true);
});

test('per-game and overall leaderboards keep the best attempt and require seven games', () => {
  const records = [
    {roundId:'R1',submittedAt:1,className:'1A',studentNo:1,gameId:'locate',score:100,maxScore:150,elapsedSeconds:80},
    {roundId:'R1',submittedAt:2,className:'1A',studentNo:1,gameId:'locate',score:120,maxScore:150,elapsedSeconds:90},
    {roundId:'R1',submittedAt:3,className:'1A',studentNo:1,gameId:'compare',score:130,maxScore:150,elapsedSeconds:70},
    {roundId:'R1',submittedAt:4,className:'1A',studentNo:1,gameId:'move',score:140,maxScore:150,elapsedSeconds:60},
    {roundId:'R1',submittedAt:5,className:'1A',studentNo:1,gameId:'brackets',score:150,maxScore:150,elapsedSeconds:50},
    {roundId:'R1',submittedAt:6,className:'1A',studentNo:1,gameId:'multiply',score:145,maxScore:150,elapsedSeconds:45},
    {roundId:'R1',submittedAt:7,className:'1A',studentNo:1,gameId:'divide',score:140,maxScore:150,elapsedSeconds:40},
    {roundId:'R1',submittedAt:8,className:'1A',studentNo:1,gameId:'mixed',score:135,maxScore:150,elapsedSeconds:35},
    {roundId:'R1',submittedAt:9,className:'1B',studentNo:2,gameId:'locate',score:150,maxScore:150,elapsedSeconds:40},
    {roundId:'OLD',submittedAt:1,className:'1C',studentNo:3,gameId:'locate',score:150,maxScore:150,elapsedSeconds:1},
  ].map(record => ({...record, worldId:'directed-number'}));
  context.currentRound_ = () => 'R1';
  context.readRecords_ = () => records;
  const game = context.leaderboard_('locate', 'ALL', {className:'1A',studentNo:1});
  assert.equal(game.rankings[0].className, '1B');
  assert.equal(game.self.score, 120);
  assert.equal(game.self.rank, 2);
  const overall = context.leaderboard_('overall', 'ALL', {className:'1A',studentNo:1});
  assert.equal(overall.rankings.length, 1);
  assert.equal(overall.rankings[0].score, 960);
  assert.equal(overall.rankings[0].elapsedSeconds, 390);
});

test('badge profile covers stages, streaks, masters, cumulative goals, and duplicate submissions', () => {
  const make = (submissionId, worldId, gameId, firstTryCorrect=10, longestFirstTryStreak=5) => ({submissionId,worldId,gameId,questionCount:15,firstTryCorrect,longestFirstTryStreak});
  const directed = ['locate','compare','move','brackets','multiply','divide','mixed'].map((game,index) => make(`directed-${index}`, 'directed-number', game, index===0?15:10, index===0?15:7));
  const algebra = ['words','add-subtract','multiply-divide','expand','mixed-expand','substitute','sequence'].map((game,index) => make(`algebra-${index}`, 'algebra', game, 10, 6));
  const duplicate = {...directed[0]};
  const profile = context.profileFromRecords_('2026-27','1A',1,[...directed,...algebra,duplicate],[]);
  assert.equal(profile.summary.completedStages, 14);
  assert.equal(profile.summary.completedWorlds, 2);
  assert.equal(profile.summary.firstTryCorrect, 145);
  for (const id of ['ten-streak','directed-master','algebra-master','maths-explorer','mystery-100']) {
    assert.equal(profile.badges.find(badge => badge.id === id).earned, true, id);
  }
  assert.equal(profile.badges.find(badge => badge.id === 'directed-perfect-master').earned, false);
  assert.equal(profile.badges.find(badge => badge.id === 'ultimate-perfectionist').earned, false);
  assert.equal(profile.badges.find(badge => badge.id === 'all-rounder').earned, false);
  const mystery500 = profile.badges.find(badge => badge.id === 'mystery-500');
  assert.equal(mystery500.name, '？？？');
  assert.equal(mystery500.progress, null);
});

test('perfect-master badges require every registered stage to have a strict full-score record', () => {
  const stages = ['locate','compare','move','brackets','multiply','divide','mixed'];
  const perfect = (gameId, index) => ({submissionId:`perfect-${index}`,roundId:index%2?'R2':'R1',worldId:'directed-number',gameId,questionCount:15,maxScore:150,score:150,firstTryCorrect:15,skippedQuestions:0,longestFirstTryStreak:15});
  const records = stages.slice(0, 6).map(perfect);
  records.push({submissionId:'retry-final',worldId:'directed-number',gameId:'mixed',questionCount:15,maxScore:150,score:145,firstTryCorrect:14,skippedQuestions:0,longestFirstTryStreak:10});
  records.push({submissionId:'skip-final',worldId:'directed-number',gameId:'mixed',questionCount:15,maxScore:150,score:150,firstTryCorrect:15,skippedQuestions:1,longestFirstTryStreak:15});
  records.push({submissionId:'wrong-final',worldId:'directed-number',gameId:'mixed',questionCount:15,maxScore:150,score:150,firstTryCorrect:15,skippedQuestions:0,wrongAttempts:1,longestFirstTryStreak:15});
  records.push({submissionId:'old-stage',worldId:'polynomial',gameId:'evaluate',questionCount:15,maxScore:150,score:150,firstTryCorrect:15,skippedQuestions:0,longestFirstTryStreak:15});
  const incomplete = context.profileFromRecords_('2026-27','1A',1,records,[]);
  const badge = incomplete.badges.find(item => item.id === 'directed-perfect-master');
  assert.equal(badge.earned, false);
  assert.equal(badge.progress, 6);
  assert.equal(badge.target, 7);

  const complete = context.profileFromRecords_('2026-27','1A',1,[...records,perfect('mixed', 7)],[]);
  assert.equal(complete.badges.find(item => item.id === 'directed-perfect-master').earned, true);
  assert.equal(complete.badges.find(item => item.id === 'ultimate-perfectionist').earned, false);
});

test('all four perfect masters and ultimate perfectionist require all 26 stages', () => {
  let index = 0;
  const records = run('CATALOG').flatMap(world => world.stages.map(stage => ({submissionId:`all-perfect-${index++}`,roundId:index%3===0?'OLD':'CURRENT',worldId:world.id,gameId:stage[0],questionCount:world.questionCount,maxScore:world.maxScore,score:world.maxScore,firstTryCorrect:world.questionCount,skippedQuestions:0,longestFirstTryStreak:world.questionCount})));
  records.push({...records[0]});
  const profile = context.profileFromRecords_('2026-27','1A',1,records,[]);
  assert.equal(profile.summary.totalBadges, 41);
  for (const id of ['directed-perfect-master','algebra-perfect-master','linear-equation-perfect-master','polynomial-perfect-master','ultimate-perfectionist']) {
    assert.equal(profile.badges.find(item => item.id === id).earned, true, id);
  }
  assert.equal(profile.badges.find(item => item.id === 'ultimate-perfectionist').progress, 26);
});

test('replays can reach the hidden 500 goal without duplicating a submission', () => {
  const records = Array.from({length:34}, (_,index) => ({submissionId:`replay-${index}`,worldId:'directed-number',gameId:'locate',questionCount:15,firstTryCorrect:15,longestFirstTryStreak:15}));
  records.push({...records[0]});
  const profile = context.profileFromRecords_('2026-27','1A',1,records,[]);
  assert.equal(profile.summary.firstTryCorrect, 510);
  const badge = profile.badges.find(item => item.id === 'mystery-500');
  assert.equal(badge.earned, true);
  assert.equal(badge.name, '神秘數字 500');
});

test('score validation rejects mismatched worlds, counts, scores, and school years', () => {
  context.currentSchoolYear_ = () => '2026-27';
  const valid = {submissionId:'submission-12345',schoolYear:'2026-27',worldId:'algebra',className:'1A',studentNo:1,gameId:'words',score:125,maxScore:150,elapsedSeconds:80,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:6,wrongAttempts:2};
  assert.doesNotThrow(() => context.validateSubmission_(valid));
  for (const change of [{worldId:'unknown'},{questionCount:14},{score:120},{schoolYear:'2025-26'},{studentNo:34},{longestFirstTryStreak:11}]) {
    assert.throws(() => context.validateSubmission_({...valid,...change}));
  }
});

test('score validation accounts for skipped questions', () => {
  context.currentSchoolYear_ = () => '2026-27';
  const valid = {submissionId:'submission-skip-1',schoolYear:'2026-27',worldId:'algebra',className:'1A',studentNo:1,gameId:'words',score:100,maxScore:150,elapsedSeconds:80,questionCount:15,firstTryCorrect:10,skippedQuestions:5,longestFirstTryStreak:6,wrongAttempts:0};
  assert.doesNotThrow(() => context.validateSubmission_(valid));
  for (const change of [{score:125},{skippedQuestions:6},{firstTryCorrect:11}]) {
    assert.throws(() => context.validateSubmission_({...valid,...change}));
  }
});

test('linear-equation world is isolated and awards six stage badges plus its master badge', () => {
  const stages = ['simple','like-terms','brackets','fractions','form-equation','applications'];
  const records = stages.map((gameId,index) => ({submissionId:`equation-${index}`,worldId:'linear-equation',gameId,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:4}));
  const profile = context.profileFromRecords_('2026-27','1A',1,records,[]);
  assert.equal(profile.worldProgress.find(item => item.worldId === 'linear-equation').completed, 6);
  assert.equal(profile.badges.find(item => item.id === 'linear-equation-master').earned, true);
  stages.forEach(gameId => assert.equal(profile.badges.find(item => item.id === `stage-linear-equation-${gameId}`).earned, true));
  context.currentSchoolYear_ = () => '2026-27';
  assert.doesNotThrow(() => context.validateSubmission_({submissionId:'equation-submit-1',schoolYear:'2026-27',worldId:'linear-equation',className:'1A',studentNo:1,gameId:'applications',score:125,maxScore:150,elapsedSeconds:90,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:4,wrongAttempts:2}));
});

test('polynomial world is isolated and awards six stage badges plus its master badge', () => {
  const stages = ['indices','identify','order','like-terms','add-subtract','multiply'];
  const records = [...stages.map((gameId,index) => ({submissionId:`polynomial-${index}`,worldId:'polynomial',gameId,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:4})),{submissionId:'polynomial-old-evaluate',worldId:'polynomial',gameId:'evaluate',questionCount:15,firstTryCorrect:15,longestFirstTryStreak:15}];
  const profile = context.profileFromRecords_('2026-27','1A',1,records,[]);
  assert.equal(profile.worldProgress.find(item => item.worldId === 'polynomial').completed, 6);
  assert.equal(profile.worldProgress.find(item => item.worldId === 'algebra').completed, 0);
  assert.equal(profile.badges.find(item => item.id === 'polynomial-master').earned, true);
  stages.forEach(gameId => assert.equal(profile.badges.find(item => item.id === `stage-polynomial-${gameId}`).earned, true));
  context.currentSchoolYear_ = () => '2026-27';
  assert.doesNotThrow(() => context.validateSubmission_({submissionId:'polynomial-submit-1',schoolYear:'2026-27',worldId:'polynomial',className:'1A',studentNo:1,gameId:'multiply',score:125,maxScore:150,elapsedSeconds:90,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:4,wrongAttempts:2}));
  assert.throws(() => context.validateSubmission_({submissionId:'polynomial-submit-0',schoolYear:'2026-27',worldId:'polynomial',className:'1A',studentNo:1,gameId:'evaluate',score:125,maxScore:150,elapsedSeconds:90,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:4,wrongAttempts:2}));
  assert.throws(() => context.validateSubmission_({submissionId:'polynomial-submit-2',schoolYear:'2026-27',worldId:'algebra',className:'1A',studentNo:1,gameId:'indices',score:125,maxScore:150,elapsedSeconds:90,questionCount:15,firstTryCorrect:10,longestFirstTryStreak:4,wrongAttempts:2}));
});

test('personal bests span leaderboard rounds but stay inside one school year, student, world, and stage', () => {
  context.currentSchoolYear_ = () => '2026-27';
  const base = { schoolYear:'2026-27', className:'1A', studentNo:1, worldId:'algebra', gameId:'words', questionCount:15, maxScore:150 };
  context.readRecords_ = () => [
    {...base, submissionId:'pb-round-1', roundId:'R1', score:130, elapsedSeconds:200, submittedAt:1},
    {...base, submissionId:'pb-round-2', roundId:'R2', score:140, elapsedSeconds:260, submittedAt:2},
    {...base, submissionId:'pb-round-3', roundId:'R3', score:140, elapsedSeconds:220, submittedAt:3},
    {...base, submissionId:'pb-old-year', schoolYear:'2025-26', score:150, elapsedSeconds:100, submittedAt:4},
    {...base, submissionId:'pb-other-student', studentNo:2, score:150, elapsedSeconds:90, submittedAt:5},
    {...base, submissionId:'pb-other-world', worldId:'directed-number', gameId:'locate', score:150, elapsedSeconds:80, submittedAt:6},
    {...base, submissionId:'pb-incomplete', questionCount:14, score:150, elapsedSeconds:70, submittedAt:7},
  ];
  const result = context.personalBests_('2026-27', '1A', 1, 'algebra');
  assert.deepEqual(structuredClone(result.bests), [{gameId:'words',score:140,maxScore:150,elapsedSeconds:220}]);
  assert.throws(() => context.personalBests_('2025-26', '1A', 1, 'algebra'));
  assert.throws(() => context.personalBests_('2026-27', '1E', 1, 'algebra'));
});

test('new-personal-best flag handles first, score, time, ties, and duplicate submissions', () => {
  const attempt = { score:140, elapsedSeconds:220 };
  assert.equal(context.isNewPersonalBest_(true, attempt, null), true);
  assert.equal(context.isNewPersonalBest_(true, attempt, {score:130,elapsedSeconds:100}), true);
  assert.equal(context.isNewPersonalBest_(true, attempt, {score:140,elapsedSeconds:238}), true);
  assert.equal(context.isNewPersonalBest_(true, attempt, {score:140,elapsedSeconds:220}), false);
  assert.equal(context.isNewPersonalBest_(true, attempt, {score:145,elapsedSeconds:1000}), false);
  assert.equal(context.isNewPersonalBest_(false, attempt, null), false);
});
