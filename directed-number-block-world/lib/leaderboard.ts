import type { GameId } from '@/lib/game';

export const leaderboardClasses = ['1A', '1B', '1C', '1D'] as const;
export type ClassName = (typeof leaderboardClasses)[number];
export type BoardId = GameId | 'overall';

export type RankingEntry = {
  rank: number;
  className: ClassName;
  studentNo: number;
  score: number;
  maxScore: number;
  elapsedSeconds: number;
};

export type LeaderboardResponse = {
  ok: boolean;
  roundId: string;
  board: BoardId;
  classFilter: 'ALL' | ClassName;
  rankings: RankingEntry[];
  self: RankingEntry | null;
  message?: string;
};

export type UploadResponse = {
  source: 'directed-number-leaderboard';
  ok: boolean;
  submissionId: string;
  message: string;
  best: RankingEntry | null;
  gradeRank: number | null;
  classRank: number | null;
};

export const leaderboardUrl =
  process.env.NEXT_PUBLIC_LEADERBOARD_URL?.trim()
  ?? 'https://script.google.com/macros/s/AKfycbynqbXj60zqXdD3gzZAfHrZ3Xp_lIb1paPbMs3sX2Ya7ZRifGAjma_mg8UW3oTWleIr/exec';

export function validStudent(className: string, studentNo: number) {
  return leaderboardClasses.includes(className as ClassName)
    && Number.isInteger(studentNo)
    && studentNo >= 1
    && studentNo <= 33;
}

export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

export function makeSubmissionId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function fetchLeaderboard(
  board: BoardId,
  classFilter: 'ALL' | ClassName,
  student?: { className: ClassName; studentNo: number },
): Promise<LeaderboardResponse> {
  if (!leaderboardUrl) return Promise.reject(new Error('排行榜尚未連接 Google Sheets。'));
  return new Promise((resolve, reject) => {
    const callback = `__numberBoard_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const timer = window.setTimeout(() => finish(new Error('讀取排行榜逾時，請稍後再試。')), 15000);
    const finish = (error?: Error, value?: LeaderboardResponse) => {
      window.clearTimeout(timer);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
      error ? reject(error) : resolve(value as LeaderboardResponse);
    };
    (window as unknown as Record<string, unknown>)[callback] = (value: LeaderboardResponse) => finish(undefined, value);
    const query = new URLSearchParams({ action: 'leaderboard', board, classFilter, callback });
    if (student) {
      query.set('className', student.className);
      query.set('studentNo', String(student.studentNo));
    }
    script.src = `${leaderboardUrl}?${query}`;
    script.onerror = () => finish(new Error('未能讀取排行榜，請檢查網絡。'));
    document.body.appendChild(script);
  });
}

export function uploadScore(fields: Record<string, string>): Promise<UploadResponse> {
  if (!leaderboardUrl) return Promise.reject(new Error('排行榜尚未連接 Google Sheets。'));
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe');
    const form = document.createElement('form');
    const target = `scoreUpload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    iframe.name = target;
    iframe.hidden = true;
    form.hidden = true;
    form.method = 'POST';
    form.action = leaderboardUrl;
    form.target = target;
    Object.entries(fields).forEach(([name, value]) => {
      const input = document.createElement('input');
      input.name = name;
      input.value = value;
      form.appendChild(input);
    });
    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', receive);
      form.remove();
      iframe.remove();
    };
    const receive = (event: MessageEvent<UploadResponse>) => {
      if (event.data?.source !== 'directed-number-leaderboard') return;
      if (event.data.submissionId !== fields.submissionId) return;
      cleanup();
      event.data.ok ? resolve(event.data) : reject(new Error(event.data.message));
    };
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error('上傳逾時，請按「重新上傳」。'));
    }, 20000);
    window.addEventListener('message', receive);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}
