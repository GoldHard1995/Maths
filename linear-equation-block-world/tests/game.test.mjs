import test from 'node:test';
import assert from 'node:assert/strict';
import {
  equationEquivalent,
  parseExpression,
  parseFraction,
} from '../lib/algebra.ts';
import {
  elapsedSeconds,
  expected,
  gameIds,
  makeQuestions,
  nextQuestion,
  questionKey,
  score,
  skipQuestion,
  startSession,
  submit,
} from '../lib/game.ts';
import { leaderboardUrl, validStudent } from '../lib/leaderboard.ts';

const normalized = (s) =>
  s
    .replaceAll('−', '-')
    .replaceAll('＋', '+')
    .replaceAll('×', '*')
    .replaceAll('÷', '/');
function equationHolds(raw, answer) {
  const [left, right] = normalized(raw).split('='),
    a = parseExpression(left),
    b = parseExpression(right);
  assert.equal(a.ok, true, raw);
  assert.equal(b.ok, true, raw);
  const value = (v) =>
    v.constant.n / v.constant.d +
    (v.coefficients.x.n / v.coefficients.x.d) * (answer.n / answer.d);
  assert.ok(
    Math.abs(value(a.value) - value(b.value)) < 1e-8,
    `${raw} at ${answer.n}/${answer.d}`,
  );
}

test('equation and fraction parsing accepts equivalent forms', () => {
  assert.equal(equationEquivalent('2x+4=10', 'x+2=5'), true);
  assert.equal(equationEquivalent('x+2=5', 'x-2=5'), false);
  assert.deepEqual(parseFraction('-6/8'), { n: -3, d: 4 });
  assert.deepEqual(parseFraction('−3'), { n: -3, d: 1 });
});

test('all games generate valid distinct 5-5-5 rounds', () => {
  for (const game of gameIds)
    for (let run = 0; run < 60; run++) {
      const questions = makeQuestions(game);
      assert.equal(questions.length, 15);
      assert.equal(new Set(questions.map(questionKey)).size, 15);
      questions.forEach((q, index) => {
        assert.equal(q.level, Math.floor(index / 5));
      if (q.kind === 'solve') {
        equationHolds(q.expression, q.answer);
        assert.ok(Math.abs(q.answer.n / q.answer.d) <= 20);
        if (game !== 'fractions') assert.equal(q.answer.d, 1);
        if (game === 'fractions')
          for (const match of q.expression.matchAll(/÷\s*(-?\d+)/g))
            assert.ok(Math.abs(Number(match[1])) >= 2 && Math.abs(Number(match[1])) <= 12, q.expression);
        } else if (q.kind === 'application') {
          equationHolds(q.expected, { n: q.answer, d: 1 });
          assert.ok(q.answer > 0 && q.answer <= 300);
        } else {
          const [left, right] = normalized(q.expected).split('=');
          assert.equal(parseExpression(left).ok, true);
          assert.equal(parseExpression(right).ok, true);
        }
      });
    const text = questions
        .map((q) =>
          q.kind === 'solve' ? q.expression : `${q.prompt} ${q.expected}`,
        )
        .join('\n');
      assert.doesNotMatch(text, /\d+\.\d+/);
    assert.doesNotMatch(text, /(^|[^\d])1x/);
    if (game === 'form-equation' || game === 'applications')
      for (let level = 0; level < 3; level++) {
        const structures = questions
          .slice(level * 5, level * 5 + 5)
          .map((q) => q.prompt.replace(/\d+/g, '#'));
        assert.equal(new Set(structures).size, 5, `${game} level ${level}`);
      }
  }
});

test('replays avoid the previous round', () => {
  for (const game of gameIds) {
    const first = makeQuestions(game),
      second = makeQuestions(game, first),
      old = new Set(first.map(questionKey));
    second.forEach((q) => assert.equal(old.has(questionKey(q)), false));
  }
});

test('fraction answers accept equivalent fractions', () => {
  const q = {
    kind: 'solve',
    level: 2,
    variant: 0,
    prompt: '',
    expression: '2x=1',
    answer: { n: 1, d: 2 },
    fractionInput: true,
  };
  assert.equal(submit(startSession('fractions', [q], 0), '2/4').solved, true);
});

test('application preserves completed steps after later errors', () => {
  const q = {
    kind: 'application',
    level: 0,
    variant: 0,
    prompt: '',
    expected: '2x=8',
    choices: [],
    direct: false,
    answer: 4,
    unit: '本',
    unitChoices: ['本', '件'],
  };
  let s = startSession('applications', [q], 0);
  s = submit(s, 'x=4');
  assert.equal(s.stage, 1);
  s = submit(s, '5');
  assert.equal(s.stage, 1);
  s = submit(s, '4');
  assert.equal(s.stage, 2);
  s = submit(s, '件');
  assert.equal(s.stage, 2);
  s = submit(s, '本');
  assert.equal(s.finished, true);
  assert.equal(score(s), 5);
});

test('comprehensive questions can be skipped without errors or points', () => {
  const questions = makeQuestions('simple');
  let s = { ...startSession('simple', questions, 0), index: 10, firstTry: 10 };
  s = skipQuestion(s, 5000);
  assert.equal(s.index, 11);
  assert.equal(s.solved, false);
  assert.equal(s.finished, false);
  assert.equal(s.skipped, 1);
  assert.equal(s.errors, 0);
  assert.equal(s.questionErrors, 0);
  assert.equal(s.stageErrors, 0);
  assert.equal(s.firstTry, 10);
  assert.equal(s.currentFirstTryStreak, 0);
  assert.equal(score(s), 100);
  assert.equal(nextQuestion(s), s);
});

test('skipping the final comprehensive question completes the round', () => {
  const questions = makeQuestions('applications');
  let s = { ...startSession('applications', questions, 0), index: 14, firstTry: 14 };
  s = skipQuestion(s, 7000);
  assert.equal(s.index, 14);
  assert.equal(s.solved, true);
  assert.equal(s.finished, true);
  assert.equal(s.skipped, 1);
  assert.equal(s.completedAt, 7000);
  assert.equal(score(s), 140);
});

test('skip is unavailable before comprehensive questions', () => {
  const s = startSession('simple', makeQuestions('simple'), 0);
  assert.deepEqual(skipQuestion(s, 1000), s);
});

test('every generated question completes and timing freezes', () => {
  for (const game of gameIds) {
    let s = startSession(game, undefined, 1000);
    while (!s.finished) {
      s = submit(s, expected(s), 6500);
      if (s.solved && !s.finished) s = nextQuestion(s);
    }
    assert.equal(s.firstTry, 15);
    assert.equal(score(s), 150);
    assert.equal(elapsedSeconds(s, 90000), 5);
  }
});

test('platform identity rules remain unchanged', () => {
  assert.match(leaderboardUrl, /\/exec$/);
  assert.equal(validStudent('1A', 1), true);
  assert.equal(validStudent('1D', 33), true);
  assert.equal(validStudent('1E', 1), false);
});
