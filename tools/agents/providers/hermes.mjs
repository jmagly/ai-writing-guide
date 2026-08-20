/**
 * Hermes Agent Provider
 *
 * Hermes Agent uses file-based deployment for context and skills. AIWG's MCP
 * server is an optional enrichment hook that Hermes can call when configured.
 *
 * What this provider DOES deploy:
 *   - Skills: $HERMES_HOME/skills/ (user-global, for agentic skills callable by Hermes)
 *   - AGENTS.md: project root (full AIWG routing guide referenced by .hermes.md)
 *
 * What this provider SKIPS:
 *   - Commands: Hermes has no AIWG slash-command file surface
 *   - Rules: compressed directives are in AGENTS.md; full bodies via `aiwg show rule`
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
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
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
  listOnDemandRuleFiles,
  renderOnDemandRuleSection,
  stripPlatformsFromContent,
} from './base.mjs';

// ============================================================================
// Hermes home resolution (HERMES_HOME) — #2119
// ============================================================================
//
// Mirrors `hermes_constants.get_hermes_home()` in the Hermes Agent runtime.
// Resolution order (upstream, hermes_constants.py:114-):
//   1. A context-local override installed in-process via
//      set_hermes_home_override() — AIWG runs in a separate node process and
//      cannot observe that token, so step 1 is intentionally NOT part of the
//      cross-process contract.
//   2. The process `HERMES_HOME` env var.
//   3. The platform-native default:
//        win32 → %LOCALAPPDATA%/hermes   (falls back to %USERPROFILE%/AppData/
//                  Local/hermes when LOCALAPPDATA is unset)
//        other → $HOME/.hermes
//
// AIWG reads the env var when `getHermesHome()` is invoked; the module-level
// constants below lock in the value captured at first use so every consumer
// (paths, kernels, orchestrate, legacy migration) sees the same resolved root
// for the life of the process.

/**
 * Resolve the Hermes home directory.
 *
 * Honors HERMES_HOME the way the running Hermes runtime does, so that
 * `aiwg use --provider hermes` writes skills under the same root the live
 * session scans. See #2119 — before this helper, the provider hardcoded
 * `os.homedir()/.hermes` and any operator running Hermes under a non-default
 * HERMES_HOME (multi-profile, hermes-role wrappers, dev containers) got a
 * silently divergent deployment.
 */
export function getHermesHome() {
  const env = (process.env.HERMES_HOME || '').trim();
  if (env) {
    // Match upstream's Path(env) contract exactly. Hermes does not expand a
    // leading `~` or resolve relative values here; both remain relative to the
    // process working directory when the path is consumed.
    return env;
  }
  if (process.platform === 'win32') {
    const localAppData = (process.env.LOCALAPPDATA || '').trim();
    return localAppData
      ? path.join(localAppData, 'hermes')
      : path.join(os.homedir(), 'AppData', 'Local', 'hermes');
  }
  return path.join(os.homedir(), '.hermes');
}

// The value captured below is the target any running Hermes session with the
// same environ would use as its scan root.
const HERMES_HOME = getHermesHome();

// ============================================================================
// Provider Configuration
// ============================================================================

export const name = 'hermes';
export const aliases = [];

export const paths = {
  agents: 'AGENTS.md',                           // Aggregated routing guide at project root
  commands: '',                                   // Not applicable — no AIWG slash-command file surface
  // Standard skills under <HERMES_HOME>/skills/.aiwg/ — child of Hermes's
  // scanned root, recursively discovered (verified `agent/skill_utils.py:478-489`,
  // os.walk follows subdirs except .git/.github/.hub/.archive).
  //
  // HERMES_HOME honors the process env var and falls back to $HOME/.hermes
  // (win32: %LOCALAPPDATA%/hermes), matching hermes_constants.get_hermes_home().
  // #2119: previously hardcoded os.homedir() — wrong for any operator running
  // Hermes under a non-default HERMES_HOME (multi-profile, hermes-role, etc.).
  skills: path.resolve(HERMES_HOME, 'skills', '.aiwg'),
  rules: '',                                      // Inlined into AGENTS.md + reachable via `aiwg show rule`
};

