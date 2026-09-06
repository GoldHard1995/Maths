import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code = fs.readFileSync(new URL('../google-apps-script/Code.gs', import.meta.url), 'utf8');
const context = vm.createContext({ console });
vm.runInContext(code, context);

const run = expression => vm.runInContext(expression, context);

test('Apps Script validates the agreed classes and student numbers', () => {
  assert.equal(run("validStudent_('1A', 1)"), true);
  assert.equal(run("validStudent_('1D', 33)"), true);
  assert.equal(run("validStudent_('1E', 1)"), false);
  assert.equal(run("validStudent_('1A', 34)"), false);
});

test('best attempts prioritise score, then time, then earlier submission', () => {
  assert.equal(run("better_({score:150,elapsedSeconds:100,submittedAt:3},{score:145,elapsedSeconds:1,submittedAt:1})"), true);
  assert.equal(run("better_({score:150,elapsedSeconds:90,submittedAt:3},{score:150,elapsedSeconds:100,submittedAt:1})"), true);
  assert.equal(run("better_({score:150,elapsedSeconds:90,submittedAt:1},{score:150,elapsedSeconds:90,submittedAt:3})"), true);
});

test('per-game and overall leaderboards keep the best attempt and require seven games', () => {
  const records = [
    {roundId:'R1',submittedAt:1,className:'1A',studentNo:1,gameId:'locate',score:100,maxScore:150,elapsedSeconds:80},
    {roundId:'R1',submittedAt:2,className:'1A',studentNo:1,gameId:'locate',score:120,maxScore:150,elapsedSeconds:90},
    {roundId:'R1',submittedAt:3,className:'1A',studentNo:1,gameId:'compare',score:130,maxScore:150,elapsedSeconds:70},
    {roundId:'R1',submittedAt:4,className:'1A',studentNo:1,gameId:'move',score:140,maxScore:150,elapsedSeconds:60},
    {roundId:'R1',submittedAt:5,className:'1A',studentNo:1,gameId:'brackets',score:150,maxScore:150,elapsedSeconds:50},
    {roundId:'R1',submittedAt:6,className:'1A',studentNo:1,gameId:'multiply',score:145,maxScore:150,elapsedSeconds:45},
    {roundId:'R1',submittedAt:7,className:'1A',studentNo:1,gameId:'divide',score:140,maxScore:150,elapsedSeconds:40},
    {roundId:'R1',submittedAt:8,className:'1A',studentNo:1,gameId:'mixed',score:135,maxScore:150,elapsedSeconds:35},
    {roundId:'R1',submittedAt:9,className:'1B',studentNo:2,gameId:'locate',score:150,maxScore:150,elapsedSeconds:40},
    {roundId:'OLD',submittedAt:1,className:'1C',studentNo:3,gameId:'locate',score:150,maxScore:150,elapsedSeconds:1},
  ];
  context.currentRound_ = () => 'R1';
  context.readRecords_ = () => records;
  const game = context.leaderboard_('locate', 'ALL', {className:'1A',studentNo:1});
  assert.equal(game.rankings[0].className, '1B');
  assert.equal(game.self.score, 120);
  assert.equal(game.self.rank, 2);
  const overall = context.leaderboard_('overall', 'ALL', {className:'1A',studentNo:1});
  assert.equal(overall.rankings.length, 1);
  assert.equal(overall.rankings[0].score, 960);
  assert.equal(overall.rankings[0].elapsedSeconds, 390);
});
