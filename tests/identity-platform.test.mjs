import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({ console });
vm.runInContext(fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), context);
const catalog = JSON.parse(vm.runInContext('JSON.stringify(CATALOG)', context));
const world = catalog.find(w => w.id === 'identity');
const recordsFor = (world, studentNo = 1) => world.stages.map(([gameId], index) => ({ submissionId: `${world.id}-${studentNo}-${index}`, schoolYear: '2026-27', roundId: 'R1', className: '1A', studentNo, worldId: world.id, gameId, questionCount: 15, maxScore: 150, score: 150, firstTryCorrect: 15, skippedQuestions: 0, wrongAttempts: 0, longestFirstTryStreak: 15, elapsedSeconds: 60 + index, submittedAt: index }));
test('identity catalogue contains six stages and eight own badges without removing old stages', () => {
  assert.equal(world.stages.length, 6); assert.equal(catalog.reduce((n, w) => n + w.stages.length, 0), 46);
  const badges = JSON.parse(vm.runInContext('JSON.stringify(BADGES)', context));
  assert.equal(badges.length, 67); assert.equal(badges.filter(b => b.worldId === 'identity').length, 8);
  assert.equal(badges.find(b => b.id === 'ultimate-perfectionist').target, 46);
});
test('identity score validates its own stages and cannot use a polynomial stage', () => {
  context.currentSchoolYear_ = () => '2026-27';
  const p = { ...recordsFor(world)[0], submissionId:'identity-test-12345', elapsedSeconds: 123 };
  assert.doesNotThrow(() => context.validateSubmission_(p));
  assert.throws(() => context.validateSubmission_({ ...p, gameId:'indices' }), /關卡無效/);
  assert.throws(() => context.validateSubmission_({ ...p, worldId:'polynomial' }), /關卡無效/);
  assert.throws(() => context.validateSubmission_({ ...p, score:149 }), /分數/);
});
test('six-stage overall board, class filter and personal bests are isolated by world and student', () => {
  const records = [...recordsFor(world), ...recordsFor(world, 2).slice(0, 5), ...recordsFor(catalog.find(w => w.id === 'polynomial'))];
  context.currentRound_ = () => 'R1'; context.readRecords_ = () => records;
  const board = context.leaderboard_('overall', 'ALL', { className:'1A', studentNo:1 }, 'identity');
  assert.equal(board.rankings.length, 1); assert.equal(board.self.score, 900); assert.equal(board.self.maxScore, 900);
  assert.equal(context.leaderboard_('recognize','1B',null,'identity').rankings.length, 0);
  const bests = context.personalBests_('2026-27','1A',1,'identity');
  assert.equal(bests.bests.length, 6); assert.equal(bests.bests.some(b => b.gameId === 'indices'), false);
});
test('identity completion awards stage/master badges and full marks award perfect master', () => {
  const records = recordsFor(world);
  const profile = context.profileFromRecords_('2026-27','1A',1,records,[]);
  assert.equal(profile.worldProgress.find(w => w.worldId === 'identity').completed, 6);
  assert.equal(profile.worldProgress.find(w => w.worldId === 'polynomial').completed, 0);
  assert.equal(profile.badges.filter(b => b.id.startsWith('stage-identity-') && b.earned).length, 6);
  assert.equal(profile.badges.find(b => b.id === 'identity-master').earned, true);
  assert.equal(profile.badges.find(b => b.id === 'identity-perfect-master').earned, true);
  records[0] = { ...records[0], score:140,firstTryCorrect:14,skippedQuestions:1 };
  const withSkip = context.profileFromRecords_('2026-27','1A',1,records,[]);
  assert.equal(withSkip.badges.find(b => b.id === 'identity-master').earned, true);
  assert.equal(withSkip.badges.find(b => b.id === 'identity-perfect-master').earned, false);
});
test('46-stage perfection retains earned historical awards and their dates', () => {
  const oldRecords = catalog.filter(w => w.id !== 'identity').flatMap(w => recordsFor(w));
  const awards = [{badgeId:'ultimate-perfectionist',earnedAt:'2026-09-18'}];
  const profile = context.profileFromRecords_('2026-27','1A',1,oldRecords,awards), badge = profile.badges.find(b => b.id === 'ultimate-perfectionist');
  assert.equal(badge.earned, true); assert.equal(badge.progress, 40); assert.equal(badge.target, 46); assert.equal(badge.earnedAt, '2026-09-18');
  const complete = context.profileFromRecords_('2026-27','1A',1,[...oldRecords,...recordsFor(world)],awards);
  assert.equal(complete.badges.find(b => b.id === 'ultimate-perfectionist').earned, true);
});
