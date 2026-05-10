/**
 * Use Command Handler
 *
 * Deploys AIWG frameworks (SDLC, Marketing, Writing) to the current project.
 * After deployment, registers deployed extensions in the extension registry.
 *
 * @implements @.aiwg/architecture/decisions/ADR-001-unified-extension-system.md
 * @implements #56, #57
 * @source @src/cli/router.ts
 * @issue #33
 */

import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { createScriptRunner } from './script-runner.js';
import { getFrameworkRoot, getVersionInfo } from '../../channel/manager.mjs';
import { getRegistry } from '../../extensions/registry.js';
import { registerDeployedExtensions } from '../../extensions/deployment-registration.js';
import { registerCliCommands, registerHooks } from '../cli-extension-loader.js';
import { translateSkillsToCommands, providerNeedsCommands } from '../../plugin/skill-command-translator.js';
import * as ui from '../ui.js';
import { readAiwgConfig, writeAiwgConfig, updateInstalled, hashManifest, emptyConfig, getProjectDir } from '../../config/aiwg-config.js';
import { getLogger } from '../log.js';
import { initHandler } from './init.js';
import {
  checkCollisions,
  formatCollisionReport,
  hasBlockingCollisions,
} from '../../smiths/skillsmith/collision-detector.js';
import {
  discoverProjectLocalBundles,
  type ProjectLocalBundle,
} from '../../extensions/project-local-discovery.js';
import { buildUpstreamRegistry } from '../../extensions/upstream-registry.js';
import {
  resolveShadows,
  formatShadowReport,
} from '../../extensions/shadow-resolver.js';
import {
  appendProjectLocalActivity,
  emitDiscoverEventsDeduped,
} from '../../extensions/project-local-activity.js';
import { hashBundleArtifacts } from '../../extensions/project-local-remove.js';
import { installAiwgHooks } from '../../extensions/claude-hooks-installer.js';
import { detectScope, mirrorToUserScope, rejectOpenClawProjectScope } from '../scope-resolver.js';
// Context-pipeline: emits AIWG.md + AGENTS.md as the last step of `aiwg use`
// for non-Claude providers per ADR-1 (.aiwg/architecture/adr-agents-md-aggregation.md).
// Distinct from agentsmith (which creates subagent personas).
import {
  generate as generateContextFiles,
  discoverDeployedArtifacts,
  shouldEmitContextFiles,
} from '../../smiths/context-pipeline/index.js';
import type { Platform } from '../../agents/types.js';

/**
 * Valid framework identifiers
 */
const VALID_FRAMEWORKS = ['sdlc', 'marketing', 'media-curator', 'research', 'forensics', 'security-engineering', 'ops', 'knowledge-base', 'writing', 'general', 'all'] as const;
type Framework = typeof VALID_FRAMEWORKS[number];

/**
 * Framework name to deploy mode mapping.
 * Mode is passed as `--mode <value>` to deploy-agents.mjs, which resolves
 * to the actual framework via discoverFrameworks() + modeAliases.
 */
const MODE_MAP: Record<Framework, string> = {
  sdlc: 'sdlc',
  marketing: 'marketing',
  'media-curator': 'media-curator',
  research: 'research',
  forensics: 'forensics',
  'security-engineering': 'security-engineering',
  ops: 'ops-complete',      // ops-complete manifest id is 'ops-complete' (modeAlias: ops)
  'knowledge-base': 'knowledge-base',
  writing: 'general',
  general: 'general',
  all: 'all',
};

/**
 * Framework name to actual directory name under agentic/code/frameworks/.
 * Used for path construction in collision checks, CI hooks, and version tracking.
 * Frameworks without a dedicated directory (writing, general) map to undefined —
 * those code paths are skipped gracefully.
 */
const FRAMEWORK_DIR_MAP: Partial<Record<string, string>> = {
  sdlc: 'sdlc-complete',
  marketing: 'media-marketing-kit',
  'media-curator': 'media-curator',
  research: 'research-complete',
  forensics: 'forensics-complete',
  'security-engineering': 'security-engineering',
  ops: 'ops-complete',
  'knowledge-base': 'knowledge-base',
  // 'writing' and 'general' have no backing framework directory
  // 'all' falls back to sdlc for manifest/CI purposes
  all: 'sdlc-complete',
};

/** Resolve actual framework directory name for a given user-facing name. */
function resolveFrameworkDir(framework: string): string | undefined {
  return FRAMEWORK_DIR_MAP[framework];
}

/**
 * Addons excluded from `aiwg use all`.
 * aiwg-dev is contributor-only tooling — not for end users.
 */
export const USE_ALL_DISALLOW = new Set(['aiwg-dev']);

/**
 * Discover all addon names from the filesystem, minus the disallow list.
 */
export async function getAllAddons(frameworkRoot: string): Promise<string[]> {
  const addonsDir = path.join(frameworkRoot, 'agentic/code/addons');
  const entries = await fs.readdir(addonsDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !USE_ALL_DISALLOW.has(e.name))
    .map(e => e.name);
}

/**
 * Extensions excluded from `aiwg use all` deployment.
 * `api-adapter` is an OpenAPI spec, not a deployable artifact bundle.
 */
export const USE_ALL_EXTENSIONS_DISALLOW = new Set(['api-adapter']);

/**
 * Discover all extension names from `agentic/code/extensions/*` (#1221).
 *
 * Extensions are addon-shaped bundles with their own `manifest.json`,
 * `skills/`, `rules/`, and `templates/` directories. Only directories
 * containing a `manifest.json` are considered deployable; bare directories
 * (e.g. `api-adapter` which only ships an OpenAPI spec) are skipped.
 */
export async function getAllExtensions(frameworkRoot: string): Promise<string[]> {
  const extensionsDir = path.join(frameworkRoot, 'agentic/code/extensions');
  let entries: import('fs').Dirent[];
  try {
    entries = await fs.readdir(extensionsDir, { withFileTypes: true });
  } catch {
    return [];
  }
  const result: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (USE_ALL_EXTENSIONS_DISALLOW.has(entry.name)) continue;
    const manifestPath = path.join(extensionsDir, entry.name, 'manifest.json');
    try {
      await fs.access(manifestPath);
      result.push(entry.name);
    } catch {
      // Directory without a manifest is not deployable as an extension.
      continue;
    }
  }
  return result;
}

/**
 * Resolve extension source path from its name.
 */
export function extensionPath(frameworkRoot: string, name: string): string {
  return path.join(frameworkRoot, 'agentic/code/extensions', name);
}

/**
 * Check whether a given addon name exists on disk.
 * The USE_ALL_DISALLOW list does NOT block explicit single-addon installs —
 * contributors can still run `aiwg use aiwg-dev` directly.
 */
/** Resolve canonical addon folder name from user-supplied alias. */
function resolveAddonFolderName(name: string): string {
  const ADDON_ALIASES: Record<string, string> = {
    // ring-methodology has always been invokable as 'ring'
    'ring': 'ring-methodology',
    // agent-loop addon — 'al' and 'ralph' are legacy aliases
    'al': 'agent-loop',
    'ralph': 'agent-loop',
  };
  return ADDON_ALIASES[name] ?? name;
}

export async function isValidAddon(frameworkRoot: string, name: string): Promise<boolean> {
  try {
    const folderName = resolveAddonFolderName(name);
    const stat = await fs.stat(path.join(frameworkRoot, 'agentic/code/addons', folderName));
    return stat.isDirectory();
  } catch {
    return false;
  }
}

/**
 * Resolve addon source path from its name.
 * Handles known aliases (ring, al, agent-loop).
 */
export function addonPath(frameworkRoot: string, name: string): string {
  const folderName = resolveAddonFolderName(name);
  return path.join(frameworkRoot, 'agentic/code/addons', folderName);
}

/**
 * Provider to deployment paths mapping
 *
 * The `behaviors` field tracks where behavior artifacts are deployed per provider.
 * OpenClaw is the first platform with native behavior support (~/.openclaw/behaviors/).
 * Other providers receive behaviors via emulation: Claude Code via .claude/hooks/,
 * Warp via aggregation into WARP.md (empty string = aggregated, not file-per-behavior),
 * all others via the provider rules directory.
 *
 * @implements #609
 */
