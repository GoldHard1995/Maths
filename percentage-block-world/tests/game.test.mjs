import test from 'node:test';
import assert from 'node:assert/strict';
import { gameIds, makeQuestions, questionKey, parseAnswer, answerEquals, startSession, submit, expected, skipQuestion, nextQuestion, expireSession, score, elapsedSeconds } from '../lib/game.ts';
import { previousRoundKey, readPreviousRound, savePreviousRound } from '../lib/previous-round.ts';

function assertValue(q, numerator, denominator = 1) {
  const parsed = parseAnswer(q.answer);
  assert.ok(parsed, q.answer);
  assert.equal(parsed[0] * denominator, numerator * parsed[1], `${q.template}: ${q.prompt} ${q.expression || ''}`);
}
function verifyMathematics(q, game) {
  const f = q.facts;
  switch (q.template) {
    case 'to-decimal': case 'percent-to-fraction': assertValue(q, f.rate, 100); break;
    case 'decimal-to-percent': case 'fraction-to-percent': assertValue(q, f.rate); break;
    case 'percent-arithmetic': case 'one-plus-minus': assertValue(q, f.a + f.sign * f.b); break;
    case 'part-rate': assertValue(q, f.part * 100, f.total); break;
    case 'remaining-rate': assertValue(q, (f.total - f.part) * 100, f.total); break;
    case 'part': assertValue(q, f.total * f.rate, 100); break;
    case 'whole': assertValue(q, f.part * 100, f.rate); break;
    case 'remaining-part': case 'other-part': assertValue(q, f.total - f.part); break;
    case 'remaining-whole': assertValue(q, (f.total - f.part) * 100, 100 - f.rate); break;
    case 'nested-part': assertValue(q, f.total * f.rate * f.innerRate, 10000); break;
    case 'nested-whole': assertValue(q, f.inner * 10000, f.rate * f.innerRate); break;
    case 'nested-other': assertValue(q, f.inner * 10000 * (100 - f.rate), f.rate * f.innerRate * 100); break;
    case 'change-amount': assertValue(q, Math.abs(f.next - f.original)); break;
    case 'change-new': case 'change-new-from-amount': assertValue(q, f.original * (100 + (game === 'increase' ? f.rate : -f.rate)), 100); break;
    case 'change-rate': case 'change-rate-from-amount': assertValue(q, Math.abs(f.next - f.original) * 100, f.original); break;
    case 'change-original-from-amount': assertValue(q, f.amount * 100, f.rate); break;
    case 'change-original-from-new': assertValue(q, f.next * 100, 100 + (game === 'increase' ? f.rate : -f.rate)); break;
    case 'trade-amount': assertValue(q, Math.abs(f.sale - f.cost)); break;
    case 'trade-sale': assertValue(q, f.cost * (100 + (f.profit ? f.rate : -f.rate)), 100); break;
    case 'trade-rate': assertValue(q, Math.abs(f.sale - f.cost) * 100, f.cost); break;
    case 'trade-cost-from-amount': assertValue(q, f.amount * 100, f.rate); break;
    case 'trade-cost-from-sale': assertValue(q, f.sale * 100, 100 + (f.profit ? f.rate : -f.rate)); break;
    case 'batch-profit-rate': case 'spoiled-loss-rate': assertValue(q, Math.abs(f.sold * f.unitSale - f.count * f.unitCost) * 100, f.count * f.unitCost); break;
    case 'fold-to-rate': assertValue(q, 100 - f.paidRate); break;
    case 'rate-to-fold': assertValue(q, 100 - f.rate, 10); break;
    case 'discount-sale': assertValue(q, f.marked * (100 - f.rate), 100); break;
    case 'discount-saving': assertValue(q, f.marked * f.rate, 100); break;
    case 'discount-rate': assertValue(q, (f.marked - f.sale) * 100, f.marked); break;
    case 'discount-marked': assertValue(q, f.sale * 100, 100 - f.rate); break;
    case 'discount-total': assertValue(q, f.count * f.marked * (100 - f.rate), 100); break;
    case 'discount-saved-total': assertValue(q, f.count * f.marked * f.rate, 100); break;
    case 'discount-trade-marked': assertValue(q, (f.cost + (f.profit ? f.amount : -f.amount)) * 100, 100 - f.rate); break;
    default: assert.fail(`Missing independent calculation: ${q.template}`);
  }
}
function verifyLife(q, game) {
  const f = q.facts;
  assert.ok(!/花田|種子|花束/.test(q.prompt), q.prompt);
  if (game === 'conversion') {
    if (f.rate) assert.ok(Number.isInteger(f.rate) && f.rate >= 1 && f.rate <= 300);
    if (q.unit === '%') assert.ok(Number.isInteger(Number(q.answer)) && Number(q.answer) >= 1 && Number(q.answer) <= 300);
    return;
  }
  for (const value of Object.values(f)) assert.ok(Number.isInteger(value) && value >= 0 && value <= 1000, `${game}: ${JSON.stringify(f)}`);
  if (game === 'applications') {
    assert.ok(f.total >= 20 && f.total <= 1000 && f.part > 0 && f.part < f.total);
    assert.equal(f.total * f.rate, f.part * 100);
    if (f.inner !== undefined) { assert.ok(f.inner > 0 && f.inner < f.part); assert.equal(f.part * f.innerRate, f.inner * 100); }
    if (q.prompt.includes('某學校')) {
      assert.ok(f.total >= 200 && f.rate <= 40);
      if (f.inner !== undefined) assert.ok(f.inner >= 5 && f.inner <= 60);
    }
  }
  if (game === 'increase' || game === 'decrease') {
    assert.ok(f.original >= 1 && f.next >= 1 && f.amount >= 1);
    assert.equal(Math.abs(f.next - f.original), f.amount);
    assert.equal(f.original * f.rate, f.amount * 100);
    assert.equal(f.next > f.original, game === 'increase');
    if (q.prompt.includes('學生人數')) { assert.ok(f.original >= 200); assert.ok(f.rate <= 30); }
    if (q.prompt.includes('筆記簿')) assert.ok(f.original >= 5 && f.original <= 80);
    if (game === 'decrease' && q.prompt.includes('售價') && f.rate > 50) assert.match(q.prompt, /清貨/);
  }
  if (game === 'profit-loss') {
    assert.ok(f.cost > 0 && f.sale > 0 && f.amount > 0 && f.rate > 0);
    assert.equal(f.sale > f.cost, Boolean(f.profit));
    assert.equal(f.amount * 100, f.cost * f.rate);
    assert.ok(f.rate <= (f.profit ? 100 : 99));
    if (f.count) {
      assert.ok(f.count >= 2 && f.count <= 50);
      assert.equal(f.cost, f.count * f.unitCost);
      assert.equal(f.sale, f.sold * f.unitSale);
      assert.equal(f.sold + f.spoiled, f.count);
      assert.ok(f.sold > 0);
      if (f.spoiled) { assert.ok(f.spoiled < f.count); assert.equal(f.profit, 0); assert.match(q.prompt, /沒有回收收入/); }
    }
  }
  if (game === 'discount') {
    assert.ok(f.rate >= 5 && f.rate <= 90 && f.rate % 5 === 0);
    assert.equal(f.paidRate, 100 - f.rate);
    if (f.marked) { assert.ok(f.marked > f.sale && f.sale > 0); assert.equal(f.marked * f.paidRate, f.sale * 100); }
    if (f.count) { assert.ok(f.count >= 2 && f.count <= 10); assert.ok(f.count * f.marked <= 1000); }
    if (f.cost) { assert.equal(f.sale > f.cost, Boolean(f.profit)); assert.equal(Math.abs(f.sale - f.cost), f.amount); assert.ok(f.marked <= f.cost * 3); }
  }
}

