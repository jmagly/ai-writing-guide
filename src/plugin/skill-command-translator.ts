/**
 * Skill→Command Translation Layer
 *
 * Generates command files from canonical SKILL.md sources for providers that
 * require command format natively (Factory, OpenCode, Warp, Windsurf, Copilot,
 * Codex, OpenClaw).
 *
 * Skills are the canonical source format; commands are deployment artifacts.
 * See ADR: Skills as the Canonical Extension Type.
 *
 * @implements .aiwg/architecture/adr-skills-canonical-extension-type.md
 * @issue #550
 */

import fs from 'fs/promises';
import path from 'path';

// ============================================
// Types
// ============================================

export interface TranslationOptions {
  /** Target provider name */
  provider: string;
  /** Target directory for generated command files */
  targetDir: string;
  /** If true, return results without writing files */
  dryRun?: boolean;
  /** If true, log verbose output */
  verbose?: boolean;
  /**
   * Project root path. Used by per-provider dual-write paths (e.g., Copilot
   * `.github/prompts/<id>.prompt.md`). When omitted, dual-write derives the
   * root from `path.dirname(path.dirname(targetDir))` which works for
   * standard `<root>/.github/commands/` layouts but not arbitrary test
   * fixtures. Pass `projectPath` explicitly when targetDir is non-standard.
   */
  projectPath?: string;
  /**
   * Optional filter — only skills whose name returns true from this predicate
   * are translated. When omitted, all skills are translated. Used by Claude
   * (PUW-015 #1116) to limit translation to flow-* skills + a small allowlist
   * of operator-invocable command surfaces.
   */
  nameFilter?: (skillName: string) => boolean;
}

export interface TranslatedCommand {
  /** Skill source path */
  sourcePath: string;
  /** Skill name (from directory name) */
  skillName: string;
  /** Generated command filename */
  commandFilename: string;
  /** Generated command content */
  content: string;
  /** Whether the skill was skipped (e.g., userInvocable: false) */
  skipped: boolean;
  /** Reason for skipping */
  skipReason?: string;
}

export interface TranslationResult {
  /** Provider that was targeted */
  provider: string;
  /** Target directory for generated commands */
  targetDir: string;
  /** Successfully translated commands */
  translated: TranslatedCommand[];
  /** Skipped skills (background-only, etc.) */
  skipped: TranslatedCommand[];
  /** Errors encountered during translation */
  errors: { skillName: string; error: string }[];
  /** Total skills processed */
  totalProcessed: number;
}

/**
 * Parsed SKILL.md frontmatter fields relevant to command translation
 */
interface SkillFrontmatter {
  description?: string;
  commandHint?: {
    argumentHint?: string;
    allowedTools?: string | string[];
    template?: string;
    model?: string;
    category?: string;
    orchestration?: boolean;
    executionSteps?: string[];
    cliDisabled?: boolean;
  };
  userInvocable?: boolean;
  effort?: number;
  context?: string;
  disableModelInvocation?: boolean;
  allowedTools?: string | string[];
}

// ============================================
// Provider Configuration
// ============================================

/**
 * Providers that need command files generated from skills.
 *
 * Providers not listed here get skills deployed natively (no translation needed).
 */
const PROVIDERS_NEEDING_COMMANDS = new Set([
  'factory',
  'opencode',  // OpenCode scans .opencode/command/**/*.md via ConfigCommand.load() (PUW-006 #1107)
  'warp',
  'windsurf',
  'copilot',
  'codex',
  'openclaw',
]);

/**
 * Providers where skills are deployed natively (no command generation needed).
 */
const SKILLS_ONLY_PROVIDERS = new Set([
  'claude',
  'cursor',
  'hermes',
]);

/**
 * Check if a provider needs command files generated from skills.
 */
export function providerNeedsCommands(provider: string): boolean {
  return PROVIDERS_NEEDING_COMMANDS.has(provider);
}

/**
 * Check if a provider uses skills natively (no command translation).
 */
export function providerUsesSkillsNatively(provider: string): boolean {
  return SKILLS_ONLY_PROVIDERS.has(provider);
}

// ============================================
// Frontmatter Parsing
// ============================================

/**
 * Parse YAML-like frontmatter from a SKILL.md file.
 *
 * This is a lightweight parser that handles the subset of YAML used in
 * SKILL.md frontmatter. For full YAML support, a library like js-yaml
 * would be needed, but the frontmatter format is simple enough for this.
 */
