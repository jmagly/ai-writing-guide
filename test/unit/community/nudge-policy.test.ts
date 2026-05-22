import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const ORIGINAL_ENV = { ...process.env };
const ORIGINAL_TTY = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
let configDir: string;

function setStdoutTty(value: boolean) {
  Object.defineProperty(process.stdout, 'isTTY', { configurable: true, value });
}

async function loadPolicy() {
  vi.resetModules();
  return await import('../../../src/community/nudge-policy.js');
}

beforeEach(() => {
  configDir = mkdtempSync(path.join(tmpdir(), 'aiwg-nudge-'));
  process.env = { ...ORIGINAL_ENV, AIWG_CONFIG: configDir };
  delete process.env.AIWG_NO_NUDGE;
  delete process.env.CI;
  setStdoutTty(true);
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  if (ORIGINAL_TTY) Object.defineProperty(process.stdout, 'isTTY', ORIGINAL_TTY);
  rmSync(configDir, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe('community nudge policy', () => {
  it('suppresses when AIWG_NO_NUDGE is set', async () => {
    process.env.AIWG_NO_NUDGE = '1';
    const { shouldShowNudge } = await loadPolicy();
    expect(shouldShowNudge('intake')).toBe(false);
  });

  it('suppresses in CI and non-TTY output', async () => {
    const { shouldShowNudge } = await loadPolicy();
    process.env.CI = 'true';
    expect(shouldShowNudge('discovery-footer')).toBe(false);
    delete process.env.CI;
    setStdoutTty(false);
    expect(shouldShowNudge('discovery-footer')).toBe(false);
  });

  it('suppresses when user config disables community nudges', async () => {
    writeFileSync(path.join(configDir, 'config.yaml'), `community:\n  nudges: false\n`, 'utf8');
    const { shouldShowNudge } = await loadPolicy();
    expect(shouldShowNudge('milestone')).toBe(false);
  });

  it('throttles intake and footer contexts independently', async () => {
    const { markNudgeShown, shouldShowNudge } = await loadPolicy();
    const now = new Date('2026-05-21T18:00:00Z');
    expect(shouldShowNudge('intake', { now })).toBe(true);
    markNudgeShown('intake', { now });
    expect(shouldShowNudge('intake', { now: new Date('2026-06-01T18:00:00Z') })).toBe(false);
    expect(shouldShowNudge('intake', { now: new Date('2026-09-01T18:00:00Z') })).toBe(true);

    markNudgeShown('discovery-footer', { now });
    expect(shouldShowNudge('discovery-footer', { now: new Date('2026-05-25T18:00:00Z') })).toBe(false);
    expect(shouldShowNudge('discovery-footer', { now: new Date('2026-05-29T18:00:00Z') })).toBe(true);
  });
});
