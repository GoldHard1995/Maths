export const variables = ['x', 'y', 'a', 'b'] as const;
export type Variable = (typeof variables)[number];
export type Rational = { n: bigint; d: bigint };
export type Polynomial = Map<string, Rational>;
const zero = () => ({ n: 0n, d: 1n });
function gcd(a: bigint, b: bigint): bigint { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a, b] = [b, a % b]; return a || 1n; }
export function rational(n: bigint | number, d: bigint | number = 1): Rational {
  let numerator = BigInt(n), denominator = BigInt(d);
  if (!denominator) throw new Error('分母不可為 0。');
  if (denominator < 0n) { numerator = -numerator; denominator = -denominator; }
  const divisor = gcd(numerator, denominator);
  return { n: numerator / divisor, d: denominator / divisor };
}
const plus = (a: Rational, b: Rational) => rational(a.n * b.d + b.n * a.d, a.d * b.d);
const times = (a: Rational, b: Rational) => rational(a.n * b.n, a.d * b.d);
const key = (v?: Variable) => variables.map(letter => letter === v ? 1 : 0).join(',');
const constant = (n: bigint): Polynomial => new Map(n ? [[key(), rational(n)]] : []);
function add(a: Polynomial, b: Polynomial, sign = 1): Polynomial {
  const out = new Map(a);
  for (const [k, value] of b) {
    const result = plus(out.get(k) || zero(), times(value, rational(sign)));
    if (result.n) out.set(k, result); else out.delete(k);
  }
  return out;
}
function multiply(a: Polynomial, b: Polynomial): Polynomial {
  const out: Polynomial = new Map();
  for (const [ka, va] of a) for (const [kb, vb] of b) {
    const pa = ka.split(',').map(Number), pb = kb.split(',').map(Number), powers = pa.map((n, i) => n + pb[i]);
    if (powers.reduce((sum, n) => sum + n, 0) > 8) throw new Error('答案次數過高，請檢查指數。');
    const k = powers.join(','), value = plus(out.get(k) || zero(), times(va, vb));
    if (value.n) out.set(k, value); else out.delete(k);
  }
  return out;
}
function divide(a: Polynomial, b: Polynomial): Polynomial {
  if (b.size !== 1 || !b.has(key())) throw new Error('分母須為非零整數。');
  const divisor = b.get(key())!;
  return new Map([...a].map(([k, v]) => [k, times(v, rational(divisor.d, divisor.n))]));
}
export function expandFractions(raw: string): string {
  return raw.replace(/frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, n: string, d: string) => `((${n})/(${d}))`);
}
function compact(raw: string) {
  return expandFractions(raw).replaceAll('＋', '+').replaceAll('−', '-').replaceAll('×', '*')
    .replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹]+/g, value => '^' + value.split('').map(c => '⁰¹²³⁴⁵⁶⁷⁸⁹'.indexOf(c)).join('')).replace(/\s+/g, '');
}
class Parser {
  private index = 0;
  private tokens: string[];
  constructor(raw: string) {
    if (raw.length > 160) throw new Error('答案過長，請先化簡。');
    const text = compact(raw);
    if (!text) throw new Error('請先輸入答案。');
    this.tokens = text.match(/\d+|[xyab()+\-*/^]/g) || [];
    if (this.tokens.join('') !== text) throw new Error('請使用下方鍵盤輸入答案。');
  }
  parse(): Polynomial {
    const value = this.expression();
    if (this.index !== this.tokens.length) throw new Error('請檢查算式格式。');
    return value;
  }
  private peek() { return this.tokens[this.index]; }
  private take() { return this.tokens[this.index++]; }
  private expression(): Polynomial {
    let value = this.term();
    while (this.peek() === '+' || this.peek() === '-') { const sign = this.take() === '-' ? -1 : 1; value = add(value, this.term(), sign); }
    return value;
  }
  private term(): Polynomial {
    let value = this.factor();
    while (this.peek()) {
      if (this.peek() === '*') { this.take(); value = multiply(value, this.factor()); }
      else if (this.peek() === '/') { this.take(); value = divide(value, this.factor()); }
      else if (/^(?:\d+|[xyab(])$/.test(this.peek())) value = multiply(value, this.factor());
      else break;
    }
    return value;
  }
  private factor(): Polynomial {
    if (this.peek() === '+' || this.peek() === '-') { const negative = this.take() === '-'; const value = this.factor(); return negative ? multiply(constant(-1n), value) : value; }
    let value: Polynomial;
    const token = this.take();
    if (token && /^\d+$/.test(token)) { if (token.length > 6) throw new Error('數值過大，請檢查答案。'); value = constant(BigInt(token)); }
    else if (variables.includes(token as Variable)) value = new Map([[key(token as Variable), rational(1)]]);
    else if (token === '(') { value = this.expression(); if (this.take() !== ')') throw new Error('括號尚未完成。'); }
    else throw new Error('算式尚未完成。');
    if (this.peek() === '^') {
      this.take(); const power = Number(this.take());
      if (!Number.isInteger(power) || power < 1 || power > 4) throw new Error('請使用 1 至 4 的正整數指數。');
      const base = value; value = constant(1n); for (let i = 0; i < power; i++) value = multiply(value, base);
    }
    return value;
  }
}
export type ParseResult = { ok: true; value: Polynomial } | { ok: false; message: string };
export function parseExpression(raw: string): ParseResult {
  try { return { ok: true, value: new Parser(raw).parse() }; } catch (error) { return { ok: false, message: error instanceof Error ? error.message : '請檢查答案。' }; }
}
export function equivalent(left: string, right: string) {
  const a = parseExpression(left), b = parseExpression(right);
  if (!a.ok || !b.ok) return false;
  return [...new Set([...a.value.keys(), ...b.value.keys()])].every(k => {
    const x = a.value.get(k) || zero(), y = b.value.get(k) || zero(); return x.n * y.d === y.n * x.d;
  });
}
const superscript = (n: number) => String(n).split('').map(d => '⁰¹²³⁴⁵⁶⁷⁸⁹'[Number(d)]).join('');
export function formatPolynomial(value: Polynomial): string {
  const entries = [...value].filter(([, v]) => v.n).sort(([a], [b]) => {
    const pa = a.split(',').map(Number), pb = b.split(',').map(Number);
    return pb.reduce((s, n) => s + n, 0) - pa.reduce((s, n) => s + n, 0) || b.localeCompare(a);
  });
  return entries.map(([k, coefficient], i) => {
    const letters = k.split(',').map((p, index) => Number(p) ? variables[index] + (Number(p) === 1 ? '' : superscript(Number(p))) : '').join('');
    const abs = coefficient.n < 0n ? -coefficient.n : coefficient.n;
    const numerator = `${letters && abs === 1n ? '' : abs}${letters}`;
    const text = coefficient.d === 1n ? numerator : `frac{${numerator}}{${coefficient.d}}`;
    return `${i ? coefficient.n < 0n ? ' − ' : ' ＋ ' : coefficient.n < 0n ? '−' : ''}${text}`;
  }).join('') || '0';
}
export function canonical(raw: string): string {
  const parsed = parseExpression(raw);
  if (!parsed.ok) throw new Error(parsed.message);
  return formatPolynomial(parsed.value);
}
export function isExpanded(raw: string) {
  // Each signed term must be one monomial, optionally over an integer denominator.
  const text = raw.replaceAll('＋', '+').replaceAll('−', '-').replace(/\s/g, '');
  const chunks: string[] = []; let start = 0, depth = 0;
  for (let i = 0; i < text.length; i++) {
    if (text[i] === '{') depth++; if (text[i] === '}') depth--;
    if (i > start && depth === 0 && '+-'.includes(text[i])) { chunks.push(text.slice(start, i)); start = i; }
  }
  chunks.push(text.slice(start)); const seen = new Set<string>();
  for (const chunk of chunks) {
    const monomial = chunk.replace(/frac\{([^{}]*)\}\{\d+\}/g, '$1');
    if (/[()*/×/{}]/.test(monomial) || monomial.includes('frac')) return false;
    const parsed = parseExpression(chunk);
    if (!parsed.ok || parsed.value.size > 1) return false;
    const k = [...parsed.value.keys()][0];
    if (k && seen.has(k)) return false;
    if (k) seen.add(k);
  }
  return true;
}