const PROVIDER_PATHS: Record<string, { agents: string; skills: string; commands: string; rules: string; behaviors: string }> = {
  claude: {
    agents: '.claude/agents',
    // Skills hidden under .claude/.aiwg/skills so Claude Code's flat-namespace
    // skill-listing budget doesn't truncate them. Discovery is index-driven
    // via `aiwg index` (epic #1212). Kernel skills (always-loaded set) deploy
    // separately to .claude/skills/ for native platform discovery.
    skills: '.claude/.aiwg/skills',
    commands: '.claude/commands',
    rules: '.claude/rules',
    behaviors: '.claude/hooks',  // Emulated via hook wrapper
  },
  factory: {
    agents: '.factory/droids',
    // Skills hidden under .aiwg/ for index-driven discovery (#1212)
    skills: '.factory/.aiwg/skills',
    commands: '.factory/commands',
    rules: '.factory/rules',
    behaviors: '.factory/rules', // Emulated via session wrapper in rules dir
  },
  codex: {
    agents: '.codex/agents',
    skills: '.codex/.aiwg/skills',
    commands: '.codex/commands',
    rules: '.codex/rules',
    behaviors: '.codex/rules',   // Emulated via session wrapper
  },
  opencode: {
    agents: '.opencode/agent',  // Discovered via {agent,agents}/**/*.md glob (#773)
    skills: '.opencode/.aiwg/skill',
    commands: '.opencode/command', // OpenCode scans .opencode/command/**/*.md via ConfigCommand.load() (PUW-006 #1107)
    rules: '.opencode/rule',
    behaviors: '.opencode/rule', // Emulated via session wrapper
  },
  copilot: {
    agents: '.github/agents',
    skills: '.github/.aiwg/skills',
    commands: '.github/commands',
    rules: '.github/copilot-rules',
    behaviors: '.github/copilot-rules', // Emulated via session wrapper
  },
  cursor: {
    agents: '.cursor/agents',
    skills: '.cursor/.aiwg/skills',
    commands: '.cursor/commands',
    rules: '.cursor/rules',
    behaviors: '.cursor/rules',  // Emulated via session wrapper
  },
  warp: {
    agents: '.warp/agents',
    skills: '.warp/.aiwg/skills',
    commands: '.warp/commands',
    rules: '.warp/rules',
    behaviors: '',               // Aggregated into WARP.md behaviors section
  },
  windsurf: {
    agents: '.windsurf/agents',
    skills: '.windsurf/.aiwg/skills',
    commands: '.windsurf/workflows',
    rules: '.windsurf/rules',
    behaviors: '.windsurf/rules', // Emulated via session wrapper
  },
  hermes: {
    agents: '',                                                              // Aggregated into AGENTS.md at project root
    // The .aiwg/ subdir is the legacy sequester (#1212) for non-kernel
    // standard skills. Post-rc.14 kernel pivot, kernel skills land one
    // level up at ~/.hermes/skills/<name>/ where Hermes natively scans;
    // this `.aiwg/skills/` path stays empty in current deploys but is
    // preserved here for the legacy mirror code path. See #1241.
    skills: path.join(os.homedir(), '.hermes', '.aiwg', 'skills'),
    commands: '',                                                            // Served via MCP, not file-deployed
    rules: '',                                                               // Not applicable — Hermes uses AGENTS.md
    behaviors: '',                                                           // Not yet supported
  },
  openclaw: {
    agents: path.join(os.homedir(), '.openclaw', 'agents'),
    // Sequestered under ~/.openclaw/.aiwg/skills/ for index-driven discovery
    // (#1212). OpenClaw's 150-skill cap is the binding constraint; the kernel
    // set goes to ~/.openclaw/skills/aiwg/<name> (preserved by the provider's
    // own deploySkills, not represented here).
    skills: path.join(os.homedir(), '.openclaw', '.aiwg', 'skills'),
    commands: path.join(os.homedir(), '.openclaw', 'commands'),
    rules: path.join(os.homedir(), '.openclaw', 'rules'),
    behaviors: path.join(os.homedir(), '.openclaw', 'behaviors'), // Native behavior support
  },
};

/**
 * List skill folder names from a source skills directory.
 * Returns empty array if the directory doesn't exist.
 */
async function listSourceSkillNames(skillsDir: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(skillsDir, { withFileTypes: true });
    return entries.filter(e => e.isDirectory()).map(e => e.name);
  } catch {
    return [];
  }
}

/**
 * Run pre-deployment collision check for a framework or addon.
 * Emits warnings/errors to stderr. Returns false if deployment should be blocked.
 */
async function runPreDeployCollisionCheck(opts: {
  frameworkRoot: string;
  framework: string;
  target: string;
  provider: string;
  force: boolean;
  skipConflicts: boolean;
  verbose?: boolean;
}): Promise<boolean> {
  const { frameworkRoot, framework, target, provider, force, verbose = false } = opts;

  // Resolve source skills dir for this framework
  const frameworkDirName = resolveFrameworkDir(framework);
  if (!frameworkDirName) return true; // no backing directory — skip collision check
  const sourceSkillsDir = path.join(
    frameworkRoot,
    'agentic/code/frameworks',
    frameworkDirName,
    'skills'
  );

  const skillNames = await listSourceSkillNames(sourceSkillsDir);
  if (skillNames.length === 0) return true; // nothing to check

  const providerPaths = PROVIDER_PATHS[provider] ?? PROVIDER_PATHS.claude;
  const skillsBaseDir = path.isAbsolute(providerPaths.skills)
    ? providerPaths.skills
    : path.join(target, providerPaths.skills);

  const results = await checkCollisions({
    platform: provider as any,
    projectPath: target,
    skillNames,
    namespace: 'aiwg',
    skillsBaseDir,
    sourceSkillsDir,
  });

  const report = formatCollisionReport(results, { verbose });
  if (report) {
    process.stderr.write(report + '\n');
  }

  if (hasBlockingCollisions(results) && !force) {
    process.stderr.write('\nDeployment blocked. Use --force to override.\n');
    return false;
  }

  return true;
}

/**
 * Framework-specific next steps guidance
 *
 * Keyed as `<provider>/<framework>` with fallback to `<framework>`.
 * The 'claude' provider is the default (shown for all unrecognized providers).
 */
const NEXT_STEPS: Record<string, string[]> = {
  // Claude Code (default)
  //
  // Standard skills no longer deploy as slash commands. Reach AIWG
  // capabilities through `aiwg discover` (CLI) or natural-language
  // requests (the agent queries the index for you).
  'sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Browse via Claude: open Claude and ask for the "accelerated SDLC" or "create intake"',
    'Direct CLI:        aiwg sdlc-accelerate "Your project idea"',
    'Check health:      aiwg doctor',
  ],
  'marketing': [
    'Find a skill:      aiwg discover "<marketing need>"',
    'Browse via Claude: ask for "marketing intake" or "campaign kickoff" — agent queries the index',
    'Check health:      aiwg doctor',
  ],
  'media-curator': [
    'Find a skill:      aiwg discover "<media task>"',
    'Browse via Claude: ask "analyze [artist] discography" or "find sources for [content]"',
    'Check health:      aiwg doctor',
  ],
  'research': [
    'Find a skill:      aiwg discover "<research task>"',
    'Browse via Claude: ask "research workflow" or "induct [paper]" — agent queries the index',
    'Check health:      aiwg doctor',
  ],
  'security-engineering': [
    'Find a skill:      aiwg discover "<security decision>"',
    'Crypto primitives: ask "choose AEAD" or "ad-hoc KDF review"',
    'Chain of trust:    ask "review the boot chain" or "signed bootstrap design"',
    'Decision template: agentic/code/frameworks/security-engineering/templates/cryptographic-decisions.md',
    'Check health:      aiwg doctor',
  ],
  'all': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Browse via Claude: open Claude and describe your need — agent queries the index',
    'Direct CLI:        aiwg sdlc-accelerate "Your project idea"',
    'Check health:      aiwg doctor',
  ],

  // Hermes Agent (MCP-based)
  // Verified against Hermes v0.4.0+ source (hermes_cli/main.py:10860 —
  // mcp subcommand surface is `serve`, `add`, `remove`, `list`, `test`,
  // `configure`; no `install` subcommand). #1243.
  'hermes/sdlc': [
    'Connect via MCP:   hermes mcp add aiwg --command aiwg --args mcp serve',
    '   (or manual:     add aiwg to ~/.hermes/config.yaml — see `aiwg mcp info`)',
    'Start Hermes:      hermes chat "Create an architecture decision for..."',
    'MCP guide:         docs/integrations/hermes-quickstart.md',
  ],
  'hermes/marketing': [
    'Connect via MCP:   hermes mcp add aiwg --command aiwg --args mcp serve',
    '   (or manual:     add aiwg to ~/.hermes/config.yaml — see `aiwg mcp info`)',
    'Start Hermes:      hermes chat "Create a marketing campaign for..."',
    'MCP guide:         docs/integrations/hermes-quickstart.md',
  ],
  'hermes/all': [
    'Connect via MCP:   hermes mcp add aiwg --command aiwg --args mcp serve',
    '   (or manual:     add aiwg to ~/.hermes/config.yaml — see `aiwg mcp info`)',
    'Start Hermes:      hermes chat',
    'AIWG MCP guide:   docs/integrations/hermes-quickstart.md',
  ],

  // Factory AI
  'factory/sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Open Factory:      factory (droids deployed; ask for "accelerated SDLC")',
    'Direct CLI:        aiwg sdlc-accelerate "Your project idea"',
    'Check health:      aiwg doctor',
  ],

  // Cursor
  'cursor/sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Open Cursor:       cursor . (agents in .cursor/agents/; ask for "accelerated SDLC")',
    'Direct CLI:        aiwg sdlc-accelerate "Your project idea"',
    'Check health:      aiwg doctor',
  ],

  // Warp Terminal
  'warp/sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Open Warp:         warp (agents/commands aggregated into WARP.md)',
    'Direct CLI:        aiwg sdlc-accelerate "Your project idea"',
    'Check health:      aiwg doctor',
  ],

  // GitHub Copilot
  'copilot/sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Open VS Code:      code . (Copilot agents in .github/agents/)',
    'Copilot chat:      @workspace use the SDLC workflow agents',
    'Check health:      aiwg doctor',
  ],

  // OpenAI Codex
  'codex/sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Open Codex:        codex (agents in .codex/agents/, prompts in ~/.codex/prompts/)',
    'Direct CLI:        aiwg sdlc-accelerate "Your project idea"',
    'Check health:      aiwg doctor',
  ],

  // Windsurf
  'windsurf/sdlc': [
    'Find a skill:      aiwg discover "<what you want to do>"',
    'Open Windsurf:     AGENTS.md and .windsurf/ are ready',
    'Ask Cascade:       "accelerated SDLC for my project" — agent queries the index',
    'Check health:      aiwg doctor',
  ],

  // OpenClaw
  'openclaw/sdlc': [
    'Configure MCP:     Add aiwg to ~/.openclaw/config.yaml (see docs/openclaw-guide.md)',
    'Start OpenClaw:    openclaw (agents, skills, commands, rules, behaviors deployed)',
    'Verify:            openclaw skills list | grep aiwg',
  ],
  'openclaw/marketing': [
    'Configure MCP:     Add aiwg to ~/.openclaw/config.yaml (see docs/openclaw-guide.md)',
    'Start OpenClaw:    openclaw (marketing agents and skills deployed)',
    'Verify:            openclaw skills list | grep aiwg',
  ],
  'openclaw/all': [
    'Configure MCP:     Add aiwg to ~/.openclaw/config.yaml (see docs/openclaw-guide.md)',
    'Start OpenClaw:    openclaw (all frameworks deployed)',
    'Full guide:        docs/openclaw-guide.md',
  ],
};

