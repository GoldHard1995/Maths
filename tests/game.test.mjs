import test from 'node:test';
import assert from 'node:assert/strict';
import { makeQuestions, startSession, submit, nextQuestion, skipQuestion, expected, reducer, expression, simplified, result, simplificationChoices, questionKey, score, elapsedSeconds } from '../lib/game.ts';
import { formatDuration, validStudent } from '../lib/leaderboard.ts';

test('negative comparisons and equality use mathematical ordering',()=>{
 for(const [a,b,answer] of [[-7,-3,'<'],[-3,-7,'>'],[-4,-4,'='],[0,-8,'>'],[-2,6,'<']]) {
  const s=startSession('compare',[{a,b,op:'+'}],0);
  assert.equal(submit(s,answer).solved,true);
  const wrong=submit(s,answer==='>'?'<':'>');
  assert.equal(wrong.solved,false);assert.equal(wrong.stageErrors,1);
 }
});
test('all four movements check direction, distance, then endpoint',()=>{
 for(const [a,op,b,direction,steps,end] of [[-2,'+',5,'right','5','3'],[3,'-',5,'left','5','-2'],[3,'+',-5,'left','5','-2'],[3,'-',-5,'right','5','8']]) {
  let s=startSession('move',[{a,b,op}],0);
  s=submit(s,direction==='left'?'right':'left');assert.equal(s.stage,0);
  s=submit(s,direction);assert.equal(s.stage,1);
  s=submit(s,'9');assert.equal(s.stage,1);
  s=submit(s,steps);assert.equal(s.stage,2);
  s=submit(s,end);assert.equal(s.solved,true);assert.equal(s.firstTry,0);
 }
});
test('brackets and arithmetic are graded separately, including positive and negative operands',()=>{
 for(const [a,op,b,sign,answer] of [[5,'-',-3,'+','8'],[-7,'+',-4,'-','-11'],[-10,'-',5,'-','-15'],[0,'-',-20,'+','20'],[0,'+',-20,'-','-20'],[0,'-',20,'-','-20'],[0,'+',20,'+','20']]) {
  let s=startSession('brackets',[{a,b,op}],0);
  s=submit(s,sign);assert.equal(s.stage,1);assert.equal(s.solved,false);
  const wrong=submit(s,'99');assert.equal(wrong.stage,1);assert.equal(wrong.solved,false);
  s=submit(s,answer);assert.equal(s.solved,true);assert.equal(s.firstTry,1);
 }
 assert.equal(expression({a:5,b:-3,op:'-'}),'5 − (−3)');
 assert.equal(simplified({a:5,b:-3,op:'-'}),'5 + 3');
});
test('generated rounds cover all signs and stay within agreed bounds',()=>{
 for(const game of ['locate','compare','move','brackets'])for(let run=0;run<150;run++) {
  const qs=makeQuestions(game);assert.equal(qs.length,15);
  const max=game==='brackets'?20:10;
  for(const q of qs) {
   assert.ok(Number.isInteger(q.a)&&Number.isInteger(q.b));
   assert.ok(Math.abs(q.a)<=max&&Math.abs(q.b)<=max);
   if(game==='move'||game==='brackets') {
    const end=q.a+(q.op==='+'?q.b:-q.b);
    assert.ok(Math.abs(end)<=max);assert.notEqual(q.b,0);
    if(game==='move')assert.ok(Math.abs(q.b)<=10);
   }
  }
  if(game==='move'||game==='brackets')assert.equal(new Set(qs.map(q=>q.op+(q.b<0?'negative':'positive'))).size,4);
 }
});
test('round completion, retry statistics, duplicate submits, and reset',()=>{
 let s=startSession('locate',[{a:-4,b:0,op:'+'},{a:0,b:0,op:'+'}],0);
 assert.equal(nextQuestion(s),s);
 s=submit(s,'4');s=submit(s,'3');assert.equal(s.stageErrors,2);
 s=submit(s,'-4');assert.equal(s.firstTry,0);
 assert.equal(submit(s,'-4'),s);
 s=nextQuestion(s);assert.equal(s.index,1);assert.equal(s.stageErrors,0);
 s=submit(s,'0');assert.equal(s.firstTry,1);
 s=nextQuestion(s);assert.equal(s.finished,true);assert.equal(s.errors,2);
 assert.equal(submit(s,'0'),s);assert.equal(reducer(s,{type:'home'}),null);
});
test('every generated question can complete through the intended stages',()=>{
 for(const game of ['locate','compare','move','brackets']) {
  let s=startSession(game);
  for(let i=0;i<s.questions.length;i++) {
   let limit=0;while(!s.solved&&limit++<4)s=submit(s,expected(s));
   assert.equal(s.solved,true);s=nextQuestion(s);
  }
  assert.equal(s.finished,true);assert.equal(s.firstTry,s.questions.length);
 }
});


