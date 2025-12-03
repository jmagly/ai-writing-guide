/**
 * Tests for CorpusBuilder
 *
 * @module test/unit/testing/corpus/corpus-builder.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  CorpusBuilder,
  CorpusBuilders
} from '../../../../src/testing/corpus/corpus-builder.js';
import { GroundTruthItem } from '../../../../src/testing/corpus/ground-truth-manager.js';

describe('CorpusBuilder', () => {
  let testDir: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `corpus-builder-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('Item Management', () => {
    it('should add items to corpus', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItem({
        id: 'doc-001',
        content: 'Test content',
        groundTruth: true
      });

      expect(builder.getItemCount()).toBe(1);
      expect(builder.getItem('doc-001')).toBeDefined();
    });

    it('should reject duplicate IDs', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItem({
        id: 'doc-001',
        content: 'Test content',
        groundTruth: true
      });

      expect(() => builder.addItem({
        id: 'doc-001',
        content: 'Different content',
        groundTruth: false
      })).toThrow('Duplicate item ID');
    });

    it('should add multiple items at once', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItems([
        { id: 'doc-001', content: 'Content 1', groundTruth: true },
        { id: 'doc-002', content: 'Content 2', groundTruth: false },
        { id: 'doc-003', content: 'Content 3', groundTruth: true }
      ]);

      expect(builder.getItemCount()).toBe(3);
    });

    it('should remove items', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItem({ id: 'doc-001', content: 'Test', groundTruth: true });
      expect(builder.getItemCount()).toBe(1);

      const removed = builder.removeItem('doc-001');
      expect(removed).toBe(true);
      expect(builder.getItemCount()).toBe(0);
    });

    it('should return false when removing non-existent item', () => {
      const builder = CorpusBuilders.aiVsHuman();

      const removed = builder.removeItem('non-existent');
      expect(removed).toBe(false);
    });

    it('should get all items', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItems([
        { id: 'a', content: 'A', groundTruth: true },
        { id: 'b', content: 'B', groundTruth: false }
      ]);

      const items = builder.getAllItems();
      expect(items.length).toBe(2);
    });

    it('should clear all items', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItems([
        { id: 'a', content: 'A', groundTruth: true },
        { id: 'b', content: 'B', groundTruth: false }
      ]);

      builder.clear();
      expect(builder.getItemCount()).toBe(0);
    });
  });

  describe('Validation', () => {
    it('should reject empty corpus', () => {
      const builder = CorpusBuilders.aiVsHuman();

      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    it('should warn on small corpus', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItems([
        { id: 'a', content: 'A', groundTruth: true },
        { id: 'b', content: 'B', groundTruth: false }
      ]);

      const result = builder.validate();

      expect(result.warnings.some(w => w.includes('statistically significant'))).toBe(true);
    });

    it('should validate ground truth type (boolean)', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItem({
        id: 'doc-001',
        content: 'Test',
        groundTruth: 'not-a-boolean' as any
      });

      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('should be boolean'))).toBe(true);
    });

    it('should validate ground truth type (object)', () => {
      const builder = CorpusBuilders.codebases();

      builder.addItem({
        id: 'codebase-001',
        content: '/path/to/code',
        groundTruth: { language: 'typescript', framework: 'express', techStack: ['node'] }
      });

      const result = builder.validate();

      expect(result.valid).toBe(true);
    });

    it('should detect missing required fields in object ground truth', () => {
      const builder = CorpusBuilders.codebases();

      builder.addItem({
        id: 'codebase-001',
        content: '/path/to/code',
        groundTruth: { language: 'typescript' } // missing framework, techStack
      });

      const result = builder.validate();

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('framework'))).toBe(true);
    });

    it('should warn on single-label corpus', () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Add 20 items all with same label
      for (let i = 0; i < 20; i++) {
        builder.addItem({
          id: `doc-${i}`,
          content: `Content ${i}`,
          groundTruth: true
        });
      }

      const result = builder.validate();

      expect(result.warnings.some(w => w.includes('same label'))).toBe(true);
    });

    it('should warn on severe class imbalance', () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Add 100 true items
      for (let i = 0; i < 100; i++) {
        builder.addItem({
          id: `ai-${i}`,
          content: `AI Content ${i}`,
          groundTruth: true
        });
      }

      // Add only 5 false items
      for (let i = 0; i < 5; i++) {
        builder.addItem({
          id: `human-${i}`,
          content: `Human Content ${i}`,
          groundTruth: false
        });
      }

      const result = builder.validate();

      expect(result.warnings.some(w => w.includes('imbalance'))).toBe(true);
    });
  });

  describe('Export', () => {
    it('should export valid corpus', async () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Add 20 items for valid corpus
      for (let i = 0; i < 10; i++) {
        builder.addItem({
          id: `ai-${i}`,
          content: `AI Content ${i}`,
          groundTruth: true
        });
        builder.addItem({
          id: `human-${i}`,
          content: `Human Content ${i}`,
          groundTruth: false
        });
      }

      await builder.export({
        outputDir: testDir,
        version: '1.0.0'
      });

      // Check manifest was created
      const manifestPath = path.join(testDir, 'manifests', 'ai-vs-human-v1.0.0.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      expect(manifest.type).toBe('ai-vs-human');
      expect(manifest.version).toBe('1.0.0');
      expect(manifest.itemCount).toBe(20);

      // Check data file was created
      const dataPath = path.join(testDir, 'data', 'ai-vs-human', manifest.dataFiles[0]);
      const dataContent = await fs.readFile(dataPath, 'utf-8');
      const data = JSON.parse(dataContent);

      expect(data.length).toBe(20);
    });

    it('should reject export of invalid corpus', async () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Empty corpus is invalid
      await expect(builder.export({
        outputDir: testDir,
        version: '1.0.0'
      })).rejects.toThrow('Cannot export invalid corpus');
    });

    it('should split large corpus into multiple files', async () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Add 50 items
      for (let i = 0; i < 50; i++) {
        builder.addItem({
          id: `doc-${i}`,
          content: `Content ${i}`,
          groundTruth: i % 2 === 0
        });
      }

      await builder.export({
        outputDir: testDir,
        version: '1.0.0',
        maxItemsPerFile: 20
      });

      // Check manifest has multiple data files
      const manifestPath = path.join(testDir, 'manifests', 'ai-vs-human-v1.0.0.json');
      const manifestContent = await fs.readFile(manifestPath, 'utf-8');
      const manifest = JSON.parse(manifestContent);

      expect(manifest.dataFiles.length).toBe(3); // 50 / 20 = 3 files
    });
  });

  describe('Import', () => {
    it('should import items from JSON file', async () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Create test JSON file
      const items: GroundTruthItem[] = [
        { id: 'a', content: 'A', groundTruth: true },
        { id: 'b', content: 'B', groundTruth: false }
      ];
      const filePath = path.join(testDir, 'import-test.json');
      await fs.writeFile(filePath, JSON.stringify(items));

      await builder.importFromFile(filePath);

      expect(builder.getItemCount()).toBe(2);
    });

    it('should import from object with items array', async () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Create test JSON file with wrapper object
      const data = {
        items: [
          { id: 'a', content: 'A', groundTruth: true },
          { id: 'b', content: 'B', groundTruth: false }
        ]
      };
      const filePath = path.join(testDir, 'import-test.json');
      await fs.writeFile(filePath, JSON.stringify(data));

      await builder.importFromFile(filePath);

      expect(builder.getItemCount()).toBe(2);
    });

    it('should reject invalid file format', async () => {
      const builder = CorpusBuilders.aiVsHuman();

      // Create invalid JSON file
      const data = { notItems: 'invalid' };
      const filePath = path.join(testDir, 'invalid.json');
      await fs.writeFile(filePath, JSON.stringify(data));

      await expect(builder.importFromFile(filePath))
        .rejects.toThrow('Invalid file format');
    });
  });

  describe('Statistics', () => {
    it('should calculate corpus statistics', () => {
      const builder = CorpusBuilders.aiVsHuman();

      for (let i = 0; i < 30; i++) {
        builder.addItem({
          id: `doc-${i}`,
          content: `Content ${i}`,
          groundTruth: i < 20 // 20 true, 10 false
        });
      }

      const stats = builder.getStatistics();

      expect(stats.itemCount).toBe(30);
      expect(stats.type).toBe('ai-vs-human');
      expect(stats.labelDistribution['true']).toBe(20);
      expect(stats.labelDistribution['false']).toBe(10);
    });
  });

  describe('Pre-configured Builders', () => {
    it('should create AI vs Human builder', () => {
      const builder = CorpusBuilders.aiVsHuman();

      builder.addItem({ id: 'a', content: 'A', groundTruth: true });
      const stats = builder.getStatistics();

      expect(stats.type).toBe('ai-vs-human');
    });

    it('should create Codebases builder', () => {
      const builder = CorpusBuilders.codebases();

      builder.addItem({
        id: 'a',
        content: '/path',
        groundTruth: { language: 'ts', framework: 'express', techStack: ['node'] }
      });
      const stats = builder.getStatistics();

      expect(stats.type).toBe('codebases');
    });

    it('should create Traceability builder', () => {
      const builder = CorpusBuilders.traceability();

      builder.addItem({
        id: 'a',
        content: 'REQ-001',
        groundTruth: { requirementId: 'REQ-001', codeFiles: ['a.ts'], testFiles: ['a.test.ts'] }
      });
      const stats = builder.getStatistics();

      expect(stats.type).toBe('traceability');
    });

    it('should create Security Attacks builder', () => {
      const builder = CorpusBuilders.securityAttacks();

      builder.addItem({
        id: 'a',
        content: 'SELECT * FROM users WHERE id = ${id}',
        groundTruth: { attackType: 'sql-injection', severity: 'critical' }
      });
      const stats = builder.getStatistics();

      expect(stats.type).toBe('security-attacks');
    });

    it('should create Template Recommendations builder', () => {
      const builder = CorpusBuilders.templateRecommendations();

      builder.addItem({
        id: 'a',
        content: { projectType: 'web', framework: 'react' },
        groundTruth: ['react-component-template', 'hook-template']
      });
      const stats = builder.getStatistics();

      expect(stats.type).toBe('template-recommendations');
    });
  });
});
