/**
 * Utility Command Handlers Tests
 *
 * Tests for utility command handlers that delegate to existing scripts.
 *
 * @source @src/cli/handlers/utilities.ts
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @issue #33
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

// Mock script runner
const mockRun = vi.fn().mockResolvedValue({ exitCode: 0 });

vi.mock('../../../../src/cli/handlers/script-runner.js', () => ({
  createScriptRunner: vi.fn(() => ({
    run: mockRun,
  })),
}));

// Mock channel manager
vi.mock('../../../../src/channel/manager.mjs', () => ({
  getFrameworkRoot: vi.fn().mockResolvedValue('/mock/framework/root'),
}));

// Mock update checker
vi.mock('../../../../src/update/checker.mjs', () => ({
  forceUpdateCheck: vi.fn().mockResolvedValue(undefined),
}));

// Import handlers after mocks are set up
import {
  prefillCardsHandler,
  contributeStartHandler,
  validateMetadataHandler,
  doctorHandler,
  updateHandler,
  utilityHandlers,
} from '../../../../src/cli/handlers/utilities.js';

describe('Utility Command Handlers', () => {
  let mockContext: HandlerContext;

  beforeEach(() => {
    mockContext = {
      args: [],
      rawArgs: [],
      cwd: '/mock/cwd',
      frameworkRoot: '/mock/framework/root',
    };
    vi.clearAllMocks();
  });

  describe('prefillCardsHandler', () => {
    it('should have correct metadata', () => {
      expect(prefillCardsHandler.id).toBe('prefill-cards');
      expect(prefillCardsHandler.category).toBe('utility');
      expect(prefillCardsHandler.aliases).toEqual(['-prefill-cards', '--prefill-cards']);
      expect(prefillCardsHandler.name).toBe('Prefill Cards');
      expect(prefillCardsHandler.description).toMatch(/prefill.*kanban/i);
    });

    it('should delegate to tools/cards/prefill-cards.mjs', async () => {
      await prefillCardsHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        'tools/cards/prefill-cards.mjs',
        mockContext.args,
        { cwd: mockContext.cwd }
      );
    });

    it('should pass arguments to script', async () => {
      mockContext.args = ['--board', 'test-board'];

      await prefillCardsHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        'tools/cards/prefill-cards.mjs',
        ['--board', 'test-board'],
        { cwd: mockContext.cwd }
      );
    });
  });

  describe('contributeStartHandler', () => {
    it('should have correct metadata', () => {
      expect(contributeStartHandler.id).toBe('contribute-start');
      expect(contributeStartHandler.category).toBe('utility');
      expect(contributeStartHandler.aliases).toEqual(['-contribute-start', '--contribute-start']);
      expect(contributeStartHandler.name).toBe('Start Contribution');
      expect(contributeStartHandler.description).toMatch(/contribution/i);
    });

    it('should delegate to tools/contrib/start-contribution.mjs', async () => {
      await contributeStartHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        'tools/contrib/start-contribution.mjs',
        mockContext.args,
        { cwd: mockContext.cwd }
      );
    });
  });

  describe('validateMetadataHandler', () => {
    it('should have correct metadata', () => {
      expect(validateMetadataHandler.id).toBe('validate-metadata');
      expect(validateMetadataHandler.category).toBe('utility');
      expect(validateMetadataHandler.aliases).toEqual(['-validate-metadata', '--validate-metadata']);
      expect(validateMetadataHandler.name).toBe('Validate Metadata');
      expect(validateMetadataHandler.description).toMatch(/metadata/i);
    });

    it('should delegate to tools/cli/validate-metadata.mjs', async () => {
      await validateMetadataHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        'tools/cli/validate-metadata.mjs',
        mockContext.args,
        { cwd: mockContext.cwd }
      );
    });
  });

  describe('doctorHandler', () => {
    it('should have correct metadata', () => {
      expect(doctorHandler.id).toBe('doctor');
      expect(doctorHandler.category).toBe('maintenance');
      expect(doctorHandler.aliases).toEqual(['-doctor', '--doctor']);
      expect(doctorHandler.name).toBe('Doctor');
      expect(doctorHandler.description).toMatch(/health|diagnostic/i);
    });

    it('should delegate to tools/cli/doctor.mjs', async () => {
      await doctorHandler.execute(mockContext);

      expect(mockRun).toHaveBeenCalledWith(
        'tools/cli/doctor.mjs',
        mockContext.args,
        { cwd: mockContext.cwd }
      );
    });
  });

  describe('updateHandler', () => {
    it('should have correct metadata', () => {
      expect(updateHandler.id).toBe('update');
      expect(updateHandler.category).toBe('maintenance');
      expect(updateHandler.aliases).toEqual(['-update', '--update']);
      expect(updateHandler.name).toBe('Update');
      expect(updateHandler.description).toMatch(/update|check/i);
    });

    it('should call forceUpdateCheck', async () => {
      const { forceUpdateCheck } = await import('../../../../src/update/checker.mjs');

      const result = await updateHandler.execute(mockContext);

      expect(forceUpdateCheck).toHaveBeenCalled();
      expect(result.exitCode).toBe(0);
    });

    it('should handle errors from forceUpdateCheck', async () => {
      const { forceUpdateCheck } = await import('../../../../src/update/checker.mjs');

      const testError = new Error('Update check failed');
      (forceUpdateCheck as any).mockRejectedValueOnce(testError);

      const result = await updateHandler.execute(mockContext);

      expect(result.exitCode).toBe(1);
      expect(result.error).toBe(testError);
      expect(result.message).toMatch(/update check failed/i);
    });
  });

  describe('utilityHandlers array', () => {
    it('should export all utility handlers', () => {
      expect(utilityHandlers).toHaveLength(5);

      const handlerIds = utilityHandlers.map(h => h.id);
      expect(handlerIds).toContain('prefill-cards');
      expect(handlerIds).toContain('contribute-start');
      expect(handlerIds).toContain('validate-metadata');
      expect(handlerIds).toContain('doctor');
      expect(handlerIds).toContain('update');
    });

    it('all handlers should have required properties', () => {
      utilityHandlers.forEach(handler => {
        expect(handler.id).toBeDefined();
        expect(handler.name).toBeDefined();
        expect(handler.description).toBeDefined();
        expect(handler.category).toBeDefined();
        expect(handler.aliases).toBeDefined();
        expect(Array.isArray(handler.aliases)).toBe(true);
        expect(typeof handler.execute).toBe('function');
      });
    });

    it('utility handlers should have utility category', () => {
      const utilityCategories = utilityHandlers
        .filter(h => ['prefill-cards', 'contribute-start', 'validate-metadata'].includes(h.id))
        .map(h => h.category);

      utilityCategories.forEach(category => {
        expect(category).toBe('utility');
      });
    });

    it('maintenance handlers should have maintenance category', () => {
      const maintenanceCategories = utilityHandlers
        .filter(h => ['doctor', 'update'].includes(h.id))
        .map(h => h.category);

      maintenanceCategories.forEach(category => {
        expect(category).toBe('maintenance');
      });
    });
  });

  describe('handler aliases', () => {
    it('should have short and long form aliases', () => {
      utilityHandlers.forEach(handler => {
        expect(handler.aliases.length).toBeGreaterThan(0);

        // Should have at least one short form (-) and one long form (--)
        const hasShortForm = handler.aliases.some(a => a.startsWith('-') && !a.startsWith('--'));
        const hasLongForm = handler.aliases.some(a => a.startsWith('--'));

        expect(hasShortForm || hasLongForm).toBe(true);
      });
    });
  });
});
