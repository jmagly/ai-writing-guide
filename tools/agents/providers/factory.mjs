/**
 * Factory AI Provider
 *
 * Deploys agents as "droids" in Factory AI format. Factory uses a different
 * frontmatter structure with kebab-case names and mapped tools.
 *
 * Deployment paths:
 *   - Agents: .factory/droids/
 *   - Commands: .factory/commands/
 *   - Skills: .factory/skills/
 *   - Rules: .factory/rules/
 *
 * Special features:
 *   - Transforms agent names to kebab-case
 *   - Maps Claude tools to Factory equivalents
 *   - Enables custom droids in ~/.factory/settings.json
 *   - Creates/updates AGENTS.md from template
 */

import fs from 'fs';
import path from 'path';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  writeFile,
  deployFiles,
  toKebabCase,
  stripJsonComments,
  createAgentsMdFromTemplate,
  initializeFrameworkWorkspace,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonRuleFiles,
  getAddonSkillDirs,
  listSkillDirs,
  deploySkillDir,
  normalizeDeploymentMode,
  collectFrameworkArtifacts,
  cleanupOldRuleFiles
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'factory';
export const aliases = [];

export const paths = {
  agents: '.factory/droids/',
  commands: '.factory/commands/',
  skills: '.factory/skills/',
  rules: '.factory/rules/'
};

export const support = {
  agents: 'native',
  commands: 'native',
  skills: 'conventional',
  rules: 'conventional'
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: false,
  yamlFormat: false
};

// ============================================================================
// Tool Mapping
// ============================================================================

/**
 * Map Claude Code tools to Factory AI equivalents
 */
export function mapToolsToFactory(toolsString, agentName) {
  // Default comprehensive tool set if no tools specified
  if (!toolsString) {
    return ["Read", "LS", "Grep", "Glob", "Edit", "Create", "Execute", "Task", "TodoWrite", "WebSearch", "FetchUrl"];
  }

  // Parse tools (comma-separated or array format)
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

  // Tool mapping: Claude Code → Factory
  const toolMap = {
    'Bash': 'Execute',
    'Write': 'Create',  // Will add Edit too
    'WebFetch': 'FetchUrl',
    'Read': 'Read',
    'Grep': 'Grep',
    'Glob': 'Glob',
    'LS': 'LS'
  };

  const factoryTools = new Set();

  // Map original tools
  for (const tool of originalTools) {
    // Special handling for MultiEdit - Factory doesn't have it
    if (tool === 'MultiEdit') {
      factoryTools.add('Edit');
      continue;
    }

    const mapped = toolMap[tool] || tool;
    factoryTools.add(mapped);

    // If Write is present, add both Create and Edit
    if (tool === 'Write') {
      factoryTools.add('Create');
      factoryTools.add('Edit');
    }
  }

  // Orchestration agents need Task tool for invoking subagents
  const orchestrationAgents = [
    'executive-orchestrator',
    'intake-coordinator',
    'documentation-synthesizer',
    'project-manager',
    'deployment-manager',
    'test-architect',
    'architecture-designer',
    'requirements-analyst',
    'security-architect',
    'technical-writer'
  ];

  const normalizedName = (agentName || '').toLowerCase().replace(/\s+/g, '-');
  if (orchestrationAgents.some(oa => normalizedName.includes(oa))) {
    factoryTools.add('Task');
    factoryTools.add('TodoWrite');
  }

  // Add web tools if WebFetch was present
  if (originalTools.includes('WebFetch')) {
    factoryTools.add('FetchUrl');
    factoryTools.add('WebSearch');
  }

  // Convert to sorted array for consistency
  return Array.from(factoryTools).sort();
}

// ============================================================================
// Model Mapping
// ============================================================================

// Default Factory models (fallback if config not loaded)
const DEFAULT_FACTORY_MODELS = {
  reasoning: 'anthropic/claude-opus-4-20250514',
  coding: 'anthropic/claude-sonnet-4-20250514',
  efficiency: 'anthropic/claude-haiku-4-20250514'
};

/**
 * Map model shorthand to Factory AI format
 */
