#!/usr/bin/env node
import { access, mkdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createEphemeralRoutePatch, runDshHeadless } from './deepseek-harness-transport.mjs';

const CHECK = process.argv.includes('--check');
const required = ['OPENROUTER_API_KEY'];
if (CHECK) {
  console.log(JSON.stringify({ provider: 'deepseek-harness', optIn: true, required, credentialTransport: 'environment-only', secretLogging: false, isolatedHomeAndWorkspace: true, costWarning: 'live model requests may incur provider charges' }));
  process.exit(0);
}
if (process.env.AIWG_DSH_LIVE_SMOKE !== '1') throw new Error('Set AIWG_DSH_LIVE_SMOKE=1 to authorize the live provider request');
for (const name of required) if (!process.env[name]) throw new Error(`Missing ${name}`);
const projectPatch = resolve(process.env.AIWG_DSH_PROJECT_PATCH || '.dsh/aiwg.cordis.patch.yml');
await access(projectPatch);
const isolationRoot = await mkdtemp(join(tmpdir(), 'aiwg-dsh-live-'));
const workspace = join(isolationRoot, 'workspace');
const dshHome = join(isolationRoot, 'home');
await Promise.all([mkdir(workspace), mkdir(dshHome)]);
const route = await createEphemeralRoutePatch({ route: 'openrouter', model: process.env.AIWG_DSH_MODEL || 'deepseek/deepseek-chat-v3.1', credentialEnv: 'OPENROUTER_API_KEY' });
try {
  const marker = 'DSH_OPENROUTER_OK';
  const model = process.env.AIWG_DSH_MODEL || 'deepseek/deepseek-chat-v3.1';
  const result = await runDshHeadless({ binary: process.env.AIWG_DSH_BIN || 'dsh', prompt: `Reply with exactly ${marker}`, cwd: workspace, dshHome, projectPatch, routePatch: route.path, route: 'openrouter', model, credentialEnv: 'OPENROUTER_API_KEY', credentialValue: process.env.OPENROUTER_API_KEY });
  const leaked = result.stdout.includes(process.env.OPENROUTER_API_KEY) || result.stderr.includes(process.env.OPENROUTER_API_KEY);
  if (result.code !== 0 || result.stdout.trim() !== marker || leaked) throw new Error(`Live smoke failed: exit=${result.code}, exactMarker=${result.stdout.trim() === marker}, secretLeak=${leaked}`);
  console.log(JSON.stringify({ ok: true, provider: 'deepseek-harness', route: 'openrouter', profile: 'headless', provenance: result.provenance }));
} finally {
  await route.cleanup();
  await rm(isolationRoot, { recursive: true, force: true });
}
