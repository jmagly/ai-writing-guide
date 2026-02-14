/**
 * GitHub Copilot Provider
 *
 * Deploys agents in GitHub Copilot Custom Agent YAML format.
 * Commands are converted to agents since Copilot doesn't have separate commands.
 *
 * Deployment paths:
 *   - Agents: .github/agents/
 *   - Commands: .github/agents/ (as agents)
 *   - Skills: .github/skills/
 *   - Rules: .github/copilot-rules/
 *
 * Special features:
 *   - YAML format output (.yaml extension)
 *   - Temperature and max_tokens per category
 *   - Tool mapping to Copilot equivalents
 *   - Creates copilot-instructions.md
 */

import fs from 'fs';
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
  getRulesIndexPath,
  cleanupOldRuleFiles
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'copilot';
export const aliases = [];

export const paths = {
  agents: '.github/agents/',
  commands: '.github/agents/',  // Commands become agents
  skills: '.github/skills/',
  rules: '.github/copilot-rules/'
};

export const support = {
  agents: 'native',
  commands: 'conventional',
  skills: 'conventional',
  rules: 'conventional'
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: false,
  yamlFormat: true
};

// ============================================================================
// Model Mapping
// ============================================================================

/**
 * Map model shorthand to GitHub Copilot format (GPT models)
 */
