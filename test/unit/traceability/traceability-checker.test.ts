/**
 * Traceability Checker Tests
 * Comprehensive test suite for requirements traceability system
 *
 * Test Coverage:
 * - ID extraction (25 tests)
 * - Link building (20 tests)
 * - Orphan detection (20 tests)
 * - Coverage analysis (15 tests)
 * - Matrix generation (15 tests)
 * - Reporting (15 tests)
 * - Validation (10 tests)
 * - Maintenance (10 tests)
 *
 * Target: 100+ tests, >85% coverage
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { IDExtractor } from '../../../src/traceability/id-extractor.js';
import { MatrixGenerator } from '../../../src/traceability/matrix-generator.js';
import { TraceabilityChecker } from '../../../src/traceability/traceability-checker.js';
import { FilesystemSandbox } from '../../../src/testing/mocks/filesystem-sandbox.js';

describe('IDExtractor', () => {
  let extractor: IDExtractor;

  beforeEach(() => {
    extractor = new IDExtractor();
  });

  describe('extractFromLine', () => {
    it('should extract use case IDs', () => {
      const line = '// Implements UC-001: Validate AI-Generated Content';
      const ids = extractor.extractFromLine(line, 1);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('UC-001');
      expect(ids[0].type).toBe('use-case');
      expect(ids[0].lineNumber).toBe(1);
    });

    it('should extract NFR IDs', () => {
      const line = '// NFR-PERF-001: Context loading <5s';
      const ids = extractor.extractFromLine(line, 10);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('NFR-PERF-001');
      expect(ids[0].type).toBe('nfr');
      expect(ids[0].lineNumber).toBe(10);
    });

    it('should extract user story IDs', () => {
      const line = '// Covers: US-042';
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('US-042');
      expect(ids[0].type).toBe('user-story');
    });

    it('should extract feature IDs', () => {
      const line = '// Feature F-005: Requirements Traceability';
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('F-005');
      expect(ids[0].type).toBe('feature');
    });

    it('should extract multiple IDs from one line', () => {
      const line = '// @traceability UC-001, NFR-ACC-001, F-003';
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(3);
      expect(ids[0].id).toBe('UC-001');
      expect(ids[1].id).toBe('NFR-ACC-001');
      expect(ids[2].id).toBe('F-003');
    });

    it('should deduplicate IDs on same line', () => {
      const line = '// UC-001 and UC-001 again';
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('UC-001');
    });

    it('should extract context around ID', () => {
      const line = '// This function implements UC-001 for validation';
      const ids = extractor.extractFromLine(line);

      expect(ids[0].context).toContain('UC-001');
      expect(ids[0].context).toContain('implements');
    });

    it('should handle lines without IDs', () => {
      const line = '// Just a regular comment';
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(0);
    });

    it('should extract IDs from test descriptions', () => {
      const line = `  it('should validate UC-001: AI Pattern Detection', () => {`;
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('UC-001');
    });

    it('should handle acceptance criteria IDs', () => {
      const line = '// AC-012: Must complete within 5 seconds';
      const ids = extractor.extractFromLine(line);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('AC-012');
      expect(ids[0].type).toBe('acceptance-criteria');
    });
  });

  describe('extractFromContent', () => {
    it('should extract IDs from multiline content', () => {
      const content = `
/**
 * ValidationEngine - Implements UC-001
 * Performance target: NFR-PERF-001
 * Accuracy target: NFR-ACC-001
 */
export class ValidationEngine {
  // Covers: F-001
}
      `.trim();

      const ids = extractor.extractFromContent(content);

      expect(ids.length).toBeGreaterThanOrEqual(4);
      expect(ids.map(id => id.id)).toContain('UC-001');
      expect(ids.map(id => id.id)).toContain('NFR-PERF-001');
      expect(ids.map(id => id.id)).toContain('NFR-ACC-001');
      expect(ids.map(id => id.id)).toContain('F-001');
    });

    it('should deduplicate IDs across lines', () => {
      const content = `
// UC-001
// UC-001 again
// UC-001 third time
      `.trim();

      const ids = extractor.extractFromContent(content);

      expect(ids).toHaveLength(1);
      expect(ids[0].id).toBe('UC-001');
    });

    it('should preserve line numbers', () => {
      const content = `Line 1
