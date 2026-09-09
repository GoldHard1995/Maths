export const variables = ['x', 'y', 'a', 'b'] as const;
export type Variable = (typeof variables)[number];

type Fraction = { n: number; d: number };
export type LinearValue = { constant: Fraction; coefficients: Record<Variable, Fraction> };

const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : Math.abs(a);
const fraction = (n: number, d = 1): Fraction => {
  if (!d) throw new ParseFailure('unsupported', '不可除以零。');
  const sign = d < 0 ? -1 : 1;
  const divisor = gcd(n, d) || 1;
  return { n: sign * n / divisor, d: Math.abs(d) / divisor };
};
const addFraction = (a: Fraction, b: Fraction) => fraction(a.n * b.d + b.n * a.d, a.d * b.d);
const multiplyFraction = (a: Fraction, b: Fraction) => fraction(a.n * b.n, a.d * b.d);
const divideFraction = (a: Fraction, b: Fraction) => fraction(a.n * b.d, a.d * b.n);
const zero = () => fraction(0);
const constant = (value: Fraction): LinearValue => ({ constant: value, coefficients: { x: zero(), y: zero(), a: zero(), b: zero() } });
const letter = (name: Variable): LinearValue => ({ ...constant(zero()), coefficients: { ...constant(zero()).coefficients, [name]: fraction(1) } });
const add = (left: LinearValue, right: LinearValue): LinearValue => ({
  constant: addFraction(left.constant, right.constant),
  coefficients: Object.fromEntries(variables.map(name => [name, addFraction(left.coefficients[name], right.coefficients[name])])) as Record<Variable, Fraction>,
});
const negate = (value: LinearValue): LinearValue => ({
  constant: fraction(-value.constant.n, value.constant.d),
  coefficients: Object.fromEntries(variables.map(name => [name, fraction(-value.coefficients[name].n, value.coefficients[name].d)])) as Record<Variable, Fraction>,
});
const subtract = (left: LinearValue, right: LinearValue) => add(left, negate(right));
const isConstant = (value: LinearValue) => variables.every(name => value.coefficients[name].n === 0);
const scale = (value: LinearValue, factor: Fraction): LinearValue => ({
  constant: multiplyFraction(value.constant, factor),
  coefficients: Object.fromEntries(variables.map(name => [name, multiplyFraction(value.coefficients[name], factor)])) as Record<Variable, Fraction>,
});
const multiply = (left: LinearValue, right: LinearValue) => {
  if (isConstant(left)) return scale(right, left.constant);
  if (isConstant(right)) return scale(left, right.constant);
  throw new ParseFailure('unsupported', '本遊戲不使用字母相乘或平方。');
};
const divide = (left: LinearValue, right: LinearValue) => {
  if (!isConstant(right)) throw new ParseFailure('unsupported', '除數不可含有字母。');
  return scale(left, divideFraction(fraction(1), right.constant));
};

class ParseFailure extends Error {
  kind: 'incomplete' | 'unsupported';
  constructor(kind: 'incomplete' | 'unsupported', message: string) { super(message); this.kind = kind; }
}

type Token = { kind: 'number' | 'variable' | 'operator' | 'left' | 'right'; value: string };

function tokenize(raw: string): Token[] {
  const source = raw.replaceAll('＋', '+').replaceAll('−', '-').replaceAll('×', '*').replaceAll('÷', '/').replace(/\s+/g, '');
  if (!source) throw new ParseFailure('incomplete', '請先輸入答案。');
  const tokens: Token[] = [];
  for (let index = 0; index < source.length;) {
    const char = source[index];
    if (/\d/.test(char)) {
      let end = index + 1;
      while (end < source.length && /\d/.test(source[end])) end++;
      tokens.push({ kind: 'number', value: source.slice(index, end) });
      index = end;
    } else if (variables.includes(char as Variable)) {
      tokens.push({ kind: 'variable', value: char }); index++;
    } else if ('+-*/'.includes(char)) {
      tokens.push({ kind: 'operator', value: char }); index++;
    } else if (char === '(') {
      tokens.push({ kind: 'left', value: char }); index++;
    } else if (char === ')') {
      tokens.push({ kind: 'right', value: char }); index++;
    } else {
      throw new ParseFailure('unsupported', `不支援「${char}」這個符號。`);
    }
  }
  return tokens;
}

