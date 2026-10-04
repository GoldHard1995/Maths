import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const worlds = [
  ['', 'directed-number'], ['algebra-block-world/', 'algebra'],
  ['linear-equation-block-world/', 'linear-equation'], ['polynomial-block-world/', 'polynomial'],
  ['numerical-estimation-block-world/', 'numerical-estimation'], ['coordinate-block-world/', 'coordinate'],
  ['percentage-block-world/', 'percentage'], ['identity-block-world/', 'identity'],
];
for (const [folder, world] of worlds) {
  const game = await import(`../${folder}lib/game.ts`);
  test(`${world}: one-hour expiry preserves earned points and prevents late answers`, () => {
    assert.equal(game.GAME_TIME_LIMIT_SECONDS, 3600);
    const startedAt = Date.now() - 3600001;
    const session = { ...game.startSession(game.gameIds[0], undefined, startedAt), index: 1, firstTry: 2, solved: true };
    const expired = game.expireSession(session);
    assert.equal(expired.expired, true);
    assert.equal(expired.finished, true);
    assert.equal(game.score(expired), 20);
    assert.equal(expired.solved, true);
    const late = game.reducer({ ...session, solved: false, firstTry: 1 }, { type: 'answer', value: '0' });
    assert.equal(late.expired, true);
    assert.equal(late.firstTry, 1);
    assert.equal(game.expireSession({ ...session, finished: true }).expired, false);
  });
  if (folder === 'percentage-block-world/' || folder === 'identity-block-world/') continue;
  const replay = await import(`../${folder}lib/replay.ts`);
  test(`${world}: reload reuses prior-question history and isolates students and stages`, () => {
    const data = new Map(), storage = { getItem: key => data.get(key) ?? null, setItem: (key, value) => data.set(key, value) };
    const query = '?schoolYear=2026-27&className=1A&studentNo=1';
    for (const id of game.gameIds) {
      const first = replay.replayQuestions(id, query, storage);
      const second = replay.replayQuestions(id, query, storage);
      const keys = new Set(first.map(game.questionKey));
      assert.equal(second.length, 15);
      assert.equal(second.some(q => keys.has(game.questionKey(q))), false, id);
      assert.notEqual(replay.replayKey(id, query), replay.replayKey(id, query.replace('studentNo=1', 'studentNo=2')));
      assert.notEqual(replay.replayKey(id, query), replay.replayKey(id, query.replace('2026-27', '2027-28')));
    }
    storage.setItem(replay.replayKey(game.gameIds[0], query), '{bad JSON');
    assert.equal(replay.replayQuestions(game.gameIds[0], query, storage).length, 15);
    assert.equal(replay.replayQuestions(game.gameIds[0], query, { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }).length, 15);
  });
}
test('place value retains 8/7/0 and never allows giving up', async () => {
  const g = await import('../numerical-estimation-block-world/lib/game.ts');
  const s = g.startSession('place-value');
  assert.deepEqual([0,1,2].map(level => s.questions.filter(q => q.level === level).length), [8,7,0]);
  for (let index = 0; index < 15; index++) { const current = { ...s, index }; assert.equal(g.skipQuestion(current), current); }
});
test('Apps Script advertises the common deadline and rejects over-time submissions in all eight worlds', () => {
  const ctx = vm.createContext({console});
  vm.runInContext(fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8'), ctx);
  ctx.currentSchoolYear_ = () => '2026-27';
  const catalog = ctx.publicCatalog_();
  assert.equal(catalog.length, 8);
  for (const w of catalog) {
    assert.equal(w.timeLimitSeconds, 3600);
    const p = { submissionId: `core-time-${w.id}`, schoolYear:'2026-27', className:'1A', studentNo:1, worldId:w.id, gameId:w.stages[0].id, questionCount:15, maxScore:150, score:150, firstTryCorrect:15, skippedQuestions:0, longestFirstTryStreak:15, wrongAttempts:0, elapsedSeconds:3600 };
    assert.doesNotThrow(() => ctx.validateSubmission_(p));
    assert.throws(() => ctx.validateSubmission_({...p, elapsedSeconds:3601}), /1 小時/);
  }
});
