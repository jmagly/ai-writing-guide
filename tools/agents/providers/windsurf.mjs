/**
 * Windsurf Provider (EXPERIMENTAL)
 *
 * Deploys agents to Windsurf format with aggregated AGENTS.md and .windsurfrules.
 *
 * Deployment paths:
 *   - Output: AGENTS.md (aggregated agents)
 *   - Output: .windsurfrules (orchestration context)
 *   - Workflows: .windsurf/workflows/ (commands as workflows)
 *   - Skills: .windsurf/skills/ (discrete skill directories)
 *   - Rules: .windsurf/rules/ (discrete rule files)
 *
 * Special features:
 *   - Aggregated output (all agents in single AGENTS.md)
 *   - Plain markdown format (no YAML frontmatter)
 *   - Capabilities tags for tools
 *   - Workflow format for commands
 *   - Conventional skills and rules deployment
 *   - EXPERIMENTAL: Untested, may require adjustments
 */

import fs from 'fs';
import path from 'path';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  initializeFrameworkWorkspace,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonRuleFiles,
  getAddonSkillDirs,
  listSkillDirs,
  deploySkillDir,
  deployFiles
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'windsurf';
export const aliases = [];

export const paths = {
  agents: '.windsurf/agents/',  // Discrete mirrors alongside AGENTS.md
  commands: '.windsurf/workflows/',
  skills: '.windsurf/skills/',
  rules: '.windsurf/rules/'
};

export const support = {
  agents: 'aggregated',      // Agents aggregated into AGENTS.md
  commands: 'native',        // Native workflow/commands support
  skills: 'conventional',    // Conventional discrete deployment
  rules: 'conventional'      // Conventional discrete deployment
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: true,  // All content in single file
  yamlFormat: false
};

// ============================================================================
// Warning Display
// ============================================================================

function displayWarning() {
  console.log('\n' + '='.repeat(70));
  console.log('[EXPERIMENTAL] Windsurf provider support is experimental and untested.');
  console.log('Please report issues: https://github.com/jmagly/aiwg/issues');
  console.log('='.repeat(70) + '\n');
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Transform agent content to Windsurf format (plain markdown, no YAML frontmatter)
 */
export function transformAgent(srcPath, content, opts) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract metadata
  const name = frontmatter.match(/name:\s*(.+)/)?.[1]?.trim();
  const description = frontmatter.match(/description:\s*(.+)/)?.[1]?.trim();
  const toolsMatch = frontmatter.match(/tools:\s*(.+)/)?.[1]?.trim();
  const modelMatch = frontmatter.match(/model:\s*(.+)/)?.[1]?.trim();

  // Build Windsurf-compatible format (plain markdown, no YAML)
  const lines = [];
  lines.push(`### ${name}`);
  lines.push('');
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }

  // Parse and include tools as capabilities
  if (toolsMatch) {
    let tools;
    try {
      tools = toolsMatch.startsWith('[')
        ? JSON.parse(toolsMatch)
        : toolsMatch.split(/[,\s]+/).filter(Boolean);
    } catch (e) {
      tools = toolsMatch.split(/[,\s]+/).filter(Boolean);
    }

    if (tools.length > 0) {
      lines.push('<capabilities>');
      tools.forEach(t => lines.push(`- ${t.trim()}`));
      lines.push('</capabilities>');
      lines.push('');
    }
  }

  if (modelMatch) {
    lines.push(`**Model**: ${modelMatch}`);
    lines.push('');
  }

  lines.push(body.trim());
  return lines.join('\n');
}

/**
 * Transform command content to Windsurf workflow format
 */
export function transformCommand(srcPath, content, opts) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!fmMatch) return content;

  const [, frontmatter, body] = fmMatch;

  // Extract name and description from frontmatter
  const nameMatch = frontmatter.match(/name:\s*(.+)/);
  const descMatch = frontmatter.match(/description:\s*(.+)/);

  const name = nameMatch ? nameMatch[1].trim() : 'Workflow';
  const description = descMatch ? descMatch[1].trim() : '';

  // Build workflow format
  const lines = [];
  lines.push(`# ${name}`);
  lines.push('');
  if (description) {
    lines.push(`> ${description}`);
    lines.push('');
  }
  lines.push('## Instructions');
  lines.push('');
  lines.push(body.trim());

  return lines.join('\n');
}

