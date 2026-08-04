/**
 * Unit tests for aiwg install handler
 *
 * @source @src/cli/handlers/install.ts
 * @implements #557
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../../../src/packages/registry.js', () => ({
  installPackage: vi.fn(),
}));

vi.mock('../../../../src/packages/package-registry.js', () => ({
  recordDeployment: vi.fn(),
}));

vi.mock('../../../../src/marketplace/exchange.js', () => ({
  marketplaceConfigDir: vi.fn(({ projectLocal, projectDir }) => projectLocal ? `${projectDir}/.aiwg` : '/mock/.aiwg'),
  resolveVerificationPolicy: vi.fn(async () => ({
    policy: {},
    trustStore: { schemaVersion: 'aiwg.marketplace.trust-store.v1', keys: [] },
  })),
}));

// Shared runner so tests can inspect and override `run`
const mockRun = vi.fn().mockResolvedValue({ exitCode: 0, output: '' });
vi.mock('../../../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(() => ({ run: mockRun })),
}));

vi.mock('../../../../src/cli/ui.js', () => ({
  blank: vi.fn(),
  rule: vi.fn(),
  info: vi.fn(),
  success: vi.fn(),
  warn: vi.fn(),
  dim: vi.fn(),
  dimText: vi.fn((s: string) => s),
  bold: vi.fn((s: string) => s),
  brandMark: vi.fn(() => '◆'),
}));

function makeCtx(args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['install', ...args],
    cwd: '/tmp/myproject',
    frameworkRoot: '/opt/aiwg',
  };
}

describe('installHandler', () => {
  let mockInstallPackage: ReturnType<typeof vi.fn>;
  let mockRecordDeployment: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset shared run mock to success
    mockRun.mockResolvedValue({ exitCode: 0, output: '' });

    const reg = await import('../../../../src/packages/registry.js');
    const pkgReg = await import('../../../../src/packages/package-registry.js');
    mockInstallPackage = reg.installPackage as ReturnType<typeof vi.fn>;
    mockRecordDeployment = pkgReg.recordDeployment as ReturnType<typeof vi.fn>;

    mockInstallPackage.mockResolvedValue({
      cachePath: '/home/user/.cache/aiwg/packages/roko/ring-methodology@latest',
      key: 'roko/ring-methodology',
      type: 'framework',
      namespace: 'roko',
      lock: { lockId: `sha256:${'a'.repeat(64)}` },
      verification: { status: 'integrity-only' },
    });
    mockRecordDeployment.mockResolvedValue(undefined);
  });

  describe('handler metadata', () => {
    it('has correct id and category', async () => {
      const { installHandler } = await import('../../../../src/cli/handlers/install.js');
      expect(installHandler.id).toBe('install');
      expect(installHandler.category).toBe('framework');
    });
  });

  describe('missing ref', () => {
    it('returns exitCode 1 with usage info when no ref provided', async () => {
      const { installHandler } = await import('../../../../src/cli/handlers/install.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await installHandler.execute(makeCtx([]));

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Package reference required');
      expect(result.message).toContain('owner/name');
      expect(result.message).toContain('github:owner/name');
    });
  });

  describe('install without deploy', () => {
    it('calls installPackage and returns exitCode 0', async () => {
      const { installHandler } = await import('../../../../src/cli/handlers/install.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await installHandler.execute(makeCtx(['roko/ring-methodology']));

      expect(mockInstallPackage).toHaveBeenCalledWith('roko/ring-methodology', expect.objectContaining({
        refresh: false,
        configDir: '/mock/.aiwg',
        verify: false,
      }));
      expect(result.exitCode).toBe(0);
    });

    it('passes --refresh flag to installPackage', async () => {
      const { installHandler } = await import('../../../../src/cli/handlers/install.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      await installHandler.execute(makeCtx(['roko/ring-methodology', '--refresh']));

      expect(mockInstallPackage).toHaveBeenCalledWith('roko/ring-methodology', expect.objectContaining({ refresh: true }));
    });
  });

  describe('install with --deploy', () => {
    it('calls installPackage then deploys and records deployment', async () => {
      const { installHandler } = await import('../../../../src/cli/handlers/install.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await installHandler.execute(
        makeCtx(['roko/ring-methodology', '--deploy', '--provider', 'copilot'])
      );

      expect(mockInstallPackage).toHaveBeenCalled();
      expect(mockRun).toHaveBeenCalledWith(
        'tools/agents/deploy-agents.mjs',
        expect.arrayContaining(['--copy-all', '--provider', 'copilot']),
        expect.anything()
      );
      expect(mockRecordDeployment).toHaveBeenCalledWith(
        'roko/ring-methodology',
        expect.objectContaining({ provider: 'copilot' }),
        '/mock/.aiwg',
      );
      expect(result.exitCode).toBe(0);
    });

    it('warns but does not fail when deploy exits non-zero', async () => {
      mockRun.mockResolvedValue({ exitCode: 1, output: '' });

      const { installHandler } = await import('../../../../src/cli/handlers/install.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await installHandler.execute(makeCtx(['roko/ring-methodology', '--deploy']));

      expect(result.exitCode).toBe(0); // install succeeded even if deploy failed
      expect(mockRecordDeployment).not.toHaveBeenCalled();
    });
  });

  describe('install failure', () => {
    it('returns exitCode 1 with error message when installPackage throws', async () => {
      mockInstallPackage.mockRejectedValue(new Error("Cannot resolve package reference: 'bad-ref'"));

      const { installHandler } = await import('../../../../src/cli/handlers/install.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await installHandler.execute(makeCtx(['bad-ref']));

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('Cannot resolve');
    });
  });
});
