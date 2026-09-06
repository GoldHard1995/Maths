'use client';
import { useEffect, useReducer, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { ArrowRight, ArrowLeft, Compass, Clock3, MoveHorizontal, Equal, Footprints, Brackets, Check, RotateCcw, Trophy, X, Divide, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import GameBoard from '@/components/game-board';
import LeaderboardPanel from '@/components/leaderboard-panel';
import ScoreUpload from '@/components/score-upload';
import { gameIds, type GameId, reducer, startSession, makeQuestions, type Question, score, elapsedSeconds } from '@/lib/game';
import type { ClassName } from '@/lib/leaderboard';
const games = [
  { title: '數線定位', label: '認識座標', text: '從零出發，找出每個數的位置。', sample: '−4　−3　−2　−1　0　1　2', icon: Compass, color: 'green' },
  { title: '比較大小', label: '分清大小', text: '兩個有向數，誰大誰小？', sample: '−7　<　−3', icon: Equal, color: 'blue' },
  { title: '數線移動', label: '一步一步走', text: '選方向、數步數，再找出終點。', sample: '3 + (−5) → ?', icon: Footprints, color: 'amber' },
  { title: '拆括號與計算', label: '破解符號', text: '先拆括號，再算出正確答案。', sample: '5 − (−3) = ?', icon: Brackets, color: 'purple' },
  { title: '有向數乘法', label: '符號相乘', text: '先判斷正負，再計算乘積。', sample: '(−4) × (+6) = ?', icon: X, color: 'red' },
  { title: '有向數除法', label: '符號相除', text: '判斷符號，完成整除運算。', sample: '(−24) ÷ (−6) = ?', icon: Divide, color: 'cyan' },
  { title: '有向數四則運算', label: '運算次序', text: '選出下一步，逐步完成算式。', sample: '+3 − (−2) × (+4)', icon: Calculator, color: 'orange' },
];
export default function Home() {
  const [session, dispatch] = useReducer(reducer, null);
  const [now, setNow] = useState(0);
  const [uploaded, setUploaded] = useState(false);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [lastStudent, setLastStudent] = useState<{className:ClassName;studentNo:number}>();
  const previousRounds=useRef<Partial<Record<GameId,Question[]>>>({});
  const start = (game: GameId) => {const questions=makeQuestions(game,previousRounds.current[game]);previousRounds.current[game]=questions;const session=startSession(game,questions);setUploaded(false);setShowLeaderboard(false);setNow(session.startedAt);dispatch({type:'start',session});};
  const goHome=()=>{if(session?.finished&&!uploaded)return;dispatch({type:'home'});setShowLeaderboard(false);};
  useEffect(()=>{
    if(!session||session.finished)return;
    const timer=setInterval(()=>setNow(Date.now()),1000);
    return ()=>clearInterval(timer);
  },[session?.startedAt,session?.finished]);
  useEffect(()=>{
    type Tool = {name:string;description:string;inputSchema:object;annotations:object;execute:(input:unknown)=>unknown};
    const context=(document as Document & {modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context?.registerTool)return;
    const controller=new AbortController();
    try {void Promise.resolve(context.registerTool({
      name:'start_number_game',description:'Start a new directed-number practice game. Replaces the current unsaved round and opens its first question.',
      inputSchema:{type:'object',properties:{game:{type:'string',enum:gameIds}},required:['game'],additionalProperties:false},
      annotations:{readOnlyHint:false,untrustedContentHint:false},
      execute(input:unknown){
        if(!input||typeof input!=='object'||!('game' in input)||!gameIds.includes(input.game as GameId)||Object.keys(input).length!==1)throw new Error(`Choose one of: ${gameIds.join(', ')}.`);
        const game=input.game as GameId;flushSync(()=>start(game));return {game,question:1,totalQuestions:15};
      },
    },{signal:controller.signal})).catch(()=>{});} catch {}
    return ()=>controller.abort();
  },[]);
  const active=session?games[gameIds.indexOf(session.game)]:null;
  const elapsed=session?elapsedSeconds(session,now):0;
  const time=`${String(Math.floor(elapsed/60)).padStart(2,'0')}:${String(elapsed%60).padStart(2,'0')}`;
  return <main className={`world ${session||showLeaderboard?'playing':''}`}>
    <header className="topbar"><button className="brand" disabled={Boolean(session?.finished&&!uploaded)} onClick={goHome}><span className="brand-icon"><MoveHorizontal /></span>有向數方塊世界</button><span className="top-note">中一數學 · 有向數</span></header>
    {showLeaderboard&&!session?<LeaderboardPanel onClose={()=>setShowLeaderboard(false)} student={lastStudent}/>:
    !session?<section className="menu"><div className="menu-heading"><span className="eyebrow">準備好，出發探索！</span><h1>選一個世界，<br/>開始你的數學冒險。</h1><p>七個小遊戲，自由選擇，學會有向數。</p><Button className="block-btn leaderboard-button" onClick={()=>setShowLeaderboard(true)}><Trophy/>查看排行榜</Button></div><div className="game-grid">{games.map((g,i)=><Button key={g.title} className={`game-card ${g.color}`} onClick={()=>start(gameIds[i])}><span className="card-top"><span className="game-icon"><g.icon /></span><span className="game-number">0{i+1}</span></span><span className="card-label">{g.label}</span><h2>{g.title}</h2><span className="card-copy">{g.text}</span><span className="sample">{g.sample}</span><span className="card-bottom"><span><Clock3/>約 10 分鐘</span><span>進入遊戲 <ArrowRight/></span></span></Button>)}</div><footer className="menu-footer"><span>自由選關 · 隨時重玩</span></footer></section>:
    <section className={`play-area ${active?.color}`}><div className="play-nav"><Button variant="secondary" className="block-btn secondary" disabled={session.finished&&!uploaded} onClick={goHome}><ArrowLeft/>返回選關</Button><div className="play-name">{active&&<active.icon/>}<h1>{active?.title}</h1></div><span className="elapsed"><Clock3/>已練習 {time}</span></div>
      {session.finished?<div className="game-panel finish"><div className="finish-check"><Check/></div><span className="task-label">這次探索完成了</span><h2>每一步，都更有把握。</h2><p>你完成了「{active?.title}」的全部 {session.questions.length} 個任務。</p><div className="final-score"><span>本次得分</span><strong>{score(session)}<small> / {session.questions.length*10} 分</small></strong></div><div className="result-grid"><div><strong>{session.firstTry}</strong><span>首次作答全對</span></div><div><strong>{session.questions.length-session.firstTry}</strong><span>練習後答對</span></div><div><strong>{time}</strong><span>遊戲時間</span></div></div><p className="result-note">每題首次全對 10 分，重試後完成 5 分。</p><ScoreUpload gameId={session.game} score={score(session)} maxScore={session.questions.length*10} elapsedSeconds={elapsed} onUploaded={identity=>{setUploaded(true);setLastStudent(identity);}}/><div className="answer-options"><Button className="block-btn" disabled={!uploaded} onClick={()=>start(session.game)}><RotateCcw/>再玩一次</Button><Button className="block-btn secondary" variant="secondary" disabled={!uploaded} onClick={goHome}>選其他遊戲<ArrowRight/></Button></div></div>:
      <div className="game-panel"><div className="round-top"><span>任務 <b>{String(session.index+1).padStart(2,'0')}</b> / {session.questions.length}</span><span className="live-score">得分 <b>{score(session)}</b> / {session.questions.length*10}</span><span>{['multiply','divide','mixed'].includes(session.game)?'−100 至 +100':session.game==='brackets'?'−20 至 +20':'−10 至 +10'}</span></div><Progress aria-label="本局已完成任務" value={(session.index+(session.solved?1:0))/session.questions.length*100}/><GameBoard key={`${session.game}-${session.startedAt}-${session.index}`} session={session} answer={value=>dispatch({type:'answer',value})} next={()=>dispatch({type:'next'})}/><div className="round-bottom">{elapsed>=600&&<span>已練習 10 分鐘，你可以繼續或返回選關。</span>}{session.solved&&!['multiply','divide','mixed'].includes(session.game)&&<Button className="block-btn" onClick={()=>dispatch({type:'next'})}>{session.index===session.questions.length-1?'查看本次結果':'下一個任務'}<ArrowRight/></Button>}</div></div>}
    </section>}
  </main>;
}
