import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import {
  emptyConfig,
  updateInstalled,
  writeAiwgConfig,
} from '../../../src/config/aiwg-config.js';
import { getGraphIndexDir } from '../../../src/artifacts/types.js';
import { generate as generateContextFiles } from '../../../src/smiths/context-pipeline/index.js';
import {
  aggregateUseDeploymentResult,
  buildDeploymentStatusProbe,
  buildDryRunUseResult,
  verifyProviderDeployment,
  type ProviderDeploymentVerification,
} from '../../../src/cli/services/deployment-verification.js';

const roots: string[] = [];
let previousXdgDataHome: string | undefined;

async function tempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function writeFrameworkIndex(frameworkRoot: string, builtAt = new Date().toISOString()): Promise<void> {
  const indexDir = getGraphIndexDir(frameworkRoot, 'framework');
  await mkdir(indexDir, { recursive: true });
  await writeFile(path.join(indexDir, 'metadata.json'), JSON.stringify({
    version: '1',
    builtAt,
    buildTimeMs: 1,
    entries: {
      'agentic/code/frameworks/sdlc-complete/manifest.json': {
        path: 'agentic/code/frameworks/sdlc-complete/manifest.json',
        type: 'manifest',
      },
    },
  }));
}

async function readyCodexFixture(): Promise<{ projectRoot: string; frameworkRoot: string }> {
  const projectRoot = await tempRoot('aiwg-deploy-verify-project-');
  const frameworkRoot = await tempRoot('aiwg-deploy-verify-framework-');
  await mkdir(path.join(projectRoot, '.codex', 'commands'), { recursive: true });
  await writeFile(path.join(projectRoot, '.codex', 'commands', 'fixture.md'), '# Fixture command\n');
  await mkdir(path.join(projectRoot, '.agents', 'skills', 'fixture'), { recursive: true });
  await writeFile(path.join(projectRoot, '.agents', 'skills', 'fixture', 'SKILL.md'), '# Fixture skill\n');

  const config = updateInstalled(
    emptyConfig(['codex']),
    'sdlc',
    'codex',
    { agents: 0, commands: 1, skills: 1, rules: 0 },
    { version: 'test', source: 'bundled' },
  );
  await writeAiwgConfig(projectRoot, config);
  await generateContextFiles({
    provider: 'codex',
    projectPath: projectRoot,
    sections: [],
    detectExistingFiles: true,
    force: true,
  });
  await writeFrameworkIndex(frameworkRoot);
  return { projectRoot, frameworkRoot };
}

async function verifyFixture(projectRoot: string, frameworkRoot: string, options: {
  contextOptOut?: boolean;
  invocationStartedAt?: string;
} = {}) {
  return verifyProviderDeployment({
    projectRoot,
    frameworkRoot,
    provider: 'codex',
    scope: 'project',
    requestedBundles: ['sdlc'],
    ...options,
  });
}

