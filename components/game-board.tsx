'use client';
import { useState, useEffect } from 'react';
import { ArrowLeft, ArrowRight, Check, Lightbulb, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import NumberLine from '@/components/number-line';
import { type Session, type LegacyQuestion, type SignedQuestion, type MixedQuestion, delta, result, expression, simplified, signed, plain, relation, simplificationChoices } from '@/lib/game';

function NumericAnswer({onAnswer,disabled,max=100}:{onAnswer:(s:string)=>void;disabled:boolean;max?:number}) {
  const [value,setValue]=useState('');
  const add=(key:string)=>{setValue(v=>key==='clear'?'':key==='back'?v.slice(0,-1):key==='sign'?(v.startsWith('-')?v.slice(1):'-'+v):v.replace('-','').length<3?v+key:v);};
  const valid=/^-?\d{1,3}$/.test(value)&&Math.abs(Number(value))<=max;
  return <form className="numeric-answer" onSubmit={e=>{e.preventDefault();if(valid&&!disabled)onAnswer(String(Number(value)));}}>
    <label htmlFor="answer-input">你的答案</label><input id="answer-input" value={value} inputMode="text" autoComplete="off" placeholder="輸入答案" disabled={disabled} onChange={e=>{if(/^-?\d{0,3}$/.test(e.target.value))setValue(e.target.value);}} />
    <div className="keypad">{['1','2','3','4','5','6','7','8','9','sign','0','back'].map(k=><Button className="key" key={k} type="button" variant="secondary" disabled={disabled} aria-label={k==='sign'?'切換正負號':k==='back'?'刪除一位':k} onClick={()=>add(k)}>{k==='sign'?'±':k==='back'?'⌫':k}</Button>)}</div>
    <Button className="block-btn" type="submit" disabled={!valid||disabled}>檢查答案 <Check/></Button>
  </form>;
}
function Locate({s,answer}:{s:Session;answer:(a:string)=>void}) {
  const q=s.questions[s.index] as LegacyQuestion;const [demo,setDemo]=useState<number|undefined>();const [playing,setPlaying]=useState(false);const [replay,setReplay]=useState(0);
  useEffect(()=>{
    if(s.stageErrors<2||s.solved){setPlaying(false);return;}
    setDemo(0);setPlaying(q.a!==0);if(q.a===0)return;
    let pos=0;const timer=setInterval(()=>{pos+=Math.sign(q.a);setDemo(pos);if(pos===q.a){clearInterval(timer);setPlaying(false);}},420);
    return ()=>clearInterval(timer);
  },[s.stageErrors,s.solved,q.a,replay]);
  const instruction=s.index<5?'看看數字，找出它的位置。':s.index<11?'部分數字藏起來了，從零開始數。':'正數、負數和零，你都能找到嗎？';
  return <><span className="task-label">{instruction}</span><h2 className="task-title">在數線上找出 <strong>{signed(q.a)}</strong></h2><p className="task-instruction">點選對應的刻度。</p><NumberLine onPick={n=>answer(String(n))} labels={s.index<5?'all':'some'} cursor={s.solved?q.a:s.stageErrors>=2?demo:undefined} disabled={s.solved||playing}/>{s.stageErrors>=2&&!s.solved&&<div className="demo-note"><span>{playing?`示範：現在到達 ${plain(demo??0)}`:'示範完成，輪到你試試。'}</span><Button variant="secondary" className="block-btn secondary" disabled={playing} onClick={()=>setReplay(v=>v+1)}><RotateCcw/>重看示範</Button></div>}</>;
}
function Compare({s,answer}:{s:Session;answer:(a:string)=>void}) {
  const q=s.questions[s.index] as LegacyQuestion;return <><span className="task-label">選擇正確的大小符號</span><h2 className="compare-equation"><span>{signed(q.a)}</span><span className="missing">{s.solved?relation(q):'?'}</span><span>{signed(q.b)}</span></h2><div className="answer-options">{['>','<','='].map(a=><Button className="block-btn choice symbol" key={a} disabled={s.solved} onClick={()=>answer(a)} aria-label={a==='>'?'大於':a==='<'?'小於':'等於'}>{a}</Button>)}</div>{s.stageErrors>0&&<div className="support-line"><p>越右的數越大；同一位置的數相等。</p><NumberLine marks={[q.a,q.b]}/></div>}</>;
}
function Move({s,answer}:{s:Session;answer:(a:string)=>void}) {
  const q=s.questions[s.index] as LegacyQuestion; const direction=delta(q)<0?'左':'右';
  return <><span className="task-label">從 {plain(q.a)} 出發，完成這次移動</span><h2 className="task-title math">{expression(q)} = {s.solved?plain(result(q)):'?'}</h2><ol className="steps">{['選方向','選步數','找終點'].map((t,i)=><li key={t} className={s.stage===i&&!s.solved?'active':s.stage>i||s.solved?'complete':''}><span>{s.stage>i||s.solved?'✓':i+1}</span>{t}{i===0&&s.stage>0?`：向${direction}`:i===1&&s.stage>1?`：${Math.abs(q.b)} 格`:''}</li>)}</ol><NumberLine marks={s.solved?[q.a,result(q)]:[q.a]} cursor={s.solved?result(q):q.a} onPick={s.stage===2&&!s.solved?n=>answer(String(n)):undefined}/><div className="step-action">{s.stage===0?<><p>第一步：應該往哪個方向？</p><div className="answer-options"><Button className="block-btn choice" onClick={()=>answer('left')}><ArrowLeft/>向左</Button><Button className="block-btn choice" onClick={()=>answer('right')}>向右<ArrowRight/></Button></div></>:s.stage===1?<><p>第二步：應該移動多少格？</p><div className="step-counts">{Array.from({length:10},(_,i)=>i+1).map(n=><Button key={n} className="block-btn choice" onClick={()=>answer(String(n))}>{n}</Button>)}</div></>:<p>{s.solved?`從 ${plain(q.a)} 向${direction}移 ${Math.abs(q.b)} 格，到達 ${plain(result(q))}。`:'第三步：點選數線上的終點。'}</p>}</div></>;
}
function BracketGame({s,answer}:{s:Session;answer:(a:string)=>void}) {
  const q=s.questions[s.index] as LegacyQuestion;return <><span className="task-label">{s.index<5?'基礎：兩項計算':s.index<10?'進階：由負數開始':'挑戰：三項計算'}</span><h2 className="task-title math">{expression(q)}</h2><ol className="steps compact">{['拆括號','計算答案'].map((t,i)=><li key={t} className={s.stage===i&&!s.solved?'active':s.stage>i||s.solved?'complete':''}><span>{s.stage>i||s.solved?'✓':i+1}</span>{t}</li>)}</ol>{s.stage===0?<><p className="task-instruction">哪一個式子與上面的式子相等？</p><div className={`answer-options ${q.third?'three-term-options':''}`}>{simplificationChoices(q).map(option=><Button className="block-btn choice math" key={option.value} onClick={()=>answer(option.value)}>{option.label}</Button>)}</div></>:<div className="calculation"><div className="working"><span><Check/>已正確拆括號</span><p className="math">{simplified(q)} = {s.solved?plain(result(q)):'?'}</p></div>{!s.solved&&<NumericAnswer key={s.index} onAnswer={answer} disabled={s.solved}/>}</div>}</>;
}
function SignedGame({s,answer,next}:{s:Session;answer:(a:string)=>void;next:()=>void}) {
  const q=s.questions[s.index] as SignedQuestion;const symbol=q.operation==='multiply'?'×':'÷';
  const operand=(n:number)=>`(${signed(n)})`;
  const equation=q.display==='fraction'?<span className="fraction-equation"><span className="fraction"><span>{operand(q.values[0])}</span><span>{operand(q.values[1])}</span></span>{q.values[2]!==undefined&&<> ÷ {operand(q.values[2])}</>}</span>:<>{q.values.map((n,i)=><span key={i}>{i>0&&` ${symbol} `}{operand(n)}</span>)}</>;
  return <><span className="task-label">{q.values.length===2?'兩數運算':'三數運算'}</span><h2 className="task-title math signed-equation">{equation} = {s.solved?plain(result(q)):'?'}</h2><ol className="steps compact">{['判斷正負號','計算完整答案'].map((t,i)=><li key={t} className={s.stage===i&&!s.solved?'active':s.stage>i||s.solved?'complete':''}><span>{s.stage>i||s.solved?'✓':i+1}</span>{t}</li>)}</ol>{s.stage===0?<><p className="task-instruction">運算結果是正數還是負數？</p><div className="answer-options"><Button className="block-btn choice" onClick={()=>answer('positive')}>正數</Button><Button className="block-btn choice" onClick={()=>answer('negative')}>負數</Button></div></>:<div className="signed-answer-row"><NumericAnswer key={s.index} onAnswer={answer} disabled={s.solved} max={100}/>{s.solved&&<Button className="block-btn signed-next" onClick={next}>{s.index===s.questions.length-1?'查看本次結果':'下一個任務'}<ArrowRight/></Button>}</div>}</>;
}
function MixedGame({s,answer,next}:{s:Session;answer:(a:string)=>void;next:()=>void}) {
  const q=s.questions[s.index] as MixedQuestion;const step=q.steps[Math.floor(s.stage/2)];
  const display=(text:string)=>text.replace(/([+−×÷]) ([+−]\d+)/g,'$1 ($2)');
  const renderMath=(text:string):React.ReactNode=>{const marker=' ÷ ',at=text.indexOf(marker);if(at<0)return display(text);const left=text.slice(0,at),right=text.slice(at+marker.length);let start=left.lastIndexOf(' ')+1;if(left.endsWith(')')){let depth=0;for(let i=left.length-1;i>=0;i--){if(left[i]===')')depth++;if(left[i]==='(')depth--;if(depth===0){start=i;break}}}const end=right.indexOf(' '),denominator=end<0?right:right.slice(0,end),suffix=end<0?'':right.slice(end);const numerator=left.slice(start),prefix=left.slice(0,start);const part=(value:string)=>/^[+−]\d+$/.test(value)?`(${value})`:value;return <>{display(prefix)}<span className="fraction mixed-fraction"><span>{part(numerator)}</span><span>{part(denominator)}</span></span>{renderMath(suffix)}</>};
  return <><span className="task-label">{q.level===0?'基礎：先乘除後加減':q.level===1?'進階：一層括號':'挑戰：多層括號'}</span><h2 className="task-title math mixed-equation">{renderMath(step.display)}{s.solved?` = ${plain(q.answer)}`:''}</h2><p className="task-instruction">第 {Math.floor(s.stage/2)+1} 步：{s.stage%2===0?'選出下一個應計算的部分。':'輸入所選部分的計算結果。'}</p>{s.stage%2===0?<div className="answer-options mixed-options">{step.choices.map(choice=><Button className="block-btn choice math" key={choice} onClick={()=>answer(choice)}>{renderMath(choice)}</Button>)}</div>:<div className="calculation mixed-calculation"><div className="working"><span><Check/>已選擇下一步</span><p className="math">{renderMath(step.target)} = ?</p></div><NumericAnswer key={`${s.index}-${s.stage}`} onAnswer={answer} disabled={s.solved} max={100}/>{s.solved&&<Button className="block-btn signed-next" onClick={next}>{s.index===s.questions.length-1?'查看本次結果':'下一個任務'}<ArrowRight/></Button>}</div>}</>;
}
export default function GameBoard({session,answer,next}:{session:Session;answer:(a:string)=>void;next:()=>void}) {
  const props={s:session,answer};
  return <><div className="question-content">{session.game==='locate'?<Locate {...props}/>:session.game==='compare'?<Compare {...props}/>:session.game==='move'?<Move {...props}/>:session.game==='brackets'?<BracketGame {...props}/>:session.game==='mixed'?<MixedGame {...props} next={next}/>:<SignedGame {...props} next={next}/>}</div><div className={`feedback ${session.solved?'success':session.stageErrors?'hint':''}`} role="status" aria-live="polite">{session.feedback?<>{session.solved?<Check/>:session.stageErrors?<Lightbulb/>:<Check/>}<span>{session.feedback}</span></>:<span>慢慢想，準備好再作答。</span>}</div></>;
}
