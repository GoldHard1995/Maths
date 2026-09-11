'use client';
import { useEffect, useReducer, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import {
  ArrowLeft,
  ArrowRight,
  BetweenHorizontalEnd,
  Brackets,
  Check,
  Clock3,
  Equal,
  FilePenLine,
  House,
  Parentheses,
  Route,
  RotateCcw,
  Scale,
  Trophy,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GameBoard, { MathText } from '@/components/game-board';
import LeaderboardPanel from '@/components/leaderboard-panel';
import ScoreUpload from '@/components/score-upload';
import {
  elapsedSeconds,
  gameIds,
  makeQuestions,
  reducer,
  score,
  startSession,
  type GameId,
  type Question,
} from '@/lib/game';
import { hubUrl, leaderboardUrl, type ClassName } from '@/lib/leaderboard';

const games = [
  {
    title: '簡易方程',
    label: '平衡解題',
    text: '由一步開始，逐步解開整數方程。',
    sample: '3x ＋ 5 = 20',
    icon: Scale,
    color: 'green',
  },
  {
    title: '含同類項的方程',
    label: '整理同類項',
    text: '先合併未知數項和常數項。',
    sample: '2x ＋ 3x − 4 = 11',
    icon: BetweenHorizontalEnd,
    color: 'blue',
  },
  {
    title: '含括號的方程',
    label: '拆開括號',
    text: '運用分配律，處理最多兩層括號。',
    sample: '2(3x ＋ 1) = 20',
    icon: Parentheses,
    color: 'amber',
  },
  {
    title: '含分數的方程',
    label: '消去分母',
    text: '利用最小公倍數或交叉相乘。',
    sample: <MathText>x ÷ 3 ＋ 1 ÷ 2 = 5</MathText>,
    icon: Brackets,
    color: 'purple',
  },
  {
    title: '建立方程',
    label: '找出相等關係',
    text: '由文字和情境建立一元一次方程。',
    sample: 'x ＋ (x ＋ 1) = 25',
    icon: FilePenLine,
    color: 'red',
  },
  {
    title: '方程應用',
    label: '解決生活問題',
    text: '建立方程、求解，再寫出適當單位。',
    sample: '60x ＋ 80x = 280',
    icon: Route,
    color: 'cyan',
  },
] as const;

export default function Home() {
  const [session, dispatch] = useReducer(reducer, null),
    [now, setNow] = useState(0),
    [uploaded, setUploaded] = useState(false),
    [showLeaderboard, setShowLeaderboard] = useState(false),
    [lastStudent, setLastStudent] = useState<{
      className: ClassName;
      studentNo: number;
    }>();
  const previous = useRef<Partial<Record<GameId, Question[]>>>({}),
    connected = Boolean(leaderboardUrl);
  const start = (game: GameId) => {
    const questions = makeQuestions(game, previous.current[game]);
    previous.current[game] = questions;
    const next = startSession(game, questions);
    setUploaded(false);
    setShowLeaderboard(false);
    setNow(next.startedAt);
    dispatch({ type: 'start', session: next });
  };
  const goHome = () => {
    if (session?.finished && connected && !uploaded) return;
    dispatch({ type: 'home' });
    setShowLeaderboard(false);
  };
  useEffect(() => {
    if (!session || session.finished) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [session]);
  useEffect(() => {
    type Tool = {
      name: string;
      description: string;
      inputSchema: object;
      annotations: object;
      execute: (input: unknown) => unknown;
    };
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: Tool,
            options: { signal: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const controller = new AbortController();
    try {
      void Promise.resolve(
        context.registerTool(
          {
            name: 'start_linear_equation_game',
            description: 'Start a new Form 1 linear-equation practice game.',
            inputSchema: {
              type: 'object',
              properties: { game: { type: 'string', enum: gameIds } },
              required: ['game'],
              additionalProperties: false,
            },
            annotations: { readOnlyHint: false, untrustedContentHint: false },
            execute(input: unknown) {
              if (
                !input ||
                typeof input !== 'object' ||
                !('game' in input) ||
                !gameIds.includes(input.game as GameId) ||
                Object.keys(input).length !== 1
              )
                throw new Error(`Choose one of: ${gameIds.join(', ')}.`);
              const game = input.game as GameId;
              flushSync(() => start(game));
              return { game, question: 1, totalQuestions: 15 };
            },
          },
          { signal: controller.signal },
        ),
      ).catch(() => undefined);
    } catch {}
    return () => controller.abort();
  }, []);
  const active = session ? games[gameIds.indexOf(session.game)] : null,
    elapsed = session ? elapsedSeconds(session, now) : 0,
    time = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`;
  return (
    <main className={`world ${session || showLeaderboard ? 'playing' : ''}`}>
      <header className="topbar">
        <a className="hub-home" href={hubUrl}>
          <House />
          返回主畫面
        </a>
        <button
          className="brand"
          disabled={Boolean(session?.finished && connected && !uploaded)}
          onClick={goHome}
        >
          <span className="brand-icon">
            <Equal />
          </span>
          方程方塊世界
        </button>
        <span className="top-note">中一數學 · 一元一次方程</span>
      </header>
      {showLeaderboard && !session ? (
        <LeaderboardPanel
          onClose={() => setShowLeaderboard(false)}
          student={lastStudent}
        />
      ) : !session ? (
        <section className="menu">
          <div className="menu-heading">
            <span className="eyebrow">準備好，出發探索！</span>
            <h1>
              選一個世界，
              <br />
              開始你的數學冒險。
            </h1>
            <p>六個小遊戲，自由選擇，掌握一元一次方程。</p>
            <Button
              className="block-btn leaderboard-button"
              onClick={() => setShowLeaderboard(true)}
            >
              <Trophy />
              查看排行榜
            </Button>
          </div>
          <div className="game-grid">
            {games.map((game, index) => (
              <Button
                key={game.title}
                className={`game-card ${game.color}`}
                onClick={() => start(gameIds[index])}
              >
                <span className="card-top">
                  <span className="game-icon">
                    <game.icon />
                  </span>
                  <span className="game-number">0{index + 1}</span>
                </span>
                <span className="card-label">{game.label}</span>
                <h2>{game.title}</h2>
                <span className="card-copy">{game.text}</span>
                <span className="sample">{game.sample}</span>
                <span className="card-bottom">
                  <span>
                    <Clock3 />約 10 分鐘
                  </span>
                  <span>
                    進入遊戲 <ArrowRight />
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <footer className="menu-footer">
            <span>自由選關 · 隨時重玩</span>
          </footer>
        </section>
      ) : (
        <section className={`play-area ${active?.color}`}>
          <div className="play-nav">
            <Button
              variant="secondary"
              className="block-btn secondary"
              disabled={Boolean(session.finished && connected && !uploaded)}
              onClick={goHome}
            >
              <ArrowLeft />
              返回選關
            </Button>
            <div className="play-name">
              {active && <active.icon />}
              <h1>{active?.title}</h1>
            </div>
            <span className="elapsed">
              <Clock3 />
              已練習 {time}
            </span>
          </div>
          {session.finished ? (
            <div className="game-panel finish">
              <div className="finish-check">
                <Check />
              </div>
              <span className="task-label">這次探索完成了</span>
              <h2>每一步，都更有把握。</h2>
              <p>
                你完成了「{active?.title}」的全部 {session.questions.length}{' '}
                個任務。
              </p>
              <div className="final-score">
                <span>本次得分</span>
                <strong>
                  {score(session)}
                  <small> / {session.questions.length * 10} 分</small>
                </strong>
              </div>
              <div className="result-grid">
                <div>
                  <strong>{session.firstTry}</strong>
                  <span>首次作答全對</span>
                </div>
                <div>
                  <strong>
                    {session.questions.length - session.firstTry - session.skipped}
                  </strong>
                  <span>練習後答對</span>
                </div>
                <div>
                  <strong>{time}</strong>
                  <span>遊戲時間</span>
                </div>
              </div>
              <p className="result-note">
                每題首次全對 10 分，重試後完成 5 分；放棄 {session.skipped}{' '}
                題不計分。
              </p>
              <ScoreUpload
                gameId={session.game}
                score={score(session)}
                maxScore={session.questions.length * 10}
                elapsedSeconds={elapsed}
                questionCount={session.questions.length}
                firstTryCorrect={session.firstTry}
                skippedQuestions={session.skipped}
                longestFirstTryStreak={session.longestFirstTryStreak}
                wrongAttempts={session.errors}
                onUploaded={(identity) => {
                  setUploaded(true);
                  setLastStudent(identity);
                }}
              />
              <div className="answer-options">
                <Button
                  className="block-btn"
                  disabled={connected && !uploaded}
                  onClick={() => start(session.game)}
                >
                  <RotateCcw />
                  再玩一次
                </Button>
                <Button
                  className="block-btn secondary"
                  variant="secondary"
                  disabled={connected && !uploaded}
                  onClick={goHome}
                >
                  選其他遊戲
                  <ArrowRight />
                </Button>
              </div>
            </div>
          ) : (
            <div className="game-panel">
              <div className="round-top">
                <span>
                  任務 <b>{String(session.index + 1).padStart(2, '0')}</b> /{' '}
                  {session.questions.length}
                </span>
                <span className="live-score">
                  得分 <b>{score(session)}</b> / {session.questions.length * 10}
                </span>
                <span>5 基礎 · 5 核心 · 5 綜合</span>
              </div>
              <Progress
                aria-label="本局已完成任務"
                value={
                  ((session.index + (session.solved ? 1 : 0)) /
                    session.questions.length) *
                  100
                }
              />
              <GameBoard
                key={`${session.game}-${session.startedAt}-${session.index}`}
                session={session}
                answer={(value) => dispatch({ type: 'answer', value })}
                skip={() => dispatch({ type: 'skip' })}
              />
              <div className="round-bottom">
                {elapsed >= 600 && (
                  <span>已練習 10 分鐘，你可以繼續或返回選關。</span>
                )}
                {session.solved && (
                  <Button
                    className="block-btn"
                    onClick={() => dispatch({ type: 'next' })}
                  >
                    {session.index === session.questions.length - 1
                      ? '查看本次結果'
                      : '下一個任務'}
                    <ArrowRight />
                  </Button>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </main>
  );
}
