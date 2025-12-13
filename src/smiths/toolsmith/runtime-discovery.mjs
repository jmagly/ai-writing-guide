/**
 * Runtime Discovery Module for Toolsmith
 *
 * Discovers installed tools, verifies functionality, and generates runtime catalog.
 *
 * @architecture @.aiwg/architecture/decisions/ADR-014-toolsmith-feature-architecture.md
 * @architecture @.aiwg/architecture/toolsmith-implementation-spec.md
 */

import { execSync } from 'child_process';
import { readFile, writeFile, access } from 'fs/promises';
import { existsSync, constants } from 'fs';
import { resolve, join, dirname } from 'path';
import { platform, arch, homedir, tmpdir, cpus } from 'os';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * RuntimeDiscovery - Discovers and catalogs installed system tools
 */
export class RuntimeDiscovery {
  constructor(basePath = null) {
    this.basePath = basePath || resolve(process.cwd(), '.aiwg/smiths/toolsmith');
    this.knownTools = this.#loadKnownTools();
  }

  /**
   * Perform full discovery scan
   * @returns {Promise<Object>} RuntimeCatalog
   */
  async discover() {
    console.log('Starting runtime discovery...');

    const environment = await this.getEnvironment();
    const resources = await this.getResources();
    const tools = await this.#discoverTools();

    const catalog = {
      $schema: 'https://aiwg.io/schemas/toolsmith/runtime-catalog-v1.json',
      version: '1.0',
      generated: new Date().toISOString(),
      environment,
      resources,
      tools: tools.available,
      unavailable: tools.unavailable
    };

    // Write catalog
    await this.#writeCatalog(catalog);
    await this.#writeRuntimeInfo(catalog);

    console.log(`Discovery complete: ${catalog.tools.length} tools found`);
    return catalog;
  }

  /**
   * Verify existing catalog is still accurate
   * @returns {Promise<Object>} VerificationResult
   */
  async verify() {
    const catalog = await this.#loadCatalog();

    if (!catalog) {
      throw new Error('No catalog found. Run discovery first.');
    }

    const results = {
      valid: 0,
      total: catalog.tools.length,
      failed: [],
      timestamp: new Date().toISOString()
    };

    for (const tool of catalog.tools) {
      const check = await this.checkTool(tool.id);

      if (check.available && check.version === tool.version) {
        results.valid++;
      } else {
        results.failed.push(tool);
      }
    }

    return results;
  }

  /**
   * Check a specific tool
   * @param {string} toolName
   * @returns {Promise<Object>} ToolCheckResult
   */
  async checkTool(toolName) {
    const toolPath = await this.#findToolPath(toolName);

    if (!toolPath) {
      return {
        id: toolName,
        available: false,
        installHint: this.#getInstallHint(toolName)
      };
    }

    const version = await this.#detectToolVersion(toolName, toolPath);

    return {
      id: toolName,
      available: true,
      version,
      path: toolPath,
      status: 'verified',
      lastVerified: new Date().toISOString()
    };
  }

  /**
   * Get environment information
   * @returns {Promise<Object>} EnvironmentInfo
   */
  async getEnvironment() {
    const os = platform();
    let osVersion = 'Unknown';

    try {
      if (os === 'linux') {
        // Check for WSL
        if (existsSync('/proc/version')) {
          const version = await readFile('/proc/version', 'utf-8');
          if (version.includes('microsoft') || version.includes('WSL')) {
            osVersion = 'WSL';
          } else {
            // Try to get Linux distribution info
            if (existsSync('/etc/os-release')) {
              const osRelease = await readFile('/etc/os-release', 'utf-8');
              const match = osRelease.match(/PRETTY_NAME="([^"]+)"/);
              if (match) osVersion = match[1];
            }
          }
        }
      } else if (os === 'darwin') {
        const version = execSync('sw_vers -productVersion', { encoding: 'utf-8' }).trim();
        osVersion = `macOS ${version}`;
      } else if (os === 'win32') {
        osVersion = execSync('ver', { encoding: 'utf-8' }).trim();
      }
    } catch (error) {
      console.warn('Could not detect OS version:', error.message);
    }

