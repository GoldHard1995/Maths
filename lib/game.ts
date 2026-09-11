export type GameId = 'locate'|'compare'|'move'|'brackets'|'multiply'|'divide'|'mixed';
export type LegacyQuestion={kind:'legacy';a:number;b:number;op:'+'|'-';third?:{op:'+'|'-';value:number}};
export type SignedQuestion={kind:'signed';operation:'multiply'|'divide';values:number[];display:'inline'|'fraction'};
export type MixedStep={display:string;target:string;choices:string[];result:number};
export type MixedQuestion={kind:'mixed';level:number;steps:MixedStep[];answer:number};
export type Question=LegacyQuestion|SignedQuestion|MixedQuestion;
export type Session={game:GameId;questions:Question[];index:number;stage:number;errors:number;stageErrors:number;firstTry:number;questionErrors:number;skipped:number;currentFirstTryStreak:number;longestFirstTryStreak:number;solved:boolean;finished:boolean;feedback:string;startedAt:number;completedAt:number|null};
export const gameIds:GameId[]=['locate','compare','move','brackets','multiply','divide','mixed'];
export const signed=(n:number)=>n<0?`−${Math.abs(n)}`:n>0?`+${n}`:'0';
export const plain=(n:number)=>String(n).replace('-','−');
const legacy=(q:Question)=>q as LegacyQuestion;
export const delta=(q:Question)=>{const x=legacy(q);return x.op==='+'?x.b:-x.b};
const thirdDelta=(q:LegacyQuestion)=>q.third?(q.third.op==='+'?q.third.value:-q.third.value):0;
export const result=(q:Question)=>{if(q.kind==='signed')return q.operation==='multiply'?q.values.reduce((a,b)=>a*b,1):q.values.slice(1).reduce((a,b)=>a/b,q.values[0]);if(q.kind==='mixed')return q.answer;const x=legacy(q);return x.a+delta(x)+thirdDelta(x)};
export const relation=(q:Question)=>{const x=legacy(q);return x.a<x.b?'<':x.a>x.b?'>':'='};
export const expression=(q:Question)=>{const x=legacy(q);return `${plain(x.a)} ${x.op==='-'?'−':'+'} (${signed(x.b)})${x.third?` ${x.third.op==='-'?'−':'+'} (${signed(x.third.value)})`:''}`};
const signOf=(n:number)=>n<0?'-':'+';
const bracketAnswer=(q:LegacyQuestion)=>signOf(delta(q))+(q.third?','+signOf(thirdDelta(q)):'');
const withSigns=(q:LegacyQuestion,signs:string)=>{const [a,b]=signs.split(',');return `${plain(q.a)} ${a==='-'?'−':'+'} ${Math.abs(q.b)}${q.third?` ${b==='-'?'−':'+'} ${Math.abs(q.third.value)}`:''}`};
export const simplified=(q:Question)=>withSigns(legacy(q),bracketAnswer(legacy(q)));
export const simplificationChoices=(q:Question)=>(legacy(q).third?['+,+','+,-','-,+','-,-']:['+','-']).map(value=>({value,label:withSigns(legacy(q),value)}));
const choose=<T,>(xs:T[])=>xs[Math.floor(Math.random()*xs.length)];
const shuffle=<T,>(items:T[])=>{const xs=[...items];for(let i=xs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]]}return xs};
export const questionKey=(q:Question)=>JSON.stringify(q);
const legacyQ=(a:number,b=0,op:'+'|'-'='+',third?:LegacyQuestion['third']):LegacyQuestion=>({kind:'legacy',a,b,op,third});
function draw(pool:Question[],count:number,used:Set<string>){const available=pool.filter(q=>!used.has(questionKey(q)));const picked:Question[]=[];for(let i=0;i<count;i++){const j=Math.floor(Math.random()*available.length);const q=available.splice(j,1)[0];if(!q)throw new Error('Not enough distinct questions.');used.add(questionKey(q));picked.push(q)}return picked}
function makeSigned(game:'multiply'|'divide',used:Set<string>):Question[]{
  const questions:SignedQuestion[]=[];
  const add=(q:SignedQuestion)=>{if(!used.has(questionKey(q))&&!questions.some(x=>questionKey(x)===questionKey(q))){questions.push(q);used.add(questionKey(q))}};
  if(game==='multiply'){
    const combos:[[number,number],[number,number],[number,number],[number,number]]=[[1,1],[1,-1],[-1,1],[-1,-1]];
    let attempt=0;while(questions.length<5){const [sa,sb]=combos[attempt++%4];let a,b;do{a=sa*choose([2,3,4,5,6,7,8,9]);b=sb*choose([2,3,4,5,6,7,8,9])}while(Math.abs(a*b)>100);add({kind:'signed',operation:'multiply',values:[a,b],display:'inline'})}
    while(questions.length<10){const a=choose(Array.from({length:40},(_,i)=>i<20?i-20:i-19).filter(Boolean));const b=choose(Array.from({length:40},(_,i)=>i<20?i-20:i-19).filter(Boolean));if(Math.abs(a*b)<=100)add({kind:'signed',operation:'multiply',values:[a,b],display:'inline'})}
    while(questions.length<15){const vals=[choose([-5,-4,-3,-2,2,3,4,5]),choose([-5,-4,-3,-2,2,3,4,5]),choose([-4,-3,-2,2,3,4])];if(Math.abs(vals[0]*vals[1]*vals[2])<=100)add({kind:'signed',operation:'multiply',values:vals,display:'inline'})}
  } else {
    const signs=[[1,1],[1,-1],[-1,1],[-1,-1]];
    const pair=(large:boolean):SignedQuestion=>{const [sa,sb]=choose(signs);const divisor=choose(large?[2,3,4,5,6,8,10,12,15,20]:[2,3,4,5,6]);const quotient=choose(large?[2,3,4,5,6,7,8,9,10]:[2,3,4,5,6]);return {kind:'signed',operation:'divide',values:[sa*sb*divisor*quotient,sb*divisor],display:large&&Math.random()<.6?'fraction':'inline'}};
    while(questions.length<5)add(pair(false));while(questions.length<10)add(pair(true));
    while(questions.length<15){const b=choose([2,3,4,5]),c=choose([2,3,4]),answer=choose([-5,-4,-3,-2,2,3,4,5]);add({kind:'signed',operation:'divide',values:[answer*b*c,choose([1,-1])*b,choose([1,-1])*c],display:Math.random()<.75?'fraction':'inline'})}
  }
  return questions;
}
const fmt=(n:number)=>signed(n);
function mixedQuestion(level:number,useDivision=false,useSubtraction=false):MixedQuestion{
  if(level===0){
   const a=choose([-9,-7,-5,-3,2,4,6,8]);
   const outer=useSubtraction?'−':'+';
   if(useDivision){const c=choose([-4,-3,-2,2,3,4]),quotient=choose([-5,-4,-3,-2,2,3,4,5]),b=c*quotient,ans=useSubtraction?a-quotient:a+quotient;if(Math.abs(b)>20||Math.abs(ans)>100)return mixedQuestion(level,useDivision,useSubtraction);return {kind:'mixed',level,answer:ans,steps:[{display:`${fmt(a)} ${outer} ${fmt(b)} ÷ ${fmt(c)}`,target:`${fmt(b)} ÷ ${fmt(c)}`,choices:[`${fmt(a)} ${outer} ${fmt(b)}`,`${fmt(b)} ÷ ${fmt(c)}`],result:quotient},{display:`${fmt(a)} ${outer} (${fmt(quotient)})`,target:`${fmt(a)} ${outer} (${fmt(quotient)})`,choices:[`${fmt(a)} ${outer} (${fmt(quotient)})`],result:ans}]}}
   const b=choose([-6,-4,-2,2,3,5]),c=choose([-4,-3,-2,2,3,4]),p=b*c,ans=useSubtraction?a-p:a+p;if(Math.abs(ans)>100)return mixedQuestion(level,useDivision,useSubtraction);return {kind:'mixed',level,answer:ans,steps:[{display:`${fmt(a)} ${outer} ${fmt(b)} × ${fmt(c)}`,target:`${fmt(b)} × ${fmt(c)}`,choices:[`${fmt(a)} ${outer} ${fmt(b)}`,`${fmt(b)} × ${fmt(c)}`],result:p},{display:`${fmt(a)} ${outer} (${fmt(p)})`,target:`${fmt(a)} ${outer} (${fmt(p)})`,choices:[`${fmt(a)} ${outer} (${fmt(p)})`],result:ans}]}
  }
  if(level===1){
   const a=choose([-8,-6,-4,-2,2,3,5,7]),b=choose([-7,-5,-3,2,4,6]),c=choose([-4,-3,-2,2,3,4]),x=a+b,y=x*c;
   if(useDivision){const divisors=[2,3,4,5].filter(n=>y!==0&&y%n===0);if(!divisors.length||Math.abs(y)>100)return mixedQuestion(level,useDivision);const d=choose(divisors),z=y/d;return {kind:'mixed',level,answer:z,steps:[{display:`(${fmt(a)} + ${fmt(b)}) × ${fmt(c)} ÷ ${fmt(d)}`,target:`${fmt(a)} + ${fmt(b)}`,choices:[`${fmt(a)} + ${fmt(b)}`,`${fmt(c)} ÷ ${fmt(d)}`],result:x},{display:`(${fmt(x)}) × ${fmt(c)} ÷ ${fmt(d)}`,target:`${fmt(x)} × ${fmt(c)}`,choices:[`${fmt(x)} × ${fmt(c)}`,`${fmt(c)} ÷ ${fmt(d)}`],result:y},{display:`(${fmt(y)}) ÷ ${fmt(d)}`,target:`${fmt(y)} ÷ ${fmt(d)}`,choices:[`${fmt(y)} ÷ ${fmt(d)}`],result:z}]}}
   const d=choose([-9,-6,-3,2,5,8]),z=y-d;if([x,y,z].some(n=>Math.abs(n)>100))return mixedQuestion(level,useDivision);return {kind:'mixed',level,answer:z,steps:[{display:`(${fmt(a)} + ${fmt(b)}) × ${fmt(c)} − ${fmt(d)}`,target:`${fmt(a)} + ${fmt(b)}`,choices:[`${fmt(a)} + ${fmt(b)}`,`${fmt(c)} − ${fmt(d)}`],result:x},{display:`(${fmt(x)}) × ${fmt(c)} − ${fmt(d)}`,target:`${fmt(x)} × ${fmt(c)}`,choices:[`${fmt(x)} × ${fmt(c)}`,`${fmt(c)} − ${fmt(d)}`],result:y},{display:`(${fmt(y)}) − ${fmt(d)}`,target:`${fmt(y)} − ${fmt(d)}`,choices:[`${fmt(y)} − ${fmt(d)}`],result:z}]}
  }
  const b=choose([-8,-6,-4,-2,2,4,6,8]),c=choose([-7,-5,-3,3,5,7]),x=b+c;if(x===0)return mixedQuestion(level);const d=choose([-4,-3,-2,2,3,4]),y=x*d;const e=choose([2,3,4,5].filter(n=>y%n===0));if(!e)return mixedQuestion(level);const z=y/e,a=choose([-12,-9,-6,-3,3,6,9,12]),ans=a-z;if([x,y,z,ans].some(n=>Math.abs(n)>100))return mixedQuestion(level);return {kind:'mixed',level,answer:ans,steps:[{display:`${fmt(a)} − ((${fmt(b)} + ${fmt(c)}) × ${fmt(d)}) ÷ ${fmt(e)}`,target:`${fmt(b)} + ${fmt(c)}`,choices:[`${fmt(b)} + ${fmt(c)}`,`${fmt(d)} ÷ ${fmt(e)}`],result:x},{display:`${fmt(a)} − ((${fmt(x)}) × ${fmt(d)}) ÷ ${fmt(e)}`,target:`${fmt(x)} × ${fmt(d)}`,choices:[`${fmt(x)} × ${fmt(d)}`,`${fmt(d)} ÷ ${fmt(e)}`],result:y},{display:`${fmt(a)} − (${fmt(y)}) ÷ ${fmt(e)}`,target:`${fmt(y)} ÷ ${fmt(e)}`,choices:[`${fmt(a)} − ${fmt(y)}`,`${fmt(y)} ÷ ${fmt(e)}`],result:z},{display:`${fmt(a)} − (${fmt(z)})`,target:`${fmt(a)} − (${fmt(z)})`,choices:[`${fmt(a)} − (${fmt(z)})`],result:ans}]};
}
export function makeQuestions(game:GameId,previous:Question[]=[]):Question[]{
 const used=new Set(previous.map(questionKey));
 if(game==='multiply'||game==='divide')return makeSigned(game,used);
 if(game==='mixed'){const out:Question[]=[];for(let level=0;level<3;level++)while(out.length<(level+1)*5){const q=mixedQuestion(level,out.length%2===1,out.length%4>=2);if(!used.has(questionKey(q))&&!out.some(x=>questionKey(x)===questionKey(q)))out.push(q)}return out}
 if(game==='locate'){
  const values=Array.from({length:21},(_,i)=>i-10).filter(n=>n!==0);
  const zeroIndex=choose(Array.from({length:15},(_,i)=>i).filter(i=>(previous[i] as LegacyQuestion|undefined)?.a!==0));
  return Array.from({length:15},(_,i)=>{const old=(previous[i] as LegacyQuestion|undefined)?.a;const a=i===zeroIndex?0:choose(values.filter(n=>n!==old));if(a!==0)values.splice(values.indexOf(a),1);return legacyQ(a)});
 }
 if(game==='compare'){
  const pool:Question[]=[];for(let a=-10;a<=10;a++)for(let b=-10;b<=10;b++)pool.push(legacyQ(a,b));
  return [...shuffle([...draw(pool.filter(q=>legacy(q).a>=0&&legacy(q).b>=0&&legacy(q).a!==legacy(q).b),4,used),...draw(pool.filter(q=>legacy(q).a===legacy(q).b&&legacy(q).a>=0),1,used)]),...shuffle(draw(pool.filter(q=>legacy(q).a*legacy(q).b<=0&&legacy(q).a!==legacy(q).b&&(legacy(q).a<0||legacy(q).b<0)),5,used)),...shuffle([...draw(pool.filter(q=>legacy(q).a<0&&legacy(q).b<0&&legacy(q).a!==legacy(q).b),4,used),...draw(pool.filter(q=>legacy(q).a===legacy(q).b&&legacy(q).a<0),1,used)])];
 }
 if(game==='move')return [0,1,2,3].flatMap(category=>{const op=category%2===0?'+':'-';const pool:Question[]=[];for(let a=-10;a<=10;a++)for(let m=1;m<=8;m++){const b=m*(category>=2?-1:1),q=legacyQ(a,b,op);if(Math.abs(result(q))<=10)pool.push(q)}return draw(pool,category===3?3:4,used)});
 return [0,1,2].flatMap(level=>shuffle([...([0,1,2,3] as number[]),choose([0,1,2,3])].flatMap(category=>{const op=category%2===0?'+':'-';const pool:Question[]=[];for(let a=level===0?1:-20;a<=(level===0?10:level===1?-1:20);a++)for(let m=level===0?1:6;m<=(level===0?9:15);m++){const b=m*(category>=2?-1:1),q=legacyQ(a,b,op);if(Math.abs(result(q))>20)continue;if(level<2)pool.push(q);else for(let n=1;n<=12;n++){const candidate=legacyQ(a,b,op,{op:category<2?'+':'-',value:n*(category%2===0?-1:1)});if(Math.abs(result(candidate))<=20&&result(candidate)!==a)pool.push(candidate)}}return draw(pool,1,used)})));
}
export function startSession(game:GameId,questions=makeQuestions(game),now=Date.now()):Session{return {game,questions,index:0,stage:0,errors:0,stageErrors:0,firstTry:0,questionErrors:0,skipped:0,currentFirstTryStreak:0,longestFirstTryStreak:0,solved:false,finished:false,feedback:'',startedAt:now,completedAt:null}}
export function expected(s:Session):string{const q=s.questions[s.index];if(s.game==='locate')return String(legacy(q).a);if(s.game==='compare')return relation(q);if(s.game==='move')return s.stage===0?(delta(q)<0?'left':'right'):s.stage===1?String(Math.abs(legacy(q).b)):String(result(q));if(s.game==='brackets')return s.stage===0?bracketAnswer(legacy(q)):String(result(q));if(s.game==='multiply'||s.game==='divide')return s.stage===0?(result(q)<0?'negative':'positive'):String(result(q));const m=q as MixedQuestion,step=m.steps[Math.floor(s.stage/2)];return s.stage%2===0?step.target:String(step.result)}
function ruleHint(q:SignedQuestion){if(q.values.length===3)return '三個數要逐個判斷符號；每次套用兩數的正負號規則。';const [a,b]=q.values;return a>0&&b>0?'正正得正。':a>0?'正負得負。':b>0?'負正得負。':'負負得正。'}
function lastStage(s:Session){if(s.game==='move')return 2;if(s.game==='brackets'||s.game==='multiply'||s.game==='divide')return 1;if(s.game==='mixed')return (s.questions[s.index] as MixedQuestion).steps.length*2-1;return 0}
export function submit(s:Session,answer:string,now=Date.now()):Session{if(s.finished||s.solved)return s;const q=s.questions[s.index];if(answer!==expected(s)){let hint='';if(s.game==='locate')hint=legacy(q).a===0?'零是正負數的分界，找找數線中央。':`從零開始，向${legacy(q).a<0?'左':'右'}找 ${Math.abs(legacy(q).a)} 格。`;else if(s.game==='compare')hint='看一看數線：越右的數越大。';else if(s.game==='move')hint='留意加減號和括號內數字的正負號。';else if(s.game==='brackets')hint=s.stage===0?'括號前是減號時，括號內的數要取相反數。':'由左至右逐步計算。';else if(s.game==='multiply'||s.game==='divide')hint=ruleHint(q as SignedQuestion)+((q as SignedQuestion).values.length===3&&s.game==='divide'?' 連除要由左至右計算。':'');else {const m=q as MixedQuestion;hint=m.level===0?'先乘除，後加減。':s.stage<2?'先計算最內層括號。':'同級運算要由左至右計算。'}return {...s,errors:s.errors+1,questionErrors:s.questionErrors+1,stageErrors:s.stageErrors+1,currentFirstTryStreak:0,feedback:`再試一次。${hint}`}}if(s.stage<lastStage(s))return {...s,stage:s.stage+1,stageErrors:0,feedback:s.game==='multiply'||s.game==='divide'?'符號正確！接着輸入完整答案。':s.game==='mixed'?(s.stage%2===0?'選擇正確！輸入這部分的結果。':'計算正確！繼續選擇下一步。'):s.game==='move'?'這一步正確，繼續下一步。':'拆括號正確！接着計算答案。'};const finished=s.index===s.questions.length-1,first=s.questionErrors===0,streak=first?s.currentFirstTryStreak+1:0;return {...s,solved:true,finished,completedAt:finished?now:null,firstTry:s.firstTry+(first?1:0),currentFirstTryStreak:streak,longestFirstTryStreak:Math.max(s.longestFirstTryStreak,streak),feedback:`答對了！這題獲得 ${first?10:5} 分。`}}
export function skipQuestion(s:Session,now=Date.now()):Session{if(s.finished||s.solved||s.index<10)return s;const finished=s.index===s.questions.length-1;return {...s,stage:lastStage(s),skipped:s.skipped+1,solved:true,finished,completedAt:finished?now:null,currentFirstTryStreak:0,feedback:'已放棄本題，這題不計分。'}}
export const score=(s:Session)=>{const completed=s.index+(s.solved?1:0);return s.firstTry*10+Math.max(0,completed-s.firstTry-s.skipped)*5};
export const elapsedSeconds=(s:Session,now:number)=>Math.max(0,Math.floor(((s.completedAt??now)-s.startedAt)/1000));
export function nextQuestion(s:Session):Session{if(!s.solved||s.finished)return s;return {...s,index:s.index+1,stage:0,stageErrors:0,questionErrors:0,solved:false,feedback:''}}
export type Action={type:'start';session:Session}|{type:'answer';value:string}|{type:'next'}|{type:'skip'}|{type:'home'};
export function reducer(s:Session|null,a:Action):Session|null{if(a.type==='home')return null;if(a.type==='start')return a.session;if(!s)return s;if(a.type==='answer')return submit(s,a.value);if(a.type==='skip')return skipQuestion(s);return nextQuestion(s)}
