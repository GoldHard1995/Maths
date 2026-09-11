import { equivalent, followsForm, normalizeDisplay, parseExpression, type FormRule, type Variable, variables } from './algebra.ts';

export type GameId='words'|'add-subtract'|'multiply-divide'|'expand'|'mixed-expand'|'substitute'|'sequence';
export const gameIds:GameId[]=['words','add-subtract','multiply-divide','expand','mixed-expand','substitute','sequence'];
export type Choice={value:string;label:string};
export type AlgebraQuestion={kind:'algebra';level:number;variant:number;prompt:string;expression?:string;instruction:string;expected:string;choices?:Choice[];direct:boolean;usedVariables:Variable[];form?:FormRule};
export type GuidedStep={instruction:string;expected:string;form:FormRule};
export type GuidedQuestion={kind:'guided';level:2;variant:number;prompt:string;expression:string;steps:GuidedStep[];usedVariables:Variable[]};
export type NumericQuestion={kind:'numeric';level:number;variant:number;prompt:string;expression:string;instruction:string;answer:number};
export type Question=AlgebraQuestion|GuidedQuestion|NumericQuestion;
export type Session={game:GameId;questions:Question[];index:number;stage:number;errors:number;stageErrors:number;firstTry:number;questionErrors:number;skipped:number;currentFirstTryStreak:number;longestFirstTryStreak:number;solved:boolean;finished:boolean;feedback:string;startedAt:number;completedAt:number|null};

const pick=<T,>(xs:T[])=>xs[Math.floor(Math.random()*xs.length)];
const rand=(a:number,b:number)=>Math.floor(Math.random()*(b-a+1))+a;
const nz=(a:number,b:number)=>{let n=0;while(!n)n=rand(a,b);return n};
const shuffle=<T,>(xs:T[])=>{const out=[...xs];for(let i=out.length-1;i;i--){const j=rand(0,i);[out[i],out[j]]=[out[j],out[i]]}return out};
const signed=(n:number)=>n<0?`−${Math.abs(n)}`:String(n);
const pair=()=>{const x=pick([...variables]);return [x,pick(variables.filter(y=>y!==x))] as [Variable,Variable]};
const term=(n:number,v:string)=>Math.abs(n)===1?v:`${Math.abs(n)}${v}`;
const linear=(items:[number,Variable][],constant=0)=>{
 const parts=[...items.filter(([n])=>n).map(([n,v])=>({n,text:term(n,v)})),...(constant?[{n:constant,text:String(Math.abs(constant))}]:[])];
 if(!parts.length)return'0';return parts.map((p,i)=>i?(p.n<0?' − ':' ＋ ')+p.text:(p.n<0?'−':'')+p.text).join('');
};
const choices=(answer:string,wrong:string[])=>{const fallbacks=[`(${answer})+1`,`(${answer})-1`,`-(${answer})`,`2*(${answer})`],valid=[...new Set([...wrong,...fallbacks])].filter(value=>parseExpression(value).ok&&!equivalent(value,answer));return shuffle([answer,...valid.slice(0,3)].map(value=>({value,label:normalizeDisplay(value)})))};
const algebra=(level:number,variant:number,prompt:string,expression:string|undefined,instruction:string,expected:string,usedVariables:Variable[],wrong:string[]=[],form?:FormRule):AlgebraQuestion=>({kind:'algebra',level,variant,prompt,expression,instruction,expected,direct:level===2,usedVariables,form,choices:level===2?undefined:choices(expected,wrong)});
const finalForm:FormRule={parentheses:0,multiplyDivide:0,collected:true};