export function parseFrontmatter(content: string): { frontmatter: SkillFrontmatter; body: string } {
  const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!fmMatch) {
    return { frontmatter: {}, body: content };
  }

  const fmRaw = fmMatch[1];
  const body = fmMatch[2];
  const frontmatter: SkillFrontmatter = {};

  // Parse top-level keys
  const lines = fmRaw.split('\n');
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // description: ...
    const descMatch = line.match(/^description:\s*(.+)/);
    if (descMatch) {
      frontmatter.description = descMatch[1].trim();
      i++;
      continue;
    }

    // userInvocable: false
    const uiMatch = line.match(/^userInvocable:\s*(true|false)/i);
    if (uiMatch) {
      frontmatter.userInvocable = uiMatch[1].toLowerCase() === 'true';
      i++;
      continue;
    }

    // user-invocable: false (kebab-case variant)
    const uiKebabMatch = line.match(/^user-invocable:\s*(true|false)/i);
    if (uiKebabMatch) {
      frontmatter.userInvocable = uiKebabMatch[1].toLowerCase() === 'true';
      i++;
      continue;
    }

    // effort: N
    const effortMatch = line.match(/^effort:\s*(\d+)/);
    if (effortMatch) {
      frontmatter.effort = parseInt(effortMatch[1], 10);
      i++;
      continue;
    }

    // context: fork|inherit
    const ctxMatch = line.match(/^context:\s*(\w+)/);
    if (ctxMatch) {
      frontmatter.context = ctxMatch[1];
      i++;
      continue;
    }

    // disableModelInvocation: true
    const dmiMatch = line.match(/^(?:disableModelInvocation|disable-model-invocation):\s*(true|false)/i);
    if (dmiMatch) {
      frontmatter.disableModelInvocation = dmiMatch[1].toLowerCase() === 'true';
      i++;
      continue;
    }

    // allowed-tools: (top-level, for the skill itself)
    const atMatch = line.match(/^allowed-tools:\s*(.+)/);
    if (atMatch) {
      frontmatter.allowedTools = atMatch[1].trim();
      i++;
      continue;
    }

    // commandHint: block
    if (line.match(/^commandHint:\s*$/)) {
      const hint: SkillFrontmatter['commandHint'] = {};
      i++;
      while (i < lines.length && lines[i].match(/^\s+/)) {
        const hintLine = lines[i].trim();

        const ahMatch = hintLine.match(/^argumentHint:\s*(.+)/);
        if (ahMatch) { hint.argumentHint = ahMatch[1].trim(); i++; continue; }

        const hatMatch = hintLine.match(/^allowedTools:\s*(.+)/);
        if (hatMatch) { hint.allowedTools = hatMatch[1].trim(); i++; continue; }

        const tmplMatch = hintLine.match(/^template:\s*(.+)/);
        if (tmplMatch) { hint.template = tmplMatch[1].trim(); i++; continue; }

        const modMatch = hintLine.match(/^model:\s*(.+)/);
        if (modMatch) { hint.model = modMatch[1].trim(); i++; continue; }

        const catMatch = hintLine.match(/^category:\s*(.+)/);
        if (catMatch) { hint.category = catMatch[1].trim(); i++; continue; }

        const orchMatch = hintLine.match(/^orchestration:\s*(true|false)/i);
        if (orchMatch) { hint.orchestration = orchMatch[1].toLowerCase() === 'true'; i++; continue; }

        const cliMatch = hintLine.match(/^cliDisabled:\s*(true|false)/i);
        if (cliMatch) { hint.cliDisabled = cliMatch[1].toLowerCase() === 'true'; i++; continue; }

        i++;
      }
      frontmatter.commandHint = hint;
      continue;
    }

    i++;
  }

  return { frontmatter, body };
}

// ============================================
// Command Generation
// ============================================

/**
 * Generate a command .md file content from parsed skill data.
 *
 * Maps SKILL.md frontmatter to legacy command frontmatter format:
 * - `description:` from skill description
 * - `argument-hint:` from commandHint.argumentHint
 * - `allowed-tools:` from commandHint.allowedTools (comma-separated)
 */
export function generateCommandContent(
  _skillName: string,
  frontmatter: SkillFrontmatter,
  body: string,
): string {
  const lines: string[] = ['---'];

  // description is always included
  if (frontmatter.description) {
    lines.push(`description: ${frontmatter.description}`);
  }

  const hint = frontmatter.commandHint;

  // argument-hint from commandHint
  if (hint?.argumentHint) {
    lines.push(`argument-hint: ${hint.argumentHint}`);
  }

  // allowed-tools: prefer commandHint.allowedTools, fall back to top-level allowedTools
  const tools = hint?.allowedTools ?? frontmatter.allowedTools;
  if (tools) {
    const toolStr = Array.isArray(tools) ? tools.join(', ') : tools;
    lines.push(`allowed-tools: ${toolStr}`);
  }

  lines.push('---');
  lines.push('');

  // Body content is passed through unchanged
  lines.push(body.trimStart());

  return lines.join('\n');
}

// ============================================
// Translation Pipeline
// ============================================