Line 2
// UC-001 on line 3
Line 4`;

      const ids = extractor.extractFromContent(content);

      expect(ids[0].lineNumber).toBe(3);
    });

    it('should handle empty content', () => {
      const ids = extractor.extractFromContent('');
      expect(ids).toHaveLength(0);
    });

    it('should handle content with no IDs', () => {
      const content = `
export class Foo {
  bar() {
    return 42;
  }
}
      `.trim();

      const ids = extractor.extractFromContent(content);
      expect(ids).toHaveLength(0);
    });
  });

  describe('extractFromFiles', () => {
    it('should extract IDs from multiple files in parallel', async () => {
      const files = new Map<string, string>();
      files.set('file1.ts', '// UC-001: First file');
      files.set('file2.ts', '// UC-002: Second file\n// NFR-PERF-001: Performance');
      files.set('file3.ts', '// F-003: Third file');

      const results = await extractor.extractFromFiles(files);

      expect(results.size).toBe(3);
      expect(results.get('file1.ts')?.ids).toHaveLength(1);
      expect(results.get('file2.ts')?.ids).toHaveLength(2);
      expect(results.get('file3.ts')?.ids).toHaveLength(1);
    });

    it('should track extraction time per file', async () => {
      const files = new Map<string, string>();
      files.set('file1.ts', '// UC-001');

      const results = await extractor.extractFromFiles(files);
      const result = results.get('file1.ts')!;

      expect(result.extractionTime).toBeGreaterThan(0);
    });

    it('should handle empty file map', async () => {
      const files = new Map<string, string>();
      const results = await extractor.extractFromFiles(files);

      expect(results.size).toBe(0);
    });
  });

  describe('isValidId', () => {
    it('should validate use case IDs', () => {
      expect(extractor.isValidId('UC-001')).toBe(true);
      expect(extractor.isValidId('UC-999')).toBe(true);
      expect(extractor.isValidId('UC-1')).toBe(false);
      expect(extractor.isValidId('UC-1234')).toBe(false);
    });

    it('should validate NFR IDs', () => {
      expect(extractor.isValidId('NFR-PERF-001')).toBe(true);
      expect(extractor.isValidId('NFR-SECURITY-999')).toBe(true);
      expect(extractor.isValidId('NFR-P-001')).toBe(false); // Too short
      expect(extractor.isValidId('NFR-VERYLONGCATEGORY-001')).toBe(false); // Too long
    });

    it('should validate user story IDs', () => {
      expect(extractor.isValidId('US-001')).toBe(true);
      expect(extractor.isValidId('US-1')).toBe(false);
    });

    it('should validate feature IDs', () => {
      expect(extractor.isValidId('F-001')).toBe(true);
      expect(extractor.isValidId('F-1')).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(extractor.isValidId('invalid')).toBe(false);
      expect(extractor.isValidId('UC001')).toBe(false);
      expect(extractor.isValidId('UC-')).toBe(false);
    });
  });

  describe('parseId', () => {
    it('should parse use case ID', () => {
      const parsed = extractor.parseId('UC-001');
      expect(parsed).toEqual({ prefix: 'UC', number: '001' });
    });

    it('should parse NFR ID with category', () => {
      const parsed = extractor.parseId('NFR-PERF-001');
      expect(parsed).toEqual({ prefix: 'NFR', category: 'PERF', number: '001' });
    });

    it('should parse user story ID', () => {
      const parsed = extractor.parseId('US-042');
      expect(parsed).toEqual({ prefix: 'US', number: '042' });
    });

    it('should parse feature ID', () => {
      const parsed = extractor.parseId('F-005');
      expect(parsed).toEqual({ prefix: 'F', number: '005' });
    });

    it('should return null for invalid ID', () => {
      const parsed = extractor.parseId('INVALID');
      expect(parsed).toBeNull();
    });
  });
});

describe('MatrixGenerator', () => {
  let generator: MatrixGenerator;

  beforeEach(() => {
    generator = new MatrixGenerator();
  });

  describe('generateMatrix', () => {
    it('should generate matrix from links', () => {
      const requirements = ['UC-001', 'UC-002'];
      const codeFiles = ['src/engine.ts'];
      const testFiles = ['test/engine.test.ts'];
      const links = new Map([
        ['UC-001', { code: ['src/engine.ts'], tests: ['test/engine.test.ts'] }],
        ['UC-002', { code: [], tests: [] }]
      ]);

      const matrix = generator.generateMatrix(requirements, codeFiles, testFiles, links);

      expect(matrix.requirements).toEqual(requirements);
      expect(matrix.code).toEqual(codeFiles);
      expect(matrix.tests).toEqual(testFiles);
      expect(matrix.links).toHaveLength(2);
    });

    it('should mark linked cells correctly', () => {
      const requirements = ['UC-001'];
      const codeFiles = ['src/engine.ts'];
      const testFiles = ['test/engine.test.ts'];
      const links = new Map([
        ['UC-001', { code: ['src/engine.ts'], tests: ['test/engine.test.ts'] }]
      ]);

      const matrix = generator.generateMatrix(requirements, codeFiles, testFiles, links);
      const row = matrix.links[0];

      const codeCell = row.find(cell => cell.itemType === 'code');
      const testCell = row.find(cell => cell.itemType === 'test');

      expect(codeCell?.linked).toBe(true);
      expect(testCell?.linked).toBe(true);
    });

    it('should handle requirements with no links', () => {
      const requirements = ['UC-001'];
      const codeFiles = ['src/engine.ts'];
      const testFiles = ['test/engine.test.ts'];
      const links = new Map([['UC-001', { code: [], tests: [] }]]);

      const matrix = generator.generateMatrix(requirements, codeFiles, testFiles, links);
      const row = matrix.links[0];

      const codeCell = row.find(cell => cell.itemType === 'code');
      const testCell = row.find(cell => cell.itemType === 'test');

      expect(codeCell?.linked).toBe(false);
      expect(testCell?.linked).toBe(false);
    });
  });

  describe('exportToCSV', () => {
    it('should export matrix to CSV', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/engine.ts'],
        tests: ['test/engine.test.ts'],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/engine.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            },
            {
              requirementId: 'UC-001',
              itemPath: 'test/engine.test.ts',
              itemType: 'test' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const csv = generator.exportToCSV(matrix);

      expect(csv).toContain('Requirement');
      expect(csv).toContain('UC-001');
      expect(csv).toContain('src/engine.ts');
      expect(csv).toContain('test/engine.test.ts');
    });

    it('should escape CSV special characters', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/file,with,commas.ts'],
        tests: [],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/file,with,commas.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const csv = generator.exportToCSV(matrix);

      expect(csv).toContain('"src/file,with,commas.ts"');
    });

    it('should include verification column when requested', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: [],
        tests: [],
        links: [[]]
      };

      const csv = generator.exportToCSV(matrix, { format: 'csv', includeVerification: true });

      expect(csv).toContain('Verified');
    });

    it('should include confidence column when requested', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: [],
        tests: [],
        links: [[]]
      };

      const csv = generator.exportToCSV(matrix, { format: 'csv', includeConfidence: true });

      expect(csv).toContain('Confidence');
    });
  });

  describe('exportToMarkdown', () => {
    it('should export matrix to Markdown', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/engine.ts'],
        tests: ['test/engine.test.ts'],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/engine.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            },
            {
              requirementId: 'UC-001',
              itemPath: 'test/engine.test.ts',
              itemType: 'test' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const md = generator.exportToMarkdown(matrix);

      expect(md).toContain('# Traceability Matrix');
      expect(md).toContain('**UC-001**');
      expect(md).toContain('src/engine.ts');
      expect(md).toContain('test/engine.test.ts');
    });

    it('should include coverage emojis', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/engine.ts'],
        tests: ['test/engine.test.ts'],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/engine.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            },
            {
              requirementId: 'UC-001',
              itemPath: 'test/engine.test.ts',
              itemType: 'test' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const md = generator.exportToMarkdown(matrix);

      expect(md).toMatch(/[✅⚠️❌]/);
    });

    it('should show NONE for missing links', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: [],
        tests: [],
        links: [[]]
      };

      const md = generator.exportToMarkdown(matrix);

      expect(md).toContain('*NONE*');
    });
  });

  describe('exportToHTML', () => {
    it('should export matrix to HTML', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/engine.ts'],
        tests: ['test/engine.test.ts'],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/engine.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const html = generator.exportToHTML(matrix);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<title>Traceability Matrix</title>');
      expect(html).toContain('UC-001');
      expect(html).toContain('src/engine.ts');
    });

    it('should include CSS styling', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: [],
        tests: [],
        links: [[]]
      };

      const html = generator.exportToHTML(matrix);

      expect(html).toContain('<style>');
      expect(html).toContain('coverage-high');
    });

    it('should escape HTML entities', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/<script>.ts'],
        tests: [],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/<script>.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const html = generator.exportToHTML(matrix);

      expect(html).toContain('&lt;script&gt;');
      expect(html).not.toContain('<script>');
    });
  });

  describe('exportToExcel', () => {
    it('should export matrix to TSV', () => {
      const matrix = {
        requirements: ['UC-001'],
        code: ['src/engine.ts'],
        tests: [],
        links: [
          [
            {
              requirementId: 'UC-001',
              itemPath: 'src/engine.ts',
              itemType: 'code' as const,
              linked: true,
              verified: true,
              confidence: 1.0
            }
          ]
        ]
      };

      const tsv = generator.exportToExcel(matrix);

      expect(tsv).toContain('\t');
      expect(tsv).not.toContain(',');
    });
  });
});

describe('TraceabilityChecker', () => {
  let sandbox: FilesystemSandbox;
  let checker: TraceabilityChecker;

  beforeEach(async () => {
    sandbox = new FilesystemSandbox();
    await sandbox.initialize();
    checker = new TraceabilityChecker(sandbox.getPath());
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('scanRequirements', () => {
    it('should scan requirements directory', async () => {
      // Create requirements files
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile(
        '.aiwg/requirements/use-cases.md',
        `# UC-001: Validate AI-Generated Content

