import { questionKey, type GameId, type Question } from './game.ts';

const PREFIX = 'maths-percentage-previous-v1';
export function previousRoundKey(game: GameId, query: string) {
  const params = new URLSearchParams(query);
  const year = params.get('schoolYear') || '', className = params.get('className') || '', studentNo = params.get('studentNo') || '';
  const identity = year && /^1[ABCD]$/.test(className) && Number(studentNo) >= 1 && Number(studentNo) <= 33 && Number.isInteger(Number(studentNo))
    ? `${year}:${className}:${Number(studentNo)}` : 'guest';
  return `${PREFIX}:${identity}:percentage:${game}`;
}
export function readPreviousRound(storage: Pick<Storage, 'getItem'>, key: string): string[] {
  try { const data: unknown = JSON.parse(storage.getItem(key) || '[]'); return Array.isArray(data) && data.length <= 15 && data.every(item => typeof item === 'string') ? data : []; }
  catch { return []; }
}
export function savePreviousRound(storage: Pick<Storage, 'setItem'>, key: string, questions: Question[]) {
  try { storage.setItem(key, JSON.stringify(questions.map(questionKey))); } catch { /* Practice remains available when browser storage is disabled. */ }
}
