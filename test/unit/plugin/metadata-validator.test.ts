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

    it('should reject null or non-object manifest', () => {
      const nullResult = validator.validateSchema(null);
      expect(nullResult.valid).toBe(false);
      expect(nullResult.errors).toHaveLength(1);
      expect(nullResult.errors[0].message).toContain('must be an object');

      const nonObjectResult = validator.validateSchema('not an object');
      expect(nonObjectResult.valid).toBe(false);
      expect(nonObjectResult.errors).toHaveLength(1);
    });

    it('should reject manifests missing required fields', () => {
      const testCases = [
        { field: 'name', manifest: { version: '1.0.0', type: 'agent', description: 'Missing name' } },
        { field: 'version', manifest: { name: 'Test', type: 'agent', description: 'Missing version' } },
        { field: 'type', manifest: { name: 'Test', version: '1.0.0', description: 'Missing type' } },
        { field: 'description', manifest: { name: 'Test', version: '1.0.0', type: 'agent' } }
      ];

      for (const { field, manifest } of testCases) {
        const result = validator.validateSchema(manifest);
        expect(result.valid).toBe(false);
        expect(result.errors.some(e => e.field === field)).toBe(true);
      }
    });

    it('should reject invalid field types', () => {
      const nonStringName = {
        name: 123,
        version: '1.0.0',
        type: 'agent',
        description: 'Test'
      };
      const nameResult = validator.validateSchema(nonStringName);
      expect(nameResult.valid).toBe(false);
      expect(nameResult.errors.some(e => e.field === 'name' && e.message.includes('string'))).toBe(true);

      const invalidType = {
        name: 'Test',
        version: '1.0.0',
        type: 'invalid-type',
        description: 'Test'
      };
      const typeResult = validator.validateSchema(invalidType);
      expect(typeResult.valid).toBe(false);
      expect(typeResult.errors.some(e => e.field === 'type')).toBe(true);
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

    it('should reject invalid files field', () => {
      const nonArrayFiles = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        files: 'not-an-array'
      };
      const result1 = validator.validateSchema(nonArrayFiles);
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.field === 'files')).toBe(true);

      const nonStringItems = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        files: ['file1.md', 123, 'file2.md']
      };
      const result2 = validator.validateSchema(nonStringItems);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some(e => e.field === 'files')).toBe(true);
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

    it('should reject invalid dependencies field', () => {
      const nonObjectDeps = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        dependencies: 'not-an-object'
      };
      const result1 = validator.validateSchema(nonObjectDeps);
      expect(result1.valid).toBe(false);
      expect(result1.errors.some(e => e.field === 'dependencies')).toBe(true);

      const arrayDeps = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent',
        description: 'Test',
        dependencies: ['plugin-a', 'plugin-b']
      };
      const result2 = validator.validateSchema(arrayDeps);
      expect(result2.valid).toBe(false);
      expect(result2.errors.some(e => e.field === 'dependencies')).toBe(true);
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
  });

  describe('validateRequiredFields', () => {
    it('should reject empty or whitespace-only required fields', () => {
      const testCases = [
        { field: 'name', manifest: { name: '', version: '1.0.0', type: 'agent', description: 'Test', files: ['test.md'] } },
        { field: 'name', manifest: { name: '   ', version: '1.0.0', type: 'agent', description: 'Test', files: ['test.md'] } },
        { field: 'description', manifest: { name: 'Test', version: '1.0.0', type: 'agent', description: '', files: ['test.md'] } }
      ];

      for (const { field, manifest } of testCases) {
        const errors = validator.validateRequiredFields(manifest as any);
        expect(errors.some(e => e.field === field)).toBe(true);
      }
    });

    it('should require files for agent and command types', () => {
      const types: Array<'agent' | 'command'> = ['agent', 'command'];

      for (const type of types) {
        const manifest = {
          name: 'Test',
          version: '1.0.0',
          type,
          description: 'Test',
          files: []
        };

        const errors = validator.validateRequiredFields(manifest);
        expect(errors.some(e => e.field === 'files')).toBe(true);
      }
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

  describe('validateVersion', () => {
    it('should accept valid semantic versions', () => {
      const validVersions = [
        { version: '1.0.0', description: 'basic semver' },
        { version: '2.5.13', description: 'with patch number' },
        { version: '1.0.0-alpha', description: 'pre-release' },
        { version: '1.0.0-beta.1+build.123', description: 'pre-release with build metadata' },
        { version: 'v1.0.0', description: 'with v prefix (normalized by semver)' }
      ];

      for (const { version } of validVersions) {
        const errors = validator.validateVersion(version);
        expect(errors).toHaveLength(0);
      }
    });

    it('should reject invalid versions', () => {
      const invalidVersions = [
        { version: '1.0', message: 'Invalid semantic version' },
        { version: '', message: 'required' },
        { version: 'one.two.three', message: 'Invalid semantic version' }
      ];

      for (const { version, message } of invalidVersions) {
        const errors = validator.validateVersion(version);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain(message);
      }
    });
  });

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

    it('should fail for non-existent file or directory path', async () => {
      await sandbox.writeFile('test1.md', '# Test 1');
      await sandbox.createDirectory('test-dir');

      const missingFile = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test1.md', 'missing.md']
      };
      const errors1 = await validator.validateFileReferences(missingFile, sandbox.getPath());
      expect(errors1).toHaveLength(1);
      expect(errors1[0].message).toContain('does not exist');
      expect(errors1[0].path).toBe('missing.md');

      const dirPath = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['test-dir']
      };
      const errors2 = await validator.validateFileReferences(dirPath, sandbox.getPath());
      expect(errors2).toHaveLength(1);
      expect(errors2[0].message).toContain('not a file');
    });

    it('should handle subdirectory files and absolute paths', async () => {
      await sandbox.createDirectory('subdir');
      await sandbox.writeFile('subdir/test.md', '# Test');
      await sandbox.writeFile('abs-test.md', '# Abs Test');

      const relativePath = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: ['subdir/test.md']
      };
      const errors1 = await validator.validateFileReferences(relativePath, sandbox.getPath());
      expect(errors1).toHaveLength(0);

      const absolutePath = sandbox.getPath('abs-test.md');
      const absoluteManifest = {
        name: 'Test',
        version: '1.0.0',
        type: 'agent' as const,
        description: 'Test',
        files: [absolutePath]
      };
      const errors2 = await validator.validateFileReferences(absoluteManifest, sandbox.getPath());
      expect(errors2).toHaveLength(0);
    });

    it('should return empty array for empty files array', async () => {
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
  });

  describe('validateDependencies', () => {
    it('should accept valid semver ranges', () => {
      const dependencies = {
        'plugin-a': '^1.0.0',
        'plugin-b': '~2.3.4',
        'plugin-c': '>=1.2.3 <2.0.0',
        'plugin-d': '1.x',
        'plugin-e': '*',
        'plugin-f': 'x.x.x'
      };

      const errors = validator.validateDependencies(dependencies);
      expect(errors).toHaveLength(0);
    });

    it('should reject invalid dependencies', () => {
      const testCases = [
        { dependencies: { 'plugin-a': 'invalid-version' }, message: 'invalid version range' },
        { dependencies: { '': '1.0.0' }, message: 'name cannot be empty' },
        { dependencies: { 'plugin-a': '' }, message: 'empty version range' }
      ];

      for (const { dependencies, message } of testCases) {
        const errors = validator.validateDependencies(dependencies);
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toContain(message);
      }
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
      expect(results.size).toBe(0);
    });

    it('should find and validate deeply nested manifests recursively', async () => {
      await sandbox.createDirectory('agents/agent1');
      await sandbox.writeFile('agents/agent1/manifest.md', `---
name: Agent 1
version: 1.0.0
type: template
description: Test agent
---
`);

      await sandbox.createDirectory('a/b/c/d');
      await sandbox.writeFile('a/b/c/d/manifest.md', `---
name: Deep
version: 1.0.0
type: template
description: Deeply nested
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(2);
    });

    it('should detect and handle invalid manifests in batch', async () => {
      await sandbox.createDirectory('invalid');
      await sandbox.writeFile('invalid/manifest.md', `---
name: Invalid
---
`);

      await sandbox.createDirectory('valid');
      await sandbox.writeFile('valid/manifest.md', `---
name: Valid Agent
version: 1.0.0
type: template
description: A valid agent
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      expect(results.size).toBe(2);

      const invalidResult = Array.from(results.values()).find(r => !r.valid);
      expect(invalidResult).toBeDefined();
      expect(invalidResult!.errors.length).toBeGreaterThan(0);

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

    it('should handle non-existent or empty directories', async () => {
      const nonExistent = await validator.validateDirectory(sandbox.getPath('non-existent'), false);
      expect(nonExistent.size).toBe(1);
      const result = Array.from(nonExistent.values())[0];
      expect(result.valid).toBe(false);

      await sandbox.createDirectory('empty');
      const empty = await validator.validateDirectory(sandbox.getPath('empty'), false);
      expect(empty.size).toBe(0);
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

  describe('generateReport', () => {
    it('should generate comprehensive text report', async () => {
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

      expect(report).toContain('Plugin Metadata Validation Report');
      expect(report).toContain('Summary:');
      expect(report).toContain('Total Manifests:');
      expect(report).toContain('Passed:');
      expect(report).toContain('Failed:');
      expect(report).toContain('Test Agent');
      expect(report).toContain('2.5.1');
      expect(report).toContain('command');
    });

    it('should show errors and warnings in text report', async () => {
      await sandbox.writeFile('manifest.md', `---
name: Invalid
---
`);

      const results = await validator.validateDirectory(sandbox.getPath(), true);
      const report = validator.generateReport(results, 'text');

      expect(report).toContain('FAIL');
      expect(report).toContain('Errors:');
    });

    it('should generate comprehensive JSON report', async () => {
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
      expect(Array.isArray(parsed.results)).toBe(true);
      expect(parsed.results[0]).toHaveProperty('path');
      expect(parsed.results[0]).toHaveProperty('valid');
      expect(parsed.results[0]).toHaveProperty('errors');
      expect(parsed.results[0]).toHaveProperty('warnings');
    });

    it('should show error counts in JSON summary', async () => {
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

    it('should fail for non-existent file or directory path', async () => {
      const result1 = await validator.validateFile(sandbox.getPath('non-existent.md'));
      expect(result1.valid).toBe(false);
      expect(result1.errors).toHaveLength(1);
      expect(result1.errors[0].message).toContain('not found');

      await sandbox.createDirectory('test-dir');
      const result2 = await validator.validateFile(sandbox.getPath('test-dir'));
      expect(result2.valid).toBe(false);
      expect(result2.errors).toHaveLength(1);
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

    it('should fail for invalid manifest content', async () => {
      const testCases = [
        {
          content: `# No frontmatter here\n\nJust regular markdown.`,
          error: 'frontmatter'
        },
        {
          content: `---\nname: Test\n  invalid yaml syntax\n    broken: indentation\n---\n`,
          error: 'parse'
        },
        {
          content: `---\n---\n`,
          errorCount: 'greaterThan0'
        }
      ];

      for (const { content, error, errorCount } of testCases) {
        const result = await validator.validateManifest(content);
        expect(result.valid).toBe(false);
        if (error) {
          expect(result.errors.some(e => e.message.includes(error))).toBe(true);
        }
        if (errorCount === 'greaterThan0') {
          expect(result.errors.length).toBeGreaterThan(0);
        }
      }
    });

    it('should include warnings for missing optional fields', async () => {
      const testCases = [
        { field: 'model', type: 'agent', hasFiles: true },
        { field: 'tools', type: 'agent', hasFiles: true },
        { field: 'framework', type: 'template', hasFiles: false }
      ];

      for (const { field, type, hasFiles } of testCases) {
        const filesSection = hasFiles ? 'files:\n  - test.md\n' : '';
        const content = `---
name: Test ${type}
version: 1.0.0
type: ${type}
description: Test
${filesSection}---
`;
        const result = await validator.validateManifest(content);
        expect(result.warnings.some(w => w.field === field)).toBe(true);
      }
    });
  });

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

    it('should handle special characters and Unicode', async () => {
      const specialChars = `---
name: "Test: Agent (Special)"
version: 1.0.0
type: template
description: "Description with @#$% special chars"
---
`;
      const result1 = await validator.validateManifest(specialChars);
      expect(result1.valid).toBe(true);
      expect(result1.manifest?.name).toContain('Special');

      const unicode = `---
name: Test Agent 测试
version: 1.0.0
type: template
description: Unicode description éñü
---
`;
      const result2 = await validator.validateManifest(unicode);
      expect(result2.valid).toBe(true);
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
      expect(result.valid).toBe(true);
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
      expect(result.valid).toBe(false);
    });
  });
});
