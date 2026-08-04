/**
 * End-to-end Git transport coverage for root bundles and standalone plugin wrappers.
 *
 * @implements #1997
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createServer, type Server } from 'node:http';
import os from 'node:os';
import path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { readMarketplaceIndex } from '../../src/marketplace/exchange.js';
import { installPackage } from '../../src/packages/registry.js';

const baseManifest = {
  version: '1.0.0',
  description: 'Git package installation fixture',
  manifestVersion: '1',
  platforms: { claude: 'full', codex: 'full' },
  keywords: ['fixture'],
  deployment: { pathTemplate: '{provider}/fixtures' },
};

function writeJson(filename: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`);
}

function writeAddon(root: string, id: string): void {
  fs.mkdirSync(path.join(root, 'agents'), { recursive: true });
  fs.mkdirSync(path.join(root, 'skills', 'fixture-skill'), { recursive: true });
  fs.mkdirSync(path.join(root, 'rules'), { recursive: true });
  writeJson(path.join(root, 'manifest.json'), {
    ...baseManifest,
    id,
    name: id,
    type: 'addon',
    addonConfig: { entry: { agents: 'agents/', skills: 'skills/', rules: 'rules/' } },
  });
  fs.writeFileSync(path.join(root, 'agents', 'fixture-agent.md'), '# Fixture agent\n');
  fs.writeFileSync(path.join(root, 'skills', 'fixture-skill', 'SKILL.md'), '# Fixture skill\n');
  fs.writeFileSync(path.join(root, 'rules', 'fixture-rule.md'), '# Fixture rule\n');
}

function writeStandaloneWrapper(repository: string, id: string): string {
  const wrapper = path.join(repository, '.aiwg', 'plugins', id);
  const payload = path.join(wrapper, 'payload');
  writeJson(path.join(wrapper, 'manifest.json'), {
    ...baseManifest,
    id,
    name: id,
    type: 'plugin',
    pluginConfig: { payloadType: 'addon', payloadPath: 'payload/' },
  });
  writeAddon(payload, `${id}-payload`);
  return payload;
}

function commitRepository(repository: string): string {
  execFileSync('git', ['init', '--initial-branch=main'], { cwd: repository });
  execFileSync('git', ['config', 'user.name', 'AIWG Test'], { cwd: repository });
  execFileSync('git', ['config', 'user.email', 'test@aiwg.invalid'], { cwd: repository });
  execFileSync('git', ['add', '.'], { cwd: repository });
  execFileSync('git', ['commit', '-m', 'fixture'], { cwd: repository });
  return execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repository, encoding: 'utf8' }).trim();
}

function publishBareRepository(repository: string, serverRoot: string, name: string): string {
  const bare = path.join(serverRoot, `${name}.git`);
  execFileSync('git', ['clone', '--bare', repository, bare]);
  execFileSync('git', ['--git-dir', bare, 'update-server-info']);
  return `${name}.git`;
}

async function startGitServer(serverRoot: string): Promise<{ server: Server; baseUrl: string }> {
  const resolvedRoot = path.resolve(serverRoot);
  const server = createServer((request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://127.0.0.1').pathname);
      const filename = path.resolve(resolvedRoot, `.${pathname}`);
      if (filename !== resolvedRoot && !filename.startsWith(`${resolvedRoot}${path.sep}`)) {
        response.writeHead(403).end();
        return;
      }
      const stat = fs.statSync(filename);
      if (!stat.isFile()) {
        response.writeHead(404).end();
        return;
      }
      response.writeHead(200, {
        'Content-Length': stat.size,
        'Content-Type': 'application/octet-stream',
      });
      if (request.method === 'HEAD') response.end();
      else fs.createReadStream(filename).pipe(response);
    } catch {
      response.writeHead(404).end();
    }
  });
  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Git fixture server did not bind a TCP port');
  return { server, baseUrl: `http://127.0.0.1:${address.port}` };
}

describe.sequential('Git package installation', () => {
  let root: string;
  let sourceRoot: string;
  let serverRoot: string;
  let configDir: string;
  let server: Server;
  let baseUrl: string;
  let previousCacheHome: string | undefined;

  beforeEach(async () => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-git-package-install-'));
    sourceRoot = path.join(root, 'sources');
    serverRoot = path.join(root, 'server');
    configDir = path.join(root, 'config');
    fs.mkdirSync(sourceRoot, { recursive: true });
    fs.mkdirSync(serverRoot, { recursive: true });
    previousCacheHome = process.env.XDG_CACHE_HOME;
    process.env.XDG_CACHE_HOME = path.join(root, 'cache');
    ({ server, baseUrl } = await startGitServer(serverRoot));
  });

  afterEach(async () => {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    if (previousCacheHome === undefined) delete process.env.XDG_CACHE_HOME;
    else process.env.XDG_CACHE_HOME = previousCacheHome;
    fs.rmSync(root, { recursive: true, force: true });
  });

  it('installs a direct root bundle from Git and persists immutable source identity', async () => {
    const source = path.join(sourceRoot, 'root-addon');
    fs.mkdirSync(source, { recursive: true });
    writeAddon(source, 'root-addon');
    const commit = commitRepository(source);
    const remoteName = publishBareRepository(source, serverRoot, 'root-addon');
    const remote = `${baseUrl}/${remoteName}`;

    const installed = await installPackage(remote, { configDir, ref: 'main' });

    expect(installed.type).toBe('addon');
    expect(installed.cachePath).toBe(installed.checkoutPath);
    expect(installed.envelope.source).toMatchObject({
      canonicalRemote: remote,
      requestedRef: 'main',
      resolvedCommit: commit,
      wrapperPath: '.',
      payloadPath: '.',
    });
    const index = await readMarketplaceIndex({ configDir });
    const entry = index.packages[installed.lock.lockId];
    expect(entry).toBeDefined();
    expect(JSON.parse(fs.readFileSync(entry!.envelopePath, 'utf8')).source)
      .toEqual(installed.envelope.source);
  });

  it('installs a single nested standalone wrapper without a selector', async () => {
    const source = path.join(sourceRoot, 'standalone-plugin');
    fs.mkdirSync(source, { recursive: true });
    writeStandaloneWrapper(source, 'team-tools');
    const commit = commitRepository(source);
    const remoteName = publishBareRepository(source, serverRoot, 'standalone-plugin');
    const remote = `${baseUrl}/${remoteName}`;

    const installed = await installPackage(remote, { configDir, ref: 'main' });

    expect(installed.type).toBe('plugin');
    expect(path.relative(installed.checkoutPath, installed.cachePath).replaceAll(path.sep, '/'))
      .toBe('.aiwg/plugins/team-tools/payload');
    expect(installed.envelope.source).toMatchObject({
      canonicalRemote: remote,
      requestedRef: 'main',
      resolvedCommit: commit,
      wrapperPath: '.aiwg/plugins/team-tools',
      payloadPath: '.aiwg/plugins/team-tools/payload',
    });
    const index = await readMarketplaceIndex({ configDir });
    const entry = index.packages[installed.lock.lockId];
    expect(entry?.artifactPath).toBe(installed.cachePath);
    expect(JSON.parse(fs.readFileSync(entry!.envelopePath, 'utf8')).source)
      .toEqual(installed.envelope.source);
  });

  it('requires an explicit selector for repositories containing multiple wrappers', async () => {
    const source = path.join(sourceRoot, 'multiple-plugins');
    fs.mkdirSync(source, { recursive: true });
    writeStandaloneWrapper(source, 'team-tools');
    writeStandaloneWrapper(source, 'review-tools');
    commitRepository(source);
    const remoteName = publishBareRepository(source, serverRoot, 'multiple-plugins');
    const remote = `${baseUrl}/${remoteName}`;

    await expect(installPackage(remote, { configDir, ref: 'main' }))
      .rejects.toThrow(/multiple standalone plugins.*--package <id>/is);
    const installed = await installPackage(remote, {
      configDir,
      ref: 'main',
      packageSelector: 'review-tools',
    });
    expect(installed.envelope.source.wrapperPath).toBe('.aiwg/plugins/review-tools');
    expect(installed.envelope.source.payloadPath).toBe('.aiwg/plugins/review-tools/payload');
  });
});