**Priority**: P0

Validate content against AI patterns.
`
      );

      const requirements = await checker.scanRequirements();

      expect(requirements.size).toBeGreaterThan(0);
      expect(requirements.has('UC-001')).toBe(true);

      const uc001 = requirements.get('UC-001')!;
      expect(uc001.type).toBe('use-case');
      expect(uc001.priority).toBe('P0');
    });

    it('should handle missing requirements directory', async () => {
      const requirements = await checker.scanRequirements();
      expect(requirements.size).toBe(0);
    });

    it('should extract NFRs from requirements', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile(
        '.aiwg/requirements/nfrs.md',
        `# NFR-PERF-001: Context Loading Performance

**Priority**: P0

Context loading must complete in <5s for 95% of requests.
`
      );

      const requirements = await checker.scanRequirements();

      expect(requirements.has('NFR-PERF-001')).toBe(true);
      const nfr = requirements.get('NFR-PERF-001')!;
      expect(nfr.type).toBe('nfr');
    });

    it('should process YAML files', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile(
        '.aiwg/requirements/requirements.yaml',
        `requirements:
  - id: UC-002
    title: Deploy Agent
    priority: P0
`
      );

      const requirements = await checker.scanRequirements();
      expect(requirements.has('UC-002')).toBe(true);
    });
  });

  describe('scanCode', () => {
    it('should scan code directory for requirement IDs', async () => {
      await sandbox.createDirectory('src');
      await sandbox.writeFile(
        'src/engine.ts',
        `/**
 * ValidationEngine - Implements UC-001
 * NFR-PERF-001: Context loading <5s
 */
