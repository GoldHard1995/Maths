'use client';
import { useState } from 'react';
import { Delete, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Session } from '@/lib/game';
export default function GameBoard({
  session,
  answer,
  skip,
}: {
  session: Session;
  answer: (v: string) => void;
  skip: () => void;
}) {
  const q = session.questions[session.index],
    active = q.steps?.[session.stage] ?? q,
    [value, setValue] = useState(''),
    send = () => {
      answer(value);
      setValue('');
    };
  return (
    <section className="question-content">
      <span className="task-label">
        {['基礎', '核心', '綜合'][q.level]}任務
        {q.steps ? ` · 第 ${session.stage + 1} 步 / ${q.steps.length} 步` : ''}
      </span>
      <h2 className="task-title">{q.prompt}</h2>
      <div className="task-title math estimation-expression">
        {q.expression}
      </div>
      {q.steps && <p className="guided-instruction">{active.prompt}</p>}
      <p className="task-instruction">{active.instruction}</p>
      {active.choices ? (
        <div
          className={`answer-options estimation-options ${active.choices.length === 6 ? 'six-options' : ''}`}
        >
          {active.choices.map((c) => (
            <Button
              key={c.value}
              className="choice"
              disabled={session.solved}
              onClick={() => answer(c.value)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      ) : (
        <div className="numeric-answer">
          <label>你的答案{active.suffix || ''}</label>
          <input readOnly value={value} placeholder="輸入答案" />
          <div className="keypad">
            {['7', '8', '9', '4', '5', '6', '1', '2', '3', '.', '0'].map(
              (k) => (
                <Button
                  key={k}
                  className="key"
                  onClick={() =>
                    setValue((v) => (k === '.' && v.includes('.') ? v : v + k))
                  }
                >
                  {k}
                </Button>
              ),
            )}
            <Button
              className="key"
              aria-label="刪除一位"
              onClick={() => setValue((v) => v.slice(0, -1))}
            >
              <Delete />
            </Button>
          </div>
          <Button className="block-btn" disabled={!value} onClick={send}>
            確認答案
          </Button>
        </div>
      )}
      <div
        className={`feedback ${session.feedback.includes('答對') ? 'success' : session.feedback ? 'hint' : ''}`}
      >
        <Lightbulb />
        {session.feedback || '仔細辨認位值、捨入方向及有效數字。'}
      </div>
      {q.level === 2 && !session.solved && (
        <div className="give-up-wrap">
          <Button className="give-up" variant="ghost" onClick={skip}>
            放棄本題
          </Button>
        </div>
      )}
    </section>
  );
}