for (const game of gameIds) {
  test(`${game}: 1000 rounds preserve allocations, mathematics, life constraints and replay exclusion`, () => {
    let previous = [];
    const kinds = new Set(), seen = new Set();
    for (let round = 0; round < 1000; round++) {
      const questions = makeQuestions(game, previous);
      assert.equal(questions.length, 15);
      assert.equal(new Set(questions.map(questionKey)).size, 15);
      const old = new Set(previous.map(questionKey));
      for (let level = 0; level < 3; level++) {
        const part = questions.slice(level * 5, level * 5 + 5);
        assert.deepEqual(new Set(part.map(q => q.variant)), new Set([0, 1, 2, 3, 4]));
        if (game === 'profit-loss') assert.equal(part.filter(q => q.facts.profit === 1).length, 3);
      }
      questions.forEach((q, index) => {
        assert.equal(q.level, Math.floor(index / 5));
        assert.equal(old.has(questionKey(q)), false);
        assert.equal(q.kind, index < (game === 'conversion' || game === 'applications' ? 10 : 5) ? 'choice' : 'numeric');
        if (q.kind === 'choice') {
          assert.equal(q.choices.length, 4);
          assert.equal(new Set(q.choices.map(c => c.label)).size, 4);
          assert.equal(q.choices.filter(c => answerEquals(c.value, q.answer)).length, 1);
          if (game !== 'conversion' && q.unit !== '折') {
            for (const c of q.choices) {
              const [n,d] = parseAnswer(c.value);
              assert.ok(n >= d && n % d === 0, `${game}: non-integer distractor ${c.value}`);
              assert.ok(n / d <= (q.unit === '%' ? 100 : game === 'applications' ? q.facts.total : 1000));
            }
          }
        }
        if (q.level < 2 && game !== 'conversion') {
          assert.ok(!/求原值|求成本|求標價|全部共有多少/.test(q.prompt), q.prompt);
          assert.ok(!['whole','remaining-whole','other-part','change-original-from-amount','change-original-from-new','change-new-from-amount','trade-cost-from-amount','trade-cost-from-sale','discount-marked','discount-trade-marked'].includes(q.template), q.template);
        }
        verifyMathematics(q, game); verifyLife(q, game);
        kinds.add(q.template); seen.add(q.prompt + (q.expression || ''));
      });
      previous = questions;
    }
    assert.ok(kinds.size >= 4);
    assert.ok(seen.size > 100);
  });
}

