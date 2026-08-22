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
  sourceVerificationsFromSignedWebRelease,
} from '../../../src/providers/transformation-receipt-integration.js';
import type { ArtifactVerificationResult } from '../../../src/security/artifact-verifier.js';
import type { VerifiedWebRelease } from '../../../src/resources/web-release.js';

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
  const manifestDigest = createHash('sha256').update(manifestBytes).digest('hex');
  return {
    projectRoot,
    outputRoot,
    frameworkRoot,
    manifestDigest,
    bundleDigest: createHash('sha256').update(JSON.stringify([{
      bytes: Buffer.byteLength(manifestBytes),
      path: 'manifest.json',
      sha256: manifestDigest,
    }])).digest('hex'),
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

function signedRelease(descriptors: Array<{ path: string; sha256: string; size: number }>): VerifiedWebRelease {
  return {
    selector: '2026.8.12',
    selectorKind: 'exact',
    version: '2026.8.12',
    manifestDigest: 'a'.repeat(64),
    baseUrl: 'https://releases.aiwg.io',
    manifestUrl: 'https://releases.aiwg.io/resources/2026.8.12/manifest.json',
    cacheDir: '/verified-cache',
    releaseManifestPath: '/verified-cache/manifest.json',
    releaseSignaturePath: '/verified-cache/manifest.sig',
    fortemiManifestPath: '/verified-cache/fortemi-manifest.json',
    fortemiExportPath: '/verified-cache/fortemi-export.json',
    fortemiManifestSha256: 'b'.repeat(64),
    fortemiManifestSize: 1,
    fortemiExportSha256: 'c'.repeat(64),
    fortemiExportSize: 1,
    descriptors: new Map(descriptors.map(descriptor => [descriptor.path, descriptor])),
  };
}

afterEach(async () => {
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('provider transformation receipt integration', () => {
  it('uses the exact signed web-release descriptor as the bundled source trust handoff', async () => {
    const roots = await fixture();
    const options = {
      ...roots,
      provider: 'codex',
      scope: 'project' as const,
      requestedBundles: ['sdlc'],
    };
    const manifestBytes = await readFile(path.join(
      roots.frameworkRoot,
      'agentic/code/frameworks/sdlc-complete/manifest.json',
    ));
    const rulePath = path.join(roots.frameworkRoot, 'agentic/code/frameworks/sdlc-complete/rules/example.md');
    const ruleBytes = Buffer.from('# Signed rule\n');
    await mkdir(path.dirname(rulePath), { recursive: true });
    await writeFile(rulePath, ruleBytes);
    const ruleDigest = createHash('sha256').update(ruleBytes).digest('hex');
    const bundleDigest = createHash('sha256').update(JSON.stringify([
      { bytes: manifestBytes.byteLength, path: 'manifest.json', sha256: roots.manifestDigest },
      { bytes: ruleBytes.byteLength, path: 'rules/example.md', sha256: ruleDigest },
    ])).digest('hex');
    const release = signedRelease([
      {
        path: 'raw/agentic/code/frameworks/sdlc-complete/manifest.json',
        sha256: roots.manifestDigest,
        size: manifestBytes.byteLength,
      },
      {
        path: 'raw/agentic/code/frameworks/sdlc-complete/rules/example.md',
        sha256: ruleDigest,
        size: ruleBytes.byteLength,
      },
    ]);
    const verified = await sourceVerificationsFromSignedWebRelease(options, release);
    expect(verified.sdlc).toMatchObject({
      status: 'verified',
      artifact: {
        name: 'aiwg:bundle-inventory:sdlc',
        sha256: bundleDigest,
      },
      policy: 'aiwg-signed-web-release',
    });
    expect((await finalizeProviderTransformationReceipt({ ...options, sourceVerifications: verified })).status)
      .toBe('written');

    const substituted = signedRelease([
      {
        path: 'raw/agentic/code/frameworks/sdlc-complete/manifest.json',
        sha256: roots.manifestDigest,
        size: manifestBytes.byteLength,
      },
      {
        path: 'raw/agentic/code/frameworks/sdlc-complete/rules/example.md',
        sha256: '0'.repeat(64),
        size: ruleBytes.byteLength,
      },
    ]);
    expect(await sourceVerificationsFromSignedWebRelease(options, substituted)).toEqual({});
  });

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
    const sourceVerifications = { sdlc: verifiedSource(roots.bundleDigest) };
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
      sourceVerifications: { sdlc: verifiedSource(roots.bundleDigest) },
    });
    expect(finalized.receiptPath).toBe(path.join(
      roots.projectRoot, '.aiwg', 'receipts', 'providers', 'codex.project.json',
    ));
    expect((await diagnoseIntegratedProviderTransformationReceipt(options)).status).toBe('verified');

    await writeFile(path.join(roots.outputRoot, '.codex', 'commands', 'managed.md'), '# changed\n');
    expect((await diagnoseIntegratedProviderTransformationReceipt(options)).findings)
      .toEqual(expect.arrayContaining([expect.objectContaining({ kind: 'user-modification' })]));
  });

  it('records local-source policy exemption without reporting missing receipt', async () => {
    const roots = await fixture();
    const options = {
      ...roots,
      provider: 'codex',
      scope: 'project' as const,
      requestedBundles: ['sdlc'],
      sourceDisposition: 'local-source' as const,
    };
    const finalized = await finalizeProviderTransformationReceipt(options);
    expect(finalized).toMatchObject({
      status: 'policy-exempt',
      receiptPath: null,
      evidenceStatePath: path.join(
        roots.projectRoot, '.aiwg', 'receipts', 'providers', 'codex.project.evidence.json',
      ),
    });
    expect(await diagnoseIntegratedProviderTransformationReceipt(options)).toMatchObject({
      status: 'policy-exempt',
      findings: [expect.objectContaining({ kind: 'policy-exempt' })],
    });
  });

  it('records unavailable stable-release evidence with explicit status semantics', async () => {
    const roots = await fixture();
    const options = {
      ...roots,
      provider: 'codex',
      scope: 'project' as const,
      requestedBundles: ['sdlc'],
      sourceDisposition: 'source-unavailable' as const,
    };
    expect(await finalizeProviderTransformationReceipt(options)).toMatchObject({ status: 'source-unavailable' });
    expect(await diagnoseIntegratedProviderTransformationReceipt(options)).toMatchObject({
      status: 'source-evidence-unavailable',
      findings: [expect.objectContaining({ kind: 'source-evidence-unavailable' })],
    });
  });
});
