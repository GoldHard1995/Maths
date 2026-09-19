'use client';
import { useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { parseExpression, type Variable } from '@/lib/algebra';
import type { AlgebraQuestion, NumericQuestion, Session } from '@/lib/game';

const superscriptCharacters:Record<string,string>={'⁰':'0','¹':'1','²':'2','³':'3','⁴':'4','⁵':'5','⁶':'6','⁷':'7','⁸':'8','⁹':'9','ⁿ':'n','⁺':'+','⁻':'-'};
function toLatex(value:string){
 const normalized=value.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁺⁻]+/g,match=>`^{${[...match].map(character=>superscriptCharacters[character]).join('')}}`);
 return normalized.replace(/×/g,'\\times ').replace(/÷/g,'\\div ').replace(/＋/g,'+').replace(/−/g,'-').replace(/　/g,'\\quad ');
}

export function MathText({children}:{children:string}):React.ReactNode{
 const html=katex.renderToString(toLatex(children),{throwOnError:false,displayMode:false});
 return <span className="latex-expression" aria-label={children} dangerouslySetInnerHTML={{__html:html}}/>;
}

function NumericAnswer({onAnswer,disabled}:{onAnswer:(value:string)=>void;disabled:boolean}){
 const [value,setValue]=useState('');
 const add=(key:string)=>setValue(current=>key==='back'?current.slice(0,-1):key==='sign'?(current.startsWith('-')?current.slice(1):'-'+current):current.replace('-','').length<3?current+key:current);
 const number=Number(value),valid=/^-?\d{1,3}$/.test(value)&&number>=-100&&number<=100;
 return <form className="numeric-answer" onSubmit={event=>{event.preventDefault();if(valid&&!disabled)onAnswer(String(number));}}>
  <label htmlFor="numeric-answer">你的答案</label><input id="numeric-answer" value={value} inputMode="text" autoComplete="off" placeholder="輸入答案" disabled={disabled} onChange={event=>{if(/^-?\d{0,3}$/.test(event.target.value))setValue(event.target.value)}}/>
  <div className="keypad">{['1','2','3','4','5','6','7','8','9','sign','0','back'].map(key=><Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key==='sign'?'切換正負號':key==='back'?'刪除一位':key} onClick={()=>add(key)}>{key==='sign'?'±':key==='back'?'⌫':key}</Button>)}</div>
  <Button className="block-btn" type="submit" disabled={!valid||disabled}>檢查答案 <Check/></Button>
 </form>;
}

function AlgebraKeyboard({usedVariables,onAnswer,disabled}:{usedVariables:Variable[];onAnswer:(value:string)=>void;disabled:boolean}){
 const [value,setValue]=useState('');
 const keys=['1','2','3','4','5','6','7','8','9','0',...usedVariables,'²','³','⁴','⁵','⁶','⁷','⁸','⁹','＋','−','×','÷','(',')','back'];
 const add=(key:string)=>setValue(current=>key==='back'?current.slice(0,-1):current.length<42?current+key:current);
 const parsed=parseExpression(value),ready=parsed.ok;
 return <form className="algebra-answer" onSubmit={event=>{event.preventDefault();if(value&&!disabled)onAnswer(value)}}>
  <label htmlFor="algebra-answer">你的代數式</label><input id="algebra-answer" className="math" value={value} inputMode="text" autoComplete="off" placeholder="使用下方鍵盤輸入" disabled={disabled} onChange={event=>{if(/^[0-9xyab²³⁴⁵⁶⁷⁸⁹+＋\-−×*÷/() ]{0,42}$/.test(event.target.value))setValue(event.target.value)}}/>
  <div className="algebra-keypad">{keys.map(key=><Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key==='back'?'刪除一位':key} onClick={()=>add(key)}>{key==='back'?'⌫':key}</Button>)}</div>
  <p className="input-help" aria-live="polite">{!ready&&value&&!parsed.ok?parsed.message:'\u00a0'}</p>
  <Button className="block-btn" type="submit" disabled={!value||disabled}>檢查答案 <Check/></Button>
 </form>;
}

function AlgebraBoard({question,session,answer}:{question:AlgebraQuestion;session:Session;answer:(value:string)=>void}){
 return <><span className="task-label">{session.index<5?'基礎':session.index<10?'核心':'綜合'}：<MathText>{question.prompt}</MathText></span>{question.expression&&<h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2>}<p className="task-instruction">{question.instruction}</p>{question.direct?<AlgebraKeyboard key={session.index} usedVariables={question.usedVariables} onAnswer={answer} disabled={session.solved}/>:<div className="answer-options algebra-options">{question.choices?.map(choice=><Button className="block-btn choice math" key={choice.value} disabled={session.solved} onClick={()=>answer(choice.value)}><MathText>{choice.label}</MathText></Button>)}</div>}</>;
}

function NumericBoard({question,session,answer}:{question:NumericQuestion;session:Session;answer:(value:string)=>void}){
 return <><span className="task-label">{session.index<5?'基礎':session.index<10?'核心':'綜合'}：<MathText>{question.prompt}</MathText></span><h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2><p className="task-instruction">{question.instruction}</p><NumericAnswer key={session.index} onAnswer={answer} disabled={session.solved}/></>;
}

export default function GameBoard({session,answer,skip}:{session:Session;answer:(value:string)=>void;skip:()=>void}){
 const question=session.questions[session.index];
 return <><div className="question-content">{question.kind==='algebra'?<AlgebraBoard question={question} session={session} answer={answer}/>:<NumericBoard question={question} session={session} answer={answer}/>}</div><output className={`feedback ${session.solved?'success':session.stageErrors?'hint':''}`} aria-live="polite">{session.feedback?<>{session.solved?<Check/>:<Lightbulb/>}<span>{session.feedback}</span></>:<span>慢慢想，準備好再作答。</span>}</output>{session.index>=10&&!session.solved&&<div className="give-up-wrap"><Button variant="ghost" className="give-up" title="放棄本題，不會增加錯答次數，但本題不會得分" onClick={skip}>放棄本題</Button></div>}</>;
}
