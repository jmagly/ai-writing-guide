import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { afterEach, describe, expect, it } from 'vitest';

import {
  createProviderTransformationReceipt,
  diagnoseProviderTransformationReceipt,
  providerTransformationReceiptPath,
  validateProviderTransformationReceipt,
  writeProviderTransformationReceipt,
} from '../../../src/providers/transformation-receipt.js';
import schema from '../../../schemas/providers/aiwg-provider-transformation-receipt.v1.schema.json';

const roots: string[] = [];
const source = { subject: 'aiwg:bundle:all@2026.8.16', sha256: 'a'.repeat(64), verification: 'verified' as const };
const transformer = {
  id: 'aiwg-provider-transformer',
  version: '2026.8.16',
  providerAdapter: 'codex',
  providerAdapterVersion: '1',
};

async function fixture() {
  const root = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-'));
  roots.push(root);
  await mkdir(path.join(root, '.codex', 'skills', 'example'), { recursive: true });
  await writeFile(path.join(root, '.codex', 'skills', 'example', 'SKILL.md'), '# example\n');
  const receipt = await createProviderTransformationReceipt({
    projectRoot: root,
    provider: 'codex',
    scope: 'project',
    generatedAt: '2026-08-16T20:00:00.000Z',
    source,
    transformer,
    outputPaths: ['.codex/skills/example/SKILL.md'],
  });
  return { root, receipt };
}

afterEach(async () => {
  const { rm } = await import('node:fs/promises');
  await Promise.all(roots.splice(0).map(root => rm(root, { recursive: true, force: true })));
});

