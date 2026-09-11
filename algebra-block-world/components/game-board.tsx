'use client';
import { useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseExpression, type Variable } from '@/lib/algebra';
import type { AlgebraQuestion, GuidedQuestion, NumericQuestion, Session } from '@/lib/game';

function stripOuterBrackets(value:string){
 if(!value.startsWith('(')||!value.endsWith(')'))return value;
 let depth=0;
 for(let index=0;index<value.length;index++){
  if(value[index]==='(')depth++;
  if(value[index]===')')depth--;
  if(depth===0&&index<value.length-1)return value;
 }
 return value.slice(1,-1);
}

function binaryOperator(text:string,index:number){
 const value=text[index];
 if(!['+','＋','−','-','×','='].includes(value))return false;
 if(value!=='−'&&value!=='-')return true;
 let previous=index-1;
 while(previous>=0&&text[previous]===' ')previous--;
 return previous>=0&&!['+','＋','−','-','×','÷','=','('].includes(text[previous]);
}

function fractionParts(raw:string){
 const text=raw.replace(/\s*÷\s*/g,' ÷ '),at=text.indexOf(' ÷ ');
 if(at<0)return null;
 const left=text.slice(0,at).trimEnd(),right=text.slice(at+3).trimStart();
 let start=0;
 if(left.endsWith(')')){
  let depth=0;
  for(let index=left.length-1;index>=0;index--){
   if(left[index]===')')depth++;
   if(left[index]==='(')depth--;
   if(depth===0){start=index;break;}
  }
 }else{
  for(let index=left.length-1;index>=0;index--)if(binaryOperator(left,index)){start=index+1;break;}
 }
 while(start<left.length&&left[start]===' ')start++;
 let end=right.length;
 if(right.startsWith('(')){
  let depth=0;
  for(let index=0;index<right.length;index++){
   if(right[index]==='(')depth++;
   if(right[index]===')')depth--;
   if(depth===0){end=index+1;break;}
  }
 }else{
  for(let index=0;index<right.length;index++)if(binaryOperator(right,index)||right[index]==='÷'){end=index;break;}
 }
 return{prefix:left.slice(0,start),numerator:stripOuterBrackets(left.slice(start)),denominator:stripOuterBrackets(right.slice(0,end).trim()),suffix:right.slice(end)};
}

export function MathText({children}:{children:string}):React.ReactNode{
 const parts=fractionParts(children);
 if(!parts)return children;
 return <><MathText>{parts.prefix}</MathText><span className="fraction algebra-fraction"><span><MathText>{parts.numerator}</MathText></span><span><MathText>{parts.denominator}</MathText></span></span><MathText>{parts.suffix}</MathText></>;
}

function NumericAnswer({onAnswer,disabled}:{onAnswer:(value:string)=>void;disabled:boolean}){
 const [value,setValue]=useState('');
 const add=(key:string)=>setValue(current=>key==='back'?current.slice(0,-1):key==='sign'?(current.startsWith('-')?current.slice(1):'-'+current):current.replace('-','').length<3?current+key:current);
 const number=Number(value),valid=/^-?\d{1,3}$/.test(value)&&number>=-50&&number<=100;
 return <form className="numeric-answer" onSubmit={event=>{event.preventDefault();if(valid&&!disabled)onAnswer(String(number));}}>
  <label htmlFor="numeric-answer">你的答案</label><input id="numeric-answer" value={value} inputMode="text" autoComplete="off" placeholder="輸入答案" disabled={disabled} onChange={event=>{if(/^-?\d{0,3}$/.test(event.target.value))setValue(event.target.value)}}/>
  <div className="keypad">{['1','2','3','4','5','6','7','8','9','sign','0','back'].map(key=><Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key==='sign'?'切換正負號':key==='back'?'刪除一位':key} onClick={()=>add(key)}>{key==='sign'?'±':key==='back'?'⌫':key}</Button>)}</div>
  <Button className="block-btn" type="submit" disabled={!valid||disabled}>檢查答案 <Check/></Button>
 </form>;
}

