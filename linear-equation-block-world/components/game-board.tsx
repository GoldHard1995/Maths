'use client';
import { useState } from 'react';
import { Check, Lightbulb } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type {
  ApplicationQuestion,
  EquationQuestion,
  Session,
  SolveQuestion,
} from '@/lib/game';

function binaryOperator(text: string, index: number) {
  const value = text[index];
  if (!['+', '＋', '−', '-', '×', '='].includes(value)) return false;
  if (value !== '−' && value !== '-') return true;
  let previous = index - 1;
  while (previous >= 0 && text[previous] === ' ') previous--;
  return (
    previous >= 0 &&
    !['+', '＋', '−', '-', '×', '÷', '=', '('].includes(text[previous])
  );
}
function stripOuter(value: string) {
  if (!value.startsWith('(') || !value.endsWith(')')) return value;
  let depth = 0;
  for (let i = 0; i < value.length; i++) {
    if (value[i] === '(') depth++;
    if (value[i] === ')') depth--;
    if (depth === 0 && i < value.length - 1) return value;
  }
  return value.slice(1, -1);
}
function fractionParts(raw: string) {
  const text = raw.replace(/\s*÷\s*/g, ' ÷ '),
    at = text.indexOf(' ÷ ');
  if (at < 0) return null;
  const left = text.slice(0, at).trimEnd(),
    right = text.slice(at + 3).trimStart();
  let start = 0,
    end = right.length;
  if (left.endsWith(')')) {
    let depth = 0;
    for (let i = left.length - 1; i >= 0; i--) {
      if (left[i] === ')') depth++;
      if (left[i] === '(') depth--;
      if (depth === 0) {
        start = i;
        break;
      }
    }
  } else
    for (let i = left.length - 1; i >= 0; i--)
      if (binaryOperator(left, i)) {
        start = i + 1;
        break;
      }
  if (right.startsWith('(')) {
    let depth = 0;
    for (let i = 0; i < right.length; i++) {
      if (right[i] === '(') depth++;
      if (right[i] === ')') depth--;
      if (depth === 0) {
        end = i + 1;
        break;
      }
    }
  } else
    for (let i = 0; i < right.length; i++)
      if (binaryOperator(right, i) || right[i] === '÷') {
        end = i;
        break;
      }
  return {
    prefix: left.slice(0, start),
    numerator: stripOuter(left.slice(start)),
    denominator: stripOuter(right.slice(0, end).trim()),
    suffix: right.slice(end),
  };
}
export function MathText({ children }: { children: string }): React.ReactNode {
  const normalized = children
    .replaceAll('-', '−')
    .replace(
      /([＋−])\s*−((?:\d+(?:[xy])?|[xy])(?:\([^()]*\))?)(?=\s|$|[＋−×÷=＝)])/g,
      '$1 (−$2)',
    );
  const p = fractionParts(normalized);
  return p ? (
    <>
      <MathText>{p.prefix}</MathText>
      <span className="fraction algebra-fraction">
        <span>
          <MathText>{p.numerator}</MathText>
        </span>
        <span>
          <MathText>{p.denominator}</MathText>
        </span>
      </span>
      <MathText>{p.suffix}</MathText>
    </>
  ) : (
    normalized
  );
}

