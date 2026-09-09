import test from 'node:test';
import assert from 'node:assert/strict';
import { equivalent, followsForm, parseExpression } from '../lib/algebra.ts';
import { elapsedSeconds, expected, gameIds, makeQuestions, nextQuestion, questionKey, score, startSession, submit } from '../lib/game.ts';
import { leaderboardUrl, validStudent } from '../lib/leaderboard.ts';

test('parser accepts equivalent linear expressions with exact fractions',()=>{
 assert.equal(equivalent('5x＋3','3+5x'),true);
 assert.equal(equivalent('3*(x+4)','3x+12'),true);
 assert.equal(equivalent('(x+y)/2','x/2+y/2'),true);
 assert.equal(equivalent('x-y','y-x'),false);
});

test('parser rejects unsupported products, powers, variables in divisors, and zero division',()=>{
 for(const input of ['xy','x*x','x²','x/y','x/0'])assert.equal(parseExpression(input).ok,false,input);
 assert.equal(parseExpression('(x+2').ok,false);
});

test('form rules distinguish expanded and collected work',()=>{
 assert.equal(followsForm('2x+6+3x',{parentheses:0,multiplyDivide:0,collected:false}),true);
 assert.equal(followsForm('5x+6',{parentheses:0,multiplyDivide:0,collected:true}),true);
 assert.equal(followsForm('2(x+3)+3x',{parentheses:0}),false);
});

test('all games generate fifteen distinct questions in 5-5-5 order',()=>{
 for(const game of gameIds)for(let run=0;run<80;run++){
  const questions=makeQuestions(game);
  assert.equal(questions.length,15);
  assert.equal(new Set(questions.map(questionKey)).size,15);
  questions.forEach((question,index)=>assert.equal(question.level,Math.floor(index/5)));
  for(let level=0;level<3;level++)assert.deepEqual(new Set(questions.slice(level*5,level*5+5).map(question=>question.variant)),new Set([0,1,2,3,4]));
  questions.filter(question=>question.kind==='algebra').forEach(question=>{
   assert.equal(parseExpression(question.expected).ok,true,question.expected);
   assert.ok(question.usedVariables.length<=2);
   if(question.choices){assert.equal(question.choices.length,4);question.choices.forEach(choice=>assert.equal(parseExpression(choice.value).ok,true));}
  });
  questions.filter(question=>question.kind==='guided').forEach(question=>{
   assert.ok(question.steps.length>=2&&question.steps.length<=4);
   question.steps.forEach(step=>assert.equal(parseExpression(step.expected).ok,true,step.expected));
  });
  questions.filter(question=>question.kind==='numeric').forEach(question=>assert.ok(question.answer>=-50&&question.answer<=100&&Number.isInteger(question.answer)));
  questions.forEach(question=>{const text=`${question.prompt} ${question.expression??''}`;assert.doesNotMatch(text,/(^|[ (＋−])1[xyabn](?=$|[ )＋−])/);assert.doesNotMatch(text,/× −/);});
 }
});

test('positive multipliers omit unnecessary brackets while negative multipliers keep them',()=>{
 for(let run=0;run<120;run++)for(const question of makeQuestions('multiply-divide').slice(5,10)){
  assert.doesNotMatch(question.expression,/× \(\d+\)$/);
  if(/× \(−\d+\)$/.test(question.expression))assert.match(question.expression,/× \(−\d+\)$/);
 }
});

test('replays avoid every question from the previous round',()=>{
 for(const game of gameIds){const first=makeQuestions(game),second=makeQuestions(game,first),old=new Set(first.map(questionKey));second.forEach(question=>assert.equal(old.has(questionKey(question)),false));}
});

test('incomplete or unsupported input does not reduce the score',()=>{
 const question={kind:'algebra',level:2,prompt:'',instruction:'',expected:'5x+3',direct:true,usedVariables:['x'],form:{parentheses:0,multiplyDivide:0,collected:true}};
 const session=startSession('add-subtract',[question],0);
 for(const input of ['', '(5x+3', 'xy']){const result=submit(session,input);assert.equal(result.errors,0);assert.equal(result.questionErrors,0);}
 const wrong=submit(session,'4x+3');assert.equal(wrong.errors,1);assert.equal(score(wrong),0);
});

test('equivalent direct answers pass while an uncollected final answer asks for the required form',()=>{
 const question={kind:'algebra',level:2,prompt:'',instruction:'',expected:'5x+3',direct:true,usedVariables:['x'],form:{parentheses:0,multiplyDivide:0,collected:true}};
 const session=startSession('add-subtract',[question],0);
 assert.equal(submit(session,'3+5x').solved,true);
 const form=submit(session,'2x+3x+3');assert.equal(form.solved,false);assert.equal(form.errors,0);assert.match(form.feedback,/指定的形式/);
});

test('guided questions require each line and score only the complete question',()=>{
 const question={kind:'guided',level:2,prompt:'',expression:'2(x+3)+3x',usedVariables:['x'],steps:[
  {instruction:'拆括號',expected:'2x+6+3x',form:{parentheses:0,multiplyDivide:0,collected:false}},
  {instruction:'合併',expected:'5x+6',form:{parentheses:0,multiplyDivide:0,collected:true}},
 ]};
 let session=startSession('mixed-expand',[question],0);
 session=submit(session,'2x+6+3x');assert.equal(session.stage,1);assert.equal(score(session),0);
 session=submit(session,'6+5x');assert.equal(session.solved,true);assert.equal(score(session),10);
});

test('every generated question completes through its intended stages',()=>{
 for(const game of gameIds){let session=startSession(game);while(!session.finished){session=submit(session,expected(session));if(session.solved&&!session.finished)session=nextQuestion(session);}assert.equal(session.firstTry,15);assert.equal(score(session),150);}
});

test('completion freezes time and the shared platform is connected',()=>{
 const question={kind:'numeric',level:0,prompt:'',expression:'',instruction:'',answer:4};
 let session=startSession('substitute',[question],1000);session=submit(session,'4',6500);
 assert.equal(session.finished,true);assert.equal(elapsedSeconds(session,90000),5);
 assert.match(leaderboardUrl,/\/exec$/);assert.equal(validStudent('1A',1),true);assert.equal(validStudent('1D',33),true);assert.equal(validStudent('1E',1),false);
});
test('only mathematical errors reset the first-try streak',()=>{
 const questions=[1,2,3].map(answer=>({kind:'numeric',level:0,prompt:'',expression:'',instruction:'',answer}));
 let session=startSession('substitute',questions,0);
 session=submit(session,'1');session=nextQuestion(session);session=submit(session,'');
 assert.equal(session.errors,0);session=submit(session,'2');assert.equal(session.longestFirstTryStreak,2);session=nextQuestion(session);
 session=submit(session,'9');assert.equal(session.currentFirstTryStreak,0);session=submit(session,'3');assert.equal(session.longestFirstTryStreak,2);
});
