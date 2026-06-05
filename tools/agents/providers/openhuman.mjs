/**
 * OpenHuman provider (tinyhumansai/openhuman) — Tier-1 deployment.
 *
 * OpenHuman is an OSS personal-AI runtime (Rust core + React/Tauri shell). It
 * is AIWG-convention-aware out of the box: it ships `.agents/`, `AGENTS.md`,
 * `.claude/`, and `.codex/`. This module wires AIWG's *host-integration* tier:
 *
 *   - agents   -> .agents/agents/  (markdown personas; consumed by external
 *                 coding hosts OpenHuman drives — claude_code/factory. The
 *                 native harness TOML surface is Tier-2, see #1559.)
 *   - skills   -> kernel: .openhuman/skills/  (project-scope native scan root,
 *                 ops_discover.rs; trust-marker gated, #1553)
 *                 standard: .openhuman/.aiwg/skills/  (sequestered, index-driven)
 *   - commands -> aggregated via AGENTS.md (OpenHuman has no native command
 *                 surface); discrete files sequestered under .openhuman/.aiwg/
 *   - rules    -> aggregated into AGENTS.md (### Rule: inline / `aiwg show rule`);
 *                 full bodies sequestered under .openhuman/.aiwg/rules/
 *   - config   -> AGENTS.md (Discover-First bridge)
 *
 * Decisions: ADR `.aiwg/architecture/adr-openhuman-agent-target.md`.
 * Epic #1552 · this module: #1555.
 */

import path from 'path';
import {
  ensureDir,
  deployFiles,
  deploySkillsWithKernelRouting,
  createAgentsMdFromTemplate,
  initializeFrameworkWorkspace,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  collectFrameworkArtifacts,
  normalizeDeploymentMode,
  cleanupOldRuleFiles,
  filterCommandsAgainstSkills,
  deploySoulCompanions,
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'openhuman';
export const aliases = [];

export const paths = {
  agents: '.agents/agents/',
  // OpenHuman has no native command surface — commands aggregate into AGENTS.md
  // and the command-skills (/aiwg-doctor etc.) deploy as skills. Empty path =>
  // no discrete command files (matches src PROVIDER_PATHS; avoids the
  // commands→skills migration path). Same shape as hermes.
  commands: '',
  // Standard (non-kernel) skills sequestered; kernel set → kernelSkillsPath.
  skills: '.openhuman/.aiwg/skills/',
  // Full rule bodies for `aiwg show rule`; critical directives inline in AGENTS.md.
  rules: '.openhuman/.aiwg/rules/',
};

// Kernel skills (always-loaded) → project-scope native scan root. OpenHuman's
// ops_discover.rs scans <ws>/.openhuman/skills/ (and legacy <ws>/skills/),
// gated by a workspace trust-marker (#1553). Project-relative — joined with
// the deploy target.
export const kernelSkillsPath = '.openhuman/skills/';

export const support = {
  agents: 'conventional',   // .agents/agents/ — consumed by coding hosts OpenHuman drives
  commands: 'aggregated',   // via AGENTS.md
  skills: 'native',         // .openhuman/skills/ natively scanned
  rules: 'aggregated',      // AGENTS.md ### Rule: inline + `aiwg show rule`
};

export const capabilities = {
  skills: true,
  rules: true,
  aggregatedOutput: true,
  yamlFormat: false,
};

// ============================================================================
// Model Mapping
// ============================================================================

/**
 * OpenHuman uses its own model namespace (neocortex-*, router hints
 * reasoning/coding/agentic/local). AIWG `sonnet/opus/haiku` do not map cleanly,
 * so Tier-1 deploys personas verbatim and the (Tier-2) harness inherits the
 * parent model (ModelSpec::Inherit) when `[model]` is omitted. Pass-through.
 * See ADR adr-openhuman-agent-target.
 */
export function mapModel(originalModel) {
  return originalModel;
}

// ============================================================================
// Content Transformation
// ============================================================================

/**
 * Markdown personas deploy as-is. Frontmatter (name/description/model) is left
 * intact — it is exactly the shape external coding hosts read from `.agents/`.
 */
export function transformAgent(srcPath, content) {
  return content;
}

export function transformCommand(srcPath, content) {
  return content;
}

// ============================================================================
// Deployment
// ============================================================================

export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, { ...opts, injectPlatform: true }, transformAgent);
}

export function deployCommands(commandFiles, targetDir, opts) {
  // Aggregated provider — no discrete command files. Commands surface via
  // AGENTS.md and the deployed command-skills. No-op by design.
  if (!paths.commands) return;
  const destDir = path.join(targetDir, paths.commands);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(commandFiles, destDir, opts, transformCommand);
}

/**
 * Kernel-vs-standard skill routing (#1212/#1216):
 *   - kernel   → .openhuman/skills/        (native scan root)
 *   - standard → .openhuman/.aiwg/skills/  (index-discoverable)
 */
export function deploySkills(skillDirs, targetDir, opts) {
  const standardDestDir = path.join(targetDir, paths.skills);
  const kernelDestDir = path.join(targetDir, kernelSkillsPath);
  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);
}

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
 * Create/update the AGENTS.md bridge. v1 reuses the codex AGENTS.md template —
 * both are AGENTS.md-bridged providers sharing the Discover-First protocol.
 * An OpenHuman-specific template is a #1557 follow-up.
 */
export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'codex/AGENTS.md.aiwg-template', dryRun);
}

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);
  if (opts.createAgentsMd) {
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
    createAgentsMd: shouldCreateAgentsMd,
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
  const soulFiles = [...(fw.souls || [])];
  commandFiles.push(...fw.commands);
  skillDirs.push(...fw.skills);
  ruleFiles.push(...fw.rules);

  // Agents (markdown personas → .agents/agents/)
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nDeploying ${agentFiles.length} agents to .agents/agents/...`);
    deployAgents(agentFiles, target, opts);

    if (soulFiles.length > 0) {
      const destDir = path.join(target, paths.agents);
      console.log(`\nDeploying ${soulFiles.length} soul files...`);
      deploySoulCompanions(soulFiles, destDir, opts);
    }
  }

  // Commands take a back seat to skills where they collide.
  const filteredCommands = (shouldDeploySkills || skillsOnly)
    ? filterCommandsAgainstSkills(commandFiles, skillDirs)
    : commandFiles;

  // Commands aggregate via AGENTS.md (paths.commands is empty) — nothing
  // discrete to deploy. The command-skills reach OpenHuman as skills below.
  if ((shouldDeployCommands || commandsOnly) && paths.commands) {
    console.log(`\nDeploying ${filteredCommands.length} commands...`);
    deployCommands(filteredCommands, target, opts);
  }

  if (shouldDeploySkills || skillsOnly) {
    console.log(`\nDeploying ${skillDirs.length} skills...`);
    deploySkills(skillDirs, target, opts);
  }

  if (shouldDeployRules || rulesOnly) {
    console.log(`\nDeploying ${ruleFiles.length} rules (sequestered; critical directives inline in AGENTS.md)...`);
    deployRules(ruleFiles, target, opts);
  }

  await postDeploy(target, { ...opts, createAgentsMd: shouldCreateAgentsMd });

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
  postDeploy,
  getFileExtension,
  deploy,
};
