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
export type BadgeAward = {
  id: string;
  name: string;
  description: string;
  category: 'stage' | 'skill' | 'cumulative' | 'exploration';
  hidden: boolean;
  asset: string;
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
export type PlatformConfig = {
  ok: boolean;
  schoolYear: string;
  classes: readonly string[];
  studentNoMin: number;
  studentNoMax: number;
};
export type PersonalBest = {
  gameId: GameId;
  score: number;
  maxScore: number;
  elapsedSeconds: number;
};
export type PersonalBestsResponse = {
  ok: boolean;
  schoolYear: string;
  worldId: string;
  bests: PersonalBest[];
  message?: string;
};
export type UploadResponse = {
  source: 'maths-platform' | 'algebra-leaderboard';
  ok: boolean;
  submissionId: string;
  message: string;
  best: RankingEntry | null;
  gradeRank: number | null;
  classRank: number | null;
  personalBest: PersonalBest | null;
  previousPersonalBest: PersonalBest | null;
  isNewPersonalBest: boolean;
  newBadges: BadgeAward[];
};

export const leaderboardUrl =
  process.env.NEXT_PUBLIC_PLATFORM_URL?.trim() ||
  process.env.NEXT_PUBLIC_LEADERBOARD_URL?.trim() ||
  'https://script.google.com/macros/s/AKfycbzJRblwkScQZuKpUQjiwkpZIMKyY0-h4vO8aFhqqVU2rgINbxYDPW0nH60YL8Pxpz0r/exec';
export const hubUrl =
  process.env.NEXT_PUBLIC_HUB_URL?.trim() ||
  'https://goldhard1995.github.io/Maths/';
export function validStudent(className: string, studentNo: number) {
  return (
    leaderboardClasses.includes(className as ClassName) &&
    Number.isInteger(studentNo) &&
    studentNo >= 1 &&
    studentNo <= 33
  );
}
export function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60),
    seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}
export function makeSubmissionId() {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function jsonp<T>(
  parameters: Record<string, string>,
  prefix: string,
): Promise<T> {
  if (!leaderboardUrl)
    return Promise.reject(new Error('排行榜尚未連接 Google Sheets。'));
  return new Promise((resolve, reject) => {
    const callback = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      script = document.createElement('script'),
      finish = (error?: Error, value?: T) => {
        window.clearTimeout(timer);
        script.remove();
        delete (window as unknown as Record<string, unknown>)[callback];
        if (error) reject(error);
        else resolve(value as T);
      },
      timer = window.setTimeout(
        () => finish(new Error('讀取資料逾時，請稍後再試。')),
        15000,
      );
    (window as unknown as Record<string, unknown>)[callback] = (value: T) =>
      finish(undefined, value);
    script.crossOrigin = 'anonymous';
    script.src = `${leaderboardUrl}?${new URLSearchParams({ ...parameters, callback })}`;
    script.onerror = () => finish(new Error('未能讀取資料，請檢查網絡。'));
    document.body.appendChild(script);
  });
}
export function fetchPlatformConfig() {
  return jsonp<PlatformConfig>({ action: 'config' }, '__mathsConfig');
}
export function fetchLeaderboard(
  board: BoardId,
  classFilter: 'ALL' | ClassName,
  student?: { className: ClassName; studentNo: number },
) {
  const query: Record<string, string> = {
    action: 'leaderboard',
    worldId: 'polynomial',
    board,
    classFilter,
  };
  if (student) {
    query.className = student.className;
    query.studentNo = String(student.studentNo);
  }
  return jsonp<LeaderboardResponse>(query, '__polynomialBoard');
}
export function fetchPersonalBests(identity: {
  schoolYear: string;
  className: ClassName;
  studentNo: number;
}) {
  return jsonp<PersonalBestsResponse>(
    {
      action: 'personalBests',
      worldId: 'polynomial',
      schoolYear: identity.schoolYear,
      className: identity.className,
      studentNo: String(identity.studentNo),
    },
    '__polynomialPersonalBests',
  );
}
export function personalBestMessage(result: Pick<
  UploadResponse,
  'personalBest' | 'previousPersonalBest' | 'isNewPersonalBest'
>) {
  const { personalBest, previousPersonalBest, isNewPersonalBest } = result;
  if (!personalBest) return '';
  if (isNewPersonalBest && !previousPersonalBest) return '建立首個個人紀錄';
  if (isNewPersonalBest && personalBest.score > previousPersonalBest!.score)
    return `刷新個人紀錄！比上次多 ${personalBest.score - previousPersonalBest!.score} 分`;
  if (isNewPersonalBest)
    return `刷新個人紀錄！比上次快 ${previousPersonalBest!.elapsedSeconds - personalBest.elapsedSeconds} 秒`;
  return `個人最佳：${personalBest.score} 分 · ${formatDuration(personalBest.elapsedSeconds)}`;
}
export function uploadScore(
  fields: Record<string, string>,
): Promise<UploadResponse> {
  if (!leaderboardUrl)
    return Promise.reject(new Error('排行榜尚未連接 Google Sheets。'));
  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe'),
      form = document.createElement('form'),
      target = `scoreUpload_${Date.now()}_${Math.random().toString(36).slice(2)}`;
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
      },
      receive = (event: MessageEvent<UploadResponse>) => {
        if (
          !['maths-platform', 'algebra-leaderboard'].includes(
            event.data?.source,
          ) ||
          event.data.submissionId !== fields.submissionId
        )
          return;
        cleanup();
        if (event.data.ok) resolve({ ...event.data, newBadges: event.data.newBadges ?? [] });
        else reject(new Error(event.data.message));
      },
      timer = window.setTimeout(() => {
        cleanup();
        reject(new Error('上傳逾時，請按「重新上傳」。'));
      }, 20000);
    window.addEventListener('message', receive);
    document.body.appendChild(iframe);
    document.body.appendChild(form);
    form.submit();
  });
}
