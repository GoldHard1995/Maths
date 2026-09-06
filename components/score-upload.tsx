'use client';
import { useRef, useState } from 'react';
import { Check, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GameId } from '@/lib/game';
import {
  type ClassName,
  type UploadResponse,
  formatDuration,
  leaderboardClasses,
  leaderboardUrl,
  makeSubmissionId,
  uploadScore,
  validStudent,
} from '@/lib/leaderboard';

export default function ScoreUpload({
  gameId,
  score,
  maxScore,
  elapsedSeconds,
  onUploaded,
}: {
  gameId: GameId;
  score: number;
  maxScore: number;
  elapsedSeconds: number;
  onUploaded: (identity: { className: ClassName; studentNo: number }) => void;
}) {
  const [className, setClassName] = useState('');
  const [studentNo, setStudentNo] = useState('');
  const [status, setStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<UploadResponse | null>(null);
  const submissionId = useRef(makeSubmissionId());
  const number = Number(studentNo);
  const valid = validStudent(className, number);
  const submit = async () => {
    if (!valid || status === 'uploading' || status === 'success') return;
    setStatus('uploading');
    setMessage('');
    try {
      const response = await uploadScore({
        submissionId: submissionId.current,
        className,
        studentNo: String(number),
        gameId,
        score: String(score),
        maxScore: String(maxScore),
        elapsedSeconds: String(elapsedSeconds),
      });
      setResult(response);
      setStatus('success');
      setMessage(response.message);
      onUploaded({ className: className as ClassName, studentNo: number });
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : '上傳失敗，請再試一次。');
    }
  };
  return <div className="score-upload">
    <h3>上傳成績</h3>
    <p>選擇班別並輸入學號。成功上傳後才可繼續。</p>
    <div className="student-fields">
      <label>班別<select value={className} disabled={status === 'uploading' || status === 'success'} onChange={event => setClassName(event.target.value)}><option value="">請選擇</option>{leaderboardClasses.map(value => <option key={value} value={value}>{value}</option>)}</select></label>
      <label>學號<input value={studentNo} disabled={status === 'uploading' || status === 'success'} inputMode="numeric" placeholder="1 至 33" onChange={event => { if (/^\d{0,2}$/.test(event.target.value)) setStudentNo(event.target.value); }} /></label>
    </div>
    <Button className="block-btn upload-btn" disabled={!valid || status === 'uploading' || status === 'success' || !leaderboardUrl} onClick={submit}>{status === 'success' ? <><Check />已上傳</> : <><Upload />{status === 'error' ? '重新上傳' : status === 'uploading' ? '上傳中……' : '上傳成績'}</>}</Button>
    {!leaderboardUrl && <p className="upload-status error">排行榜尚未連接 Google Sheets。</p>}
    {message && <p className={`upload-status ${status}`}>{message}</p>}
    {result?.best && <div className="uploaded-ranks"><span>全級：第 {result.gradeRank} 名</span><span>班內：第 {result.classRank} 名</span><span>最佳：{result.best.score} 分　{formatDuration(result.best.elapsedSeconds)}</span></div>}
  </div>;
}