describe('provider transformation receipts', () => {
  it('emits portable non-sensitive identifiers and validates against the public schema', async () => {
    const { root, receipt } = await fixture();
    const destination = await writeProviderTransformationReceipt(root, receipt);
    const ajv = new Ajv2020({ strict: false, allErrors: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    expect(validate(receipt), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(validate({ ...receipt, provider: 'a/../../escape' })).toBe(false);
    expect(receipt.outputs[0].path).toBe('.codex/skills/example/SKILL.md');
    expect(JSON.stringify(receipt)).not.toContain(root);
    expect(validateProviderTransformationReceipt(JSON.parse(await readFile(destination, 'utf8')))).toEqual(receipt);
  });

  it('distinguishes missing receipt, source failure, transformer drift, stale source, output edits, and partial deployment', async () => {
    const { root, receipt } = await fixture();
    expect((await diagnoseProviderTransformationReceipt({ projectRoot: root, provider: 'codex', scope: 'project' })).findings[0].kind)
      .toBe('missing-receipt');

    await writeProviderTransformationReceipt(root, receipt);
    expect((await diagnoseProviderTransformationReceipt({
      projectRoot: root, provider: 'codex', scope: 'project', source, transformer,
    })).status).toBe('verified');

    const sourceFailure = await diagnoseProviderTransformationReceipt({
      projectRoot: root,
      provider: 'codex',
      scope: 'project',
      source: { ...source, verification: 'failed' },
      transformer,
    });
    expect(sourceFailure.findings.map(item => item.kind)).toContain('source-verification-failure');

    const adapterDrift = await diagnoseProviderTransformationReceipt({
      projectRoot: root,
      provider: 'codex',
      scope: 'project',
      source: { ...source, sha256: 'b'.repeat(64) },
      transformer: { ...transformer, providerAdapterVersion: '2' },
    });
    expect(adapterDrift.findings.map(item => item.kind)).toEqual(expect.arrayContaining(['stale-output', 'transformation-mismatch']));

    await writeFile(path.join(root, '.codex', 'skills', 'example', 'SKILL.md'), '# user edit\n');
    expect((await diagnoseProviderTransformationReceipt({ projectRoot: root, provider: 'codex', scope: 'project' })).findings[0].kind)
      .toBe('user-modification');

    const { rm } = await import('node:fs/promises');
    await rm(path.join(root, '.codex', 'skills', 'example', 'SKILL.md'));
    expect((await diagnoseProviderTransformationReceipt({ projectRoot: root, provider: 'codex', scope: 'project' })).findings[0].kind)
      .toBe('stale-output');
  });

  it('rejects absolute/traversing paths and receipts without outputs', async () => {
    const { root } = await fixture();
    await expect(createProviderTransformationReceipt({
      projectRoot: root,
      provider: 'codex',
      scope: 'project',
      source,
      transformer,
      outputPaths: ['../secret'],
    })).rejects.toThrow(/portable root/);
    expect(() => validateProviderTransformationReceipt({
      schemaVersion: 'aiwg.provider-transformation-receipt.v1',
      generatedAt: new Date().toISOString(),
      scope: 'project',
      provider: 'codex',
      source,
      transformer,
      outputs: [],
    })).toThrow(/must not be empty/);
    expect(() => validateProviderTransformationReceipt({
      schemaVersion: 'aiwg.provider-transformation-receipt.v1',
      generatedAt: new Date().toISOString(),
      scope: 'project',
      provider: 'codex',
      source: { ...source, verification: 'policy-exempt' },
      transformer,
      outputs: [{ path: '.codex/commands/example.md', sha256: 'a'.repeat(64), bytes: 1 }],
    })).toThrow(/must be verified/);
    expect(() => providerTransformationReceiptPath(root, 'a/../../escape', 'project'))
      .toThrow(/portable filename segment/);
  });

  it('keeps receipt bytes stable across idempotent regeneration and split control/output roots', async () => {
    const controlRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-control-'));
    const corpusRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-corpus-'));
    roots.push(controlRoot, corpusRoot);
    await mkdir(path.join(corpusRoot, '.codex', 'rules'), { recursive: true });
    await writeFile(path.join(corpusRoot, '.codex', 'rules', 'managed.md'), '<!-- aiwg-managed -->\n');
    const first = await createProviderTransformationReceipt({
      projectRoot: controlRoot,
      outputRoot: corpusRoot,
      provider: 'codex', scope: 'project', generatedAt: '2026-08-16T20:00:00.000Z',
      source, transformer, outputPaths: ['.codex/rules/managed.md'],
    });
    const destination = await writeProviderTransformationReceipt(controlRoot, first);
    const before = await readFile(destination);
    const repeated = await createProviderTransformationReceipt({
      projectRoot: controlRoot,
      outputRoot: corpusRoot,
      provider: 'codex', scope: 'project', generatedAt: '2026-08-17T20:00:00.000Z',
      source, transformer, outputPaths: ['.codex/rules/managed.md'],
    });
    await writeProviderTransformationReceipt(controlRoot, repeated);
    expect(await readFile(destination)).toEqual(before);
    expect((await diagnoseProviderTransformationReceipt({
      projectRoot: controlRoot,
      outputRoot: corpusRoot,
      provider: 'codex', scope: 'project', source, transformer,
    })).status).toBe('verified');
  });

  it('routes project receipts through a pointer-configured external artifact root', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-project-'));
    const corpusRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-corpus-'));
    roots.push(projectRoot, corpusRoot);
    await writeFile(path.join(projectRoot, '.aiwg-location'), `${corpusRoot}\n`);
    await mkdir(path.join(projectRoot, '.codex', 'rules'), { recursive: true });
    await writeFile(path.join(projectRoot, '.codex', 'rules', 'managed.md'), '<!-- aiwg-managed -->\n');
    const receipt = await createProviderTransformationReceipt({
      projectRoot,
      provider: 'codex', scope: 'project', source, transformer,
      outputPaths: ['.codex/rules/managed.md'],
    });

    const destination = await writeProviderTransformationReceipt(projectRoot, receipt);

    expect(destination).toBe(path.join(corpusRoot, 'receipts', 'providers', 'codex.project.json'));
    await expect(readFile(path.join(projectRoot, '.aiwg', 'receipts', 'providers', 'codex.project.json')))
      .rejects.toMatchObject({ code: 'ENOENT' });
    expect((await diagnoseProviderTransformationReceipt({
      projectRoot, provider: 'codex', scope: 'project', source, transformer,
    })).status).toBe('verified');
  });

  it('refuses to recreate an unavailable external root or fall back locally', async () => {
    const projectRoot = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-offline-'));
    roots.push(projectRoot);
    const externalRoot = path.join(projectRoot, '..', `offline-${path.basename(projectRoot)}`, '.aiwg');
    await writeFile(path.join(projectRoot, '.aiwg-location'), `${externalRoot}\n`);
    const receipt = validateProviderTransformationReceipt({
      schemaVersion: 'aiwg.provider-transformation-receipt.v1',
      generatedAt: new Date().toISOString(),
      provider: 'codex', scope: 'project', source, transformer,
      outputs: [{ path: '.codex/rules/managed.md', sha256: 'a'.repeat(64), bytes: 1 }],
    });

    await expect(writeProviderTransformationReceipt(projectRoot, receipt)).rejects.toThrow(
      /Configured external AIWG artifact root is unavailable/,
    );
    await expect(readFile(path.join(projectRoot, '.aiwg', 'receipts', 'providers', 'codex.project.json')))
      .rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('rejects symbolic-link outputs instead of hashing data outside the output root', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-link-'));
    roots.push(root);
    await mkdir(path.join(root, '.codex', 'rules'), { recursive: true });
    await writeFile(path.join(root, 'outside.md'), 'operator data\n');
    await symlink(path.join(root, 'outside.md'), path.join(root, '.codex', 'rules', 'managed.md'));
    await expect(createProviderTransformationReceipt({
      projectRoot: root,
      provider: 'codex', scope: 'project', source, transformer,
      outputPaths: ['.codex/rules/managed.md'],
    })).rejects.toThrow(/must not be a symbolic link/);
  });

  it('rejects output paths that escape through an intermediate symbolic-link directory', async () => {
    const root = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-link-root-'));
    const outside = await mkdtemp(path.join(tmpdir(), 'aiwg-receipt-link-outside-'));
    roots.push(root, outside);
    await writeFile(path.join(outside, 'secret.md'), 'operator data\n');
    await symlink(outside, path.join(root, 'managed'));
    await expect(createProviderTransformationReceipt({
      projectRoot: root,
      provider: 'codex', scope: 'project', source, transformer,
      outputPaths: ['managed/secret.md'],
    })).rejects.toThrow(/outside its configured root/);
  });
});
