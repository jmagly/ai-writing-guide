/**
 * ClawHub Registry Adapter
 *
 * Connects to the ClawHub REST API at clawhub.ai for
 * community skill discovery and publishing.
 *
 * Supports both the ClawHub web API and the `clawhub` CLI
 * if installed. Falls back gracefully when neither is available.
 *
 * @implements #539
 * @see https://clawhub.ai
 * @see https://docs.openclaw.ai/tools/clawhub
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { RegistryAdapter, SkillResult, SkillDetails, InstallOptions } from '../types.js';
import {
  getProviderDefinition,
  resolveProviderPathValue,
} from '../../providers/provider-definitions.js';

const CLAWHUB_API_BASE = 'https://clawhub.ai/api/v1';

function resolveSkillFallbackPath(target: string, projectDir: string, name: string): string {
  const definition = getProviderDefinition(target);
  if (!definition) return path.join(projectDir, `.${target}/skills`, name);
  const basePath = definition.skillNamespace.pathType === 'home-dir'
    ? `~/${definition.skillNamespace.skillsBaseDir}`
    : definition.skillNamespace.skillsBaseDir;
  return path.join(resolveProviderPathValue(basePath, projectDir), name);
}

/**
 * Attempt a ClawHub API request
 */
async function clawHubFetch(endpoint: string): Promise<any | null> {
  try {
    const response = await fetch(`${CLAWHUB_API_BASE}${endpoint}`, {
      headers: { 'Accept': 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Try clawhub CLI command
 */
function runClawHub(args: string): string | null {
  try {
    return execSync(`clawhub ${args}`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

export class ClawHubAdapter implements RegistryAdapter {
  readonly id = 'clawhub';
  readonly name = 'ClawHub Registry';

  private available: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.available !== null) return this.available;

    // Check CLI
    const cliAvailable = runClawHub('--version 2>/dev/null') !== null;
    if (cliAvailable) {
      this.available = true;
      return true;
    }

    // Check API
    const apiResult = await clawHubFetch('/health');
    this.available = apiResult !== null;
    return this.available;
  }

  async search(query: string): Promise<SkillResult[]> {
    // Try API
    const apiResult = await clawHubFetch(
      `/skills/search?q=${encodeURIComponent(query)}`
    );
    if (apiResult && Array.isArray(apiResult.results)) {
      return apiResult.results.map((s: any) => ({
        name: s.name,
        description: s.description || '',
        source: 'clawhub',
        package: s.package || s.author,
        platforms: s.platforms || [],
        installed: false,
      }));
    }

    // Try CLI
    const cliOutput = runClawHub(`search "${query}" --json 2>/dev/null`);
    if (cliOutput) {
      try {
        const parsed = JSON.parse(cliOutput);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => ({
            name: s.name,
            description: s.description || '',
            source: 'clawhub',
            package: s.package || s.author,
            platforms: s.platforms || [],
            installed: false,
          }));
        }
      } catch {
        // Fall through
      }
    }

    return [];
  }

  async info(name: string): Promise<SkillDetails | undefined> {
    // Try API
    const apiResult = await clawHubFetch(
      `/skills/${encodeURIComponent(name)}`
    );
    if (apiResult && apiResult.name) {
      return {
        name: apiResult.name,
        description: apiResult.description || '',
        source: 'clawhub',
        package: apiResult.package || apiResult.author,
        platforms: apiResult.platforms || [],
        version: apiResult.version,
        triggers: apiResult.triggers || [],
        tools: apiResult.tools || [],
        installed: false,
      };
    }

    // Try CLI
    const cliOutput = runClawHub(`info "${name}" --json 2>/dev/null`);
    if (cliOutput) {
      try {
        const parsed = JSON.parse(cliOutput);
        return {
          name: parsed.name || name,
          description: parsed.description || '',
          source: 'clawhub',
          package: parsed.package || parsed.author,
          platforms: parsed.platforms || [],
          version: parsed.version,
          triggers: parsed.triggers || [],
          installed: false,
        };
      } catch {
        return undefined;
      }
    }

    return undefined;
  }

  async list(): Promise<SkillResult[]> {
    // Try API
    const apiResult = await clawHubFetch('/skills?limit=200');
    if (apiResult && Array.isArray(apiResult.results)) {
      return apiResult.results.map((s: any) => ({
        name: s.name,
        description: s.description || '',
        source: 'clawhub',
        package: s.package || s.author,
        platforms: s.platforms || [],
        installed: false,
      }));
    }

    // Try CLI
    const cliOutput = runClawHub('list --json 2>/dev/null');
    if (cliOutput) {
      try {
        const parsed = JSON.parse(cliOutput);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => ({
            name: s.name,
            description: s.description || '',
            source: 'clawhub',
            package: s.package || s.author,
            platforms: s.platforms || [],
            installed: false,
          }));
        }
      } catch {
        // Fall through
      }
    }

    return [];
  }

  async install(name: string, options: InstallOptions): Promise<void> {
    const target = options.target || 'claude';

    // Determine target directory
    let targetDir: string;
    try {
      const { PlatformSkillResolver } = await import(
        '../../smiths/skillsmith/platform-resolver.js'
      );
      targetDir = PlatformSkillResolver.getSkillPath(
        target as any,
        options.projectDir,
        name
      );
    } catch {
      targetDir = resolveSkillFallbackPath(target, options.projectDir, name);
    }

    // Try CLI install (downloads to a temp location, then we copy)
    const cliResult = runClawHub(
      `install "${name}" --output "${targetDir}" 2>/dev/null`
    );
    if (cliResult !== null) return;

    // Try API download
    const apiResult = await clawHubFetch(
      `/skills/${encodeURIComponent(name)}/download`
    );
    if (apiResult && apiResult.content) {
      fs.mkdirSync(targetDir, { recursive: true });
      const skillMdPath = path.join(targetDir, 'SKILL.md');
      fs.writeFileSync(skillMdPath, apiResult.content, 'utf-8');
      return;
    }

    throw new Error(
      `Could not install '${name}' from ClawHub. ` +
      `Ensure the skill exists at https://clawhub.ai and the API is accessible.`
    );
  }

  async publish(packageDir: string): Promise<void> {
    // Ensure clawhub.json exists — generate from manifest.json if missing
    const clawHubManifestPath = path.join(packageDir, 'clawhub.json');
    if (!fs.existsSync(clawHubManifestPath)) {
      const manifestPath = path.join(packageDir, 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
        const pkgJsonPath = path.resolve(packageDir, '..', '..', '..', '..', 'package.json');
        let version = '0.0.0';
        try {
          const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8'));
          version = pkg.version || version;
        } catch {
          // Use default version
        }

        const clawHubManifest = {
          name: manifest.name || path.basename(packageDir),
          version,
          description: manifest.description || '',
          homepage: 'https://aiwg.io',
          repository: 'https://github.com/jmagly/aiwg',
          skills: './skills',
          tags: manifest.tags || manifest.keywords || [],
          license: 'MIT',
          author: 'AIWG Contributors',
        };

        fs.writeFileSync(clawHubManifestPath, JSON.stringify(clawHubManifest, null, 2) + '\n', 'utf-8');
      }
    }

    // Try CLI publish
    const cliResult = runClawHub(`publish "${packageDir}" 2>/dev/null`);
    if (cliResult !== null) return;

    throw new Error(
      'ClawHub publish requires the clawhub CLI. ' +
      'Install it from https://docs.openclaw.ai/tools/clawhub'
    );
  }
}
