/**
 * Behavior Metadata Validation Tests
 *
 * Tests that aiwg validate-metadata correctly validates BEHAVIOR.md files
 * including trigger requirements, scope validation, and rejection of
 * malformed behavior manifests.
 *
 * @implements #609, #610
 * @tests @src/plugin/metadata-validator.ts (behavior type support)
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MetadataValidator } from '../../../src/plugin/metadata-validator.js';

describe('Behavior Metadata Validation', () => {
  let validator: MetadataValidator;

  beforeEach(() => {
    validator = new MetadataValidator();
  });

  // =========================================================================
  // Schema validation for behavior type
  // =========================================================================

  describe('validateSchema — behavior type', () => {
    it('accepts valid behavior manifest with required fields', () => {
      const manifest = {
        name: 'test-watcher',
        version: '1.0.0',
        type: 'behavior',
        description: 'Runs related tests when source files change',
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('accepts behavior type in the type union', () => {
      // Validate that "behavior" is not rejected as an unknown type
      const manifest = {
        name: 'concierge',
        version: '1.0.0',
        type: 'behavior',
        description: 'Persistent front-facing interface for daemon sessions',
      };

      const result = validator.validateSchema(manifest);
      // Should not have a type-mismatch error
      const typeErrors = result.errors.filter(e => e.field === 'type');
      expect(typeErrors).toHaveLength(0);
    });

    it('rejects manifest with missing name', () => {
      const manifest = {
        version: '1.0.0',
        type: 'behavior',
        description: 'A behavior without a name',
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
    });

    it('rejects manifest with missing description', () => {
      const manifest = {
        name: 'test-watcher',
        version: '1.0.0',
        type: 'behavior',
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
    });
  });

  // =========================================================================
  // validateRequiredFields — behavior-specific rules
  // =========================================================================

  describe('validateRequiredFields — behavior specifics', () => {
    it('emits error when behavior has no triggers declared in metadata', () => {
      const manifest = {
        name: 'silent-behavior',
        version: '1.0.0',
        type: 'behavior' as const,
        description: 'A behavior with no triggers',
        files: [],
        metadata: { scope: 'daemon' } as Record<string, unknown>,
      };

      const errors = validator.validateRequiredFields(manifest);
      const triggerError = errors.find(e => e.field === 'metadata.triggers');
      expect(triggerError).toBeDefined();
      expect(triggerError?.severity).toBe('error');
    });

    it('accepts behavior when metadata.triggers array is declared', () => {
      const manifest = {
        name: 'multi-trigger',
        version: '1.0.0',
        type: 'behavior' as const,
        description: 'Fires on multiple events',
        files: [],
        metadata: {
          scope: 'daemon',
          triggers: ['session-start', 'file-change'],
        } as Record<string, unknown>,
      };

      const errors = validator.validateRequiredFields(manifest);
      const triggerErrors = errors.filter(e => e.field === 'metadata.triggers');
      expect(triggerErrors).toHaveLength(0);
    });

    it('does not require files array for behavior type', () => {
      const manifest = {
        name: 'agentless-behavior',
        version: '1.0.0',
        type: 'behavior' as const,
        description: 'Agent-based behavior',
        files: [],
        metadata: {
          scope: 'daemon',
          triggers: ['session-start'],
        },
      };

      const errors = validator.validateRequiredFields(manifest);
      const fileErrors = errors.filter(e => e.field === 'files');
      // Behaviors use BEHAVIOR.md + scripts/ directory, not the files array
      expect(fileErrors).toHaveLength(0);
    });
  });

  // =========================================================================
  // Valid vs invalid behavior manifests
  // =========================================================================

  describe('Full behavior manifest acceptance', () => {
    it('validates a minimal valid behavior', () => {
      const manifest = {
        name: 'build-monitor',
        version: '1.0.0',
        type: 'behavior' as const,
        description: 'Monitors CI build results and alerts on failure',
        files: [],
        metadata: {
          scope: 'daemon',
          triggers: ['post-build'],
        } as Record<string, unknown>,
      };

      const result = validator.validateRequiredFields(manifest);
      const errors = result.filter(e => e.severity === 'error');
      expect(errors).toHaveLength(0);
    });

    it('validates a full agent-mode behavior like concierge', () => {
      const manifest = {
        name: 'concierge',
        version: '1.0.0',
        type: 'behavior' as const,
        description: 'Persistent front-facing interface for daemon sessions',
        files: [],
        metadata: {
          scope: 'daemon',
          triggers: ['session-start'],
          mode: 'agent',
          routing: { strategy: 'intent-first', fallback: 'surface-with-context' },
          memory: { session: true, cross_session: true },
        } as Record<string, unknown>,
      };

      const result = validator.validateRequiredFields(manifest);
      const errors = result.filter(e => e.severity === 'error');
      expect(errors).toHaveLength(0);
    });
  });
});