    return {
      os,
      osVersion,
      arch: arch(),
      shell: process.env.SHELL || process.env.ComSpec || '/bin/sh',
      homeDir: homedir(),
      workingDir: process.cwd()
    };
  }

  /**
   * Get resource information (disk, memory, cpu)
   * @returns {Promise<Object>} ResourceInfo
   */
  async getResources() {
    let diskFreeGb = 0;
    let memoryTotalGb = 0;
    let memoryAvailableGb = 0;

    try {
      // Disk space
      if (platform() === 'win32') {
        // Windows: use wmic
        const output = execSync('wmic logicaldisk get size,freespace', { encoding: 'utf-8' });
        const lines = output.trim().split('\n').slice(1);
        let totalFree = 0;
        for (const line of lines) {
          const parts = line.trim().split(/\s+/);
          if (parts.length >= 2) {
            totalFree += parseInt(parts[0]) || 0;
          }
        }
        diskFreeGb = Math.round((totalFree / (1024 ** 3)) * 10) / 10;
      } else {
        // Unix: use df
        const output = execSync('df -k .', { encoding: 'utf-8' });
        const lines = output.trim().split('\n');
        if (lines.length > 1) {
          const parts = lines[1].trim().split(/\s+/);
          const availableKb = parseInt(parts[3]) || 0;
          diskFreeGb = Math.round((availableKb / (1024 ** 2)) * 10) / 10;
        }
      }

      // Memory (from os module)
      const totalMem = require('os').totalmem();
      const freeMem = require('os').freemem();
      memoryTotalGb = Math.round((totalMem / (1024 ** 3)) * 10) / 10;
      memoryAvailableGb = Math.round((freeMem / (1024 ** 3)) * 10) / 10;
    } catch (error) {
      console.warn('Could not get resource info:', error.message);
    }

    return {
      diskFreeGb,
      memoryTotalGb,
      memoryAvailableGb,
      cpuCores: cpus().length
    };
  }

  /**
   * Get runtime summary for display
   * @returns {Promise<Object>} RuntimeSummary
   */
  async getSummary() {
    const catalog = await this.#loadCatalog();

    if (!catalog) {
      throw new Error('No catalog found. Run discovery first.');
    }

    const toolCounts = {
      core: 0,
      languages: 0,
      utilities: 0,
      custom: 0
    };

    for (const tool of catalog.tools) {
      toolCounts[tool.category]++;
    }

    return {
      environment: catalog.environment,
      resources: catalog.resources,
      toolCounts,
      totalTools: catalog.tools.length,
      lastDiscovery: catalog.generated,
      catalogPath: join(this.basePath, 'runtime.json')
    };
  }

  /**
   * Add a custom tool to the catalog
   * @param {Object} config - CustomToolConfig
   */
  async addCustomTool(config) {
    const catalog = await this.#loadCatalog();

    if (!catalog) {
      throw new Error('No catalog found. Run discovery first.');
    }

    // Check if tool exists
    const check = await this.checkTool(config.id);
    if (!check.available) {
      throw new Error(`Tool ${config.id} not found at ${config.path}`);
    }

    const customTool = {
      id: config.id,
      name: config.name,
      category: config.category,
      version: check.version || 'unknown',
      path: config.path,
      status: 'verified',
      lastVerified: new Date().toISOString(),
      capabilities: config.capabilities,
      documentation: config.documentation,
      aliases: config.aliases || [],
      relatedTools: []
    };

    // Add or update tool
    const existingIndex = catalog.tools.findIndex(t => t.id === config.id);
    if (existingIndex >= 0) {
      catalog.tools[existingIndex] = customTool;
    } else {
      catalog.tools.push(customTool);
    }

    await this.#writeCatalog(catalog);
  }

  // Private methods

  /**
   * Discover all tools
   * @private
   */
  async #discoverTools() {
    const pathDirs = this.#getPathDirectories();
    const candidates = new Map();

    // Scan each directory
    for (const dir of pathDirs) {
      if (!existsSync(dir)) continue;

      try {
        const files = execSync(`ls "${dir}"`, { encoding: 'utf-8' })
          .trim()
          .split('\n')
          .filter(f => f);

        for (const file of files) {
          const fullPath = join(dir, file);

          // Check if executable
          try {
            await access(fullPath, constants.X_OK);

            // Skip if already found in higher priority directory
            if (!candidates.has(file)) {
              candidates.set(file, fullPath);
            }
          } catch {
            // Not executable, skip
          }
        }
      } catch (error) {
        // Directory scan failed, skip
      }
    }

    const available = [];
    const unavailable = [];

    // Check each candidate
    for (const [name, path] of candidates.entries()) {
      try {
        const version = await this.#detectToolVersion(name, path);
        const tool = await this.#categorizeTool(name, path, version);

        if (tool) {
          available.push(tool);
        }
      } catch (error) {
        // Tool check failed, mark unavailable
        unavailable.push({
          id: name,
          reason: 'broken',
          installHint: error.message
        });
      }
    }

    return { available, unavailable };
  }

  /**
   * Get PATH directories
   * @private
   */
  #getPathDirectories() {
    const pathEnv = process.env.PATH || '';
    const dirs = pathEnv.split(platform() === 'win32' ? ';' : ':');

    // Add common additional paths
    const additional = [
      '/usr/local/bin',
      '/usr/bin',
      '/bin',
      join(homedir(), '.local/bin'),
      join(homedir(), 'bin')
    ];

    return [...new Set([...dirs, ...additional])].filter(d => d);
  }

  /**
   * Find tool path using which/where
   * @private
   */
  async #findToolPath(toolName) {
    try {
      const cmd = platform() === 'win32' ? 'where' : 'which';
      const path = execSync(`${cmd} ${toolName}`, { encoding: 'utf-8' })
        .trim()
        .split('\n')[0];
      return path;
    } catch {
      return null;
    }
  }

  /**
   * Detect tool version
   * @private
   */
  async #detectToolVersion(toolName, toolPath) {
    const versionCommands = [
      `${toolPath} --version`,
      `${toolPath} -v`,
      `${toolPath} version`,
      `${toolPath} -V`
    ];

    for (const cmd of versionCommands) {
      try {
        const output = execSync(cmd, {
          encoding: 'utf-8',
          timeout: 5000,
          stdio: ['ignore', 'pipe', 'pipe']
        }).trim();

        // Extract version number
        const version = this.#parseVersion(output, toolName);
        if (version) return version;
      } catch {
        // Try next command
      }
    }

    return 'unknown';
  }

  /**
   * Parse version from output
   * @private
   */
  #parseVersion(output, toolName) {
    // Try known pattern first
    const knownTool = this.knownTools[toolName];
    if (knownTool && knownTool.versionPattern) {
      const regex = new RegExp(knownTool.versionPattern);
      const match = output.match(regex);
      if (match && match[1]) return match[1];
    }

    // Generic version pattern
    const patterns = [
      /version\s+([0-9]+\.[0-9]+\.[0-9]+)/i,
      /v([0-9]+\.[0-9]+\.[0-9]+)/i,
      /([0-9]+\.[0-9]+\.[0-9]+)/,
      /([0-9]+\.[0-9]+)/
    ];

    for (const pattern of patterns) {
      const match = output.match(pattern);
      if (match && match[1]) return match[1];
    }

    return null;
  }

  /**
   * Categorize and enrich tool
   * @private
   */
  async #categorizeTool(name, path, version) {
    const knownTool = this.knownTools[name];

    let category = 'utilities';
    let capabilities = [];
    let documentation = '';
    let aliases = [];
    let relatedTools = [];

    if (knownTool) {
      category = knownTool.category;
      capabilities = knownTool.capabilities;
      documentation = knownTool.documentation || '';
      aliases = knownTool.aliases;
      relatedTools = knownTool.relatedTools;
    } else {
      // Infer category from name
      if (['git', 'bash', 'sh', 'curl', 'ssh', 'grep', 'sed', 'awk'].includes(name)) {
        category = 'core';
      } else if (['node', 'python', 'python3', 'ruby', 'go', 'java', 'javac', 'rustc'].includes(name)) {
        category = 'languages';
      }
    }

    // Find man page
    const manPage = await this.#findManPage(name);

    return {
      id: name,
      name,
      category,
      version,
      path,
      status: 'verified',
      lastVerified: new Date().toISOString(),
      capabilities,
      manPage,
      documentation,
      aliases,
      relatedTools
    };
  }

  /**
   * Find man page for tool
   * @private
   */
  async #findManPage(toolName) {
    if (platform() === 'win32') return undefined;

    try {
      const manPath = execSync(`man -w ${toolName}`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore']
      }).trim();

      if (manPath && existsSync(manPath)) {
        return manPath;
      }
    } catch {
      // No man page found
    }

    return undefined;
  }

  /**
   * Get install hint for tool
   * @private
   */
  #getInstallHint(toolId) {
    const os = platform();
    const hints = {
      linux: {
        jq: 'apt install jq  # or dnf install jq',
        ripgrep: 'apt install ripgrep  # or cargo install ripgrep',
        docker: 'apt install docker.io  # or follow docker.com/get-started'
      },
      darwin: {
        jq: 'brew install jq',
        ripgrep: 'brew install ripgrep',
        docker: 'brew install --cask docker'
      },
      win32: {
        jq: 'choco install jq  # or scoop install jq',
        ripgrep: 'choco install ripgrep',
        docker: 'choco install docker-desktop'
      }
    };

    return hints[os]?.[toolId] || `Install ${toolId} for your system`;
  }

  /**
   * Load known tools database
   * @private
   */
  #loadKnownTools() {
    // Simplified inline database for Phase 1
    // Full database can be loaded from JSON file later
    return {
      git: {
        category: 'core',
        capabilities: ['version-control', 'remote', 'branching', 'merging'],
        documentation: 'https://git-scm.com/docs',
        aliases: ['g'],
        relatedTools: ['gh', 'git-lfs'],
        versionPattern: 'git version ([\\d.]+)',
        examples: []
      },
      jq: {
        category: 'utilities',
        capabilities: ['json-processing', 'filtering', 'transformation'],
        documentation: 'https://stedolan.github.io/jq/manual/',
        aliases: [],
        relatedTools: ['yq', 'fx'],
        versionPattern: 'jq-([\\d.]+)',
        examples: []
      },
      node: {
        category: 'languages',
        capabilities: ['javascript', 'runtime'],
        documentation: 'https://nodejs.org/docs/',
        aliases: ['nodejs'],
        relatedTools: ['npm', 'npx'],
        versionPattern: 'v([\\d.]+)',
        examples: []
      },
      python: {
        category: 'languages',
        capabilities: ['python', 'runtime'],
        documentation: 'https://docs.python.org/',
        aliases: ['python3'],
        relatedTools: ['pip', 'pip3'],
        versionPattern: 'Python ([\\d.]+)',
        examples: []
      },
      curl: {
        category: 'core',
        capabilities: ['http-client', 'download', 'api-testing'],
        documentation: 'https://curl.se/docs/',
        aliases: [],
        relatedTools: ['wget', 'httpie'],
        versionPattern: 'curl ([\\d.]+)',
        examples: []
      },
      docker: {
        category: 'utilities',
        capabilities: ['containers', 'virtualization'],
        documentation: 'https://docs.docker.com/',
        aliases: [],
        relatedTools: ['docker-compose', 'podman'],
        versionPattern: 'Docker version ([\\d.]+)',
        examples: []
      },
      ripgrep: {
        category: 'utilities',
        capabilities: ['search', 'grep', 'regex'],
        documentation: 'https://github.com/BurntSushi/ripgrep',
        aliases: ['rg'],
        relatedTools: ['grep', 'ag'],
        versionPattern: 'ripgrep ([\\d.]+)',
        examples: []
      }
    };
  }

  /**
   * Load catalog from file
   * @private
   */
  async #loadCatalog() {
    const catalogPath = join(this.basePath, 'runtime.json');

    if (!existsSync(catalogPath)) {
      return null;
    }

    const content = await readFile(catalogPath, 'utf-8');
    return JSON.parse(content);
  }

  /**
   * Write catalog to file
   * @private
   */
  async #writeCatalog(catalog) {
    const catalogPath = join(this.basePath, 'runtime.json');
    await writeFile(catalogPath, JSON.stringify(catalog, null, 2), 'utf-8');
  }

  /**
   * Write human-readable runtime info
   * @private
   */
  async #writeRuntimeInfo(catalog) {
    const lines = [
      '# Runtime Environment Summary',
      '',
      '## Environment',
      '',
      `- **OS**: ${catalog.environment.os} (${catalog.environment.osVersion}) ${catalog.environment.arch}`,
      `- **Shell**: ${catalog.environment.shell}`,
      `- **Home**: ${catalog.environment.homeDir}`,
      `- **Working Directory**: ${catalog.environment.workingDir}`,
      '',
      '## Resources',
      '',
      `- **Disk Free**: ${catalog.resources.diskFreeGb} GB`,
      `- **Memory**: ${catalog.resources.memoryAvailableGb} GB available / ${catalog.resources.memoryTotalGb} GB total`,
      `- **CPU Cores**: ${catalog.resources.cpuCores}`,
      '',
      '## Installed Tools',
      ''
    ];

    const byCategory = {
      core: [],
      languages: [],
      utilities: [],
      custom: []
    };

    for (const tool of catalog.tools) {
      byCategory[tool.category].push(tool);
    }

    for (const [category, tools] of Object.entries(byCategory)) {
      if (tools.length > 0) {
        lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
        lines.push('');

        for (const tool of tools) {
          lines.push(`- **${tool.name}** (${tool.version}) - ${tool.path}`);
          if (tool.capabilities.length > 0) {
            lines.push(`  - Capabilities: ${tool.capabilities.join(', ')}`);
          }
        }

        lines.push('');
      }
    }

    lines.push('## Summary');
    lines.push('');
    lines.push(`- **Total Tools**: ${catalog.tools.length}`);
    lines.push(`- **Unavailable**: ${catalog.unavailable.length}`);
    lines.push(`- **Generated**: ${catalog.generated}`);
    lines.push(`- **Catalog**: ${join(this.basePath, 'runtime.json')}`);

    const infoPath = join(this.basePath, 'runtime-info.md');
    await writeFile(infoPath, lines.join('\n'), 'utf-8');
  }
}
