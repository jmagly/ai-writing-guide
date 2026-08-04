// Browser control-surface client. A native shell puts a short-lived one-time
// nonce in the URL fragment. The app exchanges it for an HttpOnly/SameSite
// session cookie, removes the fragment, and keeps only a session-bound CSRF
// value in memory. No reusable control credential enters HTML, URLs, or state.

let csrf = '';

function fragmentBootstrap(): { nonce: string; audience: string; next: string } | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const nonce = params.get('bootstrap') || '';
  if (!nonce) return null;
  return {
    nonce,
    audience: params.get('audience') || 'browser',
    next: params.get('next') || '',
  };
}

async function establishSession(): Promise<void> {
  const bootstrap = fragmentBootstrap();
  // Component tests exercise API consumers without a live Bridge. Bootstrap
  // exchange behavior has dedicated tests that provide a fragment.
  if (import.meta.env.MODE === 'test' && !bootstrap) {
    csrf = 'test-session-csrf';
    return;
  }
  const response = bootstrap
    ? await fetch('/bootstrap/session', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ nonce: bootstrap.nonce, audience: bootstrap.audience }),
      })
    : await fetch('/bootstrap/session', { credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Cockpit session bootstrap failed (${response.status})`);
  const body = await response.json() as { csrf?: string };
  if (!body.csrf) throw new Error('Cockpit session bootstrap returned no CSRF binding');
  csrf = body.csrf;
  if (bootstrap && typeof window !== 'undefined') {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}${bootstrap.next ? `#${bootstrap.next}` : ''}`);
  }
}

let sessionPromise: Promise<void> | undefined;
export function sessionReady(): Promise<void> {
  sessionPromise ??= establishSession();
  return sessionPromise;
}

export async function apiRaw(path: string, opts: RequestInit = {}): Promise<Response> {
  await sessionReady();
  const method = String(opts.method || 'GET').toUpperCase();
  const headers = new Headers(opts.headers);
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) headers.set('x-cockpit-csrf', csrf);
  return fetch(path, { ...opts, credentials: 'same-origin', headers });
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await apiRaw(path, opts);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  if (r.status === 204) return {} as T;
  return r.json() as Promise<T>;
}