// Kernel skills (always-loaded) deploy to the platform-native dir.
// Standard skills land in the .aiwg/ subdirectory under the same root —
// Hermes recursively walks the skill root (verified against upstream v0.13.0,
// `agent/skill_utils.py:478-489`).
export const kernelSkillsPath = path.resolve(HERMES_HOME, 'skills');

// Resolved home directory this provider's paths were computed against.
// Consumers (deploy verification, doctor, status) should use this rather than
// re-reading os.homedir() to stay consistent with the deploy target.
export const hermesHome = HERMES_HOME;

export const support = {
  agents: 'aggregated',      // Agents aggregated into lean AGENTS.md
  commands: 'none',          // Hermes has no AIWG slash-command file surface
  skills: 'native',          // $HERMES_HOME/skills/ is the native skill location
  rules: 'agents-md+cli',    // compressed in AGENTS.md; full bodies via CLI/MCP
};

export const capabilities = {
  skills: true,
  rules: false,
  aggregatedOutput: true,
  yamlFormat: false,
  homeDirectoryDeploy: true,  // Skills deploy to home dir
};

/**
 * Project portable Agent Skills metadata into Hermes's native frontmatter.
 *
 * The portable Agent Skills contract restricts `metadata` values to strings,
 * while Hermes expects tags at `metadata.hermes.tags`. AIWG stores the tag
 * list as a comma-separated `metadata.hermes-tags` string in source and
 * performs the provider-specific projection only in the deployed copy.
 */
export function transformHermesSkillContent(content) {
  const stripped = stripPlatformsFromContent(content);
  const match = stripped.match(/^---\r?\n([\s\S]*?)\r?\n---(\r?\n|$)/);
  if (!match) return stripped;

  let frontmatter;
  try {
    frontmatter = parseYaml(match[1]);
  } catch {
    return stripped;
  }
  if (!frontmatter || typeof frontmatter !== 'object' || Array.isArray(frontmatter)) {
    return stripped;
  }

  const metadata = frontmatter.metadata;
  const encodedTags = metadata && typeof metadata === 'object' && !Array.isArray(metadata)
    ? metadata['hermes-tags']
    : undefined;
  if (typeof encodedTags !== 'string') return stripped;

  const tags = encodedTags.split(',').map((tag) => tag.trim()).filter(Boolean);
  delete metadata['hermes-tags'];
  metadata.hermes = { tags };

  const body = stripped.slice(match[0].length);
  return `---\n${stringifyYaml(frontmatter).trimEnd()}\n---\n${body}`;
}

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
// Hermes context cap is 20K chars (head-tail truncated above). Hard limit
// to leave headroom for project-specific additions and skill-discovery.
const HERMES_AGENTS_MD_HARD_CAP = 19_000;
const HERMES_AGENTS_MD_SOFT_WARN = 15_000;

/**
 * Top-7 CRITICAL rule directives, inlined into AGENTS.md for guaranteed
 * priming on every Hermes turn (#1318 / S7; skill-discovery added #1347).
 *
 * The full rule bodies are reachable without MCP via `aiwg discover` and
 * `aiwg show rule <name>`; MCP exposes the same path through `rule-list` and
 * `rule-show` when configured (#1320). The bodies exceed Hermes's 20K context
 * cap if inlined verbatim (anti-laziness alone is 32K chars), so we inline
 * compressed directives only and point to CLI/MCP for the full text.
 *
 * Selection criteria: rules tagged CRITICAL/HIGH enforcement level whose
 * violations are silent or destructive (cost of remembering to query
 * rule-show > cost of inlining the directive). skill-discovery is HIGH
 * but is the linchpin of the discover-first architecture across all
 * providers and is therefore inlined alongside the CRITICAL set.
 */
