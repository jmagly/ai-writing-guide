/** @issue #2039 */

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEvidenceBundle, verifyEvidenceBundle } from '../../../src/evidence/bundle.js';
import { evidenceHandler } from '../../../src/cli/handlers/evidence.js';
import { buildHandlerMap } from '../../../src/cli/handlers/index.js';
import type { HandlerContext } from '../../../src/cli/handlers/types.js';

const temporaryDirectories: string[] = [];
async function temporaryDirectory(): Promise<string> {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-evidence-'));
  temporaryDirectories.push(directory);
  return directory;
}
afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map(directory => fs.rm(directory, { recursive: true, force: true })));
});
function context(cwd: string, args: string[]): HandlerContext {
  return { cwd, frameworkRoot: cwd, args, rawArgs: ['evidence', ...args] };
}

async function fixtures(root: string, completeActivity = true) {
  const files = {
    activity: path.join(root, 'activity.json'), report: path.join(root, 'report.json'),
    source: path.join(root, 'source.ts'), config: path.join(root, 'eval.yaml'), provenance: path.join(root, 'prov.json'),
  };
  await fs.writeFile(files.activity, JSON.stringify({
    coverage: ['runtime', 'host'],
    completeness: { sequence_gaps: 0, durable_loss: false, dropped_events: 0 },
    collectors: { stale: [] },
    redaction: { status: 'complete' },
    restricted_content_grants: [],
    events: [],
    manifest: {
      tenant_id: 'tenant-a', event_count: 0, merkle_root: 'a'.repeat(64), key_id: 'sandbox-key-1', signature: 'fixture-signature',
      ...(completeActivity ? { clock_uncertainty: 'bounded-5ms' } : {}),
    },
  }, null, 2));
  await fs.writeFile(files.report, '{"score":95}\n');
  await fs.writeFile(files.source, 'export const fixture = true;\n');
  await fs.writeFile(files.config, 'mode: locked\n');
  await fs.writeFile(files.provenance, '{"entity":"report"}\n');
  return files;
}

