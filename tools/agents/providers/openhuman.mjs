/**
 * OpenHuman provider (tinyhumansai/openhuman) — Tier-1 deployment.
 *
 * OpenHuman is an OSS personal-AI runtime (Rust core + React/Tauri shell).
 * This module wires AIWG into OpenHuman's user-global app roots:
 *
 *   - agents   -> no markdown persona deploy; OpenHuman native custom agents
 *                 are TOML-only under ~/.openhuman/agents (Tier-2, #1559)
 *   - skills   -> kernel: ~/.openhuman/skills/ (native user-scope scan root;
 *                 visible in the OpenHuman Skills UI)
 *                 standard: AIWG index/discovery only
 *   - commands -> no native command directory; command-skills deploy as skills
 *   - rules    -> full bodies under ~/.openhuman/.aiwg/rules/ for `aiwg show`
 *
 * Decisions: ADR `.aiwg/architecture/adr-openhuman-agent-target.md`.
 * Epic #1552 · this module: #1555.
 */

import path from 'path';
import os from 'os';
import {
  ensureDir,
  deployFiles,
  deploySkillsWithKernelRouting,
  createAgentsMdFromTemplate,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  collectFrameworkArtifacts,
  normalizeDeploymentMode,
  cleanupOldRuleFiles,
  filterCommandsAgainstSkills,
  resolveAiwgRoot,
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'openhuman';
export const aliases = [];

export const paths = {
  // OpenHuman's native custom-agent surface is TOML-only under
  // ~/.openhuman/agents. Markdown personas are not a project-level OpenHuman
  // install target.
  agents: '',
  // OpenHuman has no native command surface. Empty path => no discrete command
  // files; command-skills are reachable only through the kernel skill copy or
  // AIWG index/discovery.
  commands: '',
  // Standard (non-kernel) skills are not copied for OpenHuman. This legacy
  // path is passed to the shared router only so old hidden copies can be pruned.
  skills: path.join(os.homedir(), '.openhuman', '.aiwg', 'skills'),
  // Full rule bodies for `aiwg show rule`.
  rules: path.join(os.homedir(), '.openhuman', '.aiwg', 'rules'),
};

// OpenHuman's native user-scope scan root for kernel skills.
export const kernelSkillsPath = path.join(os.homedir(), '.openhuman', 'skills');

export const support = {
  agents: 'none',           // Native TOML harness agents are emitted by the CLI
  commands: 'none',
  skills: 'native',         // .openhuman/skills/ natively scanned
  rules: 'indexed',         // `aiwg show rule`
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: false,
  yamlFormat: false,
  homeDirectoryDeploy: true,
};

// ============================================================================
// Model Mapping
// ============================================================================

/**
 * OpenHuman uses its own model namespace (neocortex-*, router hints
 * reasoning/coding/agentic/local). AIWG `sonnet/opus/haiku` do not map cleanly.
 * Markdown personas are not deployed for OpenHuman; native harness agents
 * inherit the parent model (ModelSpec::Inherit) when `[model]` is omitted.
 * See ADR adr-openhuman-agent-target.
 */
export function mapModel(originalModel) {
  return originalModel;
}

// ============================================================================
// Content Transformation
// ============================================================================

/** Markdown personas are not a supported OpenHuman install target. */
export function transformAgent(srcPath, content) {
  return content;
}

export function transformCommand(srcPath, content) {
  return content;
}

export function transformSkillFrontmatter(content) {
  if (!content.startsWith('---\n')) return content;
  const end = content.indexOf('\n---', 4);
  if (end < 0) return content;

  let fm = content.slice(4, end);
  const body = content.slice(end);

  // OpenHuman currently classifies any SKILL.md with non-empty `platforms` as
  // Hermes format. AIWG deploys directly into OpenHuman's user-global scan root,
  // so the platform hint is not needed in the deployed copy and would mislabel
  // the UI badge.
  fm = fm
    .replace(/^platforms:\s*\[[^\]]*\]\n?/m, '')
    .replace(/^platforms:\s*\n(?:[ \t]+-[ \t]+\S[^\n]*\n?)*/m, '');

  return `---\n${fm.trimEnd()}\n${body}`;
}

// ============================================================================
// Deployment
// ============================================================================

export function deployAgents(agentFiles, targetDir, opts) {
  return 0;
}

export function deployCommands(commandFiles, targetDir, opts) {
  return 0;
}