const CRITICAL_RULE_DIRECTIVES = `## CRITICAL Rules (always apply)

These are the highest-enforcement AIWG rules. Full bodies are reachable without
MCP:
- Find rules: \`aiwg discover "rule <topic>" --type rule\`
- Fetch a rule: \`aiwg show rule <name>\`

If the optional MCP sidecar is configured, the same surface is available through
\`mcp_aiwg_rule_list\` and \`mcp_aiwg_rule_show\`.

### Rule: skill-discovery (discover-first protocol)
Before declining a user request as "outside AIWG's scope" or improvising a
workflow from training data, you MUST run \`aiwg discover "<user need>"\`
against the user's need. Most AIWG skills are not in your context; they reach
you through \`aiwg discover\` + \`aiwg show <type> <name>\`. If MCP is available,
\`mcp_aiwg_discover\` and type-specific show tools are equivalent. Run discover
whenever the user mentions AIWG, a framework name (sdlc, research, forensics,
ops, marketing, security-engineering, media-curator, knowledge-base), or
capability keywords (skill, agent, command, rule, workflow).

### Rule: no-attribution
Never add AI-tool attribution to commits, PRs, code, or docs. No \`Co-Authored-By:\`,
no "Generated with", no "Written by [AI tool]". The AI is a tool; tools don't sign
their output. Applies to ALL platforms (Claude, Codex, Copilot, Cursor, etc.).

### Rule: anti-laziness
Never delete tests to make them pass. Never skip/disable tests. Never remove
features instead of fixing them. Never weaken assertions to be meaningless.
Never suppress CI/pipeline signals (\`continue-on-error\`, \`|| true\`, \`set +e\`).
If stuck after 3 honest attempts: escalate with full context, don't shortcut.
Within scope: leave nothing half-done — code + tests + docs + verification.

### Rule: citation-policy
Never fabricate citations, DOIs, URLs, or page numbers. Only cite sources that
exist in the research corpus (.aiwg/research/sources/). Match claim strength
to evidence quality (GRADE): HIGH = "demonstrates"; MODERATE = "suggests";
LOW = "limited evidence"; VERY LOW = "anecdotal". Document research gaps in
.aiwg/research/TODO.md when no source supports a claim.

### Rule: token-security
Never hard-code tokens, API keys, or secrets in source files or commit messages.
Never pass tokens as CLI arguments (visible in process list). Never echo or log
token values. Load from secure files (mode 600) or environment variables. Use
heredoc scope for multi-step operations so tokens don't persist beyond use.
Token files must NEVER be tracked in git (.gitignore enforced).

### Rule: versioning
CalVer format: \`YYYY.M.PATCH\` (e.g., \`2026.5.3\`). NEVER use leading zeros
(\`2026.01.5\` is broken — npm semver rejects it). Tags use \`v\` prefix.
CHANGELOG must use same format. PATCH resets each month.

### Rule: ops-safety
Detect interactive commands and flag for human execution (passwords, LUKS
passphrases, MFA — agents cannot type these). Gate destructive operations
(\`rm -rf\`, \`fdisk\`, \`mkfs\`, partition table changes) behind explicit
human confirmation. Assess blast radius before execution (CRITICAL = multi-host
/ data loss; HIGH = single-host outage). Dry-run first when the tool supports it.
Never cross host boundaries without confirmation.`;

const HERMES_AGENTS_MD_FOOTER = `## Optional MCP Server Surface (\`aiwg mcp serve\`)

MCP is optional. The baseline path is file deploy + \`aiwg discover\` /
\`aiwg show\` from the CLI. MCP exposes the same AIWG catalog and execution
surface as provider-agnostic tools when configured.

**Discovery** (read-only, no project required):
- \`mcp_aiwg_discover\` — semantic search across skills/agents/commands/rules
- \`mcp_aiwg_skill_list\` / \`mcp_aiwg_skill_show\`
- \`mcp_aiwg_command_list\` / \`mcp_aiwg_command_show\`
- \`mcp_aiwg_rule_list\` / \`mcp_aiwg_rule_show\`
- \`mcp_aiwg_agent_list\` / \`mcp_aiwg_agent_show\`
- \`mcp_aiwg_template_list\` / \`mcp_aiwg_template_show\` / \`mcp_aiwg_template_render\`

**Execution** (allow-listed):
- \`mcp_aiwg_command_run\` — dispatches to any of 94 AIWG CLI commands. Destructive
  commands require \`confirmed: true\`.

**Artifacts** (project-required, .aiwg/ directory):
- \`mcp_aiwg_artifact_read\` / \`mcp_aiwg_artifact_write\``;

