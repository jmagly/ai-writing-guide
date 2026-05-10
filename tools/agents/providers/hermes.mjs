/**
 * Hermes Agent Provider
 *
 * Hermes Agent uses an MCP-based integration model, not traditional file-based
 * provider deployment. AIWG functions as an MCP sidecar that Hermes calls.
 *
 * What this provider DOES deploy:
 *   - Skills: ~/.hermes/skills/ (user-global, for agentic skills callable by Hermes)
 *   - AGENTS.md: project root (lean routing guide that Hermes loads on every turn)
 *
 * What this provider SKIPS:
 *   - Commands: MCP tool surface replaces slash commands
 *   - Rules: Hermes uses AGENTS.md + its own memory system
 *
 * See: docs/integrations/hermes-quickstart.md
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
  listSkillDirs,
  deploySkillDir,
  deploySkillsWithKernelRouting,
  isKernelSkill,
  pruneStaleAiwgSkills,
  computeAllKernelNames,
  deployFiles,
  getAddonSkillDirs,
  normalizeDeploymentMode,
  collectFrameworkArtifacts,
} from './base.mjs';

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'hermes';
export const aliases = [];

export const paths = {
  agents: 'AGENTS.md',                           // Aggregated routing guide at project root
  commands: '',                                   // Not applicable — MCP replaces commands
  // Skills sequestered under ~/.hermes/.aiwg/skills/ — index-driven discovery (#1212).
  skills: path.join(os.homedir(), '.hermes', '.aiwg', 'skills'),
  rules: '',                                      // Not applicable — Hermes uses AGENTS.md
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
// Hermes scanning behavior of nested .aiwg/ has not been independently
// verified (per #1216 out-of-scope note); the kernel-native split is
// preserved for parity with other providers.
export const kernelSkillsPath = path.join(os.homedir(), '.hermes', 'skills');

export const support = {
  agents: 'aggregated',      // Agents aggregated into lean AGENTS.md
  commands: 'none',          // MCP handles this
  skills: 'native',          // ~/.hermes/skills/ is native Hermes skill location
  rules: 'none',             // Not applicable
};

export const capabilities = {
  skills: true,
  rules: false,
  aggregatedOutput: true,
  yamlFormat: false,
  homeDirectoryDeploy: true,  // Skills deploy to home dir
};

// ============================================================================
// Model Mapping (not applicable — Hermes uses local Ollama models)
// ============================================================================

export function mapModel(shorthand, modelCfg, modelsConfig) {
  return shorthand;
}

// ============================================================================
// AGENTS.md Generation
// ============================================================================

/**
 * Generate a lean AGENTS.md for Hermes
 *
 * Hermes loads AGENTS.md on every turn — keep it under 1,000 characters
 * to preserve context budget on 12GB VRAM setups.
 * See: docs/integrations/hermes-quickstart.md (Part 3)
 */
export function generateAgentsMd(agentCount, skillCount, targetDir, opts) {
  const { dryRun } = opts;

  const lines = [
    '# AIWG Integration',
    '',
    'AIWG connected via MCP (`aiwg mcp serve`). Tools: workflow-run, artifact-read,',
    'artifact-write, template-render, agent-list.',
    '',
    '## Route to AIWG When',
    '',
    '- Structured artifacts needed (requirements, architecture, test plans, risk registers)',
    '- Multi-step workflows with phase gates or checkpoints',
    '- Template-driven output that persists across sessions',
    '',
    'Handle in Hermes directly: one-off questions, short tasks, conversation.',
    '',
    '## Memory Boundary',
    '',
    'When AIWG returns an artifact: store path + one-sentence summary in MEMORY.md.',
    'Do NOT copy artifact body text into memory. Reference, don\'t replicate.',
    '',
    'Use `delegate_task(skip_context_files=True, skip_memory=True)` for AIWG workflows.',
    '',
    '## Artifact Store (.aiwg/)',
    '',
    'Fetch on demand via `artifact-read`:',
    '- `requirements/` — use cases, user stories',
    '- `architecture/` — SAD, ADRs',
    '- `planning/` — phase plans',
    '- `testing/` — test strategy',
    '- `security/` — threat models',
  ];

  const output = lines.join('\n');
  const destPath = path.join(targetDir, 'AGENTS.md');

  if (dryRun) {
    console.log(`[dry-run] Would write AGENTS.md (${output.length} chars, ${Math.round(output.length / 4)} tokens estimated)`);
  } else {
    fs.writeFileSync(destPath, output, 'utf8');
    const charCount = output.length;
    const tokenEstimate = Math.round(charCount / 4);
    const budgetNote = charCount <= 1000 ? '✓ within 1,000 char budget' : `⚠ ${charCount} chars — over 1,000 char budget`;
    console.log(`  Created AGENTS.md (${charCount} chars, ~${tokenEstimate} tokens, ${budgetNote})`);
  }

  return 1;
}

