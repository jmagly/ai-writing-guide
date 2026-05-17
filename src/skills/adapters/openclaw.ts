/**
 * OpenClaw Registry Adapter
 *
 * Delegates to the `openclaw` CLI for skill operations.
 * Parses CLI output to provide structured results.
 * Falls back gracefully when OpenClaw is not installed.
 *
 * @implements #539
 * @see https://docs.openclaw.ai
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import type { RegistryAdapter, SkillResult, SkillDetails, InstallOptions } from '../types.js';

/**
 * Execute an openclaw CLI command and return stdout
 */
function runOpenClaw(args: string): string | null {
  try {
    return execSync(`openclaw ${args}`, {
      encoding: 'utf-8',
      timeout: 30000,
      stdio: ['pipe', 'pipe', 'pipe'],
    }).trim();
  } catch {
    return null;
  }
}

/**
 * Parse openclaw skills list output into SkillResult[]
 *
 * Expected format is newline-separated entries. We handle both
 * structured JSON output (if openclaw supports --json) and
 * plain text output by scanning ~/.openclaw/skills/ directly.
 */
function parseSkillsFromDirectory(): SkillResult[] {
  const results: SkillResult[] = [];
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const skillsDir = path.join(homeDir, '.openclaw', 'skills');

  if (!fs.existsSync(skillsDir)) return results;

  try {
    for (const skillMdPath of findSkillMarkdownFiles(skillsDir)) {
      const skillDir = path.dirname(skillMdPath);
      const name = path.basename(skillDir);

      const content = fs.readFileSync(skillMdPath, 'utf-8');

      // Extract description from first paragraph after heading
      const descMatch = content.match(/^# .+\n\n(.+)/m);
      const description = descMatch
        ? descMatch[1].slice(0, 120)
        : `Skill: ${name}`;

      // Extract platforms from frontmatter
      const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
      let platforms: string[] = [];
      if (fmMatch) {
        const platformLine = fmMatch[1]
          .split('\n')
          .find((l) => l.startsWith('platforms:'));
        if (platformLine) {
          platforms = platformLine
            .replace(/^platforms:\s*\[?/, '')
            .replace(/\]?\s*$/, '')
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        }
      }

      results.push({
        name,
        description,
        source: 'openclaw',
        platforms,
        installed: true,
      });
    }
  } catch {
    // Permission error or similar
  }

  return results;
}

function findSkillMarkdownFiles(skillsDir: string): string[] {
  const found: string[] = [];
  if (!fs.existsSync(skillsDir)) return found;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const direct = path.join(skillsDir, entry.name, 'SKILL.md');
    if (fs.existsSync(direct)) {
      found.push(direct);
      continue;
    }

    // OpenClaw supports one namespace level under ~/.openclaw/skills/
    // (for example ~/.openclaw/skills/aiwg/<skill>/SKILL.md).
    const namespaceDir = path.join(skillsDir, entry.name);
    for (const child of fs.readdirSync(namespaceDir, { withFileTypes: true })) {
      if (!child.isDirectory()) continue;
      const nested = path.join(namespaceDir, child.name, 'SKILL.md');
      if (fs.existsSync(nested)) found.push(nested);
    }
  }

  return found;
}

function findSkillDir(name: string): string | null {
  const homeDir = process.env.HOME || process.env.USERPROFILE || '';
  const skillsDir = path.join(homeDir, '.openclaw', 'skills');
  const direct = path.join(skillsDir, name);
  if (fs.existsSync(path.join(direct, 'SKILL.md'))) return direct;

  const namespaced = path.join(skillsDir, 'aiwg', name);
  if (fs.existsSync(path.join(namespaced, 'SKILL.md'))) return namespaced;

  if (fs.existsSync(skillsDir)) {
    for (const skillMd of findSkillMarkdownFiles(skillsDir)) {
      if (path.basename(path.dirname(skillMd)) === name) return path.dirname(skillMd);
    }
  }

  return null;
}

export class OpenClawAdapter implements RegistryAdapter {
  readonly id = 'openclaw';
  readonly name = 'OpenClaw CLI';

  private cachedSkills: SkillResult[] | null = null;

  async isAvailable(): Promise<boolean> {
    // Check for openclaw CLI or the ~/.openclaw/skills/ directory
    const homeDir = process.env.HOME || process.env.USERPROFILE || '';
    const openclawDir = path.join(homeDir, '.openclaw');

    if (fs.existsSync(openclawDir)) return true;

    try {
      execSync('openclaw --version 2>/dev/null', { encoding: 'utf-8' });
      return true;
    } catch {
      return false;
    }
  }