class Parser {
  private index = 0;
  private tokens: Token[];
  constructor(tokens: Token[]) { this.tokens = tokens; }

  parse() {
    const value = this.expression();
    if (this.index !== this.tokens.length) throw new ParseFailure('incomplete', '請檢查算式格式。');
    return value;
  }

  private expression(): LinearValue {
    let value = this.term();
    while (this.peek('operator', '+') || this.peek('operator', '-')) {
      const operator = this.take().value;
      const right = this.term();
      value = operator === '+' ? add(value, right) : subtract(value, right);
    }
    return value;
  }

  private term(): LinearValue {
    let value = this.factor();
    while (true) {
      if (this.peek('operator', '*') || this.peek('operator', '/')) {
        const operator = this.take().value;
        const right = this.factor();
        value = operator === '*' ? multiply(value, right) : divide(value, right);
      } else if (this.peek('number') || this.peek('variable') || this.peek('left')) {
        value = multiply(value, this.factor());
      } else break;
    }
    return value;
  }

  private factor(): LinearValue {
    if (this.peek('operator', '+') || this.peek('operator', '-')) {
      const operator = this.take().value;
      const value = this.factor();
      return operator === '-' ? negate(value) : value;
    }
    if (this.peek('number')) return constant(fraction(Number(this.take().value)));
    if (this.peek('variable')) return letter(this.take().value as Variable);
    if (this.peek('left')) {
      this.take();
      const value = this.expression();
      if (!this.peek('right')) throw new ParseFailure('incomplete', '括號尚未完成。');
      this.take();
      return value;
    }
    throw new ParseFailure('incomplete', '算式尚未完成。');
  }

  private peek(kind: Token['kind'], value?: string) {
    const token = this.tokens[this.index];
    return token?.kind === kind && (value === undefined || token.value === value);
  }
  private take() { return this.tokens[this.index++]; }
}

export type ParseResult = { ok: true; value: LinearValue } | { ok: false; kind: 'incomplete' | 'unsupported'; message: string };

export function parseExpression(raw: string): ParseResult {
  try {
    return { ok: true, value: new Parser(tokenize(raw)).parse() };
  } catch (error) {
    if (error instanceof ParseFailure) return { ok: false, kind: error.kind, message: error.message };
    throw error;
  }
}

export function equivalent(left: string, right: string) {
  const a = parseExpression(left), b = parseExpression(right);
  if (!a.ok || !b.ok) return false;
  const same = (x: Fraction, y: Fraction) => x.n === y.n && x.d === y.d;
  return same(a.value.constant, b.value.constant) && variables.every(name => same(a.value.coefficients[name], b.value.coefficients[name]));
}

const compact = (raw: string) => raw.replaceAll('＋', '+').replaceAll('−', '-').replaceAll('×', '*').replaceAll('÷', '/').replace(/\s+/g, '');
const count = (raw: string, pattern: RegExp) => compact(raw).match(pattern)?.length ?? 0;

export type FormRule = {
  parentheses?: number;
  multiplyDivide?: number;
  collected?: boolean;
  requiredFragments?: string[];
};

function collected(raw: string) {
  const source = compact(raw);
  if (/[()*/]/.test(source)) return false;
  const terms = source.replace(/^-/, '').split(/[+-]/).filter(Boolean);
  const groups = terms.map(term => variables.find(name => term.includes(name)) ?? 'constant');
  return new Set(groups).size === groups.length;
}

export function followsForm(raw: string, rule?: FormRule) {
  if (!rule) return true;
  const source = compact(raw);
  if (rule.parentheses !== undefined && count(source, /\(/g) !== rule.parentheses) return false;
  if (rule.multiplyDivide !== undefined && count(source, /[*/]/g) !== rule.multiplyDivide) return false;
  if (rule.collected !== undefined && collected(source) !== rule.collected) return false;
  return (rule.requiredFragments ?? []).every(fragment => source.includes(compact(fragment)));
}

export function normalizeDisplay(raw: string) {
  return raw.replaceAll('-', '−').replaceAll('*', '×').replaceAll('/', '÷');
}
