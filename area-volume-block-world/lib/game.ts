export type GameId = 'area-composite' | 'uniform-cross-section' | 'prism-volume' | 'total-surface-area';
export const GAME_TIME_LIMIT_SECONDS = 60 * 60;
export const gameIds: GameId[] = ['area-composite', 'uniform-cross-section', 'prism-volume', 'total-surface-area'];
export type Difficulty = 'basic' | 'core' | 'comprehensive';
export type ShapeName = 'square' | 'rectangle' | 'triangle' | 'trapezium' | 'parallelogram' | 'circle';
export type PlaneVariant = 'square' | 'rectangle' | 'triangle' | 'trapezium' | 'parallelogram' | 'l-notch' | 'rectangle-triangle' | 'u-notch' | 'rectangle-cut' | 'trapezium-cut' | 'double-notch' | 'roof-notch' | 'double-wing' | 'inscribed' | 'stepped';
export type SolidVariant = 'cube' | 'cuboid' | 'triangular-prism' | 'trapezium-prism' | 'parallelogram-prism' | 'l-prism' | 'u-prism' | 'given-base-prism';
export type CrossSolid = 'cuboid' | 'triangular-prism' | 'trapezium-prism' | 'pentagonal-prism' | 'cylinder' | 'pyramid' | 'cone' | 'sphere';
export type DiagramSpec =
  | { family: 'plane'; variant: PlaneVariant; values: Record<string, number> }
  | { family: 'solid'; variant: SolidVariant; values: Record<string, number> }
  | { family: 'cross-section'; solid: CrossSolid; shape?: ShapeName; parallel: boolean; mirror: boolean };
export type Choice = { value: string; label: string };
export type NumericQuestion = { kind: 'numeric'; level: Difficulty; prompt: string; answer: number; unit: 'cm' | 'cm²' | 'cm³'; diagram: DiagramSpec; hint: string };
export type CrossSectionQuestion = { kind: 'cross-section'; level: 'basic' | 'core'; prompt: string; diagram: DiagramSpec; directShape: boolean; hasUniform: boolean; shape?: ShapeName; hint: string };
export type Question = NumericQuestion | CrossSectionQuestion;
export type Session = { game: GameId; questions: Question[]; index: number; stage: number; errors: number; stageErrors: number; firstTry: number; questionErrors: number; skipped: number; currentFirstTryStreak: number; longestFirstTryStreak: number; solved: boolean; finished: boolean; expired: boolean; feedback: string; startedAt: number; completedAt: number | null };

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const shuffle = <T,>(items: T[]) => { const out = [...items]; for (let i = out.length - 1; i > 0; i--) { const j = rand(0, i); [out[i], out[j]] = [out[j], out[i]]; } return out; };
const numeric = (level: Difficulty, prompt: string, answer: number, unit: 'cm' | 'cm²' | 'cm³', diagram: DiagramSpec, hint: string): NumericQuestion => ({ kind: 'numeric', level, prompt, answer, unit, diagram, hint });
const plane = (variant: PlaneVariant, values: Record<string, number>): DiagramSpec => ({ family: 'plane', variant, values });
const solid = (variant: SolidVariant, values: Record<string, number>): DiagramSpec => ({ family: 'solid', variant, values });

