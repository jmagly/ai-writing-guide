// Authed control-surface client. The Bridge injects window.__COCKPIT_TOKEN__ into
// the served page; every /api call carries it as a bearer token.
declare global {
  interface Window { __COCKPIT_TOKEN__?: string }
}

const TOKEN = (typeof window !== 'undefined' && window.__COCKPIT_TOKEN__) || '';

export function apiRaw(path: string, opts: RequestInit = {}): Promise<Response> {
  return fetch(path, { ...opts, headers: { ...(opts.headers || {}), authorization: `Bearer ${TOKEN}` } });
}

export async function api<T = unknown>(path: string, opts: RequestInit = {}): Promise<T> {
  const r = await apiRaw(path, opts);
  if (!r.ok) throw new Error(`${path} → ${r.status}`);
  if (r.status === 204) return {} as T;
  return r.json() as Promise<T>;
}

export { TOKEN };