// ============================================================================
// Model Mapping (not applicable for Windsurf)
// ============================================================================

export function mapModel(shorthand, modelCfg, modelsConfig) {
  return shorthand;
}

// ============================================================================
// AGENTS.md Generation
// ============================================================================

/**
 * Generate AGENTS.md for Windsurf with all agents aggregated
 */
export function generateAgentsMd(files, destPath, opts) {
  const { dryRun } = opts;

  const lines = [];
  lines.push('# AGENTS.md');
  lines.push('');
  lines.push('> AIWG Agent Directory for Windsurf');
  lines.push('');
  lines.push('<!--');
  lines.push('  [EXPERIMENTAL] Generated by AIWG for Windsurf');
  lines.push('  Windsurf reads this file for directory-scoped AI instructions.');
  lines.push('  See: https://docs.windsurf.com/windsurf/cascade/agents-md');
  lines.push('-->');
  lines.push('');
  lines.push('## Table of Contents');
  lines.push('');

  // Build TOC and collect agents
  const agents = [];
  for (const f of files) {
    const content = fs.readFileSync(f, 'utf8');
    const nameMatch = content.match(/^name:\s*(.+)$/m);
    const agentName = nameMatch ? nameMatch[1].trim() : path.basename(f, '.md');
    agents.push({ name: agentName, file: f, content });
    const anchor = agentName.replace(/\s+/g, '-').toLowerCase();
    lines.push(`- [${agentName}](#${anchor})`);
  }
  lines.push('');
  lines.push('---');
  lines.push('');

  // Add each agent
  for (const agent of agents) {
    const transformed = transformAgent(agent.file, agent.content, opts);
    lines.push(transformed);
    lines.push('');
    lines.push('---');
    lines.push('');
  }

  const output = lines.join('\n');

  if (dryRun) {
    console.log(`[dry-run] Would write AGENTS.md with ${agents.length} agents`);
  } else {
    fs.writeFileSync(destPath, output, 'utf8');
    console.log(`Created AGENTS.md with ${agents.length} agents at ${path.relative(process.cwd(), destPath)}`);
  }

  return agents.length;
}

// ============================================================================
// .windsurfrules Generation
// ============================================================================

/**
 * Generate .windsurfrules with orchestration context and key agents
 */
