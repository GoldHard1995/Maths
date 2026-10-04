export const gameIds = ['conversion', 'applications', 'increase', 'decrease', 'profit-loss', 'discount'] as const;
export type GameId = (typeof gameIds)[number];
export const GAME_TIME_LIMIT_SECONDS = 60 * 60;
export type Choice = { value: string; label: string };
export type Question = {
  kind: 'numeric' | 'choice'; level: number; variant: number; template: string;
  prompt: string; expression?: string; instruction: string; answer: string;
  unit: string; decimal: boolean; choices?: Choice[]; hint: string;
  facts: Record<string, number>; key: string;
};
export type Session = {
  game: GameId; questions: Question[]; index: number; stage: number; errors: number;
  stageErrors: number; firstTry: number; questionErrors: number; skipped: number;
  currentFirstTryStreak: number; longestFirstTryStreak: number; solved: boolean;
  finished: boolean; expired: boolean; feedback: string; startedAt: number; completedAt: number | null;
};
export const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T,>(values: readonly T[]): T => values[rand(0, values.length - 1)];
const shuffle = <T,>(values: T[]) => {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i--) { const j = rand(0, i); [result[i], result[j]] = [result[j], result[i]]; }
  return result;
};
const gcd = (a: number, b: number): number => b ? gcd(b, a % b) : a;
const fraction = (n: number, d: number) => { const g = gcd(n, d); return d / g === 1 ? String(n / g) : `${n / g}/${d / g}`; };
export function parseAnswer(value: string): [number, number] | null {
  const text = value.trim();
  if (/^\d{1,4}\/\d{1,4}$/.test(text)) { const [n, d] = text.split('/').map(Number); return d > 0 ? [n, d] : null; }
  const match = /^(\d{1,4})(?:\.(\d{1,2}))?$/.exec(text);
  if (!match) return null;
  const places = match[2]?.length || 0, denominator = 10 ** places;
  return [Number(match[1]) * denominator + Number(match[2] || 0), denominator];
}
export function answerEquals(value: string, answer: string) {
  const a = parseAnswer(value), b = parseAnswer(answer);
  return Boolean(a && b && a[0] * b[1] === b[0] * a[1]);
}
const numberText = (value: number) => String(Math.round(value * 100) / 100);
const foldName = (paidRate: number) => {
  const digits = '零一二三四五六七八九';
  return `${digits[Math.floor(paidRate / 10)]}${paidRate % 10 ? '五' : ''}折`;
};
function choiceLabel(value: string, unit: string) {
  if (unit === '折') return foldName(Number(value) * 10);
  const displayed = value.includes('/') ? value.replace('/', ' ÷ ') : value;
  return unit === '%' ? `${displayed}%` : unit === '元' ? `$${displayed}` : `${displayed}${unit ? ` ${unit}` : ''}`;
}
function lifeDistractors(template: string, f: Record<string, number>): string[] {
  let values: number[];
  switch (template) {
    case 'part-rate': values = [100 - f.rate, f.part, f.part * 100 / (f.total - f.part)]; break;
    case 'part': values = [f.total - f.part, f.rate, f.total - f.rate, f.total]; break;
    case 'remaining-part': values = [f.part, f.total - f.rate, f.rate, f.total]; break;
    case 'remaining-rate': values = [f.rate, f.total - f.part, f.part, f.total]; break;
    case 'change-amount': values = [f.rate, f.original / f.rate, 2 * f.original - f.next, f.amount + 10, f.amount - 10]; break;
    case 'change-new': values = [f.amount, 2 * f.original - f.next, f.original, f.original + Math.sign(f.next - f.original) * f.rate]; break;
    case 'trade-amount': values = [f.rate, f.amount + 10, f.amount - 10, f.amount + 1, f.amount - 1]; break;
    case 'trade-sale': values = [f.amount, f.cost, 2 * f.cost - f.sale, f.cost + (f.profit ? f.rate : -f.rate)]; break;
    case 'fold-to-rate': values = [f.paidRate, f.paidRate / 10, 100 - f.paidRate / 10]; break;
    case 'rate-to-fold': values = [f.rate / 10]; break;
    case 'discount-sale': values = [f.saving, f.marked - f.rate, f.rate, f.marked]; break;
    default: values = [];
  }
  return shuffle(values).map(numberText);
}
function options(answer: string, unit: string, preferred: string[] = [], integerOnly = false, quantityLimit = 1000): Choice[] {
  const accepted: string[] = [answer];
  const parsed = parseAnswer(answer)!;
  const value = parsed[0] / parsed[1];
  const candidates = unit === '折'
    ? [...preferred, ...shuffle(Array.from({ length: 18 }, (_, i) => numberText(1 + i * .5)))]
    : integerOnly
      ? [...preferred, ...shuffle([10, -10, 5, -5, 1, -1]).map(offset => numberText(value + offset)), '1', '2', '3', '4']
      : [...preferred, numberText(value * 100), numberText(value / 100), numberText(value * 2), numberText(value / 2), numberText(value + 1), numberText(value + 5), numberText(Math.max(0, value - 1)), '0', '1', '2', '3'];
  const limit = unit === '折' ? 9.5 : unit === '%' ? (integerOnly ? 100 : 300) : quantityLimit;
  for (const candidate of candidates) {
    const ratio = parseAnswer(candidate);
    if (ratio && ratio[0] / ratio[1] <= limit && (!integerOnly || ratio[0] >= ratio[1]) && (!(integerOnly && unit !== '折') || ratio[0] % ratio[1] === 0) && (unit !== '%' || ratio[0] % ratio[1] === 0) && !accepted.some(old => answerEquals(candidate, old))) accepted.push(candidate);
    if (accepted.length === 4) break;
  }
  if (accepted.length !== 4) throw new Error('未能產生四個獨立選項。');
  return shuffle(accepted.map(value => ({ value, label: choiceLabel(value, unit) })));
}
function question(game: GameId, level: number, variant: number, template: string, prompt: string, answer: string | number, unit: string, facts: Record<string, number>, hint: string, expression?: string, wrong: string[] = []): Question {
  const expected = typeof answer === 'number' ? numberText(answer) : answer;
  const direct = game === 'conversion' || game === 'applications' ? level === 2 : level > 0;
  const decimal = direct && template === 'to-decimal';
  const key = `${game}|${template}|${JSON.stringify(facts)}`;
  return { kind: direct ? 'numeric' : 'choice', level, variant, template, prompt, expression, answer: expected, unit, decimal, facts, key, hint,
    instruction: direct ? `使用數字鍵盤輸入${unit === '%' ? '百分數的數值，毋須輸入 %' : unit === '元' ? '金額，毋須輸入 $' : '最終答案'}。` : '選出正確答案。',
    ...(direct ? {} : { choices: options(expected, unit, game === 'conversion' ? wrong : lifeDistractors(template, facts), game !== 'conversion', game === 'applications' ? facts.total : 1000) }) };
}
const conversionHint = '百分數化小數要除以 100；小數或分數化百分數要乘以 100。';
function conversion(level: number, variant: number) {
  if (level === 2 && variant >= 2) {
    const a = rand(1, 99), b = rand(1, 99), plus = variant === 3 || (variant === 2 && Math.random() < .5);
    const result = variant === 2 ? (plus ? a + b : Math.abs(a - b)) : plus ? 100 + a : 100 - a;
    if (!result) return null;
    const expression = variant === 2 ? `${Math.max(a, b)}% ${plus ? '＋' : '−'} ${Math.min(a, b)}%` : `1 ${plus ? '＋' : '−'} ${a}%`;
    return question('conversion', level, variant, variant === 2 ? 'percent-arithmetic' : 'one-plus-minus', '計算以下數式，答案以百分數表示。', result, '%', { a: variant === 2 ? Math.max(a, b) : 100, b: variant === 2 ? Math.min(a, b) : a, sign: plus ? 1 : -1 }, '先把 1 看作 100%，再進行百分數加減。', expression);
  }
  let rate = level === 0 ? rand(1, 100) : rand(1, 300);
  let mode: 'to-decimal' | 'decimal-to-percent' | 'percent-to-fraction' | 'fraction-to-percent';
  if (level === 0) mode = variant < 2 ? 'to-decimal' : variant < 4 ? 'decimal-to-percent' : 'fraction-to-percent';
  else if (level === 1) mode = variant < 2 ? 'percent-to-fraction' : variant < 4 ? 'fraction-to-percent' : 'to-decimal';
  else mode = variant === 0 ? 'to-decimal' : 'decimal-to-percent';
  if (level === 0 && variant === 4) rate = pick([10, 20, 25, 40, 50, 60, 75, 80, 90]);
  if ((level === 1 && variant >= 2) || (level === 2 && variant === 1)) rate = rand(101, 300);
  if (level === 2 && variant === 0) rate = rand(1, 9);
  if ((mode === 'percent-to-fraction' || mode === 'fraction-to-percent') && rate % 100 === 0) return null;
  const f = fraction(rate, 100), [n, d] = f.split('/').map(Number);
  const mixed = mode === 'fraction-to-percent' && level === 1 && variant === 3;
  const displayFraction = mixed ? `${Math.floor(n / d)} ＋ ${n % d} ÷ ${d}` : f.replace('/', ' ÷ ');
  const prompt = mode === 'to-decimal' ? '把以下百分數化為整數或小數。' : mode === 'decimal-to-percent' ? '把以下整數或小數化為百分數。' : mode === 'percent-to-fraction' ? '把以下百分數化為最簡分數。' : mixed ? '把以下帶分數化為百分數。' : '把以下分數化為百分數。';
  const expression = mode === 'decimal-to-percent' ? numberText(rate / 100) : mode === 'fraction-to-percent' ? displayFraction : `${rate}%`;
  const answer = mode === 'to-decimal' ? numberText(rate / 100) : mode === 'percent-to-fraction' ? f : String(rate);
  return question('conversion', level, variant, mode, prompt, answer, mode.includes('to-percent') ? '%' : '', { rate }, conversionHint, expression, mode === 'percent-to-fraction' ? [fraction(rate, 10), fraction(rate, 1000), fraction(100, rate)] : []);
}
type QuantityContext = { subject: string; unit: string; outer: string; inner: string; min: number; max: number; maxRate?: number; minInner?: number; maxInner?: number };
const quantities: QuantityContext[] = [
  { subject: '某學校的學生', unit: '人', outer: '參加運動隊的學生', inner: '參加籃球隊的學生', min: 200, max: 1000, maxRate: 40, minInner: 5, maxInner: 60 },
  { subject: '某書架上的書籍', unit: '本', outer: '中文書', inner: '中文故事書', min: 40, max: 600 },
  { subject: '某文具店的筆記簿', unit: '本', outer: '橫線筆記簿', inner: '藍色封面的橫線筆記簿', min: 40, max: 500 },
  { subject: '某商店的上衣', unit: '件', outer: '運動上衣', inner: '短袖運動上衣', min: 40, max: 500 },
  { subject: '某活動的參加者', unit: '人', outer: '學生參加者', inner: '中一學生參加者', min: 40, max: 800 },
  { subject: '某圖書館新購入的書籍', unit: '本', outer: '小說', inner: '偵探小說', min: 60, max: 1000 },
  { subject: '某餅店當天製作的麵包', unit: '個', outer: '甜麵包', inner: '紅豆甜麵包', min: 40, max: 500 },
  { subject: '某倉庫的飲品', unit: '瓶', outer: '果汁', inner: '橙汁', min: 60, max: 1000 },
];
function applications(level: number, variant: number) {
  const c = pick(quantities), total = rand(Math.ceil(c.min / 10), Math.floor(c.max / 10)) * 10;
  const rates = Array.from({ length: c.maxRate ?? 99 }, (_, i) => i + 1).filter(rate => total * rate % 100 === 0);
  const rate = pick(rates), part = total * rate / 100, rest = total - part;
  const facts = { total, part, rate };
  const hint = '求百分率用「部分 ÷ 全部 × 100%」；求部分用「全部 × 百分率」。';
  if (level === 0) {
    if (variant < 2) return question('applications', level, variant, 'part-rate', `${c.subject}共有 ${total} ${c.unit}，其中${c.outer}有 ${part} ${c.unit}。${c.outer}佔全部的百分之幾？`, rate, '%', facts, hint);
    return question('applications', level, variant, 'part', `${c.subject}共有 ${total} ${c.unit}，其中 ${rate}% 是${c.outer}。${c.outer}有多少${c.unit}？`, part, c.unit, facts, hint);
  }
  if (level === 1) {
    if (variant < 3) return question('applications', level, variant, 'remaining-part', `${c.subject}共有 ${total} ${c.unit}，其中 ${rate}% 是${c.outer}。其餘共有多少${c.unit}？`, rest, c.unit, facts, '先用 100% 減去已知百分率，再乘全部數量。');
    return question('applications', level, variant, 'remaining-rate', `${c.subject}共有 ${total} ${c.unit}，其中${c.outer}有 ${part} ${c.unit}。其餘佔全部的百分之幾？`, 100 - rate, '%', facts, '先求其餘數量，再除以全部數量，乘 100%。');
  }
  const innerRates = Array.from({ length: 99 }, (_, i) => i + 1).filter(q => part * q % 100 === 0 && part * q / 100 >= (c.minInner ?? 1) && part * q / 100 <= (c.maxInner ?? part - 1));
  if (!innerRates.length) return null;
  const innerRate = pick(innerRates), inner = part * innerRate / 100;
  const nestedFacts = { ...facts, innerRate, inner };
  if (variant < 2) return question('applications', level, variant, 'nested-part', `${c.subject}共有 ${total} ${c.unit}。${c.outer}佔全部的 ${rate}%，而${c.inner}佔${c.outer}的 ${innerRate}%。${c.inner}共有多少${c.unit}？`, inner, c.unit, nestedFacts, '第二個百分率以第一層部分為全部，依次乘上兩個百分率。');
  if (variant < 4) return question('applications', level, variant, 'nested-whole', `${c.subject}中，${c.outer}佔全部的 ${rate}%，而${c.inner}佔${c.outer}的 ${innerRate}%。已知${c.inner}有 ${inner} ${c.unit}，全部共有多少${c.unit}？`, total, c.unit, nestedFacts, '先由第二層部分反求第一層部分，再反求全部；兩次都用除法。');
  return question('applications', level, variant, 'nested-other', `${c.subject}中，${c.outer}佔全部的 ${rate}%，而${c.inner}佔${c.outer}的 ${innerRate}%。已知${c.inner}有 ${inner} ${c.unit}。不是${c.outer}的共有多少${c.unit}？`, rest, c.unit, nestedFacts, '先由兩層百分率反求全部，再求不屬於第一層部分的數量。');
}
type ChangeContext = { subject: string; unit: string; min: number; max: number; maxRate: number };
const changes: ChangeContext[] = [
  { subject: '某款筆記簿的售價', unit: '元', min: 5, max: 80, maxRate: 100 },
  { subject: '某款背包的售價', unit: '元', min: 80, max: 600, maxRate: 60 },
  { subject: '某校的學生人數', unit: '人', min: 200, max: 1000, maxRate: 30 },
  { subject: '某社區活動的參加人數', unit: '人', min: 40, max: 600, maxRate: 80 },
  { subject: '某閱讀室的藏書數量', unit: '本', min: 100, max: 1000, maxRate: 50 },
  { subject: '某店每月售出的水樽數量', unit: '個', min: 30, max: 500, maxRate: 80 },
  { subject: '某家庭每星期儲蓄的金額', unit: '元', min: 10, max: 500, maxRate: 100 },
];
function change(game: 'increase' | 'decrease', level: number, variant: number) {
  const c = pick(changes), original = rand(Math.ceil(c.min / 5), Math.floor(c.max / 5)) * 5;
  const rate = rand(1, Math.min(c.maxRate, game === 'increase' ? 100 : 99));
  if (original * rate % 100) return null;
  const amount = original * rate / 100, next = original + (game === 'increase' ? amount : -amount);
  if (next < 1 || next > 1000) return null;
  const verb = game === 'increase' ? '增加' : '減少', label = game === 'increase' ? '增值' : '減值';
  const subject = game === 'decrease' && c.unit === '元' && c.subject.includes('售價') && rate > 50 ? `清貨時，${c.subject}` : c.subject;
  const facts = { original, rate, amount, next };
  const value = (n: number) => `${n} ${c.unit}`;
  const direct = level === 0 ? variant < 2 ? 'change-amount' : 'change-new' : level === 1 ? variant < 3 ? 'change-rate' : 'change-rate-from-amount' : variant < 3 ? 'change-original-from-new' : 'change-new-from-amount';
  let prompt = '', answer = 0, unit = c.unit;
  if (direct === 'change-amount' || direct === 'change-new') { prompt = `${subject}原來為 ${value(original)}，現${verb} ${rate}%。求${direct === 'change-amount' ? `${label}（${verb}的數量）` : '變化後的新值'}。`; answer = direct === 'change-amount' ? amount : next; }
  if (direct === 'change-rate') { prompt = `${subject}由 ${value(original)} ${verb}至 ${value(next)}。求百分${verb}。`; answer = rate; unit = '%'; }
  if (direct === 'change-rate-from-amount') { prompt = `${subject}原來為 ${value(original)}，現${verb}了 ${value(amount)}。求百分${verb}。`; answer = rate; unit = '%'; }
  if (direct === 'change-new-from-amount') { prompt = `${subject}${verb}了 ${value(amount)}，相當於原值的 ${rate}%。求變化後的新值。`; answer = next; }
  if (direct === 'change-original-from-new') { prompt = `${subject}${verb} ${rate}% 後為 ${value(next)}。求原值。`; answer = original; }
  const hint = direct === 'change-rate' ? '先求變化量，再除以原值；百分變化的分母是原值。' : direct === 'change-rate-from-amount' ? '用已知的變化量除以原值，再乘 100%。' : direct === 'change-original-from-new' ? `新值是原值的 (100 ${game === 'increase' ? '＋' : '−'} ${rate})%，用新值除以這個百分率。` : direct.includes('from-amount') ? '先用變化量除以百分率求原值，再按題目要求求原值或新值。' : `先用原值乘百分率求${label}，求新值時再${verb === '增加' ? '加上增值' : '減去減值'}。`;
  return question(game, level, variant, direct, prompt, answer, unit, facts, hint);
}
type Product = { name: string; classifier: string; min: number; max: number; markedMax: number };
const products: Product[] = [
  { name: '原子筆', classifier: '枝', min: 5, max: 25, markedMax: 60 },
  { name: '筆記簿', classifier: '本', min: 5, max: 40, markedMax: 100 },
  { name: '水樽', classifier: '個', min: 20, max: 100, markedMax: 250 },
  { name: '環保袋', classifier: '個', min: 10, max: 80, markedMax: 200 },
  { name: '背包', classifier: '個', min: 60, max: 400, markedMax: 900 },
  { name: '拼圖', classifier: '盒', min: 20, max: 200, markedMax: 500 },
];
function trade(level: number, variant: number) {
  if (level === 2 && variant >= 3) return batchTrade(variant);
  const product = pick(products), cost = rand(Math.ceil(product.min / 5), Math.floor(product.max / 5)) * 5;
  const profit = level === 0 ? [true, false, true, false, true][variant] : [true, false, true, true, false][variant];
  const rate = rand(1, profit ? 100 : 99);
  if (cost * rate % 100) return null;
  const amount = cost * rate / 100, sale = cost + (profit ? amount : -amount);
  if (sale < 1 || sale > 1000) return null;
  const label = profit ? '盈利' : '虧蝕', item = `一${product.classifier}${product.name}`, facts = { cost, sale, amount, rate, profit: Number(profit) };
  const template = level === 0 ? variant < 2 ? 'trade-amount' : 'trade-sale' : level === 1 ? variant < 3 ? 'trade-rate' : 'trade-sale' : 'trade-cost-from-sale';
  let prompt = '', answer = 0, unit = '元';
  if (template === 'trade-amount') { prompt = `某店以成本 $${cost} 購入${item}，並${profit ? '' : '在清貨時'}以 $${sale} 售出。求${label}金額。`; answer = amount; }
  if (template === 'trade-sale') { prompt = `${item}的成本為 $${cost}，${profit ? '' : '清貨時'}以 ${rate}% 的${label}率售出。求售價。`; answer = sale; }
  if (template === 'trade-rate') { prompt = `${item}的成本為 $${cost}，${profit ? '' : '清貨時的'}售價為 $${sale}。求${label}率。`; answer = rate; unit = '%'; }
  if (template === 'trade-cost-from-sale') { prompt = `${item}${profit ? '' : '在清貨時'}以 $${sale} 售出，${label}率為 ${rate}%。求成本。`; answer = cost; }
  const hint = template === 'trade-cost-from-sale' ? `售價是成本的 (100 ${profit ? '＋' : '−'} ${rate})%，用售價除以這個百分率。` : template === 'trade-sale' ? `先用成本乘${label}率求${label}金額，再${profit ? '加上盈利' : '減去虧蝕'}求售價。` : `盈利率及虧蝕率都以成本為基準；${label}率＝${label}金額 ÷ 成本 × 100%。`;
  return question('profit-loss', level, variant, template, prompt, answer, unit, facts, hint);
}
function batchTrade(variant: number) {
  const damaged = variant === 4, product = damaged ? pick([{ name: '橙', classifier: '個' }, { name: '蘋果', classifier: '個' }]) : pick(products.filter(p => p.max <= 40));
  const count = rand(damaged ? 10 : 2, 50), unitCost = rand(damaged ? 3 : 5, damaged ? 12 : 25), unitSale = rand(unitCost, unitCost * 2);
  const spoiled = damaged ? rand(1, Math.floor(count / 2)) : 0, sold = count - spoiled;
  const cost = count * unitCost, sale = sold * unitSale, amount = Math.abs(sale - cost), profit = sale > cost;
  if (cost > 1000 || sale > 1000 || !amount || profit === damaged || amount * 100 % cost) return null;
  const rate = amount * 100 / cost;
  if (rate > (damaged ? 99 : 100)) return null;
  const facts = { count, unitCost, unitSale, spoiled, sold, cost, sale, amount, rate, profit: Number(profit) };
  const prompt = damaged ? `某店以每${product.classifier} $${unitCost} 購入 ${count} ${product.classifier}${product.name}，其中 ${spoiled} ${product.classifier}變壞了，不能售出，也沒有回收收入。其餘全部以每${product.classifier} $${unitSale} 售出。求整批${product.name}的虧蝕率。` : `某文具店以每${product.classifier} $${unitCost} 購入 ${count} ${product.classifier}${product.name}，全部以每${product.classifier} $${unitSale} 售出。求整批商品的盈利率。`;
  return question('profit-loss', 2, variant, damaged ? 'spoiled-loss-rate' : 'batch-profit-rate', prompt, rate, '%', facts, '先計整批成本及實際總收入，再以整批成本作分母求盈虧率；不能售出的商品仍計入成本。');
}
function discount(level: number, variant: number) {
  const rate = rand(1, 18) * 5, paidRate = 100 - rate;
  if (level === 0 && variant < 2) return question('discount', level, variant, variant === 0 ? 'fold-to-rate' : 'rate-to-fold', variant === 0 ? `商品以標價的${foldName(paidRate)}出售，相當於減價百分之幾？` : `商品的折扣百分數為 ${rate}%，即以標價的多少折出售？`, variant === 0 ? rate : paidRate / 10, variant === 0 ? '%' : '折', { rate, paidRate }, '折數表示實付比例，例如八折是付 80%，即減價 20%。');
  if (level === 2 && variant >= 2) return discountTrade(variant, rate);
  const p = pick(products), marked = rand(Math.max(1, Math.ceil(p.min / 20)), Math.floor(p.markedMax / 20)) * 20;
  const sale = marked * paidRate / 100, saving = marked - sale;
  const facts = { marked, sale, saving, rate, paidRate };
  const item = `一${p.classifier}${p.name}`;
  if (level === 0) return question('discount', level, variant, 'discount-sale', `${item}的標價為 $${marked}，現以${foldName(paidRate)}出售。求售價。`, sale, '元', facts, '售價＝標價 × 實付百分率；折扣百分數表示減去的比例。');
  if (level === 1 && variant < 2) return question('discount', level, variant, 'discount-rate', `${item}的標價為 $${marked}，售價為 $${sale}。求折扣百分數。`, rate, '%', facts, '先求標價與售價的差，再除以標價，乘 100%。');
  if (level === 1) return question('discount', level, variant, 'discount-saving', `${item}的標價為 $${marked}，現以${foldName(paidRate)}出售。與標價相比，節省多少元？`, saving, '元', facts, '用標價乘折扣百分率求節省金額；或先求售價，再用標價減售價。');
  const count = rand(2, 10);
  if (marked * count > 1000) return null;
  return question('discount', level, variant, variant === 0 ? 'discount-total' : 'discount-saved-total', `每${p.classifier}${p.name}的標價為 $${marked}，全部以${foldName(paidRate)}出售。小明購買 ${count} ${p.classifier}同款${p.name}，${variant === 0 ? '共需付款多少元' : '與未打折時相比，共節省多少元'}？`, count * (variant === 0 ? sale : saving), '元', { ...facts, count }, '先求每件商品的售價或折扣金額，再乘購買數量。');
}
function discountTrade(variant: number, rate: number) {
  const p = pick(products), cost = rand(Math.ceil(p.min / 5), Math.floor(p.max / 5)) * 5, profit = variant !== 4;
  const tradeRate = rand(1, profit ? 100 : 99);
  if (cost * tradeRate % 100) return null;
  const amount = cost * tradeRate / 100, sale = cost + (profit ? amount : -amount), paidRate = 100 - rate;
  if (sale * 100 % paidRate) return null;
  const marked = sale * 100 / paidRate;
  if (sale < 1 || marked > p.markedMax || marked > cost * 3 || marked < sale) return null;
  return question('discount', 2, variant, 'discount-trade-marked', `一${p.classifier}${p.name}的成本為 $${cost}，${profit ? '' : '清貨時'}以標價的${foldName(paidRate)}售出後${profit ? '盈利' : '虧蝕'} $${amount}。求標價。`, marked, '元', { cost, amount, sale, marked, rate, paidRate, tradeRate, profit: Number(profit) }, '先由成本及盈虧金額求售價，再用售價除以實付百分率求標價。');
}
export const questionKey = (q: Question) => q.key;
export function makeQuestions(game: GameId, previous: readonly (Question | string)[] = []): Question[] {
  const used = new Set(previous.map(q => typeof q === 'string' ? q : questionKey(q))), out: Question[] = [];
  for (let level = 0; level < 3; level++) {
    for (let variant = 0; variant < 5; variant++) {
      let accepted: Question | null = null;
      for (let attempts = 0; attempts < 10000; attempts++) {
        const candidate = game === 'conversion' ? conversion(level, variant) : game === 'applications' ? applications(level, variant) : game === 'increase' || game === 'decrease' ? change(game, level, variant) : game === 'profit-loss' ? trade(level, variant) : discount(level, variant);
        if (candidate && !used.has(questionKey(candidate))) { accepted = candidate; break; }
      }
      if (!accepted) throw new Error('未能產生足夠的不重複題目，請再試一次。');
      out.push(accepted); used.add(questionKey(accepted));
    }
  }
  return [...shuffle(out.slice(0, 5)), ...shuffle(out.slice(5, 10)), ...shuffle(out.slice(10))];
}
export function startSession(game: GameId, questions = makeQuestions(game), now = Date.now()): Session {
  return { game, questions, index: 0, stage: 0, errors: 0, stageErrors: 0, firstTry: 0, questionErrors: 0, skipped: 0, currentFirstTryStreak: 0, longestFirstTryStreak: 0, solved: false, finished: false, expired: false, feedback: '', startedAt: now, completedAt: null };
}
export const expected = (s: Session) => s.questions[s.index].answer;
export function submit(s: Session, answer: string, now = Date.now()): Session {
  if (s.finished || s.solved) return s;
  if (!parseAnswer(answer)) return { ...s, feedback: '請輸入格式正確的答案。' };
  const q = s.questions[s.index];
  if (answerEquals(answer, q.answer)) {
    const first = s.questionErrors === 0, streak = first ? s.currentFirstTryStreak + 1 : 0, finished = s.index === s.questions.length - 1;
    return { ...s, solved: true, finished, completedAt: finished ? now : null, firstTry: s.firstTry + Number(first), currentFirstTryStreak: streak, longestFirstTryStreak: Math.max(streak, s.longestFirstTryStreak), feedback: `答對了！這題獲得 ${first ? 10 : 5} 分。` };
  }
  return { ...s, errors: s.errors + 1, questionErrors: s.questionErrors + 1, stageErrors: s.stageErrors + 1, currentFirstTryStreak: 0, feedback: `再試一次。${q.hint}` };
}
export function skipQuestion(s: Session, now = Date.now()): Session {
  if (s.finished || s.solved || s.index < 10) return s;
  const finished = s.index === s.questions.length - 1;
  return { ...s, skipped: s.skipped + 1, solved: true, finished, completedAt: finished ? now : null, currentFirstTryStreak: 0, feedback: '已放棄本題，這題不計分。' };
}
export function expireSession(s: Session, now = Date.now()): Session { return s.finished ? s : { ...s, finished: true, expired: true, completedAt: now, feedback: '遊戲時間已達 1 小時，本局已結束。' }; }
export const score = (s: Session) => s.firstTry * 10 + Math.max(0, s.index + Number(s.solved) - s.firstTry - s.skipped) * 5;
export const elapsedSeconds = (s: Session, now: number) => Math.max(0, Math.floor(((s.completedAt ?? now) - s.startedAt) / 1000));
export const nextQuestion = (s: Session): Session => !s.solved || s.finished ? s : { ...s, index: s.index + 1, stage: 0, stageErrors: 0, questionErrors: 0, solved: false, feedback: '' };
export type Action = { type: 'start'; session: Session } | { type: 'answer'; value: string } | { type: 'next' | 'skip' | 'timeout' | 'home' };
export function reducer(s: Session | null, a: Action): Session | null {
  if (a.type === 'home') return null;
  if (a.type === 'start') return a.session;
  if (!s) return s;
  if (!s.finished && elapsedSeconds(s, Date.now()) >= GAME_TIME_LIMIT_SECONDS) return expireSession(s);
  return a.type === 'answer' ? submit(s, a.value) : a.type === 'skip' ? skipQuestion(s) : a.type === 'timeout' ? expireSession(s) : nextQuestion(s);
}
