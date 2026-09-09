'use client';
/* oxlint-disable react/react-compiler, jsx-a11y/prefer-tag-over-role -- Loading resets belong to the request effect; the CSS grid exposes explicit table semantics. */
import { useEffect, useState } from 'react';
import { ArrowLeft, RotateCcw, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  type BoardId,
  type ClassName,
  type LeaderboardResponse,
  fetchLeaderboard,
  formatDuration,
  leaderboardClasses,
  leaderboardUrl,
} from '@/lib/leaderboard';

const boards: { id: BoardId; label: string }[] = [
  { id: 'locate', label: '數線定位' },
  { id: 'compare', label: '比較大小' },
  { id: 'move', label: '數線移動' },
  { id: 'brackets', label: '拆括號' },
  { id: 'multiply', label: '乘法' },
  { id: 'divide', label: '除法' },
  { id: 'mixed', label: '四則運算' },
  { id: 'overall', label: '七關總榜' },
];

export default function LeaderboardPanel({
  onClose,
  student,
}: {
  onClose: () => void;
  student?: { className: ClassName; studentNo: number };
}) {
  const [board, setBoard] = useState<BoardId>('locate');
  const [classFilter, setClassFilter] = useState<'ALL' | ClassName>('ALL');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [error, setError] = useState('');
  const [reload, setReload] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError('');
    fetchLeaderboard(board, classFilter, student)
      .then(value => active && setData(value))
      .catch(reason => active && setError(reason instanceof Error ? reason.message : '未能讀取排行榜。'));
    return () => { active = false; };
  }, [board, classFilter, reload, student]);
  return <section className="leaderboard-page">
    <div className="leaderboard-heading">
      <Button variant="secondary" className="block-btn secondary" onClick={onClose}><ArrowLeft />返回選關</Button>
      <div><Trophy /><h1>排行榜</h1></div>
      <Button variant="secondary" className="block-btn secondary" onClick={() => setReload(value => value + 1)}><RotateCcw />重新整理</Button>
    </div>
    <div className="game-panel leaderboard-panel">
      <div className="board-tabs" role="tablist" aria-label="排行榜類別">{boards.map(item => <button key={item.id} role="tab" aria-selected={board === item.id} className={board === item.id ? 'active' : ''} onClick={() => setBoard(item.id)}>{item.label}</button>)}</div>
      <div className="class-tabs" aria-label="班別篩選">{(['ALL', ...leaderboardClasses] as const).map(item => <button key={item} className={classFilter === item ? 'active' : ''} onClick={() => setClassFilter(item)}>{item === 'ALL' ? '全級' : item}</button>)}</div>
      {!leaderboardUrl && <div className="board-message">排行榜尚未連接 Google Sheets。完成 Apps Script 部署後即可使用。</div>}
      {leaderboardUrl && !data && !error && <div className="board-message">正在讀取排行榜……</div>}
      {error && <div className="board-message error">{error}</div>}
      {data && <>
        <div className="board-round">目前輪次：{data.roundId}</div>
        <div className="ranking-table" role="table" aria-label={`${boards.find(item => item.id === board)?.label}排行榜`}>
          <div className="ranking-row header" role="row"><span>名次</span><span>班別</span><span>學號</span><span>分數</span><span>時間</span></div>
          {data.rankings.length ? data.rankings.map(entry => <div className="ranking-row" role="row" key={`${entry.className}-${entry.studentNo}`}><strong>{entry.rank}</strong><span>{entry.className}</span><span>{entry.studentNo}</span><span>{entry.score} / {entry.maxScore}</span><span>{formatDuration(entry.elapsedSeconds)}</span></div>) : <div className="board-message">這個排行榜暫時未有成績。</div>}
        </div>
        {data.self && !data.rankings.some(entry => entry.className === data.self?.className && entry.studentNo === data.self?.studentNo) && <div className="self-rank"><span>你的名次</span><strong>第 {data.self.rank} 名</strong><span>{data.self.className}　{data.self.studentNo} 號</span><span>{data.self.score} 分　{formatDuration(data.self.elapsedSeconds)}</span></div>}
      </>}
    </div>
  </section>;
}