function areaQuestion(index: number): NumericQuestion {
  if (index === 0) { const a = rand(3, 15); return numeric('basic', '求正方形的面積。', a * a, 'cm²', plane('square', { a }), '正方形面積＝邊長 × 邊長。'); }
  if (index === 1) { const w = rand(5, 20), h = rand(3, 15); return numeric('basic', '求長方形的面積。', w * h, 'cm²', plane('rectangle', { w, h }), '長方形面積＝長 × 闊。'); }
  if (index === 2) { const b = rand(4, 20), h = rand(3, 9) * 2; return numeric('basic', '求三角形的面積。', b * h / 2, 'cm²', plane('triangle', { b, h }), '三角形面積＝底 × 高 ÷ 2。'); }
  if (index === 3) { const u = rand(4, 12), l = rand(u + 2, 20), h = rand(2, 8) * 2; return numeric('basic', '求梯形的面積。', (u + l) * h / 2, 'cm²', plane('trapezium', { u, l, h }), '梯形面積＝（上底＋下底）× 高 ÷ 2。'); }
  if (index === 4) { const b = rand(5, 20), h = rand(3, 15); return numeric('basic', '求平行四邊形的面積。', b * h, 'cm²', plane('parallelogram', { b, h }), '平行四邊形面積＝底 × 垂直高。'); }
  const level: Difficulty = index < 10 ? 'core' : 'comprehensive', variant = index % 5;
  if (level === 'core' && variant === 0) { const w = rand(14, 24), h = rand(12, 20), cw = rand(3, 7), ch = rand(3, 7); return numeric(level, '求凹多邊形的面積。', w * h - cw * ch, 'cm²', plane('l-notch', { w, h, cw, ch }), '先補成一個大長方形，再減去缺角。'); }
  if (level === 'core' && variant === 1) { const w = rand(8, 16), h = rand(6, 12), b = rand(4, 12), th = rand(2, 7) * 2; return numeric(level, '把圖形分割後求總面積。', w * h + b * th / 2, 'cm²', plane('rectangle-triangle', { w, h, b, th }), '把圖形分成長方形和三角形。'); }
  if (level === 'core' && variant === 2) { const w = rand(14, 24), h = rand(12, 20), nw = rand(3, 7), nh = rand(4, 9); return numeric(level, '求 U 形圖形的面積。', w * h - nw * nh, 'cm²', plane('u-notch', { w, h, nw, nh }), '用外層長方形減去中間的空缺。'); }
  if (level === 'core' && variant === 3) { const w = rand(14, 24), h = rand(10, 18), b = rand(4, 10), th = rand(2, 7) * 2; return numeric(level, '用填補法求多邊形的面積。', w * h - b * th / 2, 'cm²', plane('rectangle-cut', { w, h, b, th }), '補成長方形，再減去多出的三角形。'); }
  if (level === 'core') { const u = rand(8, 14), l = rand(u + 4, 24), h = rand(4, 9) * 2, b = rand(2, 6), th = rand(2, 5) * 2; return numeric(level, '求有缺口的梯形面積。', (u + l) * h / 2 - b * th / 2, 'cm²', plane('trapezium-cut', { u, l, h, b, th }), '先求完整梯形，再減去缺口三角形。'); }
  if (variant === 0) { const w = rand(18, 28), h = rand(16, 26), c1 = rand(3, 7), c2 = rand(3, 7), d1 = rand(3, 7), d2 = rand(3, 7); return numeric(level, '求多個缺角組成的圖形面積。', w * h - c1 * d1 - c2 * d2, 'cm²', plane('double-notch', { w, h, c1, c2, d1, d2 }), '先補成大長方形，再減去兩個缺角。'); }
  if (variant === 1) { const w = rand(16, 26), h = rand(10, 18), roof = rand(3, 7) * 2, notch = rand(2, 6) * 2, nw = rand(3, 8); return numeric(level, '求有屋頂及缺口的圖形面積。', w * h + w * roof / 2 - nw * notch / 2, 'cm²', plane('roof-notch', { w, h, roof, notch, nw }), '分成長方形和屋頂三角形，最後減去缺口。'); }
  if (variant === 2) { const w = rand(8, 16), h = rand(10, 18), b1 = rand(4, 10), b2 = rand(4, 10), th = rand(2, 6) * 2; return numeric(level, '把圖形分成三部分後求面積。', w * h + (b1 + b2) * th / 2, 'cm²', plane('double-wing', { w, h, b1, b2, th }), '中間是長方形，左右各有一個三角形。'); }
  if (variant === 3) { const w = rand(16, 28), h = rand(14, 24), b1 = rand(4, 9), h1 = rand(3, 8) * 2, b2 = rand(4, 9), h2 = rand(3, 8) * 2; return numeric(level, '用填補法求圖中多邊形的面積。', w * h - b1 * h1 / 2 - b2 * h2 / 2, 'cm²', plane('inscribed', { w, h, b1, h1, b2, h2 }), '用外層長方形減去兩個外圍三角形。'); }
  const w = rand(18, 28), h1 = rand(6, 12), h2 = rand(5, 10), w1 = rand(5, 10), w2 = rand(4, 9); return numeric(level, '求階梯形多邊形的面積。', w * h1 + w1 * h2 + w2 * h2, 'cm²', plane('stepped', { w, h1, h2, w1, w2 }), '沿水平虛線分成三個長方形。');
}

