export type WcLaunchPayload = {
  uri?: string;
  requestId?: string;
  sessionTopic?: string;
  returnUrl?: string;
  sourcePath?: string;
  createdAt: number;
};

const KEY = 'inri_wallet_wc_launch_v1';

function canUseStorage() {
  return typeof window !== 'undefined' && typeof sessionStorage !== 'undefined';
}

export function savePendingWcLaunch(payload: Omit<WcLaunchPayload, 'createdAt'>) {
  if (!canUseStorage()) return null;
  const next: WcLaunchPayload = {
    ...payload,
    createdAt: Date.now(),
  };
  sessionStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function getPendingWcLaunch(): WcLaunchPayload | null {
  if (!canUseStorage()) return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as WcLaunchPayload;
  } catch {
    return null;
  }
}

export function clearPendingWcLaunch() {
  if (!canUseStorage()) return;
  sessionStorage.removeItem(KEY);
}

export function captureWcLaunchFromLocation() {
  if (typeof window === 'undefined') return null;

  const url = new URL(window.location.href);
  const params = url.searchParams;
  const uri = params.get('uri') || '';
  const requestId = params.get('requestId') || '';
  const sessionTopic = params.get('sessionTopic') || '';
  const returnUrl = params.get('returnUrl') || '';
  const isWcPath = /^\/wc\/?$/i.test(url.pathname);
  const isWcQuery = params.get('wc_route') === '1';

  if (!isWcPath && !isWcQuery && !uri && !requestId) return null;

  const payload = savePendingWcLaunch({
    uri: uri || undefined,
    requestId: requestId || undefined,
    sessionTopic: sessionTopic || undefined,
    returnUrl: returnUrl || undefined,
    sourcePath: url.pathname,
  });

  if (isWcPath) {
    const next = new URL(`${window.location.origin}/`);
    next.searchParams.set('wc_route', '1');
    if (uri) next.searchParams.set('uri', uri);
    if (requestId) next.searchParams.set('requestId', requestId);
    if (sessionTopic) next.searchParams.set('sessionTopic', sessionTopic);
    if (returnUrl) next.searchParams.set('returnUrl', returnUrl);
    window.location.replace(next.toString());
    return payload;
  }

  if (isWcQuery || uri || requestId) {
    try {
      window.history.replaceState({}, '', '/');
    } catch {
      // ignore history failures
    }
  }

  return payload;
}

export function finishPendingWcLaunch() {
  if (typeof window === 'undefined') return;
  const launch = getPendingWcLaunch();
  clearPendingWcLaunch();
  if (!launch?.returnUrl) return;

  try {
    if (window.opener && !window.opener.closed) {
      window.opener.location.href = launch.returnUrl;
      window.opener.focus?.();
      window.close();
      return;
    }
  } catch {
    // ignore cross-window issues
  }

  window.location.href = launch.returnUrl;
}
