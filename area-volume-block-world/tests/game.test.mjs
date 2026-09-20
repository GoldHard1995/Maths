// oxlint-disable typescript/no-floating-promises -- node:test registers each returned test promise.
import test from 'node:test';
import assert from 'node:assert/strict';
import { canSkip, elapsedSeconds, expected, expireSession, GAME_TIME_LIMIT_SECONDS, gameIds, makeQuestions, nextQuestion, questionKey, score, skipQuestion, startSession, submit } from '../lib/game.ts';
import { leaderboardUrl, personalBestMessage, validStudent } from '../lib/leaderboard.ts';

test('four stages use the approved identifiers', () => {
  assert.deepEqual(gameIds, ['area-composite', 'uniform-cross-section', 'prism-volume', 'total-surface-area']);
});

test('every stage generates 15 unique questions and avoids the previous round', () => {
  for (const game of gameIds) {
    const first = makeQuestions(game);
    const second = makeQuestions(game, first);
    assert.equal(first.length, 15);
    assert.equal(new Set(first.map(questionKey)).size, 15);
    const previous = new Set(first.map(questionKey));
    second.forEach(question => assert.equal(previous.has(questionKey(question)), false));
  }
});

test('area stage fixes the first five shapes and uses 5-5-5 levels', () => {
  const questions = makeQuestions('area-composite');
  assert.deepEqual(questions.slice(0, 5).map(question => question.diagram.variant), ['square', 'rectangle', 'triangle', 'trapezium', 'parallelogram']);
  assert.deepEqual(questions.map(question => question.level), [...Array(5).fill('basic'), ...Array(5).fill('core'), ...Array(5).fill('comprehensive')]);
});

test('uniform cross-section uses 7 basic and 8 core questions with no skip', () => {
  const questions = makeQuestions('uniform-cross-section');
  assert.equal(questions.filter(question => question.level === 'basic').length, 7);
  assert.equal(questions.filter(question => question.level === 'core').length, 8);
  assert.equal(canSkip({ ...startSession('uniform-cross-section', questions), index: 14 }), false);
});

test('volume basics include one cube, two cuboids and two other prisms', () => {
  const variants = makeQuestions('prism-volume').slice(0, 5).map(question => question.diagram.variant);
  assert.deepEqual(variants, ['cube', 'cuboid', 'cuboid', 'triangular-prism', 'trapezium-prism']);
});

test('numeric questions obey integer and answer-range rules', () => {
  for (const game of ['area-composite', 'prism-volume', 'total-surface-area']) {
    for (let run = 0; run < 100; run++) {
      for (const question of makeQuestions(game)) {
        assert.equal(question.kind, 'numeric');
        assert.equal(Number.isInteger(question.answer), true);
        assert.ok(question.answer >= 0 && question.answer <= 9999);
        if (question.unit === 'cm²') assert.ok(question.answer <= (game === 'total-surface-area' ? 6000 : 1000));
        if (question.unit === 'cm³') assert.ok(question.answer <= 6000);
        assert.doesNotMatch(`${question.prompt}${question.unit}`, /\^\d/);
      }
    }
  }
});

test('two-step cross-section answers require existence then shape', () => {
  const question = makeQuestions('uniform-cross-section').find(item => item.kind === 'cross-section' && !item.directShape && item.hasUniform);
  assert.ok(question);
  let session = startSession('uniform-cross-section', [question]);
  session = submit(session, 'yes');
  assert.equal(session.stage, 1);
  assert.equal(session.solved, false);
  session = submit(session, question.shape);
  assert.equal(session.solved, true);
});

test('all intended answers are accepted for a perfect 150 score', () => {
  for (const game of gameIds) {
    let session = startSession(game);
    while (!session.finished) {
      session = submit(session, expected(session));
      if (!session.solved && session.stage === 1) session = submit(session, expected(session));
      assert.equal(session.solved, true, `${game}: ${session.feedback}`);
      if (!session.finished) session = nextQuestion(session);
    }
    assert.equal(session.firstTry, 15);
    assert.equal(score(session), 150);
  }
});

test('retry gives 5 points and comprehensive questions can be skipped', () => {
  let session = startSession('area-composite');
  session = submit(session, String(Number(expected(session)) + 1));
  session = submit(session, expected(session));
  assert.equal(score(session), 5);
  session = { ...session, index: 10, solved: false, questionErrors: 0 };
  assert.equal(canSkip(session), true);
  session = skipQuestion(session);
  assert.equal(session.skipped, 1);
});

test('sessions expire after one hour and elapsed time freezes', () => {
  const start = 1000;
  const expired = expireSession(startSession('area-composite', makeQuestions('area-composite'), start), start + GAME_TIME_LIMIT_SECONDS * 1000);
  assert.equal(expired.finished, true);
  assert.equal(expired.expired, true);
  assert.equal(elapsedSeconds(expired, start + 9999999), GAME_TIME_LIMIT_SECONDS);
});

test('shared platform connection and student limits remain valid', () => {
  assert.match(leaderboardUrl, /\/exec$/);
  assert.equal(validStudent('1A', 1), true);
  assert.equal(validStudent('1D', 33), true);
  assert.equal(validStudent('1E', 1), false);
});

test('personal-best messages cover all outcomes', () => {
  const current = { gameId: 'area-composite', score: 140, maxScore: 150, elapsedSeconds: 220 };
  const previous = { ...current, score: 130, elapsedSeconds: 250 };
  assert.equal(personalBestMessage({ personalBest: current, previousPersonalBest: null, isNewPersonalBest: true }), '建立首個個人紀錄');
  assert.equal(personalBestMessage({ personalBest: current, previousPersonalBest: previous, isNewPersonalBest: true }), '刷新個人紀錄！比上次多 10 分');
  assert.equal(personalBestMessage({ personalBest: current, previousPersonalBest: { ...current, elapsedSeconds: 238 }, isNewPersonalBest: true }), '刷新個人紀錄！比上次快 18 秒');
  assert.equal(personalBestMessage({ personalBest: current, previousPersonalBest: current, isNewPersonalBest: false }), '個人最佳：140 分 · 3:40');
});
