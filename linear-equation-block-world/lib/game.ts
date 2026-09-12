import { equationEquivalent, parseFraction, type Fraction } from './algebra.ts';

export type GameId =
  | 'simple'
  | 'like-terms'
  | 'brackets'
  | 'fractions'
  | 'form-equation'
  | 'applications';
export const gameIds: GameId[] = [
  'simple',
  'like-terms',
  'brackets',
  'fractions',
  'form-equation',
  'applications',
];
export type Choice = { value: string; label: string };
export type SolveQuestion = {
  kind: 'solve';
  level: number;
  variant: number;
  prompt: string;
  expression: string;
  answer: Fraction;
  fractionInput: boolean;
};
export type EquationQuestion = {
  kind: 'equation';
  level: number;
  variant: number;
  prompt: string;
  expected: string;
  choices?: Choice[];
  direct: boolean;
};
export type ApplicationQuestion = {
  kind: 'application';
  level: number;
  variant: number;
  prompt: string;
  expected: string;
  choices?: Choice[];
  direct: boolean;
  answer: number;
  unit: string;
  unitChoices: string[];
};
export type Question = SolveQuestion | EquationQuestion | ApplicationQuestion;
export type Session = {
  game: GameId;
  questions: Question[];
  index: number;
  stage: number;
  errors: number;
  stageErrors: number;
  firstTry: number;
  questionErrors: number;
  skipped: number;
  currentFirstTryStreak: number;
  longestFirstTryStreak: number;
  solved: boolean;
  finished: boolean;
  feedback: string;
  selectedEquation: string;
  startedAt: number;
  completedAt: number | null;
};

const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)],
  rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const nz = (a: number, b: number) => {
  let n = 0;
  while (!n) n = rand(a, b);
  return n;
};
const shuffle = <T>(xs: T[]) => {
  const out = [...xs];
  for (let i = out.length - 1; i; i--) {
    const j = rand(0, i);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
};
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a)),
  fraction = (n: number, d = 1): Fraction => {
    const s = d < 0 ? -1 : 1,
      g = gcd(n, d) || 1;
    return { n: (s * n) / g, d: Math.abs(d) / g };
  };
const addFraction = (a: Fraction, b: Fraction) =>
  fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const divideFraction = (a: Fraction, b: number) => fraction(a.n, a.d * b);
const fractionDisplay = (a: Fraction) =>
  a.d === 1 ? String(a.n) : `${a.n} ÷ ${a.d}`;
const signed = (n: number) => (n < 0 ? `−${Math.abs(n)}` : String(n)),
  add = (n: number) => (n < 0 ? ` − ${Math.abs(n)}` : ` ＋ ${n}`),
  cx = (n: number) => (n === 1 ? 'x' : n === -1 ? '−x' : `${signed(n)}x`);
const answerText = (a: Fraction) => (a.d === 1 ? String(a.n) : `${a.n}/${a.d}`);
const choices = (answer: string, wrong: string[]) =>
  shuffle(
    [
      answer,
      ...wrong
        .filter((v, i, a) => a.indexOf(v) === i && v !== answer)
        .slice(0, 3),
    ].map((value) => ({
      value,
      label: value.replaceAll('-', '−').replaceAll('*', '×'),
    })),
  );
const solve = (
  level: number,
  variant: number,
  expression: string,
  answer: Fraction,
  fractionInput = false,
  prompt = '解下列方程。',
): SolveQuestion => ({
  kind: 'solve',
  level,
  variant,
  prompt,
  expression,
  answer,
  fractionInput,
});

function simple(level: number, v: number) {
  const x = nz(-20, 20),
    a = nz(-12, 12),
    b = nz(-12, 12),
    c = nz(-12, 12);
  if (level === 0) {
    const forms = [
      `x ${add(a)} = ${x + a}`,
      `${cx(a)} = ${a * x}`,
      `${a} ＋ x = ${a + x}`,
      `${a * x} = ${cx(a)}`,
      `x ${add(-a)} = ${x - a}`,
    ];
    return solve(level, v, forms[v % 5], fraction(x));
  }
  if (level === 1) {
    const r = a * x + b,
      forms = [
        `${cx(a)} ${add(b)} = ${r}`,
        `${b} ＋ ${cx(a)} = ${r}`,
        `${r} = ${cx(a)} ${add(b)}`,
        `${cx(a)} = ${r - b}`,
        `${b} − ${cx(-a)} = ${r}`,
      ];
    return solve(level, v, forms[v % 5], fraction(x));
  }
  const r = a * x + b + c,
    forms = [
      `${cx(a)} ${add(b)} ${add(c)} = ${r}`,
      `${b} ${add(c)} ＋ ${cx(a)} = ${r}`,
      `${r} = ${c} ＋ ${cx(a)} ${add(b)}`,
      `${cx(a)} ${add(c)} ${add(b)} = ${r}`,
      `${b} ＋ ${cx(a)} ${add(c)} = ${r}`,
    ];
  return solve(level, v, forms[v % 5], fraction(x));
}

