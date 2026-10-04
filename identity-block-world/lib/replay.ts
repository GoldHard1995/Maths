import { makeQuestions, type GameId, type Question } from './game.ts';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function replayKey(game: GameId, search: string) {
  const query = new URLSearchParams(search);
  return JSON.stringify(['identity-previous-v1', query.get('schoolYear') || '', query.get('className') || '', query.get('studentNo') || '', game]);
}
export function replayQuestions(game: GameId, search: string, storage?: Storage, fallback: Question[] = []) {
  const key = replayKey(game, search); let previous = fallback;
  try { const saved = JSON.parse(storage?.getItem(key) || 'null'); if (Array.isArray(saved) && saved.every(q => q && typeof q.expression === 'string' && typeof q.instruction === 'string')) previous = saved; } catch { /* A blocked storage or stale entry falls back to this page's last round. */ }
  const questions = makeQuestions(game, previous);
  try { storage?.setItem(key, JSON.stringify(questions)); } catch { /* Practice remains available if storage is disabled. */ }
  return questions;
}
