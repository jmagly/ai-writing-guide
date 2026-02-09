import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DEFAULT_CONFIG = {
  daemon: {
    heartbeat_interval_seconds: 30,
    max_parallel_actions: 3,
    action_timeout_minutes: 120,
    log: {
      max_size_mb: 50,
      max_files: 5,
      level: 'info'
    }
  },
  watch: {
    enabled: true,
    paths: [
      {
        path: '.aiwg/',
        events: ['create', 'modify', 'delete'],
        ignore: ['*.tmp', 'working/**', 'daemon/**']
      },
      {
        path: 'src/',
        events: ['modify'],
        extensions: ['.ts', '.js', '.mjs']
      },
      {
        path: 'test/',
        events: ['modify'],
        extensions: ['.test.ts', '.test.js']
      }
    ],
    debounce_ms: 2000
  },
  webhook: {
    enabled: false,
    port: 9471,
    host: '127.0.0.1',
    secret_env: 'AIWG_WEBHOOK_SECRET',
    endpoints: [
      { path: '/ci', method: 'POST' },
      { path: '/health', method: 'GET' }
    ]
  },
  schedule: {
    enabled: true,
    jobs: [
      {
        id: 'health-check',
        cron: '0 */6 * * *',
        action: 'doctor'
      },
      {
        id: 'artifact-audit',
        cron: '0 9 * * 1',
        action: 'validate-metadata'
      }
    ]
  },
  rules: []
};

export class Config {
  constructor(configPath = '.aiwg/daemon.json') {
    this.configPath = configPath;
    this.config = null;
  }

  load() {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf8');
        this.config = JSON.parse(content);
      } else {
        this.config = DEFAULT_CONFIG;
        this.save();
      }
    } catch (error) {
      console.error(`Failed to load config from ${this.configPath}:`, error.message);
      this.config = DEFAULT_CONFIG;
    }

    return this.config;
  }

  save() {
    try {
      const dir = path.dirname(this.configPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
    } catch (error) {
      console.error(`Failed to save config to ${this.configPath}:`, error.message);
    }
  }

  validate() {
    const errors = [];

    if (!this.config.daemon) {
      errors.push('Missing daemon configuration section');
    }

    if (this.config.watch?.enabled && !Array.isArray(this.config.watch.paths)) {
      errors.push('watch.paths must be an array');
    }

    if (this.config.webhook?.enabled) {
      if (!this.config.webhook.port || this.config.webhook.port < 1 || this.config.webhook.port > 65535) {
        errors.push('webhook.port must be between 1 and 65535');
      }
    }

    if (this.config.schedule?.enabled && !Array.isArray(this.config.schedule.jobs)) {
      errors.push('schedule.jobs must be an array');
    }

    return errors;
  }

  get(key) {
    const keys = key.split('.');
    let value = this.config;
    for (const k of keys) {
      if (value === undefined || value === null) return undefined;
      value = value[k];
    }
    return value;
  }
}

export default Config;
