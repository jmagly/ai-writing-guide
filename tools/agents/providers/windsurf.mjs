/**
 * Windsurf Provider (EXPERIMENTAL)
 *
 * Deploys agents to Windsurf format with aggregated AGENTS.md and trigger-frontmatter rules.
 *
 * Deployment paths:
 *   - Output: AGENTS.md (aggregated agents)
 *   - Output: .windsurf/rules/aiwg-orchestration.md (orchestration context, trigger: always_on)
 *   - Output: .windsurfrules (deprecated stub — retained for backward compat only)
 *   - Workflows: .windsurf/workflows/ (commands as workflows)
 *   - Skills: .windsurf/skills/ (discrete skill directories)
 *   - Skills: .agents/skills/ (cross-agent compatibility path)
 *   - Rules: .windsurf/rules/ (discrete rule files with trigger frontmatter)
 *
 * Special features:
 *   - Aggregated output (all agents in single AGENTS.md)
 *   - Plain markdown format (no YAML frontmatter)
 *   - Capabilities tags for tools
 *   - Workflow format for commands
 *   - Conventional skills and rules deployment
 *   - EXPERIMENTAL: Untested, may require adjustments
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
  deployFiles,
  normalizeDeploymentMode,
  collectFrameworkArtifacts,
  cleanupOldRuleFiles,
  filterCommandsAgainstSkills,
  deploySoulCompanions
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'windsurf';
export const aliases = [];

export const paths = {
  agents: '.windsurf/agents/',      // Discrete mirrors alongside AGENTS.md
  commands: '.windsurf/workflows/',
  // Skills sequestered under .windsurf/.aiwg/skills/ — index-driven discovery (#1212).
  skills: '.windsurf/.aiwg/skills/',
  crossAgentSkills: '.agents/skills/',  // Cross-agent compatibility path (#576)
  rules: '.windsurf/rules/'
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
export const kernelSkillsPath = '.windsurf/skills/';

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

/**
 * Transform rule content for Windsurf — injects trigger frontmatter per ADR-2.
 *
 * Defaults to `trigger: always_on` (the ADR-2 §2 default-preservation choice
 * for the existing AIWG rule corpus). When the source frontmatter declares
 * a `globs:` or `applyTo:` field, the trigger is upgraded to `glob` and the
 * glob pattern is passed through as the Windsurf-native `glob:` field
 * (PUW-020 / #1121, glob-mode part of ADR-2 §1 mapping).
 *
 * Per ADR-2 §5: non-always_on modes require a live-Windsurf smoke test
 * gate before shipping to operators with the live loader. Until that gate
 * lands, the safe default is preserved for rules without explicit globs.
 */
