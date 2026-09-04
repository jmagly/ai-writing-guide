import { chmodSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkContract,
  LIVE_GATE,
  PI_PACKAGE,
  PI_VERSION,
  qualify,
} from '../../../tools/providers/pi-live-smoke.mjs';

const roots: string[] = [];
const stub = resolve(__dirname, '../../fixtures/providers/pi/pi-stub.mjs');

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('Pi live smoke', () => {
  it('is cost-free, pinned, ephemeral, isolated, and disabled in normal CI', () => {
    expect(checkContract()).toEqual({
      live: false,
      normalCiCostUsd: 0,
      requiredGate: 'AIWG_PI_LIVE_SMOKE=1',
      credential: 'OPENROUTER_API_KEY',
      package: PI_PACKAGE,
      version: PI_VERSION,
      installation: 'ephemeral npx package',
      isolatedEnvironment: ['PI_CODING_AGENT_DIR', 'PI_CODING_AGENT_SESSION_DIR'],
      trustPolicy: '--no-approve',
      modes: ['list-models', 'json', 'rpc'],
    });
  });

  it('rejects missing gate, credential, and model before invocation', () => {
    expect(() => qualify({ model: 'fixture/model:free', 'pi-bin': stub }, {})).toThrow(
      'Live Pi smoke is disabled',
    );
    expect(() => qualify(
      { model: 'fixture/model:free', 'pi-bin': stub },
      { [LIVE_GATE]: '1' },
    )).toThrow('OPENROUTER_API_KEY is required');
    expect(() => qualify(
      { 'pi-bin': stub },
      { [LIVE_GATE]: '1', OPENROUTER_API_KEY: 'fixture-secret' },
    )).toThrow('--model is required');
  });

  it('qualifies discovery, strict JSONL, settlement, and RPC through an isolated stub', () => {
    chmodSync(stub, 0o755);
    const evidence = qualify(
      { model: 'fixture/model:free', 'pi-bin': stub },
      {
        [LIVE_GATE]: '1',
        OPENROUTER_API_KEY: 'fixture-secret',
        PATH: process.env.PATH,
      },
    );
    expect(evidence).toMatchObject({
      status: 'pass',
      expectedVersion: '0.85.0',
      observedVersion: '0.85.0',
      model: 'fixture/model:free',
      trustPolicy: '--no-approve',
      isolation: { temporaryHome: true, globalInstallRequired: false },
      discovery: { provider: 'openrouter', requestedModelPresent: true },
      rpc: { strictJsonl: true, commands: ['get_state', 'abort'] },
      inference: { strictJsonl: true, settled: true },
      secretHandling: { credentialPersisted: false, rawOutputPersisted: false },
    });
    expect(evidence.inference.eventTypes).toContain('agent_settled');
  });
});