function words(level:number,variant:number):AlgebraQuestion{
 const [x,y]=pair(),k=rand(2,9);
 if(level===0){const type=['add','sub','sum','diff','more'][variant]??'add',plus=type==='add'||type==='sum'||type==='more',answer=`${x}${plus?'+':'-'}${k}`;const prompt=type==='add'?`一個數 ${x} 加上 ${k}`:type==='sub'?`一個數 ${x} 減去 ${k}`:type==='sum'?`${x} 與 ${k} 的和`:type==='more'?`比 ${x} 多 ${k} 的數`:`${x} 與 ${k} 的差`;return algebra(level,variant,prompt,undefined,'選出與文字描述相符的代數式。',answer,[x],[`${k}-${x}`,`${k}${x}`,`${x}${plus?'-':'+'}${k}`]);}
 const m=rand(2,6),d=rand(2,6),type=['sum-times','diff-over','times-plus','over-minus','diff-times'][variant]??'sum-times';
 const answer=type==='sum-times'?`${m}*(${x}+${y})`:type==='diff-over'?`(${x}-${y})/${d}`:type==='times-plus'?`${m}${x}+${y}`:type==='over-minus'?`${x}/${d}-${y}`:`${m}*(${x}-${y})`;
 const prompt=type==='sum-times'?`${x} 與 ${y} 的和的 ${m} 倍`:type==='diff-over'?`${x} 與 ${y} 的差除以 ${d}`:type==='times-plus'?`${x} 的 ${m} 倍與 ${y} 的和`:type==='over-minus'?`${x} 除以 ${d} 後，再減去 ${y}`:`${x} 與 ${y} 的差的 ${m} 倍`;
 const wrong=type==='sum-times'?[`${m}${x}+${y}`,`${x}+${m}${y}`,`(${x}+${y})/${m}`]:type==='diff-over'?[`${x}-${y}/${d}`,`(${x}+${y})/${d}`,`(${y}-${x})/${d}`]:type==='times-plus'?[`${m}*(${x}+${y})`,`${x}+${m}${y}`,`${x}+${y}+${m}`]:type==='over-minus'?[`${x}/(${d}+1)-${y}`,`${x}/${d}+${y}`,`${x}-${y}/${d}`]:[`${m}${x}-${y}`,`${x}-${m}${y}`,`${m}*(${x}+${y})`];
 return algebra(level,variant,prompt,undefined,level===2?'使用鍵盤輸入相符的代數式。':'選出相符的代數式。',answer,[x,y],wrong);
}

function addSubtract(level:number,variant:number):AlgebraQuestion{
 const [x,y]=pair();
 if(level===0){const a=rand(2,8),minus=variant%2===1;let b=rand(2,8);if(minus)while(b===a)b=rand(2,8);const extra=variant>=3?rand(1,5):0,c=minus?a-b+extra:a+b+extra,expression=`${a}${x} ${minus?'−':'＋'} ${b}${x}${extra?` ＋ ${term(extra,x)}`:''}`,answer=linear([[c,x]]);return algebra(level,variant,'化簡以下代數式。',expression,'選出正確答案。',answer,[x],[linear([[a,x]]),linear([[-c,x]]),String(Math.abs(c))],finalForm);}
 const ns=[nz(-7,7),nz(-7,7),nz(-6,6),nz(-6,6)],c=nz(-8,8),d=nz(-8,8),extra=level===2?nz(-5,5):0,base:[[number,Variable],[number,Variable],[number,Variable],[number,Variable]]=[[ns[0],x],[ns[1],y],[ns[2],x],[ns[3],y]],orders=[[0,1,2,3],[0,2,1,3],[1,0,3,2],[2,1,0,3],[3,0,2,1]],ordered=orders[variant].map(index=>base[index]),items=extra?[...ordered,[extra,variant%2?y:x] as [number,Variable]]:ordered;
 const expression=`${linear(items,c)} ${d<0?'−':'＋'} ${Math.abs(d)}`,answer=linear([[ns[0]+ns[2]+(extra&&variant%2===0?extra:0),x],[ns[1]+ns[3]+(extra&&variant%2===1?extra:0),y]],c+d);
 return algebra(level,variant,'合併同類項，化簡以下代數式。',expression,level===2?'使用鍵盤輸入最簡答案。':'選出最簡答案。',answer,[x,y],[linear([[ns[0]-ns[2],x],[ns[1]+ns[3],y]],c+d),linear([[ns[0]+ns[2],x],[ns[1]-ns[3],y]],c-d),linear([[ns.reduce((s,n)=>s+n,0),x]],c+d)],finalForm);
}