function printNextSteps(framework: Framework, provider: string = 'claude'): void {
  // Try provider-specific first, fall back to generic
  const providerKey = `${provider}/${framework}`;
  const steps = NEXT_STEPS[providerKey] ?? NEXT_STEPS[framework] ?? NEXT_STEPS.sdlc;
  ui.section('Next steps:', steps);
}

/**
 * Per-provider session-reload requirement after `aiwg use`.
 *
 * Most agentic platforms read their `<provider>/agents/` directory at session
 * start and cache the agent registry for the lifetime of the session. A
 * deploy that lands new agent files is invisible to any session that was
 * already running when the deploy completed — the Agent / Task tool will
 * still report `Agent type 'foo' not found` until the session reloads.
 *
 * Issue #1240: surfacing this requirement in `aiwg use` output and in the
 * Steward FAQ so operators stop hitting the "fallback to general-purpose"
 * path silently.
 */
const SESSION_RELOAD_NOTICE: Record<string, { action: string; rationale: string; symptom?: string }> = {
  claude: {
    action: 'Restart your Claude Code session (close and reopen) to load the newly deployed agents.',
    rationale: 'Claude Code reads .claude/agents/ at session start. A running session retains its old registry until reloaded.',
  },
  codex: {
    action: 'Restart your Codex session to pick up newly deployed agents and home-dir skills.',
    rationale: 'Codex caches its agent and skill registry per session. ~/.codex/skills/ and .codex/agents/ are scanned on startup.',
  },
  copilot: {
    action: 'Reload the VS Code window (`Developer: Reload Window`) so Copilot picks up the new .github/agents/ entries.',
    rationale: 'VS Code/Copilot caches workspace agent definitions until the window reloads.',
  },
  cursor: {
    action: 'Restart Cursor (close and reopen the project) to load the newly deployed agents.',
    rationale: 'Cursor reads .cursor/agents/ and .cursor/rules/ on workspace open.',
  },
  warp: {
    action: 'Open a fresh Warp tab — WARP.md is re-read on tab start.',
    rationale: 'Warp aggregates context from WARP.md when a new tab spawns; existing tabs keep the prior version.',
  },
  windsurf: {
    action: 'Restart Windsurf or reload the workspace so the aggregated AGENTS.md is re-parsed.',
    rationale: 'Windsurf reads AGENTS.md once per workspace session.',
  },
  factory: {
    action: 'Restart your Factory droid runtime to pick up new entries in .factory/droids/.',
    rationale: 'Factory caches the droid manifest at runtime start.',
  },
  opencode: {
    action: 'Restart your OpenCode session — `.opencode/agent/` is scanned on startup.',
    rationale: 'OpenCode loads agent files on session start and does not hot-reload.',
  },
  hermes: {
    action: 'In an active Hermes session, run /reload-skills to pick up new skills in ~/.hermes/skills/ and /reload-mcp to pick up MCP server changes (~/.hermes/config.yaml) — both are in-session slash commands, no chat restart needed. Restart the chat only as a fallback if the slash commands are unavailable.',
    rationale: 'Hermes loads skills and MCP config at session start (verified in hermes_cli/commands.py:178 and hermes_cli/config.py:1228). The /reload-skills and /reload-mcp slash commands re-scan in place; /reload-mcp prompts for confirmation by default.',
    symptom: 'Until reloaded, newly deployed kernel skills are missing from `hermes skills list` and unreachable via natural-language invocation; new MCP servers (incl. AIWG) are missing from the tool surface.',
  },
  openclaw: {
    action: 'Restart OpenClaw — ~/.openclaw/agents/ and ~/.openclaw/skills/ are loaded on startup.',
    rationale: 'OpenClaw reads its home-dir registry once per process.',
  },
};

function printSessionReloadNotice(provider: string): void {
  const notice = SESSION_RELOAD_NOTICE[provider];
  if (!notice) return;
  const defaultSymptom =
    'Until reloaded, the Agent/Task tool will report "Agent type not found" for the newly deployed agents.';
  ui.section('Session reload required:', [
    notice.action,
    `Why: ${notice.rationale}`,
    notice.symptom ?? defaultSymptom,
  ]);
}

/**
 * Count deployed artifacts in target directories
 *
 * @implements #609
 */
async function countDeployedArtifacts(
  target: string,
  paths: { agents: string; skills: string; commands: string; rules: string; behaviors: string }
): Promise<{ agents: number; commands: number; skills: number; rules: number; behaviors: number }> {
  const countMd = async (dir: string): Promise<number> => {
    if (!dir) return 0;
    try {
      // Support absolute paths (openclaw deploys to home dir)
      const resolvedDir = path.isAbsolute(dir) ? dir : path.join(target, dir);
      const entries = await fs.readdir(resolvedDir);
      return entries.filter(f => f.endsWith('.md')).length;
    } catch {
      return 0;
    }
  };
  const countDirs = async (dir: string): Promise<number> => {
    if (!dir) return 0;
    try {
      const resolvedDir = path.isAbsolute(dir) ? dir : path.join(target, dir);
      const entries = await fs.readdir(resolvedDir, { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).length;
    } catch {
      return 0;
    }
  };
  // Count rules by parsing declared counts from RULES-INDEX.md files rather
  // than counting .md files on disk. When deployIndexOnly is true, only one
  // RULES-INDEX.md is deployed but it declares the total count of rules across
  // all installed components via section headers like "## Name (N rules — ...)".
  const countRules = async (dir: string): Promise<number> => {
    if (!dir) return 0;
    try {
      const resolvedDir = path.isAbsolute(dir) ? dir : path.join(target, dir);
      const entries = await fs.readdir(resolvedDir);
      const indexFiles = entries.filter(f => f.endsWith('RULES-INDEX.md'));
      if (indexFiles.length === 0) {
        // No index files — fall back to counting individual rule .md files
        return entries.filter(f => f.endsWith('.md')).length;
      }
      let total = 0;
      for (const indexFile of indexFiles) {
        const content = await fs.readFile(path.join(resolvedDir, indexFile), 'utf-8');
        // Match section headers: "## Name (N rules — ..." or "— N rules*"
        const matches = content.matchAll(/\((\d+) rules[^)]*\)/g);
        for (const m of matches) {
          total += parseInt(m[1], 10);
        }
      }
      return total > 0 ? total : entries.filter(f => f.endsWith('.md')).length;
    } catch {
      return 0;
    }
  };
  // Kernel skills deploy to the platform-native skills dir (always-loaded
  // set) while standard skills sequester under <provider>/.aiwg/skills (the
  // index-driven discovery tier). Both contribute to the deployed surface,
  // so both must be counted (#1228). Derive the kernel path by stripping
  // the `.aiwg/` segment from the standard path.
  const kernelSkillsPath = paths.skills
    ? paths.skills.replace(/(^|\/)\.aiwg\/skills?$/, '$1skills')
    : '';
  return {
    agents: await countMd(paths.agents),
    commands: await countMd(paths.commands),
    skills:
      (await countDirs(paths.skills)) +
      (kernelSkillsPath && kernelSkillsPath !== paths.skills
        ? await countDirs(kernelSkillsPath)
        : 0),
    rules: await countRules(paths.rules),
    behaviors: await countDirs(paths.behaviors),
  };
}

/**
 * Detect forge targets from .git/config remote URLs.
 * Returns a list of forge types found: 'github' | 'gitea'
 *
 * @implements #661
 */
async function detectForges(projectDir: string): Promise<Array<'github' | 'gitea'>> {
  const forges = new Set<'github' | 'gitea'>();
  try {
    const gitConfig = await fs.readFile(path.join(projectDir, '.git', 'config'), 'utf-8');
    if (/github\.com/i.test(gitConfig)) forges.add('github');
    // Gitea: any non-github remote host (self-hosted instances)
    const remoteUrls = [...gitConfig.matchAll(/url\s*=\s*(.+)/g)].map(m => m[1].trim());
    for (const url of remoteUrls) {
      if (!url.includes('github.com') && (url.includes('git.') || url.includes('.net') || url.includes('.io'))) {
        forges.add('gitea');
      }
    }
  } catch {
    // No .git/config — default to github only
    forges.add('github');
  }
  return [...forges];
}

/**
 * Deploy CI workflow files to .github/workflows/ and/or .gitea/workflows/
 * when --ci-hooks-enabled is set.
 *
 * @implements #661
 */
async function deployCiHooks(opts: {
  frameworkRoot: string;
  framework: string;
  target: string;
  dryRun: boolean;
}): Promise<void> {
  const { frameworkRoot, framework, target, dryRun } = opts;

  // Resolve framework source dir
  const ciFrameworkDir = resolveFrameworkDir(framework);
  if (!ciFrameworkDir) return; // no backing directory — nothing to deploy
  const frameworkDir = path.join(
    frameworkRoot,
    'agentic/code/frameworks',
    ciFrameworkDir
  );

  // Read CI manifest from framework manifest.json
  let ciSpec: { github?: string[]; gitea?: string[] } = {};
  try {
    const manifestPath = path.join(frameworkDir, 'manifest.json');
    const manifestContent = await fs.readFile(manifestPath, 'utf-8');
    const manifest = JSON.parse(manifestContent) as { ci?: { github?: string[]; gitea?: string[] } };
    ciSpec = manifest.ci ?? {};
  } catch {
    // No CI spec in manifest — nothing to deploy
    return;
  }

  if (Object.keys(ciSpec).length === 0) return;

  const forges = await detectForges(target);
  const ciSourceDir = path.join(frameworkDir, 'ci');

  const forgeMap: Array<{ forge: 'github' | 'gitea'; targetDir: string; files: string[] }> = [
    { forge: 'github', targetDir: path.join(target, '.github', 'workflows'), files: ciSpec.github ?? [] },
    { forge: 'gitea', targetDir: path.join(target, '.gitea', 'workflows'), files: ciSpec.gitea ?? [] },
  ];

  let deployed = 0;
  for (const { forge, targetDir, files } of forgeMap) {
    if (!forges.includes(forge) || files.length === 0) continue;

    if (!dryRun) {
      await fs.mkdir(targetDir, { recursive: true });
    }

    for (const file of files) {
      const src = path.join(ciSourceDir, forge, file);
      const dest = path.join(targetDir, path.basename(file));
      if (dryRun) {
        console.log(`  [dry-run] Would copy CI file: ${src} → ${dest}`);
      } else {
        try {
          await fs.copyFile(src, dest);
          deployed++;
        } catch {
          ui.warn(`Could not copy CI file: ${file} (source missing in framework — skipping)`);
        }
      }
    }
  }

  if (!dryRun && deployed > 0) {
    ui.blank();
    ui.warn(`CI hooks installed (${deployed} file(s)). Review before committing — they affect your CI pipeline.`);
  }
}