/**
 * Kernel-vs-standard skill routing (#1212/#1216):
 *   - kernel   → ~/.openhuman/skills/        (native UI scan root)
 *   - standard → not copied                  (AIWG index/discovery)
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const standardDestDir = path.isAbsolute(paths.skills)
    ? paths.skills
    : path.join(targetDir, paths.skills);
  const kernelDestDir = path.isAbsolute(kernelSkillsPath)
    ? kernelSkillsPath
    : path.join(targetDir, kernelSkillsPath);
  return deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, {
    ...opts,
    copyStandardSkills: false,
    transformSkillMd: transformSkillFrontmatter,
  });
}

export function deployRules(ruleFiles, targetDir, opts) {
  const destDir = path.isAbsolute(paths.rules)
    ? paths.rules
    : path.join(targetDir, paths.rules);
  ensureDir(destDir, opts.dryRun);
  cleanupOldRuleFiles(destDir, opts);
  return deployFiles(ruleFiles, destDir, opts, transformAgent);
}

export function createAgentsMd(target, srcRoot, dryRun) {
  const aiwgRoot = resolveAiwgRoot(srcRoot) || srcRoot;
  createAgentsMdFromTemplate(target, aiwgRoot, 'openhuman/AGENTS.md.aiwg-template', dryRun);
}

export async function postDeploy(targetDir, opts) {
  if (
    opts.createAgentsMd ||
    (!opts.commandsOnly && !opts.skillsOnly && !opts.rulesOnly)
  ) {
    createAgentsMd(targetDir, opts.srcRoot, opts.dryRun);
  }
}

export function getFileExtension() {
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
    deploySkills: shouldDeploySkills,
    deployRules: shouldDeployRules,
    commandsOnly,
    skillsOnly,
    rulesOnly,
  } = opts;

  console.log(`\n=== OpenHuman Provider ===`);
  console.log(`Target: ${target}`);
  console.log(`Mode: ${mode}`);

  const agentFiles = [];
  const commandFiles = [];
  const ruleFiles = [];
  const skillDirs = [];
  const normalizedMode = normalizeDeploymentMode(mode);

  // Addon artifacts (dynamically discovered)
  if (['general', 'sdlc', 'both', 'all'].includes(normalizedMode)) {
    agentFiles.push(...getAddonAgentFiles(srcRoot));
    if (shouldDeployCommands || commandsOnly) commandFiles.push(...getAddonCommandFiles(srcRoot));
    if (shouldDeployRules || rulesOnly) ruleFiles.push(...getAddonRuleFiles(srcRoot));
    if (shouldDeploySkills || skillsOnly) skillDirs.push(...getAddonSkillDirs(srcRoot));
  }

  // Framework artifacts
  const fw = collectFrameworkArtifacts(srcRoot, normalizedMode, {
    includeAgents: true,
    includeCommands: shouldDeployCommands || commandsOnly,
    includeSkills: shouldDeploySkills || skillsOnly,
    includeRules: shouldDeployRules || rulesOnly,
    recursiveCommands: true,
    consolidatedSdlcRules: true,
  });
  agentFiles.push(...fw.agents);
  commandFiles.push(...fw.commands);
  skillDirs.push(...fw.skills);
  ruleFiles.push(...fw.rules);

  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nSkipping markdown agents: OpenHuman native agents are TOML-only under ~/.openhuman/agents.`);
  }

  // Commands take a back seat to skills where they collide.
  const filteredCommands = (shouldDeploySkills || skillsOnly)
    ? filterCommandsAgainstSkills(commandFiles, skillDirs)
    : commandFiles;

  // No native command directory. Command-skills reach OpenHuman only when they
  // are kernel skills copied to ~/.openhuman/skills; otherwise AIWG discovery
  // finds them on demand.
  if ((shouldDeployCommands || commandsOnly) && paths.commands) {
    console.log(`\nDeploying ${filteredCommands.length} commands...`);
    deployCommands(filteredCommands, target, opts);
  }

  if (shouldDeploySkills || skillsOnly) {
    console.log(`\nDeploying ${skillDirs.length} skills (kernel → ~/.openhuman/skills, standard → index/discovery)...`);
    deploySkills(skillDirs, target, opts);
  }

  if (shouldDeployRules || rulesOnly) {
    console.log(`\nDeploying ${ruleFiles.length} rules for AIWG discovery...`);
    deployRules(ruleFiles, target, opts);
  }

  await postDeploy(target, opts);

  console.log('\n=== OpenHuman deployment complete ===\n');
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
  mapModel,
  deployAgents,
  deployCommands,
  deploySkills,
  deployRules,
  createAgentsMd,
  transformSkillFrontmatter,
  postDeploy,
  getFileExtension,
  deploy,
};