function multiplyDivide(level:number,variant:number):AlgebraQuestion{
 const [x,y]=pair();
 if(level===0){const a=rand(2,9),b=rand(2,8),mul=variant%2===0,c=mul?a*b:a,expression=mul?(variant%4===0?`${b} × ${a}${x}`:`${a}${x} × ${b}`):`${a*b}${x} ÷ ${b}`,answer=linear([[c,x]]);return algebra(level,variant,'完成以下單項式運算。',expression,'選出正確答案。',answer,[x],[linear([[a,x]]),linear([[a+b,x]]),String(c)],finalForm);}
 const d=rand(2,6),a=nz(-8,8),m=nz(-5,5);
 if(level===1){const answer=linear([[a*m,x]]),multiplier=m<0?`(${signed(m)})`:String(m),start=a*d<0?`(−${term(a*d,x)})`:term(a*d,x),expression=variant%2?`${multiplier} × ${start} ÷ ${d}`:`${start} ÷ ${d} × ${multiplier}`;return algebra(level,variant,'由左至右完成乘除。',expression,'選出正確答案。',answer,[x],[linear([[a*d*m,x]]),linear([[a+m,x]]),linear([[-a*m,x]])],finalForm);}
 const e=rand(2,5),b=nz(-7,7),scaled=a<0?`(−${term(a,x)})`:`${term(a,x)}`,first=variant>=2?`${d} × ${scaled} ÷ ${d}`:`${signed(a*d)}${x} ÷ ${d}`,second=`${Math.abs(b*e)}${y} ÷ ${e}`,expression=variant%2?`${second} ${a<0?'−':'＋'} ${term(a,x)}`:`${first} ${b<0?'−':'＋'} ${second}`,answer=variant%2?linear([[Math.abs(b),y],[a,x]]):linear([[a,x],[b,y]]);
 return algebra(level,variant,'完成各項乘除並化簡。',expression,'使用鍵盤輸入最簡答案。',answer,[x,y],[],finalForm);
}

function expand(level:number,variant:number):AlgebraQuestion{
 const [x,y]=pair(),outside=level===0?rand(2,6):-rand(2,6),cx=level===0?1:variant%2?rand(1,4):nz(-4,4),cy=level===2?(variant%2?rand(1,3):nz(-3,3)):0,c=level===0?rand(1,8):nz(-8,8),normal=linear([[cx,x],[cy,y]],c),inside=level>0&&variant%2&&c>0?`${c} ＋ ${linear([[cx,x],[cy,y]])}`:normal,expression=`${signed(outside)}(${inside})`,answer=linear([[outside*cx,x],[outside*cy,y]],outside*c);
 return algebra(level,variant,'運用分配律拆開括號。',expression,level===2?'使用鍵盤輸入拆括號後的代數式。':'選出拆括號後的代數式。',answer,cy?[x,y]:[x],[linear([[outside*cx,x],[outside*cy,y]],c),linear([[cx,x],[cy,y]],outside*c),linear([[-outside*cx,x],[-outside*cy,y]],-outside*c)],finalForm);
}