export function transformRule(srcPath, content, opts) {
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (fmMatch) {
    const [, frontmatter, body] = fmMatch;
    // Already has a trigger field — preserve the file as-is.
    if (/^trigger:/m.test(frontmatter)) {
      return content;
    }

    // PUW-021 (#1122 sibling): pass through globs / applyTo as glob trigger.
    const globsMatch = /^\s*globs?\s*:\s*(.+)$/m.exec(frontmatter);
    const applyToMatch = /^\s*applyTo\s*:\s*(.+)$/m.exec(frontmatter);
    if (globsMatch || applyToMatch) {
      const globValue = (globsMatch?.[1] || applyToMatch?.[1] || '').trim().replace(/^['"]|['"]$/g, '');
      const triggerLines = [`trigger: glob`];
      // Add Windsurf-native `glob:` field if not already present.
      if (!/^\s*glob\s*:/m.test(frontmatter)) {
        triggerLines.push(`glob: '${globValue}'`);
      }
      return `---\n${triggerLines.join('\n')}\n${frontmatter}\n---\n${body}`;
    }

    // Default: trigger: always_on (ADR-2 §2 safe default).
    return `---\ntrigger: always_on\n${frontmatter}\n---\n${body}`;
  }

  // No frontmatter — wrap with trigger.
  return `---\ntrigger: always_on\n---\n\n${content}`;
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
  // Canonical AIWG signature in the first 4 lines so the context-pipeline
  // `isOverwriteSafe` check (#1239) recognizes this file as AIWG-managed and
  // overwrites it with the thin-pointer body. Without this, context-pipeline
  // refuses to replace the legacy 2MB+ aggregate writer's output.
  lines.push('<!-- aiwg-managed -->');
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
 * Generate .windsurf/rules/aiwg-orchestration.md with trigger: always_on frontmatter.
 * Also writes a deprecated .windsurfrules stub for backward compatibility — that file
 * may be silently ignored by Windsurf (not documented in official docs).
 */
export function generateWindsurfRules(srcRoot, target, opts) {
  const { dryRun } = opts;

  const lines = [];
  lines.push('---');
  lines.push('trigger: always_on');
  lines.push('---');
  lines.push('');
  lines.push('# AIWG Orchestration for Windsurf');
  lines.push('');
  lines.push('<!--');
  lines.push('  [EXPERIMENTAL] Generated by AIWG for Windsurf');
  lines.push('  This file provides orchestration context for AIWG SDLC workflows.');
  lines.push('  trigger: always_on — included in system prompt on every message.');
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

  // Primary: .windsurf/rules/aiwg-orchestration.md with trigger frontmatter
  const rulesDir = path.join(target, '.windsurf', 'rules');
  const orchestrationPath = path.join(rulesDir, 'aiwg-orchestration.md');

  if (dryRun) {
    console.log(`[dry-run] Would write .windsurf/rules/aiwg-orchestration.md (trigger: always_on)`);
  } else {
    ensureDir(rulesDir);
    fs.writeFileSync(orchestrationPath, output, 'utf8');
    console.log(`Created .windsurf/rules/aiwg-orchestration.md (trigger: always_on)`);
  }

  // Deprecated stub: .windsurfrules — retained for backward compat only
  const stubLines = [
    '# AIWG Rules for Windsurf — Deprecated',
    '',
    '> **This file is deprecated.**',
    '> Windsurf reads `.windsurf/rules/*.md` natively (see official docs).',
    '> AIWG orchestration context is now deployed to:',
    '>   `.windsurf/rules/aiwg-orchestration.md`  (trigger: always_on)',
    '>',
    '> This root-level file may be silently ignored by Windsurf.',
    '> It is retained only for backward compatibility and will be removed in a future release.',
  ];
  const stubPath = path.join(target, '.windsurfrules');

  if (dryRun) {
    console.log(`[dry-run] Would write .windsurfrules (deprecated stub)`);
  } else {
    fs.writeFileSync(stubPath, stubLines.join('\n'), 'utf8');
    console.log(`Created .windsurfrules (deprecated stub → .windsurf/rules/aiwg-orchestration.md)`);
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
 * Deploy skills to .windsurf/skills/ (primary) and .agents/skills/ (cross-agent compatibility).
 * The .agents/skills/ path is an interop convention for projects using multiple AI coding tools.
 */
export function deploySkills(skillDirs, targetDir, opts) {
  // Primary: kernel-vs-standard routing (#1212/#1216)
  //   - kernel skills → .windsurf/skills/         (platform-native, always-loaded)
  //   - standard      → .windsurf/.aiwg/skills/   (index-discoverable)
  const standardDestDir = path.join(targetDir, paths.skills);
  const kernelDestDir = path.join(targetDir, kernelSkillsPath);
  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);

  // Cross-agent compatibility: .agents/skills/
  const crossAgentDir = path.join(targetDir, paths.crossAgentSkills);
  ensureDir(crossAgentDir, opts.dryRun);
  if (!opts.dryRun) {
    console.log(`Deploying cross-agent skills to ${path.relative(process.cwd(), crossAgentDir)}...`);
  } else {
    console.log(`[dry-run] Would deploy cross-agent skills to .agents/skills/`);
  }
  for (const skillDir of skillDirs) {
    deploySkillDir(skillDir, crossAgentDir, opts);
  }
}

// ============================================================================
// Rules Deployment
// ============================================================================

/**
 * Deploy rules as discrete files with trigger: always_on frontmatter injected
 */
export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformRule);
}

// ============================================================================
// Post-Deployment
// ============================================================================

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);
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
  const normalizedMode = normalizeDeploymentMode(mode);

  // Collect all agent files based on mode
  const allAgentFiles = [];

  // All addons (dynamically discovered)
  if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
    allAgentFiles.push(...getAddonAgentFiles(srcRoot));
  }

  const frameworkAgents = collectFrameworkArtifacts(srcRoot, normalizedMode, {
    includeAgents: true,
    includeCommands: false,
    includeSkills: false,
    includeRules: false
  });
  allAgentFiles.push(...frameworkAgents.agents);
  const soulFiles = [...(frameworkAgents.souls || [])];

  // Generate aggregated AGENTS.md
  if (allAgentFiles.length > 0 && !commandsOnly && !skillsOnly && !rulesOnly) {
    const agentsMdPath = path.join(target, 'AGENTS.md');
    console.log(`\nGenerating AGENTS.md with ${allAgentFiles.length} agents...`);
    generateAgentsMd(allAgentFiles, agentsMdPath, opts);

    // Deploy soul companion files alongside agents (discrete mirror dir)
    if (soulFiles.length > 0) {
      const destDir = path.join(target, paths.agents);
      ensureDir(destDir, opts.dryRun);
      console.log(`\nDeploying ${soulFiles.length} soul files...`);
      deploySoulCompanions(soulFiles, destDir, opts);
    }
  }

  // Generate .windsurf/rules/aiwg-orchestration.md (trigger: always_on) + deprecated .windsurfrules stub
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log('\nGenerating orchestration rule (.windsurf/rules/aiwg-orchestration.md)...');
    generateWindsurfRules(srcRoot, target, opts);
  }

  // Collect skill directories early so we can filter command collisions
  const skillDirs = [];
  if (shouldDeploySkills || skillsOnly) {
    // All addons (dynamically discovered)
    if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
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

    const frameworkSkills = collectFrameworkArtifacts(srcRoot, normalizedMode, {
      includeAgents: false,
      includeCommands: false,
      includeSkills: true,
      includeRules: false
    });
    skillDirs.push(...frameworkSkills.skills);
  }

  // Deploy commands as Windsurf workflows
  if (deployCommands || commandsOnly) {
    // Collect command files based on mode
    const commandFiles = [];

    // All addons (dynamically discovered)
    if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
      commandFiles.push(...getAddonCommandFiles(srcRoot));
    }

    const frameworkCommands = collectFrameworkArtifacts(srcRoot, normalizedMode, {
      includeAgents: false,
      includeCommands: true,
      includeSkills: false,
      includeRules: false,
      recursiveCommands: true
    });
    commandFiles.push(...frameworkCommands.commands);

    // Filter commands that collide with skills (skills take precedence)
    const filteredCommands = skillDirs.length > 0
      ? filterCommandsAgainstSkills(commandFiles, skillDirs)
      : commandFiles;

    if (filteredCommands.length > 0) {
      deployWorkflows(filteredCommands, target, opts);
    }
  }

  // Deploy skills
  if (skillDirs.length > 0 && (shouldDeploySkills || skillsOnly)) {
    console.log(`\nDeploying ${skillDirs.length} skills...`);
    deploySkills(skillDirs, target, opts);
  }

  // Deploy rules
  if (shouldDeployRules || rulesOnly) {
    // Collect rule files based on mode
    const ruleFiles = [];

    // All addons (dynamically discovered)
    if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
      ruleFiles.push(...getAddonRuleFiles(srcRoot));
    }

    const frameworkRules = collectFrameworkArtifacts(srcRoot, normalizedMode, {
      includeAgents: false,
      includeCommands: false,
      includeSkills: false,
      includeRules: true,
      consolidatedSdlcRules: true
    });
    ruleFiles.push(...frameworkRules.rules);

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
  console.log('  - .windsurf/rules/aiwg-orchestration.md (orchestration context, trigger: always_on)');
  console.log('  - .windsurfrules (deprecated stub — Windsurf may ignore this file)');
  if (deployCommands || commandsOnly) {
    console.log('  - .windsurf/workflows/ (commands as workflows)');
  }
  if (shouldDeploySkills || skillsOnly) {
    console.log('  - .windsurf/skills/ (discrete skill directories)');
    console.log('  - .agents/skills/ (cross-agent compatibility)');
  }
  if (shouldDeployRules || rulesOnly) {
    console.log('  - .windsurf/rules/ (discrete rule files with trigger frontmatter)');
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
  kernelSkillsPath,
  support,
  capabilities,
  transformAgent,
  transformCommand,
  transformRule,
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