function crossSectionQuestion(index: number): CrossSectionQuestion {
  if (index < 7) {
    const cases: [CrossSolid, ShapeName, boolean][] = [['cuboid', 'rectangle', true], ['cylinder', 'circle', true], ['triangular-prism', 'triangle', true], ['trapezium-prism', 'trapezium', true], ['pentagonal-prism', 'rectangle', false], ['cuboid', 'square', true], ['triangular-prism', 'rectangle', false]];
    const [solidName, shape, parallel] = cases[index];
    return { kind: 'cross-section', level: 'basic', prompt: '選出圖示切割所得的截面形狀。', diagram: { family: 'cross-section', solid: solidName, shape, parallel, mirror: Math.random() < 0.5 }, directShape: true, hasUniform: true, shape, hint: '觀察切割平面與立體哪些邊相交。' };
  }
  const cases: { solid: CrossSolid; uniform: boolean; shape?: ShapeName }[] = [
    { solid: 'cuboid', uniform: true, shape: 'rectangle' }, { solid: 'triangular-prism', uniform: true, shape: 'triangle' }, { solid: 'trapezium-prism', uniform: true, shape: 'trapezium' }, { solid: 'cylinder', uniform: true, shape: 'circle' },
    { solid: 'pyramid', uniform: false }, { solid: 'cone', uniform: false }, { solid: 'sphere', uniform: false }, { solid: 'cuboid', uniform: true, shape: 'square' },
  ];
  const item = cases[index - 7];
  return { kind: 'cross-section', level: 'core', prompt: '這個立體是否有均勻截面？', diagram: { family: 'cross-section', solid: item.solid, shape: item.shape, parallel: item.uniform, mirror: Math.random() < 0.5 }, directShape: false, hasUniform: item.uniform, shape: item.shape, hint: '均勻截面必須在不同位置都有相同形狀及大小。' };
}

