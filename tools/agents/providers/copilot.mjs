/**
 * GitHub Copilot Provider
 *
 * Deploys agents in GitHub Copilot Custom Agent YAML format.
 * Commands are converted to agents since Copilot doesn't have separate commands.
 *
 * Deployment paths:
 *   - Agents: .github/agents/
 *   - Commands: .github/agents/ (as agents)
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
  initializeFrameworkWorkspace
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'copilot';
export const aliases = [];

export const paths = {
  agents: '.github/agents/',
  commands: '.github/agents/',  // Commands become agents
  skills: null,
  rules: null
};

export const capabilities = {
  skills: false,
  rules: false,
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
  ensureDir(destDir);
  return deployFiles(agentFiles, destDir, { ...opts, fileExtension: '.yaml' }, transformAgent);
}

/**
 * Deploy commands to .github/agents/ (as agents)
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir);
  return deployFiles(commandFiles, destDir, { ...opts, fileExtension: '.yaml' }, transformCommand);
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
    commandsOnly,
    dryRun
  } = opts;

  console.log(`\n=== GitHub Copilot Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  const agentFiles = [];
  const commandFiles = [];

  // Collect files based on mode
  if (mode === 'general' || mode === 'writing' || mode === 'both' || mode === 'all') {
    const writingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'agents');
    agentFiles.push(...listMdFiles(writingAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const writingCommandsDir = path.join(srcRoot, 'agentic', 'code', 'addons', 'writing-quality', 'commands');
      commandFiles.push(...listMdFiles(writingCommandsDir));
    }
  }

  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    agentFiles.push(...listMdFiles(sdlcAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const sdlcCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
      commandFiles.push(...listMdFilesRecursive(sdlcCommandsDir));
    }
  }

  if (mode === 'marketing' || mode === 'all') {
    const marketingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
    agentFiles.push(...listMdFiles(marketingAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const marketingCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
      commandFiles.push(...listMdFilesRecursive(marketingCommandsDir));
    }
  }

  if (mode === 'sdlc' || mode === 'all') {
    const utilsAgentsDir = path.join(srcRoot, 'agentic', 'code', 'addons', 'aiwg-utils', 'agents');
    agentFiles.push(...listMdFiles(utilsAgentsDir));

    if (shouldDeployCommands || commandsOnly) {
      const utilsCommandsDir = path.join(srcRoot, 'agentic', 'code', 'addons', 'aiwg-utils', 'commands');
      commandFiles.push(...listMdFiles(utilsCommandsDir));
    }
  }

  // Deploy
  if (!commandsOnly) {
    console.log(`\nDeploying ${agentFiles.length} agents (YAML format)...`);
    deployAgents(agentFiles, target, opts);
  }

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${commandFiles.length} commands as agents (YAML format)...`);
    deployCommands(commandFiles, target, opts);
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
  capabilities,
  transformAgent,
  transformCommand,
  mapModel,
  getTools,
  deployAgents,
  deployCommands,
  createCopilotInstructions,
  postDeploy,
  getFileExtension,
  deploy
};
