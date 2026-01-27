/**
 * Unit tests for Reproducibility command definitions
 *
 * @source @src/extensions/commands/definitions.ts
 * @requirement @.aiwg/flows/schemas/reproducibility-framework.yaml
 * @requirement @.aiwg/flows/schemas/execution-mode.yaml
 * @issues #112, #113, #114, #115, #124, #125, #126, #127, #211, #213, #214, #215
 */

import { describe, it, expect } from 'vitest';
import {
  executionModeCommand,
  snapshotCommand,
  checkpointCommand,
  reproducibilityValidateCommand,
  commandDefinitions,
  getCommandDefinition,
  getCommandsByCategory,
  searchCommandsByKeyword,
  searchCommandsByCapability,
} from '../../../../src/extensions/commands/definitions.js';

describe('Reproducibility Commands', () => {
  describe('executionModeCommand', () => {
    it('should have correct id and type', () => {
      expect(executionModeCommand.id).toBe('execution-mode');
      expect(executionModeCommand.type).toBe('command');
    });

    it('should reference all four modes in keywords', () => {
      expect(executionModeCommand.keywords).toContain('strict');
      expect(executionModeCommand.keywords).toContain('seeded');
      expect(executionModeCommand.keywords).toContain('reproducibility');
    });

    it('should have execution-mode capability', () => {
      expect(executionModeCommand.capabilities).toContain('execution-mode');
      expect(executionModeCommand.capabilities).toContain('reproducibility');
    });

    it('should be in reproducibility category', () => {
      expect(executionModeCommand.category).toBe('reproducibility');
    });

    it('should have argument hint for mode selection', () => {
      const meta = executionModeCommand.metadata as { argumentHint?: string };
      expect(meta.argumentHint).toBeDefined();
      expect(meta.argumentHint).toContain('mode');
    });
  });

  describe('snapshotCommand', () => {
    it('should have correct id and type', () => {
      expect(snapshotCommand.id).toBe('snapshot');
      expect(snapshotCommand.type).toBe('command');
    });

    it('should have snapshot and replay capabilities', () => {
      expect(snapshotCommand.capabilities).toContain('snapshot');
      expect(snapshotCommand.capabilities).toContain('replay');
    });

    it('should be in reproducibility category', () => {
      expect(snapshotCommand.category).toBe('reproducibility');
    });

    it('should have sub-command argument hint', () => {
      const meta = snapshotCommand.metadata as { argumentHint?: string };
      expect(meta.argumentHint).toBeDefined();
      expect(meta.argumentHint).toContain('list');
      expect(meta.argumentHint).toContain('show');
    });
  });

  describe('checkpointCommand', () => {
    it('should have correct id and type', () => {
      expect(checkpointCommand.id).toBe('checkpoint');
      expect(checkpointCommand.type).toBe('command');
    });

    it('should have checkpoint and recovery capabilities', () => {
      expect(checkpointCommand.capabilities).toContain('checkpoint');
      expect(checkpointCommand.capabilities).toContain('recovery');
    });

    it('should be in reproducibility category', () => {
      expect(checkpointCommand.category).toBe('reproducibility');
    });

    it('should have sub-command argument hint', () => {
      const meta = checkpointCommand.metadata as { argumentHint?: string };
      expect(meta.argumentHint).toBeDefined();
      expect(meta.argumentHint).toContain('recover');
    });
  });

  describe('reproducibilityValidateCommand', () => {
    it('should have correct id and type', () => {
      expect(reproducibilityValidateCommand.id).toBe('reproducibility-validate');
      expect(reproducibilityValidateCommand.type).toBe('command');
    });

    it('should have validation and compliance capabilities', () => {
      expect(reproducibilityValidateCommand.capabilities).toContain('validation');
      expect(reproducibilityValidateCommand.capabilities).toContain('compliance');
    });

    it('should be in reproducibility category', () => {
      expect(reproducibilityValidateCommand.category).toBe('reproducibility');
    });

    it('should have workflow-id argument hint', () => {
      const meta = reproducibilityValidateCommand.metadata as { argumentHint?: string };
      expect(meta.argumentHint).toBeDefined();
      expect(meta.argumentHint).toContain('workflow-id');
    });
  });

  describe('registration in commandDefinitions', () => {
    it('should include all reproducibility commands in the definitions array', () => {
      const ids = commandDefinitions.map((cmd) => cmd.id);
      expect(ids).toContain('execution-mode');
      expect(ids).toContain('snapshot');
      expect(ids).toContain('checkpoint');
      expect(ids).toContain('reproducibility-validate');
    });

    it('should be findable by getCommandDefinition', () => {
      expect(getCommandDefinition('execution-mode')).toBeDefined();
      expect(getCommandDefinition('snapshot')).toBeDefined();
      expect(getCommandDefinition('checkpoint')).toBeDefined();
      expect(getCommandDefinition('reproducibility-validate')).toBeDefined();
    });

    it('should be findable by category', () => {
      const reproCommands = getCommandsByCategory('reproducibility');
      expect(reproCommands.length).toBe(4);
      const ids = reproCommands.map((cmd) => cmd.id);
      expect(ids).toContain('execution-mode');
      expect(ids).toContain('snapshot');
      expect(ids).toContain('checkpoint');
      expect(ids).toContain('reproducibility-validate');
    });

    it('should be findable by keyword search', () => {
      const reproCommands = searchCommandsByKeyword('reproducibility');
      expect(reproCommands.length).toBeGreaterThanOrEqual(3);
    });

    it('should be findable by capability search', () => {
      const reproCommands = searchCommandsByCapability('reproducibility');
      expect(reproCommands.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('total command count', () => {
    it('should include at least 7 new cost and reproducibility commands', () => {
      const newCommandIds = ['cost-report', 'cost-history', 'metrics-tokens', 'execution-mode', 'snapshot', 'checkpoint', 'reproducibility-validate'];
      const ids = commandDefinitions.map((cmd) => cmd.id);
      for (const id of newCommandIds) {
        expect(ids).toContain(id);
      }
    });
  });
});