function prismVolumeQuestion(index: number): NumericQuestion {
  const level: Difficulty = index < 5 ? 'basic' : index < 10 ? 'core' : 'comprehensive';
  if (index === 0) { const a = rand(2, 12); return numeric(level, '求正方體的體積。', a ** 3, 'cm³', solid('cube', { a }), '正方體體積＝邊長³。'); }
  if (index === 1 || index === 2) { const l = rand(5, 15), w = rand(3, 10), h = rand(2, 10); return numeric(level, '求長方體的體積。', l * w * h, 'cm³', solid('cuboid', { l, w, h }), '長方體體積＝長 × 闊 × 高。'); }
  if (index === 3) { const b = rand(4, 14), h = rand(2, 8) * 2, l = rand(4, 12); return numeric(level, '求三角柱體的體積。', b * h / 2 * l, 'cm³', solid('triangular-prism', { b, h, l }), '先求三角形底面積，再乘角柱體的高。'); }
  if (index === 4) { const u = rand(4, 9), d = rand(u + 2, 15), h = rand(2, 7) * 2, l = rand(3, 10); return numeric(level, '求梯形角柱體的體積。', (u + d) * h / 2 * l, 'cm³', solid('trapezium-prism', { u, d, h, l }), '體積＝梯形底面積 × 角柱體的高。'); }
  const variant = index % 5;
  if (level === 'core' && variant === 0) { const b = rand(6, 16), h = rand(4, 12), l = rand(5, 15); return numeric(level, '先求平行四邊形底面積，再求角柱體體積。', b * h * l, 'cm³', solid('parallelogram-prism', { b, h, l, s: rand(5, 12) }), '底面積＝底 × 垂直高。'); }
  if (level === 'core' && variant === 1) { const b = rand(6, 16), h = rand(3, 9) * 2, l = rand(5, 14); return numeric(level, '先求三角形底面積，再求角柱體體積。', b * h / 2 * l, 'cm³', solid('triangular-prism', { b, h, l }), '三角形底面積要除以 2。'); }
  if (level === 'core' && variant === 2) { const u = rand(5, 10), d = rand(u + 3, 17), h = rand(3, 8) * 2, l = rand(4, 12); return numeric(level, '先求梯形底面積，再求角柱體體積。', (u + d) * h / 2 * l, 'cm³', solid('trapezium-prism', { u, d, h, l }), '將兩條平行邊相加，再乘垂直高及除以 2。'); }
  if (level === 'core' && variant === 3) { const w = rand(10, 18), h = rand(8, 15), cw = rand(2, 6), ch = rand(2, 5), l = rand(4, 10); return numeric(level, '底面是 L 形，求角柱體體積。', (w * h - cw * ch) * l, 'cm³', solid('l-prism', { w, h, cw, ch, l }), '先用填補法求 L 形底面積。'); }
  if (level === 'core') { const area = rand(12, 90), l = rand(4, 15); return numeric(level, '已知底面積，求角柱體體積。', area * l, 'cm³', solid('given-base-prism', { area, l }), '體積＝底面積 × 高。'); }
  if (variant === 0) { const w = rand(12, 20), h = rand(10, 17), cw = rand(3, 7), ch = rand(3, 7), l = rand(5, 12); return numeric(level, '求複合底面角柱體的體積。', (w * h - cw * ch) * l, 'cm³', solid('l-prism', { w, h, cw, ch, l }), '先求完整長方形面積，再減去缺角。'); }
  if (variant === 1) { const w = rand(14, 22), h = rand(10, 18), nw = rand(3, 7), nh = rand(3, 8), l = rand(4, 11); return numeric(level, '底面是 U 形，求角柱體體積。', (w * h - nw * nh) * l, 'cm³', solid('u-prism', { w, h, nw, nh, l }), '底面積＝外層長方形減去中間缺口。'); }
  if (variant === 2) { const area = rand(18, 90), l = rand(5, 20), volume = area * l; return numeric(level, `角柱體的體積為 ${volume} cm³，求角柱體的高。`, l, 'cm', solid('given-base-prism', { area, l: 0, volume }), '角柱體的高＝體積 ÷ 底面積。'); }
  if (variant === 3) { const b = rand(6, 16), h = rand(3, 8) * 2, l = rand(4, 15), volume = b * h / 2 * l; return numeric(level, `三角柱體的體積為 ${volume} cm³，求角柱體的高。`, l, 'cm', solid('triangular-prism', { b, h, l: 0, volume }), '先求三角形底面積，再用體積除以底面積。'); }
  const w = rand(8, 15), h = rand(6, 12), b = rand(4, 10), th = rand(2, 6) * 2, l = rand(4, 10); return numeric(level, '底面由長方形及三角形組成，求角柱體體積。', (w * h + b * th / 2) * l, 'cm³', solid('l-prism', { w, h, b, th, l, joined: 1 }), '將底面分成長方形及三角形，再乘角柱體的高。');
}