test('bracket difficulty increases in three blocks and all three-term values remain bounded',()=>{
 for(let run=0;run<150;run++) {
  const qs=makeQuestions('brackets');
  qs.forEach((q,i)=>{
   if(i<5){assert.ok(q.a>=1&&q.a<=10);assert.ok(Math.abs(q.b)<=9);assert.equal(q.third,undefined);}
   else if(i<10){assert.ok(q.a<0);assert.equal(q.third,undefined);}
   else {
    assert.ok(q.third);assert.ok(Math.abs(q.third.value)<=20);
    const intermediate=q.a+(q.op==='+'?q.b:-q.b);
    const final=intermediate+(q.third.op==='+'?q.third.value:-q.third.value);
    assert.ok(Math.abs(intermediate)<=20);assert.ok(Math.abs(final)<=20);
    assert.equal(result(q),final);assert.equal(simplificationChoices(q).length,4);
   }
  });
 }
});
test('three-term answers require both bracket signs before accepting the final total',()=>{
 const cases=[
  [{a:5,b:-3,op:'-',third:{op:'+',value:-4}},'+,-','5 + 3 − 4',4],
  [{a:-8,b:6,op:'+',third:{op:'-',value:-5}},'+,+','−8 + 6 + 5',3],
  [{a:9,b:-4,op:'+',third:{op:'-',value:3}},'-,-','9 − 4 − 3',2],
  [{a:-2,b:7,op:'-',third:{op:'-',value:-6}},'-,+','−2 − 7 + 6',-3],
 ];
 for(const [q,signs,text,total] of cases) {
  let s=startSession('brackets',[q],0);
  s=submit(s,signs[0]);assert.equal(s.stage,0);
  for(const option of simplificationChoices(q))if(option.value!==signs)assert.equal(submit(s,option.value).stage,0);
  s=submit(s,signs);assert.equal(s.stage,1);assert.equal(simplified(q),text);
  s=submit(s,String(Number(total)));assert.equal(s.solved,true);
 }
});


test('all games generate distinct rounds and avoid memorising the previous round',()=>{
 for(const game of ['locate','compare','move','brackets']) {
  let previous=[];
  for(let run=0;run<40;run++) {
   const qs=makeQuestions(game,previous);
   assert.equal(new Set(qs.map(questionKey)).size,qs.length);
   if(game==='locate') {
    assert.ok(qs.some(q=>q.a===0));
    qs.forEach((q,i)=>assert.notEqual(q.a,previous[i]?.a));
   } else {
    const old=new Set(previous.map(questionKey));
    qs.forEach(q=>assert.equal(old.has(questionKey(q)),false));
   }
   if(game==='compare') {
    assert.ok(qs.slice(0,5).every(q=>q.a>=0&&q.b>=0));
    assert.ok(qs.slice(10).every(q=>q.a<0&&q.b<0));
    assert.equal(qs.filter(q=>q.a===q.b).length,2);
   }
   previous=qs;
  }
 }
});


test('points are awarded once per whole question and completion freezes time',()=>{
 let s=startSession('brackets',[{a:5,b:-3,op:'-'},{a:2,b:3,op:'+'}],1000);
 assert.equal(score(s),0);s=submit(s,'+',2000);assert.equal(score(s),0);
 s=submit(s,'8',3000);assert.equal(score(s),10);assert.equal(s.completedAt,null);
 s=submit(s,'8',4000);assert.equal(score(s),10);
 s=nextQuestion(s);s=submit(s,'-',5000);assert.equal(score(s),10);
 s=submit(s,'+',6000);s=submit(s,'0',7000);assert.equal(score(s),10);
 s=submit(s,'5',11200);assert.equal(score(s),15);assert.equal(s.finished,true);
 assert.equal(elapsedSeconds(s,90000),10);assert.equal(s.completedAt,11200);
 assert.equal(submit(s,'5',99000),s);assert.equal(score(nextQuestion(s)),15);
 const fresh=startSession('move',undefined,20000);assert.equal(score(fresh),0);assert.equal(fresh.completedAt,null);
});
test('a perfect round reaches its game-specific maximum',()=>{
 for(const game of ['locate','compare','move','brackets','multiply','divide','mixed']) {
  let s=startSession(game);
  while(!s.finished){s=submit(s,expected(s));if(s.solved&&!s.finished)s=nextQuestion(s);}
  assert.equal(score(s),s.questions.length*10);
 }
});
test('first-try streak grows across questions and resets after a genuine error',()=>{
 let s=startSession('locate',[{a:1},{a:2},{a:3}],0);
 s=submit(s,'1');assert.equal(s.longestFirstTryStreak,1);s=nextQuestion(s);
 s=submit(s,'2');assert.equal(s.longestFirstTryStreak,2);s=nextQuestion(s);
 s=submit(s,'0');assert.equal(s.currentFirstTryStreak,0);s=submit(s,'3');
 assert.equal(s.longestFirstTryStreak,2);assert.equal(s.firstTry,2);assert.equal(s.errors,1);
});
test('only comprehensive questions can be skipped and skipped questions earn no points',()=>{
 const questions=Array.from({length:15},(_,index)=>({a:index+1,b:0,op:'+'}));
 let s=startSession('locate',questions,0);
 assert.equal(skipQuestion(s),s);
 for(let i=0;i<10;i++){s=submit(s,String(i+1));if(!s.finished)s=nextQuestion(s)}
 assert.equal(s.index,10);assert.equal(s.firstTry,10);assert.equal(score(s),100);
 s=skipQuestion(s,12000);assert.equal(s.solved,true);assert.equal(s.skipped,1);assert.equal(s.errors,0);assert.equal(s.currentFirstTryStreak,0);assert.equal(score(s),100);
 s=nextQuestion(s);assert.equal(s.index,11);s=submit(s,'12');assert.equal(score(s),110);
});