/**
 * Translate all skills in a directory to command files.
 *
 * Reads each subdirectory in `skillsDir` as a skill, parses SKILL.md,
 * and generates a corresponding command .md file.
 *
 * @param skillsDir - Source skills directory (e.g., `agentic/code/frameworks/sdlc-complete/skills/`)
 * @param options - Translation options (provider, target dir, dry-run)
 * @returns Translation result with counts and any errors
 */
export async function translateSkillsToCommands(
  skillsDir: string,
  options: TranslationOptions,
): Promise<TranslationResult> {
  const result: TranslationResult = {
    provider: options.provider,
    targetDir: options.targetDir,
    translated: [],
    skipped: [],
    errors: [],
    totalProcessed: 0,
  };

  // Check if this provider needs commands. nameFilter overrides the
  // provider gating: when an operator passes an explicit filter (e.g. Claude
  // flow→command emission per PUW-015 #1116), they're opting in to selective
  // translation regardless of the provider's default skills-native posture.
  if (!options.nameFilter && !providerNeedsCommands(options.provider)) {
    if (options.verbose) {
      console.log(`  Provider '${options.provider}' uses skills natively — skipping command generation`);
    }
    return result;
  }

  // Read skill directories
  let entries: string[];
  try {
    const dirEntries = await fs.readdir(skillsDir, { withFileTypes: true });
    entries = dirEntries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    // No skills directory — nothing to translate
    return result;
  }

  // Process each skill
  for (const skillName of entries) {
    // Apply name filter when provided (PUW-015 / #1116 — Claude flow filter).
    if (options.nameFilter && !options.nameFilter(skillName)) {
      continue;
    }
    result.totalProcessed++;
    const skillMdPath = path.join(skillsDir, skillName, 'SKILL.md');

    try {
      const content = await fs.readFile(skillMdPath, 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      // Skip background-only skills (userInvocable: false)
      if (frontmatter.userInvocable === false) {
        const skipped: TranslatedCommand = {
          sourcePath: skillMdPath,
          skillName,
          commandFilename: `${skillName}.md`,
          content: '',
          skipped: true,
          skipReason: 'userInvocable: false (background-only skill)',
        };
        result.skipped.push(skipped);
        if (options.verbose) {
          console.log(`  Skipped: ${skillName} (background-only)`);
        }
        continue;
      }

      // Generate command content
      const commandContent = generateCommandContent(skillName, frontmatter, body);
      const commandFilename = `${skillName}.md`;

      const translated: TranslatedCommand = {
        sourcePath: skillMdPath,
        skillName,
        commandFilename,
        content: commandContent,
        skipped: false,
      };

      // Write file (unless dry-run)
      if (!options.dryRun) {
        const targetPath = path.join(options.targetDir, commandFilename);
        await fs.mkdir(options.targetDir, { recursive: true });
        await fs.writeFile(targetPath, commandContent, 'utf-8');

        // Copilot dual-write per PUW-004 (#1105): also emit to
        // `.github/prompts/<skill>.prompt.md` so Copilot Chat picks up the
        // skills as `/`-invocable prompt files. Always-deploy invariant
        // (ADR-1 §0.6) keeps the legacy `.github/commands/` write above.
        if (options.provider === 'copilot') {
          const projectRoot = options.projectPath
            ?? path.dirname(path.dirname(options.targetDir));
          const promptsDir = path.join(projectRoot, '.github', 'prompts');
          const promptPath = path.join(promptsDir, `${skillName}.prompt.md`);
          await fs.mkdir(promptsDir, { recursive: true });
          await fs.writeFile(promptPath, commandContent, 'utf-8');
        }
      }

      result.translated.push(translated);
      if (options.verbose) {
        console.log(`  Translated: ${skillName} → ${commandFilename}`);
      }
    } catch (error) {
      // SKILL.md might not exist (skill has no markdown file) — skip gracefully
      const errMsg = error instanceof Error ? error.message : String(error);
      if (errMsg.includes('ENOENT')) {
        // No SKILL.md — skip silently
        continue;
      }
      result.errors.push({ skillName, error: errMsg });
      if (options.verbose) {
        console.error(`  Error: ${skillName} — ${errMsg}`);
      }
    }
  }

  return result;
}

/**
 * Translate a single SKILL.md content string to command format.
 *
 * Convenience function for testing and one-off translations.
 *
 * @param skillName - Skill name (used for display only)
 * @param skillContent - Raw SKILL.md file content
 * @returns Generated command .md content, or null if skill should be skipped
 */
export function translateSingleSkill(
  skillName: string,
  skillContent: string,
): string | null {
  const { frontmatter, body } = parseFrontmatter(skillContent);

  // Skip background-only skills
  if (frontmatter.userInvocable === false) {
    return null;
  }

  return generateCommandContent(skillName, frontmatter, body);
}