export function generateWindsurfRules(srcRoot, target, opts) {
  const { dryRun } = opts;

  const lines = [];
  lines.push('# AIWG Rules for Windsurf');
  lines.push('');
  lines.push('<!--');
  lines.push('  [EXPERIMENTAL] Generated by AIWG for Windsurf');
  lines.push('  This file provides orchestration context for AIWG SDLC workflows.');
  lines.push('-->');
  lines.push('');

  // Orchestration section
  lines.push('<orchestration>');
  lines.push('## AIWG SDLC Framework');
  lines.push('');
  lines.push('**58 SDLC agents** | **100+ commands** | **49 skills** | **157 templates**');
  lines.push('');
  lines.push('### Natural Language Commands');
  lines.push('');
  lines.push('**Phase Transitions:**');
  lines.push('- "transition to elaboration" | "move to elaboration" | "start elaboration"');
  lines.push('- "ready to deploy" | "begin construction" | "start transition"');
  lines.push('');
  lines.push('**Workflow Requests:**');
  lines.push('- "run iteration {N}" | "start iteration {N}"');
  lines.push('- "deploy to production" | "start deployment"');
  lines.push('');
  lines.push('**Review Cycles:**');
  lines.push('- "security review" | "run security" | "validate security"');
  lines.push('- "run tests" | "execute tests" | "test suite"');
  lines.push('');
  lines.push('**Status Checks:**');
  lines.push('- "where are we" | "what\'s next" | "project status"');
  lines.push('</orchestration>');
  lines.push('');

  // Key agents section
  lines.push('<agents>');
  lines.push('## Key Agents');
  lines.push('');
  lines.push('For the full catalog of 58+ agents, see @AGENTS.md');
  lines.push('');
  lines.push('### Executive Orchestrator');
  lines.push('**Role**: Coordinate multi-agent workflows and phase transitions.');
  lines.push('**Use**: Phase transitions, complex multi-deliverable workflows.');
  lines.push('');
  lines.push('### Requirements Analyst');
  lines.push('**Role**: Analyze requirements, create use cases and user stories.');
  lines.push('**Use**: "analyze requirements", "create use case for {feature}"');
  lines.push('');
  lines.push('### Architecture Designer');
  lines.push('**Role**: Design system architecture, create ADRs, select technology stacks.');
  lines.push('**Use**: "design architecture", "create SAD", "write ADR for {decision}"');
  lines.push('');
  lines.push('### Security Architect');
  lines.push('**Role**: Lead threat modeling, security requirements, and gates.');
  lines.push('**Use**: "security review", "threat model", "security gate"');
  lines.push('');
  lines.push('### Test Architect');
  lines.push('**Role**: Define test strategy, coverage requirements, automation approach.');
  lines.push('**Use**: "test strategy", "define test plan", "coverage analysis"');
  lines.push('');
  lines.push('### Technical Writer');
  lines.push('**Role**: Create and maintain documentation with voice consistency.');
  lines.push('**Use**: "document {feature}", "update README", "API docs"');
  lines.push('</agents>');
  lines.push('');

  // Artifacts section
  lines.push('<artifacts>');
  lines.push('## Project Artifacts');
  lines.push('');
  lines.push('All SDLC artifacts stored in `.aiwg/`:');
  lines.push('- `intake/` - Project intake forms');
  lines.push('- `requirements/` - User stories, use cases');
  lines.push('- `architecture/` - SAD, ADRs');
  lines.push('- `testing/` - Test strategy, plans');
  lines.push('- `security/` - Threat models');
  lines.push('- `deployment/` - Deployment plans');
  lines.push('</artifacts>');
  lines.push('');

  // References section
  lines.push('<references>');
  lines.push('## Full Documentation');
  lines.push('');
  lines.push('- **All Agents**: @AGENTS.md');
  lines.push('- **Templates**: @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/');
  lines.push('- **Commands**: @~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/commands/');
  lines.push('- **Repository**: https://github.com/jmagly/aiwg');
  lines.push('</references>');

  const output = lines.join('\n');
  const destPath = path.join(target, '.windsurfrules');

  if (dryRun) {
    console.log(`[dry-run] Would write .windsurfrules`);
  } else {
    fs.writeFileSync(destPath, output, 'utf8');
    console.log(`Created .windsurfrules at ${path.relative(process.cwd(), destPath)}`);
  }
}

// ============================================================================
// Workflow Deployment
// ============================================================================

/**
 * Deploy commands as Windsurf workflows
 */
export function deployWorkflows(commandFiles, targetDir, opts) {
  const { dryRun } = opts;
  const workflowsDir = path.join(targetDir, '.windsurf', 'workflows');

  if (!dryRun) {
    ensureDir(workflowsDir);
  }

  console.log(`\nDeploying ${commandFiles.length} commands as Windsurf workflows to ${workflowsDir}...`);

  for (const cmdFile of commandFiles) {
    const content = fs.readFileSync(cmdFile, 'utf8');
    const workflowContent = transformCommand(cmdFile, content, opts);

    // Check character limit (12000) - warn if exceeded
    if (workflowContent.length > 12000) {
      console.warn(`Warning: Workflow ${path.basename(cmdFile)} exceeds 12000 char limit (${workflowContent.length} chars)`);
    }

    const destFile = path.join(workflowsDir, path.basename(cmdFile));

    if (dryRun) {
      console.log(`[dry-run] deploy workflow: ${path.basename(cmdFile)}`);
    } else {
      fs.writeFileSync(destFile, workflowContent, 'utf8');
      console.log(`deployed workflow: ${path.basename(cmdFile)}`);
    }
  }
}

// ============================================================================
// Skills Deployment
// ============================================================================

