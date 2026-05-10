/**
 * OpenClaw Provider
 *
 * OpenClaw uses an MCP-based integration model similar to Hermes, but with
 * native support for all 5 artifact types including behaviors.
 *
 * What this provider deploys (all user-global, home directory):
 *   - Agents:    ~/.openclaw/agents/     (native agent definitions)
 *   - Commands:  ~/.openclaw/commands/   (slash commands)
 *   - Skills:    ~/.openclaw/skills/     (NLP-triggered capabilities)
 *   - Rules:     ~/.openclaw/rules/      (context-loaded constraints)
 *   - Behaviors: ~/.openclaw/behaviors/  (reactive capabilities with hooks + scripts)
 *
 * OpenClaw is the first platform to support behaviors natively.
 * Behaviors are a new AIWG artifact type: reactive capabilities with scripts
 * and event hooks that fire automatically when system events occur.
 *
 * See: docs/openclaw-guide.md
 */

import realFs from 'fs';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
let fs;
try { const gfs = _require('graceful-fs'); gfs.gracefulify(realFs); fs = realFs; } catch { fs = realFs; }
import path from 'path';
import os from 'os';
import {
  ensureDir,
  listMdFiles,
  listMdFilesRecursive,
  listSkillDirs,
  deploySkillDir,
  deploySkillsWithKernelRouting,
  isKernelSkill,
  pruneStaleAiwgSkills,
  computeAllKernelNames,
  deployFiles,
  getAddonAgentFiles,
  getAddonCommandFiles,
  getAddonSkillDirs,
  getAddonRuleFiles,
  assembleRulesIndex,
  normalizeDeploymentMode,
  collectFrameworkArtifacts,
  cleanupOldRuleFiles,
  filterAgentFiles,
  filterCommandsAgainstSkills,
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'openclaw';
export const aliases = [];

const openclawHome = path.join(os.homedir(), '.openclaw');

export const paths = {
  agents: path.join(openclawHome, 'agents'),
  commands: path.join(openclawHome, 'commands'),
  // Skills sequestered under ~/.openclaw/.aiwg/skills/ — index-driven discovery (#1212).
  skills: path.join(openclawHome, '.aiwg', 'skills'),
  rules: path.join(openclawHome, 'rules'),
  behaviors: path.join(openclawHome, 'behaviors'),
  // Per ADR-3 + PUW-008/009: native hook loader path.
  // BEHAVIOR.md → HOOK.md + handler.js translation lands here.
  hooks: path.join(openclawHome, 'hooks'),
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
// Critical for OpenClaw: DEFAULT_MAX_SKILLS_IN_PROMPT = 150, so the
// kernel set must come in under that floor (~9 today, well under cap).
export const kernelSkillsPath = path.join(openclawHome, 'skills');

export const support = {
  agents: 'native',
  commands: 'native',
  skills: 'native',
  rules: 'native',
  behaviors: 'native',
};

export const capabilities = {
  skills: true,
  rules: true,
  behaviors: true,
  aggregatedOutput: false,
  yamlFormat: false,
  homeDirectoryDeploy: true,
};

// ============================================================================
// Model Mapping (passthrough — OpenClaw uses its own model config)
// ============================================================================

export function mapModel(shorthand, modelCfg, modelsConfig) {
  return shorthand;
}

// ============================================================================
// Content Transformation (passthrough — OpenClaw uses AIWG native format)
// ============================================================================

export function transformAgent(srcPath, content, opts) {
  return content;
}

export function transformCommand(srcPath, content, opts) {
  return content;
}

// ============================================================================
// Deployment Functions
// ============================================================================

/**
 * Deploy agents to ~/.openclaw/agents/
 */
function deployAgents(agentFiles, opts) {
  ensureDir(paths.agents, opts.dryRun);
  return deployFiles(agentFiles, paths.agents, { ...opts, injectPlatform: true }, transformAgent);
}

/**
 * Deploy commands to ~/.openclaw/commands/
 */
function deployCommands(commandFiles, opts) {
  ensureDir(paths.commands, opts.dryRun);
  return deployFiles(commandFiles, paths.commands, opts, transformCommand);
}

/**
 * Deploy skills with kernel-vs-standard routing (#1212/#1216).
 *
 * OpenClaw is the binding constraint for the kernel pivot:
 * `DEFAULT_MAX_SKILLS_IN_PROMPT = 150` is the hard cap. The kernel set
 * (one quickref per installed framework + core utility set, ~9 today)
 * fits comfortably under that floor regardless of how many frameworks
 * are installed.
 *
 *   - kernel skills → ~/.openclaw/skills/aiwg/<name>     (platform-native, always-loaded)
 *   - standard      → ~/.openclaw/.aiwg/skills/<name>    (index-discoverable, hidden from flat scan)
 *
 * The legacy `aiwg/` 2-level namespacing under the kernel path (PUW-025
 * #1126) is preserved to avoid collision with non-AIWG ClaWHub installs.
 */
function deploySkills(skillDirs, opts) {
  // Standard: ~/.openclaw/.aiwg/skills/ (no extra aiwg/ — the .aiwg/ segment IS the namespace)
  const standardDestDir = paths.skills;
  // Kernel: ~/.openclaw/skills/aiwg/ (preserves legacy 2-level namespacing)
  const kernelDestDir = path.join(kernelSkillsPath, 'aiwg');

  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);

  // PUW-012 (#1113): also deploy to project-local .agents/skills/ as a
  // cross-agent compatibility path. OpenClaw's primary deploy is the
  // home-dir namespaced layout above; this secondary surface lets other
  // tools running on the same project pick up the same skills via the
  // universal `.agents/skills/<name>/SKILL.md` discovery convention.
  //
  // Honors #1217 no-copy default: filter to kernel-only unless the
  // operator opts in via env var so standard skills stay at $AIWG_ROOT
  // and are reached via `aiwg discover`.
  const copyStandardSkills = opts?.copyStandardSkills === true;
  const crossAgentSkills = copyStandardSkills
    ? skillDirs
    : skillDirs.filter(d => isKernelSkill(d));
  if (crossAgentSkills.length > 0) {
    const crossAgentDir = path.join(process.cwd(), '.agents', 'skills');
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
 * Deploy rules to ~/.openclaw/rules/
 */
function deployRules(ruleFiles, opts) {
  ensureDir(paths.rules, opts.dryRun);
  cleanupOldRuleFiles(paths.rules, opts);
  return deployFiles(ruleFiles, paths.rules, opts, transformCommand);
}

/**
 * Deploy behaviors to ~/.openclaw/behaviors/
 *
 * Behaviors are directories containing BEHAVIOR.md and a scripts/ subdirectory.
 * Each behavior directory is copied wholesale to the target.
 */
function deployBehaviors(behaviorDirs, opts) {
  ensureDir(paths.behaviors, opts.dryRun);

  let count = 0;
  for (const behaviorDir of behaviorDirs) {
    const behaviorName = path.basename(behaviorDir);
    const destDir = path.join(paths.behaviors, behaviorName);

    if (opts.dryRun) {
      console.log(`[dry-run] Would deploy behavior: ${behaviorName} -> ${destDir}`);
      count++;
      continue;
    }

    ensureDir(destDir);

    // Copy BEHAVIOR.md
    const behaviorMd = path.join(behaviorDir, 'BEHAVIOR.md');
    if (fs.existsSync(behaviorMd)) {
      fs.copyFileSync(behaviorMd, path.join(destDir, 'BEHAVIOR.md'));
    }

    // Copy scripts/ directory if it exists
    const scriptsDir = path.join(behaviorDir, 'scripts');
    if (fs.existsSync(scriptsDir)) {
      const destScriptsDir = path.join(destDir, 'scripts');
      ensureDir(destScriptsDir);

      for (const entry of fs.readdirSync(scriptsDir)) {
        const srcFile = path.join(scriptsDir, entry);
        const destFile = path.join(destScriptsDir, entry);
        if (fs.statSync(srcFile).isFile()) {
          fs.copyFileSync(srcFile, destFile);
          // Preserve executable permission for scripts
          try { fs.chmodSync(destFile, 0o755); } catch { /* ignore on platforms without chmod */ }
        }
      }
    }

    count++;
  }

  // PUW-008/PUW-009 (#1109/#1110) per ADR-3: also emit hook artifacts to
  // ~/.openclaw/hooks/<name>/ so OpenClaw's native hook loader picks them
  // up. The behaviors/ writes above keep happening per always-deploy
  // invariant (operator visibility); hooks/ is the discovery bridge.
  try {
    ensureDir(paths.hooks, opts.dryRun);
    if (!opts.dryRun) {
      // Lazy import so this is only loaded when behaviors exist.
      import('./openclaw-translator.mjs').then((mod) => {
        let translated = 0;
        const skipped = [];
        for (const behaviorDir of behaviorDirs) {
          const behaviorName = path.basename(behaviorDir);
          const hookDir = path.join(paths.hooks, behaviorName);
          const r = mod.translateBehaviorToHook(behaviorDir, hookDir, opts);
          if (r.ok) translated++;
          else skipped.push({ name: behaviorName, reason: r.reason });
        }
        if (translated > 0) {
          console.log(`Translated ${translated} behavior(s) to OpenClaw hooks at ${paths.hooks}`);
        }
        if (skipped.length > 0 && opts.verbose) {
          for (const s of skipped) {
            console.log(`Skipped hook translation for ${s.name}: ${s.reason}`);
          }
        }
      }).catch((err) => {
        console.warn(`Warning: hook translation failed: ${err.message || err}`);
      });
    }
  } catch (err) {
    console.warn(`Warning: hook deployment skipped: ${err.message || err}`);
  }

  return count;
}

// ============================================================================
// Behavior Discovery
// ============================================================================

/**
 * List behavior directories (directories containing BEHAVIOR.md)
 */
function listBehaviorDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(dir, e.name, 'BEHAVIOR.md')))
    .map((e) => path.join(dir, e.name));
}

