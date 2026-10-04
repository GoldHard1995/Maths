import { makeQuestions, questionKey, type GameId, type Question } from './game.ts';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function replayKey(game: GameId, search: string) {
  const query = new URLSearchParams(search);
  return JSON.stringify(['coordinate-previous-v1', query.get('schoolYear') || '', query.get('className') || '', query.get('studentNo') || '', game]);
}
export function replayQuestions(game: GameId, search: string, storage?: Storage, fallback: Question[] = []) {
  const key = replayKey(game, search);
  let previous = fallback;
  try {
    const saved = JSON.parse(storage?.getItem(key) || 'null');
    if (Array.isArray(saved) && saved.length === 15 && saved.every(q => q && typeof q === 'object' && typeof questionKey(q) === 'string')) previous = saved;
  } catch { /* Keep practice available if storage is blocked or invalid. */ }
  const questions = makeQuestions(game, previous);
  try { storage?.setItem(key, JSON.stringify(questions)); } catch { /* Fall back to the current page's memory. */ }
  return questions;
}