function likeTerms(level: number, v: number) {
  const x = nz(-20, 20),
    a = nz(-12, 12),
    b = nz(-12, 12),
    c = nz(-10, 10),
    d = nz(-10, 10);
  if (level === 0)
    return solve(
      level,
      v,
      v % 2
        ? `${cx(b)} ＋ ${cx(a)} = ${(a + b) * x}`
        : `${cx(a)} ＋ ${cx(b)} = ${(a + b) * x}`,
      fraction(x),
      false,
      '先合併同類項，再解方程。',
    );
  if (level === 1) {
    const r = (a + b) * x + c + d;
    return solve(
      level,
      v,
      v % 2
        ? `${c} ＋ ${cx(a)} ${add(d)} ＋ ${cx(b)} = ${r}`
        : `${cx(a)} ${add(c)} ＋ ${cx(b)} ${add(d)} = ${r}`,
      fraction(x),
      false,
      '先合併未知數項和常數項，再解方程。',
    );
  }
  let e = nz(-10, 10);
  while (e === a + b) e = nz(-10, 10);
  const k = (a + b - e) * x + c;
  return solve(
    level,
    v,
    v % 2
      ? `${cx(e)} ${add(k)} = ${cx(b)} ${add(c)} ＋ ${cx(a)}`
      : `${cx(a)} ${add(c)} ＋ ${cx(b)} = ${cx(e)} ${add(k)}`,
    fraction(x),
    false,
    '整理方程兩邊的同類項，再解方程。',
  );
}

function brackets(level: number, v: number) {
  const x = nz(-20, 20),
    a = pick([-6, -5, -4, -3, -2, 2, 3, 4, 5, 6]),
    b = nz(-8, 8),
    c = nz(-8, 8);
  if (level === 0)
    return solve(
      level,
      v,
      v % 2
        ? `${a * (x + b)} = ${signed(a)}(x ${add(b)})`
        : `${signed(a)}(x ${add(b)}) = ${a * (x + b)}`,
      fraction(x),
      false,
      '先拆括號，再解方程。',
    );
  if (level === 1) {
    let d = nz(-8, 8);
    while (d === a) d = nz(-8, 8);
    const k = (a - d) * x + a * b + c;
    return solve(
      level,
      v,
      `${signed(a)}(x ${add(b)}) ${add(c)} = ${cx(d)} ${add(k)}`,
      fraction(x),
      false,
      '拆括號並整理方程兩邊。',
    );
  }
  const d = pick([-4, -3, -2, 2, 3, 4]),
    k = a * (d * (x + b) + c);
  return solve(
    level,
    v,
    v % 2
      ? `${k} = ${signed(a)}(${c} ＋ ${signed(d)}(${b} ＋ x))`
      : `${signed(a)}(${signed(d)}(x ${add(b)}) ${add(c)}) = ${k}`,
    fraction(x),
    false,
    '由內至外處理兩層括號。',
  );
}