function totalSurfaceAreaQuestion(index: number): NumericQuestion {
  const level: Difficulty = index < 5 ? 'basic' : index < 10 ? 'core' : 'comprehensive';
  const cube = () => { const a = rand(2, 12); return numeric(level, '求正方體的總表面面積。', 6 * a * a, 'cm²', solid('cube', { a }), '正方體有 6 個完全相同的正方形面。'); };
  const cuboid = () => { const l = rand(5, 16), w = rand(3, 11), h = rand(2, 10); return numeric(level, '求長方體的總表面面積。', 2 * (l * w + l * h + w * h), 'cm²', solid('cuboid', { l, w, h }), '總表面面積＝2 ×（長 × 闊＋長 × 高＋闊 × 高）。'); };
  if (index === 0) return cube();
  if (index === 1) return cuboid();
  const variant = index % 5;
  if (variant === 2 && level !== 'comprehensive') { const k = rand(1, 3), b = 3 * k, h = 4 * k, s = 5 * k, l = rand(4, level === 'basic' ? 10 : 16), area = b * h / 2; return numeric(level, '求直角三角柱體的總表面面積。', 2 * area + (b + h + s) * l, 'cm²', solid('triangular-prism', { b, h, s, l }), '總表面面積＝2 × 底面積＋底的周界 × 高。'); }
  if (variant === 3 && level !== 'comprehensive') { const k = rand(1, 3), u = 3 * k, d = 6 * k, h = 4 * k, s = 5 * k, l = rand(4, 13), area = (u + d) * h / 2, perimeter = u + d + h + s; return numeric(level, '求梯形角柱體的總表面面積。', 2 * area + perimeter * l, 'cm²', solid('trapezium-prism', { u, d, h, s, l }), '先求梯形底面積及底的周界。'); }
  if (variant === 4 && level !== 'comprehensive') { const b = rand(6, 15), h = rand(3, 10), s = rand(5, 13), l = rand(4, 13), area = b * h; return numeric(level, '求平行四邊形角柱體的總表面面積。', 2 * area + 2 * (b + s) * l, 'cm²', solid('parallelogram-prism', { b, h, s, l }), '底的周界要使用平行四邊形的邊長，不是垂直高。'); }
  if (level !== 'comprehensive') return variant === 0 ? cube() : cuboid();
  if (variant === 0) { const w = rand(12, 20), h = rand(10, 18), cw = rand(3, 7), ch = rand(3, 7), l = rand(5, 12), area = w * h - cw * ch, perimeter = 2 * (w + h); return numeric(level, '底面是 L 形，求角柱體的總表面面積。', 2 * area + perimeter * l, 'cm²', solid('l-prism', { w, h, cw, ch, l }), '先求 L 形的面積及周界，再代入公式。'); }
  if (variant === 1) { const w = rand(14, 22), h = rand(10, 18), nw = rand(3, 7), nh = rand(3, 8), l = rand(4, 11), area = w * h - nw * nh, perimeter = 2 * (w + h + nh); return numeric(level, '底面是 U 形，求角柱體的總表面面積。', 2 * area + perimeter * l, 'cm²', solid('u-prism', { w, h, nw, nh, l }), '凹入部分的兩條邊也屬於底的周界。'); }
  if (variant === 2) { const k = rand(1, 3), b = 3 * k, h = 4 * k, s = 5 * k, l = rand(5, 14), volume = b * h / 2 * l; return numeric(level, `直角三角柱體的體積為 ${volume} cm³，求其總表面面積。`, b * h + (b + h + s) * l, 'cm²', solid('triangular-prism', { b, h, s, l: 0, volume }), '先用體積除以三角形底面積，求角柱體的高。'); }
  if (variant === 3) { const l = rand(5, 15), w = rand(3, 10), h = rand(2, 9), area = 2 * (l * w + l * h + w * h); return numeric(level, `長方體的總表面面積為 ${area} cm²，長為 ${l} cm、闊為 ${w} cm，求高。`, h, 'cm', solid('cuboid', { l, w, h: 0, area }), '設高為未知數，代入 2 ×（長 × 闊＋長 × 高＋闊 × 高）。'); }
  const b = rand(6, 14), h = rand(4, 10), s = rand(5, 12), l = rand(5, 12), area = b * h; return numeric(level, '底面為平行四邊形，求角柱體的總表面面積。', 2 * area + 2 * (b + s) * l, 'cm²', solid('parallelogram-prism', { b, h, s, l }), '先分別求兩個底面及所有側面的面積。');
}