export function generateAgentsMd(agentCount, skillCount, targetDir, opts) {
  const { dryRun } = opts;

  const header = `# AIWG Integration

AIWG connected through file-based deployment. Native Hermes skills are available
at \`$HERMES_HOME/skills/\` (kernel) and \`$HERMES_HOME/skills/.aiwg/\` (standard).
When unset, \`HERMES_HOME\` defaults to the platform-native Hermes home.
Use \`aiwg discover\` and \`aiwg show <type> <name>\` for the on-demand catalog.
The MCP sidecar (\`aiwg mcp serve\`) is optional.

## Route to AIWG When

- Structured artifacts needed (requirements, architecture, test plans, risk registers)
- Multi-step workflows with phase gates or checkpoints
- Template-driven output that persists across sessions

Handle in Hermes directly: one-off questions, short tasks, conversation.

## Memory Boundary

When AIWG returns an artifact: store path + one-sentence summary in MEMORY.md.
Do NOT copy artifact body text into memory. Reference, don't replicate.

Use \`delegate_task(goal="...", context="...")\` for AIWG workflows.
Child agents automatically exclude context files and memory.

## Artifact Store (.aiwg/)

Fetch on demand via \`mcp_aiwg_artifact_read\`:
- \`requirements/\` — use cases, user stories
- \`architecture/\` — SAD, ADRs
- \`planning/\` — phase plans
- \`testing/\` — test strategy
- \`security/\` — threat models
`;

  // On-demand tier (#1675): the MEDIUM/LOW rules not inlined above. Hermes has
  // no scanned rule dir, so the bridge file notes the tier with fetch hints.
  const onDemandSection = opts.srcRoot
    ? renderOnDemandRuleSection(listOnDemandRuleFiles(opts.srcRoot))
    : '';
  const sections = [header, CRITICAL_RULE_DIRECTIVES];
  if (onDemandSection) sections.push(onDemandSection);
  sections.push(HERMES_AGENTS_MD_FOOTER);
  const output = sections.join('\n\n');
  const destPath = path.join(targetDir, 'AGENTS.md');

  if (output.length > HERMES_AGENTS_MD_HARD_CAP) {
    throw new Error(
      `Hermes AGENTS.md (${output.length} chars) exceeds hard cap of ${HERMES_AGENTS_MD_HARD_CAP}. ` +
      `Hermes truncates above 20K. Trim the priming block or split rule bodies further.`
    );
  }

  if (dryRun) {
    console.log(`[dry-run] Would write AGENTS.md (${output.length} chars, ${Math.round(output.length / 4)} tokens estimated)`);
  } else {
    fs.writeFileSync(destPath, output, 'utf8');
    const charCount = output.length;
    const tokenEstimate = Math.round(charCount / 4);
    let budgetNote;
    if (charCount > HERMES_AGENTS_MD_SOFT_WARN) {
      budgetNote = `⚠ ${charCount} chars — above soft warn (${HERMES_AGENTS_MD_SOFT_WARN}); below hard cap (${HERMES_AGENTS_MD_HARD_CAP})`;
    } else {
      budgetNote = `✓ within budget (cap: ${HERMES_AGENTS_MD_HARD_CAP})`;
    }
    console.log(`  Created AGENTS.md (${charCount} chars, ~${tokenEstimate} tokens, ${budgetNote})`);
  }

  return 1;
}