  async list(): Promise<SkillResult[]> {
    if (this.cachedSkills) return this.cachedSkills;

    // Try openclaw CLI with JSON output first
    const jsonOutput = runOpenClaw('skills list --json 2>/dev/null');
    if (jsonOutput) {
      try {
        const parsed = JSON.parse(jsonOutput);
        if (Array.isArray(parsed)) {
          this.cachedSkills = parsed.map((s: any) => ({
            name: s.name || s.id,
            description: s.description || '',
            source: 'openclaw',
            platforms: s.platforms || [],
            installed: true,
          }));
          return this.cachedSkills;
        }
      } catch {
        // Fall through to directory scan
      }
    }

    // Fall back to reading ~/.openclaw/skills/ directly
    this.cachedSkills = parseSkillsFromDirectory();
    return this.cachedSkills;
  }

  async search(query: string): Promise<SkillResult[]> {
    // Try CLI delegation first
    const cliOutput = runOpenClaw(`skills search "${query}" --json 2>/dev/null`);
    if (cliOutput) {
      try {
        const parsed = JSON.parse(cliOutput);
        if (Array.isArray(parsed)) {
          return parsed.map((s: any) => ({
            name: s.name || s.id,
            description: s.description || '',
            source: 'openclaw',
            platforms: s.platforms || [],
            installed: s.installed ?? false,
          }));
        }
      } catch {
        // Fall through to local filter
      }
    }

    // Fall back to filtering local skills
    const all = await this.list();
    const q = query.toLowerCase();
    return all.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
    );
  }

  async info(name: string): Promise<SkillDetails | undefined> {
    const skillDir = findSkillDir(name);
    const skillMdPath = skillDir ? path.join(skillDir, 'SKILL.md') : '';

    if (!skillMdPath || !fs.existsSync(skillMdPath)) {
      // Try CLI
      const cliOutput = runOpenClaw(`skills info "${name}" --json 2>/dev/null`);
      if (cliOutput) {
        try {
          const parsed = JSON.parse(cliOutput);
          return {
            name: parsed.name || name,
            description: parsed.description || '',
            source: 'openclaw',
            platforms: parsed.platforms || [],
            triggers: parsed.triggers || [],
            version: parsed.version,
          };
        } catch {
          return undefined;
        }
      }
      return undefined;
    }

    const content = fs.readFileSync(skillMdPath, 'utf-8');

    // Parse frontmatter
    const fmMatch = content.match(/^---\n([\s\S]*?)\n---/);
    let platforms: string[] = [];
    if (fmMatch) {
      const platformLine = fmMatch[1]
        .split('\n')
        .find((l) => l.startsWith('platforms:'));
      if (platformLine) {
        platforms = platformLine
          .replace(/^platforms:\s*\[?/, '')
          .replace(/\]?\s*$/, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
      }
    }

    // Extract triggers
    const triggerSection = content.match(/## Triggers\n\n([\s\S]*?)(?:\n##|\n$)/);
    const triggers = triggerSection
      ? triggerSection[1]
          .split('\n')
          .filter((line) => line.startsWith('- '))
          .map((line) => line.replace(/^- ["']?|["']?$/g, '').trim())
          .filter(Boolean)
      : [];

    // Extract description
    const descMatch = content.match(/^# .+\n\n(.+)/m);
    const description = descMatch ? descMatch[1] : `Skill: ${name}`;

    return {
      name,
      description,
      source: 'openclaw',
      platforms,
      triggers,
      path: skillMdPath,
      content,
      installed: true,
    };
  }

  async install(name: string, options: InstallOptions): Promise<void> {
    // Try openclaw CLI install first
    const cliResult = runOpenClaw(`skills install "${name}" 2>/dev/null`);
    if (cliResult !== null) {
      // CLI handled it — if target is different from openclaw, copy to target
      if (options.target && options.target !== 'openclaw') {
        const homeDir = process.env.HOME || process.env.USERPROFILE || '';
        const sourceDir = path.join(homeDir, '.openclaw', 'skills', name);
        if (fs.existsSync(sourceDir)) {
          await this.copyToTarget(name, sourceDir, options);
        }
      }
      return;
    }

    // If CLI not available but skill exists in ~/.openclaw/skills/, copy it
    const sourceDir = findSkillDir(name);
    if (sourceDir && fs.existsSync(sourceDir)) {
      await this.copyToTarget(name, sourceDir, options);
      return;
    }

    throw new Error(
      `Skill '${name}' not found in OpenClaw. ` +
      `Ensure it's installed via 'openclaw skills install ${name}' or available at ~/.openclaw/skills/${name}/ or ~/.openclaw/skills/aiwg/${name}/`
    );
  }

  private async copyToTarget(
    name: string,
    sourceDir: string,
    options: InstallOptions
  ): Promise<void> {
    const target = options.target || 'openclaw';
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
      targetDir = path.join(options.projectDir, baseDir, name);
    }

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
  }
}
