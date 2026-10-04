'use client';
import { memo, useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import type { Question, Session } from '@/lib/game';

const superscriptCharacters:Record<string,string>={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','ⁿ':'n','⁺':'+','⁻':'-'};
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
function toLatex(value:string):string{
 const mixed=/^(\d+) ＋ (\d+) ÷ (\d+)$/.exec(value);
 if(mixed)return `${mixed[1]}\\frac{${mixed[2]}}{${mixed[3]}}`;
 const division=value.indexOf('÷');
 if(division>=0){
  const numerator=stripOuterBrackets(value.slice(0,division).trim());
  const denominator=stripOuterBrackets(value.slice(division+1).trim());
  return `\\frac{${toLatex(numerator)}}{${toLatex(denominator)}}`;
 }
 const normalized=value.replace(/\^([0-9]+|n(?:[+-][0-9]+)?)/g,'^{$1}').replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+/g,match=>`^{${match.split('').map(character=>superscriptCharacters[character]).join('')}}`);
 return normalized.replace(/%/g,'\\%').replace(/\$/g,'\\$').replace(/×/g,'\\times ').replace(/＋/g,'+').replace(/−/g,'-').replace(/　/g,'\\quad ');
}
function mixedText(value:string){
 const segments=value.split(/(\^[−-]?(?:[0-9]+|n(?:[+-][0-9]+)?)|[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+)/g);
 return segments.map((segment,index)=>segment.startsWith('^')||/^[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+$/.test(segment)
  ? <sup className="latex-sup" key={index}>{segment.startsWith('^')?segment.slice(1).replace('-', '−'):segment.split('').map(character=>superscriptCharacters[character]).join('')}</sup>
  : segment);
}

export const MathText = memo(function MathText({children}:{children:string}):React.ReactNode{
 if(/[\u3400-\u9fff]/.test(children))return <>{mixedText(children)}</>;
 const html=katex.renderToString(toLatex(children),{throwOnError:false,displayMode:false});
 return <span className="latex-expression" aria-label={children} dangerouslySetInnerHTML={{__html:html}}/>;
});

function NumericAnswer({question,onAnswer,disabled}:{question:Question;onAnswer:(value:string)=>void;disabled:boolean}){
 const [value,setValue]=useState('');
 const inputPattern=question.decimal?/^\d{0,4}(?:\.\d{0,2})?$/:/^\d{0,4}$/;
 const valid=question.decimal?/^\d{1,4}(?:\.\d{1,2})?$/.test(value):/^\d{1,4}$/.test(value);
 const add=(key:string)=>setValue(current=>{const next=key==='back'?current.slice(0,-1):key==='clear'?'':current+key;return inputPattern.test(next)?next:current});
 const keys=['1','2','3','4','5','6','7','8','9',question.decimal?'.':'clear','0','back'];
 return <form className="numeric-answer" onSubmit={event=>{event.preventDefault();if(valid&&!disabled)onAnswer(value)}}>
  <label htmlFor="numeric-answer">你的答案{question.unit?`（${question.unit}）`:''}</label><div className="percentage-input"><input id="numeric-answer" value={value} inputMode={question.decimal?'decimal':'numeric'} autoComplete="off" placeholder="輸入答案" disabled={disabled} onChange={event=>{if(inputPattern.test(event.target.value))setValue(event.target.value)}}/>{question.unit&&<span className="answer-unit">{question.unit}</span>}</div>
  <div className="keypad">{keys.map(key=><Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key==='back'?'刪除一位':key==='clear'?'清除答案':key==='.'?'小數點':key} onClick={()=>add(key)}>{key==='back'?'⌫':key==='clear'?'清除':key}</Button>)}</div>
  <Button className="block-btn" type="submit" disabled={!valid||disabled}>檢查答案 <Check/></Button>
 </form>;
}

export default function GameBoard({session,answer,skip}:{session:Session;answer:(value:string)=>void;skip:()=>void}){
 const question=session.questions[session.index],phase=session.index<5?'基礎':session.index<10?'核心':'綜合';
 return <><div className="question-content"><span className="task-label">{phase}：{question.expression?question.prompt:'百分法生活應用'}</span>{question.expression?<h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2>:<h2 className="task-title percentage-story">{question.prompt}</h2>}<p className="task-instruction">{question.instruction}</p>{question.kind==='numeric'?<NumericAnswer key={session.index} question={question} onAnswer={answer} disabled={session.solved}/>:<div className="answer-options algebra-options">{question.choices?.map(choice=><Button className="block-btn choice math" key={choice.value} disabled={session.solved} onClick={()=>answer(choice.value)}><MathText>{choice.label}</MathText></Button>)}</div>}</div><output className={`feedback ${session.solved?'success':session.stageErrors?'hint':''}`} aria-live="polite">{session.feedback?<>{session.solved?<Check/>:<Lightbulb/>}<span>{session.feedback}</span></>:<span>慢慢想，準備好再作答。</span>}</output>{session.index>=10&&!session.solved&&<div className="give-up-wrap"><Button variant="ghost" className="give-up" title="放棄本題，不會增加錯答次數，但本題不會得分" onClick={skip}>放棄本題</Button></div>}</>;
}