/**
 * Generate `.hermes.md` thin pointer at the project root (#1319 / S8).
 *
 * Hermes loads `.hermes.md` with priority over `AGENTS.md` (first-match-wins
 * at `agent/prompt_builder.py:1417-1456`). The pointer is short so the
 * actual context payload remains in AGENTS.md which is shared with other
 * tools (Claude Code, Codex, etc.).
 */
export function generateHermesMd(targetDir, opts) {
  const { dryRun } = opts;
  const body = `# Hermes Routing

AIWG project context lives in \`AGENTS.md\` (this file is a thin Hermes pointer).

**Routing**: see \`AGENTS.md\` in this directory.
**MCP**: AIWG is reachable via \`mcp_aiwg_*\` tools.
**Skills**: kernel skills at \`$HERMES_HOME/skills/\`; standard skills at \`$HERMES_HOME/skills/.aiwg/\`.
When unset, \`HERMES_HOME\` defaults to the platform-native Hermes home.

Hermes loads only \`.hermes.md\` when it is present (first-match-wins). Keep
this file minimal; its routing instruction tells the agent to read \`AGENTS.md\`
when the full AIWG project context is needed.
`;
  const destPath = path.join(targetDir, '.hermes.md');
  if (dryRun) {
    console.log(`[dry-run] Would write .hermes.md (${body.length} chars)`);
  } else {
    fs.writeFileSync(destPath, body, 'utf8');
    console.log(`  Created .hermes.md (${body.length} chars)`);
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
 *   - kernel skills → $HERMES_HOME/skills/         (platform-native, always-loaded)
 *   - standard      → $HERMES_HOME/skills/.aiwg/   (recursively walked by Hermes)
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

  // ── Legacy skill path migration (#1316 / S5) ───────────────────────────────
  // Earlier AIWG versions deployed standard skills to ~/.hermes/.aiwg/skills/
  // (sibling of Hermes's scanned root — invisible to Hermes). #1314 moved
  // them to ~/.hermes/skills/.aiwg/ (recursively scanned). This helper
  // detects the legacy path and removes it after the new path is populated,
  // preventing operator confusion and curator-bait.
  if (!skillsOnly || shouldDeploySkills) {
    migrateLegacySkillPath(opts);
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
      // Hermes's skill loader reads `platforms:` as an OS gate
      // (linux / macos / windows). AIWG's shared deploy path injects
      // `[hermes]` into that field, which then filters every skill out
      // on Linux. Strip the field post-injection — hermes documents
      // "absent field = all platforms" as its default. This leaves the
      // other providers' `transformSkillMd` pipeline untouched.
      const skillOpts = {
        ...opts,
        provider: 'hermes', // ensure deploySkillDir's injectPlatform branch runs
        transformSkillMd: transformHermesSkillContent,
      };
      deploySkills(allSkillDirs, skillOpts);
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
    // `computeAllKernelNames` returns null when no AIWG framework/addon tree
    // can be located (e.g. project-local bundle deploy without AIWG_ROOT).
    // Skip both the prune and the manifest update in that case rather than
    // operate on an empty desired set (#123).
    const kernelNames = computeAllKernelNames(srcRoot);
    if (kernelNames != null) {
      const desiredKernel = [...kernelNames, 'aiwg-orchestrate'];
      pruneStaleAiwgSkills(kernelSkillsPath, desiredKernel, opts);

      // Register kernel skills in Hermes's bundled manifest so the Curator
      // (v0.12.0+, 7-day archival cycle) does not archive them. Standard
      // skills under `.aiwg/` are already protected by the dot-prefix rule
      // in tools/skill_usage.py:241-243. (#1317 / S6)
      updateBundledManifest(desiredKernel, opts);
    }
  }

  // ── AGENTS.md + .hermes.md ─────────────────────────────────────────────────
  // Generate AGENTS.md (with inlined CRITICAL rule priming, #1318/#1532)
  // AND .hermes.md thin pointer (resolves #1319 doc-debt, was claimed in
  // CHANGELOG but not previously implemented).
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
    generateHermesMd(target, opts);
  }

  // ── aiwg-orchestrate convenience skill (#1242) ──────────────────────────────
  // First-deploy-only copy: lays down the delegate_task wrapper at
  // $HERMES_HOME/skills/aiwg-orchestrate/SKILL.md if it isn't already present.
  // The skill provides ~95% per-workflow context reduction by routing AIWG
  // calls through Hermes's `delegate_task` instead of inline MCP. Idempotent
  // on re-run — operator edits are preserved across `aiwg use` invocations.
  if (!skillsOnly && !opts.commandsOnly && !opts.rulesOnly) {
    deployAiwgOrchestrateSkill(srcRoot, opts);
  }

  // ── Post-deployment hint ───────────────────────────────────────────────────
  if (!opts.quiet) {
    console.log('');
    console.log(`Skills root: ${kernelSkillsPath}`);
    console.log('Rules are in AGENTS.md as compressed directives; full bodies via `aiwg show rule <name>`.');
    console.log('Optional: configure config.yaml to connect AIWG MCP server.');
    console.log('See: docs/integrations/hermes-quickstart.md (optional MCP setup)');
  }

  // ── Consumer visibility check (#2119) ──────────────────────────────────────
  // The running Hermes runtime reads skills from get_skills_dir(), which is
  // HERMES_HOME/skills (hermes_constants.get_hermes_home: context-local
  // override → HERMES_HOME env → $HOME/.hermes). AIWG can observe only ITS
  // own process environment, so this check reports which root AIWG resolved
  // and warns when that root may be invisible to a Hermes session the
  // operator launched elsewhere (custom HERMES_HOME, hermes-role wrapper).
  //
  // Before #2119 this was a silent failure: AIWG wrote to $HOME/.hermes/skills
  // unconditionally and `aiwg status --probe` reported healthy even when the
  // live session scanned a different HERMES_HOME.
  if (!dryRun && !opts.quiet) {
    const envHome = (process.env.HERMES_HOME || '').trim();
    const hermesActive = Boolean(
      process.env.HERMES_SESSION_ID ||
      (process.env.AI_AGENT || '').includes('hermes')
    );
    if (hermesActive && !envHome) {
      console.warn(`Warning: HERMES_HOME is not set in this AIWG process — deployed skills landed under \`${kernelSkillsPath}\` (default $HOME/.hermes).`);
      console.warn('  If your running Hermes session uses a non-default HERMES_HOME, it CANNOT see these skills.');
      console.warn('  Re-run with the matching value: HERMES_HOME=<that value> aiwg use --provider hermes');
    }
  }
}

