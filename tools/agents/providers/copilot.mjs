/**
 * GitHub Copilot Provider
 *
 * Deploys agents in GitHub Copilot .agent.md format (Markdown with YAML frontmatter).
 * Commands deploy as prompt files (.prompt.md) in .github/prompts/.
 * Rules deploy as path-scoped instructions (.instructions.md) in .github/instructions/.
 *
 * Deployment paths:
 *   - Agents: .github/agents/ (.agent.md)
 *   - Commands: .github/prompts/ (.prompt.md)
 *   - Skills: .github/skills/
 *   - Rules: .github/instructions/ (.instructions.md)
 *
 * Special features:
 *   - .agent.md format with YAML frontmatter + markdown body
 *   - .prompt.md format for commands (invocable as /command in Copilot Chat)
 *   - .instructions.md format with applyTo globs for path-scoped rules
 *   - Tool mapping to Copilot built-in tools
 *   - Creates copilot-instructions.md
 */

import realFs from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
let fs;
try { const gfs = _require('graceful-fs'); gfs.gracefulify(realFs); fs = realFs; } catch { fs = realFs; }
import path from 'path';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  deployFiles,
  inferAgentCategory,
  toKebabCase,
  initializeFrameworkWorkspace,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonRuleFiles,
  getAddonSkillDirs,
  listSkillDirs,
  deploySkillDir,
  deploySkillsWithKernelRouting,
  isKernelSkill,
  pruneStaleAiwgSkills,
  computeAllKernelNames,
  normalizeDeploymentMode,
  collectFrameworkArtifacts,
  cleanupOldRuleFiles,
  filterCommandsAgainstSkills,
  deploySoulCompanions
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'copilot';
export const aliases = [];

export const paths = {
  agents: '.github/agents/',
  commands: '.github/prompts/',
  // Skills sequestered under .github/.aiwg/skills/ — index-driven discovery (#1212).
  skills: '.github/.aiwg/skills/',
  rules: '.github/instructions/'
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
export const kernelSkillsPath = '.github/skills/';

export const support = {
  agents: 'native',
  commands: 'native',
  skills: 'conventional',
  rules: 'native'
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: false,
  yamlFormat: false
};

// ============================================================================
// Model Mapping
// ============================================================================

/**
 * Map model shorthand to GitHub Copilot format.
 * Copilot now supports Claude models (claude-opus-4-5, claude-sonnet-4-5)
 * alongside GPT models (gpt-4o, gpt-4o-mini).
 */
export function mapModel(originalModel, modelCfg, modelsConfig) {
  const copilotModels = {
    'opus': 'claude-opus-4-5',
    'sonnet': 'gpt-4o',
    'haiku': 'gpt-4o-mini'
  };

  // Handle override models first
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || copilotModels.opus;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || copilotModels.haiku;
    return modelCfg.codingModel || copilotModels.sonnet;
  }

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  for (const [key, value] of Object.entries(copilotModels)) {
    if (clean.includes(key)) return value;
  }

  return copilotModels.sonnet; // default
}

// ============================================================================
// Tool Mapping
// ============================================================================

/**
 * Get Copilot tools based on category and original tools.
 * Uses Copilot's built-in tool names (search/codebase, edit, web/fetch, agent, terminal).
 */
