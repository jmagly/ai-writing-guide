/**
 * Model Catalog Loader Tests
 *
 * @tests @src/catalog/loader.ts
 * @requirement @.aiwg/architecture/enhanced-model-selection-design.md#9-model-catalog-system
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { existsSync } from 'fs';
import { readFile } from 'fs/promises';

// Mock fs modules
vi.mock('fs', () => ({
  existsSync: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Import after mocking
import {
  loadCatalog,
  getModel,
  listModels,
  searchModels,
} from '../../../src/catalog/loader.js';

describe('Catalog Loader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('loadCatalog', () => {
    it('should load builtin catalog when no other catalogs exist', async () => {
      // Mock builtin catalog file exists
      vi.mocked(existsSync).mockImplementation((path) => {
        return path.toString().includes('builtin-models.json');
      });

      // Mock readFile to return builtin catalog
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          models: {
            'test-model': {
              id: 'test-model',
              provider: 'anthropic',
              displayName: 'Test Model',
              status: 'active',
              deprecated: false,
              capabilities: {
                contextWindow: 100000,
                maxOutputTokens: 4096,
                vision: true,
                toolUse: true,
                streaming: true,
                reasoning: 'excellent',
                coding: 'excellent',
                speed: 'good',
              },
              aliases: ['test'],
              tags: ['test'],
              source: 'builtin',
              lastVerified: '2025-12-12',
            },
          },
          providers: {
            anthropic: {
              displayName: 'Anthropic',
            },
          },
          metadata: {
            version: '1.0.0',
            lastRefresh: '2025-12-12',
            modelCount: 1,
            providerCount: 1,
          },
        })
      );

      const catalog = await loadCatalog();

      expect(catalog.models).toBeDefined();
      expect(catalog.models['test-model']).toBeDefined();
      expect(catalog.providers).toBeDefined();
      expect(catalog.metadata).toBeDefined();
    });

    it('should merge discovered models over builtin', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const builtinCatalog = {
        models: {
          'model-1': {
            id: 'model-1',
            provider: 'anthropic',
            displayName: 'Model 1',
            status: 'active',
            deprecated: false,
            capabilities: {
              contextWindow: 100000,
              maxOutputTokens: 4096,
              vision: true,
              toolUse: true,
              streaming: true,
              reasoning: 'excellent',
              coding: 'excellent',
              speed: 'good',
            },
            aliases: [],
            tags: [],
            source: 'builtin',
            lastVerified: '2025-12-12',
          },
        },
        providers: {},
        metadata: {
          version: '1.0.0',
          lastRefresh: '2025-12-12',
          modelCount: 1,
          providerCount: 0,
        },
      };

      const discoveredCatalog = {
        models: {
          'model-2': {
            id: 'model-2',
            provider: 'openai',
            displayName: 'Model 2',
            status: 'active',
            deprecated: false,
            capabilities: {
              contextWindow: 128000,
              maxOutputTokens: 4096,
              vision: false,
              toolUse: true,
              streaming: true,
              reasoning: 'good',
              coding: 'good',
              speed: 'excellent',
            },
            aliases: [],
            tags: [],
            source: 'discovered',
            lastVerified: '2025-12-12',
          },
        },
      };

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().includes('builtin-models.json')) {
          return Promise.resolve(JSON.stringify(builtinCatalog));
        }
        if (path.toString().includes('discovered-models.json')) {
          return Promise.resolve(JSON.stringify(discoveredCatalog));
        }
        return Promise.reject(new Error('File not found'));
      });

      const catalog = await loadCatalog();

      expect(catalog.models['model-1']).toBeDefined();
      expect(catalog.models['model-2']).toBeDefined();
      expect(catalog.metadata.modelCount).toBe(2);
    });

    it('should give custom models highest priority', async () => {
      vi.mocked(existsSync).mockReturnValue(true);

      const builtinCatalog = {
        models: {
          'shared-model': {
            id: 'shared-model',
            provider: 'anthropic',
            displayName: 'Builtin Model',
            status: 'active',
            deprecated: false,
            capabilities: {
              contextWindow: 100000,
              maxOutputTokens: 4096,
              vision: true,
              toolUse: true,
              streaming: true,
              reasoning: 'excellent',
              coding: 'excellent',
              speed: 'good',
            },
            aliases: [],
            tags: [],
            source: 'builtin',
            lastVerified: '2025-12-12',
          },
        },
        providers: {},
        metadata: {
          version: '1.0.0',
          lastRefresh: '2025-12-12',
          modelCount: 1,
          providerCount: 0,
        },
      };

      const customCatalog = {
        models: {
          'shared-model': {
            id: 'shared-model',
            provider: 'custom',
            displayName: 'Custom Model',
            status: 'active',
            deprecated: false,
            capabilities: {
              contextWindow: 200000,
              maxOutputTokens: 8192,
              vision: true,
              toolUse: true,
              streaming: true,
              reasoning: 'excellent',
              coding: 'excellent',
              speed: 'good',
            },
            aliases: [],
            tags: [],
            source: 'custom',
            lastVerified: '2025-12-12',
          },
        },
      };

      vi.mocked(readFile).mockImplementation((path) => {
        if (path.toString().includes('builtin-models.json')) {
          return Promise.resolve(JSON.stringify(builtinCatalog));
        }
        if (path.toString().includes('custom-models.json')) {
          return Promise.resolve(JSON.stringify(customCatalog));
        }
        return Promise.reject(new Error('File not found'));
      });

      const catalog = await loadCatalog();

      expect(catalog.models['shared-model'].displayName).toBe('Custom Model');
      expect(catalog.models['shared-model'].source).toBe('custom');
      expect(catalog.models['shared-model'].capabilities.contextWindow).toBe(200000);
    });
  });

  describe('getModel', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          models: {
            'claude-opus-4-5': {
              id: 'claude-opus-4-5',
              provider: 'anthropic',
              displayName: 'Claude Opus 4.5',
              status: 'active',
              deprecated: false,
              capabilities: {
                contextWindow: 200000,
                maxOutputTokens: 8192,
                vision: true,
                toolUse: true,
                streaming: true,
                reasoning: 'excellent',
                coding: 'excellent',
                speed: 'good',
              },
              aliases: ['opus', 'opus-4.5'],
              tags: ['flagship'],
              source: 'builtin',
              lastVerified: '2025-12-12',
            },
          },
          providers: {},
          metadata: {
            version: '1.0.0',
            lastRefresh: '2025-12-12',
            modelCount: 1,
            providerCount: 0,
          },
        })
      );
    });

    it('should find model by ID', async () => {
      const model = await getModel('claude-opus-4-5');
      expect(model).toBeDefined();
      expect(model?.id).toBe('claude-opus-4-5');
    });

    it('should find model by alias', async () => {
      const model = await getModel('opus');
      expect(model).toBeDefined();
      expect(model?.id).toBe('claude-opus-4-5');
    });

    it('should return null for non-existent model', async () => {
      const model = await getModel('non-existent');
      expect(model).toBeNull();
    });
  });

  describe('listModels', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          models: {
            'model-1': {
              id: 'model-1',
              provider: 'anthropic',
              displayName: 'Model 1',
              status: 'active',
              deprecated: false,
              capabilities: {
                contextWindow: 100000,
                maxOutputTokens: 4096,
                vision: true,
                toolUse: true,
                streaming: true,
                reasoning: 'excellent',
                coding: 'excellent',
                speed: 'good',
              },
              aliases: [],
              tags: ['flagship'],
              source: 'builtin',
              lastVerified: '2025-12-12',
            },
            'model-2': {
              id: 'model-2',
              provider: 'openai',
              displayName: 'Model 2',
              status: 'deprecated',
              deprecated: true,
              capabilities: {
                contextWindow: 50000,
                maxOutputTokens: 4096,
                vision: false,
                toolUse: true,
                streaming: true,
                reasoning: 'good',
                coding: 'good',
                speed: 'excellent',
              },
              aliases: [],
              tags: ['legacy'],
              source: 'builtin',
              lastVerified: '2025-12-12',
            },
          },
          providers: {},
          metadata: {
            version: '1.0.0',
            lastRefresh: '2025-12-12',
            modelCount: 2,
            providerCount: 0,
          },
        })
      );
    });

    it('should list all models without filter', async () => {
      const models = await listModels();
      expect(models).toHaveLength(2);
    });

    it('should filter by provider', async () => {
      const models = await listModels({ provider: 'anthropic' });
      expect(models).toHaveLength(1);
      expect(models[0].provider).toBe('anthropic');
    });

    it('should filter by status', async () => {
      const models = await listModels({ status: 'active' });
      expect(models).toHaveLength(1);
      expect(models[0].status).toBe('active');
    });

    it('should filter by tag', async () => {
      const models = await listModels({ tag: 'flagship' });
      expect(models).toHaveLength(1);
      expect(models[0].tags).toContain('flagship');
    });

    it('should filter by minimum context', async () => {
      const models = await listModels({ minContext: 75000 });
      expect(models).toHaveLength(1);
      expect(models[0].capabilities.contextWindow).toBeGreaterThanOrEqual(75000);
    });
  });

  describe('searchModels', () => {
    beforeEach(() => {
      vi.mocked(existsSync).mockReturnValue(true);
      vi.mocked(readFile).mockResolvedValue(
        JSON.stringify({
          models: {
            'claude-opus-4-5': {
              id: 'claude-opus-4-5',
              provider: 'anthropic',
              displayName: 'Claude Opus 4.5',
              status: 'active',
              deprecated: false,
              capabilities: {
                contextWindow: 200000,
                maxOutputTokens: 8192,
                vision: true,
                toolUse: true,
                streaming: true,
                reasoning: 'excellent',
                coding: 'excellent',
                speed: 'good',
              },
              aliases: ['opus', 'opus-4.5'],
              tags: ['flagship', 'reasoning'],
              source: 'builtin',
              lastVerified: '2025-12-12',
            },
            'gpt-4o': {
              id: 'gpt-4o',
              provider: 'openai',
              displayName: 'GPT-4o',
              status: 'active',
              deprecated: false,
              capabilities: {
                contextWindow: 128000,
                maxOutputTokens: 4096,
                vision: true,
                toolUse: true,
                streaming: true,
                reasoning: 'good',
                coding: 'excellent',
                speed: 'excellent',
              },
              aliases: ['gpt4o'],
              tags: ['multimodal', 'fast'],
              source: 'builtin',
              lastVerified: '2025-12-12',
            },
          },
          providers: {},
          metadata: {
            version: '1.0.0',
            lastRefresh: '2025-12-12',
            modelCount: 2,
            providerCount: 0,
          },
        })
      );
    });

    it('should search by model ID', async () => {
      const models = await searchModels('opus');
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('claude-opus-4-5');
    });

    it('should search by display name', async () => {
      const models = await searchModels('GPT');
      expect(models).toHaveLength(1);
      expect(models[0].displayName).toContain('GPT');
    });

    it('should search by alias', async () => {
      const models = await searchModels('gpt4o');
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('gpt-4o');
    });

    it('should search by tag', async () => {
      const models = await searchModels('reasoning');
      expect(models).toHaveLength(1);
      expect(models[0].tags).toContain('reasoning');
    });

    it('should be case-insensitive', async () => {
      const models = await searchModels('OPUS');
      expect(models).toHaveLength(1);
      expect(models[0].id).toBe('claude-opus-4-5');
    });

    it('should return empty array for no matches', async () => {
      const models = await searchModels('nonexistent');
      expect(models).toHaveLength(0);
    });
  });
});