describe.sequential('deployment verification contract (#2069)', () => {
  beforeEach(async () => {
    previousXdgDataHome = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = await tempRoot('aiwg-deploy-verify-xdg-');
  });

  afterEach(async () => {
    if (previousXdgDataHome === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = previousXdgDataHome;
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it('reports a fresh and repeated deployment as verified with a restart action', async () => {
    const fixture = await readyCodexFixture();
    const first = await verifyFixture(fixture.projectRoot, fixture.frameworkRoot);
    const second = await verifyFixture(fixture.projectRoot, fixture.frameworkRoot);

    expect(first.outcome).toBe('ready-restart-required');
    expect(first.restartAction).toMatch(/Restart or reopen Codex/);
    expect(first.findings.filter((item) => item.severity === 'blocking')).toHaveLength(0);
    expect(second.outcome).toBe(first.outcome);
    expect(second.counts).toEqual(first.counts);
  });

  it('fails closed for missing artifacts, stale indexes, context loss, and invalid registry state', async () => {
    const missingArtifacts = await readyCodexFixture();
    await rm(path.join(missingArtifacts.projectRoot, '.codex'), { recursive: true, force: true });
    await rm(path.join(missingArtifacts.projectRoot, '.agents'), { recursive: true, force: true });
    expect((await verifyFixture(missingArtifacts.projectRoot, missingArtifacts.frameworkRoot)).findings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'provider-artifacts-missing', severity: 'blocking' })]));

    const staleIndex = await readyCodexFixture();
    await writeFrameworkIndex(staleIndex.frameworkRoot, '2020-01-01T00:00:00.000Z');
    expect((await verifyFixture(staleIndex.projectRoot, staleIndex.frameworkRoot, {
      invocationStartedAt: new Date().toISOString(),
    })).findings).toEqual(expect.arrayContaining([expect.objectContaining({ id: 'index-stale:framework', severity: 'blocking' })]));

    const missingContext = await readyCodexFixture();
    await rm(path.join(missingContext.projectRoot, '.aiwg', 'AIWG.md'));
    expect((await verifyFixture(missingContext.projectRoot, missingContext.frameworkRoot)).findings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'context-missing:.aiwg/AIWG.md', severity: 'blocking' })]));

    const invalidRegistry = await readyCodexFixture();
    const configPath = path.join(invalidRegistry.projectRoot, '.aiwg', 'aiwg.config');
    const config = JSON.parse(await readFile(configPath, 'utf8'));
    config.installed.sdlc.deployedTo.codex.skills = -1;
    await writeFile(configPath, JSON.stringify(config));
    expect((await verifyFixture(invalidRegistry.projectRoot, invalidRegistry.frameworkRoot)).findings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ id: 'registry-count-invalid:sdlc:skills', severity: 'blocking' })]));
  });

  it('keeps explicit context opt-out advisory-only', async () => {
    const fixture = await readyCodexFixture();
    const result = await verifyFixture(fixture.projectRoot, fixture.frameworkRoot, { contextOptOut: true });
    expect(result.outcome).toBe('degraded');
    expect(result.findings).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'context-opt-out', severity: 'advisory' }),
    ]));
    expect(result.findings.some((item) => item.severity === 'blocking')).toBe(false);
  });

  it('aggregates partial multi-provider failure deterministically', async () => {
    const fixture = await readyCodexFixture();
    const ready = await verifyFixture(fixture.projectRoot, fixture.frameworkRoot);
    const failed: ProviderDeploymentVerification = {
      ...ready,
      provider: 'claude',
      outcome: 'failed',
      restartAction: 'Restart Claude Code.',
      phases: ready.phases.map((item) => item.id === 'deploy' ? { ...item, state: 'failed' } : item),
      findings: [{
        id: 'provider-artifacts-missing',
        provider: 'claude',
        severity: 'blocking',
        message: 'No artifacts found.',
      }],
    };
    const aggregate = aggregateUseDeploymentResult({
      ...fixture,
      scope: 'project',
      requestedBundles: ['sdlc'],
      providers: [ready, failed],
    });
    expect(aggregate.outcome).toBe('failed');
    expect(aggregate.exitCode).toBe(1);
    expect(aggregate.phases.find((item) => item.id === 'deploy')?.state).toBe('failed');
  });

  it('models dry-run as planned and never claims deployment success', async () => {
    const projectRoot = await tempRoot('aiwg-deploy-preview-');
    const result = buildDryRunUseResult({
      projectRoot,
      frameworkRoot: projectRoot,
      providers: ['codex', 'claude'],
      scope: 'project',
      requestedBundles: ['sdlc'],
    });
    expect(result.outcome).toBe('planned');
    expect(result.exitClassification).toBe('preview');
    expect(result.providers.every((provider) => provider.outcome === 'planned')).toBe(true);
    expect(result.phases.every((item) => item.state === 'planned')).toBe(true);
  });

  it('reuses the verifier for status probe readiness', async () => {
    const fixture = await readyCodexFixture();
    const probe = await buildDeploymentStatusProbe(fixture.projectRoot, fixture.frameworkRoot);
    expect(probe).toMatchObject({
      schema: 'aiwg.status.probe.v1',
      engaged: true,
      status: 'ready-restart-required',
    });
  });
});