function mixedBasic(level:0|1,variant:number):AlgebraQuestion{
 const x=pick([...variables]),outside=level?pick([-5,-4,-3,-2,2,3,4,5,6]):rand(2,6),c=nz(-7,7);
 if(level===0){const loose=rand(2,8),expression=variant%2?`${loose}${x} ＋ ${signed(outside)}(${x}${c<0?' − ':' ＋ '}${Math.abs(c)})`:`${signed(outside)}(${x}${c<0?' − ':' ＋ '}${Math.abs(c)}) ＋ ${loose}${x}`,answer=linear([[outside+loose,x]],outside*c);return algebra(level,variant,'拆括號並合併同類項。',expression,'選出最簡答案。',answer,[x],[linear([[outside,x]],outside*c+loose),linear([[outside-loose,x]],outside*c),linear([[outside+loose,x]],c)],finalForm);}
 const d=rand(2,5),e=nz(-7,7),plus=variant%2===1,expression=`${signed(outside)}(${x}${c<0?' − ':' ＋ '}${Math.abs(c)}) ${plus?'＋':'−'} ${d}(${x}${e<0?' − ':' ＋ '}${Math.abs(e)})`,answer=linear([[outside+(plus?d:-d),x]],outside*c+(plus?d*e:-d*e));
 return algebra(level,variant,'拆開兩個括號，再合併同類項。',expression,'選出最簡答案。',answer,[x],[linear([[outside+d,x]],outside*c-d*e),linear([[outside-d,x]],outside*c+d*e),linear([[outside+d,x]],outside*c+d*e)],finalForm);
}

function guided(variant:number):GuidedQuestion{
 const x=pick([...variables]),o=rand(2,5),i=rand(2,5),c=nz(-6,6),loose=rand(2,6),d=rand(2,5),pattern=variant%4,bracket=`${o}(${i}${x}${c<0?' − ':' ＋ '}${Math.abs(c)})`,expanded=linear([[o*i,x]],o*c),final=linear([[o*i+loose,x]],o*c);
 if(pattern<2){const reverse=variant===4,expression=pattern?`${bracket} ＋ ${loose*d}${x} ÷ ${d}`:reverse?`${loose}${x} ＋ ${bracket}`:`${bracket} ＋ ${loose}${x}`,steps:GuidedStep[]=[];if(pattern)steps.push({instruction:'第一行：只完成除法，保留括號。',expected:`${bracket} ＋ ${loose}${x}`,form:{parentheses:1,multiplyDivide:0,requiredFragments:[bracket]}});steps.push({instruction:`第 ${steps.length+1} 行：只拆開括號，暫時不要合併。`,expected:reverse?`${loose}${x} ＋ ${expanded}`:`${expanded} ＋ ${loose}${x}`,form:{parentheses:0,multiplyDivide:0,collected:false}},{instruction:`第 ${steps.length+2} 行：合併同類項，輸入最簡答案。`,expected:final,form:finalForm});return{kind:'guided',level:2,variant,prompt:'按指示逐行化簡。',expression,steps,usedVariables:[x]};}
 const p=rand(2,5),q=rand(1,4),r=nz(-6,6),second=`${p}(${term(q,x)}${r<0?' − ':' ＋ '}${Math.abs(r)})`,prefix=pattern===3?`${2*d}${x} ÷ ${d} ＋ `:'',done=pattern===3?`2${x} ＋ `:'',first=`${expanded} − ${second}`,both=`${expanded} − ${linear([[p*q,x]],p*r)}`,answer=linear([[(pattern===3?2:0)+o*i-p*q,x]],o*c-p*r),steps:GuidedStep[]=[];
 if(pattern===3)steps.push({instruction:'第一行：只完成除法，保留兩個括號。',expected:`${done}${bracket} − ${second}`,form:{parentheses:2,multiplyDivide:0,requiredFragments:[bracket,second]}});
 steps.push({instruction:`第 ${steps.length+1} 行：只拆開第一個括號。`,expected:`${done}${first}`,form:{parentheses:1,multiplyDivide:0,requiredFragments:[second]}},{instruction:`第 ${steps.length+2} 行：拆開餘下括號，暫時不要合併。`,expected:`${done}${both}`,form:{parentheses:0,multiplyDivide:0,collected:false}},{instruction:`第 ${steps.length+3} 行：合併同類項，輸入最簡答案。`,expected:answer,form:finalForm});
 return{kind:'guided',level:2,variant,prompt:'按指示逐行化簡。',expression:`${prefix}${bracket} − ${second}`,steps,usedVariables:[x]};
}

