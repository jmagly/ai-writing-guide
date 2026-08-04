import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { afterEach, describe, expect, it } from 'vitest';

const cleanups: Array<() => Promise<void>> = [];

afterEach(async () => {
  await Promise.all(cleanups.splice(0).map((cleanup) => cleanup()));
});

describe('@hono/node-server serveStatic Windows path hardening', () => {
  it('does not bypass prefix middleware with an encoded backslash', async () => {
    const root = await mkdtemp(join(tmpdir(), 'aiwg-hono-static-'));
    await mkdir(join(root, 'admin'));
    await writeFile(join(root, 'public.txt'), 'public');
    await writeFile(join(root, 'admin', 'secret.txt'), 'secret');

    const app = new Hono();
    app.use('/admin/*', async (context) => context.text('denied', 403));
    app.use('/*', serveStatic({ root }));

    const server = serve({ fetch: app.fetch, hostname: '127.0.0.1', port: 0 });
    cleanups.push(async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      await rm(root, { recursive: true, force: true });
    });

    await new Promise<void>((resolve) => server.once('listening', resolve));
    const address = server.address();
    if (!address || typeof address === 'string') throw new Error('expected TCP address');
    const origin = `http://127.0.0.1:${address.port}`;

    const publicResponse = await fetch(`${origin}/public.txt`);
    expect(publicResponse.status).toBe(200);
    expect(await publicResponse.text()).toBe('public');

    const protectedResponse = await fetch(`${origin}/admin/secret.txt`);
    expect(protectedResponse.status).toBe(403);

    const encodedBackslashResponse = await fetch(`${origin}/admin%5Csecret.txt`);
    expect(encodedBackslashResponse.status).not.toBe(200);
    expect(await encodedBackslashResponse.text()).not.toContain('secret');
  });
});