function fractions(level: number, v: number) {
  const ds = [2, 3, 4, 5, 6, 8, 10, 12],
    d = pick(ds),
    e = pick(ds.filter((n) => n !== d)),
    f = pick(ds.filter((n) => n !== d && n !== e));
  if (level === 0) {
    const x = nz(-20, 20),
      a = rand(1, 6);
    return solve(
      level,
      v,
      v % 2
        ? `x ÷ ${d} = ${x} ÷ ${d}`
        : `x ÷ ${d} ＋ ${a} ÷ ${d} = ${x + a} ÷ ${d}`,
      fraction(x),
      true,
      '消去同分母，再解方程。',
    );
  }
  if (level === 1) {
    const x = nz(-18, 18),
      a = nz(-6, 6),
      right = addFraction(fraction(x, e), fraction(a, d));
    if (right.d > 12) return fractions(level, v + 1);
    return solve(
      level,
      v,
      `x ÷ ${e} ＋ ${a} ÷ ${d} = ${fractionDisplay(right)}`,
      fraction(x),
      true,
      '找最小公倍數，消去兩個分母。',
    );
  }
  const answer = fraction(nz(-40, 40), pick(ds));
  if (Math.abs(answer.n / answer.d) > 20) return fractions(level, v + 1);
  if (v % 2 === 0) {
    const a = nz(-6, 6),
      right = divideFraction(addFraction(answer, fraction(a)), d);
    if (right.d > 12) return fractions(level, v + 1);
    return solve(
      level,
      v,
      `(x ${add(a)}) ÷ ${d} = ${fractionDisplay(right)}`,
      answer,
      true,
      '利用交叉相乘解方程。',
    );
  }
  const a = nz(-6, 6),
    b = nz(-6, 6),
    right = addFraction(
      addFraction(divideFraction(answer, d), fraction(a, e)),
      fraction(b, f),
    );
  if (right.d > 12) return fractions(level, v + 1);
  return solve(
    level,
    v,
    `x ÷ ${d} ＋ ${a} ÷ ${e} ＋ ${b} ÷ ${f} = ${fractionDisplay(right)}`,
    answer,
    true,
    '消去三個分母，再解方程。',
  );
}

function formEquation(level: number, v: number): EquationQuestion {
  const a = rand(2, 12),
    b = rand(2, 12),
    total = rand(30, 90);
  let prompt = '',
    expected = '',
    wrong: string[] = [];
  if (level === 0) {
    if (v % 2) {
      prompt = v === 1
        ? `一個數減去 ${a} 後等於 ${b}。設該數為 x。`
        : `箱內原有 x 個球，取出 ${a} 個後餘下 ${b} 個。`;
      expected = `x-${a}=${b}`;
      wrong = [`${a}-x=${b}`, `x+${a}=${b}`, `x-${b}=${a}`];
    } else {
      prompt = [
        `一個數的 ${a} 倍等於 ${a * b}。設該數為 x。`,
        `每盒有 x 粒玻璃珠，${a} 盒共有 ${a * b} 粒。`,
        `一個長方形闊 x cm，長是闊的 ${a} 倍，長為 ${a * b} cm。`,
      ][Math.floor(v / 2) % 3];
      expected = `${a}x=${a * b}`;
      wrong = [`x+${a}=${a * b}`, `${a}+x=${a * b}`, `x=${a * b}`];
    }
  } else if (level === 1) {
    if (v % 2) {
      prompt = v % 4 === 1
        ? `梓軒有 x 張卡，凱琳比他多 ${a} 張，二人共有 ${total} 張。`
        : `書架上層有 x 本書，下層比上層多 ${a} 本，兩層共有 ${total} 本。`;
      expected = `x+(x+${a})=${total}`;
      wrong = [
        `x+${a}=${total}`,
        `x+(x-${a})=${total}`,
        `2x+${a}=${total + a}`,
      ];
    } else {
      prompt = [
        `兩個連續整數的和為 ${2 * a + 1}。設較小的整數為 x。`,
        `兩個相鄰座位的編號總和為 ${2 * a + 1}。設較小編號為 x。`,
        `日曆上同一欄相鄰兩天的日期總和為 ${2 * a + 1}。設較小日期為 x。`,
      ][Math.floor(v / 2) % 3];
      expected = `x+(x+1)=${2 * a + 1}`;
      wrong = [
        `x+x=${2 * a + 1}`,
        `x+(x-1)=${2 * a + 1}`,
        `2(x+1)=${2 * a + 1}`,
      ];
    }
  } else if (v % 2) {
    const m = rand(2, 4),
      years = rand(3, 10),
      childAge = rand(8, 15),
      sum = (m + 1) * childAge + 2 * years;
    prompt = v % 4 === 1
      ? `父親的年齡是兒子的 ${m} 倍。${years} 年後二人共 ${sum} 歲。設兒子現年 y 歲。`
      : `母親的年齡是女兒的 ${m} 倍。${years} 年後二人共 ${sum} 歲。設女兒現年 y 歲。`;
    expected = `(y+${years})+(${m}y+${years})=${sum}`;
  } else {
    const cheap = a,
      expensive = a + rand(3, 8),
      count = b + 10,
      expCount = b,
      totalCost = expensive * expCount + cheap * (count - expCount);
    prompt = [
      `成人票每張 $${expensive}，學生票每張 $${cheap}，共售出 ${count} 張，收入 $${totalCost}。設成人票有 y 張。`,
      `精裝簿每本 $${expensive}，普通簿每本 $${cheap}，共買 ${count} 本，總值 $${totalCost}。設精裝簿有 y 本。`,
      `大杯飲品每杯 $${expensive}，小杯每杯 $${cheap}，共售出 ${count} 杯，收入 $${totalCost}。設大杯有 y 杯。`,
    ][Math.floor(v / 2) % 3];
    expected = `${expensive}y+${cheap}(${count}-y)=${totalCost}`;
  }
  return {
    kind: 'equation',
    level,
    variant: v,
    prompt,
    expected,
    direct: level === 2,
    choices: level === 2 ? undefined : choices(expected, wrong),
  };
}