function numeric(game:'substitute'|'sequence',level:number,variant:number):NumericQuestion{
 while(true){
  if(game==='substitute'){const x=level? nz(-8,8):rand(1,9),y=nz(-7,7),m=rand(2,6),k=nz(-5,5),c=nz(-10,10),answer=level===0?m*x+c:level===1?m*x+k*y:m*(x+k*y)+c;if(answer< -50||answer>100)continue;const ky=term(k,'y'),inside=`x ${k<0?'−':'＋'} ${ky}`,normal=level===0?`P = ${m}x ${c<0?'−':'＋'} ${Math.abs(c)}`:level===1?`Q = ${m}x ${k<0?'−':'＋'} ${ky}`:`R = ${m}(${inside}) ${c<0?'−':'＋'} ${Math.abs(c)}`,reversed=level===0?`P = ${signed(c)} ＋ ${m}x`:level===1?`Q = ${k<0?'−':''}${ky} ＋ ${m}x`:`R = ${signed(c)} ＋ ${m}(${inside})`,expression=variant%2?reversed:normal,prompt=level===0?`當 x = ${signed(x)}`:`當 x = ${signed(x)}，y = ${signed(y)}`;return{kind:'numeric',level,variant,prompt,expression,instruction:`求 ${level===0?'P':level===1?'Q':'R'} 的值。`,answer};}
  const n=level===2?2*rand(2,10):rand(2,15),m=level===2?pick([1,3,5]):level?nz(-7,7):rand(2,7),c=nz(-12,12),answer=level===2?m*n/2+c:m*n+c;if(!Number.isInteger(answer)||answer< -50||answer>100)continue;const mn=`${m<0?'−':''}${term(m,'n')}`,part=level===2?`${mn} ÷ 2`:mn,formula=variant%2?`Tₙ = ${signed(c)} ${m<0?'−':'＋'} ${level===2?`${term(m,'n')} ÷ 2`:term(m,'n')}`:`Tₙ = ${part} ${c<0?'−':'＋'} ${Math.abs(c)}`;return{kind:'numeric',level,variant,prompt:`${formula} 為一數列的通項。`,expression:`求該數列的第 ${n} 項。`,instruction:`把 n = ${n} 代入通項。`,answer};
 }
}

