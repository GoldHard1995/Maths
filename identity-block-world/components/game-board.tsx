'use client';
import { memo, useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { Button } from '@/components/ui/button';
import { parseExpression, type Variable } from '@/lib/algebra';
import { toLatex } from '@/lib/math';
import type { Session } from '@/lib/game';

export const MathText = memo(function MathText({ children }: { children: string }): React.ReactNode {
  const html = katex.renderToString(toLatex(children), { throwOnError: false, displayMode: false });
  return <span className="latex-expression" dangerouslySetInnerHTML={{ __html: html }} />;
});

function NumericAnswer({ onAnswer, disabled }: { onAnswer: (value: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  const add = (key: string) => setValue(current => key === 'back' ? current.slice(0, -1) : key === 'sign' ? current.startsWith('-') ? current.slice(1) : '-' + current : current.replace('-', '').length < 4 ? current + key : current);
  const number = Number(value), valid = /^-?\d{1,4}$/.test(value) && number >= -1000 && number <= 1000;
  return <form className="numeric-answer" onSubmit={event => { event.preventDefault(); if (valid && !disabled) onAnswer(String(number)); }}>
    <label htmlFor="numeric-answer">你的答案</label><input id="numeric-answer" value={value} inputMode="text" autoComplete="off" placeholder="輸入答案" disabled={disabled} onChange={event => { if (/^-?\d{0,4}$/.test(event.target.value)) setValue(event.target.value); }} />
    <div className="keypad">{['1', '2', '3', '4', '5', '6', '7', '8', '9', 'sign', '0', 'back'].map(key => <Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key === 'sign' ? '切換正負號' : key === 'back' ? '刪除一位' : key} onClick={() => add(key)}>{key === 'sign' ? '±' : key === 'back' ? '⌫' : key}</Button>)}</div>
    <Button className="block-btn" type="submit" disabled={!valid || disabled}>檢查答案 <Check /></Button>
  </form>;
}

function AlgebraKeyboard({ usedVariables, onAnswer, disabled }: { usedVariables: Variable[]; onAnswer: (value: string) => void; disabled: boolean }) {
  const [tokens, setTokens] = useState<string[]>([]), value = tokens.join(''), parsed = parseExpression(value);
  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0', ...usedVariables, '²', '＋', '−', '×', '(', ')', 'back'];
  const add = (key: string) => setTokens(current => key === 'back' ? current.slice(0, -1) : value.length < 120 ? [...current, key] : current);
  return <form className="algebra-answer" onSubmit={event => { event.preventDefault(); if (value && !disabled) onAnswer(value); }}>
    <div id="algebra-answer-label" className="answer-label">你的代數式</div>
    <div className="answer-preview math" aria-labelledby="algebra-answer-label" aria-live="polite">{value ? <MathText>{value}</MathText> : <span className="answer-placeholder">使用下方鍵盤輸入</span>}</div>
    <div className="algebra-keypad">{keys.map(key => <Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key === 'back' ? '刪除上一個符號' : key} onClick={() => add(key)}>{key === 'back' ? '⌫' : key}</Button>)}</div>
    <p className="input-help" aria-live="polite">{value && !parsed.ok ? parsed.message : '\u00a0'}</p>
    <Button className="block-btn" type="submit" disabled={!value || disabled}>檢查答案 <Check /></Button>
  </form>;
}

export default function GameBoard({ session, answer, skip }: { session: Session; answer: (value: string) => void; skip: () => void }) {
  const question = session.questions[session.index];
  return <><div className="question-content">
    <span className="task-label">{session.index < 5 ? '基礎' : session.index < 10 ? '核心' : '綜合'}：{question.prompt}</span>
    <h2 className="task-title math algebra-equation"><MathText>{question.expression}</MathText></h2>
    <p className="task-instruction">{question.instruction}</p>
    {question.kind === 'numeric' ? <NumericAnswer onAnswer={answer} disabled={session.solved} /> : question.kind === 'algebra' && question.direct ? <AlgebraKeyboard usedVariables={question.usedVariables} onAnswer={answer} disabled={session.solved} /> : <div className="answer-options algebra-options">{question.choices?.map(choice => <Button className={`block-btn choice ${choice.math ? 'math' : 'text-choice'}`} key={choice.value} disabled={session.solved} onClick={() => answer(choice.value)}>{choice.math ? <MathText>{choice.label}</MathText> : choice.label}</Button>)}</div>}
  </div><output className={`feedback ${session.solved ? 'success' : session.stageErrors ? 'hint' : ''}`} aria-live="polite">{session.feedback ? <>{session.solved ? <Check /> : <Lightbulb />}<span>{session.feedback}</span></> : <span>慢慢想，準備好再作答。</span>}</output>
    {session.index >= 10 && !session.solved && <div className="give-up-wrap"><Button variant="ghost" className="give-up" title="放棄本題，不會增加錯答次數，但本題不會得分" onClick={skip}>放棄本題</Button></div>}
  </>;
}