function application(level: number, v: number): ApplicationQuestion {
  let prompt = '',
    expected = '',
    answer = 0,
    unit = '',
    wrong: string[] = [];
  if (level === 0) {
    if (v % 3 === 0) {
      const sent = rand(3, 12),
        left = rand(8, 35);
      answer = sent + left;
      prompt = v < 3
        ? `嘉敏原有一些明信片，寄出 ${sent} 張後餘下 ${left} 張。她原有多少張？設原有 x 張。`
        : `盒內原有一些積木，取出 ${sent} 件後餘下 ${left} 件。原有多少件？設原有 x 件。`;
      expected = `x-${sent}=${left}`;
      unit = v < 3 ? '張' : '件';
      wrong = [`x+${sent}=${left}`, `${sent}-x=${left}`, `x-${left}=${sent}`];
    } else if (v % 3 === 1) {
      const price = rand(6, 15);
      answer = rand(4, 18);
      prompt = v < 4
        ? `每枝筆售 $${price}，志朗共付 $${price * answer}。他買了多少枝？設購買 x 枝。`
        : `每張展覽門票售 $${price}，總收入為 $${price * answer}。售出多少張？設售出 x 張。`;
      expected = `${price}x=${price * answer}`;
      unit = v < 4 ? '枝' : '張';
      wrong = [
        `x+${price}=${price * answer}`,
        `x-${price}=${price * answer}`,
        `${price * answer}x=${price}`,
      ];
    } else {
      const length = rand(12, 30);
      answer = rand(4, length - 2);
      const p = 2 * (length + answer);
      prompt = `一個長方形長 ${length} cm，周界為 ${p} cm。它的闊是多少？設闊為 x cm。`;
      expected = `2(${length}+x)=${p}`;
      unit = 'cm';
      wrong = [
        `${length}+x=${p}`,
        `${2 * length}+x=${p}`,
        `${length}x=${p}`,
      ];
    }
  } else if (level === 1) {
    if (v % 2 === 0) {
      answer = 2 * rand(5, 25);
      prompt = [
        `兩個連續偶數之和為 ${answer + (answer + 2)}。求較小的偶數。設較小的偶數為 x。`,
        `兩個相鄰偶數門牌的總和為 ${answer + (answer + 2)}。求較小門牌號碼，設為 x。`,
        `兩個連續雙數頁碼的總和為 ${answer + (answer + 2)}。求較小頁碼，設為 x。`,
      ][Math.floor(v / 2) % 3];
      expected = `x+(x+2)=${2 * answer + 2}`;
      unit = '';
      wrong = [
        `x+(x+1)=${2 * answer + 2}`,
        `2(x+2)=${2 * answer + 2}`,
        `x+2=${2 * answer + 2}`,
      ];
    } else {
      const cheap = rand(5, 12),
        expensive = cheap + rand(3, 8),
        count = rand(12, 30);
      answer = rand(3, count - 3);
      const total = expensive * answer + cheap * (count - answer);
      prompt = v % 4 === 1
        ? `甲款紀念品每件 $${expensive}，乙款每件 $${cheap}，共買 ${count} 件，總值 $${total}。甲款有多少件？設甲款有 x 件。`
        : `大盆栽每盆 $${expensive}，小盆栽每盆 $${cheap}，共買 ${count} 盆，總值 $${total}。大盆栽有多少盆？設大盆栽有 x 盆。`;
      expected = `${expensive}x+${cheap}(${count}-x)=${total}`;
      unit = v % 4 === 1 ? '件' : '盆';
      wrong = [
        `${expensive}x+${cheap}x=${total}`,
        `${expensive}(${count}-x)+${cheap}x=${total}`,
        `${expensive}x+${cheap}${count}=${total}`,
      ];
    }
  } else if (v % 3 === 0) {
    const sibling = v < 3;
    answer = sibling ? rand(8, 12) : rand(8, 20);
    const years = sibling ? rand(3, 6) : rand(3, 10),
      gap = answer + years;
    prompt = sibling
      ? `哥哥比弟弟大 ${gap} 歲。${years} 年後哥哥是弟弟的 2 倍。弟弟現年多少歲？設弟弟現年 y 歲。`
      : `母親比女兒大 ${gap} 歲。${years} 年後母親是女兒的 2 倍。女兒現年多少歲？設女兒現年 y 歲。`;
    expected = `y+${gap}+${years}=2(y+${years})`;
    unit = '歲';
  } else if (v % 3 === 1) {
    const slow = rand(30, 55),
      fast = slow + rand(10, 25);
    answer = rand(2, 4);
    prompt = v < 4
      ? `兩車由相距 ${(slow + fast) * answer} km 的兩地同時相向而行，速率為 ${slow} km/h 及 ${fast} km/h。多少小時後相遇？設時間為 y 小時。`
      : `兩艘船從相距 ${(slow + fast) * answer} km 的港口同時相向航行，速率為 ${slow} km/h 及 ${fast} km/h。多少小時後相遇？設時間為 y 小時。`;
    expected = `${slow}y+${fast}y=${(slow + fast) * answer}`;
    unit = '小時';
  } else {
    const tens = rand(1, 8),
      ones = tens + 1;
    answer = tens;
    prompt = `一個兩位數的個位數字比十位數字大 1，兩數字之和為 ${tens + ones}。求十位數字。設十位數字為 y。`;
    expected = `y+(y+1)=${tens + ones}`;
    unit = '';
  }
  const all = ['張', '枝', 'cm', '件', '盆', '歲', '小時', '沒有單位'],
    correct = unit || '沒有單位';
  return {
    kind: 'application',
    level,
    variant: v,
    prompt,
    expected,
    direct: level === 2,
    choices: level === 2 ? undefined : choices(expected, wrong),
    answer,
    unit,
    unitChoices: shuffle([
      correct,
      ...all.filter((x) => x !== correct).slice(0, 3),
    ]),
  };
}

