/**
 * Local Registry Adapter
 *
 * Scans agentic/code/ for skill manifests and SKILL.md files.
 * Also checks deployed skills in the current project's provider directory.
 *
 * @implements #539
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { RegistryAdapter, SkillResult, SkillDetails, InstallOptions } from '../types.js';

const _scriptDir = path.dirname(fileURLToPath(import.meta.url));
const AIWG_ROOT = process.env.AIWG_ROOT || path.resolve(_scriptDir, '../../../');

interface ManifestSkill {
  name: string;
  description: string;
  triggers?: string[];
  scripts?: string[];
}

interface SkillManifest {
  name: string;
  description?: string;
  version?: string;
  type: string;
  skills: ManifestSkill[];
}

/**
 * Parse YAML-like frontmatter from SKILL.md content
 */
function parseFrontmatter(content: string): Record<string, string> {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const result: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const kv = line.match(/^(\w+):\s*(.+)$/);
    if (kv) {
      result[kv[1]] = kv[2].replace(/^['"]|['"]$/g, '');
    }
  }
  return result;
}

/**
 * Parse platforms from frontmatter value like "[claude-code, hermes, openclaw]"
 */
function parsePlatforms(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .replace(/^\[|\]$/g, '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Extract triggers section from SKILL.md content
 */
function extractTriggers(content: string): string[] {
  const triggerSection = content.match(/## Triggers\n\n([\s\S]*?)(?:\n##|\n$)/);
  if (!triggerSection) return [];

  return triggerSection[1]
    .split('\n')
    .filter((line) => line.startsWith('- '))
    .map((line) => line.replace(/^- ["']?|["']?$/g, '').trim())
    .filter(Boolean);
}

/**
 * Recursively find all manifest.json files under a directory
 */
function findManifests(dir: string): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      // Check for skills/manifest.json pattern
      const manifestPath = path.join(fullPath, 'skills', 'manifest.json');
      if (fs.existsSync(manifestPath)) {
        results.push(manifestPath);
      }
      // Recurse into subdirectories
      results.push(...findManifests(fullPath));
    }
  }

  return results;
}

/**
 * Deduplicate manifests — keep the shallowest path for each manifest
 */
function deduplicateManifests(paths: string[]): string[] {
  const seen = new Set<string>();
  return paths.filter((p) => {
    if (seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

export class LocalAdapter implements RegistryAdapter {
  readonly id = 'local';
  readonly name = 'Local (AIWG Installation)';

  private cachedSkills: SkillResult[] | null = null;

  async isAvailable(): Promise<boolean> {
    return fs.existsSync(path.join(AIWG_ROOT, 'agentic', 'code'));
  }

  async list(): Promise<SkillResult[]> {
    if (this.cachedSkills) return this.cachedSkills;

    const skills: SkillResult[] = [];
    const agenticDir = path.join(AIWG_ROOT, 'agentic', 'code');

    if (!fs.existsSync(agenticDir)) return skills;

    // Find all manifest.json files in frameworks/ and addons/
    const frameworksDir = path.join(agenticDir, 'frameworks');
    const addonsDir = path.join(agenticDir, 'addons');

    const manifestPaths = deduplicateManifests([
      ...findManifests(frameworksDir),
      ...findManifests(addonsDir),
    ]);

    for (const manifestPath of manifestPaths) {
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest: SkillManifest = JSON.parse(raw);
        const skillsDir = path.dirname(manifestPath);

        // Derive package name from path
        // e.g., agentic/code/frameworks/sdlc-complete/skills/manifest.json → sdlc-complete
        const parts = manifestPath.split(path.sep);
        const frameworkIdx = parts.indexOf('frameworks');
        const addonIdx = parts.indexOf('addons');
        const packageName =
          frameworkIdx >= 0
            ? parts[frameworkIdx + 1]
            : addonIdx >= 0
              ? parts[addonIdx + 1]
              : manifest.name;

        for (const skill of manifest.skills) {
          // Try to read SKILL.md for platform info
          const skillMdPath = path.join(skillsDir, skill.name, 'SKILL.md');
          let platforms: string[] = [];

          if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            const fm = parseFrontmatter(content);
            platforms = parsePlatforms(fm.platforms);
          }

          skills.push({
            name: skill.name,
            description: skill.description,
            source: 'local',
            package: packageName,
            platforms,
            installed: true,
          });
        }
      } catch {
        // Skip malformed manifests
      }
    }

    // Also scan for SKILL.md files not in any manifest (standalone skills)
    const skillMdPaths = this.findSkillMds(agenticDir);
    const knownNames = new Set(skills.map((s) => s.name));

    for (const skillMdPath of skillMdPaths) {
      const skillName = path.basename(path.dirname(skillMdPath));
      if (knownNames.has(skillName)) continue;

      try {
        const content = fs.readFileSync(skillMdPath, 'utf-8');
        const fm = parseFrontmatter(content);
        const platforms = parsePlatforms(fm.platforms);

        // Extract description from first paragraph after frontmatter
        const bodyMatch = content.match(/---\n\n# .+\n\n(.+)/);
        const description = bodyMatch
          ? bodyMatch[1].slice(0, 120)
          : `Skill: ${skillName}`;

        // Derive package
        const parts = skillMdPath.split(path.sep);
        const frameworkIdx = parts.indexOf('frameworks');
        const addonIdx = parts.indexOf('addons');
        const packageName =
          frameworkIdx >= 0
            ? parts[frameworkIdx + 1]
            : addonIdx >= 0
              ? parts[addonIdx + 1]
              : 'unknown';

        skills.push({
          name: skillName,
          description,
          source: 'local',
          package: packageName,
          platforms,
          installed: true,
        });
      } catch {
        // Skip unreadable files
      }
    }

    this.cachedSkills = skills;
    return skills;
  }

  async search(query: string): Promise<SkillResult[]> {
    const all = await this.list();
    const q = query.toLowerCase();

    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        (s.package && s.package.toLowerCase().includes(q))
    );
  }

  async info(name: string): Promise<SkillDetails | undefined> {
    const all = await this.list();
    const match = all.find((s) => s.name === name);
    if (!match) return undefined;

    // Find the SKILL.md for full details
    const agenticDir = path.join(AIWG_ROOT, 'agentic', 'code');
    const skillMdPaths = this.findSkillMds(agenticDir);
    const skillMdPath = skillMdPaths.find(
      (p) => path.basename(path.dirname(p)) === name
    );

    const details: SkillDetails = { ...match };

    if (skillMdPath) {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      details.path = skillMdPath;
      details.triggers = extractTriggers(content);
      details.content = content;
    }

    // Check manifest for scripts
    const manifestPaths = deduplicateManifests([
      ...findManifests(path.join(agenticDir, 'frameworks')),
      ...findManifests(path.join(agenticDir, 'addons')),
    ]);

    for (const manifestPath of manifestPaths) {
      try {
        const raw = fs.readFileSync(manifestPath, 'utf-8');
        const manifest: SkillManifest = JSON.parse(raw);
        const skillEntry = manifest.skills.find((s) => s.name === name);
        if (skillEntry) {
          details.triggers = details.triggers?.length
            ? details.triggers
            : skillEntry.triggers;
          details.scripts = skillEntry.scripts;
          details.version = manifest.version;
          break;
        }
      } catch {
        // Skip
      }
    }

    return details;
  }

  async install(name: string, options: InstallOptions): Promise<void> {
    const details = await this.info(name);
    if (!details || !details.path) {
      throw new Error(`Skill '${name}' not found in local registry`);
    }

    const target = options.target || 'claude';
    const projectDir = options.projectDir;

    // Use PlatformSkillResolver for cross-platform path resolution
    let targetDir: string;
    try {
      const { PlatformSkillResolver } = await import(
        '../../smiths/skillsmith/platform-resolver.js'
      );
      targetDir = PlatformSkillResolver.getSkillPath(
        target as any,
        projectDir,
        name
      );
    } catch {
      // Fallback: construct path from known conventions
      const platformDirs: Record<string, string> = {
        claude: '.claude/skills',
        copilot: '.github/skills',
        factory: '.factory/skills',
        cursor: '.cursor/skills',
        codex: '.codex/skills',
        opencode: '.opencode/skill',
        warp: '.warp/skills',
        windsurf: '.windsurf/skills',
        openclaw: path.join(
          process.env.HOME || '~',
          '.openclaw',
          'skills'
        ),
        generic: 'skills',
      };
      const baseDir = platformDirs[target] || `.${target}/skills`;
      targetDir = path.join(projectDir, baseDir, name);
    }

    // Copy skill directory to target
    const sourceDir = path.dirname(details.path);
    fs.mkdirSync(targetDir, { recursive: true });

    const entries = fs.readdirSync(sourceDir, { withFileTypes: true });
    for (const entry of entries) {
      const srcPath = path.join(sourceDir, entry.name);
      const destPath = path.join(targetDir, entry.name);

      if (entry.isFile()) {
        fs.copyFileSync(srcPath, destPath);
      } else if (entry.isDirectory()) {
        fs.cpSync(srcPath, destPath, { recursive: true });
      }
    }

    // Codex `agents/openai.yaml` UI sidecar (#1129 PUW-028).
    // Additive — sidecar absence is graceful. Failures here are non-fatal.
    if (target === 'codex') {
      try {
        const { emitCodexSidecar } = await import('../../smiths/skillsmith/codex-sidecar.js');
        const skillMdPath = path.join(targetDir, 'SKILL.md');
        let metadata: { name?: string; description?: string } = {};
        try {
          const skillContent = fs.readFileSync(skillMdPath, 'utf8');
          const fmMatch = /^---\s*\n([\s\S]*?)\n---/.exec(skillContent);
          if (fmMatch) {
            const yaml = await import('js-yaml');
            const fm = yaml.load(fmMatch[1]);
            if (fm && typeof fm === 'object') {
              metadata = fm as { name?: string; description?: string };
            }
          }
        } catch {
          // Frontmatter parse failure → fall through with empty metadata;
          // sidecar will use folder name as display_name.
        }
        await emitCodexSidecar(targetDir, metadata);
      } catch (err) {
        // Sidecar emission must never block the deploy. Log and move on.
        console.warn(
          `Warning: Codex sidecar emission failed for ${name}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }

  /**
   * Find all SKILL.md files recursively
   */
  private findSkillMds(dir: string): string[] {
    const results: string[] = [];

    if (!fs.existsSync(dir)) return results;

    const walk = (currentDir: string) => {
      try {
        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
          const fullPath = path.join(currentDir, entry.name);
          if (entry.isDirectory()) {
            walk(fullPath);
          } else if (entry.name === 'SKILL.md') {
            results.push(fullPath);
          }
        }
      } catch {
        // Permission error or similar — skip
      }
    };

    walk(dir);
    return results;
  }
}
