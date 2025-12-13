/**
 * OpenCode Provider
 *
 * Deploys agents and commands in OpenCode format with mode, temperature,
 * tools, and permission configurations based on agent category.
 *
 * Deployment paths:
 *   - Agents: .opencode/agent/
 *   - Commands: .opencode/command/
 *
 * Special features:
 *   - Category-based configuration (analysis, documentation, planning, implementation)
 *   - Permission system with bash command whitelist
 *   - Temperature and maxSteps per category
 */

import fs from 'fs';
import path from 'path';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  deployFiles,
  inferAgentCategory,
  createAgentsMdFromTemplate,
  initializeFrameworkWorkspace
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'opencode';
export const aliases = [];

export const paths = {
  agents: '.opencode/agent/',
  commands: '.opencode/command/',
  skills: null,
  rules: null
};

export const capabilities = {
  skills: false,
  rules: false,
  aggregatedOutput: false,
  yamlFormat: false
};

// ============================================================================
// Model Mapping
// ============================================================================

/**
 * Map model shorthand to OpenCode format (full provider/model path)
 */
export function mapModel(originalModel, modelCfg, modelsConfig) {
  const opencodeModels = {
    'opus': 'anthropic/claude-opus-4-20250514',
    'sonnet': 'anthropic/claude-sonnet-4-20250514',
    'haiku': 'anthropic/claude-haiku-4-20250514'
  };

  // Handle override models first
  if (modelCfg.reasoningModel || modelCfg.codingModel || modelCfg.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || opencodeModels.opus;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || opencodeModels.haiku;
    return modelCfg.codingModel || opencodeModels.sonnet;
  }

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  for (const [key, value] of Object.entries(opencodeModels)) {
    if (clean.includes(key)) return value;
  }

  return opencodeModels.sonnet; // default
}

// ============================================================================
// Category Configuration
// ============================================================================

/**
 * Get OpenCode agent configuration based on category
 */
export function getAgentConfig(category, name) {
  const configs = {
    analysis: {
      tools: { write: false, edit: false, patch: false, bash: true, webfetch: true },
      permission: {
        bash: {
          'git *': 'allow',
          'npm audit': 'allow',
          'npm test': 'allow',
          '*': 'ask'
        }
      },
      temperature: 0.2,
      maxSteps: 30
    },
    documentation: {
      tools: { bash: false, patch: false },
      permission: {},
      temperature: 0.4,
      maxSteps: 50
    },
    planning: {
      tools: { write: false, edit: false, bash: false, patch: false, webfetch: true },
      permission: {},
      temperature: 0.3,
      maxSteps: 40
    },
    implementation: {
      tools: {},  // All tools enabled by default
      permission: {
        bash: {
          'aiwg *': 'allow',
          'git status': 'allow',
          'git diff': 'allow',
          'git log*': 'allow',
          'npm test': 'allow',
          'npm run *': 'allow',
          'git push': 'ask',
          'rm -rf': 'deny',
          '*': 'ask'
        }
      },
      temperature: 0.3,
      maxSteps: 100
    }
  };

  return configs[category] || configs.implementation;
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform AIWG agent to OpenCode agent format
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
  const categoryMatch = frontmatter.match(/category:\s*(.+)/)?.[1]?.trim();
  const orchestrationMatch = frontmatter.match(/orchestration:\s*(.+)/)?.[1]?.trim();

  // Map model to OpenCode format
  const opencodeModel = mapModel(modelMatch, opts, modelsConfig);

  // Determine agent category
  const category = categoryMatch || inferAgentCategory(name, body);

  // Get configuration based on category
  const { tools, permission, temperature, maxSteps } = getAgentConfig(category, name);

  // Mode: primary for orchestration agents, subagent for others
  const mode = orchestrationMatch === 'true' ? 'primary' : 'subagent';

  // Generate OpenCode agent frontmatter
  let opencodeFrontmatter = `---
description: ${description || 'AIWG SDLC agent'}
mode: ${mode}
model: ${opencodeModel}
temperature: ${temperature}
maxSteps: ${maxSteps}`;

  // Add tools configuration
  if (Object.keys(tools).length > 0) {
    opencodeFrontmatter += `\ntools:`;
    for (const [tool, enabled] of Object.entries(tools)) {
      opencodeFrontmatter += `\n  ${tool}: ${enabled}`;
    }
  }

  // Add permission configuration
  if (Object.keys(permission).length > 0) {
    opencodeFrontmatter += `\npermission:`;
    for (const [perm, value] of Object.entries(permission)) {
      if (typeof value === 'object') {
        opencodeFrontmatter += `\n  ${perm}:`;
        for (const [cmd, action] of Object.entries(value)) {
          opencodeFrontmatter += `\n    "${cmd}": ${action}`;
        }
      } else {
        opencodeFrontmatter += `\n  ${perm}: ${value}`;
      }
    }
  }

  opencodeFrontmatter += `\n---`;

  return `${opencodeFrontmatter}\n\n${body.trim()}`;
}

/**
 * Transform AIWG command to OpenCode command format
 */
export function transformCommand(srcPath, content, opts) {
  const { modelsConfig = {} } = opts;

  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) {
    // No frontmatter, add minimal OpenCode frontmatter
    const firstLine = content.split('\n')[0];
    const description = firstLine.replace(/^#\s*/, '').trim() || 'AIWG command';
    return `---\ndescription: ${description}\nsubtask: true\n---\n\n${content}`;
  }

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const agentMatch = frontmatter.match(/agent:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();

  // Build OpenCode command frontmatter
  let opencodeFrontmatter = `---\ndescription: ${description || 'AIWG command'}`;

  if (agentMatch) {
    opencodeFrontmatter += `\nagent: ${agentMatch}`;
  }

  if (modelMatch) {
    const opencodeModel = mapModel(modelMatch, opts, modelsConfig);
    opencodeFrontmatter += `\nmodel: ${opencodeModel}`;
  }

  opencodeFrontmatter += `\nsubtask: true\n---`;

  return `${opencodeFrontmatter}\n\n${body.trim()}`;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .opencode/agent/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands to .opencode/command/
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

// ============================================================================
// AGENTS.md
// ============================================================================

export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'opencode/AGENTS.md.aiwg-template', dryRun);
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);

  if (opts.createAgentsMd) {
    createAgentsMd(targetDir, opts.srcRoot, opts.dryRun);
  }
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  return '.md';
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
    dryRun,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== OpenCode Provider ===`);
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
    console.log(`\nDeploying ${agentFiles.length} agents...`);
    deployAgents(agentFiles, target, opts);
  }

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${commandFiles.length} commands...`);
    deployCommands(commandFiles, target, opts);
  }

  await postDeploy(target, { ...opts, createAgentsMd: shouldCreateAgentsMd });

  console.log('\n=== OpenCode deployment complete ===\n');
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
  getAgentConfig,
  deployAgents,
  deployCommands,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