export function mapModel(originalModel, modelCfg, modelsConfig) {
  // Safe access to nested config with fallbacks
  const factoryConfig = modelsConfig?.factory || {};
  const defaultReasoning = factoryConfig.reasoning?.model || DEFAULT_FACTORY_MODELS.reasoning;
  const defaultCoding = factoryConfig.coding?.model || DEFAULT_FACTORY_MODELS.coding;
  const defaultEfficiency = factoryConfig.efficiency?.model || DEFAULT_FACTORY_MODELS.efficiency;

  // Handle override models first
  if (modelCfg?.reasoningModel || modelCfg?.codingModel || modelCfg?.efficiencyModel) {
    const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');
    if (/opus/i.test(clean)) return modelCfg.reasoningModel || defaultReasoning;
    if (/haiku/i.test(clean)) return modelCfg.efficiencyModel || defaultEfficiency;
    return modelCfg.codingModel || defaultCoding;
  }

  // Use shorthand mappings from config
  const factoryModels = modelsConfig?.shorthand || {
    'opus': defaultReasoning,
    'sonnet': defaultCoding,
    'haiku': defaultEfficiency,
    'inherit': 'inherit'
  };

  const clean = (originalModel || 'sonnet').toLowerCase().replace(/['"]/g, '');

  // Match to Factory model
  for (const [key, value] of Object.entries(factoryModels)) {
    if (clean.includes(key)) return value;
  }

  return defaultCoding; // default
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform AIWG agent to Factory droid format
 */
export function transformAgent(srcPath, content, opts) {
  const { modelsConfig = {} } = opts;

  // Parse existing frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const rawName = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();

  // Convert name to kebab-case for Factory compatibility
  const name = toKebabCase(rawName);

  // Map model to Factory format
  const factoryModel = mapModel(modelMatch, opts, modelsConfig);

  // Map tools to Factory equivalents
  const factoryTools = mapToolsToFactory(toolsMatch, name);

  // Generate Factory droid frontmatter
  const factoryFrontmatter = `---
name: ${name}
description: ${description || 'AIWG SDLC agent'}
model: ${factoryModel}
tools: ${JSON.stringify(factoryTools)}
---`;

  return `${factoryFrontmatter}\n\n${body.trim()}`;
}

/**
 * Transform command for Factory
 * Commands use similar format to agents
 */
export function transformCommand(srcPath, content, opts) {
  // Commands are simpler - just basic frontmatter transformation
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const rawName = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const args = frontmatter.match(/args:\s*(.+)/)?.[1]?.trim();

  // Convert name to kebab-case
  const name = toKebabCase(rawName) || path.basename(srcPath, '.md');

  // Build Factory command frontmatter
  let factoryFrontmatter = `---
name: ${name}
description: ${description || 'AIWG command'}`;

  if (args) {
    factoryFrontmatter += `\nargs: ${args}`;
  }

  factoryFrontmatter += '\n---';

  return `${factoryFrontmatter}\n\n${body.trim()}`;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to .factory/droids/
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands to .factory/commands/
 */
export function deployCommands(commandFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

/**
 * Deploy skills to .factory/skills/
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const destDir = path.join(targetDir, paths.skills);
  ensureDir(destDir, opts.dryRun);
  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, destDir, opts);
  }
}

/**
 * Deploy rules to .factory/rules/
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformAgent);
}

// ============================================================================
// AGENTS.md
// ============================================================================

/**
 * Create/update AGENTS.md from Factory template
 */
export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'factory/AGENTS.md.aiwg-template', dryRun);
}

// ============================================================================
// Factory Settings
// ============================================================================

/**
 * Enable custom droids in Factory settings.json
 */
export function enableFactoryCustomDroids(dryRun) {
  const homeDir = process.env.HOME || process.env.USERPROFILE;
  if (!homeDir) {
    console.warn('Could not determine home directory, skipping Factory settings configuration');
    return;
  }

  const settingsDir = path.join(homeDir, '.factory');
  const settingsPath = path.join(settingsDir, 'settings.json');

  let settings = {};
  let originalContent = '';
  let hasExistingFile = false;

  // Read existing settings if present
  if (fs.existsSync(settingsPath)) {
    hasExistingFile = true;
    try {
      originalContent = fs.readFileSync(settingsPath, 'utf8');
      // Strip JSONC comments before parsing
      const jsonContent = stripJsonComments(originalContent);
      settings = JSON.parse(jsonContent);
    } catch (err) {
      console.warn(`Warning: Could not parse existing Factory settings.json: ${err.message}`);
      console.warn('Will add enableCustomDroids setting using text manipulation to preserve file...');

      // Try to add the setting via text manipulation
      if (originalContent.includes('"enableCustomDroids"')) {
        if (originalContent.includes('"enableCustomDroids": true') ||
            originalContent.includes('"enableCustomDroids":true')) {
          console.log('Factory Custom Droids already enabled in settings');
          return;
        }
        // Replace false with true
        if (!dryRun) {
          const updatedContent = originalContent.replace(
            /"enableCustomDroids"\s*:\s*false/,
            '"enableCustomDroids": true'
          );
          fs.writeFileSync(settingsPath, updatedContent, 'utf8');
          console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
        } else {
          console.log(`[dry-run] Would enable Custom Droids in ${settingsPath}`);
        }
        return;
      }

      // Setting doesn't exist, add it after the first {
      if (!dryRun) {
        const insertPoint = originalContent.indexOf('{') + 1;
        const updatedContent =
          originalContent.slice(0, insertPoint) +
          '\n  "enableCustomDroids": true,' +
          originalContent.slice(insertPoint);
        fs.writeFileSync(settingsPath, updatedContent, 'utf8');
        console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
      } else {
        console.log(`[dry-run] Would enable Custom Droids in ${settingsPath}`);
      }
      return;
    }
  }

  // Check if Custom Droids already enabled
  if (settings.enableCustomDroids === true) {
    console.log('Factory Custom Droids already enabled in settings');
    return;
  }

  // Enable Custom Droids
  settings.enableCustomDroids = true;

  if (dryRun) {
    console.log(`[dry-run] Would enable Custom Droids in ${settingsPath}`);
    console.log(`[dry-run] New setting: enableCustomDroids: true`);
  } else {
    // Ensure settings directory exists
    if (!fs.existsSync(settingsDir)) {
      fs.mkdirSync(settingsDir, { recursive: true });
    }

    if (hasExistingFile && originalContent.includes('//')) {
      // File has comments - use text manipulation to preserve them
      if (originalContent.includes('"enableCustomDroids"')) {
        const updatedContent = originalContent.replace(
          /"enableCustomDroids"\s*:\s*false/,
          '"enableCustomDroids": true'
        );
        fs.writeFileSync(settingsPath, updatedContent, 'utf8');
      } else {
        const insertPoint = originalContent.indexOf('{') + 1;
        const updatedContent =
          originalContent.slice(0, insertPoint) +
          '\n  "enableCustomDroids": true,' +
          originalContent.slice(insertPoint);
        fs.writeFileSync(settingsPath, updatedContent, 'utf8');
      }
    } else {
      // No comments or new file - safe to use JSON.stringify
      fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');
    }
    console.log(`Enabled Custom Droids in Factory settings: ${settingsPath}`);
    console.log('Note: You may need to restart droid for this setting to take effect');
  }
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  // Initialize framework workspace structure
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);

  // Enable custom droids in Factory settings
  enableFactoryCustomDroids(opts.dryRun);

  // Create/update AGENTS.md if requested
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

/**
 * Main deployment function for Factory provider
 */
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
    dryRun,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== Factory AI Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Collect source files based on mode
  const agentFiles = [];
  const commandFiles = [];
  const ruleFiles = [];
  const skillDirs = [];
  const normalizedMode = normalizeDeploymentMode(mode);

  // All addons (dynamically discovered)
  if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));

    if (shouldDeployCommands || commandsOnly) {
      commandFiles.push(...getAddonCommandFiles(srcRoot));
    }

    if (shouldDeployRules || rulesOnly) {
      ruleFiles.push(...getAddonRuleFiles(srcRoot));
    }

    if (shouldDeploySkills || skillsOnly) {
      skillDirs.push(...getAddonSkillDirs(srcRoot));
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
  commandFiles.push(...frameworkArtifacts.commands);
  skillDirs.push(...frameworkArtifacts.skills);
  ruleFiles.push(...frameworkArtifacts.rules);

  // Deploy based on flags
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nDeploying ${agentFiles.length} agents as droids...`);
    deployAgents(agentFiles, target, opts);
  }

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${commandFiles.length} commands...`);
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

  // Post-deployment
  await postDeploy(target, { ...opts, createAgentsMd: shouldCreateAgentsMd });

  console.log('\n=== Factory deployment complete ===\n');
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
  mapToolsToFactory,
  deployAgents,
  deployCommands,
  deploySkills,
  deployRules,
  createAgentsMd,
  enableFactoryCustomDroids,
  postDeploy,
  getFileExtension,
  deploy
};