function AlgebraKeyboard({usedVariables,onAnswer,disabled}:{usedVariables:Variable[];onAnswer:(value:string)=>void;disabled:boolean}){
 const [value,setValue]=useState('');
 const keys=['1','2','3','4','5','6','7','8','9','0',...usedVariables,'＋','−','×','÷','(',')','back'];
 const add=(key:string)=>setValue(current=>key==='back'?current.slice(0,-1):current.length<42?current+key:current);
 const parsed=parseExpression(value),ready=parsed.ok;
 return <form className="algebra-answer" onSubmit={event=>{event.preventDefault();if(value&&!disabled)onAnswer(value)}}>
  <label htmlFor="algebra-answer">你的代數式</label><input id="algebra-answer" className="math" value={value} inputMode="text" autoComplete="off" placeholder="使用下方鍵盤輸入" disabled={disabled} onChange={event=>{if(/^[0-9xyab+＋\-−×*÷/() ]{0,42}$/.test(event.target.value))setValue(event.target.value)}}/>
  <div className="algebra-keypad">{keys.map(key=><Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key==='back'?'刪除一位':key} onClick={()=>add(key)}>{key==='back'?'⌫':key}</Button>)}</div>
  {!ready&&value&&<p className="input-help">{parsed.ok?'':parsed.message}</p>}
  <Button className="block-btn" type="submit" disabled={!value||disabled}>檢查答案 <Check/></Button>
 </form>;
}

function AlgebraBoard({question,session,answer}:{question:AlgebraQuestion;session:Session;answer:(value:string)=>void}){
 return <><span className="task-label">{session.index<5?'基礎':session.index<10?'核心':'綜合'}：{question.prompt}</span>{question.expression&&<h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2>}<p className="task-instruction">{question.instruction}</p>{question.direct?<AlgebraKeyboard key={session.index} usedVariables={question.usedVariables} onAnswer={answer} disabled={session.solved}/>:<div className="answer-options algebra-options">{question.choices?.map(choice=><Button className="block-btn choice math" key={choice.value} disabled={session.solved} onClick={()=>answer(choice.value)}><MathText>{choice.label}</MathText></Button>)}</div>}</>;
}

function GuidedBoard({question,session,answer}:{question:GuidedQuestion;session:Session;answer:(value:string)=>void}){
 const step=question.steps[session.stage]??question.steps.at(-1)!;
 return <><span className="task-label">綜合：{question.prompt}</span><h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2><ol className="steps guided-steps">{question.steps.map((_,index)=><li key={index} className={session.stage===index&&!session.solved?'active':session.stage>index||session.solved?'complete':''}><span>{session.stage>index||session.solved?'✓':index+1}</span>第 {index+1} 行</li>)}</ol><p className="task-instruction guided-instruction">{step.instruction}</p><AlgebraKeyboard key={`${session.index}-${session.stage}`} usedVariables={question.usedVariables} onAnswer={answer} disabled={session.solved}/></>;
}

function NumericBoard({question,session,answer}:{question:NumericQuestion;session:Session;answer:(value:string)=>void}){
 return <><span className="task-label">{session.index<5?'基礎':session.index<10?'核心':'綜合'}：<MathText>{question.prompt}</MathText></span><h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2><p className="task-instruction">{question.instruction}</p><NumericAnswer key={session.index} onAnswer={answer} disabled={session.solved}/></>;
}

export default function GameBoard({session,answer,skip}:{session:Session;answer:(value:string)=>void;skip:()=>void}){
 const question=session.questions[session.index];
 return <><div className="question-content">{question.kind==='algebra'?<AlgebraBoard question={question} session={session} answer={answer}/>:question.kind==='guided'?<GuidedBoard question={question} session={session} answer={answer}/>:<NumericBoard question={question} session={session} answer={answer}/>}</div><output className={`feedback ${session.solved?'success':session.stageErrors?'hint':''}`} aria-live="polite">{session.feedback?<>{session.solved?<Check/>:<Lightbulb/>}<span>{session.feedback}</span></>:<span>慢慢想，準備好再作答。</span>}</output>{session.index>=10&&!session.solved&&<div className="give-up-wrap"><Button variant="ghost" className="give-up" title="放棄本題，不會增加錯答次數，但本題不會得分" onClick={skip}>放棄本題</Button></div>}</>;
}