export function mapModel(originalModel, modelCfg, modelsConfig) {
  const copilotModels = {
    'opus': 'gpt-4',
    'sonnet': 'gpt-4',
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
 * Get Copilot tools based on category and original tools
 */
export function getTools(category, toolsString) {
  // Map AIWG tools to GitHub Copilot tools
  const toolMap = {
    'Read': 'search',
    'Write': 'createFile',
    'MultiEdit': 'editFiles',
    'Bash': 'runInTerminal',
    'WebFetch': 'fetch',
    'Glob': 'search',
    'Grep': 'search',
    'Task': 'runSubagent'
  };

  // Default tools by category
  const categoryDefaults = {
    analysis: ['search', 'fetch', 'githubRepo', 'problems'],
    documentation: ['search', 'createFile', 'editFiles', 'fetch'],
    planning: ['search', 'fetch', 'githubRepo', 'todos'],
    implementation: ['createFile', 'createDirectory', 'editFiles', 'deleteFile', 'search', 'runInTerminal', 'fetch', 'runSubagent', 'todos', 'problems', 'changes']
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
      const mapped = toolMap[tool];
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
 * Transform AIWG agent to GitHub Copilot Custom Agent YAML format
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

  // Temperature based on category
  const temperature = category === 'analysis' ? 0.2 : category === 'documentation' ? 0.4 : 0.3;
  const maxTokens = category === 'implementation' ? 8000 : 4000;

  // Generate Copilot agent YAML
  let copilotYaml = `name: ${name || 'aiwg-agent'}
description: ${description || 'AIWG SDLC agent'}
model:
  name: ${copilotModel}
  temperature: ${temperature}
  max_tokens: ${maxTokens}`;

  // Add tools if applicable
  if (copilotTools.length > 0) {
    copilotYaml += `\ntools: ${JSON.stringify(copilotTools)}`;
  }

  // Add instructions from body
  const cleanBody = body.trim();
  if (cleanBody) {
    const escapedBody = cleanBody.replace(/\\/g, '\\\\');
    copilotYaml += `\ninstructions: |\n${escapedBody.split('\n').map(line => '  ' + line).join('\n')}`;
  }

  return copilotYaml;
}

/**
 * Transform AIWG command to GitHub Copilot agent format
 */
export function transformCommand(srcPath, content, opts) {
  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    // No frontmatter, create simple agent format
    const firstLine = content.split('\n')[0];
    const description = firstLine.replace(/^#\s*/, '').trim() || 'AIWG command';
    const name = toKebabCase(description);

    return `name: ${name}
description: ${description}
model:
  name: gpt-4
  temperature: 0.3
  max_tokens: 4000
instructions: |
${content.split('\n').map(line => '  ' + line).join('\n')}`;
  }

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const name = toKebabCase(description || 'aiwg-command');

  // Build Copilot command as simple agent
  return `name: ${name}
description: ${description || 'AIWG command'}
model:
  name: gpt-4
  temperature: 0.3
  max_tokens: 4000
instructions: |
${body.trim().split('\n').map(line => '  ' + line).join('\n')}`;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .github/agents/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, { ...opts, fileExtension: '.yaml' }, transformAgent);
}

/**
 * Deploy commands to .github/agents/ (as agents)
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, { ...opts, fileExtension: '.yaml' }, transformCommand);
}

/**
 * Deploy skills to .github/skills/
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const destDir = path.join(targetDir, paths.skills);
  ensureDir(destDir, opts.dryRun);
  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, destDir, opts);
  }
}

/**
 * Deploy rules to .github/copilot-rules/
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformAgent);
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
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);

  // Create copilot-instructions.md
  createCopilotInstructions(targetDir, opts.srcRoot, opts.dryRun);
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  return '.yaml';
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

  // All addons (dynamically discovered)
  if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));

    if (shouldDeployCommands || commandsOnly) {
      commandFiles.push(...getAddonCommandFiles(srcRoot));
    }

    if (shouldDeploySkills || skillsOnly) {
      skillDirs.push(...getAddonSkillDirs(srcRoot));
    }

    if (shouldDeployRules || rulesOnly) {
      ruleFiles.push(...getAddonRuleFiles(srcRoot));
    }
  }

  // Frameworks
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    agentFiles.push(...listMdFiles(sdlcAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const sdlcCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
      commandFiles.push(...listMdFilesRecursive(sdlcCommandsDir));
    }

    if (shouldDeploySkills || skillsOnly) {
      const sdlcSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'skills');
      skillDirs.push(...listSkillDirs(sdlcSkillsDir));
    }

    if (shouldDeployRules || rulesOnly) {
      // Use consolidated RULES-INDEX.md instead of individual files
      const indexPath = getRulesIndexPath(srcRoot);
      if (indexPath) {
        ruleFiles.push(indexPath);
      } else {
        // Fallback: deploy individual files if index not found
        const sdlcRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules');
        ruleFiles.push(...listMdFiles(sdlcRulesDir));
      }
    }
  }

  if (mode === 'marketing' || mode === 'all') {
    const marketingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
    agentFiles.push(...listMdFiles(marketingAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const marketingCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
      commandFiles.push(...listMdFilesRecursive(marketingCommandsDir));
    }

    if (shouldDeploySkills || skillsOnly) {
      const marketingSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'skills');
      skillDirs.push(...listSkillDirs(marketingSkillsDir));
    }

    if (shouldDeployRules || rulesOnly) {
      const marketingRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'rules');
      ruleFiles.push(...listMdFiles(marketingRulesDir));
    }
  }

  // Media Curator framework
  if (mode === 'media-curator' || mode === 'all') {
    const curatorAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-curator', 'agents');
    if (fs.existsSync(curatorAgentsDir)) {
      agentFiles.push(...listMdFiles(curatorAgentsDir));
    }

    if (shouldDeployCommands || commandsOnly) {
      const curatorCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-curator', 'commands');
      if (fs.existsSync(curatorCommandsDir)) {
        commandFiles.push(...listMdFilesRecursive(curatorCommandsDir));
      }
    }

    if (shouldDeploySkills || skillsOnly) {
      const curatorSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-curator', 'skills');
      if (fs.existsSync(curatorSkillsDir)) {
        skillDirs.push(...listSkillDirs(curatorSkillsDir));
      }
    }

    if (shouldDeployRules || rulesOnly) {
      const curatorRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-curator', 'rules');
      if (fs.existsSync(curatorRulesDir)) {
        ruleFiles.push(...listMdFiles(curatorRulesDir));
      }
    }
  }

  // Research framework
  if (mode === 'research' || mode === 'all') {
    const researchAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'research-complete', 'agents');
    if (fs.existsSync(researchAgentsDir)) {
      agentFiles.push(...listMdFiles(researchAgentsDir));
    }

    if (shouldDeployCommands || commandsOnly) {
      const researchCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'research-complete', 'commands');
      if (fs.existsSync(researchCommandsDir)) {
        commandFiles.push(...listMdFilesRecursive(researchCommandsDir));
      }
    }

    if (shouldDeploySkills || skillsOnly) {
      const researchSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'research-complete', 'skills');
      if (fs.existsSync(researchSkillsDir)) {
        skillDirs.push(...listSkillDirs(researchSkillsDir));
      }
    }

    if (shouldDeployRules || rulesOnly) {
      const researchRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'research-complete', 'rules');
      if (fs.existsSync(researchRulesDir)) {
        ruleFiles.push(...listMdFiles(researchRulesDir));
      }
    }
  }

  // Deploy
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nDeploying ${agentFiles.length} agents (YAML format)...`);
    deployAgents(agentFiles, target, opts);
  }

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${commandFiles.length} commands as agents (YAML format)...`);
    deployCommands(commandFiles, target, opts);
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
  support,
  capabilities,
  transformAgent,
  transformCommand,
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
