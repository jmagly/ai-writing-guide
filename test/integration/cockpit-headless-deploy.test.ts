import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {
  createPlan,
  rollbackLedger,
  stagePlan,
  validateManifestContract,
} from '../../agentic/code/addons/agentic-installer/skills/cockpit-headless-deploy/scripts/headless-plan.mjs';

const manifestText = `apiVersion: setup.aiwg.io/v1
kind: SetupManifest
metadata:
  name: aiwg-cockpit-agentic-sandbox
spec:
  execution_mode: provider-orchestrated
`;

describe('guided Cockpit headless deployment (#2138)', () => {
  let root: string;

  beforeEach(async () => {
    root = await mkdtemp(path.join(os.tmpdir(), 'aiwg-cockpit-headless-'));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('blocks mutation on executor-host ambiguity with one focused question', () => {
    const contract = validateManifestContract(manifestText);
    const plan = createPlan({ manifest: 'setup.aiwg.yaml', cockpitHost: 'headless-1' }, contract);

    expect(plan).toEqual({
      schema: 'aiwg.cockpit-headless-plan/v1',
      status: 'question',
      mutation_allowed: false,
      question: 'Will Agentic Sandbox run on the Cockpit host headless-1, or a different host?',
    });
  });

  it('stages a same-host Linux service plan with loopback defaults and independent runtime evidence', async () => {
    const contract = validateManifestContract(manifestText);
    const plan = createPlan({
      manifest: 'setup.aiwg.yaml',
      cockpitHost: 'headless-1',
      executorHost: 'headless-1',
      operatorHost: 'operator-1',
    }, contract);
    const staged = await stagePlan(plan, root);

    expect(staged.topology).toMatchObject({ kind: 'same-host', operator_access: 'explicit-forward-required', bridge_to_executor: 'loopback' });
    expect(staged.preview.runtime_tiers).toEqual(expect.arrayContaining([
      expect.objectContaining({ id: 'host', verify_independently: true }),
      expect.objectContaining({ id: 'docker', verify_independently: true }),
      expect.objectContaining({ id: 'vm', pass_requires: '/dev/kvm' }),
    ]));
    const sandboxUnit = await readFile(path.join(root, 'systemd', 'user', 'agentic-sandbox.service'), 'utf8');
    const cockpitUnit = await readFile(path.join(root, 'systemd', 'user', 'aiwg-cockpit.service'), 'utf8');
    expect(sandboxUnit).toContain('127.0.0.1');
    expect(cockpitUnit).toContain('Environment=HOST=127.0.0.1');
    expect(cockpitUnit).toContain('After=agentic-sandbox.service');
    expect(cockpitUnit).toContain('Requires=agentic-sandbox.service');
    expect(staged.manifest).toMatchObject({ contract_owner: 'setup.aiwg.yaml', execution_mode: 'provider-orchestrated' });
  });

  it('models cross-host operator access separately from Bridge transport', () => {
    const plan = createPlan({
      manifest: 'setup.aiwg.yaml',
      cockpitHost: 'cockpit-1',
      executorHost: 'sandbox-1',
      operatorHost: 'laptop-1',
    }, validateManifestContract(manifestText));

    expect(plan.topology).toMatchObject({
      kind: 'cross-host',
      operator_access: 'explicit-forward-required',
      bridge_to_executor: 'explicit-trusted-transport-required',
    });
    expect(plan.preview.services.every(service => service.bind === '127.0.0.1')).toBe(true);
  });

  it('rolls back only ledger-owned resources and preserves unrelated files', async () => {
    const unrelated = path.join(root, 'keep.txt');
    await writeFile(unrelated, 'preserve');
    const plan = createPlan({
      manifest: 'setup.aiwg.yaml', cockpitHost: 'headless-1', executorHost: 'headless-1',
    }, validateManifestContract(manifestText));
    const staged = await stagePlan(plan, root);
    const result = await rollbackLedger(staged.ledger);

    expect(result).toMatchObject({ status: 'rolled-back', removed_count: 2 });
    expect(existsSync(unrelated)).toBe(true);
    expect(existsSync(path.join(root, 'systemd', 'user', 'aiwg-cockpit.service'))).toBe(false);
  });

  it('refuses rollback entries outside the attempt root', async () => {
    const ledger = path.join(root, 'bad-ledger.json');
    await writeFile(ledger, JSON.stringify({
      schema: 'aiwg.cockpit-headless-ledger/v1',
      root,
      resources: [{ path: path.join(os.tmpdir(), 'not-owned'), created: true }],
    }));
    await expect(rollbackLedger(ledger)).rejects.toThrow('out-of-root');
  });
});