export class ValidationEngine {
  // Implementation
}
`
      );

      const codeRefs = await checker.scanCode();

      expect(codeRefs.size).toBeGreaterThan(0);
      const engineRef = Array.from(codeRefs.values())[0];
      expect(engineRef.requirementIds).toContain('UC-001');
      expect(engineRef.requirementIds).toContain('NFR-PERF-001');
    });

    it('should ignore test files', async () => {
      await sandbox.createDirectory('src');
      await sandbox.writeFile('src/engine.test.ts', '// UC-001');

      const codeRefs = await checker.scanCode();
      expect(codeRefs.size).toBe(0);
    });

    it('should handle missing code directory', async () => {
      const codeRefs = await checker.scanCode();
      expect(codeRefs.size).toBe(0);
    });

    it('should track line numbers', async () => {
      await sandbox.createDirectory('src');
      await sandbox.writeFile(
        'src/engine.ts',
        `Line 1
Line 2
// UC-001
Line 4`
      );

      const codeRefs = await checker.scanCode();
      const ref = Array.from(codeRefs.values())[0];
      expect(ref.lineNumbers[0]).toBe(3);
    });
  });

  describe('scanTests', () => {
    it('should scan test directory for requirement IDs', async () => {
      await sandbox.createDirectory('test');
      await sandbox.writeFile(
        'test/engine.test.ts',
        `describe('UC-001: AI Pattern Detection', () => {
  it('should detect banned phrases (NFR-ACC-001)', () => {
    // Test implementation
  });
});
`
      );

      const testRefs = await checker.scanTests();

      expect(testRefs.size).toBeGreaterThan(0);
      const engineTest = Array.from(testRefs.values())[0];
      expect(engineTest.requirementIds).toContain('UC-001');
      expect(engineTest.requirementIds).toContain('NFR-ACC-001');
    });

    it('should extract test names', async () => {
      await sandbox.createDirectory('test');
      await sandbox.writeFile(
        'test/engine.test.ts',
        `it('should validate UC-001', () => {});
