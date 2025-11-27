/**
 * Unit tests for MetadataValidator
 *
 * Tests plugin manifest validation including:
 * - Schema validation (valid/invalid manifests, missing fields, wrong types)
 * - Version validation (valid semver, invalid versions, pre-release tags)
 * - File reference validation (existing files, missing files)
 * - Dependency validation (valid deps, invalid semver ranges)
 * - Batch validation (directory scanning, recursive mode)
 * - Report generation (text format, JSON format)
 * - Edge cases (empty manifests, malformed YAML, large files)
 *
 * @module test/unit/plugin/metadata-validator.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetadataValidator } from '../../../src/plugin/metadata-validator.ts';
import { FilesystemSandbox } from '../../../agentic/code/frameworks/sdlc-complete/src/testing/mocks/filesystem-sandbox.ts';

describe('MetadataValidator', () => {
  let sandbox: FilesystemSandbox;
  let validator: MetadataValidator;

  beforeEach(async () => {
    sandbox = new FilesystemSandbox();
    await sandbox.initialize();
    validator = new MetadataValidator();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  // ===========================
  // Schema Validation Tests
  // ===========================

  describe('validateSchema', () => {
    it('should accept valid manifest with all required fields', () => {
      const manifest = {
        name: 'Test Agent',
        version: '1.0.0',
        type: 'agent',
        description: 'A test agent for validation'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject null manifest', () => {
      const result = validator.validateSchema(null);
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('must be an object');
    });

    it('should reject non-object manifest', () => {
      const result = validator.validateSchema('not an object');
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should reject manifest missing name field', () => {
      const manifest = {
        version: '1.0.0',
        type: 'agent',
        description: 'Missing name'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject manifest missing version field', () => {
      const manifest = {
        name: 'Test',
        type: 'agent',
        description: 'Missing version'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'version')).toBe(true);
    });

    it('should reject manifest missing type field', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        description: 'Missing type'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should reject manifest missing description field', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'description')).toBe(true);
    });

    it('should reject non-string name', () => {
      const manifest = {
        name: 123,
        version: '1.0.0',
        type: 'agent',
        description: 'Test'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'name' && e.message.includes('string'))).toBe(true);
    });

    it('should reject invalid type value', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'invalid-type',
        description: 'Test'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'type')).toBe(true);
    });

    it('should accept all valid type values', () => {
      const validTypes = ['agent', 'command', 'template', 'flow'];

      for (const type of validTypes) {
        const manifest = {
          name: 'Test',
          version: '1.0.0',
          type,
          description: 'Test'
        };

        const result = validator.validateSchema(manifest);
        expect(result.valid).toBe(true);
      }
    });

    it('should reject non-array files field', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        files: 'not-an-array'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'files')).toBe(true);
    });

    it('should reject files array with non-string items', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        files: ['file1.md', 123, 'file2.md']
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'files')).toBe(true);
    });

    it('should accept valid files array', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        files: ['file1.md', 'file2.md']
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should reject non-object dependencies field', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        dependencies: 'not-an-object'
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'dependencies')).toBe(true);
    });

    it('should accept valid dependencies object', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        dependencies: {
          'plugin-a': '^1.0.0',
          'plugin-b': '~2.3.4'
        }
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(true);
    });

    it('should reject array dependencies field', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        dependencies: ['plugin-a', 'plugin-b']
      };

      const result = validator.validateSchema(manifest);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.field === 'dependencies')).toBe(true);
    });
  });

  // ===========================
  // Required Fields Validation
  // ===========================

  describe('validateRequiredFields', () => {
    it('should reject empty name', () => {
      const manifest = {
        name: '',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test.md']
      };

      const errors = validator.validateRequiredFields(manifest);
      expect(errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject whitespace-only name', () => {
      const manifest = {
        name: '   ',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test.md']
      };

      const errors = validator.validateRequiredFields(manifest);
      expect(errors.some(e => e.field === 'name')).toBe(true);
    });

    it('should reject empty description', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: '',
        files: ['test.md']
      };

      const errors = validator.validateRequiredFields(manifest);
      expect(errors.some(e => e.field === 'description')).toBe(true);
    });

    it('should require files for agent type', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: []
      };

      const errors = validator.validateRequiredFields(manifest);
      expect(errors.some(e => e.field === 'files')).toBe(true);
    });

    it('should require files for command type', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'command' as const,
        description: 'Test',
        files: []
      };

      const errors = validator.validateRequiredFields(manifest);
      expect(errors.some(e => e.field === 'files')).toBe(true);
    });

    it('should not require files for template type', () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'template' as const,
        description: 'Test',
        files: []
      };

      const errors = validator.validateRequiredFields(manifest);
      expect(errors.some(e => e.field === 'files')).toBe(false);
    });
  });

  // ===========================
  // Version Validation Tests
  // ===========================

  describe('validateVersion', () => {
    it('should accept valid semver version', () => {
      const errors = validator.validateVersion('1.0.0');
      expect(errors).toHaveLength(0);
    });

    it('should accept version with patch number', () => {
      const errors = validator.validateVersion('2.5.13');
      expect(errors).toHaveLength(0);
    });

    it('should accept pre-release version', () => {
      const errors = validator.validateVersion('1.0.0-alpha');
      expect(errors).toHaveLength(0);
    });

    it('should accept pre-release with build metadata', () => {
      const errors = validator.validateVersion('1.0.0-beta.1+build.123');
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid version format', () => {
      const errors = validator.validateVersion('1.0');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('Invalid semantic version');
    });

    it('should accept version with v prefix (normalized by semver)', () => {
      // Note: semver.valid('v1.0.0') returns '1.0.0', which is valid
      const errors = validator.validateVersion('v1.0.0');
      expect(errors).toHaveLength(0);
    });

    it('should reject empty version', () => {
      const errors = validator.validateVersion('');
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('required');
    });

    it('should reject non-numeric version', () => {
      const errors = validator.validateVersion('one.two.three');
      expect(errors).toHaveLength(1);
    });
  });

  // ===========================
  // File Reference Validation
  // ===========================

  describe('validateFileReferences', () => {
    it('should pass when all files exist', async () => {
      await sandbox.writeFile('test1.md', '# Test 1');
      await sandbox.writeFile('test2.md', '# Test 2');

      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test1.md', 'test2.md']
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(0);
    });

    it('should fail when file does not exist', async () => {
      await sandbox.writeFile('test1.md', '# Test 1');

      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test1.md', 'missing.md']
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('does not exist');
      expect(errors[0].path).toBe('missing.md');
    });

    it('should fail when path is a directory', async () => {
      await sandbox.createDirectory('test-dir');

      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test-dir']
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('not a file');
    });

    it('should handle subdirectory files', async () => {
      await sandbox.createDirectory('subdir');
      await sandbox.writeFile('subdir/test.md', '# Test');

      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['subdir/test.md']
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(0);
    });

    it('should return empty array when files array is empty', async () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'template' as const,
        description: 'Test',
        files: []
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(0);
    });

    it('should detect multiple missing files', async () => {
      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['missing1.md', 'missing2.md', 'missing3.md']
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(3);
    });

    it('should handle absolute paths correctly', async () => {
      await sandbox.writeFile('test.md', '# Test');
      const absolutePath = sandbox.getPath('test.md');

      const manifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: [absolutePath]
      };

      const errors = await validator.validateFileReferences(manifest, sandbox.getPath());
      expect(errors).toHaveLength(0);
    });
  });

  // ===========================
  // Dependency Validation
  // ===========================

  describe('validateDependencies', () => {
    it('should accept valid semver ranges', () => {
      const dependencies = {
        'plugin-a': '^1.0.0',
        'plugin-b': '~2.3.4',
        'plugin-c': '>=1.2.3 <2.0.0',
        'plugin-d': '1.x'
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid semver range', () => {
      const dependencies = {
        'plugin-a': 'invalid-version'
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('invalid version range');
    });

    it('should reject empty dependency name', () => {
      const dependencies = {
        '': '1.0.0'
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('name cannot be empty');
    });

    it('should reject empty version range', () => {
      const dependencies = {
        'plugin-a': ''
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(1);
      expect(errors[0].message).toContain('empty version range');
    });

    it('should accept wildcard versions', () => {
      const dependencies = {
        'plugin-a': '*',
        'plugin-b': 'x.x.x'
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should detect multiple invalid dependencies', () => {
      const dependencies = {
        'plugin-a': 'invalid',
        'plugin-b': 'also-invalid',
        'plugin-c': '^1.0.0'
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(2);
    });
  });

  // ===========================
  // Batch Validation Tests
  // ===========================

  describe('validateDirectory', () => {
    it('should validate all manifests in directory', async () => {
      await sandbox.createDirectory('agent1');
      await sandbox.writeFile('agent1/manifest.md', `---
name: Agent 1
version: 1.0.0
type: agent
description: Test agent 1
files: []
---
`);

      await sandbox.createDirectory('agent2');
      await sandbox.writeFile('agent2/manifest.md', `---
name: Agent 2
version: 2.0.0
type: agent
description: Test agent 2
files: []
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), false);
      expect(results.size).toBe(0); // No manifests at root level
    });

    it('should find manifests recursively', async () => {
      await sandbox.createDirectory('agents/agent1');
      await sandbox.writeFile('agents/agent1/manifest.md', `---
name: Agent 1
version: 1.0.0
type: template
description: Test agent
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(1);
    });

    it('should detect invalid manifests in batch', async () => {
      await sandbox.createDirectory('invalid');
      await sandbox.writeFile('invalid/manifest.md', `---
name: Invalid
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(1);
      const result = Array.from(results.values())[0];
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should handle mixed valid and invalid manifests', async () => {
      await sandbox.createDirectory('valid');
      await sandbox.writeFile('valid/manifest.md', `---
name: Valid Agent
version: 1.0.0
type: template
description: A valid agent
---
`);

      await sandbox.createDirectory('invalid');
      await sandbox.writeFile('invalid/manifest.md', `---
name: Invalid Agent
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(2);

      const validCount = Array.from(results.values()).filter(r => r.valid).length;
      const invalidCount = Array.from(results.values()).filter(r => !r.valid).length;

      expect(validCount).toBeGreaterThanOrEqual(1);
      expect(invalidCount).toBeGreaterThanOrEqual(1);
    });

    it('should not recurse when recursive is false', async () => {
      await sandbox.createDirectory('subdir');
      await sandbox.writeFile('subdir/manifest.md', `---
name: Nested
version: 1.0.0
type: agent
description: Nested agent
files: []
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), false);
      expect(results.size).toBe(0);
    });

    it('should handle non-existent directory', async () => {
      const results = await validator.validateDirectory(sandbox.getPath('non-existent'), false);
      expect(results.size).toBe(1);
      const result = Array.from(results.values())[0];
      expect(result.valid).toBe(false);
    });

    it('should skip non-manifest files', async () => {
      await sandbox.writeFile('readme.md', '# README');
      await sandbox.writeFile('other.txt', 'Other file');
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: template
description: Test
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), false);
      expect(results.size).toBe(1);
    });

    it('should validate deeply nested manifests', async () => {
      await sandbox.createDirectory('a/b/c/d');
      await sandbox.writeFile('a/b/c/d/manifest.md', `---
name: Deep
version: 1.0.0
type: template
description: Deeply nested
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(1);
    });

    it('should handle empty directory', async () => {
      await sandbox.createDirectory('empty');
      const results = await validator.validateDirectory(sandbox.getPath('empty'), false);
      expect(results.size).toBe(0);
    });

    it('should process multiple manifests at same level', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Root
version: 1.0.0
type: template
description: Root manifest
---
`);

      await sandbox.createDirectory('sub1');
      await sandbox.writeFile('sub1/manifest.md', `---
name: Sub1
version: 1.0.0
type: template
description: Sub1
---
`);

      await sandbox.createDirectory('sub2');
      await sandbox.writeFile('sub2/manifest.md', `---
name: Sub2
version: 1.0.0
type: template
description: Sub2
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(3);
    });
  });

  // ===========================
  // Report Generation Tests
  // ===========================

  describe('generateReport', () => {
    it('should generate text report with summary', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: template
description: Test agent
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'text');

      expect(report).toContain('Plugin Metadata Validation Report');
      expect(report).toContain('Summary:');
      expect(report).toContain('Total Manifests:');
      expect(report).toContain('Passed:');
      expect(report).toContain('Failed:');
    });

    it('should generate JSON report', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: template
description: Test agent
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'json');

      const parsed = JSON.parse(report);
      expect(parsed).toHaveProperty('summary');
      expect(parsed).toHaveProperty('results');
      expect(parsed.summary).toHaveProperty('total');
      expect(parsed.summary).toHaveProperty('passed');
      expect(parsed.summary).toHaveProperty('failed');
    });

    it('should show errors in text report', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Invalid
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'text');

      expect(report).toContain('FAIL');
      expect(report).toContain('Errors:');
    });

    it('should show warnings in text report', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: agent
description: Test agent without model field
files:
  - test.md
---
`);

      await sandbox.writeFile('test.md', '# Test');

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'text');

      expect(report).toContain('Warnings:');
    });

    it('should include manifest details in report', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test Agent
version: 2.5.1
type: command
description: Test command
files:
  - test.md
---
`);

      await sandbox.writeFile('test.md', '# Test');

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'text');

      expect(report).toContain('Test Agent');
      expect(report).toContain('2.5.1');
      expect(report).toContain('command');
    });

    it('should format JSON with proper structure', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: template
description: Test
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'json');

      const parsed = JSON.parse(report);
      expect(Array.isArray(parsed.results)).toBe(true);
      expect(parsed.results[0]).toHaveProperty('path');
      expect(parsed.results[0]).toHaveProperty('valid');
      expect(parsed.results[0]).toHaveProperty('errors');
      expect(parsed.results[0]).toHaveProperty('warnings');
    });

    it('should show error counts in summary', async () => {
      await sandbox.writeFile('manifest.md', `---
name: ""
version: invalid
type: wrong
description: ""
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'json');

      const parsed = JSON.parse(report);
      expect(parsed.summary.totalErrors).toBeGreaterThan(0);
    });

    it('should handle empty results', () => {
      const results = new Map();
      const report = validator.generateReport(results, 'text');

      expect(report).toContain('Total Manifests: 0');
    });
  });

  // ===========================
  // Manifest File Validation
  // ===========================

  describe('validateFile', () => {
    it('should validate file with valid manifest', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test Agent
version: 1.0.0
type: agent
description: A test agent for validation
files:
  - test.md
---

# Agent Documentation
`);

      await sandbox.writeFile('test.md', '# Test');

      const result = await validator.validateFile(sandbox.getPath('manifest.md'));
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.manifest?.name).toBe('Test Agent');
    });

    it('should fail for non-existent file', async () => {
      const result = await validator.validateFile(sandbox.getPath('non-existent.md'));
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('not found');
    });

    it('should fail for directory path', async () => {
      await sandbox.createDirectory('test-dir');
      const result = await validator.validateFile(sandbox.getPath('test-dir'));
      expect(result.valid).toBe(false);
      expect(result.errors).toHaveLength(1);
    });

    it('should validate file with dependencies', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: template
description: Test with dependencies
dependencies:
  other-plugin: ^1.0.0
  another-plugin: ~2.3.4
---
`);

      const result = await validator.validateFile(sandbox.getPath('manifest.md'));
      expect(result.valid).toBe(true);
    });

    it('should detect missing files in manifest', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Test
version: 1.0.0
type: agent
description: Test
files:
  - missing.md
---
`);

      const result = await validator.validateFile(sandbox.getPath('manifest.md'));
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('does not exist'))).toBe(true);
    });
  });

  // ===========================
  // Manifest Content Validation
  // ===========================

  describe('validateManifest', () => {
    it('should validate manifest with frontmatter', async () => {
      const content = `---
name: Test Agent
version: 1.0.0
type: template
description: Test
---

# Documentation
`;

      const result = await validator.validateManifest(content);
      expect(result.valid).toBe(true);
    });

    it('should fail for missing frontmatter', async () => {
      const content = `# No frontmatter here

Just regular markdown.`;

      const result = await validator.validateManifest(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('frontmatter'))).toBe(true);
    });

    it('should fail for malformed YAML', async () => {
      const content = `---
name: Test
  invalid yaml syntax
    broken: indentation
---
`;

      const result = await validator.validateManifest(content);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.message.includes('parse'))).toBe(true);
    });

    it('should include warnings for missing optional fields', async () => {
      const content = `---
name: Test Agent
version: 1.0.0
type: agent
description: Test agent without model
files:
  - test.md
---
`;

      const result = await validator.validateManifest(content);
      expect(result.warnings.some(w => w.field === 'model')).toBe(true);
    });

    it('should warn about missing tools for agent', async () => {
      const content = `---
name: Test Agent
version: 1.0.0
type: agent
description: Test
files:
  - test.md
---
`;

      const result = await validator.validateManifest(content);
      expect(result.warnings.some(w => w.field === 'tools')).toBe(true);
    });

    it('should recommend framework field', async () => {
      const content = `---
name: Test
version: 1.0.0
type: template
description: Test
---
`;

      const result = await validator.validateManifest(content);
      expect(result.warnings.some(w => w.field === 'framework')).toBe(true);
    });

    it('should handle empty manifest gracefully', async () => {
      const content = `---
---
`;

      const result = await validator.validateManifest(content);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ===========================
  // Edge Cases
  // ===========================

  describe('edge cases', () => {
    it('should handle very large manifest files', async () => {
      const largeDescription = 'A'.repeat(10000);
      const content = `---
name: Large Manifest
version: 1.0.0
type: template
description: ${largeDescription}
---
`;

      const result = await validator.validateManifest(content);
      expect(result.manifest?.description).toHaveLength(10000);
    });

    it('should handle special characters in fields', async () => {
      const content = `---
name: "Test: Agent (Special)"
version: 1.0.0
type: template
description: "Description with @#$% special chars"
---
`;

      const result = await validator.validateManifest(content);
      expect(result.valid).toBe(true);
      expect(result.manifest?.name).toContain('Special');
    });

    it('should handle Unicode in manifest', async () => {
      const content = `---
name: Test Agent 测试
version: 1.0.0
type: template
description: Unicode description éñü
---
`;

      const result = await validator.validateManifest(content);
      expect(result.valid).toBe(true);
    });

    it('should validate with checkFileReferences disabled', async () => {
      const validatorNoCheck = new MetadataValidator({ checkFileReferences: false });

      const content = `---
name: Test
version: 1.0.0
type: agent
description: Test
files:
  - missing.md
---
`;

      const result = await validatorNoCheck.validateManifest(content);
      expect(result.valid).toBe(true); // No file check, so valid
    });

    it('should treat warnings as errors in strict mode', async () => {
      const strictValidator = new MetadataValidator({ strict: true });

      const content = `---
name: Test
version: 1.0.0
type: template
description: Test
---
`;

      const result = await strictValidator.validateManifest(content);
      expect(result.valid).toBe(false); // Warnings fail in strict mode
    });
  });
});