function NumericAnswer({
  fraction,
  onAnswer,
  disabled,
}: {
  fraction?: boolean;
  onAnswer: (v: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState('');
  const add = (key: string) =>
    setValue((current) =>
      key === 'back'
        ? current.slice(0, -1)
        : key === 'sign'
          ? current.startsWith('-')
            ? current.slice(1)
            : '-' + current
          : current.length < 8
            ? current + key
            : current,
    );
  const ready = /^-?\d+(\/-?\d+)?$/.test(value) && !value.endsWith('/0');
  const keys = fraction
    ? ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'sign', '0', '/', 'back']
    : ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'sign', '0', 'back'];
  return (
    <form
      className="numeric-answer"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !disabled) onAnswer(value);
      }}
    >
      <label htmlFor="numeric-answer">你的答案</label>
      <input
        id="numeric-answer"
        value={value}
        inputMode="text"
        placeholder={fraction ? '輸入整數或分數' : '輸入答案'}
        disabled={disabled}
        onChange={(e) => {
          if (/^-?\d{0,3}(\/-?\d{0,3})?$/.test(e.target.value))
            setValue(e.target.value);
        }}
      />
      <div className="keypad">
        {keys.map((key) => (
          <Button
            className="key"
            key={key}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => add(key)}
          >
            {key === 'sign' ? '±' : key === 'back' ? '⌫' : key}
          </Button>
        ))}
      </div>
      <Button className="block-btn" type="submit" disabled={!ready || disabled}>
        檢查答案 <Check />
      </Button>
    </form>
  );
}
function EquationKeyboard({
  variable,
  onAnswer,
  disabled,
}: {
  variable: 'x' | 'y';
  onAnswer: (v: string) => void;
  disabled: boolean;
}) {
  const [value, setValue] = useState(''),
    keys = [
      '1',
      '2',
      '3',
      '4',
      '5',
      '6',
      '7',
      '8',
      '9',
      '0',
      variable,
      '＋',
      '−',
      '×',
      '÷',
      '(',
      ')',
      '=',
      'back',
    ],
    add = (key: string) =>
      setValue((current) =>
        key === 'back'
          ? current.slice(0, -1)
          : current.length < 60
            ? current + key
            : current,
      );
  const ready = value.includes('=') && value.split('=').length === 2;
  return (
    <form
      className="algebra-answer"
      onSubmit={(e) => {
        e.preventDefault();
        if (ready && !disabled) onAnswer(value);
      }}
    >
      <label htmlFor="equation-answer">你建立的方程</label>
      <input
        id="equation-answer"
        className="math"
        value={value}
        inputMode="text"
        placeholder="使用下方鍵盤輸入"
        disabled={disabled}
        onChange={(e) => {
          if (/^[0-9xy+＋\-−×*÷/()=＝ ]{0,60}$/.test(e.target.value))
            setValue(e.target.value);
        }}
      />
      <div className="algebra-keypad">
        {keys.map((key) => (
          <Button
            className="key"
            key={key}
            type="button"
            variant="secondary"
            disabled={disabled}
            onClick={() => add(key)}
          >
            {key === 'back' ? '⌫' : key}
          </Button>
        ))}
      </div>
      <Button className="block-btn" type="submit" disabled={!ready || disabled}>
        檢查方程 <Check />
      </Button>
    </form>
  );
}
function EquationAnswer({
  question,
  onAnswer,
  disabled,
}: {
  question: EquationQuestion | ApplicationQuestion;
  onAnswer: (v: string) => void;
  disabled: boolean;
}) {
  return question.direct ? (
    <EquationKeyboard
      variable={question.level === 2 ? 'y' : 'x'}
      onAnswer={onAnswer}
      disabled={disabled}
    />
  ) : (
    <div className="answer-options algebra-options">
      {question.choices?.map((choice) => (
        <Button
          className="block-btn choice math"
          key={choice.value}
          disabled={disabled}
          onClick={() => onAnswer(choice.value)}
        >
          <MathText>{choice.label}</MathText>
        </Button>
      ))}
    </div>
  );
}
function level(index: number) {
  return index < 5 ? '基礎' : index < 10 ? '核心' : '綜合';
}
function SolveBoard({
  question,
  session,
  answer,
}: {
  question: SolveQuestion;
  session: Session;
  answer: (v: string) => void;
}) {
  return (
    <>
      <span className="task-label">
        {level(session.index)}：{question.prompt}
      </span>
      <h2 className="task-title math algebra-equation">
        <MathText>{question.expression}</MathText>
      </h2>
      <p className="task-instruction">輸入 x 的值。</p>
      <NumericAnswer
        fraction={question.fractionInput}
        onAnswer={answer}
        disabled={session.solved}
      />
    </>
  );
}
function EquationBoard({
  question,
  session,
  answer,
}: {
  question: EquationQuestion;
  session: Session;
  answer: (v: string) => void;
}) {
  return (
    <>
      <span className="task-label">{level(session.index)}：建立方程</span>
      <h2 className="task-title word-problem">{question.prompt}</h2>
      <p className="task-instruction">只需建立方程，不用求解。</p>
      <EquationAnswer
        question={question}
        onAnswer={answer}
        disabled={session.solved}
      />
    </>
  );
}
function ApplicationBoard({
  question,
  session,
  answer,
}: {
  question: ApplicationQuestion;
  session: Session;
  answer: (v: string) => void;
}) {
  return (
    <>
      <span className="task-label">{level(session.index)}：方程應用</span>
      <h2 className="task-title word-problem">{question.prompt}</h2>
      <ol className="steps guided-steps">
        {['建立方程', '求出答案', '選擇單位'].map((text, i) => (
          <li
            key={text}
            className={
              session.stage === i && !session.solved
                ? 'active'
                : session.stage > i || session.solved
                  ? 'complete'
                  : ''
            }
          >
            <span>{session.stage > i || session.solved ? '✓' : i + 1}</span>
            {text}
          </li>
        ))}
      </ol>
      {session.stage === 0 ? (
        <EquationAnswer
          question={question}
          onAnswer={answer}
          disabled={session.solved}
        />
      ) : session.stage === 1 ? (
        <>
          <div className="selected-equation">
            <span>你已建立的方程</span>
            <strong className="math">
              <MathText>{session.selectedEquation}</MathText>
            </strong>
          </div>
          <NumericAnswer onAnswer={answer} disabled={session.solved} />
        </>
      ) : (
        <div className="answer-options">
          {question.unitChoices.map((unit) => (
            <Button
              className="block-btn choice"
              key={unit}
              disabled={session.solved}
              onClick={() => answer(unit)}
            >
              {unit}
            </Button>
          ))}
        </div>
      )}
    </>
  );
}
export default function GameBoard({
  session,
  answer,
  skip,
}: {
  session: Session;
  answer: (v: string) => void;
  skip: () => void;
}) {
  const q = session.questions[session.index];
  return (
    <>
      <div className="question-content">
        {q.kind === 'solve' ? (
          <SolveBoard question={q} session={session} answer={answer} />
        ) : q.kind === 'equation' ? (
          <EquationBoard question={q} session={session} answer={answer} />
        ) : (
          <ApplicationBoard question={q} session={session} answer={answer} />
        )}
      </div>
      <output
        className={`feedback ${session.solved ? 'success' : session.stageErrors ? 'hint' : ''}`}
        aria-live="polite"
      >
        {session.feedback ? (
          <>
            {session.solved ? <Check /> : <Lightbulb />}
            <span>{session.feedback}</span>
          </>
        ) : (
          <span>慢慢想，準備好再作答。</span>
        )}
      </output>
      {session.index >= 10 && !session.solved && (
        <div className="give-up-wrap">
          <Button
            variant="ghost"
            className="give-up"
            title="放棄本題，不會增加錯答次數，也不會獲得分數"
            onClick={skip}
          >
            放棄本題
          </Button>
        </div>
      )}
    </>
  );
}