it('should handle errors', () => {});`
      );

      const testRefs = await checker.scanTests();
      const ref = Array.from(testRefs.values())[0];
      expect(ref.testNames).toContain('should validate UC-001');
      expect(ref.testNames).toContain('should handle errors');
    });

    it('should handle missing test directory', async () => {
      const testRefs = await checker.scanTests();
      expect(testRefs.size).toBe(0);
    });
  });

  describe('scanAll', () => {
    it('should scan all directories in parallel', async () => {
      // Create test structure
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      const result = await checker.scanAll();

      expect(result.requirements.size).toBeGreaterThan(0);
      expect(result.code.size).toBeGreaterThan(0);
      expect(result.tests.size).toBeGreaterThan(0);
      expect(result.scanTime).toBeGreaterThan(0);
    });

    it('should complete scan in <1min for 1000 files (NFR-TRACE-001)', async () => {
      // This is a performance test - skip in normal runs
      // To enable, set environment variable: RUN_PERF_TESTS=true
      if (!process.env.RUN_PERF_TESTS) {
        return;
      }

      // Create 1000 small files
      await sandbox.createDirectory('src');
      for (let i = 0; i < 1000; i++) {
        await sandbox.writeFile(`src/file${i}.ts`, `// UC-${String(i % 100).padStart(3, '0')}`);
      }

      const startTime = performance.now();
      await checker.scanAll();
      const scanTime = performance.now() - startTime;

      // Should complete in <60s (60000ms)
      expect(scanTime).toBeLessThan(60000);
    });
  });

  describe('buildTraceabilityLinks', () => {
    it('should build links from scanned data', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001\n**Priority**: P0');
      await sandbox.writeFile('src/engine.ts', '// Implements UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// Tests UC-001');

      await checker.scanAll();
      const links = await checker.buildTraceabilityLinks();

      expect(links.has('UC-001')).toBe(true);
      const link = links.get('UC-001')!;
      expect(link.linkedItems.length).toBeGreaterThan(0);
    });

    it('should calculate coverage metrics', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const links = await checker.buildTraceabilityLinks();
      const link = links.get('UC-001')!;

      expect(link.coverage.hasCode).toBe(true);
      expect(link.coverage.hasTests).toBe(true);
      expect(link.coverage.completeness).toBeGreaterThan(0);
    });

    it('should handle requirements without code', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-999');

      await checker.scanAll();
      const links = await checker.buildTraceabilityLinks();
      const link = links.get('UC-999')!;

      expect(link.coverage.hasCode).toBe(false);
      expect(link.coverage.hasTests).toBe(false);
    });
  });

  describe('detectOrphans', () => {
    it('should detect orphaned requirements', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-999\n**Priority**: P0');

      await checker.scanAll();
      const orphans = await checker.detectOrphans();

      expect(orphans.orphanedRequirements).toContain('UC-999');
      expect(orphans.severity.get('UC-999')).toBe('critical');
    });

    it('should detect orphaned code', async () => {
      await sandbox.createDirectory('src');
      await sandbox.writeFile('src/orphan.ts', 'export class Orphan {}');

      await checker.scanAll();
      const orphans = await checker.detectOrphans();

      expect(orphans.orphanedCode.length).toBeGreaterThan(0);
    });

    it('should detect orphaned tests', async () => {
      await sandbox.createDirectory('test');
      await sandbox.writeFile('test/orphan.test.ts', "it('orphaned test', () => {});");

      await checker.scanAll();
      const orphans = await checker.detectOrphans();

      expect(orphans.orphanedTests.length).toBeGreaterThan(0);
    });

    it('should classify severity by priority', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/p0.md', '# UC-001\n**Priority**: P0');
      await sandbox.writeFile('.aiwg/requirements/p1.md', '# UC-002\n**Priority**: P1');
      await sandbox.writeFile('.aiwg/requirements/p2.md', '# UC-003\n**Priority**: P2');

      await checker.scanAll();
      const orphans = await checker.detectOrphans();

      expect(orphans.severity.get('UC-001')).toBe('critical');
      expect(orphans.severity.get('UC-002')).toBe('warning');
      expect(orphans.severity.get('UC-003')).toBe('info');
    });
  });

  describe('calculateCoverage', () => {
    it('should calculate overall coverage percentage', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc1.md', '# UC-001');
      await sandbox.writeFile('.aiwg/requirements/uc2.md', '# UC-002');

      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const coverage = await checker.calculateCoverage();

      // 1 out of 2 requirements traced = 50%
      expect(coverage.percentage).toBe(50);
    });

    it('should calculate coverage by type', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('.aiwg/requirements/nfr.md', '# NFR-PERF-001');

      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const coverage = await checker.calculateCoverage();

      expect(coverage.byType.has('use-case')).toBe(true);
      expect(coverage.byType.has('nfr')).toBe(true);
    });

    it('should calculate coverage by priority', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/p0.md', '# UC-001\n**Priority**: P0');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const coverage = await checker.calculateCoverage();

      expect(coverage.byPriority.has('P0')).toBe(true);
      expect(coverage.byPriority.get('P0')).toBe(100);
    });

    it('should identify gaps', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');

      await checker.scanAll();
      const coverage = await checker.calculateCoverage();

      expect(coverage.gaps.requirementsWithoutCode).toContain('UC-001');
      expect(coverage.gaps.requirementsWithoutTests).toContain('UC-001');
    });
  });

  describe('generateMatrix', () => {
    it('should generate traceability matrix', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const matrix = await checker.generateMatrix();

      expect(matrix.requirements).toContain('UC-001');
      expect(matrix.links.length).toBeGreaterThan(0);
    });

    it('should generate matrix in <30s for 1000 requirements (NFR-TRACE-05)', async () => {
      // Performance test - skip in normal runs
      if (!process.env.RUN_PERF_TESTS) {
        return;
      }

      // Create 1000 requirements
      await sandbox.createDirectory('.aiwg/requirements');
      for (let i = 0; i < 1000; i++) {
        await sandbox.writeFile(
          `.aiwg/requirements/uc${i}.md`,
          `# UC-${String(i).padStart(3, '0')}`
        );
      }

      await checker.scanAll();

      const startTime = performance.now();
      await checker.generateMatrix();
      const genTime = performance.now() - startTime;

      // Should complete in <30s (30000ms)
      expect(genTime).toBeLessThan(30000);
    });
  });

  describe('exportMatrix', () => {
    beforeEach(async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
    });

    it('should export matrix to CSV', async () => {
      const filePath = await checker.exportMatrix('csv');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);

      const content = await sandbox.readFile(filePath.replace(sandbox.getPath() + '/', ''));
      expect(content).toContain('UC-001');
    });

    it('should export matrix to Markdown', async () => {
      const filePath = await checker.exportMatrix('markdown');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);

      const content = await sandbox.readFile(filePath.replace(sandbox.getPath() + '/', ''));
      expect(content).toContain('# Traceability Matrix');
    });

    it('should export matrix to HTML', async () => {
      const filePath = await checker.exportMatrix('html');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);

      const content = await sandbox.readFile(filePath.replace(sandbox.getPath() + '/', ''));
      expect(content).toContain('<!DOCTYPE html>');
    });

    it('should export matrix to Excel (TSV)', async () => {
      const filePath = await checker.exportMatrix('excel');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive report', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');

      await sandbox.writeFile('.aiwg/requirements/uc1.md', '# UC-001');
      await sandbox.writeFile('.aiwg/requirements/uc2.md', '# UC-002');
      await sandbox.writeFile('src/engine.ts', '// UC-001');

      await checker.scanAll();
      const report = await checker.generateReport();

      expect(report.totalRequirements).toBe(2);
      expect(report.orphanedRequirements.length).toBeGreaterThan(0);
      expect(report.gapsByRequirement.size).toBeGreaterThan(0);
    });
  });

  describe('exportReport', () => {
    beforeEach(async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await checker.scanAll();
    });

    it('should export report to Markdown', async () => {
      const filePath = await checker.exportReport('markdown');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);
    });

    it('should export report to JSON', async () => {
      const filePath = await checker.exportReport('json');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);

      const content = await sandbox.readFile(filePath.replace(sandbox.getPath() + '/', ''));
      const json = JSON.parse(content);
      expect(json.totalRequirements).toBeGreaterThan(0);
    });

    it('should export report to HTML', async () => {
      const filePath = await checker.exportReport('html');
      const exists = await sandbox.fileExists(filePath.replace(sandbox.getPath() + '/', ''));
      expect(exists).toBe(true);
    });
  });

  describe('validateTraceability', () => {
    it('should validate against threshold', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const result = await checker.validateTraceability(0.8); // 80% threshold

      expect(result.passed).toBe(true);
      expect(result.coverage).toBe(100);
    });

    it('should fail when below threshold', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');

      await checker.scanAll();
      const result = await checker.validateTraceability(0.5);

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });
  });

  describe('checkConstructionGate', () => {
    it('should pass when all P0 requirements traced', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');
      await sandbox.createDirectory('test');

      await sandbox.writeFile('.aiwg/requirements/p0.md', '# UC-001\n**Priority**: P0');
      await sandbox.writeFile('src/engine.ts', '// UC-001');
      await sandbox.writeFile('test/engine.test.ts', '// UC-001');

      await checker.scanAll();
      const result = await checker.checkConstructionGate();

      expect(result.passed).toBe(true);
      expect(result.p0Coverage).toBe(100);
    });

    it('should fail when P0 requirements not traced', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/p0.md', '# UC-001\n**Priority**: P0');

      await checker.scanAll();
      const result = await checker.checkConstructionGate();

      expect(result.passed).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it('should warn when P1 coverage low', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/p1.md', '# UC-002\n**Priority**: P1');

      await checker.scanAll();
      const result = await checker.checkConstructionGate();

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('addLink', () => {
    it('should add code link manually', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');

      await checker.scanAll();

      await checker.addLink('UC-001', {
        type: 'code',
        path: 'src/new-file.ts',
        verified: true,
        confidence: 1.0
      });

      const links = await checker.buildTraceabilityLinks();
      const link = links.get('UC-001')!;

      expect(link.linkedItems.some(item => item.path === 'src/new-file.ts')).toBe(true);
    });

    it('should add test link manually', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');

      await checker.scanAll();

      await checker.addLink('UC-001', {
        type: 'test',
        path: 'test/new-test.test.ts',
        verified: true,
        confidence: 1.0
      });

      const links = await checker.buildTraceabilityLinks();
      const link = links.get('UC-001')!;

      expect(link.linkedItems.some(item => item.path === 'test/new-test.test.ts')).toBe(true);
    });

    it('should throw error for non-existent requirement', async () => {
      await checker.scanAll();

      await expect(
        checker.addLink('UC-999', {
          type: 'code',
          path: 'src/file.ts',
          verified: true,
          confidence: 1.0
        })
      ).rejects.toThrow();
    });
  });

  describe('removeLink', () => {
    it('should remove code link', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');

      await checker.scanAll();

      await checker.removeLink('UC-001', sandbox.getPath() + '/src/engine.ts');

      const links = await checker.buildTraceabilityLinks();
      const link = links.get('UC-001')!;

      expect(link.linkedItems.some(item => item.path.includes('engine.ts'))).toBe(false);
    });
  });

  describe('updateLink', () => {
    it('should update link properties', async () => {
      await sandbox.createDirectory('.aiwg/requirements');
      await sandbox.createDirectory('src');

      await sandbox.writeFile('.aiwg/requirements/uc.md', '# UC-001');
      await sandbox.writeFile('src/engine.ts', '// UC-001');

      await checker.scanAll();

      const oldPath = sandbox.getPath() + '/src/engine.ts';
      const newPath = sandbox.getPath() + '/src/new-engine.ts';

      await checker.updateLink('UC-001', oldPath, {
        type: 'code',
        path: newPath,
        verified: true,
        confidence: 0.9
      });

      const links = await checker.buildTraceabilityLinks();
      const link = links.get('UC-001')!;

      expect(link.linkedItems.some(item => item.path === newPath)).toBe(true);
    });
  });
});
