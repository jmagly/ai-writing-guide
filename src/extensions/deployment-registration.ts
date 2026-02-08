/**
 * Deployment Registration
 *
 * Scans deployed agent and skill directories, extracts metadata from frontmatter,
 * and registers them in the extension registry for discovery.
 *
 * @implements #56, #57
 * @architecture @.aiwg/architecture/unified-extension-schema.md
 * @tests @test/unit/extensions/deployment-registration.test.ts
 */

import fs from 'fs';
import path from 'path';
import type { Extension, AgentMetadata, SkillMetadata, PlatformSupport } from './types.js';
import type { ExtensionRegistry } from './registry.js';

/**
 * Registration options
 */
export interface RegistrationOptions {
  /** Path to deployed agents directory */
  agentsPath?: string;
  /** Path to deployed skills directory */
  skillsPath?: string;
  /** Path to deployed commands directory */
  commandsPath?: string;
  /** Path to deployed rules directory */
  rulesPath?: string;
  /** Provider platform name */
  provider: string;
  /** Working directory for relative path resolution */
  cwd?: string;
}

/**
 * Frontmatter parser result
 */
interface ParsedFrontmatter {
  frontmatter: Record<string, unknown>;
  content: string;
}

/**
 * Parse frontmatter from markdown content
 *
 * Extracts YAML frontmatter between --- delimiters.
 *
 * @param content - Markdown content
 * @returns Parsed frontmatter and remaining content
 */