describe('portable evidence bundles', () => {
  it('packages complete evidence with deterministic member hashes and checkpoint', async () => {
    const root = await temporaryDirectory();
    const files = await fixtures(root);
    const output = path.join(root, 'bundle');
    const manifest = await createEvidenceBundle({
      output,
      inputs: [
        { file: files.activity, role: 'activity-export' }, { file: files.report, role: 'report' },
        { file: files.source, role: 'source' }, { file: files.config, role: 'eval-config' },
        { file: files.provenance, role: 'provenance' },
      ],
      modelVersions: { evaluator: 'model-v1' }, toolVersions: { aiwg: '2026.8.8', node: 'v24' },
      now: new Date('2026-08-13T20:00:00Z'),
    });

    expect(manifest.status).toBe('complete');
    expect(manifest.members).toHaveLength(5);
    expect(manifest.activity).toMatchObject({
      coverage_label: 'host,runtime', sequence_gaps: 0, durable_loss: false, dropped_events: 0,
      stale_collectors: [], clock_uncertainty: 'bounded-5ms', redaction_status: 'complete',
      restricted_content_grants: [], signature_key_id: 'sandbox-key-1', signed_merkle_root: 'a'.repeat(64),
    });
    expect(manifest.verifier.root).toMatch(/^[0-9a-f]{64}$/);
    expect(manifest.members.every(member => !path.isAbsolute(member.source_name))).toBe(true);
    await expect(verifyEvidenceBundle(output)).resolves.toMatchObject({ valid: true, status: 'complete' });
    await expect(verifyEvidenceBundle(output, '0'.repeat(64))).resolves.toMatchObject({
      valid: false, errors: expect.arrayContaining(['bundle checkpoint does not match expected root']),
    });
  });

  it('detects modified and missing bundle members', async () => {
    const root = await temporaryDirectory();
    const files = await fixtures(root);
    const output = path.join(root, 'bundle');
    const manifest = await createEvidenceBundle({
      output, inputs: [{ file: files.report, role: 'report' }], modelVersions: {}, toolVersions: {},
    });
    const member = path.join(output, manifest.members[0].path);
    await fs.writeFile(member, 'modified\n');
    let result = await verifyEvidenceBundle(output);
    expect(result.valid).toBe(false);
    expect(result.errors.join('\n')).toMatch(/size changed|hash changed/);
    await fs.rm(member);
    result = await verifyEvidenceBundle(output);
    expect(result.errors).toContain(`member is missing: ${manifest.members[0].path}`);
  });

  it('detects undeclared bundle members', async () => {
    const root = await temporaryDirectory();
    const files = await fixtures(root);
    const output = path.join(root, 'bundle');
    await createEvidenceBundle({
      output, inputs: [{ file: files.report, role: 'report' }],
      modelVersions: { evaluator: 'model-v1' }, toolVersions: { aiwg: '2026.8.8' },
    });
    await fs.writeFile(path.join(output, 'members', 'injected.txt'), 'not declared\n');
    const result = await verifyEvidenceBundle(output);
    expect(result).toMatchObject({ valid: false });
    expect(result.errors).toContain('bundle contains an undeclared member: members/injected.txt');
  });

  it('labels incomplete activity evidence instead of silently passing it as complete', async () => {
    const root = await temporaryDirectory();
    const files = await fixtures(root, false);
    const output = path.join(root, 'bundle');
    const manifest = await createEvidenceBundle({
      output,
      inputs: [
        { file: files.activity, role: 'activity-export' }, { file: files.report, role: 'report' },
        { file: files.source, role: 'source' }, { file: files.config, role: 'eval-config' },
        { file: files.provenance, role: 'provenance' },
      ],
      modelVersions: { evaluator: 'model-v1' }, toolVersions: { aiwg: '2026.8.8' },
    });
    expect(manifest.status).toBe('incomplete');
    expect(manifest.incomplete_reasons).toContain('activity evidence is missing clock_uncertainty');
    const verified = await verifyEvidenceBundle(output);
    expect(verified.valid).toBe(true);
    expect(verified.status).toBe('incomplete');
    expect(verified.warnings).toContain('activity evidence is missing clock_uncertainty');
  });

  it('labels reported loss and stale collection as incomplete', async () => {
    const root = await temporaryDirectory();
    const files = await fixtures(root);
    const activity = JSON.parse(await fs.readFile(files.activity, 'utf8'));
    activity.completeness = { sequence_gaps: 2, durable_loss: true, dropped_events: 3 };
    activity.collectors.stale = ['guest-agent'];
    await fs.writeFile(files.activity, JSON.stringify(activity));
    const manifest = await createEvidenceBundle({
      output: path.join(root, 'bundle'),
      inputs: [
        { file: files.activity, role: 'activity-export' }, { file: files.report, role: 'report' },
        { file: files.source, role: 'source' }, { file: files.config, role: 'eval-config' },
        { file: files.provenance, role: 'provenance' },
      ],
      modelVersions: { evaluator: 'model-v1' }, toolVersions: { aiwg: '2026.8.8' },
    });
    expect(manifest.status).toBe('incomplete');
    expect(manifest.incomplete_reasons).toEqual(expect.arrayContaining([
      'activity evidence reports 2 sequence gap(s)', 'activity evidence reports durable loss',
      'activity evidence reports 3 dropped event(s)', 'activity evidence reports stale collectors: guest-agent',
    ]));
  });

  it('refuses to copy restricted activity content into a portable bundle', async () => {
    const root = await temporaryDirectory();
    const files = await fixtures(root);
    const activity = JSON.parse(await fs.readFile(files.activity, 'utf8'));
    activity.events.push({ event_type: 'terminal.output', payload: { content: 'sensitive output' } });
    await fs.writeFile(files.activity, JSON.stringify(activity));

    await expect(createEvidenceBundle({
      output: path.join(root, 'bundle'),
      inputs: [{ file: files.activity, role: 'activity-export' }],
      modelVersions: { evaluator: 'model-v1' }, toolVersions: { aiwg: '2026.8.8' },
    })).rejects.toThrow('prohibited credential or restricted-content fields');
    await expect(fs.stat(path.join(root, 'bundle'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('refuses malformed activity before creating a partial bundle', async () => {
    const root = await temporaryDirectory();
    const activity = path.join(root, 'activity.json');
    const output = path.join(root, 'bundle');
    await fs.writeFile(activity, '{"events": [}');
    await expect(createEvidenceBundle({
      output, inputs: [{ file: activity, role: 'activity-export' }],
    })).rejects.toThrow('refusing to copy unassessed activity evidence');
    await expect(fs.stat(output)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('emits an explicit NOT RUN manifest in check-only mode', async () => {
    const root = await temporaryDirectory();
    const result = await evidenceHandler.execute(context(root, [
      'export', '--output', 'not-run-bundle', '--check-only', '--not-run', 'sandbox runtime unavailable', '--json',
    ]));
    expect(result.exitCode).toBe(0);
    const manifest = JSON.parse(result.message!);
    expect(manifest).toMatchObject({ status: 'not-run', not_run_reason: 'sandbox runtime unavailable' });
    const verified = await verifyEvidenceBundle(path.join(root, 'not-run-bundle'));
    expect(verified).toMatchObject({ valid: true, status: 'not-run' });
    expect(verified.warnings).toContain('NOT RUN: sandbox runtime unavailable');
  });

  it('requires check-only and a NOT RUN reason together', async () => {
    const root = await temporaryDirectory();
    await expect(evidenceHandler.execute(context(root, ['export', '--output', 'bundle', '--check-only'])))
      .resolves.toMatchObject({ exitCode: 2, message: expect.stringContaining('must be used together') });
    await expect(fs.stat(path.join(root, 'bundle'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('registers the evidence verifier command', () => {
    expect(buildHandlerMap().get('evidence')).toBe(evidenceHandler);
  });
});