// ============================================================================
// Skills Deployment
// ============================================================================

/**
 * Deploy skills with kernel-vs-standard routing (#1212/#1216).
 *
 * Skills are user-global in Hermes, deployed once, available in all
 * projects. Kernel routing per the cross-provider pattern:
 *   - kernel skills → ~/.hermes/skills/         (platform-native, always-loaded)
 *   - standard      → ~/.hermes/.aiwg/skills/   (index-discoverable)
 */
export function deploySkills(skillDirs, opts) {
  const standardDestDir = paths.skills;
  const kernelDestDir = kernelSkillsPath;

  if (!opts.dryRun) {
    console.log(`  Deploying ${skillDirs.length} skills (kernel + standard split)...`);
  }

  deploySkillsWithKernelRouting(skillDirs, standardDestDir, kernelDestDir, opts);
}

// ============================================================================
// Main Deploy Function
// ============================================================================

export async function deploy(opts) {
  const {
    srcRoot,
    target,
    mode,
    deploySkills: shouldDeploySkills,
    skillsOnly,
    dryRun,
  } = opts;

  const normalizedMode = normalizeDeploymentMode(mode);

  if (!opts.quiet) {
    console.log(`\n=== Hermes Agent Provider ===`);
    console.log(`Target: ${target}`);
    console.log(`Skills: ${paths.skills}`);
    console.log(`Mode: ${mode}`);
    console.log(`Architecture: Hermes → MCP → AIWG`);
    console.log('');
  }

  // ── Skills ─────────────────────────────────────────────────────────────────
  if ((shouldDeploySkills || skillsOnly) && !opts.commandsOnly && !opts.rulesOnly) {
    const allSkillDirs = [];

    // Addon skills (aiwg-utils, ralph, etc.)
    allSkillDirs.push(...getAddonSkillDirs(srcRoot));

    // Framework skills
    const artifacts = collectFrameworkArtifacts(srcRoot, normalizedMode, {
      includeAgents: false,
      includeCommands: false,
      includeSkills: true,
      includeRules: false,
    });
    allSkillDirs.push(...(artifacts.skills || []));

    if (allSkillDirs.length > 0) {
      deploySkills(allSkillDirs, opts);
    } else if (!opts.quiet) {
      console.log('  No skills found to deploy');
    }

    // Holistic post-deploy cleanup of stale AIWG-managed kernel skills.
    // Uses the global kernel set (walks all source frameworks/addons),
    // not just this-call's skillDirs, because aiwg use invokes
    // deploy-agents.mjs multiple times. Hermes augments the canonical
    // set with `aiwg-orchestrate` (#1242) — the orchestrate skill is a
    // template-driven convenience install (not part of any framework's
    // skills/), so without this exemption the prune would delete it
    // every time it's auto-installed.
    const desiredKernel = [...computeAllKernelNames(srcRoot), 'aiwg-orchestrate'];
    pruneStaleAiwgSkills(kernelSkillsPath, desiredKernel, opts);
  }

  // ── AGENTS.md ──────────────────────────────────────────────────────────────
  // Generate lean AGENTS.md at project root unless skills-only
  if (!skillsOnly && !opts.commandsOnly && !opts.rulesOnly) {
    const artifacts = collectFrameworkArtifacts(srcRoot, normalizedMode, {
      includeAgents: true,
      includeCommands: false,
      includeSkills: true,
      includeRules: false,
    });
    const agentCount = (artifacts.agents || []).length;
    const skillCount = (artifacts.skills || []).length;
    generateAgentsMd(agentCount, skillCount, target, opts);
  }

  // ── aiwg-orchestrate convenience skill (#1242) ──────────────────────────────
  // First-deploy-only copy: lays down the delegate_task wrapper at
  // ~/.hermes/skills/aiwg-orchestrate/SKILL.md if it isn't already present.
  // The skill provides ~95% per-workflow context reduction by routing AIWG
  // calls through Hermes's `delegate_task` instead of inline MCP. Idempotent
  // on re-run — operator edits are preserved across `aiwg use` invocations.
  if (!skillsOnly && !opts.commandsOnly && !opts.rulesOnly) {
    deployAiwgOrchestrateSkill(srcRoot, opts);
  }

  // ── Post-deployment hint ───────────────────────────────────────────────────
  if (!opts.quiet) {
    console.log('');
    console.log('Commands and rules are served via MCP (not deployed as files).');
    console.log('Next: configure ~/.hermes/config.yaml to connect AIWG MCP server.');
    console.log('See: docs/integrations/hermes-quickstart.md (Part 2)');
  }
}