/**
 * Collect behavior directories from all sources:
 * - Cross-framework: agentic/code/behaviors/
 * - Per-framework: agentic/code/frameworks/<name>/behaviors/
 */
function collectBehaviorDirs(srcRoot, mode) {
  const dirs = [];

  // Cross-framework behaviors
  const globalBehaviorsDir = path.join(srcRoot, 'agentic', 'code', 'behaviors');
  dirs.push(...listBehaviorDirs(globalBehaviorsDir));

  // Per-framework behaviors
  const frameworksDir = path.join(srcRoot, 'agentic', 'code', 'frameworks');
  if (fs.existsSync(frameworksDir)) {
    for (const entry of fs.readdirSync(frameworksDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const fwBehaviorsDir = path.join(frameworksDir, entry.name, 'behaviors');
      dirs.push(...listBehaviorDirs(fwBehaviorsDir));
    }
  }

  return dirs;
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
    mode,
    deployCommands: shouldDeployCommands,
    deploySkills: shouldDeploySkills,
    deployRules: shouldDeployRules,
    commandsOnly,
    skillsOnly,
    rulesOnly,
    dryRun,
  } = opts;

  const verbose = opts.verbose || false;

  if (!opts.quiet) {
    console.log(`\n=== OpenClaw Provider ===`);
    console.log(`Deploy target: ${openclawHome}`);
    console.log(`Mode: ${mode}`);
    console.log(`Architecture: OpenClaw -> MCP -> AIWG`);
    console.log('');
  }

  const normalizedMode = normalizeDeploymentMode(mode);

  // ── Collect source artifacts ──────────────────────────────────────────────
  const agentFiles = [];
  const commandFiles = [];
  const skillDirs = [];
  const ruleFiles = [];

  // Addon artifacts
  if (normalizedMode === 'general' || normalizedMode === 'sdlc' || normalizedMode === 'both' || normalizedMode === 'all') {
    agentFiles.push(...getAddonAgentFiles(srcRoot));
    if (shouldDeployCommands || commandsOnly) commandFiles.push(...getAddonCommandFiles(srcRoot));
    if (shouldDeploySkills || skillsOnly) skillDirs.push(...getAddonSkillDirs(srcRoot));
    if (shouldDeployRules || rulesOnly) ruleFiles.push(...getAddonRuleFiles(srcRoot));
  }

  // Framework artifacts
  const frameworkArtifacts = collectFrameworkArtifacts(srcRoot, normalizedMode, {
    includeAgents: true,
    includeCommands: shouldDeployCommands || commandsOnly,
    includeSkills: shouldDeploySkills || skillsOnly,
    includeRules: shouldDeployRules || rulesOnly,
    recursiveCommands: true,
    consolidatedSdlcRules: true,
  });
  agentFiles.push(...frameworkArtifacts.agents);
  commandFiles.push(...frameworkArtifacts.commands);
  skillDirs.push(...frameworkArtifacts.skills);
  ruleFiles.push(...frameworkArtifacts.rules);

  // Behaviors (OpenClaw-specific — first provider to support this)
  const behaviorDirs = collectBehaviorDirs(srcRoot, normalizedMode);

  // ── Deploy ────────────────────────────────────────────────────────────────
  const counts = { agents: 0, commands: 0, skills: 0, rules: 0, behaviors: 0 };

  // Agents
  if (!commandsOnly && !skillsOnly && !rulesOnly) {
    const filteredAgents = filterAgentFiles(agentFiles, opts);
    if (verbose) console.log(`\nDeploying ${filteredAgents.length} agents to ${paths.agents}...`);
    deployAgents(filteredAgents, opts);
    counts.agents = filteredAgents.length;
  }

  // Commands (filter collisions with skills)
  const filteredCommands = (shouldDeploySkills || skillsOnly)
    ? filterCommandsAgainstSkills(commandFiles, skillDirs)
    : commandFiles;

  if (shouldDeployCommands || commandsOnly) {
    if (verbose) console.log(`\nDeploying ${filteredCommands.length} commands to ${paths.commands}...`);
    deployCommands(filteredCommands, opts);
    counts.commands = filteredCommands.length;
  }

  // Skills
  if (shouldDeploySkills || skillsOnly) {
    if (verbose) console.log(`\nDeploying ${skillDirs.length} skills to ${paths.skills}/aiwg/ (PUW-025 namespaced)...`);
    deploySkills(skillDirs, opts);
    counts.skills = skillDirs.length;

    // Holistic post-deploy cleanup of stale AIWG-managed kernel
    // skills (renamed/removed sources). Runs once per deploy with the
    // global desired-kernel set so it survives multi-call orchestration
    // (`aiwg use` invokes deploy-agents.mjs once per framework + addon
    // batch).
    {
      const _kernelDestDir = path.isAbsolute(kernelSkillsPath)
        ? kernelSkillsPath
        : path.join(target, kernelSkillsPath);
      pruneStaleAiwgSkills(_kernelDestDir, computeAllKernelNames(srcRoot), opts);
    }
  }

  // Rules
  if (shouldDeployRules || rulesOnly) {
    const assembled = assembleRulesIndex(srcRoot);
    if (assembled) {
      const { tmpdir } = await import('os');
      const tmpDir = fs.mkdtempSync(path.join(tmpdir(), 'aiwg-rules-assembly-'));
      const assembledPath = path.join(tmpDir, 'RULES-INDEX.md');
      fs.writeFileSync(assembledPath, assembled);

      const finalRuleFiles = [
        assembledPath,
        ...ruleFiles.filter(f => path.basename(f) !== 'RULES-INDEX.md'),
      ];

      if (verbose) console.log(`\nDeploying assembled RULES-INDEX.md + ${finalRuleFiles.length - 1} additional rule files...`);
      deployRules(finalRuleFiles, opts);
      counts.rules = finalRuleFiles.length;

      try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch { /* ignore */ }
    } else {
      if (verbose) console.log(`\nDeploying ${ruleFiles.length} rules to ${paths.rules}...`);
      deployRules(ruleFiles, opts);
      counts.rules = ruleFiles.length;
    }
  }

  // Behaviors (always deploy if available — OpenClaw is the first native behaviors platform)
  if (!commandsOnly && !skillsOnly && !rulesOnly && behaviorDirs.length > 0) {
    if (verbose) console.log(`\nDeploying ${behaviorDirs.length} behaviors to ${paths.behaviors}...`);
    counts.behaviors = deployBehaviors(behaviorDirs, opts);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  if (verbose) {
    console.log('\n=== OpenClaw deployment complete ===\n');
  } else {
    const parts = [];
    if (counts.agents > 0) parts.push(`${counts.agents} agents`);
    if (counts.commands > 0) parts.push(`${counts.commands} commands`);
    if (counts.skills > 0) parts.push(`${counts.skills} skills`);
    if (counts.rules > 0) parts.push(`${counts.rules} rules`);
    if (counts.behaviors > 0) parts.push(`${counts.behaviors} behaviors`);
    if (parts.length > 0) {
      console.log(`  Deployed: ${parts.join('  ')}`);
    }
  }

  // ── Post-deployment hint ──────────────────────────────────────────────────
  if (!opts.quiet) {
    console.log('');
    console.log('All artifacts deployed to ~/.openclaw/ (user-global).');
    console.log('Next: configure ~/.openclaw/config.yaml to connect AIWG MCP server.');
    console.log('See: docs/openclaw-guide.md');
  }
}

// ============================================================================
// Plugin Bundle Generation (OpenClaw / ClawHub)
// ============================================================================

/**
 * Generate a `clawhub.json` manifest for the ClawHub registry.
 *
 * ClawHub is OpenClaw's central package registry. AIWG generates the manifest
 * alongside file deployment; publishing to ClawHub is a separate workflow
 * (not yet implemented — publish via ClawHub CLI manually for now).
 *
 * @param {string} targetDir - Where to write clawhub.json
 * @param {{ dryRun?: boolean, srcRoot?: string, name?: string, version?: string, description?: string, tags?: string[] }} opts
 */
export function generatePluginBundle(targetDir, opts = {}) {
  const {
    dryRun = false,
    srcRoot = process.cwd(),
    name: pluginName = 'aiwg-plugin',
    version: overrideVersion,
    description = 'AIWG plugin for OpenClaw',
    tags = ['aiwg', 'multi-agent'],
  } = opts;

  // Resolve version
  let version = overrideVersion;
  if (!version) {
    try {
      const pkgPath = path.join(srcRoot, 'package.json');
      if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        version = pkg.version || 'unknown';
      } else {
        version = 'unknown';
      }
    } catch {
      version = 'unknown';
    }
  }

  const manifest = {
    name: pluginName,
    version,
    description,
    author: 'AIWG Contributors',
    license: 'MIT',
    homepage: 'https://aiwg.io',
    repository: 'https://github.com/jmagly/aiwg',
    tags,
    contents: {
      agents: '~/.openclaw/agents/',
      commands: '~/.openclaw/commands/',
      skills: '~/.openclaw/skills/',
      rules: '~/.openclaw/rules/',
      behaviors: '~/.openclaw/behaviors/',
    },
  };

  const manifestPath = path.join(targetDir, 'clawhub.json');

  if (dryRun) {
    console.log(`[dry-run] Would create ${manifestPath}`);
    return { manifestPath, manifest };
  }

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log(`Generated OpenClaw ClawHub manifest: ${manifestPath}`);
  return { manifestPath, manifest };
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
  getFileExtension,
  generatePluginBundle,
  deploy,
};