function generate(game: GameId, index: number): Question { if (game === 'area-composite') return areaQuestion(index); if (game === 'uniform-cross-section') return crossSectionQuestion(index); if (game === 'prism-volume') return prismVolumeQuestion(index); return totalSurfaceAreaQuestion(index); }
export const questionKey = (question: Question) => JSON.stringify(question);
export function makeQuestions(game: GameId, previous: Question[] = []) { const used = new Set(previous.map(questionKey)), questions: Question[] = []; for (let index = 0; index < 15; index++) { let attempts = 0, question: Question, key = ''; do { if (++attempts > 5000) throw new Error('未能產生足夠的不重複題目。'); question = generate(game, index); key = questionKey(question); } while (used.has(key) || questions.some(item => questionKey(item) === key)); questions.push(question); used.add(key); } return questions; }
export function startSession(game: GameId, questions = makeQuestions(game), now = Date.now()): Session { return { game, questions, index: 0, stage: 0, errors: 0, stageErrors: 0, firstTry: 0, questionErrors: 0, skipped: 0, currentFirstTryStreak: 0, longestFirstTryStreak: 0, solved: false, finished: false, expired: false, feedback: '', startedAt: now, completedAt: null }; }
function correct(session: Session, now: number) { const finished = session.index === session.questions.length - 1, first = session.questionErrors === 0, streak = first ? session.currentFirstTryStreak + 1 : 0; return { ...session, solved: true, finished, completedAt: finished ? now : null, firstTry: session.firstTry + (first ? 1 : 0), currentFirstTryStreak: streak, longestFirstTryStreak: Math.max(session.longestFirstTryStreak, streak), feedback: `答對了！這題獲得 ${first ? 10 : 5} 分。` }; }
function wrong(session: Session, hint: string) { return { ...session, errors: session.errors + 1, questionErrors: session.questionErrors + 1, stageErrors: session.stageErrors + 1, currentFirstTryStreak: 0, feedback: `再試一次。${hint}` }; }
export function expected(session: Session) { const question = session.questions[session.index]; if (question.kind === 'numeric') return String(question.answer); if (question.directShape || session.stage === 1) return question.shape ?? ''; return question.hasUniform ? 'yes' : 'no'; }
export function submit(session: Session, answer: string, now = Date.now()): Session { if (session.finished || session.solved) return session; const question = session.questions[session.index]; if (question.kind === 'numeric') { if (!/^\d{1,4}$/.test(answer)) return { ...session, feedback: '請輸入 0 至 9999 的整數。' }; return Number(answer) === question.answer ? correct(session, now) : wrong(session, question.hint); } if (answer === expected(session)) { if (!question.directShape && session.stage === 0 && question.hasUniform) return { ...session, stage: 1, feedback: '判斷正確，請再選出均勻截面的形狀。' }; return correct(session, now); } return wrong(session, question.hint); }
export function canSkip(session: Session) { return session.game !== 'uniform-cross-section' && session.index >= 10 && !session.solved && !session.finished; }
export function skipQuestion(session: Session, now = Date.now()): Session { if (!canSkip(session)) return session; const finished = session.index === session.questions.length - 1; return { ...session, skipped: session.skipped + 1, solved: true, finished, completedAt: finished ? now : null, currentFirstTryStreak: 0, feedback: '已放棄本題，這題不計分。' }; }
export function expireSession(session: Session, now = Date.now()): Session { return session.finished ? session : { ...session, solved: false, finished: true, expired: true, completedAt: now, feedback: '遊戲時間已達 1 小時，本局已結束。' }; }
export const score = (session: Session) => { const completed = session.index + (session.solved ? 1 : 0); return session.firstTry * 10 + Math.max(0, completed - session.firstTry - session.skipped) * 5; };
export const elapsedSeconds = (session: Session, now: number) => Math.max(0, Math.floor(((session.completedAt ?? now) - session.startedAt) / 1000));
export function nextQuestion(session: Session): Session { return !session.solved || session.finished ? session : { ...session, index: session.index + 1, stage: 0, stageErrors: 0, questionErrors: 0, solved: false, feedback: '' }; }
export type Action = { type: 'start'; session: Session } | { type: 'answer'; value: string } | { type: 'next' } | { type: 'skip' } | { type: 'timeout' } | { type: 'home' };
export function reducer(session: Session | null, action: Action): Session | null { if (action.type === 'home') return null; if (action.type === 'start') return action.session; if (!session) return session; if (action.type === 'answer') return submit(session, action.value); if (action.type === 'skip') return skipQuestion(session); if (action.type === 'timeout') return expireSession(session); return nextQuestion(session); }
export const shapeLabels: Record<ShapeName, string> = { square: '正方形', rectangle: '長方形', triangle: '三角形', trapezium: '梯形', parallelogram: '平行四邊形', circle: '圓形' };
export function shapeChoices(answer?: ShapeName): Choice[] { const pool = shuffle((Object.keys(shapeLabels) as ShapeName[]).filter(shape => shape !== answer)).slice(0, 3); if (answer) pool.push(answer); return shuffle(pool.map(shape => ({ value: shape, label: shapeLabels[shape] }))); }