/**
 * Count artifacts contributed by a single project-local bundle by reading the
 * bundle's source directories. Approximates what deploy-agents.mjs writes to
 * the provider deploy paths for this specific bundle (skills are subdirs;
 * everything else is .md files).
 *
 * @implements #1035
 */
async function countBundleSourceArtifacts(
  bundlePath: string
): Promise<{ agents: number; commands: number; skills: number; rules: number }> {
  const countMd = async (dir: string): Promise<number> => {
    try {
      const entries = await fs.readdir(path.join(bundlePath, dir));
      return entries.filter(f => f.endsWith('.md')).length;
    } catch {
      return 0;
    }
  };
  const countDirs = async (dir: string): Promise<number> => {
    try {
      const entries = await fs.readdir(path.join(bundlePath, dir), { withFileTypes: true });
      return entries.filter(e => e.isDirectory()).length;
    } catch {
      return 0;
    }
  };
  return {
    agents: await countMd('agents'),
    commands: await countMd('commands'),
    skills: await countDirs('skills'),
    rules: await countMd('rules'),
  };
}

/**
 * Deploy a single project-local bundle to one provider via deploy-agents.mjs.
 * Runs the same script and flags used for upstream addons, with the bundle
 * directory as the `--source`. Idempotent — overwrites prior deploys.
 *
 * @implements #1035
 */
async function deployOneProjectLocalBundle(opts: {
  bundle: ProjectLocalBundle;
  ctx: HandlerContext;
  frameworkRoot: string;
  provider: string;
  target: string;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
}): Promise<{ exitCode: number; counts: { agents: number; commands: number; skills: number; rules: number } }> {
  const { bundle, ctx, frameworkRoot, provider, target, dryRun, verbose, quiet } = opts;

  const runner = createScriptRunner(frameworkRoot);
  const args: string[] = [
    '--source', bundle.bundlePath,
    '--deploy-commands', '--deploy-skills', '--deploy-rules',
    '--provider', provider,
    '--target', target,
    // Project-local skills MUST land in the per-project skills tier
    // (#1228 follow-up). Default deploy mode after #1217 is no-copy +
    // index-driven discovery, but that model assumes upstream skills at
    // $AIWG_ROOT — project-local bundles live under the project's .aiwg/
    // tree and aren't reachable via `aiwg discover` of the framework
    // graph. Without --copy-all, the bundle's rules deploy but its skills
    // never reach <provider>/.aiwg/skills/, leaving them invisible to
    // both the platform and the index.
    '--copy-all',
  ];
  if (dryRun) args.push('--dry-run');
  if (verbose) args.push('--verbose');
  if (quiet && !verbose) args.push('--quiet');
  // Project-local bundles are addon-shaped — never trigger the legacy commands
  // migration prompt (which is only relevant for full-framework deploys).
  args.push('--skip-commands-migration');

  const captureOpts = quiet && !verbose ? { capture: true } : {};
  const result = await runner.run('tools/agents/deploy-agents.mjs', args, captureOpts);

  // Approximate counts from the bundle's source dirs (deploy-agents.mjs is
  // idempotent and copies file-for-file from these dirs)
  const counts = await countBundleSourceArtifacts(bundle.bundlePath);
  void ctx;
  return { exitCode: result.exitCode, counts };
}

/**
 * Discover and deploy all project-local bundles from `.aiwg/{extensions,addons,
 * frameworks,plugins}/<id>/` for one provider. Updates `aiwg.config.installed`
 * with `source: 'project-local'` entries.
 *
 * Returns the number of bundles deployed and any deploy errors.
 *
 * @implements #1035
 */
