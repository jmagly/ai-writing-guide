/**
 * Unit tests for Cost & Metrics command definitions
 *
 * @source @src/extensions/commands/definitions.ts
 * @requirement @.aiwg/flows/schemas/cost-tracking.yaml
 * @requirement @.aiwg/flows/schemas/token-efficiency.yaml
 * @issue #130
 */

import { describe, it, expect } from 'vitest';
import {
  costReportCommand,
  costHistoryCommand,
  metricsTokensCommand,
  commandDefinitions,
  getCommandDefinition,
  getCommandsByCategory,
  searchCommandsByKeyword,
} from '../../../../src/extensions/commands/definitions.js';

describe('Cost & Metrics Commands', () => {
  describe('costReportCommand', () => {
    it('should have correct id and type', () => {
      expect(costReportCommand.id).toBe('cost-report');
      expect(costReportCommand.type).toBe('command');
    });

    it('should have cost-tracking capability', () => {
      expect(costReportCommand.capabilities).toContain('cost-tracking');
      expect(costReportCommand.capabilities).toContain('metrics');
    });

    it('should be in metrics category', () => {
      expect(costReportCommand.category).toBe('metrics');
    });

    it('should have relevant keywords', () => {
      expect(costReportCommand.keywords).toContain('cost');
      expect(costReportCommand.keywords).toContain('report');
      expect(costReportCommand.keywords).toContain('budget');
    });

    it('should have valid metadata', () => {
      expect(costReportCommand.metadata).toBeDefined();
      expect(costReportCommand.metadata.type).toBe('command');
    });
  });

  describe('costHistoryCommand', () => {
    it('should have correct id and type', () => {
      expect(costHistoryCommand.id).toBe('cost-history');
      expect(costHistoryCommand.type).toBe('command');
    });

    it('should have history capability', () => {
      expect(costHistoryCommand.capabilities).toContain('history');
      expect(costHistoryCommand.capabilities).toContain('cost-tracking');
    });

    it('should be in metrics category', () => {
      expect(costHistoryCommand.category).toBe('metrics');
    });
  });

  describe('metricsTokensCommand', () => {
    it('should have correct id and type', () => {
      expect(metricsTokensCommand.id).toBe('metrics-tokens');
      expect(metricsTokensCommand.type).toBe('command');
    });

    it('should reference token efficiency in description', () => {
      expect(metricsTokensCommand.description).toContain('token');
      expect(metricsTokensCommand.description).toContain('MetaGPT');
    });

    it('should have token-efficiency capability', () => {
      expect(metricsTokensCommand.capabilities).toContain('token-efficiency');
    });

    it('should be in metrics category', () => {
      expect(metricsTokensCommand.category).toBe('metrics');
    });
  });

  describe('registration in commandDefinitions', () => {
    it('should include all cost commands in the definitions array', () => {
      const ids = commandDefinitions.map((cmd) => cmd.id);
      expect(ids).toContain('cost-report');
      expect(ids).toContain('cost-history');
      expect(ids).toContain('metrics-tokens');
    });

    it('should be findable by getCommandDefinition', () => {
      expect(getCommandDefinition('cost-report')).toBeDefined();
      expect(getCommandDefinition('cost-history')).toBeDefined();
      expect(getCommandDefinition('metrics-tokens')).toBeDefined();
    });

    it('should be findable by category', () => {
      const metricsCommands = getCommandsByCategory('metrics');
      expect(metricsCommands.length).toBe(3);
      const ids = metricsCommands.map((cmd) => cmd.id);
      expect(ids).toContain('cost-report');
      expect(ids).toContain('cost-history');
      expect(ids).toContain('metrics-tokens');
    });

    it('should be findable by keyword search', () => {
      const costCommands = searchCommandsByKeyword('cost');
      expect(costCommands.length).toBeGreaterThanOrEqual(2);
    });
  });
});
