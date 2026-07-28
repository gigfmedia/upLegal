export interface ClientEnv {
  browser: string;
  os: string;
  viewport: string;
  url: string;
  route: string;
  buildVersion: string;
  commitHash: string;
  anonymousId: string;
}

function detectBrowser(): string {
  if (typeof navigator === 'undefined') return 'server';
  const ua = navigator.userAgent;
  if (ua.includes('Chrome') && !ua.includes('Edg')) return 'chrome';
  if (ua.includes('Firefox')) return 'firefox';
  if (ua.includes('Safari') && !ua.includes('Chrome')) return 'safari';
  if (ua.includes('Edg')) return 'edge';
  if (ua.includes('OPR') || ua.includes('Opera')) return 'opera';
  return 'unknown';
}

function detectOS(): string {
  if (typeof navigator === 'undefined') return 'server';
  const ua = navigator.userAgent;
  if (ua.includes('Win')) return 'windows';
  if (ua.includes('Mac')) return 'macos';
  if (ua.includes('Linux')) return 'linux';
  if (ua.includes('Android')) return 'android';
  if (ua.includes('iPhone') || ua.includes('iPad')) return 'ios';
  return 'unknown';
}

function getViewport(): string {
  if (typeof window === 'undefined') return 'server';
  return `${window.innerWidth}x${window.innerHeight}`;
}

function getAnonymousId(): string {
  if (typeof window === 'undefined') return '';
  const KEY = '_uplegal_anon_id';
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    localStorage.setItem(KEY, id);
  }
  return id;
}

export function getClientEnv(): ClientEnv {
  return {
    browser: detectBrowser(),
    os: detectOS(),
    viewport: getViewport(),
    url: typeof window !== 'undefined' ? window.location.href : '',
    route: typeof window !== 'undefined' ? window.location.pathname + window.location.search : '',
    buildVersion: typeof import.meta !== 'undefined' ? (import.meta.env.VITE_BUILD_ID as string || 'dev') : 'server',
    commitHash: typeof import.meta !== 'undefined' ? (import.meta.env.VITE_COMMIT_HASH as string || 'dev') : 'server',
    anonymousId: getAnonymousId(),
  };
}