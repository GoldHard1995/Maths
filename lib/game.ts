export type GameId = 'locate' | 'compare' | 'move' | 'brackets';
export type Question = { a: number; b: number; op: '+' | '-'; third?: { op: '+' | '-'; value: number } };
export type Session = {
  game: GameId; questions: Question[]; index: number; stage: number;
  errors: number; stageErrors: number; firstTry: number; questionErrors: number;
  solved: boolean; finished: boolean; feedback: string; startedAt: number;
};
export const gameIds: GameId[] = ['locate', 'compare', 'move', 'brackets'];
export const signed = (n: number) => n < 0 ? `−${Math.abs(n)}` : n > 0 ? `+${n}` : '0';
export const plain = (n: number) => String(n).replace('-', '−');
export const delta = (q: Question) => q.op === '+' ? q.b : -q.b;
const thirdDelta = (q: Question) => q.third ? (q.third.op === '+' ? q.third.value : -q.third.value) : 0;
export const result = (q: Question) => q.a + delta(q) + thirdDelta(q);
export const relation = (q: Question) => q.a < q.b ? '<' : q.a > q.b ? '>' : '=';
export const expression = (q: Question) => `${plain(q.a)} ${q.op === '-' ? '−' : '+'} (${signed(q.b)})${q.third ? ` ${q.third.op === '-' ? '−' : '+'} (${signed(q.third.value)})` : ''}`;
const signOf = (n: number) => n < 0 ? '-' : '+';
const bracketAnswer = (q: Question) => signOf(delta(q)) + (q.third ? ',' + signOf(thirdDelta(q)) : '');
const withSigns = (q: Question, signs: string) => {
  const [first, second] = signs.split(',');
  return `${plain(q.a)} ${first === '-' ? '−' : '+'} ${Math.abs(q.b)}${q.third ? ` ${second === '-' ? '−' : '+'} ${Math.abs(q.third.value)}` : ''}`;
};
export const simplified = (q: Question) => withSigns(q, bracketAnswer(q));
export const simplificationChoices = (q: Question) => (q.third ? ['+,+', '+,-', '-,+', '-,-'] : ['+', '-']).map(value => ({value, label: withSigns(q, value)}));
const choose = <T,>(xs: T[]): T => xs[Math.floor(Math.random() * xs.length)];
const shuffle = <T,>(items: T[]): T[] => {
  const xs = [...items];
  for(let i=xs.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[xs[i],xs[j]]=[xs[j],xs[i]];}
  return xs;
};
export const questionKey = (q: Question) => JSON.stringify([q.a,q.op,q.b,q.third?.op,q.third?.value]);
export function makeQuestions(game: GameId, previous: Question[] = []): Question[] {
  const used = new Set(previous.map(questionKey));
  const draw = (pool: Question[], count: number): Question[] => {
    const available = pool.filter(q=>!used.has(questionKey(q)));
    const picked: Question[]=[];
    for(let i=0;i<count;i++) {
      const index=Math.floor(Math.random()*available.length);
      const [q]=available.splice(index,1);
      if(!q)throw new Error('Not enough distinct questions for this stage.');
      used.add(questionKey(q));picked.push(q);
    }
    return picked;
  };
  if(game==='locate') {
    const values=Array.from({length:21},(_,i)=>i-10).filter(n=>n!==0);
    const zeroIndex=choose(Array.from({length:16},(_,i)=>i).filter(i=>previous[i]?.a!==0));
    return Array.from({length:16},(_,i)=>{
      const a=i===zeroIndex?0:choose(values.filter(n=>n!==previous[i]?.a));
      if(a!==0)values.splice(values.indexOf(a),1);
      return {a,b:0,op:'+'};
    });
  }
  if(game==='compare') {
    const pool: Question[]=[];
    for(let a=-10;a<=10;a++)for(let b=-10;b<=10;b++)pool.push({a,b,op:'+'});
    return [
      ...shuffle([...draw(pool.filter(q=>q.a>=0&&q.b>=0&&q.a!==q.b),3),...draw(pool.filter(q=>q.a===q.b&&q.a>=0),1)]),
      ...shuffle(draw(pool.filter(q=>q.a*q.b<=0&&q.a!==q.b&&(q.a<0||q.b<0)),4)),
      ...shuffle([...draw(pool.filter(q=>q.a<0&&q.b<0&&q.a!==q.b),7),...draw(pool.filter(q=>q.a===q.b&&q.a<0),1)]),
    ];
  }
  if(game==='move') {
    return [0,1,2,3].flatMap(category=>{
      const op=category%2===0?'+':'-';const pool: Question[]=[];
      for(let a=-10;a<=10;a++)for(let magnitude=1;magnitude<=8;magnitude++){
        const b=magnitude*(category>=2?-1:1);const q: Question={a,b,op};
        if(Math.abs(result(q))<=10)pool.push(q);
      }
      return draw(pool,4);
    });
  }
  return [0,1,2].flatMap(level=>shuffle([0,1,2,3].flatMap(category=>{
    const op=category%2===0?'+':'-';const pool: Question[]=[];
    for(let a=level===0?1:-20;a<=(level===0?10:level===1?-1:20);a++){
      for(let magnitude=level===0?1:6;magnitude<=(level===0?9:15);magnitude++){
        const b=magnitude*(category>=2?-1:1);const q: Question={a,b,op};
        if(Math.abs(result(q))>20)continue;
        if(level<2){pool.push(q);continue;}
        for(let n=1;n<=12;n++){
          const third: NonNullable<Question['third']>={op:category<2?'+':'-',value:n*(category%2===0?-1:1)};
          const candidate={...q,third};
          if(Math.abs(result(candidate))<=20&&result(candidate)!==a)pool.push(candidate);
        }
      }
    }
    return draw(pool,1);
  })));
}

