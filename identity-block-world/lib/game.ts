import { canonical, equivalent, isExpanded, parseExpression, variables, type Variable } from './algebra.ts';
export type GameId = 'constants' | 'difference-squares' | 'square-sum' | 'square-difference';
export const gameIds: GameId[] = ['constants', 'difference-squares', 'square-sum', 'square-difference'];
export const GAME_TIME_LIMIT_SECONDS = 3600;
export const stageNames = ['未知常數', '平方差', '和的完全平方', '差的完全平方'];
export type Choice = { value: string; label: string; math?: boolean };
type BaseQuestion = { level: number; variant: number; prompt: string; expression: string; instruction: string; hint: string; usedVariables: Variable[] };
export type AlgebraQuestion = BaseQuestion & { kind: 'algebra'; expected: string; choices?: Choice[]; direct: boolean };
export type ChoiceQuestion = BaseQuestion & { kind: 'choice'; expected: string; choices: Choice[] };
export type NumericQuestion = BaseQuestion & { kind: 'numeric'; answer: number };
export type Question = AlgebraQuestion | ChoiceQuestion | NumericQuestion;
export type Session = { game: GameId; questions: Question[]; index: number; stage: number; errors: number; stageErrors: number; firstTry: number; questionErrors: number; skipped: number; currentFirstTryStreak: number; longestFirstTryStreak: number; solved: boolean; finished: boolean; expired: boolean; feedback: string; startedAt: number; completedAt: number | null };
const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(xs: readonly T[]) => xs[rand(0, xs.length - 1)];
const nz = (a: number, b: number): number => { let n = 0; while (!n) n = rand(a, b); return n; };
function shuffle<T>(xs: T[]) { const out = [...xs]; for (let i = out.length - 1; i; i--) { const j = rand(0, i); [out[i], out[j]] = [out[j], out[i]]; } return out; }
const signed = (n: number) => n < 0 ? `−${-n}` : String(n);
const linear = (v: string, c: number, n: number) => canonical(`${c}${v}+${n}`);
const frac = (n: string, d: number) => `frac{${n}}{${d}}`;
const base = (level: number, variant: number, expression: string, prompt: string, instruction: string, hint: string, usedVariables: Variable[]): BaseQuestion => ({ level, variant, expression: expression.replace(/ ＋ [−-]/g, ' − '), prompt, instruction, hint, usedVariables });
function expressionChoices(answer: string, wrong: string[] = []): Choice[] {
  const candidates = [answer, ...wrong, canonical(`${answer}+1`), canonical(`${answer}-1`), canonical(`-(${answer})`), canonical(`${answer}+2`)], unique: string[] = [];
  for (const candidate of candidates) if (!unique.some(existing => equivalent(existing, candidate))) unique.push(candidate);
  if (unique.length < 4) throw new Error('未能建立獨立選項。');
  return shuffle(unique.slice(0, 4).map(value => ({ value, label: value, math: true })));
}
function expansion(level: number, variant: number, expression: string, used: Variable[], prompt: string, hint: string, wrong: string[] = []): AlgebraQuestion {
  const expected = canonical(expression);
  return { ...base(level, variant, expression, prompt, '展開並合併同類項。', hint, used), kind: 'algebra', expected, direct: level === 2, choices: level === 2 ? undefined : expressionChoices(expected, wrong) };
}
function constants(level: number, variant: number): NumericQuestion {
  const x = pick(variables), a = nz(-6, 6), b = rand(-6, 6), c = rand(-12, 12), d = nz(-6, 6);
  let expression = '', answer = 0, target = 'A';
  if (level === 0) {
    const values = [a, variant === 0 ? 0 : b, c]; target = ['A', 'B', 'C'][variant % 3]; answer = values[variant % 3];
    expression = `A${x}² ＋ B${x} ＋ C ≡ ${canonical(`${values[0]}${x}²+${values[1]}${x}+${values[2]}`)}`;
  } else if (level === 1) {
    const source = `${a}${x}(${linear(x, 1, b)}) ＋ ${linear(x, d, c)}`;
    target = ['A', 'B', 'C'][variant % 3]; answer = [a, a * b + d, c][variant % 3];
    expression = `A${x}² ＋ B${x} ＋ C ≡ ${source}`;
  } else if (variant < 3) {
    target = ['A', 'B', 'C'][variant]; answer = [a, a * d + b, c][variant];
    // B denotes the expanded linear coefficient on the other side.
    expression = `(A${x} ${b < 0 ? '−' : '＋'} ${Math.abs(b)})(${linear(x, 1, d)}) ＋ C ≡ ${signed(a)}${x}² ＋ B${x} ${b * d + c < 0 ? '−' : '＋'} ${Math.abs(b * d + c)}`;
  } else {
    const outer = nz(-6, 6), inner = nz(-5, 5), offset = rand(-9, 9), addition = rand(-12, 12);
    target = variant === 3 ? 'A' : 'B'; answer = variant === 3 ? outer : inner;
    expression = `A(B${x} ${offset < 0 ? '−' : '＋'} ${Math.abs(offset)}) ${addition < 0 ? '−' : '＋'} ${Math.abs(addition)} ≡ ${linear(x, outer * inner, outer * offset + addition)}`;
    // When offset is zero, A cannot be determined separately. Reject this draw.
    if (!offset) return constants(level, variant);
  }
  return { ...base(level, variant, expression.trim(), '求恆等式中的未知常數', `${['A', 'B', 'C'].filter(letter => expression.includes(letter)).join('、')} 為常數，只須輸入 ${target} 的值。`, '先展開及合併同類項，再比較相同次方的係數；缺少的項，其係數是 0。', [x]), kind: 'numeric', answer };
}
function identityExpansion(game: 'difference-squares' | 'square-sum' | 'square-difference', level: number, variant: number): AlgebraQuestion {
  const x = pick(variables), y = pick(variables.filter(v => v !== x)), coefficient = level === 0 ? 1 : rand(1, level === 1 ? 6 : 9), n = rand(1, level === 0 ? 9 : 12);
  let first = coefficient === 1 ? x : `${coefficient}${x}`, second = String(n), used: Variable[] = [x];
  if (level === 1 && variant >= 3 || level === 2 && variant % 2 === 0) { second = `${rand(1, level === 1 ? 6 : 9)}${y}`; used = [x, y]; }
  if (level === 2 && (variant === 1 || variant === 3)) { first = frac(x, pick([2, 3, 4])); second = variant === 3 ? frac(`${rand(1, 3)}${y}`, pick([2, 3, 4])) : String(rand(1, 5)); if (variant === 3) used = [x, y]; }
  const sum = `${first} ＋ ${second}`, difference = `${first} − ${second}`;
  let expression = game === 'difference-squares' ? `(${sum})(${difference})` : `(${game === 'square-sum' ? sum : difference})²`;
  if (level === 1 && variant === 2) expression = game === 'difference-squares' ? `(${difference})(${sum})` : game === 'square-difference' ? `(${second} − ${first})²` : `(${second} ＋ ${first})²`;
  if (level === 2 && variant === 2) expression = `−(${expression}) ＋ ${rand(1, 9)}${x}²`;
  if (level === 2 && variant === 4) expression += ` − ${rand(1, 9)}${x}² ＋ ${linear(x, nz(-9, 9), rand(-12, 12))}`;
  const firstSquare = `(${first})²`, secondSquare = `(${second})²`, cross = `2(${first})(${second})`;
  const wrong = game === 'difference-squares'
    ? [canonical(`${firstSquare}+${secondSquare}`), canonical(`${firstSquare}-${cross}+${secondSquare}`), canonical(`${secondSquare}-${firstSquare}`)]
    : [canonical(`${firstSquare}+${secondSquare}`), canonical(`${firstSquare}${game === 'square-sum' ? '-' : '+'}${cross}+${secondSquare}`), canonical(`${firstSquare}${game === 'square-sum' ? '+' : '-'}(${first})(${second})+${secondSquare}`)];
  const hint = game === 'difference-squares' ? '兩因式的兩項相同，正負號相反；平方差沒有中間項。' : game === 'square-sum' ? '首項平方、兩項乘積的兩倍、末項平方；三項之間是加號。' : '首項平方，減去兩項乘積的兩倍，再加末項平方；末項仍是正號。';
  return expansion(level, variant, expression, used, `運用${stageNames[gameIds.indexOf(game)]}`, hint, wrong);
}
function generate(game: GameId, level: number, variant: number): Question {
  if (game === 'constants') return constants(level, variant);
  return identityExpansion(game, level, variant);
}
export const questionKey = (q: Question) => `${q.kind}|${q.prompt}|${q.expression}|${q.instruction}`;
function inRange(q: Question) {
  if (q.kind === 'numeric') return Number.isInteger(q.answer) && (q.prompt.includes('常數') ? q.answer >= -50 && q.answer <= 50 : q.answer >= 0 && q.answer <= 1000);
  if (q.kind !== 'algebra') return true;
  const parsed = parseExpression(q.expected);
  return parsed.ok && [...parsed.value].every(([k, v]) => k.split(',').map(Number).reduce((sum, n) => sum + n, 0) <= 2 && (v.n < 0n ? -v.n : v.n) <= 300n * v.d);
}
export function makeQuestions(game: GameId, previous: Question[] = []): Question[] {
  const used = new Set(previous.map(questionKey)), out: Question[] = [];
  for (let level = 0; level < 3; level++) {
    let attempts = 0;
    while (out.length < (level + 1) * 5) {
      if (++attempts > 5000) throw new Error('未能產生足夠的不重複題目。');
      const q = generate(game, level, out.length - level * 5), k = questionKey(q);
      if (!used.has(k) && inRange(q)) { used.add(k); out.push(q); }
    }
  }
  return [...shuffle(out.slice(0, 5)), ...shuffle(out.slice(5, 10)), ...shuffle(out.slice(10))];
}
export function startSession(game: GameId, questions = makeQuestions(game), now = Date.now()): Session {
  return { game, questions, index: 0, stage: 0, errors: 0, stageErrors: 0, firstTry: 0, questionErrors: 0, skipped: 0, currentFirstTryStreak: 0, longestFirstTryStreak: 0, solved: false, finished: false, expired: false, feedback: '', startedAt: now, completedAt: null };
}
export function expected(s: Session) { const q = s.questions[s.index]; return q.kind === 'numeric' ? String(q.answer) : q.expected; }
export function submit(s: Session, answer: string, now = Date.now()): Session {
  if (s.finished || s.solved) return s;
  const q = s.questions[s.index]; let accepted = false;
  if (q.kind === 'numeric') { if (!/^-?\d{1,4}$/.test(answer)) return { ...s, feedback: '請輸入整數答案。' }; accepted = Number(answer) === q.answer; }
  else if (q.kind === 'choice') accepted = answer === q.expected;
  else {
    const parsed = parseExpression(answer);
    if (!parsed.ok) return { ...s, feedback: parsed.message };
    if (!isExpanded(answer)) return { ...s, feedback: '請展開並合併同類項，再提交答案。' };
    accepted = equivalent(answer, q.expected);
  }
  if (!accepted) return { ...s, errors: s.errors + 1, questionErrors: s.questionErrors + 1, stageErrors: s.stageErrors + 1, currentFirstTryStreak: 0, feedback: `再試一次。${q.hint}` };
  const first = s.questionErrors === 0, streak = first ? s.currentFirstTryStreak + 1 : 0, finished = s.index === s.questions.length - 1;
  return { ...s, solved: true, finished, completedAt: finished ? now : null, firstTry: s.firstTry + Number(first), currentFirstTryStreak: streak, longestFirstTryStreak: Math.max(s.longestFirstTryStreak, streak), feedback: `答對了！這題獲得 ${first ? 10 : 5} 分。` };
}
export function skipQuestion(s: Session, now = Date.now()): Session {
  if (s.finished || s.solved || s.index < 10) return s;
  const finished = s.index === s.questions.length - 1;
  return { ...s, skipped: s.skipped + 1, solved: true, finished, completedAt: finished ? now : null, currentFirstTryStreak: 0, feedback: '已放棄本題，這題不計分。' };
}
export const score = (s: Session) => s.firstTry * 10 + Math.max(0, s.index + Number(s.solved) - s.firstTry - s.skipped) * 5;
export const elapsedSeconds = (s: Session, now: number) => Math.max(0, Math.floor(((s.completedAt ?? now) - s.startedAt) / 1000));
export function expireSession(s: Session, now = Date.now()): Session { return s.finished ? s : { ...s, finished: true, expired: true, completedAt: now, feedback: '遊戲時間已達 1 小時，本局已結束。' }; }
export function nextQuestion(s: Session): Session { return !s.solved || s.finished ? s : { ...s, index: s.index + 1, stage: 0, stageErrors: 0, questionErrors: 0, solved: false, feedback: '' }; }
export type Action = { type: 'start'; session: Session } | { type: 'answer'; value: string } | { type: 'next' } | { type: 'skip' } | { type: 'timeout' } | { type: 'home' };
export function reducer(s: Session | null, a: Action): Session | null {
  if (a.type === 'home') return null; if (a.type === 'start') return a.session; if (!s) return s;
  if (a.type === 'answer') return submit(s, a.value); if (a.type === 'skip') return skipQuestion(s); if (a.type === 'timeout') return expireSession(s); return nextQuestion(s);
}
