import { beforeEach, describe, expect, it, vi } from 'vitest';

describe('browser session bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.restoreAllMocks();
    window.history.replaceState(null, '', '/#bootstrap=one-time-nonce&audience=browser&next=actions');
  });

  it('exchanges the fragment, removes it from history, and uses cookie plus CSRF auth', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrf: 'session-csrf' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetchMock);

    const { apiRaw } = await import('./api');
    await apiRaw('/api/actions/demo', { method: 'POST' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [bootstrapUrl, bootstrapInit] = fetchMock.mock.calls[0];
    expect(bootstrapUrl).toBe('/bootstrap/session');
    expect(bootstrapInit).toMatchObject({
      method: 'POST',
      credentials: 'same-origin',
    });
    expect(JSON.parse(String(bootstrapInit.body))).toEqual({
      nonce: 'one-time-nonce',
      audience: 'browser',
    });
    expect(window.location.hash).toBe('#actions');
    expect(window.location.href).not.toContain('one-time-nonce');

    const [apiUrl, apiInit] = fetchMock.mock.calls[1];
    expect(apiUrl).toBe('/api/actions/demo');
    expect(apiInit.credentials).toBe('same-origin');
    expect(new Headers(apiInit.headers).get('x-cockpit-csrf')).toBe('session-csrf');
    expect(JSON.stringify(apiInit)).not.toContain('one-time-nonce');
  });
});
