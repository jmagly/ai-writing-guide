import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Config } from '../../../tools/daemon/config.mjs';
import fs from 'fs';
import path from 'path';

vi.mock('fs');
vi.mock('path');

describe('Config', () => {
  let config;
  const testConfigPath = '.aiwg/daemon.json';

  beforeEach(() => {
    vi.clearAllMocks();
    config = new Config(testConfigPath);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('load', () => {
    it('should load config from JSON file when it exists', () => {
      const mockConfig = {
        daemon: { heartbeat_interval_seconds: 60 },
        watch: { enabled: true, paths: [] }
      };

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify(mockConfig));

      const result = config.load();

      expect(fs.existsSync).toHaveBeenCalledWith(testConfigPath);
      expect(fs.readFileSync).toHaveBeenCalledWith(testConfigPath, 'utf8');
      expect(result).toEqual(mockConfig);
      expect(config.config).toEqual(mockConfig);
    });

    it('should use default config when file does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      vi.spyOn(path, 'dirname').mockReturnValue('.aiwg');

      const result = config.load();

      expect(result).toBeDefined();
      expect(result.daemon).toBeDefined();
      expect(result.watch).toBeDefined();
      expect(result.webhook).toBeDefined();
      expect(result.schedule).toBeDefined();
      expect(config.config).toEqual(result);
    });

    it('should save default config when file does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      vi.spyOn(path, 'dirname').mockReturnValue('.aiwg');

      config.load();

      expect(fs.writeFileSync).toHaveBeenCalled();
    });

    it('should handle JSON parse errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockReturnValue('invalid json{');

      const result = config.load();

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeDefined();
      expect(result.daemon).toBeDefined();

      consoleSpy.mockRestore();
    });

    it('should handle file read errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'readFileSync').mockImplementation(() => {
        throw new Error('Permission denied');
      });

      const result = config.load();

      expect(consoleSpy).toHaveBeenCalled();
      expect(result).toBeDefined();

      consoleSpy.mockRestore();
    });
  });

  describe('save', () => {
    beforeEach(() => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        watch: { enabled: true, paths: [] }
      };
    });

    it('should save config to JSON file', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(path, 'dirname').mockReturnValue('.aiwg');

      config.save();

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        testConfigPath,
        expect.stringContaining('"daemon"')
      );
    });

    it('should create directory if it does not exist', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(false);
      vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(path, 'dirname').mockReturnValue('.aiwg');

      config.save();

      expect(fs.mkdirSync).toHaveBeenCalledWith('.aiwg', { recursive: true });
    });

    it('should format JSON with 2-space indentation', () => {
      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
      vi.spyOn(path, 'dirname').mockReturnValue('.aiwg');

      config.save();

      const savedContent = vi.mocked(fs.writeFileSync).mock.calls[0][1];
      expect(savedContent).toContain('\n  "daemon"');
    });

    it('should handle write errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      vi.spyOn(fs, 'existsSync').mockReturnValue(true);
      vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {
        throw new Error('Disk full');
      });
      vi.spyOn(path, 'dirname').mockReturnValue('.aiwg');

      expect(() => config.save()).not.toThrow();
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('validate', () => {
    it('should return no errors for valid config', () => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        watch: { enabled: true, paths: [] },
        webhook: { enabled: true, port: 9471 },
        schedule: { enabled: true, jobs: [] }
      };

      const errors = config.validate();
      expect(errors).toEqual([]);
    });

    it('should error when daemon section is missing', () => {
      config.config = {
        watch: { enabled: true, paths: [] }
      };

      const errors = config.validate();
      expect(errors).toContain('Missing daemon configuration section');
    });

    it('should error when watch.paths is not an array', () => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        watch: { enabled: true, paths: 'invalid' }
      };

      const errors = config.validate();
      expect(errors).toContain('watch.paths must be an array');
    });

    it('should error when webhook port is invalid', () => {
      const testCases = [
        { port: 0, desc: 'zero' },
        { port: -1, desc: 'negative' },
        { port: 65536, desc: 'too high' },
        { port: 100000, desc: 'way too high' }
      ];

      for (const { port, desc } of testCases) {
        config.config = {
          daemon: { heartbeat_interval_seconds: 30 },
          webhook: { enabled: true, port }
        };

        const errors = config.validate();
        expect(errors).toContain('webhook.port must be between 1 and 65535');
      }
    });

    it('should error when schedule.jobs is not an array', () => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        schedule: { enabled: true, jobs: 'invalid' }
      };

      const errors = config.validate();
      expect(errors).toContain('schedule.jobs must be an array');
    });

    it('should not error when webhook is disabled with invalid port', () => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        webhook: { enabled: false, port: 99999 }
      };

      const errors = config.validate();
      expect(errors).toEqual([]);
    });

    it('should not error when watch is disabled with invalid paths', () => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        watch: { enabled: false, paths: 'invalid' }
      };

      const errors = config.validate();
      expect(errors).toEqual([]);
    });

    it('should not error when schedule is disabled with invalid jobs', () => {
      config.config = {
        daemon: { heartbeat_interval_seconds: 30 },
        schedule: { enabled: false, jobs: 'invalid' }
      };

      const errors = config.validate();
      expect(errors).toEqual([]);
    });

    it('should accumulate multiple errors', () => {
      config.config = {
        watch: { enabled: true, paths: 'invalid' },
        webhook: { enabled: true, port: 0 },
        schedule: { enabled: true, jobs: 'invalid' }
      };

      const errors = config.validate();
      expect(errors).toHaveLength(4);
      expect(errors).toContain('Missing daemon configuration section');
      expect(errors).toContain('watch.paths must be an array');
      expect(errors).toContain('webhook.port must be between 1 and 65535');
      expect(errors).toContain('schedule.jobs must be an array');
    });
  });

  describe('get', () => {
    beforeEach(() => {
      config.config = {
        daemon: {
          heartbeat_interval_seconds: 30,
          log: {
            level: 'info',
            max_size_mb: 50
          }
        },
        watch: {
          enabled: true,
          debounce_ms: 2000
        }
      };
    });

    it('should get top-level properties', () => {
      expect(config.get('daemon')).toEqual({
        heartbeat_interval_seconds: 30,
        log: { level: 'info', max_size_mb: 50 }
      });
      expect(config.get('watch')).toEqual({
        enabled: true,
        debounce_ms: 2000
      });
    });

    it('should get nested properties with dot notation', () => {
      expect(config.get('daemon.heartbeat_interval_seconds')).toBe(30);
      expect(config.get('daemon.log.level')).toBe('info');
      expect(config.get('daemon.log.max_size_mb')).toBe(50);
      expect(config.get('watch.enabled')).toBe(true);
      expect(config.get('watch.debounce_ms')).toBe(2000);
    });

    it('should return undefined for missing keys', () => {
      expect(config.get('nonexistent')).toBeUndefined();
      expect(config.get('daemon.missing')).toBeUndefined();
      expect(config.get('daemon.log.missing')).toBeUndefined();
    });

    it('should return undefined when traversing through null or undefined', () => {
      config.config = {
        daemon: null
      };

      expect(config.get('daemon.log.level')).toBeUndefined();
    });

    it('should handle deeply nested paths', () => {
      config.config = {
        a: {
          b: {
            c: {
              d: {
                e: 'deep value'
              }
            }
          }
        }
      };

      expect(config.get('a.b.c.d.e')).toBe('deep value');
    });

    it('should return correct values for falsy properties', () => {
      config.config = {
        zero: 0,
        false_value: false,
        empty_string: '',
        null_value: null
      };

      expect(config.get('zero')).toBe(0);
      expect(config.get('false_value')).toBe(false);
      expect(config.get('empty_string')).toBe('');
      expect(config.get('null_value')).toBe(null);
    });
  });

  describe('constructor', () => {
    it('should use default config path if not provided', () => {
      const defaultConfig = new Config();
      expect(defaultConfig.configPath).toBe('.aiwg/daemon.json');
    });

    it('should use custom config path if provided', () => {
      const customConfig = new Config('/custom/path/config.json');
      expect(customConfig.configPath).toBe('/custom/path/config.json');
    });

    it('should initialize config as null', () => {
      const newConfig = new Config();
      expect(newConfig.config).toBe(null);
    });
  });
});