/**
 * Deploy skills as discrete directories
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const destDir = path.join(targetDir, paths.skills);
  ensureDir(destDir, opts.dryRun);
  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, destDir, opts);
  }
}

// ============================================================================
// Rules Deployment
// ============================================================================

/**
 * Deploy rules as discrete files
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(ruleFiles, destDir, opts, transformAgent);
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun);
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
    deployCommands,
    deploySkills: shouldDeploySkills,
    deployRules: shouldDeployRules,
    commandsOnly,
    skillsOnly,
    rulesOnly,
    dryRun
  } = opts;

  displayWarning();

  console.log(`\n=== Windsurf Provider (EXPERIMENTAL) ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  // Collect all agent files based on mode
  const allAgentFiles = [];

  // All addons (dynamically discovered)
  if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
    allAgentFiles.push(...getAddonAgentFiles(srcRoot));
  }

  // Frameworks
  if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
    const sdlcAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'agents');
    allAgentFiles.push(...listMdFiles(sdlcAgentsDir));
  }

  if (mode === 'marketing' || mode === 'all') {
    const marketingAgentsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'agents');
    allAgentFiles.push(...listMdFiles(marketingAgentsDir));
  }

  // Generate aggregated AGENTS.md
  if (allAgentFiles.length > 0 && !commandsOnly && !skillsOnly && !rulesOnly) {
    const agentsMdPath = path.join(target, 'AGENTS.md');
    console.log(`\nGenerating AGENTS.md with ${allAgentFiles.length} agents...`);
    generateAgentsMd(allAgentFiles, agentsMdPath, opts);
  }

  // Generate .windsurfrules with orchestration context
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log('\nGenerating .windsurfrules orchestration file...');
    generateWindsurfRules(srcRoot, target, opts);
  }

  // Deploy commands as Windsurf workflows
  if (deployCommands || commandsOnly) {
    // Collect command files based on mode
    const commandFiles = [];

    // All addons (dynamically discovered)
    if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
      commandFiles.push(...getAddonCommandFiles(srcRoot));
    }

    // Frameworks
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'commands');
      commandFiles.push(...listMdFilesRecursive(sdlcCommandsDir));
    }

    if (mode === 'marketing' || mode === 'all') {
      const marketingCommandsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'commands');
      commandFiles.push(...listMdFilesRecursive(marketingCommandsDir));
    }

    if (commandFiles.length > 0) {
      deployWorkflows(commandFiles, target, opts);
    }
  }

  // Deploy skills
  if (shouldDeploySkills || skillsOnly) {
    // Collect skill directories based on mode
    const skillDirs = [];

    // All addons (dynamically discovered)
    if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
      skillDirs.push(...getAddonSkillDirs(srcRoot));
    }

    // Frameworks
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'skills');
      skillDirs.push(...listSkillDirs(sdlcSkillsDir));
    }

    if (mode === 'marketing' || mode === 'all') {
      const marketingSkillsDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'skills');
      skillDirs.push(...listSkillDirs(marketingSkillsDir));
    }

    if (skillDirs.length > 0) {
      console.log(`\nDeploying ${skillDirs.length} skills...`);
      deploySkills(skillDirs, target, opts);
    }
  }

  // Deploy rules
  if (shouldDeployRules || rulesOnly) {
    // Collect rule files based on mode
    const ruleFiles = [];

    // All addons (dynamically discovered)
    if (mode === 'general' || mode === 'writing' || mode === 'sdlc' || mode === 'both' || mode === 'all') {
      ruleFiles.push(...getAddonRuleFiles(srcRoot));
    }

    // Frameworks
    if (mode === 'sdlc' || mode === 'both' || mode === 'all') {
      const sdlcRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'sdlc-complete', 'rules');
      ruleFiles.push(...listMdFiles(sdlcRulesDir));
    }

    if (mode === 'marketing' || mode === 'all') {
      const marketingRulesDir = path.join(srcRoot, 'agentic', 'code', 'frameworks', 'media-marketing-kit', 'rules');
      ruleFiles.push(...listMdFiles(marketingRulesDir));
    }

    if (ruleFiles.length > 0) {
      console.log(`\nDeploying ${ruleFiles.length} rules...`);
      deployRules(ruleFiles, target, opts);
    }
  }

  // Post-deployment
  await postDeploy(target, opts);

  console.log('\n' + '='.repeat(70));
  console.log('Windsurf deployment complete. Generated files:');
  console.log('  - AGENTS.md (agent catalog)');
  console.log('  - .windsurfrules (orchestration context)');
  if (deployCommands || commandsOnly) {
    console.log('  - .windsurf/workflows/ (commands as workflows)');
  }
  if (shouldDeploySkills || skillsOnly) {
    console.log('  - .windsurf/skills/ (discrete skill directories)');
  }
  if (shouldDeployRules || rulesOnly) {
    console.log('  - .windsurf/rules/ (discrete rule files)');
  }
  console.log('='.repeat(70) + '\n');
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
  generateAgentsMd,
  generateWindsurfRules,
  deployWorkflows,
  deploySkills,
  deployRules,
  postDeploy,
  getFileExtension,
  deploy
};