function parseFrontmatter(content: string): ParsedFrontmatter {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
  if (!fmMatch) {
    return { frontmatter: {}, content };
  }

  const yamlContent = fmMatch[1];
  const remainingContent = content.slice(fmMatch[0].length);

  // Simple YAML parser (basic key: value pairs)
  const frontmatter: Record<string, unknown> = {};
  const lines = yamlContent.split('\n');

  for (const line of lines) {
    const match = line.match(/^(\w+):\s*(.+)$/);
    if (match) {
      const [, key, value] = match;
      // Remove quotes if present
      frontmatter[key] = value.replace(/^['"]|['"]$/g, '');
    }
  }

  return { frontmatter, content: remainingContent };
}

/**
 * Extract description from markdown content
 *
 * Looks for first paragraph after frontmatter.
 *
 * @param content - Markdown content (without frontmatter)
 * @returns Extracted description
 */
function extractDescription(content: string): string {
  // Find first paragraph
  const paragraphMatch = content.match(/^[^\n#*-]+/m);
  if (paragraphMatch) {
    return paragraphMatch[0].trim().slice(0, 200); // Limit to 200 chars
  }
  return 'No description available';
}

/**
 * Extract capabilities from agent content
 *
 * Parses ## Capabilities or ## Skills sections.
 *
 * @param content - Markdown content
 * @returns Array of capabilities
 */
function extractCapabilities(content: string): string[] {
  const capabilitiesMatch = content.match(/##\s+(?:Capabilities|Skills)\s*\n([\s\S]*?)(?=\n##|\n$)/i);
  if (!capabilitiesMatch) return [];

  const capSection = capabilitiesMatch[1];
  const items = capSection.match(/^[-*]\s+(.+)$/gm);
  if (!items) return [];

  return items.map(item => {
    const text = item.replace(/^[-*]\s+/, '').trim();
    // Extract just the capability name (before colon if present)
    const colonIdx = text.indexOf(':');
    return colonIdx > 0 ? text.slice(0, colonIdx).trim().toLowerCase() : text.toLowerCase();
  }).slice(0, 10); // Limit to 10 capabilities
}

/**
 * Extract keywords from content
 *
 * Simple keyword extraction from headings and first paragraph.
 *
 * @param content - Markdown content
 * @param name - Extension name
 * @returns Array of keywords
 */
function extractKeywords(content: string, name: string): string[] {
  const keywords = new Set<string>();

  // Add name words
  name.toLowerCase().split(/[-\s]+/).forEach(word => {
    if (word.length > 2) keywords.add(word);
  });

  // Extract from headings
  const headings = content.match(/^#+\s+(.+)$/gm);
  if (headings) {
    headings.slice(0, 5).forEach(heading => {
      const text = heading.replace(/^#+\s+/, '');
      text.toLowerCase().split(/[\s,]+/).forEach(word => {
        if (word.length > 3 && !/^(and|the|for|with|from)$/.test(word)) {
          keywords.add(word);
        }
      });
    });
  }

  return Array.from(keywords).slice(0, 10);
}

/**
 * Parse model specification from frontmatter
 *
 * Handles both simple (opus/sonnet/haiku) and full model names.
 *
 * @param modelValue - Model value from frontmatter
 * @returns Model metadata
 */
function parseModel(modelValue: unknown): AgentMetadata['model'] {
  const modelStr = String(modelValue || 'sonnet').toLowerCase();

  let tier: 'haiku' | 'sonnet' | 'opus' = 'sonnet';
  if (/haiku/i.test(modelStr)) tier = 'haiku';
  else if (/opus/i.test(modelStr)) tier = 'opus';

  return { tier };
}

/**
 * Scan deployed agents directory
 *
 * Reads agent markdown files from the deployed directory and creates Extension
 * objects with metadata extracted from frontmatter.
 *
 * @param agentsPath - Path to .claude/agents or equivalent
 * @param provider - Provider platform name
 * @param cwd - Working directory for relative path resolution
 * @returns Array of agent extensions
 */
export async function scanDeployedAgents(
  agentsPath: string,
  provider: string,
  cwd: string = process.cwd()
): Promise<Extension[]> {
  const absolutePath = path.isAbsolute(agentsPath) ? agentsPath : path.join(cwd, agentsPath);

  // Check if directory exists
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    return [];
  }

  const agents: Extension[] = [];
  const files = fs.readdirSync(absolutePath);

  for (const file of files) {
    if (!file.endsWith('.md')) continue;

    const filePath = path.join(absolutePath, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const { frontmatter, content: bodyContent } = parseFrontmatter(content);

    // Extract ID from filename (remove .md extension)
    const id = path.basename(file, '.md');

    // Extract name (prefer frontmatter, fallback to title-cased ID)
    const name = String(frontmatter.name ||
      id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    // Extract description
    const description = String(frontmatter.description || extractDescription(bodyContent));

    // Extract capabilities
    const capabilities = extractCapabilities(bodyContent);

    // Extract keywords
    const keywords = extractKeywords(bodyContent, name);

    // Parse model
    const model = parseModel(frontmatter.model);

    // Extract tools (default to common tools)
    const toolsValue = frontmatter.tools || 'Read, Write, Bash';
    const tools = String(toolsValue).split(',').map(t => t.trim());

    // Extract role
    const role = String(frontmatter.role || frontmatter.description || description);

    // Build agent extension
    const agent: Extension = {
      id,
      type: 'agent',
      name,
      description,
      version: String(frontmatter.version || '1.0.0'),
      capabilities,
      keywords,
      category: String(frontmatter.category || 'agent'),
      platforms: {
        [provider]: 'full' as PlatformSupport,
      },
      deployment: {
        pathTemplate: `${agentsPath}/{id}.md`,
        core: false,
      },
      metadata: {
        type: 'agent',
        role,
        model,
        tools,
      } satisfies AgentMetadata,
      installation: {
        installedAt: new Date().toISOString(),
        installedFrom: 'local',
        installedPath: filePath,
        enabled: true,
      },
    };

    agents.push(agent);
  }

  return agents;
}

/**
 * Scan deployed skills directory
 *
 * Reads skill directories from the deployed directory and creates Extension
 * objects with metadata extracted from skill.md files.
 *
 * @param skillsPath - Path to .claude/skills or equivalent
 * @param provider - Provider platform name
 * @param cwd - Working directory for relative path resolution
 * @returns Array of skill extensions
 */
export async function scanDeployedSkills(
  skillsPath: string,
  provider: string,
  cwd: string = process.cwd()
): Promise<Extension[]> {
  const absolutePath = path.isAbsolute(skillsPath) ? skillsPath : path.join(cwd, skillsPath);

  // Check if directory exists
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    return [];
  }

  const skills: Extension[] = [];
  const entries = fs.readdirSync(absolutePath, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const skillDir = path.join(absolutePath, entry.name);
    const skillFile = path.join(skillDir, 'SKILL.md');
    const skillFileLower = path.join(skillDir, 'skill.md');
    const actualSkillFile = fs.existsSync(skillFile) ? skillFile : skillFileLower;

    if (!fs.existsSync(actualSkillFile)) continue;

    const content = fs.readFileSync(actualSkillFile, 'utf8');
    const { frontmatter, content: bodyContent } = parseFrontmatter(content);

    // Extract ID from directory name
    const id = entry.name;

    // Extract name
    const name = String(frontmatter.name ||
      id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '));

    // Extract description
    const description = String(frontmatter.description || extractDescription(bodyContent));

    // Extract trigger phrases
    const triggersValue = frontmatter.triggers || frontmatter.triggerPhrases || '';
    const triggerPhrases = String(triggersValue)
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // Extract tools
    const toolsValue = frontmatter.tools || '';
    const tools = toolsValue ? String(toolsValue).split(',').map(t => t.trim()) : undefined;

    // Build skill extension
    const skill: Extension = {
      id,
      type: 'skill',
      name,
      description,
      version: String(frontmatter.version || '1.0.0'),
      capabilities: extractCapabilities(bodyContent),
      keywords: extractKeywords(bodyContent, name),
      category: String(frontmatter.category || 'skill'),
      platforms: {
        [provider]: 'full' as PlatformSupport,
      },
      deployment: {
        pathTemplate: `${skillsPath}/{id}/skill.md`,
        additionalFiles: ['references.md'].filter(f => fs.existsSync(path.join(skillDir, f))),
        core: false,
      },
      metadata: {
        type: 'skill',
        triggerPhrases: triggerPhrases.length > 0 ? triggerPhrases : [`use ${id}`, name.toLowerCase()],
        tools,
      } satisfies SkillMetadata,
      installation: {
        installedAt: new Date().toISOString(),
        installedFrom: 'local',
        installedPath: skillDir,
        enabled: true,
      },
    };

    skills.push(skill);
  }

  return skills;
}

/**
 * Register deployed extensions in the registry
 *
 * Scans deployed agent and skill directories, creates Extension objects, and
 * registers them in the provided registry.
 *
 * @param registry - Extension registry to populate
 * @param options - Registration options
 *
 * @example
 * ```typescript
 * import { getRegistry } from './registry.js';
 * import { registerDeployedExtensions } from './deployment-registration.js';
 *
 * const registry = getRegistry();
 * await registerDeployedExtensions(registry, {
 *   agentsPath: '.claude/agents',
 *   skillsPath: '.claude/skills',
 *   provider: 'claude',
 * });
 *
 * // Now list all deployed agents
 * const agents = registry.getByType('agent');
 * console.log(`Deployed ${agents.length} agents`);
 * ```
 */
export async function registerDeployedExtensions(
  registry: ExtensionRegistry,
  options: RegistrationOptions
): Promise<void> {
  const { agentsPath, skillsPath, provider, cwd } = options;

  // Scan and register agents
  if (agentsPath) {
    const agents = await scanDeployedAgents(agentsPath, provider, cwd);
    for (const agent of agents) {
      registry.register(agent);
    }
    console.log(`Registered ${agents.length} agents from ${agentsPath}`);
  }

  // Scan and register skills
  if (skillsPath) {
    const skills = await scanDeployedSkills(skillsPath, provider, cwd);
    for (const skill of skills) {
      registry.register(skill);
    }
    console.log(`Registered ${skills.length} skills from ${skillsPath}`);
  }

  // Commands are already registered via command definitions, so we skip scanning
}