// ============================================================================
// Curator protection (#1317 / S6)
// ============================================================================

/**
 * Hermes v0.12.0+ ships an autonomous Curator (`agent/curator.py`) that
 * grades and archives skills on a 7-day cycle. Skills are excluded from
 * archival if either:
 *   (a) they appear in `~/.hermes/skills/.bundled_manifest` (one name per
 *       line, format `name:tag`), or
 *   (b) their path's first component starts with `.` (verified at
 *       `tools/skill_usage.py:241-243`).
 *
 * AIWG standard skills under `~/.hermes/skills/.aiwg/...` are protected
 * by (b) automatically. AIWG kernel skills land at the top level
 * (`~/.hermes/skills/<name>/SKILL.md`) and need explicit (a) registration.
 *
 * This function writes/updates the bundled manifest with the kernel-skill
 * names AIWG owns. Idempotent: existing entries (from Hermes's own bundle
 * or other tools) are preserved.
 */
export function updateBundledManifest(kernelSkillNames, opts) {
  const { dryRun, quiet } = opts;
  const manifestPath = path.join(kernelSkillsPath, '.bundled_manifest');
  const aiwgTag = 'aiwg-managed';

  // Read existing manifest (if any) and split into "ours" vs "theirs"
  let existing = '';
  try {
    existing = fs.readFileSync(manifestPath, 'utf-8');
  } catch {
    existing = '';
  }
  const theirs = [];
  for (const rawLine of existing.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.endsWith(`:${aiwgTag}`)) continue;  // ours — drop, will re-add below
    theirs.push(line);
  }
  const ours = kernelSkillNames.map((n) => `${n}:${aiwgTag}`);

  // Stable order: theirs first (preserve operator/Hermes-bundled order), then ours
  const merged = [...theirs, ...ours].join('\n') + '\n';

  if (dryRun) {
    if (!quiet) {
      console.log(`  [curator] [dry-run] Would write ${manifestPath} with ${ours.length} AIWG kernel + ${theirs.length} preserved entries`);
    }
    return;
  }

  try {
    fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
    fs.writeFileSync(manifestPath, merged, 'utf-8');
    if (!quiet) {
      console.log(`  [curator] Bundled manifest updated: ${ours.length} AIWG kernel skills protected (preserved ${theirs.length} pre-existing entries)`);
    }
  } catch (err) {
    if (!quiet) {
      console.log(`  [curator] Warning: could not write bundled manifest: ${err.message}`);
    }
  }
}