test('multiplication rounds use the three difficulty blocks and cover sign rules',()=>{
 for(let run=0;run<60;run++){
  const qs=makeQuestions('multiply');assert.equal(qs.length,15);assert.equal(new Set(qs.map(questionKey)).size,15);
  assert.ok(qs.slice(0,5).every(q=>q.values.length===2&&q.values.every(n=>n!==0&&Math.abs(n)<=9)));
  assert.ok(qs.slice(5,10).every(q=>q.values.length===2&&q.values.every(n=>n!==0&&Math.abs(n)<=20)));
  assert.ok(qs.slice(10).every(q=>q.values.length===3));
  qs.forEach(q=>{assert.ok(Number.isInteger(result(q)));assert.ok(Math.abs(result(q))<=100);q.values.forEach(n=>assert.notEqual(n,0));});
  assert.equal(new Set(qs.slice(0,10).map(q=>`${Math.sign(q.values[0])},${Math.sign(q.values[1])}`)).size,4);
 }
});

test('division rounds are exact at every step and use both layouts',()=>{
 for(let run=0;run<60;run++){
  const qs=makeQuestions('divide');assert.equal(qs.length,15);assert.equal(new Set(qs.map(questionKey)).size,15);
  assert.ok(qs.slice(0,5).every(q=>q.values.length===2&&q.display==='inline'));
  assert.ok(qs.slice(10).every(q=>q.values.length===3));
  assert.ok(qs.some(q=>q.display==='fraction'));
  qs.forEach(q=>{let value=q.values[0];for(const divisor of q.values.slice(1)){assert.notEqual(divisor,0);assert.equal(Math.abs(value%divisor),0);value/=divisor}assert.equal(value,result(q));assert.ok(Math.abs(value)<=100);});
 }
});

test('mixed arithmetic provides ordered selection and integer substitution steps',()=>{
 for(let run=0;run<60;run++){
  const qs=makeQuestions('mixed');assert.equal(qs.length,15);assert.equal(new Set(qs.map(questionKey)).size,15);
  qs.forEach((q,i)=>{assert.equal(q.level,Math.floor(i/5));assert.ok(q.steps.length>=2+q.level);q.steps.forEach(step=>{assert.ok(step.choices.includes(step.target));assert.ok(Number.isInteger(step.result));assert.ok(Math.abs(step.result)<=100)});assert.equal(q.steps.at(-1).result,q.answer);});
  assert.ok(qs.slice(0,5).some(q=>q.steps[0].display.includes('÷')));
  assert.ok(qs.slice(0,5).some(q=>q.steps.at(-1).display.includes(' − ')));
  assert.ok(qs.slice(5,10).some(q=>q.steps.some(step=>step.display.includes('÷'))));
  assert.ok(qs.slice(10).every(q=>q.steps.some(step=>step.display.includes('÷'))));
 }
 let s=startSession('mixed',[makeQuestions('mixed')[10]],0);while(!s.solved)s=submit(s,expected(s));assert.equal(s.firstTry,1);
});

test('new games avoid every question from the immediately previous round',()=>{
 for(const game of ['multiply','divide','mixed']){
  const first=makeQuestions(game),second=makeQuestions(game,first),old=new Set(first.map(questionKey));
  second.forEach(q=>assert.equal(old.has(questionKey(q)),false));
 }
});

test('leaderboard student fields and durations use the agreed ranges',()=>{
 assert.equal(validStudent('1A',1),true);
 assert.equal(validStudent('1D',33),true);
 assert.equal(validStudent('1E',1),false);
 assert.equal(validStudent('1A',0),false);
 assert.equal(validStudent('1A',34),false);
 assert.equal(validStudent('1A',1.5),false);
 assert.equal(formatDuration(0),'0:00');
 assert.equal(formatDuration(629),'10:29');
});
