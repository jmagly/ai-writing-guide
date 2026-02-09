import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  initializeRegistry,
  discoverEnabledAdapters,
  loadAdapter,
  loadEnabledAdapters,
  getAdapter,
  getRegistryStatus,
  shutdownAll,
  registerAdapter,
} from '../../../tools/messaging/adapter-registry.mjs';

describe('AdapterRegistry', () => {
  let originalEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    delete process.env.AIWG_SLACK_WEBHOOK_URL;
    delete process.env.AIWG_DISCORD_TOKEN;
    delete process.env.AIWG_TELEGRAM_TOKEN;
    initializeRegistry();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('initializeRegistry', () => {
    it('registers 3 built-in adapters', () => {
      const status = getRegistryStatus();

      expect(status).toHaveLength(3);
      expect(status.map(s => s.name)).toEqual(['slack', 'discord', 'telegram']);
    });

    it('sets all adapters to pending status initially', () => {
      const status = getRegistryStatus();

      for (const adapter of status) {
        expect(adapter.status).toBe('pending');
        expect(adapter.error).toBeNull();
      }
    });

    it('clears registry before re-initializing', () => {
      const status1 = getRegistryStatus();
      expect(status1).toHaveLength(3);

      initializeRegistry();

      const status2 = getRegistryStatus();
      expect(status2).toHaveLength(3);
      expect(status2.every(s => s.status === 'pending')).toBe(true);
    });
  });

  describe('discoverEnabledAdapters', () => {
    it('returns empty array when no env vars set', () => {
      const enabled = discoverEnabledAdapters();

      expect(enabled).toEqual([]);
    });

    it('loads only adapters with matching env vars - slack', () => {
      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      const enabled = discoverEnabledAdapters();

      expect(enabled).toEqual(['slack']);
    });

    it('loads only adapters with matching env vars - discord', () => {
      process.env.AIWG_DISCORD_TOKEN = 'discord-token-123';

      const enabled = discoverEnabledAdapters();

      expect(enabled).toEqual(['discord']);
    });

    it('loads only adapters with matching env vars - telegram', () => {
      process.env.AIWG_TELEGRAM_TOKEN = 'telegram-token-456';

      const enabled = discoverEnabledAdapters();

      expect(enabled).toEqual(['telegram']);
    });

    it('loads multiple adapters when multiple env vars set', () => {
      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';
      process.env.AIWG_DISCORD_TOKEN = 'discord-token';

      const enabled = discoverEnabledAdapters();

      expect(enabled).toHaveLength(2);
      expect(enabled).toContain('slack');
      expect(enabled).toContain('discord');
    });
  });

  describe('loadAdapter', () => {
    it('throws for unknown adapter', async () => {
      await expect(loadAdapter('unknown')).rejects.toThrow('Unknown adapter');
    });

    it('caches loaded adapter instance', async () => {
      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      const adapter1 = await loadAdapter('slack', {
        webhookUrl: 'https://hooks.slack.com/test',
      });
      const adapter2 = await loadAdapter('slack');

      expect(adapter1).toBe(adapter2);

      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });

    it('sets status to loading then ready', async () => {
      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      const loadPromise = loadAdapter('slack', {
        webhookUrl: 'https://hooks.slack.com/test',
      });

      const statusDuringLoad = getRegistryStatus().find(s => s.name === 'slack');

      await loadPromise;

      const statusAfterLoad = getRegistryStatus().find(s => s.name === 'slack');
      expect(statusAfterLoad.status).toBe('ready');

      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });

    it('sets status to error on load failure', async () => {
      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {
            throw new Error('Initialization failed');
          }
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await expect(
        loadAdapter('slack', { webhookUrl: 'https://hooks.slack.com/test' })
      ).rejects.toThrow('Initialization failed');

      const status = getRegistryStatus().find(s => s.name === 'slack');
      expect(status.status).toBe('error');
      expect(status.error).toContain('Initialization failed');

      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });
  });

  describe('loadEnabledAdapters', () => {
    it('returns empty map when no env vars set', async () => {
      const loaded = await loadEnabledAdapters();

      expect(loaded.size).toBe(0);
    });

    it('logs loaded adapters', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await loadEnabledAdapters({
        slack: { webhookUrl: 'https://hooks.slack.com/test' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Loaded adapter: slack')
      );

      consoleSpy.mockRestore();
      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });

    it('logs errors for failed adapters', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {
            throw new Error('Init failed');
          }
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await loadEnabledAdapters({
        slack: { webhookUrl: 'https://hooks.slack.com/test' },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to load adapter "slack"')
      );

      consoleSpy.mockRestore();
      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });
  });

  describe('getAdapter', () => {
    it('returns null for unloaded adapter', () => {
      const adapter = getAdapter('slack');

      expect(adapter).toBeNull();
    });

    it('returns instance for loaded adapter', async () => {
      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await loadAdapter('slack', { webhookUrl: 'https://hooks.slack.com/test' });

      const adapter = getAdapter('slack');
      expect(adapter).not.toBeNull();

      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });
  });

  describe('getRegistryStatus', () => {
    it('returns status array for all adapters', () => {
      const status = getRegistryStatus();

      expect(status).toHaveLength(3);
      expect(status[0]).toHaveProperty('name');
      expect(status[0]).toHaveProperty('status');
      expect(status[0]).toHaveProperty('error');
      expect(status[0]).toHaveProperty('enabled');
    });

    it('marks adapters as enabled when env vars are set', () => {
      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      const status = getRegistryStatus();

      const slackStatus = status.find(s => s.name === 'slack');
      const discordStatus = status.find(s => s.name === 'discord');

      expect(slackStatus.enabled).toBe(true);
      expect(discordStatus.enabled).toBe(false);
    });
  });

  describe('shutdownAll', () => {
    it('calls shutdown on all loaded adapters', async () => {
      const shutdownSpy = vi.fn().mockResolvedValue(undefined);

      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
          async shutdown() {
            shutdownSpy();
          }
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await loadAdapter('slack', { webhookUrl: 'https://hooks.slack.com/test' });

      await shutdownAll();

      expect(shutdownSpy).toHaveBeenCalled();

      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });

    it('sets status to shutdown after successful shutdown', async () => {
      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
          async shutdown() {}
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await loadAdapter('slack', { webhookUrl: 'https://hooks.slack.com/test' });

      await shutdownAll();

      const status = getRegistryStatus().find(s => s.name === 'slack');
      expect(status.status).toBe('shutdown');

      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });

    it('handles shutdown errors gracefully', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.doMock('../../../tools/messaging/adapters/slack.mjs', () => ({
        default: class MockSlackAdapter {
          async initialize() {}
          async shutdown() {
            throw new Error('Shutdown failed');
          }
        },
      }));

      process.env.AIWG_SLACK_WEBHOOK_URL = 'https://hooks.slack.com/test';

      await loadAdapter('slack', { webhookUrl: 'https://hooks.slack.com/test' });

      await shutdownAll();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error shutting down "slack"')
      );

      const status = getRegistryStatus().find(s => s.name === 'slack');
      expect(status.status).toBe('error');

      consoleSpy.mockRestore();
      vi.doUnmock('../../../tools/messaging/adapters/slack.mjs');
    });
  });

  describe('registerAdapter', () => {
    it('registers custom adapter', () => {
      registerAdapter('custom', './adapters/custom.mjs', 'AIWG_CUSTOM_TOKEN');

      const status = getRegistryStatus();
      const customStatus = status.find(s => s.name === 'custom');

      expect(customStatus).toBeDefined();
      expect(customStatus.name).toBe('custom');
      expect(customStatus.status).toBe('pending');
    });

    it('throws when registering duplicate adapter', () => {
      expect(() => {
        registerAdapter('slack', './adapters/slack.mjs', 'AIWG_SLACK_WEBHOOK_URL');
      }).toThrow('already registered');
    });
  });
});
