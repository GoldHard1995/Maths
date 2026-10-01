import test from 'node:test';
import assert from 'node:assert/strict';
import {
  elapsedSeconds,
  expected,
  gameIds,
  makeQuestions,
  nextQuestion,
  questionKey,
  roundAt,
  roundSig,
  score,
  skipQuestion,
  startSession,
  submit,
} from '../lib/game.ts';
test('every game creates the agreed difficulty distribution with unique questions', () => {
  for (const game of gameIds)
    for (let run = 0; run < 80; run++) {
      const qs = makeQuestions(game);
      assert.equal(qs.length, 15);
      assert.deepEqual(
        qs.map((q) => q.level),
        game === 'place-value'
          ? [0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1]
          : [0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2],
      );
      assert.equal(new Set(qs.map(questionKey)).size, 15);
    }
});
test('replay excludes the previous round', () => {
  for (const game of gameIds) {
    const first = makeQuestions(game),
      second = makeQuestions(game, first),
      old = new Set(first.map(questionKey));
    second.forEach((q) => assert.equal(old.has(questionKey(q)), false));
  }
});
test('all intended answers complete every generated game', () => {
  for (const game of gameIds) {
    let s = startSession(game);
    while (!s.finished) {
      s = submit(s, expected(s));
      while (!s.solved) s = submit(s, expected(s));
      if (!s.finished) s = nextQuestion(s);
    }
    assert.equal(s.firstTry, 15);
    assert.equal(score(s), 150);
  }
});
test('significant-figure answers can preserve trailing zeroes', () => {
  let found = false;
  for (let run = 0; run < 200; run++)
    for (const q of makeQuestions('significant-rounding'))
      if (/\.\d*0$/.test(q.answer)) {
        found = true;
        assert.notEqual(q.answer, String(Number(q.answer)));
      }
  assert.equal(found, true);
});
test('only comprehensive questions may be skipped', () => {
  let s = startSession('rounding', makeQuestions('rounding'), 1000);
  assert.equal(skipQuestion(s), s);
  for (let i = 0; i < 10; i++) {
    s = submit(s, expected(s), 2000 + i);
    if (i < 9) s = nextQuestion(s);
  }
  s = nextQuestion(s);
  s = skipQuestion(s, 12000);
  assert.equal(s.skipped, 1);
  assert.equal(score(s), 100);
  assert.equal(elapsedSeconds(s, 90000), 89);
});
test('generated text uses real superscripts instead of caret notation', () => {
  for (const game of gameIds)
    for (const q of makeQuestions(game))
      assert.doesNotMatch(
        `${q.prompt}${q.expression}${q.instruction}`,
        /\^[0-9n]/,
      );
});
test('rounding helpers handle direction, decimal places and significant trailing zeroes', () => {
  assert.equal(roundAt(12.3456, -2, 'round'), '12.35');
  assert.equal(roundAt(12.3401, -2, 'up'), '12.35');
  assert.equal(roundAt(12.3499, -2, 'down'), '12.34');
  assert.equal(roundSig('0.012349', 3), '0.0123');
  assert.equal(roundSig('1.196', 3), '1.20');
  assert.equal(roundSig('999.1', 3, 'up'), '1000');
});
test('generated numbers stay within 50000 and six decimal places', () => {
  for (const game of gameIds)
    for (let run = 0; run < 80; run++)
      for (const q of makeQuestions(game)) {
        for (const token of q.expression.match(/\d+(?:\.\d+)?/g) || []) {
          assert.ok(Number(token) <= 50000, `${game}: ${token}`);
          assert.ok(!token.includes('e'), token);
          assert.ok((token.split('.')[1] || '').length <= 6, token);
        }
        if (
          [
            'rounding',
            'significant-rounding',
            'calculation-estimation',
          ].includes(game)
        )
          assert.notEqual(Number(q.answer), 0);
      }
});
test('all displayed question numbers use at most six significant figures', () => {
  const sixDecimalGames = new Set();
  for (const game of gameIds)
    for (let run = 0; run < 200; run++)
      for (const q of makeQuestions(game)) {
        if (q.level === 1 && /\.\d{6}$/.test(q.expression))
          sixDecimalGames.add(game);
        const displayed = [
          q.prompt,
          q.expression,
          q.instruction,
          q.answer,
          ...(q.choices || []).flatMap((choice) => [
            choice.value,
            choice.label,
          ]),
          ...(q.steps || []).flatMap((step) => [
            step.prompt,
            step.instruction,
            step.answer,
          ]),
        ];
        for (const part of displayed)
          for (const number of part.match(/\d+(?:\.\d+)?/g) || []) {
            const digits = number.includes('.')
              ? number.replace('.', '').replace(/^0+/, '')
              : number.replace(/^0+/, '').replace(/0+$/, '');
            assert.ok(digits.length <= 6, `${game}: ${number} in ${part}`);
          }
      }
  assert.ok(sixDecimalGames.has('place-value'));
  assert.ok(sixDecimalGames.has('rounding'));
});
test('place-value questions select a digit that occurs only once', () => {
  for (let run = 0; run < 120; run++)
    for (const q of makeQuestions('place-value'))
      if (q.level < 2) {
        const target = q.prompt.match(/數字「(\d)」/)?.[1];
        assert.ok(target);
        assert.notEqual(target, '0');
        assert.equal(
          (q.expression.replace('.', '').match(new RegExp(target, 'g')) || [])
            .length,
          1,
          q.expression,
        );
      }
});
test('place-value core answers include the digit multiplier without floating-point tails', () => {
  let sawTenths = false;
  for (let run = 0; run < 120; run++)
    for (const q of makeQuestions('place-value'))
      if (q.level === 1) {
        const target = Number(q.prompt.match(/數字「(\d)」/)?.[1]);
        const index = q.expression.indexOf(String(target));
        const dot = q.expression.indexOf('.');
        const power = index < dot ? dot - index - 1 : dot - index;
        const answer =
          power < 0
            ? (target * 10 ** power).toFixed(-power)
            : String(target * 10 ** power);
        assert.equal(q.answer, answer, q.expression);
        if (power === -1) {
          sawTenths = true;
          assert.doesNotMatch(q.answer, /000000000000000/);
        }
      }
  assert.equal(sawTenths, true);
});
test('rounding wording includes the 0.001 form', () => {
  let found = false;
  for (let run = 0; run < 120; run++)
    if (makeQuestions('rounding').some((q) => q.prompt.includes('0.001')))
      found = true;
  assert.equal(found, true);
});
test('stages 02 to 05 state the rounding target and method clearly', () => {
  for (let run = 0; run < 100; run++) {
    for (const q of makeQuestions('rounding')) {
      assert.match(q.prompt, /(上捨入|下捨入|捨入)至/);
      assert.doesNotMatch(q.prompt, /以.+為界|按精度/);
    }
    for (const q of makeQuestions('significant-rounding'))
      assert.match(q.prompt, /位有效數字/);
    for (const q of makeQuestions('calculation-estimation'))
      assert.match(q.prompt, /捨入至/);
    for (const q of makeQuestions('calculation-estimation'))
      if (q.level === 0 && q.expression.includes('−')) {
        const [left, right] = q.expression.split(' − ').map(Number);
        assert.ok(left >= right, q.expression);
      }
  }
});
test('rounding to the ones place always supplies a decimal digit', () => {
  for (let run = 0; run < 240; run++)
    for (const q of makeQuestions('rounding'))
      if (q.level < 2 && q.prompt.includes('整數'))
        assert.match(q.expression, /\.\d/, q.expression);
});
test('decimal rounding uses numbers at most 50 and large-place rounding shows one decimal place', () => {
  const largePlaces = new Set();
  for (let run = 0; run < 200; run++)
    for (const game of ['rounding', 'calculation-estimation'])
      for (const q of makeQuestions(game)) {
        const values = q.expression.match(/\d+(?:\.\d+)?/g) || [];
        if (
          /捨入至(?:最接近的 )?(?:[一二三四五六]位小數|0\.001|0\.01)/.test(
            q.prompt,
          )
        ) {
          for (const value of values)
            assert.ok(Number(value) <= 50, `${q.prompt} ${q.expression}`);
          assert.ok(Number(q.answer) <= 50, q.expression);
        }
        const place = ['百位', '千位', '萬位'].find((name) =>
          q.prompt.includes(name),
        );
        if (place) {
          largePlaces.add(place);
          for (const value of values.slice(0, q.level === 2 ? 3 : 2))
            assert.match(value, /^\d+\.\d$/, `${q.prompt} ${q.expression}`);
        }
      }
  assert.deepEqual(
    [...largePlaces].sort((a, b) => a.localeCompare(b)),
    ['百位', '千位', '萬位'].sort((a, b) => a.localeCompare(b)),
  );
});
test('every rounding task changes the value being rounded', () => {
  for (let run = 0; run < 200; run++) {
    for (const q of makeQuestions('rounding')) {
      const values = q.expression.match(/\d+(?:\.\d+)?/g).map(Number);
      const original = q.prompt.includes('平均數')
        ? (values[0] + values[1]) / 2
        : q.expression.includes('÷')
          ? values[0] / values[1]
          : q.expression.includes(' + ')
            ? values[0] + values[1]
            : q.expression.includes(' − ')
              ? values[0] - values[1]
              : q.expression.includes(' × ')
                ? values[0] * values[1]
                : values[0];
      assert.notEqual(Number(q.answer), original, q.expression);
    }
    for (const q of makeQuestions('significant-rounding')) {
      const values = q.expression.match(/\d+(?:\.\d+)?/g).map(Number);
      const original = q.level === 2 ? values[0] / values[1] : values[0];
      assert.notEqual(Number(q.answer), original, q.expression);
    }
    for (const q of makeQuestions('calculation-estimation')) {
      const p =
        q.prompt.includes('0.001') || q.prompt.includes('三位小數')
          ? -3
          : q.prompt.includes('萬位')
            ? 4
            : q.prompt.includes('千位')
              ? 3
              : q.prompt.includes('百位')
                ? 2
                : 1;
      const values = q.expression.match(/\d+(?:\.\d+)?/g).map(Number);
      for (const value of values.slice(0, q.level === 2 ? 3 : 2))
        assert.notEqual(
          Number(roundAt(value, p, 'round')),
          value,
          q.expression,
        );
      const exact =
        q.level === 2
          ? (values[0] + values[1] + values[2]) * values[3]
          : q.expression.includes(' ÷ ')
            ? values[0] / values[1]
            : q.expression.includes(' × ')
              ? values[0] * values[1]
              : q.expression.includes(' − ')
                ? values[0] - values[1]
                : values[0] + values[1];
      assert.ok(Math.abs(Number(q.answer) - exact) > 1e-8, q.expression);
    }
  }
});
test('mixed estimation rounds only the numbers inside brackets', () => {
  for (let run = 0; run < 40; run++)
    for (const q of makeQuestions('calculation-estimation').filter(
      (question) => question.level === 2,
    )) {
      const values = q.expression.match(/\d+(?:\.\d+)?/g).map(Number);
      assert.match(q.prompt, /括號內/);
      assert.match(q.prompt, /保持不變|毋須捨入|原來的|不變/);
      assert.ok(q.prompt.includes(String(values[3])));
      assert.equal(
        Number(q.answer),
        values
          .slice(0, 3)
          .reduce((sum, value) => sum + Math.round(value / 100) * 100, 0) *
          values[3],
      );
    }
});
test('place-value has eight basic, seven core, no comprehensive, and six basic choices', () => {
  const questions = makeQuestions('place-value');
  assert.equal(questions.filter((q) => q.level === 0).length, 8);
  assert.equal(questions.filter((q) => q.level === 1).length, 7);
  assert.equal(questions.filter((q) => q.level === 2).length, 0);
  questions
    .filter((q) => q.level === 0)
    .forEach((q) => assert.equal(q.choices?.length, 6));
});
test('rounding comprehensive questions cover five calculation structures', () => {
  const comprehensive = makeQuestions('rounding').filter((q) => q.level === 2);
  assert.equal(new Set(comprehensive.map((q) => q.prompt)).size, 5);
  for (const symbol of ['+', '−', '×', '÷'])
    assert.ok(
      comprehensive.some((q) => q.expression.includes(symbol)),
      symbol,
    );
});
test('rounding comprehensive questions teach trailing zeroes', () => {
  assert.equal(roundAt(0.397, -2, 'round'), '0.40');
  assert.equal(roundAt(0.397, -2, 'up'), '0.40');
  assert.equal(roundAt(0.397, -2, 'down'), '0.39');
  let found = false;
  const actions = new Set();
  for (let run = 0; run < 240; run++)
    for (const q of makeQuestions('rounding'))
      if (q.level === 2 && q.prompt.includes('0.01')) {
        found = true;
        actions.add(q.prompt.match(/(上捨入|下捨入|捨入)至/)?.[1]);
        assert.match(q.answer, /^\d+\.\d{2}$/);
        assert.match(q.instruction, /最後的 0/);
      }
  assert.equal(found, true);
  assert.deepEqual(
    [...actions].sort((a, b) => a.localeCompare(b)),
    ['上捨入', '下捨入', '捨入'].sort((a, b) => a.localeCompare(b)),
  );
});