export function getTools(category, toolsString) {
  // Map AIWG tools to GitHub Copilot built-in tools
  const toolMap = {
    'Read': 'search/codebase',
    'Write': 'edit',
    'MultiEdit': 'edit',
    'Edit': 'edit',
    'Bash': 'terminal',
    'WebFetch': 'web/fetch',
    'Glob': 'search/codebase',
    'Grep': 'search/codebase',
    'Task': 'agent',
    'Agent': 'agent'
  };

  // Default tools by category
  const categoryDefaults = {
    analysis: ['search/codebase', 'web/fetch'],
    documentation: ['search/codebase', 'edit', 'web/fetch'],
    planning: ['search/codebase', 'web/fetch'],
    implementation: ['search/codebase', 'edit', 'terminal', 'web/fetch', 'agent']
  };

  // If tools specified, map them
  if (toolsString) {
    let originalTools = [];
    if (toolsString.startsWith('[')) {
      try {
        originalTools = JSON.parse(toolsString);
      } catch (e) {
        originalTools = toolsString.replace(/[\[\]"']/g, '').split(/[,\s]+/).filter(Boolean);
      }
    } else {
      originalTools = toolsString.split(/[,\s]+/).filter(Boolean);
    }

    const mappedTools = new Set();
    for (const tool of originalTools) {
      const cleanTool = tool.replace(/\(.*\)/, '').trim();
      const mapped = toolMap[cleanTool];
      if (mapped) mappedTools.add(mapped);
    }

    if (mappedTools.size > 0) {
      return Array.from(mappedTools);
    }
  }

  // Fall back to category defaults
  return categoryDefaults[category] || categoryDefaults.implementation;
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform AIWG agent to GitHub Copilot .agent.md format.
 * Output: YAML frontmatter with name, description, tools, model + markdown body (system prompt).
 */
export function transformAgent(srcPath, content, opts) {
  const { modelsConfig = {} } = opts;

  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();
  const categoryMatch = frontmatter.match(/category:\s*(.+)/)?.[1]?.trim();

  // Map model to Copilot format
  const copilotModel = mapModel(modelMatch, opts, modelsConfig);

  // Determine agent category
  const category = categoryMatch || inferAgentCategory(name, body);

  // Get Copilot-specific tools
  const copilotTools = getTools(category, toolsMatch);

  // Build YAML frontmatter
  const fmLines = [
    '---',
    `name: ${name || 'aiwg-agent'}`,
    `description: ${description || 'AIWG SDLC agent'}`
  ];

  if (copilotTools.length > 0) {
    fmLines.push(`tools: [${copilotTools.map(t => `'${t}'`).join(', ')}]`);
  }

  fmLines.push(`model: ${copilotModel}`);
  fmLines.push('---');

  // Body is the system prompt (markdown)
  const cleanBody = body.trim();
  return fmLines.join('\n') + '\n\n' + cleanBody + '\n';
}

/**
 * Transform AIWG command to GitHub Copilot .prompt.md format.
 * Output: YAML frontmatter with name, description, model, tools + markdown body.
 * Users invoke via /command-name in Copilot Chat.
 */
export function transformCommand(srcPath, content, opts) {
  const { modelsConfig = {} } = opts;

  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    // No frontmatter, create simple prompt format
    const firstLine = content.split('\n')[0];
    const description = firstLine.replace(/^#\s*/, '').trim() || 'AIWG command';
    const cmdName = toKebabCase(description);

    return `---\nname: ${cmdName}\ndescription: ${description}\nmodel: gpt-4o\n---\n\n${content.trim()}\n`;
  }

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const argumentHint = frontmatter.match(/argument-hint:\s*(.+)/)?.[1]?.trim()?.replace(/^["']|["']$/g, '');
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/(?:allowed-tools|tools):\s*(.+)/)?.[1]?.trim();
  const cmdName = toKebabCase(description || 'aiwg-command');

  // Map model
  const copilotModel = mapModel(modelMatch, opts, modelsConfig);

  // Map tools from allowed-tools
  const copilotTools = getTools('implementation', toolsMatch);

  // Build YAML frontmatter
  const fmLines = [
    '---',
    `name: ${cmdName}`,
    `description: ${description || 'AIWG command'}`
  ];

  if (copilotTools.length > 0) {
    fmLines.push(`tools: [${copilotTools.map(t => `'${t}'`).join(', ')}]`);
  }

  fmLines.push(`model: ${copilotModel}`);

  if (argumentHint) {
    fmLines.push(`argument-hint: "${argumentHint}"`);
  }

  fmLines.push('---');

  const cleanBody = body.trim();
  return fmLines.join('\n') + '\n\n' + cleanBody + '\n';
}

/**
 * Transform AIWG rule to GitHub Copilot .instructions.md format.
 * Output: YAML frontmatter with name, description, applyTo + rule body.
 */
export function transformRule(srcPath, content, opts) {
  // Rules may have frontmatter or be plain markdown
  let frontmatter = '';
  let body = content;

  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (fmMatch) {
    frontmatter = fmMatch[1];
    body = fmMatch[2];
  }

  // Extract name from frontmatter or first heading
  let name = frontmatter && frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  if (!name) {
    const headingMatch = body.match(/^#\s+(.+)/m);
    name = headingMatch ? headingMatch[1].trim() : path.basename(srcPath, '.md');
  }

  // Extract description from frontmatter or first bold line
  let description = frontmatter && frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  if (!description) {
    const scopeMatch = body.match(/\*\*(?:Scope|Summary)\*\*:\s*(.+)/);
    description = scopeMatch ? scopeMatch[1].trim() : name;
  }

  // Derive applyTo from rule content or filename
  const applyTo = deriveApplyTo(srcPath, body);

  // Build instructions format
  const fmLines = [
    '---',
    `name: ${name}`,
    `description: ${description}`
  ];

  if (applyTo) {
    fmLines.push(`applyTo: '${applyTo}'`);
  }

  fmLines.push('---');

  const cleanBody = body.trim();
  return fmLines.join('\n') + '\n\n' + cleanBody + '\n';
}

/**
 * Derive applyTo glob patterns from rule content and filename.
 */
function deriveApplyTo(srcPath, body) {
  const filename = path.basename(srcPath).toLowerCase();
  const content = body.toLowerCase();

  // Security rules apply to code files
  if (filename.includes('security') || filename.includes('token') ||
      content.includes('vulnerability') || content.includes('owasp')) {
    return '**/*.{ts,js,mjs,cjs,py,go,java,rs}';
  }

  // Documentation rules apply to markdown
  if (filename.includes('diagram') || filename.includes('documentation') ||
      filename.includes('doc-') || content.includes('documentation artifact')) {
    return '**/*.md';
  }

  // Agent/deployment rules apply to agent definitions
  if (filename.includes('agent-deployment') || filename.includes('agent-')) {
    return '**/*.{md,yaml,yml}';
  }

  // Code style/implementation rules
  if (filename.includes('code') || filename.includes('implementation') ||
      filename.includes('test') || filename.includes('lint')) {
    return '**/*.{ts,js,mjs,cjs}';
  }

  // Default: apply to all files
  return '**/*';
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .github/agents/ as .agent.md files
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, { ...opts, fileExtension: '.agent.md', injectPlatform: true }, transformAgent);
}

/**
 * Deploy commands to .github/prompts/ as .prompt.md files
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, { ...opts, fileExtension: '.prompt.md' }, transformCommand);
}

/**
 * Deploy skills with kernel-vs-standard routing (#1212/#1216) plus
 * .agents/skills/ cross-agent compatibility (PUW-012 #1113).
 *   - kernel skills → .github/skills/         (platform-native, always-loaded)
 *   - standard      → .github/.aiwg/skills/   (index-discoverable)
 *   - cross-agent compatibility mirror is preserved at .agents/skills/.
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const standardDestDir = path.join(targetDir, paths.skills);
  const kernelDestDir = path.join(targetDir, kernelSkillsPath);
  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);

  // Cross-agent compatibility: .agents/skills/ — honors #1217 no-copy
  // default. Filter to kernel-only unless operator opts in via env var.
  const copyStandardSkills = opts?.copyStandardSkills === true;
  const crossAgentSkills = copyStandardSkills
    ? skillDirs
    : skillDirs.filter(d => isKernelSkill(d));
  if (crossAgentSkills.length > 0) {
    const crossAgentDir = path.join(targetDir, '.agents', 'skills');
    ensureDir(crossAgentDir, opts.dryRun);
    if (!opts.dryRun) {
      console.log(`Deploying cross-agent skills to ${path.relative(process.cwd(), crossAgentDir)}...`);
    } else {
      console.log(`[dry-run] Would deploy cross-agent skills to .agents/skills/`);
    }
    for (const skillDir of crossAgentSkills) {
      deploySkillDir(skillDir, crossAgentDir, opts);
    }
  }
}

/**
 * Deploy rules to .github/instructions/ as .instructions.md files
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, { ...opts, fileExtension: '.instructions.md' }, transformRule);
}

// ============================================================================
// copilot-instructions.md
// ============================================================================

/**
 * Create copilot-instructions.md from template
 */
export function createCopilotInstructions(target, srcRoot, dryRun) {
  const templatePath = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'templates', 'copilot', 'copilot-instructions.md.aiwg-template');
  const githubDir = path.join(target, '.github');
  const destPath = path.join(githubDir, 'copilot-instructions.md');

  if (!fs.existsSync(templatePath)) {
    console.warn(`Copilot instructions template not found at ${templatePath}`);
    return;
  }

  const template = fs.readFileSync(templatePath, 'utf8');

  // Ensure .github directory exists
  if (!dryRun && !fs.existsSync(githubDir)) {
    fs.mkdirSync(githubDir, { recursive: true });
  }

  if (fs.existsSync(destPath)) {
    const existing = fs.readFileSync(destPath, 'utf8');

    if (existing.includes('<!-- AIWG SDLC Framework Integration -->') ||
        existing.includes('## AIWG SDLC Framework')) {
      console.log('copilot-instructions.md already contains AIWG section, skipping');
      return;
    }

    const markerIndex = template.indexOf('<!-- AIWG SDLC Framework Integration -->');
    const aiwgSection = markerIndex !== -1 ? template.slice(markerIndex) : template;
    const combined = existing.trimEnd() + '\n\n---\n\n' + aiwgSection.trim() + '\n';

    if (dryRun) {
      console.log(`[dry-run] Would update existing copilot-instructions.md with AIWG section`);
    } else {
      fs.writeFileSync(destPath, combined, 'utf8');
      console.log('Updated copilot-instructions.md with AIWG SDLC framework section');
    }
  } else {
    if (dryRun) {
      console.log(`[dry-run] Would create copilot-instructions.md from template`);
    } else {
      fs.writeFileSync(destPath, template, 'utf8');
      console.log('Created copilot-instructions.md from template');
    }
  }
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);

  // Create copilot-instructions.md
  createCopilotInstructions(targetDir, opts.srcRoot, opts.dryRun);
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  switch (type) {
    case 'agent': return '.agent.md';
    case 'command': return '.prompt.md';
    case 'rule': return '.instructions.md';
    default: return '.md';
  }
}

// ============================================================================
// Main Deploy Function
// ============================================================================

export async function deploy(opts) {
  const {
    srcRoot,
    target,
    mode,
    deployCommands: shouldDeployCommands,
    deploySkills: shouldDeploySkills,
    deployRules: shouldDeployRules,
    commandsOnly,
    skillsOnly,
    rulesOnly,
    dryRun
  } = opts;

  console.log(`\n=== GitHub Copilot Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  const agentFiles = [];
  const commandFiles = [];
  const skillDirs = [];
  const ruleFiles = [];
  const normalizedMode = normalizeDeploymentMode(mode);

  // All addons (dynamically discovered)
  if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));

    if (shouldDeployCommands || commandsOnly) {
      commandFiles.push(...getAddonCommandFiles(srcRoot));
    }

    if (shouldDeploySkills || skillsOnly) {
      skillDirs.push(...getAddonSkillDirs(srcRoot));
  
    // Holistic post-deploy cleanup of stale AIWG-managed kernel
    // skills (renamed/removed sources). Uses the global kernel set
    // (computeAllKernelNames walks all source frameworks/addons),
    // not just this-call's skillDirs, because aiwg use invokes
    // deploy-agents.mjs multiple times.
    {
      const _kernelDestDir = path.isAbsolute(kernelSkillsPath)
        ? kernelSkillsPath
        : path.join(target, kernelSkillsPath);
      pruneStaleAiwgSkills(_kernelDestDir, computeAllKernelNames(srcRoot), opts);
    }
  }

    if (shouldDeployRules || rulesOnly) {
      ruleFiles.push(...getAddonRuleFiles(srcRoot));
    }
  }

  const frameworkArtifacts = collectFrameworkArtifacts(srcRoot, normalizedMode, {
    includeAgents: true,
    includeCommands: shouldDeployCommands || commandsOnly,
    includeSkills: shouldDeploySkills || skillsOnly,
    includeRules: shouldDeployRules || rulesOnly,
    recursiveCommands: true,
    consolidatedSdlcRules: true
  });
  agentFiles.push(...frameworkArtifacts.agents);
  const soulFiles = [...(frameworkArtifacts.souls || [])];
  commandFiles.push(...frameworkArtifacts.commands);
  skillDirs.push(...frameworkArtifacts.skills);
  ruleFiles.push(...frameworkArtifacts.rules);

  // Deploy
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nDeploying ${agentFiles.length} agents (.agent.md format)...`);
    deployAgents(agentFiles, target, opts);

    // Deploy soul companion files alongside agents
    if (soulFiles.length > 0) {
      const destDir = path.join(target, paths.agents);
      console.log(`\nDeploying ${soulFiles.length} soul files...`);
      deploySoulCompanions(soulFiles, destDir, opts);
    }
  }

  // Filter commands that collide with skills (skills take precedence)
  const filteredCommands = (shouldDeploySkills || skillsOnly)
    ? filterCommandsAgainstSkills(commandFiles, skillDirs)
    : commandFiles;

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${filteredCommands.length} commands (.prompt.md format)...`);
    deployCommands(filteredCommands, target, opts);
  }

  if (shouldDeploySkills || skillsOnly) {
    console.log(`\nDeploying ${skillDirs.length} skills...`);
    deploySkills(skillDirs, target, opts);
  }

  if (shouldDeployRules || rulesOnly) {
    console.log(`\nDeploying ${ruleFiles.length} rules...`);
    deployRules(ruleFiles, target, opts);
  }

  await postDeploy(target, opts);

  console.log('\n=== Copilot deployment complete ===\n');
}

// ============================================================================
// Default Export
// ============================================================================

export default {
  name,
  aliases,
  paths,
  kernelSkillsPath,
  support,
  capabilities,
  transformAgent,
  transformCommand,
  transformRule,
  mapModel,
  getTools,
  deployAgents,
  deployCommands,
  deploySkills,
  deployRules,
  createCopilotInstructions,
  postDeploy,
  getFileExtension,
  deploy
};