// ============================================================================
// aiwg-orchestrate auto-install (#1242)
// ============================================================================

/**
 * Copy the aiwg-orchestrate skill template to ~/.hermes/skills/ on first
 * deploy. Skip if a SKILL.md already exists — preserves operator edits and
 * any prior version they're running. Errors during the copy are non-fatal:
 * the rest of the deploy must succeed even if the home dir is read-only or
 * the template is missing in this checkout.
 */
function deployAiwgOrchestrateSkill(srcRoot, opts) {
  const templatePath = path.join(
    srcRoot,
    'agentic',
    'code',
    'frameworks',
    'sdlc-complete',
    'templates',
    'hermes',
    'skills',
    'aiwg-orchestrate',
    'SKILL.md',
  );

  if (!fs.existsSync(templatePath)) {
    if (!opts.quiet) {
      console.log('  aiwg-orchestrate template not present in this build — skipping auto-install');
    }
    return;
  }

  const destDir = path.join(kernelSkillsPath, 'aiwg-orchestrate');
  const destPath = path.join(destDir, 'SKILL.md');

  if (fs.existsSync(destPath)) {
    if (!opts.quiet) {
      console.log(`  aiwg-orchestrate already present at ${destPath} — operator copy preserved`);
    }
    return;
  }

  if (opts.dryRun) {
    if (!opts.quiet) {
      console.log(`  [dry-run] Would install aiwg-orchestrate to ${destPath}`);
    }
    return;
  }

  try {
    ensureDir(destDir);
    const content = fs.readFileSync(templatePath, 'utf8');
    fs.writeFileSync(destPath, content, 'utf8');
    if (!opts.quiet) {
      console.log(`  Installed aiwg-orchestrate to ${destPath} (delegate_task wrapper, 95% context reduction)`);
    }
  } catch (err) {
    if (!opts.quiet) {
      console.log(`  aiwg-orchestrate auto-install skipped: ${err.message}`);
    }
  }
}

// ============================================================================
// File Extension
// ============================================================================

export function getFileExtension(type) {
  return '.md';
}

// ============================================================================
// Content Transformation (passthrough for Hermes — skills use their own format)
// ============================================================================

export function transformAgent(srcPath, content, opts) {
  return content;
}

export function transformCommand(srcPath, content, opts) {
  return content;
}