// ============================================================================
// Legacy skill path migration (#1316 / S5)
// ============================================================================

/**
 * Remove the legacy `~/.hermes/.aiwg/skills/` directory if it exists and the
 * new path `~/.hermes/skills/.aiwg/` is populated with AIWG content.
 *
 * Idempotent: re-running after migration is a no-op.
 *
 * Safety:
 *   - Only removes when the new path exists and contains files
 *   - Skips removal if the new path is empty (avoids losing skills during
 *     an in-progress deploy where the new path hasn't been written yet)
 *   - Operates only on the documented legacy path — never touches user-managed
 *     directories under ~/.hermes/
 */
export function migrateLegacySkillPath(opts) {
  const { dryRun, quiet } = opts;
  const legacyPath = path.join(os.homedir(), '.hermes', '.aiwg', 'skills');
  const newPath = paths.skills;

  let legacyExists = false;
  try {
    legacyExists = fs.statSync(legacyPath).isDirectory();
  } catch {
    return; // no legacy path — nothing to migrate
  }
  if (!legacyExists) return;

  // Sanity: new path must exist and be non-empty before we remove the legacy one
  let newPopulated = false;
  try {
    const entries = fs.readdirSync(newPath);
    newPopulated = entries.length > 0;
  } catch {
    newPopulated = false;
  }

  if (!newPopulated) {
    if (!quiet) {
      console.log(`  [migrate] Legacy skills detected at ${legacyPath}; new path not yet populated. Skipping cleanup until next deploy.`);
    }
    return;
  }

  if (dryRun) {
    console.log(`  [migrate] [dry-run] Would remove legacy skill path: ${legacyPath}`);
    return;
  }

  try {
    fs.rmSync(legacyPath, { recursive: true, force: true });
    // Also remove the empty parent if it's now empty
    const parent = path.dirname(legacyPath);
    try {
      const remaining = fs.readdirSync(parent);
      if (remaining.length === 0) {
        fs.rmdirSync(parent);
      }
    } catch {
      // parent removal is best-effort
    }
    if (!quiet) {
      console.log(`  [migrate] Removed legacy skill path: ${legacyPath}`);
    }
  } catch (err) {
    if (!quiet) {
      console.log(`  [migrate] Warning: could not remove legacy path ${legacyPath}: ${err.message}`);
    }
  }
}

// ============================================================================
// aiwg-orchestrate auto-install (#1242)
// ============================================================================

/**
 * Copy the aiwg-orchestrate skill template to $HERMES_HOME/skills/ on first
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
    // Defensive: the template is hermes-specific and should not carry a
    // `platforms:` field (hermes reads that as an OS gate). Strip it if a
    // future template regression reintroduces one so this orphan path
    // stays consistent with the main deploy pipeline.
    fs.writeFileSync(destPath, transformHermesSkillContent(content), 'utf8');
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
