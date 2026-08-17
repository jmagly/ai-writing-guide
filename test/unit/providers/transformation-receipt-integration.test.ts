import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { emptyConfig, updateInstalled, writeAiwgConfig } from '../../../src/config/aiwg-config.js';
import {
  diagnoseIntegratedProviderTransformationReceipt,
  finalizeProviderTransformationReceipt,
  resolveProviderReceiptRuntimeEvidence,
} from '../../../src/providers/transformation-receipt-integration.js';
import type { ArtifactVerificationResult } from '../../../src/security/artifact-verifier.js';

const roots: string[] = [];

async function tempRoot(prefix: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), prefix));
  roots.push(root);
  return root;
}

async function fixture(split = false) {
  const projectRoot = await tempRoot('aiwg-receipt-control-');
  const outputRoot = split ? await tempRoot('aiwg-receipt-output-') : projectRoot;
  const frameworkRoot = await tempRoot('aiwg-receipt-framework-');
  const manifest = path.join(frameworkRoot, 'agentic/code/frameworks/sdlc-complete/manifest.json');
  await mkdir(path.dirname(manifest), { recursive: true });
  const manifestBytes = '{"id":"sdlc-complete","version":"1"}\n';
  await writeFile(manifest, manifestBytes);

  const commands = path.join(outputRoot, '.codex', 'commands');
  await mkdir(commands, { recursive: true });
  await writeFile(path.join(commands, 'managed.md'), '# aiwg:managed v1 bundled\nmanaged\n');
  await writeFile(path.join(commands, 'operator.md'), '# operator-owned\n');
  await writeFile(path.join(commands, '.aiwg-manifest.json'), JSON.stringify({
    managed: { 'managed.md': { hash: 'sha256:fixture' } },
  }));
  const skill = path.join(outputRoot, '.agents', 'skills', 'managed-skill');
  await mkdir(skill, { recursive: true });
  await writeFile(path.join(skill, '.aiwg-managed'), 'aiwg\n');
  await writeFile(path.join(skill, 'SKILL.md'), '# Managed skill\n');

  const config = updateInstalled(emptyConfig(['codex']), 'sdlc', 'codex', {
    agents: 0, commands: 1, skills: 1, rules: 0,
  }, { version: '1', source: 'bundled' });
  await writeAiwgConfig(projectRoot, config);
  return {
    projectRoot,
    outputRoot,
    frameworkRoot,
    manifestDigest: createHash('sha256').update(manifestBytes).digest('hex'),
  };
}

function verifiedSource(sha256: string): ArtifactVerificationResult {
  return {
    schemaVersion: 'aiwg.verify.result.v1',
    status: 'verified',
    exitCode: 0,
    artifact: { name: 'agentic/code/frameworks/sdlc-complete/manifest.json', sha256 },
    policy: 'test-threshold-policy',
    identities: ['test-release-signer'],
    rootVersion: 1,
    diagnostics: [],
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('provider transformation receipt integration', () => {
  it('does not claim authentication from readability and binds only managed outputs idempotently', async () => {
    const roots = await fixture();
    const options = {
      ...roots,
      provider: 'codex',
      scope: 'project' as const,
      requestedBundles: ['sdlc'],
    };
    const evidence = await resolveProviderReceiptRuntimeEvidence(options);
    expect(evidence.source.verification).toBe('policy-exempt');
    const sourceVerifications = { sdlc: verifiedSource(roots.manifestDigest) };
    expect((await resolveProviderReceiptRuntimeEvidence({ ...options, sourceVerifications })).source.verification)
      .toBe('verified');
    expect(evidence.outputPaths).toEqual(expect.arrayContaining([
      '.agents/skills/managed-skill/.aiwg-managed',
      '.agents/skills/managed-skill/SKILL.md',
      '.codex/commands/.aiwg-manifest.json',
      '.codex/commands/managed.md',
    ]));
    expect(evidence.outputPaths).not.toContain('.codex/commands/operator.md');

    expect(await finalizeProviderTransformationReceipt(options)).toMatchObject({
      status: 'skipped',
      reason: 'authenticated canonical source evidence was not supplied',
    });
    const authenticated = { ...options, sourceVerifications };
    const first = await finalizeProviderTransformationReceipt({ ...authenticated, generatedAt: '2026-08-16T20:00:00.000Z' });
    expect(first.status).toBe('written');
    const before = await readFile(first.receiptPath!);
    await writeFile(path.join(roots.outputRoot, '.codex', 'commands', 'operator.md'), '# operator changed\n');
    const repeated = await finalizeProviderTransformationReceipt({ ...authenticated, generatedAt: '2026-08-17T20:00:00.000Z' });
    expect(await readFile(repeated.receiptPath!)).toEqual(before);
    expect((await diagnoseIntegratedProviderTransformationReceipt(options)).status).toBe('verified');

    const mismatched = await finalizeProviderTransformationReceipt({
      ...options,
      sourceVerifications: { sdlc: verifiedSource('0'.repeat(64)) },
    });
    expect(mismatched).toMatchObject({ status: 'skipped', reason: 'canonical source verification failed' });
  });

  it('keeps receipts in the control root while diagnosing a configured split output root', async () => {
    const roots = await fixture(true);
    const options = {
      ...roots,
      provider: 'codex',
      scope: 'project' as const,
      requestedBundles: ['sdlc'],
    };
    const finalized = await finalizeProviderTransformationReceipt({
      ...options,
      sourceVerifications: { sdlc: verifiedSource(roots.manifestDigest) },
    });
    expect(finalized.receiptPath).toBe(path.join(
      roots.projectRoot, '.aiwg', 'receipts', 'providers', 'codex.project.json',
    ));
    expect((await diagnoseIntegratedProviderTransformationReceipt(options)).status).toBe('verified');

    await writeFile(path.join(roots.outputRoot, '.codex', 'commands', 'managed.md'), '# changed\n');
    expect((await diagnoseIntegratedProviderTransformationReceipt(options)).findings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'user-modification' })]));
  });
});
