'use client';
import { useMemo, useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GeometryDiagram, { ShapeIcon } from '@/components/geometry-diagram';
import { canSkip, shapeChoices, type CrossSectionQuestion, type NumericQuestion, type Session, type ShapeName } from '@/lib/game';

function NumericAnswer({ question, onAnswer, disabled }: { question: NumericQuestion; onAnswer: (value: string) => void; disabled: boolean }) {
  const [value, setValue] = useState('');
  const add = (key: string) => setValue(current => key === 'back' ? current.slice(0, -1) : current.length < 4 ? current + key : current);
  const valid = /^\d{1,4}$/.test(value) && Number(value) <= 9999;
  return <form className="numeric-answer geometry-answer" onSubmit={event => { event.preventDefault(); if (valid && !disabled) onAnswer(String(Number(value))); }}>
    <label htmlFor="numeric-answer">你的答案</label>
    <div className="answer-with-unit"><input id="numeric-answer" value={value} inputMode="numeric" autoComplete="off" placeholder="輸入數值" disabled={disabled} onChange={event => /^\d{0,4}$/.test(event.target.value) && setValue(event.target.value)} /><strong>{question.unit}</strong></div>
    <div className="keypad">{['1','2','3','4','5','6','7','8','9','0','back'].map(key => <Button className="key" key={key} type="button" variant="secondary" disabled={disabled} aria-label={key === 'back' ? '刪除一位' : key} onClick={() => add(key)}>{key === 'back' ? '⌫' : key}</Button>)}</div>
    <Button className="block-btn" type="submit" disabled={!valid || disabled}>檢查答案 <Check /></Button>
  </form>;
}

function CrossSectionAnswer({ question, session, answer }: { question: CrossSectionQuestion; session: Session; answer: (value: string) => void }) {
  const choices = useMemo(() => shapeChoices(question.shape), [question]);
  if (!question.directShape && session.stage === 0) return <div className="answer-options"><Button className="block-btn choice" disabled={session.solved} onClick={() => answer('yes')}>有均勻截面</Button><Button className="block-btn choice" disabled={session.solved} onClick={() => answer('no')}>沒有均勻截面</Button></div>;
  return <div className="answer-options shape-options">{choices.map(choice => <Button className="block-btn choice shape-choice" key={choice.value} disabled={session.solved} onClick={() => answer(choice.value)}><ShapeIcon shape={choice.value as ShapeName} /><span>{choice.label}</span></Button>)}</div>;
}

function levelLabel(session: Session) {
  const question = session.questions[session.index];
  if (session.game === 'uniform-cross-section') return question.level === 'basic' ? '基礎' : '核心';
  return question.level === 'basic' ? '基礎' : question.level === 'core' ? '核心' : '綜合';
}

export default function GameBoard({ session, answer, skip }: { session: Session; answer: (value: string) => void; skip: () => void }) {
  const question = session.questions[session.index];
  return <>
    <div className="question-content geometry-question">
      <span className="task-label">{levelLabel(session)}：{question.prompt}</span>
      <GeometryDiagram diagram={question.diagram} showHint={session.stageErrors > 0} />
      {question.kind === 'numeric' ? <NumericAnswer key={session.index} question={question} onAnswer={answer} disabled={session.solved} /> : <CrossSectionAnswer question={question} session={session} answer={answer} />}
    </div>
    <output className={`feedback ${session.solved ? 'success' : session.stageErrors ? 'hint' : ''}`} aria-live="polite">{session.feedback ? <>{session.solved || session.stage > 0 ? <Check /> : <Lightbulb />}<span>{session.feedback}</span></> : <span>慢慢觀察圖形，準備好再作答。</span>}</output>
    {canSkip(session) && <div className="give-up-wrap"><Button variant="ghost" className="give-up" title="放棄本題，不會增加錯答次數，但本題不會得分" onClick={skip}>放棄本題</Button></div>}
  </>;
}