function generate(game:GameId,level:number,variant:number):Question{if(game==='words')return words(level,variant);if(game==='add-subtract')return addSubtract(level,variant);if(game==='multiply-divide')return multiplyDivide(level,variant);if(game==='expand')return expand(level,variant);if(game==='mixed-expand')return level===2?guided(variant):mixedBasic(level as 0|1,variant);return numeric(game,level,variant)}
export const questionKey=(q:Question)=>q.kind==='numeric'?`${q.prompt}|${q.expression}|${q.answer}`:q.kind==='guided'?`${q.expression}|${q.steps.map(s=>s.expected).join('|')}`:`${q.prompt}|${q.expression}|${q.expected}`;
export function makeQuestions(game:GameId,previous:Question[]=[]){const used=new Set(previous.map(questionKey)),out:Question[]=[];for(let level=0;level<3;level++){let attempts=0;while(out.length<(level+1)*5){if(++attempts>5000)throw new Error('未能產生足夠的不重複題目。');const variant=out.length-level*5,q=generate(game,level,variant),key=questionKey(q);if(!used.has(key)&&!out.some(x=>questionKey(x)===key)){out.push(q);used.add(key)}}}return[...shuffle(out.slice(0,5)),...shuffle(out.slice(5,10)),...shuffle(out.slice(10,15))]}
export function startSession(game:GameId,questions=makeQuestions(game),now=Date.now()):Session{return{game,questions,index:0,stage:0,errors:0,stageErrors:0,firstTry:0,questionErrors:0,skipped:0,currentFirstTryStreak:0,longestFirstTryStreak:0,solved:false,finished:false,feedback:'',startedAt:now,completedAt:null}}
export function expected(s:Session){const q=s.questions[s.index];return q.kind==='numeric'?String(q.answer):q.kind==='guided'?q.steps[s.stage].expected:q.expected}
function correct(s:Session,now:number):Session{const q=s.questions[s.index],last=q.kind==='guided'?q.steps.length-1:0;if(s.stage<last)return{...s,stage:s.stage+1,stageErrors:0,feedback:'這一行正確，按指示完成下一行。'};const finished=s.index===s.questions.length-1,first=s.questionErrors===0,streak=first?s.currentFirstTryStreak+1:0;return{...s,solved:true,finished,completedAt:finished?now:null,firstTry:s.firstTry+(first?1:0),currentFirstTryStreak:streak,longestFirstTryStreak:Math.max(s.longestFirstTryStreak,streak),feedback:`答對了！這題獲得 ${first?10:5} 分。`}}
export function submit(s:Session,answer:string,now=Date.now()):Session{if(s.finished||s.solved)return s;const q=s.questions[s.index];if(q.kind==='numeric'){if(answer.trim()==='')return{...s,feedback:'請輸入答案。'};if(answer===String(q.answer))return correct(s,now)}else{const parsed=parseExpression(answer);if(!parsed.ok)return{...s,feedback:parsed.message};const target=q.kind==='guided'?q.steps[s.stage]:q;if(equivalent(answer,target.expected)){if(!followsForm(answer,target.form))return{...s,feedback:'答案等值，但未符合這一行指定的形式，請依指示再寫一次。'};return correct(s,now)}}const hints:Record<GameId,string>={words:'留意運算次序，以及「和」或「差」是否需要括號。','add-subtract':'只有同類項才可合併；分別處理每種字母和常數項。','multiply-divide':'先計算數字係數，字母部分保持不變。',expand:'括號內每一項都要乘以括號外的數。','mixed-expand':'只完成本行指示的運算，再檢查正負號。',substitute:'先把字母換成指定數值，再依運算次序計算。',sequence:'把題目指定的 n 值代入通項。'};return{...s,errors:s.errors+1,questionErrors:s.questionErrors+1,stageErrors:s.stageErrors+1,currentFirstTryStreak:0,feedback:`再試一次。${hints[s.game]}`}}
export function skipQuestion(s:Session,now=Date.now()):Session{if(s.finished||s.solved||s.index<10)return s;const q=s.questions[s.index],last=q.kind==='guided'?q.steps.length-1:0,finished=s.index===s.questions.length-1;return{...s,stage:last,skipped:s.skipped+1,solved:true,finished,completedAt:finished?now:null,currentFirstTryStreak:0,feedback:'已放棄本題，這題不計分。'}}
export const score=(s:Session)=>{const completed=s.index+(s.solved?1:0);return s.firstTry*10+Math.max(0,completed-s.firstTry-s.skipped)*5};
export const elapsedSeconds=(s:Session,now:number)=>Math.max(0,Math.floor(((s.completedAt??now)-s.startedAt)/1000));
export function nextQuestion(s:Session):Session{return!s.solved||s.finished?s:{...s,index:s.index+1,stage:0,stageErrors:0,questionErrors:0,solved:false,feedback:''}}
export type Action={type:'start';session:Session}|{type:'answer';value:string}|{type:'next'}|{type:'skip'}|{type:'home'};
export function reducer(s:Session|null,a:Action):Session|null{if(a.type==='home')return null;if(a.type==='start')return a.session;if(!s)return s;if(a.type==='answer')return submit(s,a.value);if(a.type==='skip')return skipQuestion(s);return nextQuestion(s)}
