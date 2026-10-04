export type GameId =
  | 'place-value'
  | 'rounding'
  | 'significant-figures'
  | 'significant-rounding'
  | 'calculation-estimation';
export const gameIds: GameId[] = [
  'place-value',
  'rounding',
  'significant-figures',
  'significant-rounding',
  'calculation-estimation',
];
export const GAME_TIME_LIMIT_SECONDS = 3600;
export type Choice = { value: string; label: string };
export type Step = {
  prompt: string;
  instruction: string;
  answer: string;
  choices?: Choice[];
  suffix?: string;
};
export type Question = {
  level: number;
  variant: number;
  prompt: string;
  expression: string;
  instruction: string;
  answer: string;
  choices?: Choice[];
  suffix?: string;
  steps?: Step[];
};
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
  expired: boolean;
  feedback: string;
  startedAt: number;
  completedAt: number | null;
};
type Action =
  | { type: 'home' }
  | { type: 'start'; session: Session }
  | { type: 'answer'; value: string }
  | { type: 'next' }
  | { type: 'skip' }
  | { type: 'timeout' };
const pick = <T>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)],
  rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a,
  shuffle = <T>(xs: T[]) => {
    const out = [...xs];
    for (let i = out.length - 1; i; i--) {
      const j = rand(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  };
const fmt = (n: number, p?: number) =>
    p === undefined ? String(n) : n.toFixed(p),
  normalize = (v: string) => v.trim().replace(/[,\s]/g, '').replace(/－/g, '-'),
  choice = (a: string, w: string[], limit = 4): Choice[] =>
    shuffle(
      [...new Set([a, ...w])]
        .slice(0, limit)
        .map((value) => ({ value, label: value })),
    );
const names = [
    '百萬位',
    '十萬位',
    '萬位',
    '千位',
    '百位',
    '十位',
    '個位',
    '十分位',
    '百分位',
    '千分位',
    '萬分位',
    '十萬分位',
    '百萬分位',
  ],
  powers = [6, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -6],
  label = (p: number) => names[powers.indexOf(p)],
  place = (p: number) => (p >= 0 ? String(10 ** p) : fmt(10 ** p, -p));
const MAX_NUMBER = 50000,
  decimal = (max = 6, maxInteger = 49999) => {
    const d = rand(1, max);
    return `${rand(1, maxInteger)}.${String(rand(0, 10 ** d - 1)).padStart(d, '0')}`;
  },
  smallDecimal = () => {
    const d = rand(1, 6);
    return `0.${String(rand(1, 10 ** d - 1)).padStart(d, '0')}`;
  },
  zeroResult = (v: string) => /^0(?:\.0*)?$/.test(normalize(v)),
  precisionText = (p: number, variant: number) =>
    p === -3 && variant % 2 === 0
      ? '0.001'
      : p < 0
        ? `${'一二三四五六'[-p - 1]}位小數`
        : p === 0
          ? '整數'
          : label(p),
  roundingTarget = (p: number, variant: number) => {
    const target = precisionText(p, variant);
    return target === '0.001'
      ? '最接近的 0.001'
      : p < 0
        ? target
        : `最接近的${target}`;
  };
export function roundAt(v: number, p: number, m: 'round' | 'up' | 'down') {
  const u = 10 ** p,
    r =
      (m === 'round'
        ? Math.round(v / u)
        : m === 'up'
          ? Math.ceil(v / u)
          : Math.floor(v / u)) * u;
  return p < 0 ? fmt(r, -p) : String(Math.round(r));
}
function sigCount(raw: string) {
  const s = normalize(raw);
  if (s.includes('.')) {
    const d = s.replace('.', ''),
      i = d.search(/[1-9]/);
    return i < 0 ? 0 : d.length - i;
  }
  return s.replace(/^0+/, '').replace(/0+$/, '').length;
}
export function roundSig(
  raw: string,
  n: number,
  m: 'round' | 'up' | 'down' = 'round',
) {
  const v = Number(normalize(raw));
  if (!v) return '0';
  const p = Math.floor(Math.log10(v)) - n + 1,
    out = roundAt(v, p, m);
  if (zeroResult(out)) return '0';
  const dec = Math.max(0, n - 1 - Math.floor(Math.log10(Number(out))));
  return Number(out).toFixed(dec);
}
function pv(level: number, variant: number): Question {
  for (let tries = 0; tries < 5000; tries++) {
    const whole =
        level === 1 && variant % 3 === 0
          ? '0'
          : String(rand(level === 0 ? 10 : 100, 49999)),
      d = rand(1, Math.min(6, level === 0 ? 3 : 6)),
      raw = `${whole}.${String(rand(0, 10 ** d - 1)).padStart(d, '0')}`,
      digits = raw.replace('.', ''),
      candidates = [...new Set(digits)].filter(
        (ch) =>
          ch !== '0' && digits.split('').filter((x) => x === ch).length === 1,
      ),
      target = pick(candidates),
      i = raw.indexOf(target);
    if (i < 0) continue;
    const dot = whole.length,
      p = i < dot ? dot - i - 1 : dot - i;
    if (level === 0)
      return {
        level,
        variant,
        prompt: `數字「${target}」位於哪一位？`,
        expression: raw,
        instruction: [
          '選出正確的位。',
          '找出這個數字所在的位。',
          '判斷指定數字的位名。',
          '在選項中選出正確位置。',
          '指出指定數字位於哪一位。',
        ][variant % 5],
        answer: label(p),
        choices: choice(
          label(p),
          shuffle(names.filter((x) => x !== label(p))).slice(0, 5),
          6,
        ),
      };
    if (level === 1)
      return {
        level,
        variant,
        prompt: `寫出數字「${target}」的數值。`,
        expression: raw,
        instruction: [
          '輸入位值。',
          '寫出這個數字的位值。',
          '以數字表示它代表的數量。',
          '輸入指定數字的位值。',
          '完成位值判斷。',
        ][variant % 5],
        answer:
          p < 0
            ? fmt(Number(target) * 10 ** p, -p)
            : String(Number(target) * 10 ** p),
      };
    const p1 = pick([3, 4]),
      a = p1 === 4 ? rand(1, 4) : rand(1, 9),
      p2 = rand(0, 2),
      b = rand(1, 9),
      p3 = -rand(1, 3),
      c = rand(1, 9),
      answer = fmt(a * 10 ** p1 + b * 10 ** p2 + c * 10 ** p3, -p3);
    if (new Set([a, b, c]).size < 3 || Number(answer) > MAX_NUMBER) continue;
    const values = [
      String(a * 10 ** p1),
      String(b * 10 ** p2),
      fmt(c * 10 ** p3, -p3),
    ];
    if (variant % 5 === 1)
      return {
        level,
        variant,
        prompt: '把展開式寫成一個完整的數。',
        expression: values.join(' + '),
        instruction: '輸入完整的數。',
        answer,
      };
    if (variant % 5 === 2)
      return {
        level,
        variant,
        prompt: '計算下列各位數值的總和。',
        expression: `${a} × ${place(p1)} + ${b} × ${place(p2)} + ${c} × ${place(p3)}`,
        instruction: '輸入完整的數。',
        answer,
      };
    if (variant % 5 === 3)
      return {
        level,
        variant,
        prompt: `方格內應填上哪個數字，使${label(p2)}的數值是 ${values[1]}？`,
        expression: answer.replace(String(b), '□'),
        instruction: '輸入方格內的數字。',
        answer: String(b),
      };
    if (variant % 5 === 4) {
      const original = fmt(a * 10 ** p1 + c * 10 ** p3, -p3);
      return {
        level,
        variant,
        prompt: `把下列數的${label(p2)}數字由 0 改為 ${b}。`,
        expression: original,
        instruction: '輸入更改後的完整數字。',
        answer,
      };
    }
    return {
      level,
      variant,
      prompt: '根據三個位值條件組成一個數。',
      expression: `${label(p1)}是 ${a}，${label(p2)}是 ${b}，${label(p3)}是 ${c}，其餘數字是 0。`,
      instruction: '輸入完整的數。',
      answer,
    };
  }
  throw new Error('未能產生沒有重複考核數字的位值題。');
}
function rounding(level: number, variant: number): Question {
  if (level < 2) {
    for (let tries = 0; tries < 5000; tries++) {
      const p = pick(
          level ? [-5, -4, -3, -2, -1, 0, 1, 2, 3, 4] : [-2, -1, 0, 1, 2, 3, 4],
        ),
        d = p < 0 ? rand(-p + 1, level ? 6 : 3) : 0,
        raw =
          p < 0
            ? `${rand(0, Math.min(49, 10 ** (6 - d) - 1))}.${String(rand(0, 10 ** d - 1)).padStart(d, '0')}`
            : p >= 2
              ? `${rand(10 ** p, 49999)}.${rand(0, 9)}`
              : level
                ? decimal(6)
                : variant % 2
                  ? String(rand(1000, 49999))
                  : decimal(3),
        v = Number(raw),
        m = level === 0 ? 'round' : variant % 2 ? 'up' : 'down',
        answer = roundAt(v, p, m);
      if (
        zeroResult(answer) ||
        Number(answer) === v ||
        Number(answer) > MAX_NUMBER
      )
        continue;
      const action = m === 'round' ? '捨入' : m === 'up' ? '上捨入' : '下捨入',
        target = roundingTarget(p, variant),
        prompts = [
          `將 ${raw} ${action}至${target}。`,
          `把 ${raw} ${action}至${target}，寫出近似值。`,
          `寫出 ${raw} ${action}至${target}後的近似值。`,
          `將 ${raw} ${action}至${target}，結果是多少？`,
          `寫出 ${raw} ${action}至${target}後的數值。`,
        ];
      return {
        level,
        variant,
        prompt: prompts[variant % 5],
        expression: raw,
        instruction: '輸入近似值。',
        answer,
      };
    }
    throw new Error('未能產生非零近似值。');
  }
  for (let tries = 0; tries < 5000; tries++) {
    const p = rand(1, 3),
      type = variant % 5 === 4 ? rand(4, 5) : variant % 5;
    let value: number, prompt: string, expression: string;
    if (type === 0) {
      const a = rand(10, 50),
        b = pick([4, 8, 20, 25, 40, 50]);
      value = a / b;
      prompt = `先求商，再將結果捨入至${roundingTarget(-p, variant)}。`;
      expression = `${a} ÷ ${b}`;
    } else if (type === 1) {
      const a = Number(decimal(3, 49)),
        b = Number(decimal(3, 49));
      value = a + b;
      prompt = `先求和，再將結果捨入至${roundingTarget(-p, variant)}。`;
      expression = `${a} + ${b}`;
    } else if (type === 2) {
      const a = Number(decimal(3, 49)),
        b = Number(decimal(3, 49));
      value = Math.max(a, b) - Math.min(a, b);
      prompt = `先求差，再將結果捨入至${roundingTarget(-p, variant)}。`;
      expression = `${Math.max(a, b)} − ${Math.min(a, b)}`;
    } else if (type === 3) {
      const a = Number(decimal(4, 9)),
        b = rand(2, 9);
      value = a * b;
      prompt = `先求積，再將結果捨入至${roundingTarget(-p, variant)}。`;
      expression = `${a} × ${b}`;
    } else if (type === 4) {
      const raw = `0.${rand(100, 999)}`,
        mode = pick(['round', 'up', 'down'] as const),
        action =
          mode === 'round' ? '捨入' : mode === 'up' ? '上捨入' : '下捨入',
        answer = roundAt(Number(raw), -2, mode);
      if (Number(answer) === Number(raw)) continue;
      return {
        level,
        variant,
        prompt: `將 ${raw} ${action}至最接近的 0.01。`,
        expression: raw,
        instruction: '答案須保留至小數點後兩位，包括最後的 0。',
        answer,
      };
    } else {
      const a = Number(decimal(3, 49)),
        b = Number(decimal(3, 49));
      value = (a + b) / 2;
      prompt = `先求兩數的平均數，再將結果捨入至${roundingTarget(-p, variant)}。`;
      expression = `(${a} + ${b}) ÷ 2`;
    }
    const answer = roundAt(value, -p, 'round');
    if (
      value > 50 ||
      Number(answer) > 50 ||
      zeroResult(answer) ||
      Number(answer) === value
    )
      continue;
    return {
      level,
      variant,
      prompt,
      expression,
      instruction: '輸入近似值，保留所需末位零。',
      answer,
    };
  }
  throw new Error('未能產生數值有改變的綜合捨入題。');
}
function sf(level: number, variant: number): Question {
  const raw = variant % 2 ? decimal(6) : smallDecimal();
  if (level === 0) {
    const ds = normalize(raw).replace('.', ''),
      a = ds[ds.search(/[1-9]/)];
    return {
      level,
      variant,
      prompt: [
        '寫出下列數的最有效數字。',
        '下列數最左邊的非零數字是哪一個？',
        '找出這個數的最有效數字。',
        '下列數的第一個有效數字是哪一個？',
        '指出下列數的第一個有效數字。',
      ][variant % 5],
      expression: raw,
      instruction: '選出正確數字。',
      answer: a,
      choices: choice(
        a,
        shuffle([...new Set(ds)])
          .filter((x) => x !== a)
          .concat(['0', '9'])
          .slice(0, 3),
      ),
    };
  }
  if (level === 1) {
    const a = String(sigCount(raw));
    return {
      level,
      variant,
      prompt: [
        '下列數共有多少個有效數字？',
        '判斷這個數的有效數字數目。',
        '這個表示法保留了多少位有效數字？',
        '數一數下列數的有效數字。',
        '選出正確的有效數字位數。',
      ][variant % 5],
      expression: raw,
      instruction: '選出答案。',
      answer: a,
      choices: choice(a, [
        String(Math.max(1, +a - 1)),
        String(+a + 1),
        String(+a + 2),
      ]),
    };
  }
  const base = pick(['1.2', '0.070', '23.0', '5.40']),
    n = rand(2, 6),
    v = Number(base),
    a = v.toFixed(Math.max(0, n - 1 - Math.floor(Math.log10(v))));
  return {
    level,
    variant,
    prompt: `將下列數寫成 ${n} 位有效數字，哪一個寫法正確？`,
    expression: `數值為 ${base}`,
    instruction: '選出保留正確末位零的寫法。',
    answer: a,
    choices: choice(a, [
      String(v),
      v.toFixed(Math.max(0, n - 2 - Math.floor(Math.log10(v)))),
      v.toFixed(Math.max(0, (n === 6 ? n - 4 : n) - Math.floor(Math.log10(v)))),
    ]),
  };
}
function sfr(level: number, variant: number): Question {
  if (level < 2) {
    for (let tries = 0; tries < 5000; tries++) {
      const raw = variant % 2 ? decimal(6) : smallDecimal(),
        n = rand(1, 6),
        m = level === 0 ? 'round' : variant % 2 ? 'up' : 'down',
        answer = roundSig(raw, n, m);
      if (zeroResult(answer) || Number(answer) === Number(raw)) continue;
      const action = m === 'round' ? '捨入' : m === 'up' ? '上捨入' : '下捨入',
        prompts = [
          `將 ${raw} ${action}至 ${n} 位有效數字。`,
          `把 ${raw} ${action}至 ${n} 位有效數字，寫出近似值。`,
          `寫出 ${raw} ${action}至 ${n} 位有效數字後的近似值。`,
          `將 ${raw} ${action}至 ${n} 位有效數字，結果是多少？`,
          `寫出 ${raw} ${action}至 ${n} 位有效數字後的數值。`,
        ];
      return {
        level,
        variant,
        prompt: prompts[variant % 5],
        expression: raw,
        instruction: '輸入答案，保留所需末位零。',
        answer,
      };
    }
    throw new Error('未能產生非零有效數字近似值。');
  }
  for (let tries = 0; tries < 5000; tries++) {
    const a = rand(10, 4999),
      b = pick([8, 16, 20, 25, 40, 50, 125]),
      n = rand(2, 6),
      prompts = [
        `先求商，再將結果捨入至 ${n} 位有效數字。`,
        `先計算下式，再把結果捨入至 ${n} 位有效數字。`,
        `求下式的值，並捨入至 ${n} 位有效數字。`,
        `將下式的計算結果捨入至 ${n} 位有效數字。`,
        `計算後，寫出 ${n} 位有效數字的近似值。`,
      ],
      value = a / b,
      answer = roundSig(String(value), n);
    if (Number(answer) === value) continue;
    return {
      level,
      variant,
      prompt: prompts[variant % 5],
      expression: `${a} ÷ ${b}`,
      instruction: '輸入近似值，保留所需末位零。',
      answer,
    };
  }
  throw new Error('未能產生數值有改變的有效數字綜合題。');
}
function estimate(level: number, variant: number): Question {
  if (level === 0) {
    for (let tries = 0; tries < 5000; tries++) {
      const plus = variant % 2 === 0,
        u = pick([10, 100, 1000, 10000, 0.001]),
        a =
          u === 0.001
            ? decimal(6, 49)
            : u >= 100
              ? `${rand(u, 24000)}.${rand(0, 9)}`
              : String(rand(120, 24000)),
        b =
          u === 0.001
            ? decimal(6, 49)
            : u >= 100
              ? `${rand(u, 24000)}.${rand(0, 9)}`
              : String(rand(120, 24000)),
        p = u === 0.001 ? -3 : Math.round(Math.log10(u)),
        ra = Number(roundAt(Number(a), p, 'round')),
        rb = Number(roundAt(Number(b), p, 'round')),
        answer = plus ? ra + rb : Math.abs(ra - rb),
        exact = plus ? Number(a) + Number(b) : Math.abs(Number(a) - Number(b));
      if (
        answer === 0 ||
        answer > MAX_NUMBER ||
        (u === 0.001 && answer > 50) ||
        Math.abs(answer - exact) < 1e-8 ||
        ra === 0 ||
        rb === 0 ||
        ra === Number(a) ||
        rb === Number(b)
      )
        continue;
      const answerText = u === 0.001 ? fmt(answer, 3) : String(answer);
      const target = roundingTarget(p, variant),
        left = plus || Number(a) >= Number(b) ? a : b,
        right = plus || Number(a) >= Number(b) ? b : a,
        operator = plus ? '+' : '−',
        kind = plus ? '和' : '差',
        prompts = [
          `將各數捨入至${target}，估算它們的${kind}。`,
          `把 ${left} 和 ${right} 分別捨入至${target}，再估算${kind}。`,
          `先將兩個數捨入至${target}，再估算${kind}。`,
          `將算式中的每個數捨入至${target}，估算結果是多少？`,
          `把兩個數各自捨入至${target}後，求它們的估算${kind}。`,
        ];
      return {
        level,
        variant,
        prompt: prompts[variant % 5],
        expression: `${left} ${operator} ${right}`,
        instruction: '輸入估算值。',
        answer: answerText,
      };
    }
    throw new Error('未能產生非零估算結果。');
  }
  if (level === 1) {
    const divide = variant % 2 === 1;
    if (divide) {
      const b = pick([10, 20, 50]),
        m = rand(2, 9),
        offsets = [-4, -3, -2, -1, 1, 2, 3, 4];
      let numerator = b * m + pick(offsets),
        denominator = b + pick(offsets);
      while (numerator === m * denominator) {
        numerator = b * m + pick(offsets);
        denominator = b + pick(offsets);
      }
      const prompts = [
        '將各數捨入至最接近的十位，估算商。',
        '先把被除數和除數捨入至最接近的十位，再估算商。',
        '將算式中的兩個數分別捨入至最接近的十位，估算商。',
        '把被除數及除數各自捨入至最接近的十位後，求估算商。',
        '先將各數捨入至最接近的十位，再求商的估算值。',
      ];
      return {
        level,
        variant,
        prompt: prompts[variant % 5],
        expression: `${numerator} ÷ ${denominator}`,
        instruction: '輸入估算值。',
        answer: String(m),
      };
    }
    let a = rand(12, 98),
      b = rand(12, 98);
    while (
      a % 10 === 0 ||
      b % 10 === 0 ||
      Math.round(a / 10) * 10 * Math.round(b / 10) * 10 === a * b
    ) {
      a = rand(12, 98);
      b = rand(12, 98);
    }
    const prompts = [
      '將各數捨入至最接近的十位，估算積。',
      '先把兩個因數捨入至最接近的十位，再估算積。',
      '將算式中的兩個數分別捨入至最接近的十位，估算積。',
      `把 ${a} 和 ${b} 各自捨入至最接近的十位，估算乘積。`,
      '先將各數捨入至最接近的十位，再求積的估算值。',
    ];
    return {
      level,
      variant,
      prompt: prompts[variant % 5],
      expression: `${a} × ${b}`,
      instruction: '輸入估算值。',
      answer: String(Math.round(a / 10) * 10 * Math.round(b / 10) * 10),
    };
  }
  let vs = [decimal(1, 980), decimal(1, 980), decimal(1, 980)];
  while (
    vs.some((v) => Number(v) < 120 || Number(v) % 100 === 0) ||
    vs
      .map((v) => Math.round(Number(v) / 100) * 100)
      .reduce((x, y) => x + y, 0) === vs.reduce((x, y) => x + Number(y), 0)
  )
    vs = [decimal(1, 980), decimal(1, 980), decimal(1, 980)];
  const m = rand(2, 9),
    a =
      vs
        .map((v) => Math.round(Number(v) / 100) * 100)
        .reduce((x, y) => x + y, 0) * m,
    prompts = [
      `只將括號內三個加數捨入至最接近的百位，括號外的 ${m} 保持不變，再估算結果。`,
      `先把括號內各數捨入至最接近的百位，${m} 毋須捨入，再估算結果。`,
      `將括號內三個數分別捨入至最接近的百位，乘數 ${m} 保持不變，完成估算。`,
      `把括號內的三個加數各自捨入至最接近的百位，再乘以原來的 ${m}。`,
      `先將括號內三個數捨入至最接近的百位，括號外的 ${m} 不變，再計算。`,
    ];
  return {
    level,
    variant,
    prompt: prompts[variant % 5],
    expression: `(${vs.join(' + ')}) × ${m}`,
    instruction: '輸入估算值。',
    answer: String(a),
  };
}
function generate(g: GameId, l: number, v: number) {
  return g === 'place-value'
    ? pv(l, v)
    : g === 'rounding'
      ? rounding(l, v)
      : g === 'significant-figures'
        ? sf(l, v)
        : g === 'significant-rounding'
          ? sfr(l, v)
          : estimate(l, v);
}
export const questionKey = (q: Question) =>
  `${q.prompt}|${q.expression}|${q.answer}|${q.steps?.map((s) => s.answer).join('|') || ''}`;
export function makeQuestions(g: GameId, previous: Question[] = []) {
  const used = new Set(previous.map(questionKey)),
    out: Question[] = [],
    counts = g === 'place-value' ? [8, 7, 0] : [5, 5, 5];
  let offset = 0;
  for (let l = 0; l < 3; l++) {
    let tries = 0;
    while (out.length < offset + counts[l]) {
      if (++tries > 5000) throw new Error('未能產生足夠的不重複題目。');
      const q = generate(g, l, out.length - offset),
        k = questionKey(q);
      const displayed = [
        q.prompt,
        q.expression,
        q.instruction,
        q.answer,
        ...(q.choices || []).flatMap((c) => [c.value, c.label]),
        ...(q.steps || []).flatMap((s) => [s.prompt, s.instruction, s.answer]),
      ];
      if (
        displayed.some((s) =>
          (s.match(/\d+(?:\.\d+)?/g) || []).some((n) => sigCount(n) > 6),
        )
      )
        continue;
      if (!used.has(k) && !out.some((x) => questionKey(x) === k)) {
        out.push(q);
        used.add(k);
      }
    }
    offset += counts[l];
  }
  return g === 'place-value'
    ? [...shuffle(out.slice(0, 8)), ...shuffle(out.slice(8, 15))]
    : [
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
    expired: false,
    feedback: '',
    startedAt: now,
    completedAt: null,
  };
}
export function expected(s: Session) {
  const q = s.questions[s.index];
  return q.steps?.[s.stage]?.answer ?? q.answer;
}
export function submit(s: Session, value: string, now = Date.now()): Session {
  if (s.finished || s.solved) return s;
  if (!normalize(value)) return { ...s, feedback: '請輸入答案。' };
  const q = s.questions[s.index];
  if (normalize(value) === normalize(expected(s))) {
    if (q.steps && s.stage < q.steps.length - 1)
      return {
        ...s,
        stage: s.stage + 1,
        feedback: '這一步答對了，繼續完成判斷。',
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
  return {
    ...s,
    errors: s.errors + 1,
    questionErrors: s.questionErrors + 1,
    stageErrors: s.stageErrors + 1,
    currentFirstTryStreak: 0,
    feedback: '再試一次。留意位置、捨入方向及末位零。',
  };
}
export function skipQuestion(s: Session, now = Date.now()): Session {
  if (s.finished || s.solved || s.questions[s.index].level !== 2) return s;
  const finished = s.index === s.questions.length - 1;
  return {
    ...s,
    skipped: s.skipped + 1,
    solved: true,
    finished,
    completedAt: finished ? now : null,
    currentFirstTryStreak: 0,
    feedback: '已放棄本題，這題不計分。',
  };
}
export const score = (s: Session) => {
    const done = s.index + (s.solved ? 1 : 0);
    return s.firstTry * 10 + Math.max(0, done - s.firstTry - s.skipped) * 5;
  },
  elapsedSeconds = (s: Session, now: number) =>
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
      };
}
export function expireSession(s: Session, now = Date.now()): Session {
  return s.finished
    ? s
    : {
        ...s,
        finished: true,
        expired: true,
        completedAt: now,
        feedback: '遊戲時間已達 1 小時，本局已結束。',
      };
}
export function reducer(s: Session | null, a: Action): Session | null {
  if (a.type === 'home') return null;
  if (a.type === 'start') return a.session;
  if (!s) return s;
  if (!s.finished && elapsedSeconds(s, Date.now()) >= GAME_TIME_LIMIT_SECONDS) return expireSession(s);
  if (a.type === 'answer') return submit(s, a.value);
  if (a.type === 'skip') return skipQuestion(s);
  if (a.type === 'timeout') return expireSession(s);
  return nextQuestion(s);
}