async function deployProjectLocalBundles(opts: {
  ctx: HandlerContext;
  frameworkRoot: string;
  projectDir: string;
  provider: string;
  target: string;
  dryRun: boolean;
  verbose: boolean;
  quiet: boolean;
  /** When set, restrict to the bundle whose id matches. */
  onlyBundleId?: string;
}): Promise<{ deployed: number; failed: number; bundles: ProjectLocalBundle[] }> {
  const { ctx, frameworkRoot, projectDir, provider, target, dryRun, verbose, quiet, onlyBundleId } = opts;

  const discovery = await discoverProjectLocalBundles(projectDir);

  if (discovery.errors.length > 0 && !quiet) {
    ui.warn(`Project-local discovery surfaced ${discovery.errors.length} validation error(s) — run 'aiwg list --project-local' for details`);
  }

  const targetBundles = onlyBundleId
    ? discovery.bundles.filter(b => b.id === onlyBundleId)
    : discovery.bundles;

  if (targetBundles.length === 0) {
    return { deployed: 0, failed: 0, bundles: [] };
  }

  // #1037/#1049 — Activity log: emit `discover` for newly-seen bundles
  // (deduped against recent log tail to avoid spam on repeated commands).
  if (!dryRun) {
    await emitDiscoverEventsDeduped(targetBundles.map(b => ({ id: b.id, type: b.type })));
  }

  // #1036 — Resolve shadows against the upstream registry before any deploy.
  // Refuse to deploy bundles that contain a safety-critical shadow without an
  // explicit `overrides:` declaration, or that share an artifact id with another
  // project-local bundle, or that declare a phantom override.
  const upstream = await buildUpstreamRegistry({ frameworkRoot });
  const shadowResult = await resolveShadows(targetBundles, upstream);
  const report = formatShadowReport(shadowResult);
  if (report) {
    process.stderr.write(report + '\n');
  }

  // #1037/#1049 — Activity log per shadow resolution
  if (!dryRun) {
    for (const r of shadowResult.resolutions) {
      if (r.verdict === 'deploy') continue; // no-collision case is silent
      const bundle = targetBundles.find(b => b.id === r.bundleId);
      if (!bundle) continue;
      const event = r.verdict === 'deploy-acknowledged'
        ? 'shadow-acknowledged'
        : r.verdict === 'refuse-unsafe' || r.verdict === 'refuse-phantom' || r.verdict === 'refuse-duplicate'
          ? 'shadow-refused'
          : 'conflict';
      await appendProjectLocalActivity({
        event,
        name: bundle.id,
        type: bundle.type,
        summary: `${r.verdict}: ${r.artifactType}/${r.artifactId}${r.upstream ? ` overrides ${r.upstream.source}` : ''}`,
      });
    }
  }

  let deployed = 0;
  let failed = 0;

  for (const bundle of targetBundles) {
    if (shadowResult.blockedBundleIds.has(bundle.id)) {
      failed++;
      ui.warn(`Refused to deploy project-local bundle '${bundle.id}' due to shadow-resolution policy (see ── above ──)`);
      continue;
    }

    if (verbose || dryRun) {
      const action = dryRun ? '[dry-run] Would deploy' : 'Deploying';
      console.log(`${action} project-local ${bundle.type} '${bundle.id}' from ${bundle.localPath} → ${provider}`);
    }

    const result = await deployOneProjectLocalBundle({
      bundle, ctx, frameworkRoot, provider, target, dryRun, verbose, quiet,
    });

    if (result.exitCode !== 0) {
      failed++;
      ui.warn(`Failed to deploy project-local bundle '${bundle.id}' (exit ${result.exitCode})`);
      if (!dryRun) {
        await appendProjectLocalActivity({
          event: 'deploy-failed',
          name: bundle.id,
          type: bundle.type,
          summary: `${provider}: exit ${result.exitCode}`,
        });
      }
      continue;
    }

    deployed++;

    if (!dryRun) {
      const c = result.counts;
      await appendProjectLocalActivity({
        event: 'deploy',
        name: bundle.id,
        type: bundle.type,
        summary: `${provider}: agents=${c.agents} commands=${c.commands} skills=${c.skills} rules=${c.rules}`,
      });
    }

    // Persist registry entry (skip in dry-run — no side effects)
    if (!dryRun) {
      try {
        const config = await readAiwgConfig(projectDir);
        if (!config) continue;
        // Hash the bundle's manifest.json for stale detection
        const manifestAbsPath = path.join(bundle.bundlePath, 'manifest.json');
        const mHash = await hashManifest(manifestAbsPath);
        // #1037 — record per-artifact source hashes so `aiwg remove` can
        // detect pristine vs mutated vs replaced deployed files.
        const artifactHashes = await hashBundleArtifacts(bundle.bundlePath);
        const updated = updateInstalled(config, bundle.id, provider, result.counts, {
          version: bundle.manifest.version,
          source: 'project-local',
          manifestHash: mHash,
          localPath: bundle.localPath,
          localType: bundle.type,
          manifestVersion: bundle.manifest.manifestVersion,
          artifactHashes,
        });
        await writeAiwgConfig(projectDir, updated);
      } catch (err) {
        // Non-fatal: deploy already succeeded
        ui.warn(`Project-local registry update failed for '${bundle.id}': ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { deployed, failed, bundles: targetBundles };
}

/**
 * Use command handler
 *
 * Deploys framework agents, commands, and skills to the current project,
 * then registers them in the extension registry for discovery.
 */
export class UseHandler implements CommandHandler {
  id = 'use';
  name = 'Use Framework';
  description = 'Deploy AIWG framework to current project';
  category = 'framework' as const;
  aliases: string[] = [];

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const framework = ctx.args[0];
    const remainingArgs = ctx.args.slice(1);

    // Structured logger for this invocation. Records go to both stderr (if
    // verbose level) and ~/.aiwg/logs/aiwg-YYYY-MM-DD.jsonl with full
    // provenance (invocation_id, aiwg_version, git_sha, etc.). #925.
    const log = getLogger('cli:use', { framework: framework ?? '<all>' });
    const span = log.span('use');

    // Resolve --prefix as alias for --target (#734)
    // --prefix is more intuitive for "deploy to a project directory" in cloud-init/CI
    const prefixIdx = remainingArgs.findIndex(a => a === '--prefix');
    if (prefixIdx >= 0 && remainingArgs[prefixIdx + 1]) {
      // Rewrite --prefix to --target for downstream compatibility
      remainingArgs[prefixIdx] = '--target';
    }

    // Read project config for config-first resolution (#621).
    // projectDir resolution uses the shared helper so --target/--prefix,
    // ctx.cwd, and process.cwd() fallback are handled consistently across
    // handlers (#919 cleanup).
    const targetFlagIdx = remainingArgs.findIndex(a => a === '--target');
    const targetDir = targetFlagIdx >= 0 && remainingArgs[targetFlagIdx + 1]
      ? remainingArgs[targetFlagIdx + 1]
      : null;
    const projectDir = getProjectDir(ctx, remainingArgs);
    let config = await readAiwgConfig(projectDir);

    // Auto-init when no config found (#720)
    // Check early for --provider/--platform and --providers flags
    const _providerFlagIdx = remainingArgs.findIndex(a => a === '--provider' || a === '--platform');
    const _hasExplicitProvider = _providerFlagIdx >= 0 && !!remainingArgs[_providerFlagIdx + 1];
    const _providersFlagIdx = remainingArgs.findIndex(a => a === '--providers');
    const _providersValue = _providersFlagIdx >= 0 ? remainingArgs[_providersFlagIdx + 1] : null;

    // Bulk/automation intent: `aiwg use all` and `aiwg use --yes` skip the
    // init wizard and use sensible defaults so CLI calls never hang waiting
    // on a detached terminal. Users who want the wizard run `aiwg init`.
    const _isBulkIntent = framework === 'all'
      || remainingArgs.includes('--yes')
      || remainingArgs.includes('-y')
      || remainingArgs.includes('--non-interactive');

    if (!config) {
      if (_providersValue) {
        // --providers shorthand: write config without wizard
        const pList = _providersValue === 'default'
          ? ['claude']
          : _providersValue.split(',').map(s => s.trim()).filter(Boolean);
        config = emptyConfig(pList.length > 0 ? pList : ['claude']);
        await writeAiwgConfig(projectDir, config);
      } else if (_isBulkIntent || targetDir || _hasExplicitProvider || !process.stdin.isTTY) {
        // Non-interactive: auto-create minimal config with explicit provider or default (#734)
        // When --prefix/--target is set, or `use all`, or --yes is passed, we're in
        // automated mode — no wizard, no prompts, no way to hang on stdin.
        const autoProvider = _hasExplicitProvider ? remainingArgs[_providerFlagIdx + 1] : 'claude';
        config = emptyConfig([autoProvider]);
        await writeAiwgConfig(projectDir, config);
        if (_isBulkIntent && framework === 'all') {
          ui.dim(`  No .aiwg/aiwg.config found — auto-created with provider '${autoProvider}'. Run 'aiwg init' to customize.`);
        }
      } else if (process.stdin.isTTY) {
        // Interactive terminal with no config → run init wizard inline (#720)
        const initResult = await initHandler.execute({ ...ctx, args: [] });
        if (initResult.exitCode !== 0) return initResult;
        config = await readAiwgConfig(projectDir);
      }
    }

    // Zero-arg form: `aiwg use` with no framework → redeploy all installed to all providers
    if (!framework) {
      if (!config || Object.keys(config.installed).length === 0) {
        const advisory = !config
          ? "\n\nRun 'aiwg init' to configure providers and track deployments."
          : '';
        return {
          exitCode: 1,
          message: `Error: Framework, addon, or extension name required\nFrameworks: sdlc, marketing, media-curator, research, forensics, security-engineering, ops, knowledge-base, all\nAddons: rlm, ring, daemon, aiwg-dev (full list: \`aiwg list\`)\nExtensions: sys, net, it, sec, stream, dev (full list: \`ls $AIWG_ROOT/agentic/code/extensions\`)\n'all' deploys every framework + every addon + every extension.${advisory}`,
        };
      }
      const installedNames = Object.keys(config.installed);
      const redeployProviders = config.providers.length > 0 ? config.providers : ['claude'];
      ui.blank();
      ui.header(`  Redeploying ${installedNames.length} framework(s) to ${redeployProviders.join(', ')}...`);
      for (const name of installedNames) {
        for (const p of redeployProviders) {
          const result = await this.execute({ ...ctx, args: [name, '--provider', p] });
          if (result.exitCode !== 0) return result;
        }
      }
      return { exitCode: 0 };
    }

    const frameworkRoot = await getFrameworkRoot();
    const isFramework = VALID_FRAMEWORKS.includes(framework as Framework);
    const isAddon = !isFramework && await isValidAddon(frameworkRoot, framework);
    // Extensions live in `agentic/code/extensions/<name>/` and are addon-shaped
    // bundles. We treat them as addons for deployment purposes (#1222) — when
    // the user runs `aiwg use sys` we resolve to the extension source dir and
    // deploy via the addon code path below by remapping `addonPath()` lookup.
    const isExtension = !isFramework && !isAddon
      && (await getAllExtensions(frameworkRoot)).includes(framework);

    // Project-local bundle resolution: when the name doesn't match an upstream
    // framework, addon, or extension, check `.aiwg/{extensions,addons,
    // frameworks,plugins}/<id>/` for a matching bundle. (#1035)
    if (!isFramework && !isAddon && !isExtension) {
      const discovery = await discoverProjectLocalBundles(projectDir);
      const match = discovery.bundles.find(b => b.id === framework);
      if (match) {
        const providerIdx = remainingArgs.findIndex(a => a === '--provider' || a === '--platform');
        const explicitProvider = providerIdx >= 0 && remainingArgs[providerIdx + 1] ? remainingArgs[providerIdx + 1] : null;
        const dryRunSingle = remainingArgs.includes('--dry-run');
        const verboseSingle = remainingArgs.includes('--verbose') || remainingArgs.includes('-v');
        const targetIdxSingle = remainingArgs.findIndex(a => a === '--target');
        const targetSingle = targetIdxSingle >= 0 && remainingArgs[targetIdxSingle + 1] ? remainingArgs[targetIdxSingle + 1] : process.cwd();

        // Multi-provider expansion mirrors the framework path
        let providersForSingle: string[];
        if (explicitProvider) providersForSingle = [explicitProvider];
        else if (config && config.providers.length > 0) providersForSingle = config.providers;
        else providersForSingle = ['claude'];

        let totalDeployed = 0;
        let totalFailed = 0;
        for (const p of providersForSingle) {
          const r = await deployProjectLocalBundles({
            ctx, frameworkRoot, projectDir, provider: p, target: targetSingle,
            dryRun: dryRunSingle, verbose: verboseSingle, quiet: !verboseSingle && !dryRunSingle,
            onlyBundleId: framework,
          });
          totalDeployed += r.deployed;
          totalFailed += r.failed;
        }

        if (!verboseSingle && !dryRunSingle) {
          ui.blank();
          ui.success(`project-local ${match.type} '${match.id}' deployed (${totalDeployed} provider(s))`);
        }
        return {
          exitCode: totalFailed > 0 ? 1 : 0,
          message: totalFailed > 0 ? `${totalFailed} project-local deploy(s) failed` : '',
        };
      }

      return {
        exitCode: 1,
        message: `Error: Unknown target '${framework}'\nFrameworks: ${VALID_FRAMEWORKS.join(', ')}\n\n'all' deploys every framework + every addon + every extension.\nFor a single addon, run 'aiwg list' to see available addons.\nFor extensions (sys, net, it, sec, stream, dev), see $AIWG_ROOT/agentic/code/extensions/.\nFor project-local artifacts, run 'aiwg list --project-local'.\nRun 'aiwg help' for usage information.`,
      };
    }

    // Handle addon-only or extension-only deployment.
    // Extensions are addon-shaped bundles — same code path, different source dir.
    if (isAddon || isExtension) {
      const providerIdx = remainingArgs.findIndex(a => a === '--provider' || a === '--platform');
      const explicitAddonProvider = providerIdx >= 0 && remainingArgs[providerIdx + 1] ? remainingArgs[providerIdx + 1] : null;
      const provider = explicitAddonProvider ?? (config?.providers?.[0] ?? 'claude');
      const targetIdx = remainingArgs.findIndex(a => a === '--target');
      const target = targetIdx >= 0 && remainingArgs[targetIdx + 1] ? remainingArgs[targetIdx + 1] : process.cwd();

      const runner = createScriptRunner(ctx.frameworkRoot);
      const addonBaseArgs = ['--deploy-commands', '--deploy-skills', '--deploy-rules'];
      if (provider) addonBaseArgs.push('--provider', provider);
      if (target) addonBaseArgs.push('--target', target);
      // Forward --copy-all (#1219) so addon-only deploys also honor it.
      if (remainingArgs.includes('--copy-all') || remainingArgs.includes('--copy-standard-skills')) {
        addonBaseArgs.push('--copy-all');
      }

      const kind = isExtension ? 'extension' : 'addon';
      ui.blank();
      ui.header(`  Deploying ${framework} ${kind}...`);
      const addonSource = isExtension
        ? extensionPath(frameworkRoot, framework)
        : addonPath(frameworkRoot, framework);
      const addonResult = await runner.run('tools/agents/deploy-agents.mjs', [
        '--quiet', '--source', addonSource,
        ...addonBaseArgs,
      ], { capture: true });

      if (addonResult.exitCode !== 0) {
        return addonResult;
      }

      // Register deployed extensions
      try {
        const registry = getRegistry();
        const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;
        await registerDeployedExtensions(registry, {
          agentsPath: paths.agents,
          skillsPath: paths.skills,
          commandsPath: paths.commands,
          rulesPath: paths.rules,
          behaviorsPath: paths.behaviors,
          provider,
          cwd: target,
        });
        ui.success('Extension registration complete');
      } catch (error) {
        ui.warn(`Failed to register extensions: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Register CLI commands if addon declares them
      try {
        const manifestPath = path.join(addonSource, 'manifest.json');
        const manifestContent = await fs.readFile(manifestPath, 'utf-8');
        const manifest = JSON.parse(manifestContent);

        if (manifest.cli_commands?.namespace && manifest.cli_commands?.subcommands) {
          const cmds = manifest.cli_commands;
          const commandsSource = path.join(addonSource, cmds.entry || 'commands/');
          await registerCliCommands(
            target,
            cmds.namespace,
            cmds.description || `${framework} addon commands`,
            commandsSource,
            cmds.subcommands
          );
          ui.success(`CLI namespace '${cmds.namespace}' registered (${Object.keys(cmds.subcommands).length} subcommands)`);

          // Register Claude Code hooks for subcommands with hook_event
          if (provider === 'claude') {
            const registeredHooks = await registerHooks(target, cmds.namespace, cmds.subcommands);
            for (const hook of registeredHooks) {
              ui.success(`Hook registered: ${hook}`);
            }
          }
        }
      } catch (error) {
        ui.warn(`Failed to register CLI commands: ${error instanceof Error ? error.message : String(error)}`);
      }

      // Profile picker for addons with memory topology and multiple templates
      try {
        const profileManifestPath = path.join(addonSource, 'manifest.json');
        const profileManifestContent = await fs.readFile(profileManifestPath, 'utf-8');
        const profileManifest = JSON.parse(profileManifestContent);

        const topology = profileManifest.memory?.topology;
        const templates = profileManifest.templates;

        if (topology && templates && templates.length > 1) {
          const profileIdx = remainingArgs.findIndex(a => a === '--profile');
          let selectedProfile: string | undefined;

          if (profileIdx >= 0 && remainingArgs[profileIdx + 1]) {
            // Explicit --profile flag
            selectedProfile = remainingArgs[profileIdx + 1];
            const templateFile = templates.find((t: string) =>
              t.replace('.md', '') === selectedProfile || t === selectedProfile
            );
            if (!templateFile) {
              ui.warn(`Unknown profile "${selectedProfile}". Available: ${templates.map((t: string) => t.replace('.md', '')).join(', ')}`);
              selectedProfile = undefined;
            }
          } else if (_isBulkIntent || !process.stdin.isTTY) {
            // Bulk/automation or non-TTY: silently pick 'generic' default.
            // The profile picker is annoying during `aiwg use all`.
            selectedProfile = 'generic';
          } else if (process.stdin.isTTY) {
            // Interactive profile selection via the shared `listSelect` helper
            // (POC for spike #926). One call renders the option list, handles
            // number-or-name matching, threads `ctx.signal` for Ctrl-C
            // cancellation, and resolves to the fallback on timeout or empty
            // input. The hand-rolled parse-and-branch that used to live here
            // is now a one-liner.
            const { createPromptInterface, listSelect } = await import('../prompt-utils.js');
            ui.blank();
            ui.header('  Select a topology profile:');
            const templateNames = templates.map((t: string) => t.replace('.md', ''));
            const options = templateNames.map((name: string) => ({
              label: name === 'generic' ? `${name} (default)` : name,
              value: name,
            }));

            const rl = createPromptInterface();
            try {
              selectedProfile = await listSelect(
                rl,
                '  Enter number or name [generic]: ',
                options,
                'generic',
                ctx.signal,
              );
            } finally {
              rl.close();
            }
          }

          // Write profile config to project namespace
          if (selectedProfile) {
            const namespace = topology.namespace || `.aiwg/${framework}`;
            const configDir = path.join(target, namespace);
            await fs.mkdir(configDir, { recursive: true });
            const profileConfig = {
              profile: selectedProfile,
              pageTemplate: `templates/${selectedProfile}.md`,
              selectedAt: new Date().toISOString(),
            };
            await fs.writeFile(
              path.join(configDir, 'config.json'),
              JSON.stringify(profileConfig, null, 2) + '\n'
            );
            ui.success(`Profile "${selectedProfile}" selected → ${namespace}/config.json`);
          }
        }
      } catch {
        // Profile selection is optional — don't fail deployment
      }

      ui.blank();
      ui.success(`${framework} addon deployed`);
      return {
        exitCode: 0,
      };
    }

    // Map framework name to deploy mode
    const mode = MODE_MAP[framework as Framework];
    const deployArgs = ['--mode', mode, '--deploy-commands', '--deploy-skills', '--deploy-rules', ...remainingArgs];

    // Check flags
    const skipUtils = remainingArgs.includes('--no-utils');
    const skipProjectLocal = remainingArgs.includes('--no-project-local');
    const verbose = remainingArgs.includes('--verbose') || remainingArgs.includes('-v');
    const dryRun = remainingArgs.includes('--dry-run');
    const ciHooksEnabled = remainingArgs.includes('--ci-hooks-enabled');
    const force = remainingArgs.includes('--force');
    const skipConflicts = remainingArgs.includes('--skip-conflicts');

    // PUW-027 (#1128): --scope user|project per ADR-4. Default project.
    // #1156 Phase 1: --user is a shorthand for --scope user.
    let scope: 'project' | 'user';
    try {
      scope = detectScope(remainingArgs);
      if (scope === 'project' && remainingArgs.includes('--user')) {
        scope = 'user';
      }
    } catch (err) {
      return {
        exitCode: 1,
        message: `Error: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
    if (scope === 'user' && verbose) {
      ui.dim(`  --scope user: deploy targets mirror to home-rooted paths per ADR-4 §2`);
    }
    const filteredArgs = deployArgs.filter(
      a => a !== '--no-utils' && a !== '--no-project-local' && a !== '--ci-hooks-enabled' && a !== '--force' && a !== '--skip-conflicts'
    );

    // Pass --quiet to suppress deploy-agents.mjs header/footer in default mode (#460)
    // Dry-run must not capture output — its purpose is to show what would happen
    if (!verbose && !dryRun) filteredArgs.push('--quiet');

    // Extract provider and target from remainingArgs to pass to addon deployments
    // Config-first resolution (#621): explicit --provider overrides config, config overrides default 'claude'
    const providerIdx = remainingArgs.findIndex(a => a === '--provider' || a === '--platform');
    const explicitProvider = providerIdx >= 0 && remainingArgs[providerIdx + 1] ? remainingArgs[providerIdx + 1] : null;

    // Determine providers list for multi-provider deployment
    let providers: string[];
    if (explicitProvider) {
      providers = [explicitProvider];
    } else if (config && config.providers.length > 0) {
      providers = config.providers;
    } else {
      providers = ['claude'];
      if (!config) {
        ui.warn("No .aiwg/aiwg.config found. Run 'aiwg init' to configure providers for this project.");
      }
    }

    // Multi-provider: loop over providers, deploying to each in sequence
    if (providers.length > 1) {
      for (const p of providers) {
        const result = await this.execute({ ...ctx, args: [framework, '--provider', p, ...remainingArgs] });
        if (result.exitCode !== 0) return result;
      }
      return { exitCode: 0 };
    }

    const provider = providers[0];
    const targetIdx = remainingArgs.findIndex(a => a === '--target');
    const target = targetIdx >= 0 && remainingArgs[targetIdx + 1] ? remainingArgs[targetIdx + 1] : process.cwd();

    // #1156 Phase 1 — OpenClaw is exclusively user-scope; reject --scope project.
    try {
      rejectOpenClawProjectScope(provider, scope);
    } catch (err) {
      return {
        exitCode: 1,
        message: err instanceof Error ? err.message : String(err),
      };
    }

    // #1156 Phase 1 — Reject --scope user for providers that don't have a
    // documented user-scope path map. Operators get a clear error rather than a
    // silent fall-through to project-only deployment.
    if (scope === 'user') {
      const { USER_SCOPE_PATHS } = await import('../scope-resolver.js');
      if (!USER_SCOPE_PATHS[provider]) {
        return {
          exitCode: 1,
          message: `--scope user not supported for provider '${provider}' — see docs/customization/user-scope-deployment.md for the supported list`,
        };
      }
    }

    // Pre-deployment collision check (skip in dry-run — nothing is written)
    if (!dryRun) {
      const canDeploy = await runPreDeployCollisionCheck({
        frameworkRoot,
        framework,
        target,
        provider,
        force,
        skipConflicts,
        verbose,
      });
      if (!canDeploy) {
        return { exitCode: 1, message: 'Deployment blocked due to name collisions. See above for details.' };
      }
    }

    // Deploy main framework
    const quiet = !verbose && !dryRun;
    const captureOpts = quiet ? { capture: true } : {};
    if (quiet) {
      ui.blank();
      console.log(`  ${ui.brandMark()} ${ui.bold(`Installing ${framework} framework`)}  ${ui.dimText(`for ${provider === 'claude' ? 'Claude Code' : provider}`)}`);
      ui.blank();
    }
    const runner = createScriptRunner(ctx.frameworkRoot);
    const mainResult = await runner.run('tools/agents/deploy-agents.mjs', filteredArgs, captureOpts);

    if (mainResult.exitCode !== 0) {
      return mainResult;
    }

    // Build common args for addon deployments (inherit provider and target)
    const addonBaseArgs = ['--deploy-commands', '--deploy-skills', '--deploy-rules'];
    if (provider) addonBaseArgs.push('--provider', provider);
    if (target) addonBaseArgs.push('--target', target);
    if (verbose) addonBaseArgs.push('--verbose');
    // Forward --copy-all to addon deploys so the legacy mirror behavior
    // is consistent across the framework + every addon (#1219).
    if (remainingArgs.includes('--copy-all') || remainingArgs.includes('--copy-standard-skills')) {
      addonBaseArgs.push('--copy-all');
    }

    // Deploy all addons (excluding disallow list) unless --no-utils
    if (!skipUtils) {
      const allAddons = await getAllAddons(frameworkRoot);
      for (const addon of allAddons) {
        if (verbose) {
          console.log('');
          console.log(`Deploying ${addon} addon...`);
        }
        const source = addonPath(frameworkRoot, addon);
        const addonArgs = quiet
          ? ['--quiet', '--source', source, ...addonBaseArgs]
          : ['--source', source, ...addonBaseArgs];
        const result = await runner.run('tools/agents/deploy-agents.mjs', addonArgs, captureOpts);
        if (result.exitCode !== 0) {
          return result;
        }
      }

      // Deploy all extensions from agentic/code/extensions/* (#1222).
      // Extensions are addon-shaped bundles (manifest type: "addon") that live
      // in a separate top-level dir to keep ops/sysops/itops/devops grouped.
      // `aiwg use all` was previously silent about them, leaving 6 extension
      // bundles undeployed even when the user explicitly asked for everything.
      const allExtensions = await getAllExtensions(frameworkRoot);
      for (const ext of allExtensions) {
        if (verbose) {
          console.log('');
          console.log(`Deploying ${ext} extension...`);
        }
        const source = extensionPath(frameworkRoot, ext);
        const extArgs = quiet
          ? ['--quiet', '--source', source, ...addonBaseArgs]
          : ['--source', source, ...addonBaseArgs];
        const result = await runner.run('tools/agents/deploy-agents.mjs', extArgs, captureOpts);
        if (result.exitCode !== 0) {
          return result;
        }
      }
    }

    // Deploy project-local bundles (#1035). Auto-runs after upstream addons unless
    // --no-project-local. Idempotent — overwrites prior deploys. Skipped under
    // --dry-run-disabled scenarios for safety; --dry-run is honored and logged.
    if (!skipProjectLocal) {
      const plResult = await deployProjectLocalBundles({
        ctx,
        frameworkRoot,
        projectDir,
        provider,
        target,
        dryRun,
        verbose,
        quiet,
      });
      if (plResult.deployed > 0 && quiet) {
        ui.dim(`  + ${plResult.deployed} project-local bundle(s)`);
      }
      if (plResult.failed > 0) {
        ui.warn(`${plResult.failed} project-local bundle(s) failed to deploy`);
      }
    }

    // Translate deployed skills to commands for providers that require legacy command format
    // (#550) Skills are now canonical; commands are generated from SKILL.md frontmatter.
    if (providerNeedsCommands(provider)) {
      const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;
      const targetSkillsDir = path.isAbsolute(paths.skills)
        ? paths.skills
        : path.join(target, paths.skills);
      const targetCommandsDir = path.isAbsolute(paths.commands)
        ? paths.commands
        : path.join(target, paths.commands);
      try {
        const translationResult = await translateSkillsToCommands(targetSkillsDir, {
          provider,
          targetDir: targetCommandsDir,
          projectPath: target,
          dryRun,
          verbose,
        });
        if (verbose && translationResult.translated.length > 0) {
          ui.success(`Translated ${translationResult.translated.length} skills → commands (${provider})`);
        }
      } catch (error) {
        ui.warn(`Skill→command translation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // PUW-015 (#1116): Claude Code SDLC flow commands.
    // Claude is `skills-native` so it doesn't go through the translator above,
    // but operators expect `/flow-*` slash-command tab completion. Emit
    // command stubs for flow-prefixed skills into .claude/commands/. Skill
    // sources now live at .claude/.aiwg/skills/ (#1212); commands continue
    // to deploy to the platform-native .claude/commands/ path.
    if (provider === 'claude' && !dryRun) {
      try {
        const claudeSkillsDir = path.join(target, '.claude/.aiwg/skills');
        const claudeCommandsDir = path.join(target, '.claude/commands');
        const flowFilter = (skillName: string) =>
          skillName.startsWith('flow-') ||
          skillName === 'sdlc-accelerate' ||
          skillName === 'project-status' ||
          skillName === 'intake-wizard' ||
          skillName === 'intake-from-codebase' ||
          skillName === 'intake-start';
        const r = await translateSkillsToCommands(claudeSkillsDir, {
          provider: 'claude',
          targetDir: claudeCommandsDir,
          projectPath: target,
          dryRun,
          verbose,
          nameFilter: flowFilter,
        });
        if (verbose && r.translated.length > 0) {
          ui.success(`Translated ${r.translated.length} SDLC flows → Claude slash commands`);
        }
      } catch (error) {
        ui.warn(`Claude flow → command translation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Register deployed extensions in the registry
    if (verbose) {
      console.log('');
      console.log('Registering deployed extensions...');
    }
    try {
      const registry = getRegistry();
      const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;

      await registerDeployedExtensions(registry, {
        agentsPath: paths.agents,
        skillsPath: paths.skills,
        commandsPath: paths.commands,
        rulesPath: paths.rules,
        behaviorsPath: paths.behaviors,
        provider,
        cwd: target,
      });

      if (verbose) console.log('Extension registration complete');
    } catch (error) {
      console.error('Warning: Failed to register extensions:', error instanceof Error ? error.message : String(error));
      // Don't fail the deployment if registration fails
    }

    // Rebuild the `framework` artifact index (#1212/#1214) so
    // `aiwg discover` queries return fresh capability data. This step
    // can take a few seconds on a full install (~2,000 artifacts) —
    // surface the work to the operator so the apparent stall during
    // `aiwg use` is legible. Best-effort — index rebuild failure must
    // not fail the deploy.
    //
    // Pre-flight: skip when the framework source dirs aren't present
    // (e.g., test fixtures, deploy from npm install rather than the
    // source repo). buildIndex() calls `process.exit(1)` on missing
    // scan dirs which would short-circuit our catch.
    if (!dryRun) {
      // Build the framework graph against $AIWG_ROOT, not the project's
      // target dir (#1217). The framework source is user-global at
      // AIWG_ROOT — recording AIWG_ROOT-relative paths makes the index
      // resolvable from any project. Falls back to project target only
      // if AIWG_ROOT is unset or unreadable (rare).
      const aiwgRootForIndex = process.env.AIWG_ROOT || frameworkRoot || target;
      const fwSrcDir = path.join(aiwgRootForIndex, 'agentic', 'code', 'frameworks');
      const hasFrameworkSrc = await fs.access(fwSrcDir).then(() => true).catch(() => false);
      if (hasFrameworkSrc) {
        // Always announce the index build — this is the visible-to-user
        // expensive step on a full install (~2,000 artifacts indexed).
        // Without messaging, the operator sees an apparent stall after
        // the deploy summary. Verbose mode lets buildIndex's own
        // progress through; otherwise we show a single-line spinner-
        // style message and capture the noisy stat lines.
        ui.blank();
        ui.info('Building capability index for `aiwg discover`…');
        ui.dim('  Indexing skills, agents, commands, and rules. Reused incrementally on next deploy.');

        const indexStart = Date.now();
        // Capture buildIndex's own console.log noise unless verbose
        const origLog = console.log;
        if (!verbose) console.log = () => {};
        try {
          const { buildIndex } = await import('../../artifacts/index-builder.js');
          // Build against AIWG_ROOT so stored paths resolve from any
          // project (#1217). The output index location is XDG-shared
          // regardless of build cwd.
          await buildIndex(aiwgRootForIndex, { graph: 'framework', explicit: false });
          console.log = origLog;
          const indexElapsedSec = ((Date.now() - indexStart) / 1000).toFixed(1);
          ui.success(`Capability index ready (${indexElapsedSec}s) — try \`aiwg discover "<phrase>"\``);
        } catch (error) {
          console.log = origLog;
          ui.warn(
            `Capability index build failed: ${error instanceof Error ? error.message : String(error)}`,
          );
          ui.dim('  Deploy succeeded — skills reachable, but `aiwg discover` may return stale results until next rebuild.');
        }
      } else if (verbose) {
        console.log('Framework source not found; skipping capability index rebuild');
      }
    }

    // Show completion summary and next steps (default mode only)
    let counts = { agents: 0, commands: 0, skills: 0, rules: 0, behaviors: 0 };
    if (quiet) {
      // Count deployed artifacts
      const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;
      counts = await countDeployedArtifacts(target, paths);
      if (counts.agents > 0) ui.deployCount('Agents', counts.agents);
      if (counts.commands > 0) ui.deployCount('Commands', counts.commands);
      if (counts.skills > 0) ui.deployCount('Skills', counts.skills);
      if (counts.rules > 0) ui.deployCount('Rules', counts.rules);
      if (counts.behaviors > 0) ui.deployCount('Behaviors', counts.behaviors);
      ui.blank();
      printNextSteps(framework as Framework, provider);

      // #1240: warn the operator that the running session can't see the newly
      // deployed agents until reloaded. Skipping this notice is what produced
      // the "Agent type 'software-implementer' not found" symptom on a stale
      // Claude Code session.
      ui.blank();
      printSessionReloadNotice(provider);

      // Append version confirmation line (#719)
      try {
        const versionInfo = await getVersionInfo();
        ui.blank();
        ui.dim(`  AIWG v${versionInfo.version} — git.integrolabs.net/roctinam/aiwg`);
      } catch {
        // Graceful fallback: omit version line if versionInfo unavailable
      }
    }

    // Deploy CI workflow files when --ci-hooks-enabled is set (#661)
    if (ciHooksEnabled) {
      await deployCiHooks({ frameworkRoot, framework, target, dryRun });
    }

    // PUW-027 (#1128), #1156 Phase 1 — --scope user: mirror the full
    // per-provider artifact set (agents/commands/skills/rules) to the
    // user-scope target per ADR-4 §2. The project-scope deploy stays in
    // place; user-scope copies are additive so the framework is available
    // across every project on the operator's machine. After a successful
    // mirror, record the deploy in the per-user registry at
    // ~/.aiwg/installed.json so `aiwg list --scope user` and `aiwg remove
    // --scope user` can find it from any cwd.
    if (scope === 'user' && !dryRun) {
      try {
        const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;
        const resolveProjectPath = (p: string): string =>
          !p ? '' : path.isAbsolute(p) ? p : path.join(target, p);
        const projectPaths = {
          agents: resolveProjectPath(paths.agents),
          skills: resolveProjectPath(paths.skills),
          commands: resolveProjectPath(paths.commands),
          rules: resolveProjectPath(paths.rules),
          behaviors: resolveProjectPath(paths.behaviors),
        };
        const r = await mirrorToUserScope(provider, projectPaths);
        const summary: string[] = [];
        if (r.agents.count > 0) summary.push(`${r.agents.count} agent(s)`);
        if (r.commands.count > 0) summary.push(`${r.commands.count} command(s)`);
        if (r.skills.count > 0) summary.push(`${r.skills.count} skill(s)`);
        if (r.rules.count > 0) summary.push(`${r.rules.count} rule(s)`);
        if (r.behaviors.count > 0) summary.push(`${r.behaviors.count} behavior(s)`);
        if (summary.length > 0) {
          // Show the per-type breakdown plus the primary user-scope target dir.
          // Prefer skills.targetDir as the surfaced location since most providers
          // share `~/.<provider>/` for the others.
          const headline = r.skills.targetDir || r.agents.targetDir || r.commands.targetDir || r.rules.targetDir;
          ui.dim(`  --scope user: mirrored ${summary.join(', ')} to ${headline}`);

          // Record the deploy in the per-user registry. Counts come from the
          // mirror result so they reflect what actually landed at user scope,
          // not what was deployed at project scope (the two can diverge if
          // some artifact dirs were empty in the project tree). Entry names
          // are recorded so `aiwg remove --scope user` can revert precisely
          // (delete only this deploy's artifacts, not other frameworks').
          try {
            const { recordUserDeploy } = await import('../../config/user-registry.js');
            const versionInfo = await getVersionInfo().catch(() => ({ version: 'unknown' }));
            await recordUserDeploy({
              framework,
              provider,
              version: versionInfo.version,
              source: 'bundled',
              counts: {
                agents: r.agents.count,
                commands: r.commands.count,
                skills: r.skills.count,
                rules: r.rules.count,
              },
              entries: {
                agents: r.agents.entries,
                commands: r.commands.entries,
                skills: r.skills.entries,
                rules: r.rules.entries,
                behaviors: r.behaviors.entries,
              },
            });
          } catch (registryErr) {
            ui.warn(`user-scope registry update failed: ${registryErr instanceof Error ? registryErr.message : String(registryErr)}`);
          }
        }
      } catch (err) {
        ui.warn(`--scope user mirror failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // PUW-010 (#1111) Claude Code aiwg-hooks autoInstall — wire the
    // addon's JS handler scripts into .claude/settings.json with backup-
    // and-rollback per ADR-3 §5. Default ON for Claude per ADR-3 §7;
    // operator opts out via --no-hooks.
    if (provider === 'claude' && !dryRun && !remainingArgs.includes('--no-hooks')) {
      try {
        const r = await installAiwgHooks({
          projectPath: target,
          frameworkRoot,
          dryRun,
          verbose,
        });
        if (r) {
          if (verbose && r.installedScripts.length > 0) {
            ui.dim(`  aiwg-hooks: installed ${r.installedScripts.length} hook scripts to .claude/hooks/`);
          }
          if (verbose && r.registeredEvents.length > 0) {
            for (const event of r.registeredEvents) {
              ui.dim(`  aiwg-hooks registered: ${event}`);
            }
          }
          if (r.backupPath) {
            ui.dim(`  aiwg-hooks: backed up settings.json to ${r.backupPath}`);
          }
          for (const w of r.warnings) {
            ui.dim(`  aiwg-hooks: ${w}`);
          }
        }
      } catch (err) {
        ui.warn(`aiwg-hooks installer: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // PUW-018 (#1119) cross-provider hook bridge — opt-in via
    // --enable-cross-provider-hooks. When enabled and at least one canonical
    // hook source exists at agentic/code/addons/aiwg-hooks/canonical/*.yaml,
    // translate to provider-native artifacts (Codex TOML, Copilot JSON,
    // Factory shell, Hermes Python plugin). Per ADR-3 §7 autoInstall policy
    // this is opt-in.
    if (remainingArgs.includes('--enable-cross-provider-hooks') && !dryRun) {
      try {
        const { loadHookSources, bridgeAll } = await import('../../smiths/hook-bridge/index.js');
        const { sources, errors } = await loadHookSources(frameworkRoot);
        if (errors.length > 0) {
          for (const err of errors) {
            ui.warn(`hook-bridge load: ${err}`);
          }
        }
        if (sources.length === 0) {
          if (verbose) {
            ui.dim('  hook-bridge: no canonical hook sources found at agentic/code/addons/aiwg-hooks/canonical/ — flag is a no-op');
          }
        } else {
          // Cross-provider providers per ADR-3 §7 (no-op if their dir not present)
          const bridgeProviders = ['codex', 'copilot', 'factory', 'hermes'];
          const results = await bridgeAll(sources, bridgeProviders, {
            projectPath: target,
            dryRun,
            verbose,
          });
          let emittedCount = 0;
          for (const r of results) {
            if (r.skipped) {
              if (verbose) ui.dim(`  hook-bridge skipped ${r.provider}: ${r.skipReason}`);
              continue;
            }
            emittedCount += r.emittedPaths.length;
            for (const w of r.warnings) ui.dim(`  hook-bridge ${r.provider}: ${w}`);
          }
          if (emittedCount > 0) {
            ui.dim(`  hook-bridge: emitted ${emittedCount} cross-provider hook artifact(s)`);
          }
        }
      } catch (err) {
        ui.warn(`hook-bridge: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Update installed section in config (#621)
    if (config !== null && !dryRun) {
      try {
        const versionInfo = await getVersionInfo();
        const versionDirName = resolveFrameworkDir(framework);
        const frameworkManifestPath = versionDirName
          ? path.join(frameworkRoot, 'agentic/code/frameworks', versionDirName, 'manifest.json')
          : null;
        if (!frameworkManifestPath) throw new Error('no manifest for general/writing mode');
        const mHash = await hashManifest(frameworkManifestPath);
        const updatedConfig = updateInstalled(config, framework, provider, {
          agents: counts.agents,
          commands: counts.commands,
          skills: counts.skills,
          rules: counts.rules,
        }, { version: versionInfo.version, source: 'bundled', manifestHash: mHash });
        await writeAiwgConfig(projectDir, updatedConfig);
      } catch {
        // Non-fatal: config tracking failure must not block deployment
      }
    }

    // Context-pipeline emission (ADR-1 §0 + §0.5 + §7).
    //
    // For the seven AGENTS.md providers (codex/cursor/windsurf/hermes/warp/factory/
    // opencode), emit AIWG.md + AGENTS.md at project root as the last filesystem
    // step before activity-log close. The generator-runs-after-deploy invariant
    // (ADR-1 §7) means the link index can only cite files we observe on disk:
    // failed deploys produce shorter indexes, never broken links.
    //
    // Operators opt out via --no-context-files / --no-aiwg-md / --no-agents-md.
    if (!dryRun && shouldEmitContextFiles(provider as Platform)) {
      const skipContext = remainingArgs.includes('--no-context-files');
      const skipAiwgMd = skipContext || remainingArgs.includes('--no-aiwg-md');
      const skipAgentsMd = skipContext || remainingArgs.includes('--no-agents-md');
      const forceContext = remainingArgs.includes('--force-context-files');

      try {
        const paths = PROVIDER_PATHS[provider] || PROVIDER_PATHS.claude;
        const sections = await discoverDeployedArtifacts(target, {
          agents: paths.agents,
          rules: paths.rules,
          skills: paths.skills,
          behaviors: paths.behaviors,
        });

        const ctxResult = await generateContextFiles({
          provider: provider as Platform,
          projectPath: target,
          sections,
          detectExistingFiles: true,
          force: forceContext,
          skip: { aiwgMd: skipAiwgMd, agentsMd: skipAgentsMd },
        });

        if (verbose && ctxResult.agentsMdPath) {
          ui.dim(`  Wrote AGENTS.md (${ctxResult.agentsMdBytes} bytes)`);
        }
        if (verbose && ctxResult.aiwgMdPath) {
          ui.dim(`  Wrote AIWG.md`);
        }
        for (const w of ctxResult.warnings) {
          ui.dim(`  context-pipeline: ${w}`);
        }
        for (const b of ctxResult.backupPaths) {
          ui.dim(`  Backup created: ${b}`);
        }

        // PUW-029 size validation hook (#1130). Hard error at 32KB matches
        // Codex's config_toml.rs:68 cap. Soft warning at 30KB.
        if (provider === 'codex' && ctxResult.agentsMdBytes > 0) {
          if (ctxResult.agentsMdBytes >= 32 * 1024) {
            ui.dim(`  WARNING: AGENTS.md (${ctxResult.agentsMdBytes} bytes) exceeds Codex 32KB cap. Auto-split lands in PUW-029 implementation; manual split needed for now.`);
          } else if (ctxResult.agentsMdBytes >= 30 * 1024) {
            ui.dim(`  Note: AGENTS.md (${ctxResult.agentsMdBytes} bytes) approaches Codex 32KB cap (warn threshold 30KB).`);
          }
        }
      } catch (err) {
        // Non-fatal: context-pipeline emission must not block deployment.
        // Operator can re-run aiwg use to retry.
        const msg = err instanceof Error ? err.message : String(err);
        console.error(`Warning: context-pipeline emission failed: ${msg}`);
      }
    }

    span.end('use:complete', { framework });
    return {
      exitCode: 0,
      message: verbose ? `Successfully deployed ${framework} framework` : '',
    };
  }
}

/**
 * Create use handler instance
 */
export function createUseHandler(): CommandHandler {
  return new UseHandler();
}

/**
 * Singleton handler instance
 */
export const useHandler = new UseHandler();
