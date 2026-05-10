/**
 * OpenCode Provider
 *
 * Deploys skills and rules in OpenCode format with mode, temperature,
 * tools, and permission configurations based on agent category.
 *
 * Deployment paths:
 *   - Agents: .opencode/agent/  (discovered via agent glob pattern)
 *   - Commands: NOT DEPLOYED — Commands derive from skills automatically
 *   - Skills: .opencode/skill/  (discovered via skill glob: SKILL.md)
 *   - Rules: .opencode/rule/    (loaded via `instructions` array in opencode.json)
 *
 * Special features:
 *   - Category-based configuration (analysis, documentation, planning, implementation)
 *   - Permission system with bash command whitelist
 *   - Temperature and steps per category
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
  createAgentsMdFromTemplate,
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

export const name = 'opencode';
export const aliases = [];

export const paths = {
  agents: '.opencode/agent/',   // Discovered via {agent,agents}/**/*.md glob (#773)
  commands: '',                 // Not deployed — commands derive from skills automatically
  // Skills sequestered under .opencode/.aiwg/skill/ — index-driven discovery (#1212).
  skills: '.opencode/.aiwg/skill/',
  rules: '.opencode/rule/',
  modes: '.opencode/mode/'      // PUW-035 (#1136) — TUI-selectable primary modes
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
export const kernelSkillsPath = '.opencode/skill/';

/**
 * SDLC primary roles emitted as OpenCode TUI modes per PUW-035 (#1136).
 *
 * OpenCode scans `.opencode/{mode,modes}/*.md` for selectable primary modes.
 * AIWG SDLC role agents map naturally onto modes — operators pick a "mode"
 * when starting an OpenCode session and get the role's persona + tool set
 * loaded automatically.
 *
 * The list is curated rather than auto-derived. Auto-promoting all 190+
 * AIWG agents would clutter the TUI mode picker. The selected roles are
 * the ones most often invoked as session-level primary personas.
 */
const SDLC_PRIMARY_ROLES = [
  'architecture-designer',
  'security-architect',
  'test-architect',
  'requirements-analyst',
  'product-strategist',
  'documentation-synthesizer',
  'code-reviewer',
  'debugger',
  'devops-engineer',
  'incident-responder',
];

export const support = {
  agents: 'native',       // Discovered via {agent,agents}/**/*.md glob
  commands: 'none',       // Commands derived from skills automatically
  skills: 'native',       // Discovered via {skill,skills}/**/SKILL.md
  rules: 'conventional',  // Requires instructions[] entry in opencode.json
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
 * Map model shorthand to OpenCode format (full provider/model path)
 */
export function mapModel(originalModel, modelCfg, modelsConfig) {
  const opencodeModels = {
    'opus': 'anthropic/claude-opus-4-6',
    'sonnet': 'anthropic/claude-sonnet-4-6',
    'haiku': 'anthropic/claude-haiku-4-5-20251001'
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
      permission: {
        bash: {
          'git *': 'allow',
          'npm audit': 'allow',
          'npm test': 'allow',
          '*': 'ask'
        },
        edit: 'ask'
      },
      temperature: 0.2,
      steps: 30
    },
    documentation: {
      permission: {},
      temperature: 0.4,
      steps: 50
    },
    planning: {
      permission: {
        bash: 'ask',
        edit: 'ask'
      },
      temperature: 0.3,
      steps: 40
    },
    implementation: {
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
      steps: 100
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
  const { permission, temperature, steps } = getAgentConfig(category, name);

  // Mode: primary for orchestration agents, subagent for others
  const mode = orchestrationMatch === 'true' ? 'primary' : 'subagent';

  // Generate OpenCode agent frontmatter
  // Valid fields: description, mode, model, temperature, topP, steps, color, hidden, permission, options
  let opencodeFrontmatter = `---
description: ${description || 'AIWG SDLC agent'}
mode: ${mode}
model: ${opencodeModel}
temperature: ${temperature}
steps: ${steps}`;

  // Add permission configuration (controls tool access — opencode has no separate tools block)
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
 *
 * OpenCode discovers agents via glob within each .opencode directory.
 * Agent files use YAML frontmatter (description, mode, model, temperature, steps, permission)
 * with Markdown body as the system prompt.
 *
 * See: packages/opencode/src/config/config.ts loadAgent()
 */
export function deployAgents(agentFiles, targetDir, opts) {
  const destDir = path.join(targetDir, paths.agents);
  ensureDir(destDir, opts.dryRun);
  return deployFiles(agentFiles, destDir, opts, transformAgent);
}

/**
 * Deploy commands — no-op for OpenCode.
 *
 * OpenCode commands derive from skills automatically (SKILL.md discovery).
 * No .opencode/command/ or .opencode/commands/ directory is scanned.
 * See: packages/opencode/src/command/index.ts
 */
export function deployCommands(_commandFiles, _targetDir, _opts) {
  // No-op: OpenCode does not discover commands from a directory
}

/**
 * Deploy skills to .opencode/skill/ (primary) and .agents/skills/ (cross-agent
 * compatibility, PUW-012 #1113).
 *
 * The .agents/skills/ path is an interop convention for projects using
 * multiple AI coding tools. OpenCode's skill walker scans the project tree
 * and picks up `.agents/skills/<name>/SKILL.md` as a secondary discovery
 * location, so this is purely additive — does not replace the primary
 * `.opencode/skill/` deploy.
 */
export function deploySkills(skillDirs, targetDir, opts) {
  // Primary: kernel-vs-standard routing (#1212/#1216)
  //   - kernel skills → .opencode/skill/         (platform-native, always-loaded)
  //   - standard      → .opencode/.aiwg/skill/   (index-discoverable)
  const standardDestDir = path.join(targetDir, paths.skills);
  const kernelDestDir = path.join(targetDir, kernelSkillsPath);
  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);

  // Cross-agent compatibility: .agents/skills/ — honors #1217 no-copy
  // default. Filter to kernel-only unless operator opts in via env var so
  // standard skills stay at $AIWG_ROOT and are reached via `aiwg discover`.
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
 * Deploy rules to .opencode/rule/
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

export function createAgentsMd(target, srcRoot, dryRun) {
  createAgentsMdFromTemplate(target, srcRoot, 'opencode/AGENTS.md.aiwg-template', dryRun);
}

// ============================================================================
// Post-Deployment
// ============================================================================

/**
 * Emit selected SDLC primary-role agents as OpenCode TUI modes
 * (PUW-035 / #1136). Uses already-deployed agent files at
 * `.opencode/agent/<role>.md` as the source — copies them to
 * `.opencode/mode/<role>.md` for the TUI mode picker.
 *
 * Per ADR-1 §0.6 always-deploy invariant: agents/ files keep deploying
 * unchanged; the mode/ files are an additive layer.
 */
export function deployModes(targetDir, opts) {
  const agentsDir = path.join(targetDir, paths.agents);
  const modesDir = path.join(targetDir, paths.modes);

  if (!fs.existsSync(agentsDir)) {
    return 0;
  }

  ensureDir(modesDir, opts.dryRun);
  let count = 0;

  for (const roleId of SDLC_PRIMARY_ROLES) {
    const agentSrc = path.join(agentsDir, `${roleId}.md`);
    const modeDest = path.join(modesDir, `${roleId}.md`);

    if (!fs.existsSync(agentSrc)) {
      // Role's agent file isn't deployed (e.g., pruned framework or
      // stale-list entry). Skip silently; not an error.
      continue;
    }

    if (opts.dryRun) {
      console.log(`[dry-run] Would emit OpenCode mode: ${roleId}`);
      count++;
      continue;
    }

    fs.copyFileSync(agentSrc, modeDest);
    count++;
  }

  if (opts.verbose && count > 0) {
    console.log(`Deployed ${count} OpenCode primary modes to ${modesDir}`);
  }

  return count;
}

export async function postDeploy(targetDir, opts) {
  initializeFrameworkWorkspace(targetDir, opts.mode, opts.dryRun, opts.srcRoot);

  if (opts.createAgentsMd) {
    createAgentsMd(targetDir, opts.srcRoot, opts.dryRun);
  }

  // PUW-035 (#1136): emit SDLC primary roles as TUI modes.
  try {
    deployModes(targetDir, opts || {});
  } catch (err) {
    console.warn(`Warning: OpenCode mode deploy failed: ${err && err.message ? err.message : err}`);
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
    deploySkills: shouldDeploySkills,
    deployRules: shouldDeployRules,
    commandsOnly,
    skillsOnly,
    rulesOnly,
    dryRun,
    createAgentsMd: shouldCreateAgentsMd
  } = opts;

  console.log(`\n=== OpenCode Provider ===`);
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

  // Deploy agents to .opencode/agent/
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    console.log(`\nDeploying ${agentFiles.length} agents to .opencode/agent/...`);
    deployAgents(agentFiles, target, opts);
    // Deploy soul companion files alongside agents
    if (soulFiles.length > 0) {
      deploySoulCompanions(soulFiles, path.join(target, paths.agents), opts);
    }
  }

  // Filter commands that collide with skills (skills take precedence)
  const filteredCommands = (shouldDeploySkills || skillsOnly)
    ? filterCommandsAgainstSkills(commandFiles, skillDirs)
    : commandFiles;

  if (shouldDeployCommands || commandsOnly) {
    console.log(`\nDeploying ${filteredCommands.length} commands...`);
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
  kernelSkillsPath,
  support,
  capabilities,
  transformAgent,
  transformCommand,
  mapModel,
  getAgentConfig,
  deployAgents,
  deployCommands,
  deploySkills,
  deployRules,
  createAgentsMd,
  postDeploy,
  getFileExtension,
  deploy
};