test('numeric comparison is exact and accepts harmless leading and trailing zeroes', () => {
  assert.equal(answerEquals('0.07', '7/100'), true);
  assert.equal(answerEquals('025.00', '25'), true);
  assert.equal(answerEquals('0.70', '0.7'), true);
  assert.equal(answerEquals('0.07', '0.7'), false);
  for (const value of ['', '.', '1e2', '25%', '$20', '2/0', 'NaN', 'Infinity', '0.001']) assert.equal(parseAnswer(value), null);
});

test('worked examples cover inverse proportions, nested groups, spoiled stock and combined discount', () => {
  const examples = [
    ['applications', 'nested-whole', {total:300,part:120,rate:40,innerRate:25,inner:30}, '300'],
    ['increase', 'change-original-from-new', {original:300,next:360,rate:20,amount:60}, '300'],
    ['decrease', 'change-original-from-new', {original:600,next:540,rate:10,amount:60}, '600'],
    ['profit-loss', 'batch-profit-rate', {count:20,unitCost:20,unitSale:25,sold:20,spoiled:0}, '25'],
    ['profit-loss', 'spoiled-loss-rate', {count:20,unitCost:5,unitSale:5,sold:15,spoiled:5}, '25'],
    ['discount', 'discount-trade-marked', {cost:200,amount:40,profit:1,rate:20}, '300'],
  ];
  for (const [game, template, facts, answer] of examples) verifyMathematics({template,facts,answer,prompt:'Worked example'}, game);
});

test('all intended answers complete every game at full score', () => {
  for (const game of gameIds) {
    let session = startSession(game, makeQuestions(game), 1000);
    while (!session.finished) { session = submit(session, expected(session), 10000); assert.equal(session.solved, true); if (!session.finished) session = nextQuestion(session); }
    assert.equal(score(session), 150); assert.equal(session.firstTry, 15); assert.equal(session.longestFirstTryStreak, 15);
    assert.equal(elapsedSeconds(session, 50000), 9);
  }
});

test('wrong answers, empty inputs, retries, skip eligibility and timeout retain scoring', () => {
  let s = startSession('increase', makeQuestions('increase'), 1000);
  assert.equal(skipQuestion(s), s);
  assert.equal(submit(s, '').errors, 0);
  s = submit(s, '9999'); assert.equal(s.errors, 1); assert.ok(s.feedback.includes(s.questions[0].hint));
  s = submit(s, expected(s)); assert.equal(score(s), 5);
  for (let i = 1; i < 10; i++) { s = nextQuestion(s); s = submit(s, expected(s)); }
  s = nextQuestion(s); s = skipQuestion(s); assert.equal(s.skipped, 1); assert.equal(score(s), 95);
  while (!s.finished) { s = nextQuestion(s); s = submit(s, expected(s), 6500); }
  assert.equal(score(s), 135); assert.equal(s.firstTry, 13); assert.equal(elapsedSeconds(s, 99000), 5);
  assert.equal(submit(s, '1'), s);
  let solved = startSession('conversion', makeQuestions('conversion'), 1000); solved = submit(solved, expected(solved), 2000);
  const expired = expireSession(solved, 3601000);
  assert.equal(expired.expired, true); assert.equal(expired.solved, true); assert.equal(score(expired), 10); assert.equal(elapsedSeconds(expired, 9999999), 3600);
});

test('tab storage persists replays and isolates student, year, stage and guest', () => {
  const values = new Map(), storage = {getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)};
  const query = '?schoolYear=2026-27&className=1A&studentNo=1', key = previousRoundKey('conversion', query);
  const first = makeQuestions('conversion'); savePreviousRound(storage, key, first);
  const reloaded = readPreviousRound(storage, key), second = makeQuestions('conversion', reloaded);
  assert.equal(second.some(q => reloaded.includes(questionKey(q))), false);
  for (const next of ['?schoolYear=2026-27&className=1A&studentNo=2','?schoolYear=2027-28&className=1A&studentNo=1','']) assert.notEqual(previousRoundKey('conversion', next), key);
  assert.notEqual(previousRoundKey('applications', query), key);
  values.set(key, 'broken'); assert.deepEqual(readPreviousRound(storage, key), []);
  assert.doesNotThrow(() => savePreviousRound({setItem(){throw new Error('disabled')}}, key, first));
});
