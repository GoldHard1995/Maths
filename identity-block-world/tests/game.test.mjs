import test from 'node:test';
import assert from 'node:assert/strict';
import { canonical, equivalent, isExpanded, parseExpression } from '../lib/algebra.ts';
import { gameIds, makeQuestions, questionKey, startSession, submit, expected, nextQuestion, score, skipQuestion, expireSession, elapsedSeconds } from '../lib/game.ts';
import { replayKey, replayQuestions } from '../lib/replay.ts';
import { toLatex } from '../lib/math.ts';

test('fractions compare exactly and render as stacked fractions', () => {
  assert.equal(equivalent('frac{x}{3}＋frac{x}{6}', 'frac{x}{2}'), true);
  assert.equal(equivalent('frac{x}{3}', 'frac{333333x}{1000000}'), false);
  assert.equal(canonical('(frac{x}{2}＋3)²'), 'frac{x²}{4} ＋ 3x ＋ 9');
  assert.equal(toLatex('frac{x²}{4} ＋ 3x'), '\\frac{x^{2}}{4} + 3x');
  for (const raw of ['frac{x}{0}', 'frac{x}{x}', 'x^9', '(', '']) assert.equal(parseExpression(raw).ok, false, raw);
});
test('answers must be expanded and like terms combined', () => {
  for (const raw of ['x²＋3x＋2', '2＋3x＋x²', 'frac{x²}{4}＋3x＋9', '−frac{3xy}{2}＋2']) assert.equal(isExpanded(raw), true, raw);
  for (const raw of ['(x＋1)(x＋2)', 'x＋x＋2', 'frac{x＋1}{2}', 'x*(x+1)']) assert.equal(isExpanded(raw), false, raw);
});
test('four stages generate unique 5-5-5 rounds, with bounded answers and valid choices', () => {
  for (const game of gameIds) {
    let previous = [];
    for (let run = 0; run < 100; run++) {
      const qs = makeQuestions(game, previous), old = new Set(previous.map(questionKey));
      assert.equal(qs.length, 15); assert.equal(new Set(qs.map(questionKey)).size, 15);
      qs.forEach((q, i) => { assert.equal(q.level, Math.floor(i / 5)); assert.equal(old.has(questionKey(q)), false); assert.doesNotMatch(q.expression, /[÷/^]/); });
      for (let level = 0; level < 3; level++) assert.deepEqual(new Set(qs.slice(level * 5, level * 5 + 5).map(q => q.variant)), new Set([0, 1, 2, 3, 4]));
      for (const q of qs) {
        if (q.kind === 'numeric') assert.ok(Number.isInteger(q.answer) && Math.abs(q.answer) <= (game === 'constants' ? 50 : 1000));
        if (q.kind === 'algebra') {
          assert.equal(equivalent(q.expression, q.expected), true, q.expression); assert.equal(isExpanded(q.expected), true, q.expected);
          const parsed = parseExpression(q.expected); assert.equal(parsed.ok, true);
          for (const [key, v] of parsed.value) { assert.ok(key.split(',').map(Number).reduce((a, b) => a + b, 0) <= 2); assert.ok((v.n < 0n ? -v.n : v.n) <= 300n * v.d); }
          if (q.level === 2) assert.equal(q.direct, true);
          else { assert.equal(q.choices.length, 4); assert.equal(q.choices.filter(c => equivalent(c.value, q.expected)).length, 1); }
        }
        if (q.choices) { assert.equal(new Set(q.choices.map(c => c.label)).size, q.choices.length); assert.equal(q.choices.filter(c => c.value === q.expected).length, 1); }
      }
      previous = qs;
    }
  }
});
test('all generated expected answers complete a full-score session', () => {
  for (const game of gameIds) { let s = startSession(game); while (!s.finished) { s = submit(s, expected(s)); assert.equal(s.solved, true, `${game}: ${s.feedback}`); if (!s.finished) s = nextQuestion(s); } assert.equal(score(s), 150); assert.equal(s.firstTry, 15); }
});
test('unknown constants have the intended uniquely determined answer', () => {
  for (let run = 0; run < 12; run++) for (const q of makeQuestions('constants')) {
    const target = q.instruction.match(/輸入 ([ABC])/)[1], [left, right] = q.expression.split(' ≡ '), x = q.usedVariables[0];
    const all = [];
    // Solve the coefficient equations as a small exact linear system where possible.
    if (q.level < 2) {
      const expanded = canonical(right), coefficients = parseExpression(expanded).value, index = ['x','y','a','b'].indexOf(x);
      const key = power => [0,0,0,0].map((_, i) => i === index ? power : 0).join(',');
      const power = {A:2, B:1, C:0}[target], r = coefficients.get(key(power));
      assert.equal(q.answer, r ? Number(r.n / r.d) : 0);
    } else {
      for (let A = -6; A <= 6; A++) {
        if (!A) continue;
        if (q.variant >= 3) {
          for (let B = -5; B <= 5; B++) { if (!B) continue; if (equivalent(left.replaceAll('A', String(A)).replaceAll('B', String(B)), right)) all.push({A,B}); }
        } else {
          const lhs0 = parseExpression(left.replaceAll('A', String(A)).replaceAll('C', '0')).value;
          const rhs0 = parseExpression(right.replaceAll('B', '0')).value;
          const constantKey = '0,0,0,0', lc = lhs0.get(constantKey), rc = rhs0.get(constantKey), C = Number(rc?.n || 0n) - Number(lc?.n || 0n);
          for (let B = -50; B <= 50; B++) if (equivalent(left.replaceAll('A', String(A)).replaceAll('C', String(C)), right.replaceAll('B', String(B)))) all.push({A,B,C});
        }
      }
      assert.equal(all.length, 1, q.expression); assert.equal(all[0][target], q.answer, q.expression);
    }
  }
});
test('retry, skip, malformed input and timeout preserve scoring and frozen time', () => {
  const qs = Array.from({ length: 15 }, (_, i) => ({kind:'numeric',level:Math.floor(i/5),variant:i%5,prompt:'',expression:'',instruction:'',hint:'檢查正負號',usedVariables:[],answer:i+1}));
  let s = startSession('constants', qs, 1000);
  assert.equal(skipQuestion(s), s); assert.equal(submit(s, '').errors, 0);
  s = submit(s, '99', 2000); assert.equal(s.errors, 1); s = submit(s, '1', 3000); assert.equal(score(s), 5);
  for (let i = 1; i < 10; i++) { s = nextQuestion(s); s = submit(s, String(i + 1), 4000); }
  s = nextQuestion(s); s = skipQuestion(s); assert.equal(s.skipped, 1); assert.equal(score(s), 95);
  const expired = expireSession(s, 5000); assert.equal(expired.expired, true); assert.equal(score(expired), 95); assert.equal(elapsedSeconds(expired, 9000), 4); assert.equal(submit(expired, '12'), expired);
});
test('replay history survives a page restart and is isolated by student and stage', () => {
  const saved = new Map(), storage = {getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v)}, query = '?schoolYear=2026-27&className=1A&studentNo=1';
  const first = replayQuestions('square-sum', query, storage), second = replayQuestions('square-sum', query, storage), old = new Set(first.map(questionKey));
  assert.equal(second.some(q => old.has(questionKey(q))), false);
  assert.notEqual(replayKey('square-sum', query), replayKey('square-difference', query));
  assert.notEqual(replayKey('square-sum', query), replayKey('square-sum', query.replace('studentNo=1','studentNo=2')));
  const broken = {getItem:()=>'{bad',setItem:()=>{throw Error('blocked');}};
  assert.equal(replayQuestions('square-sum', query, broken).length, 15);
});