export function startSession(game: GameId, questions = makeQuestions(game), now = Date.now()): Session {
  return {game,questions,index:0,stage:0,errors:0,stageErrors:0,firstTry:0,questionErrors:0,solved:false,finished:false,feedback:'',startedAt:now};
}
export function expected(s: Session): string {
  const q=s.questions[s.index];
  if(s.game==='locate')return String(q.a);
  if(s.game==='compare')return relation(q);
  if(s.game==='move')return s.stage===0?(delta(q)<0?'left':'right'):s.stage===1?String(Math.abs(q.b)):String(result(q));
  return s.stage===0?bracketAnswer(q):String(result(q));
}
export function submit(s: Session, answer: string): Session {
  if(s.finished || s.solved) return s;
  const q=s.questions[s.index];
  if(answer!==expected(s)) {
    const hints = {
      locate: q.a===0?'零是正負數的分界，找找數線中央。':`從零開始，向${q.a<0?'左':'右'}找 ${Math.abs(q.a)} 格。`,
      compare:'看一看數線：越右的數越大。兩個數在同一位置時相等。',
      move:s.stage===0?(q.b<0 ? (q.op==='-'?'減去負數，相當於加上正數，應向右移。':'加上負數，應向左移。'):(q.op==='+'?'加上正數，應向右移。':'減去正數，應向左移。')):s.stage===1?`步數是 ${signed(q.b)} 與零的距離，數一數有多少格。`:`從 ${plain(q.a)} 出發，向${delta(q)<0?'左':'右'}移 ${Math.abs(q.b)} 格，再找終點。`,
      brackets:s.stage===0?(q.third?'逐一檢查兩個括號：括號前是加號時，括號內的數保留原符號；減號後的數要取相反數。':q.op==='+'?'括號前是加號，括號內的數保留原來符號。':q.b<0?'減去負數，相當於加上它的相反數，所以變成加正數。':'減去正數，相當於加上它的相反數，所以變成減正數。'):`拆括號已正確。${q.third ? '由左至右逐步計算。' : ''}請再計算 ${simplified(q)}。`,
    };
    return {...s,errors:s.errors+1,questionErrors:s.questionErrors+1,stageErrors:s.stageErrors+1,feedback:`再試一次。${hints[s.game]}`};
  }
  const lastStage = s.game==='move'?2:s.game==='brackets'?1:0;
  if(s.stage<lastStage) return {...s,stage:s.stage+1,stageErrors:0,feedback:s.game==='move'?(s.stage===0?'方向正確！接着選擇步數。':'步數正確！最後點選終點。'):'拆括號正確！接着計算答案。'};
  return {...s,solved:true,firstTry:s.firstTry+(s.questionErrors===0?1:0),feedback:'答對了！你完成了這個任務。'};
}
export function nextQuestion(s: Session): Session {
  if(!s.solved||s.finished) return s;
  if(s.index===s.questions.length-1)return {...s,finished:true};
  return {...s,index:s.index+1,stage:0,stageErrors:0,questionErrors:0,solved:false,feedback:''};
}
export type Action = {type:'start';session:Session}|{type:'answer';value:string}|{type:'next'}|{type:'home'};
export function reducer(s:Session|null, action:Action):Session|null {
  if(action.type==='home')return null;
  if(action.type==='start')return action.session;
  if(!s)return s;
  return action.type==='answer'?submit(s,action.value):nextQuestion(s);
}
