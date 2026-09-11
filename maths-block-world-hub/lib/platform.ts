export type Identity = { schoolYear: string; className: string; studentNo: number };
export type Config = { ok: boolean; schoolYear: string; classes: string[]; studentNoMin: number; studentNoMax: number };
export type Badge = { id: string; name: string; description: string; category: 'stage' | 'skill' | 'cumulative' | 'exploration'; hidden: boolean; asset: string; earned: boolean; earnedAt: string | null; progress: number | null; target: number | null };
export type Profile = { ok: boolean; schoolYear: string; className: string; studentNo: number; summary: { earnedBadges: number; totalBadges: number; completedStages: number; firstTryCorrect: number; maxFirstTryStreak: number; completedWorlds: number }; worldProgress: { worldId: string; completed: number; total: number }[]; badges: Badge[]; message?: string };
export type Catalog = { ok: boolean; worlds: { id: string; name: string; order: number; questionCount: number; maxScore: number; stages: { id: string; name: string; order: number }[] }[]; badges: Omit<Badge, 'earned' | 'earnedAt' | 'progress' | 'target'>[] };

export const platformUrl =
  process.env.NEXT_PUBLIC_PLATFORM_URL?.trim() ||
  'https://script.google.com/macros/s/AKfycbzJRblwkScQZuKpUQjiwkpZIMKyY0-h4vO8aFhqqVU2rgINbxYDPW0nH60YL8Pxpz0r/exec';
export const directedUrl =
  process.env.NEXT_PUBLIC_DIRECTED_NUMBER_URL?.trim() ||
  'https://kwh-number-blocks.kongwinghang1995.chatgpt.site/';
export const algebraUrl =
  process.env.NEXT_PUBLIC_ALGEBRA_URL?.trim() ||
  'https://kwh-algebra-blocks.kongwinghang1995.chatgpt.site/';
export const equationUrl =
  process.env.NEXT_PUBLIC_EQUATION_URL?.trim() ||
  'https://goldhard1995.github.io/Maths/linear-equation/';
export const storageKey = 'maths-platform-student-v1';

export function validIdentity(config: Config, className: string, studentNo: number) {
  return config.classes.includes(className) && Number.isInteger(studentNo) && studentNo >= config.studentNoMin && studentNo <= config.studentNoMax;
}

export function gameUrl(base: string, identity: Identity) {
  const url = new URL(base, window.location.href);
  url.searchParams.set('schoolYear', identity.schoolYear);
  url.searchParams.set('className', identity.className);
  url.searchParams.set('studentNo', String(identity.studentNo));
  return url.toString();
}

export function jsonp<T>(parameters: Record<string, string>, prefix: string): Promise<T> {
  if (!platformUrl) return Promise.reject(new Error('收藏系統尚未連接。'));
  return new Promise((resolve, reject) => {
    const callback = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement('script');
    const finish = (error?: Error, value?: T) => {
      clearTimeout(timer);
      script.remove();
      delete (window as unknown as Record<string, unknown>)[callback];
      if (error) reject(error); else resolve(value as T);
    };
    const timer = setTimeout(() => finish(new Error('讀取逾時，請稍後再試。')), 15000);
    (window as unknown as Record<string, unknown>)[callback] = (value: T) => finish(undefined, value);
    script.src = `${platformUrl}?${new URLSearchParams({ ...parameters, callback })}`;
    script.onerror = () => finish(new Error('未能連接收藏系統。'));
    document.body.appendChild(script);
  });
}

export function fetchConfig() { return jsonp<Config>({ action: 'config' }, '__mathsConfig'); }
export function fetchCatalog() { return jsonp<Catalog>({ action: 'catalog' }, '__mathsCatalog'); }
export function fetchProfile(identity: Identity) { return jsonp<Profile>({ action: 'profile', schoolYear: identity.schoolYear, className: identity.className, studentNo: String(identity.studentNo) }, '__mathsProfile'); }