function generate(game: GameId, level: number, v: number): Question {
  if (game === 'simple') return simple(level, v);
  if (game === 'like-terms') return likeTerms(level, v);
  if (game === 'brackets') return brackets(level, v);
  if (game === 'fractions') return fractions(level, v);
  if (game === 'form-equation') return formEquation(level, v);
  return application(level, v);
}
export const questionKey = (q: Question) =>
  q.kind === 'solve'
    ? `${q.expression}|${answerText(q.answer)}`
    : `${q.prompt}|${q.expected}|${q.kind === 'application' ? `${q.answer}|${q.unit}` : ''}`;
export function makeQuestions(game: GameId, previous: Question[] = []) {
  const used = new Set(previous.map(questionKey)),
    out: Question[] = [];
  for (let level = 0; level < 3; level++) {
    let attempts = 0;
    while (out.length < (level + 1) * 5) {
      if (++attempts > 10000) throw new Error('未能產生足夠的不重複題目。');
      const q = generate(game, level, attempts - 1),
        key = questionKey(q);
      if (!used.has(key) && !out.some((x) => questionKey(x) === key)) {
        out.push(q);
        used.add(key);
      }
    }
  }
  return [
    ...shuffle(out.slice(0, 5)),
    ...shuffle(out.slice(5, 10)),
    ...shuffle(out.slice(10, 15)),
  ];
}
export function startSession(
  game: GameId,
  questions = makeQuestions(game),
  now = Date.now(),
): Session {
  return {
    game,
    questions,
    index: 0,
    stage: 0,
    errors: 0,
    stageErrors: 0,
    firstTry: 0,
    questionErrors: 0,
    skipped: 0,
    currentFirstTryStreak: 0,
    longestFirstTryStreak: 0,
    solved: false,
    finished: false,
    feedback: '',
    selectedEquation: '',
    startedAt: now,
    completedAt: null,
  };
}
export function expected(s: Session) {
  const q = s.questions[s.index];
  if (q.kind === 'solve') return answerText(q.answer);
  if (q.kind === 'equation' || s.stage === 0) return q.expected;
  if (s.stage === 1) return String(q.answer);
  return q.unit || '沒有單位';
}
function correct(s: Session, now: number, answer: string) {
  const q = s.questions[s.index],
    last = q.kind === 'application' ? 2 : 0;
  if (s.stage < last)
    return {
      ...s,
      stage: s.stage + 1,
      stageErrors: 0,
      feedback:
        s.stage === 0
          ? '方程正確！現在解方程並輸入答案。'
          : '數值正確！最後選擇答案單位。',
      selectedEquation:
        q.kind === 'application' && s.stage === 0
          ? answer
          : s.selectedEquation,
    };
  const finished = s.index === s.questions.length - 1,
    first = s.questionErrors === 0,
    streak = first ? s.currentFirstTryStreak + 1 : 0;
  return {
    ...s,
    solved: true,
    finished,
    completedAt: finished ? now : null,
    firstTry: s.firstTry + (first ? 1 : 0),
    currentFirstTryStreak: streak,
    longestFirstTryStreak: Math.max(s.longestFirstTryStreak, streak),
    feedback: `答對了！這題獲得 ${first ? 10 : 5} 分。`,
  };
}
export function submit(s: Session, answer: string, now = Date.now()): Session {
  if (s.finished || s.solved) return s;
  const q = s.questions[s.index];
  let ok = false;
  if (q.kind === 'solve') {
    const a = parseFraction(answer);
    ok = Boolean(a && a.n === q.answer.n && a.d === q.answer.d);
  } else if (q.kind === 'equation' || s.stage === 0)
    ok = equationEquivalent(answer, q.expected);
  else if (s.stage === 1) ok = Number(answer) === q.answer;
  else ok = answer === (q.unit || '沒有單位');
  if (ok) return correct(s, now, answer);
  const hints: Record<GameId, string> = {
    simple: '在等號兩邊進行相同運算，逐步把 x 留在一邊。',
    'like-terms': '先合併未知數項和常數項，再移項。',
    brackets: '按分配律由內至外拆括號，留意負號。',
    fractions: '找分母的最小公倍數，或使用交叉相乘。',
    'form-equation': `確認 ${q.level === 2 ? 'y' : 'x'} 代表甚麼，再找出等號兩邊的相等關係。`,
    applications:
      s.stage === 0
        ? '整理已知量與未知量，找出相等關係。'
        : s.stage === 1
          ? `解出已建立方程中的 ${q.level === 2 ? 'y' : 'x'}。`
          : '數值不變，只需重新選擇正確單位。',
  };
  return {
    ...s,
    errors: s.errors + 1,
    questionErrors: s.questionErrors + 1,
    stageErrors: s.stageErrors + 1,
    currentFirstTryStreak: 0,
    feedback: `再試一次。${hints[s.game]}`,
  };
}
export const score = (s: Session) =>
  s.firstTry * 10 +
  Math.max(0, s.index + (s.solved ? 1 : 0) - s.firstTry - s.skipped) * 5;
