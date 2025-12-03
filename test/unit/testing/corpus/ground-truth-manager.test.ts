/**
 * Tests for GroundTruthCorpusManager
 *
 * @module test/unit/testing/corpus/ground-truth-manager.test
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import {
  GroundTruthCorpusManager,
  CorpusManifest,
  GroundTruthItem
} from '../../../../src/testing/corpus/ground-truth-manager.js';

describe('GroundTruthCorpusManager', () => {
  let testDir: string;
  let manager: GroundTruthCorpusManager;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = path.join(os.tmpdir(), `corpus-manager-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await fs.mkdir(testDir, { recursive: true });
    manager = new GroundTruthCorpusManager(testDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.rm(testDir, { recursive: true, force: true });
  });

  /**
   * Helper to create a test manifest
   */
  async function createManifest(manifest: CorpusManifest): Promise<void> {
    const manifestDir = path.join(testDir, 'manifests');
    await fs.mkdir(manifestDir, { recursive: true });
    const manifestPath = path.join(manifestDir, `${manifest.type}-v${manifest.version}.json`);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  }

  /**
   * Helper to create test data file
   */
  async function createDataFile(type: string, fileName: string, items: GroundTruthItem[]): Promise<void> {
    const dataDir = path.join(testDir, 'data', type);
    await fs.mkdir(dataDir, { recursive: true });
    const dataPath = path.join(dataDir, fileName);
    await fs.writeFile(dataPath, JSON.stringify(items, null, 2));
  }

  describe('Initialization', () => {
    it('should initialize and create directory structure', async () => {
      // Remove the existing test directory to force creation
      await fs.rm(testDir, { recursive: true, force: true });

      await manager.initialize();

      // Check directories exist
      const dirs = ['manifests', 'data/ai-vs-human', 'data/codebases'];
      for (const dir of dirs) {
        const stat = await fs.stat(path.join(testDir, dir));
        expect(stat.isDirectory()).toBe(true);
      }
    });

    it('should discover existing manifests', async () => {
      const manifest: CorpusManifest = {
        name: 'Test Corpus',
        type: 'ai-vs-human',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 2,
        schema: {
          groundTruthType: 'boolean',
          formatDescription: 'true=AI, false=human'
        },
        labelDistribution: { 'true': 1, 'false': 1 },
        linkedNFRs: ['NFR-ACC-001'],
        dataFiles: ['test-data.json']
      };

      await createManifest(manifest);
      await manager.initialize();

      const corpora = await manager.listCorpora();
      expect(corpora.length).toBe(1);
      expect(corpora[0].type).toBe('ai-vs-human');
      expect(corpora[0].version).toBe('1.0.0');
    });
  });

  describe('Corpus Loading', () => {
    const testManifest: CorpusManifest = {
      name: 'AI vs Human Test',
      type: 'ai-vs-human',
      version: '1.0.0',
      description: 'Test corpus',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 3,
      schema: {
        groundTruthType: 'boolean',
        formatDescription: 'true=AI, false=human'
      },
      labelDistribution: { 'true': 2, 'false': 1 },
      linkedNFRs: ['NFR-ACC-001'],
      dataFiles: ['test-data.json']
    };

    const testItems: GroundTruthItem[] = [
      { id: 'doc-001', content: 'AI generated text', groundTruth: true },
      { id: 'doc-002', content: 'Human written text', groundTruth: false },
      { id: 'doc-003', content: 'More AI text', groundTruth: true }
    ];

    beforeEach(async () => {
      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'test-data.json', testItems);
    });

    it('should load corpus by type and version', async () => {
      const corpus = await manager.loadCorpus('ai-vs-human', '1.0.0');

      expect(corpus.size).toBe(3);
      expect(corpus.get('doc-001')?.groundTruth).toBe(true);
      expect(corpus.get('doc-002')?.groundTruth).toBe(false);
    });

    it('should load latest version by default', async () => {
      const corpus = await manager.loadCorpus('ai-vs-human');

      expect(corpus.size).toBe(3);
    });

    it('should throw for non-existent corpus', async () => {
      await expect(manager.loadCorpus('codebases', '1.0.0'))
        .rejects.toThrow('Corpus not found');
    });

    it('should cache loaded corpus', async () => {
      const corpus1 = await manager.loadCorpus('ai-vs-human', '1.0.0');
      const corpus2 = await manager.loadCorpus('ai-vs-human', '1.0.0');

      // Same instance
      expect(corpus1).toBe(corpus2);
    });
  });

  describe('Ground Truth Retrieval', () => {
    const testManifest: CorpusManifest = {
      name: 'Test',
      type: 'ai-vs-human',
      version: '1.0.0',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 2,
      schema: {
        groundTruthType: 'boolean',
        formatDescription: 'boolean'
      },
      labelDistribution: { 'true': 1, 'false': 1 },
      linkedNFRs: [],
      dataFiles: ['data.json']
    };

    const testItems: GroundTruthItem[] = [
      { id: 'item-001', content: 'content 1', groundTruth: true },
      { id: 'item-002', content: 'content 2', groundTruth: false }
    ];

    beforeEach(async () => {
      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', testItems);
    });

    it('should get ground truth for specific item', async () => {
      const truth = await manager.getGroundTruth('ai-vs-human', 'item-001');
      expect(truth).toBe(true);
    });

    it('should throw for non-existent item', async () => {
      await expect(manager.getGroundTruth('ai-vs-human', 'non-existent'))
        .rejects.toThrow('Item not found');
    });
  });

  describe('Ground Truth Validation', () => {
    const testManifest: CorpusManifest = {
      name: 'Test',
      type: 'ai-vs-human',
      version: '1.0.0',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 2,
      schema: {
        groundTruthType: 'boolean',
        formatDescription: 'boolean'
      },
      labelDistribution: { 'true': 1, 'false': 1 },
      linkedNFRs: [],
      dataFiles: ['data.json']
    };

    const testItems: GroundTruthItem[] = [
      { id: 'item-001', content: 'content 1', groundTruth: true },
      { id: 'item-002', content: 'content 2', groundTruth: false }
    ];

    beforeEach(async () => {
      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', testItems);
    });

    it('should validate matching value', async () => {
      const result = await manager.validateAgainstGroundTruth('ai-vs-human', 'item-001', true);

      expect(result.matches).toBe(true);
      expect(result.expected).toBe(true);
      expect(result.actual).toBe(true);
    });

    it('should detect non-matching value', async () => {
      const result = await manager.validateAgainstGroundTruth('ai-vs-human', 'item-001', false);

      expect(result.matches).toBe(false);
      expect(result.expected).toBe(true);
      expect(result.actual).toBe(false);
    });

    it('should validate object values', async () => {
      // Create object-based corpus
      const objectManifest: CorpusManifest = {
        name: 'Object Test',
        type: 'codebases',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 1,
        schema: {
          groundTruthType: 'object',
          requiredFields: ['language', 'framework'],
          formatDescription: 'object'
        },
        labelDistribution: {},
        linkedNFRs: [],
        dataFiles: ['data.json']
      };

      const objectItems: GroundTruthItem[] = [
        {
          id: 'codebase-001',
          content: '/path/to/codebase',
          groundTruth: { language: 'typescript', framework: 'express' }
        }
      ];

      await createManifest(objectManifest);
      await createDataFile('codebases', 'data.json', objectItems);

      const result = await manager.validateAgainstGroundTruth(
        'codebases',
        'codebase-001',
        { language: 'typescript', framework: 'express' }
      );

      expect(result.matches).toBe(true);
    });
  });

  describe('Corpus Statistics', () => {
    const testManifest: CorpusManifest = {
      name: 'Test',
      type: 'ai-vs-human',
      version: '1.0.0',
      description: 'Test corpus for stats',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-15T00:00:00Z',
      itemCount: 100,
      schema: {
        groundTruthType: 'boolean',
        formatDescription: 'boolean'
      },
      labelDistribution: { 'true': 50, 'false': 50 },
      linkedNFRs: ['NFR-ACC-001', 'NFR-ACC-002'],
      dataFiles: ['data.json']
    };

    beforeEach(async () => {
      await createManifest(testManifest);
      // Create empty data file (stats come from manifest)
      await createDataFile('ai-vs-human', 'data.json', []);
    });

    it('should return corpus statistics', async () => {
      const stats = await manager.getCorpusStatistics('ai-vs-human', '1.0.0');

      expect(stats.type).toBe('ai-vs-human');
      expect(stats.version).toBe('1.0.0');
      expect(stats.totalItems).toBe(100);
      expect(stats.labelDistribution).toEqual({ 'true': 50, 'false': 50 });
      expect(stats.linkedNFRs).toContain('NFR-ACC-001');
    });
  });

  describe('Corpus Validation', () => {
    it('should validate valid corpus', async () => {
      const testManifest: CorpusManifest = {
        name: 'Valid Test',
        type: 'ai-vs-human',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 10,
        schema: {
          groundTruthType: 'boolean',
          formatDescription: 'boolean'
        },
        labelDistribution: { 'true': 5, 'false': 5 },
        linkedNFRs: [],
        dataFiles: ['data.json']
      };

      const items: GroundTruthItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        content: `content ${i}`,
        groundTruth: i < 5
      }));

      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', items);

      const result = await manager.validateCorpus('ai-vs-human', '1.0.0');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect item count mismatch', async () => {
      const testManifest: CorpusManifest = {
        name: 'Mismatch Test',
        type: 'ai-vs-human',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 100, // Claims 100, but will only have 10
        schema: {
          groundTruthType: 'boolean',
          formatDescription: 'boolean'
        },
        labelDistribution: {},
        linkedNFRs: [],
        dataFiles: ['data.json']
      };

      const items: GroundTruthItem[] = Array.from({ length: 10 }, (_, i) => ({
        id: `item-${i}`,
        content: `content ${i}`,
        groundTruth: true
      }));

      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', items);

      const result = await manager.validateCorpus('ai-vs-human', '1.0.0');

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('mismatch'))).toBe(true);
    });

    it('should warn on small corpus', async () => {
      const testManifest: CorpusManifest = {
        name: 'Small Test',
        type: 'ai-vs-human',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 3,
        schema: {
          groundTruthType: 'boolean',
          formatDescription: 'boolean'
        },
        labelDistribution: {},
        linkedNFRs: [],
        dataFiles: ['data.json']
      };

      const items: GroundTruthItem[] = [
        { id: 'a', content: 'a', groundTruth: true },
        { id: 'b', content: 'b', groundTruth: false },
        { id: 'c', content: 'c', groundTruth: true }
      ];

      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', items);

      const result = await manager.validateCorpus('ai-vs-human', '1.0.0');

      expect(result.warnings.some(w => w.includes('statistically significant'))).toBe(true);
    });
  });

  describe('Version Management', () => {
    it('should list all available corpora', async () => {
      // Create multiple versions
      for (const version of ['1.0.0', '1.1.0', '2.0.0']) {
        const manifest: CorpusManifest = {
          name: 'Test',
          type: 'ai-vs-human',
          version,
          description: 'Test',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          itemCount: 1,
          schema: { groundTruthType: 'boolean', formatDescription: 'boolean' },
          labelDistribution: {},
          linkedNFRs: [],
          dataFiles: []
        };
        await createManifest(manifest);
      }

      await manager.initialize();
      const corpora = await manager.listCorpora();

      expect(corpora.length).toBe(3);
      // Should be sorted by version descending
      expect(corpora[0].version).toBe('2.0.0');
    });

    it('should check if corpus exists', async () => {
      const manifest: CorpusManifest = {
        name: 'Test',
        type: 'ai-vs-human',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 1,
        schema: { groundTruthType: 'boolean', formatDescription: 'boolean' },
        labelDistribution: {},
        linkedNFRs: [],
        dataFiles: []
      };
      await createManifest(manifest);

      await manager.initialize();

      expect(await manager.hasCorpus('ai-vs-human', '1.0.0')).toBe(true);
      expect(await manager.hasCorpus('ai-vs-human', '2.0.0')).toBe(false);
      expect(await manager.hasCorpus('codebases')).toBe(false);
    });
  });

  describe('Batch Validation', () => {
    const testManifest: CorpusManifest = {
      name: 'Batch Test',
      type: 'ai-vs-human',
      version: '1.0.0',
      description: 'Test',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      itemCount: 5,
      schema: {
        groundTruthType: 'boolean',
        formatDescription: 'boolean'
      },
      labelDistribution: {},
      linkedNFRs: [],
      dataFiles: ['data.json']
    };

    const testItems: GroundTruthItem[] = [
      { id: 'item-1', content: '1', groundTruth: true },
      { id: 'item-2', content: '2', groundTruth: false },
      { id: 'item-3', content: '3', groundTruth: true },
      { id: 'item-4', content: '4', groundTruth: false },
      { id: 'item-5', content: '5', groundTruth: true }
    ];

    beforeEach(async () => {
      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', testItems);
    });

    it('should batch validate predictions', async () => {
      const predictions = new Map<string, boolean>([
        ['item-1', true],  // correct
        ['item-2', false], // correct
        ['item-3', false], // wrong
        ['item-4', true],  // wrong
        ['item-5', true]   // correct
      ]);

      const result = await manager.batchValidate('ai-vs-human', predictions, '1.0.0');

      expect(result.totalItems).toBe(5);
      expect(result.totalCorrect).toBe(3);
      expect(result.accuracy).toBe(0.6);
      expect(result.results.filter(r => r.matches).length).toBe(3);
    });

    it('should handle missing items in batch validation', async () => {
      const predictions = new Map<string, boolean>([
        ['item-1', true],
        ['non-existent', true]
      ]);

      const result = await manager.batchValidate('ai-vs-human', predictions, '1.0.0');

      expect(result.totalItems).toBe(2);
      expect(result.totalCorrect).toBe(1);
      // Non-existent item should not match
      expect(result.results.find(r => r.itemId === 'non-existent')?.matches).toBe(false);
    });
  });

  describe('Get All Items', () => {
    it('should return all items from corpus', async () => {
      const testManifest: CorpusManifest = {
        name: 'Test',
        type: 'ai-vs-human',
        version: '1.0.0',
        description: 'Test',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        itemCount: 3,
        schema: {
          groundTruthType: 'boolean',
          formatDescription: 'boolean'
        },
        labelDistribution: {},
        linkedNFRs: [],
        dataFiles: ['data.json']
      };

      const testItems: GroundTruthItem[] = [
        { id: 'a', content: 'a', groundTruth: true },
        { id: 'b', content: 'b', groundTruth: false },
        { id: 'c', content: 'c', groundTruth: true }
      ];

      await createManifest(testManifest);
      await createDataFile('ai-vs-human', 'data.json', testItems);

      const items = await manager.getAllItems('ai-vs-human', '1.0.0');

      expect(items.length).toBe(3);
      expect(items.map(i => i.id).sort()).toEqual(['a', 'b', 'c']);
    });
  });
});