export const elapsedSeconds = (s: Session, now: number) =>
  Math.max(0, Math.floor(((s.completedAt ?? now) - s.startedAt) / 1000));
export function nextQuestion(s: Session): Session {
  return !s.solved || s.finished
    ? s
    : {
        ...s,
        index: s.index + 1,
        stage: 0,
        stageErrors: 0,
        questionErrors: 0,
        solved: false,
        feedback: '',
        selectedEquation: '',
      };
}
export function skipQuestion(s: Session, now = Date.now()): Session {
  if (s.finished || s.solved || s.index < 10) return s;
  const finished = s.index === s.questions.length - 1;
  return finished
    ? {
        ...s,
        stage: s.questions[s.index].kind === 'application' ? 2 : 0,
        skipped: s.skipped + 1,
        solved: true,
        finished: true,
        completedAt: now,
        currentFirstTryStreak: 0,
        feedback: '已放棄本題，本題不計分。',
      }
    : {
        ...s,
        index: s.index + 1,
        stage: 0,
        stageErrors: 0,
        questionErrors: 0,
        skipped: s.skipped + 1,
        currentFirstTryStreak: 0,
        feedback: '',
        selectedEquation: '',
      };
}
export type Action =
  | { type: 'start'; session: Session }
  | { type: 'answer'; value: string }
  | { type: 'next' }
  | { type: 'skip' }
  | { type: 'home' };
export function reducer(s: Session | null, a: Action): Session | null {
  if (a.type === 'home') return null;
  if (a.type === 'start') return a.session;
  if (!s) return s;
  if (a.type === 'answer') return submit(s, a.value);
  if (a.type === 'skip') return skipQuestion(s);
  return nextQuestion(s);
}
