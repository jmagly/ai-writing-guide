#!/usr/bin/env node
/**
 * AIWG Doctor Command
 * Checks installation health and diagnoses common issues
 */

import fs from 'fs/promises';
import os from 'os';
import path from 'path';
import { execSync } from 'child_process';
import chalk from 'chalk';
// Import from dist/ — the npm package ships compiled code under dist/, NOT
// the source tree. Importing from `../../src/channel/manager.mjs` works in
// dev (src/ exists at repo root) but breaks on npm-installed users with
// "Cannot find module 'src/channel/manager.mjs'". This script is invoked
// from within the AIWG package root by `dist/src/cli/handlers/utilities.js`
// doctorHandler, so `../../dist/src/channel/manager.mjs` resolves correctly
// in both dev (after `npm run build:cli`) and in `npm install -g aiwg`.
import { getFrameworkRoot, getVersionInfo } from '../../dist/src/channel/manager.mjs';

// AIWG_ROOT: env override > channel-manager resolved path > legacy edge path
// getFrameworkRoot() resolves correctly for npm global installs, edge, and dev channels.
const AIWG_ROOT = process.env.AIWG_ROOT || await getFrameworkRoot();

const checks = [];

// ---- Provider awareness (#1057) ----------------------------------------
// doctor used to hardcode .claude/agents and .claude/commands. On a project
// deployed to Factory, Codex, Cursor, etc. that produced misleading "No
// agents deployed" output. The per-provider section below resolves paths
// from the provider modules themselves (paths.agents / paths.commands)
// instead of literal .claude/* strings.

// Static registry of supported providers and their human-readable labels.
// Each entry exposes .paths via dynamic import so we don't pull all ten
// provider modules eagerly when the user hasn't deployed to any of them.
const PROVIDER_LABELS = {
  claude:   'Claude Code',
  factory:  'Factory',
  codex:    'Codex',
  copilot:  'Copilot',
  cursor:   'Cursor',
  opencode: 'OpenCode',
  warp:     'Warp',
  windsurf: 'Windsurf',
  openclaw: 'OpenClaw',
  hermes:   'Hermes',
};

// Quick-detect dirs (agents-only) — used when no --provider flag is given.
// Mirrors the agents path each provider exports. Kept literal here so the
// check is fast and string-greppable without loading every provider module.
const PROVIDER_AGENT_DIRS = {
  claude:   '.claude/agents',
  factory:  '.factory/droids',
  codex:    '.codex/agents',
  copilot:  '.github/agents',
  cursor:   '.cursor/agents',
  opencode: '.opencode/agent',
  warp:     '.warp/agents',
  windsurf: '.windsurf/agents',
  // openclaw/hermes deploy to ~/.{provider}/ — handled separately
};

// Parse doctor-specific flags from process.argv (no commander dependency).
function parseDoctorArgs(argv) {
  const out = { provider: null, allProviders: false, noBudgetCheck: false };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--provider' && argv[i + 1]) { out.provider = argv[i + 1]; i += 1; continue; }
    if (a.startsWith('--provider=')) { out.provider = a.slice('--provider='.length); continue; }
    if (a === '--all-providers') { out.allProviders = true; continue; }
    if (a === '--no-budget-check') { out.noBudgetCheck = true; continue; }
  }
  return out;
}

// ---- Skill listing budget check (#1150) -------------------------------
//
// Estimates the size of the skill listing the platform will render at
// session start and warns when it exceeds the platform's default budget,
// before the operator sees post-hoc truncation in /doctor (#1147).
//
// Per-platform model (see issue body for sources):
//   claude   — `skillListingBudgetFraction` × context window (default 1%
//              × 200k = 2000 tokens). User override read from
//              ~/.claude/settings.json.
//   codex    — fixed 8000-char cap built into Codex itself.
//   others   — skip (no documented budget).
//
// Token estimation: ~4 chars/token is the standard rough heuristic. Each
// listing entry is approximately `- name: description\n` so we sum
// `name.length + description.length + 5` per skill.

const CLAUDE_DEFAULT_BUDGET_FRACTION = 0.01;
const CLAUDE_DEFAULT_CONTEXT_WINDOW = 200_000;
const CODEX_LISTING_CHAR_CAP = 8000;
const CHARS_PER_TOKEN = 4;

async function readClaudeBudgetOverride() {
  const candidates = [
    path.join(os.homedir(), '.claude', 'settings.json'),
    path.join(os.homedir(), '.config', 'claude', 'settings.json'),
  ];
  for (const p of candidates) {
    try {
      const txt = await fs.readFile(p, 'utf-8');
      const data = JSON.parse(txt);
      const v = data.skillListingBudgetFraction;
      if (typeof v === 'number' && v > 0 && v <= 1) return { value: v, source: p };
    } catch {
      /* missing or unreadable — try next */
    }
  }
  return null;
}

async function readContextWindowDirective() {
  // Honor `<!-- AIWG_CONTEXT_WINDOW: N -->` declared in the project's
  // platform context file (CLAUDE.md and friends, per context-budget rule).
  const candidates = [
    path.join(process.cwd(), 'CLAUDE.md'),
    path.join(process.cwd(), 'AGENTS.md'),
    path.join(process.cwd(), 'AIWG.md'),
  ];
  for (const p of candidates) {
    try {
      const txt = await fs.readFile(p, 'utf-8');
      const m = /AIWG_CONTEXT_WINDOW:\s*(\d+)/.exec(txt);
      if (m) {
        const n = parseInt(m[1], 10);
        if (n > 0) return { value: n, source: path.basename(p) };
      }
    } catch {
      /* missing — try next */
    }
  }
  return null;
}

// Strip a single ---\n...\n--- frontmatter block and pull `name:` and
// `description:` keys. Cheaper than a full YAML parse and good enough — the
// real listing render uses the same first-N-chars-from-frontmatter shape.
function extractSkillFrontmatter(src) {
  const fmEnd = src.indexOf('\n---', 4);
  if (!src.startsWith('---') || fmEnd < 0) return null;
  const block = src.slice(3, fmEnd);
  // Multi-line description support: collapse continuation lines that don't
  // start with a top-level key into the previous value.
  const out = {};
  const lines = block.split('\n');
  let lastKey = null;
  for (const raw of lines) {
    const line = raw.trimEnd();
    if (!line) { lastKey = null; continue; }
    const m = /^([a-zA-Z][a-zA-Z0-9_-]*):\s*(.*)$/.exec(line);
    if (m) {
      lastKey = m[1];
      out[lastKey] = m[2].trim();
    } else if (lastKey && line.startsWith(' ')) {
      out[lastKey] = `${out[lastKey]} ${line.trim()}`.trim();
    }
  }
  return out;
}

async function measureSkillsListing(skillsDir) {
  let totalChars = 0;
  let count = 0;
  let totalDescChars = 0;
  let entries = [];
  try {
    entries = await fs.readdir(skillsDir, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const dirent of entries) {
    if (!dirent.isDirectory()) continue;
    const skillFile = path.join(skillsDir, dirent.name, 'SKILL.md');
    let raw = '';
    try {
      raw = await fs.readFile(skillFile, 'utf-8');
    } catch {
      continue;
    }
    const fm = extractSkillFrontmatter(raw);
    if (!fm?.name) continue;
    const desc = (fm.description || '').replace(/^["']|["']$/g, '');
    const entryChars = fm.name.length + desc.length + 5; // "- name: desc\n"
    totalChars += entryChars;
    totalDescChars += desc.length;
    count += 1;
  }
  if (count === 0) return null;
  return {
    count,
    totalChars,
    totalTokens: Math.ceil(totalChars / CHARS_PER_TOKEN),
    avgDescChars: Math.round(totalDescChars / count),
  };
}

async function checkSkillBudgetForProvider(provName, label, skillsPathRel) {
  if (!skillsPathRel || skillsPathRel === 'native' || skillsPathRel === true) {
    // Not a deployable skill path on this provider.
    return;
  }
  const skillsDir = resolveProviderPath(skillsPathRel);
  if (!skillsDir || !(await fileExists(skillsDir))) return;

  const stats = await measureSkillsListing(skillsDir);
  if (!stats) return;

  // Determine the budget for this provider.
  let budget = null;
  let budgetUnit = 'tokens';
  let budgetSource = '';
  let usage = stats.totalTokens;
  let usageUnit = 'tokens';
  let recommendations = [];

  let usingOverride = false;

  if (provName === 'claude') {
    const ctxDirective = await readContextWindowDirective();
    const ctx = ctxDirective?.value ?? CLAUDE_DEFAULT_CONTEXT_WINDOW;
    const override = await readClaudeBudgetOverride();
    usingOverride = Boolean(override);
    const fraction = override?.value ?? CLAUDE_DEFAULT_BUDGET_FRACTION;
    budget = Math.floor((ctx * fraction) / CHARS_PER_TOKEN);
    budgetSource = override
      ? `${(fraction * 100).toFixed(2)}% × ${ctx.toLocaleString()} ctx (override in ${override.source.replace(os.homedir(), '~')})`
      : `${(fraction * 100).toFixed(2)}% × ${ctx.toLocaleString()} ctx (default)${ctxDirective ? ` — ctx from ${ctxDirective.source}` : ''}`;
    if (usage > budget) {
      // Round up to next 1% step, capped at 10%.
      const needed = (usage * CHARS_PER_TOKEN) / ctx;
      const recommendedFraction = Math.min(0.1, Math.ceil(needed * 100) / 100);
      const verb = override ? 'raise' : 'set';
      recommendations.push(
        `${verb} skillListingBudgetFraction to ${recommendedFraction} (~${Math.round(recommendedFraction * 100)}%) in ~/.claude/settings.json`,
      );
      recommendations.push('or remove unused frameworks (e.g. aiwg remove media-marketing)');
      recommendations.push('see docs/skills-budget-guide.md for full options');
    }
  } else if (provName === 'codex') {
    budget = CODEX_LISTING_CHAR_CAP;
    budgetUnit = 'chars';
    usage = stats.totalChars;
    usageUnit = 'chars';
    budgetSource = `${CODEX_LISTING_CHAR_CAP.toLocaleString()}-char built-in cap`;
    if (usage > budget) {
      recommendations.push('Codex caps the listing at 8 000 chars — trim skill descriptions or remove unused frameworks');
      recommendations.push('see docs/skills-budget-guide.md');
    }
  } else {
    // Other platforms: emit an info-level usage line without a verdict so
    // the operator still sees the surface area.
    check(
      `${label} Skill Budget`,
      'info',
      `${stats.count} skills, ~${stats.totalTokens.toLocaleString()} tokens — no documented budget for ${provName}, skipping verdict`,
    );
    return;
  }

  const ratio = usage / budget;
  const usageStr = `${usage.toLocaleString()} ${usageUnit}`;
  const budgetStr = `${budget.toLocaleString()} ${budgetUnit}`;
  const summary = `${stats.count} skills (avg ${stats.avgDescChars} chars desc), est. ${usageStr} vs ${budgetStr} budget — ${budgetSource}`;

  if (usage > budget) {
    const recBlock = recommendations.length ? ` | ${recommendations.join(' | ')}` : '';
    const verdict = usingOverride ? 'EXCEEDS OVERRIDE' : 'EXCEEDS DEFAULT';
    check(`${label} Skill Budget`, 'warn', `${verdict} (${ratio.toFixed(2)}×) — ${summary}${recBlock}`);
  } else {
    check(`${label} Skill Budget`, 'ok', `${ratio < 0.5 ? 'OK' : 'tight'} (${ratio.toFixed(2)}×) — ${summary}`);
  }
}

async function loadProvider(name) {
  try {
    const mod = await import(path.join(AIWG_ROOT, 'tools/agents/providers', `${name}.mjs`));
    return mod.default || mod;
  } catch {
    return null;
  }
}

// Resolve an absolute project path from a provider's paths.<kind> entry.
// Some providers export absolute paths (openclaw, hermes); relative ones
// resolve against process.cwd().
function resolveProviderPath(p) {
  if (!p) return null;
  return path.isAbsolute(p) ? p : path.join(process.cwd(), p);
}

async function detectDeployedProviders() {
  const detected = [];
  for (const [name, dir] of Object.entries(PROVIDER_AGENT_DIRS)) {
    if (await fileExists(path.join(process.cwd(), dir))) detected.push(name);
  }
  // Aggregated providers (Windsurf / Hermes) leave a project-root AGENTS.md.
  if (await fileExists(path.join(process.cwd(), 'AGENTS.md')) && !detected.includes('windsurf')) {
    detected.push('windsurf');
  }
  return detected;
}

function check(name, status, message) {
  checks.push({ name, status, message });
}

async function fileExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

const BRAND_HEX = '#818CF8';

async function runDoctor() {
  const isTTY = Boolean(process.stdout.isTTY);
  const mark = isTTY ? chalk.hex(BRAND_HEX)('◆') : '◆';
  const rule = isTTY ? chalk.dim('  ' + '─'.repeat(42)) : '  ' + '-'.repeat(42);

  console.log('');
  console.log(isTTY ? `  ${mark} ${chalk.bold('AIWG Doctor')}` : '  ◆ AIWG Doctor');
  console.log(rule);
  console.log('');

  // 1. Check AIWG installation — use channel-manager resolved root, not legacy edge path
  const aiwgInstalled = await fileExists(AIWG_ROOT);
  if (aiwgInstalled) {
    check('AIWG Installation', 'ok', `Found at ${AIWG_ROOT}`);
  } else {
    check('AIWG Installation', 'error', `AIWG not found at ${AIWG_ROOT}. Run: npm install -g aiwg`);
  }

  // 2. Check version — include channel label (stable / next / nightly / edge)
  let versionInfo = null;
  try {
    versionInfo = await getVersionInfo();
    const channelLabel = versionInfo.channel !== 'stable' ? ` [${versionInfo.channel}]` : '';
    check('AIWG Version', 'ok', `${versionInfo.version}${channelLabel}`);
  } catch {
    try {
      const version = execSync('aiwg -version 2>/dev/null', { encoding: 'utf-8' }).trim();
      check('AIWG Version', 'ok', version.split('\n')[0]);
    } catch {
      check('AIWG Version', 'warn', 'Could not determine version');
    }
  }

  // 2b. Customize mode — upstream staleness check (fork mode only)
  if (versionInfo?.devMode && versionInfo?.edgePath) {
    try {
      // Check if upstream remote exists (fork mode)
      const remotes = execSync('git remote', { cwd: versionInfo.edgePath, encoding: 'utf-8' }).trim().split('\n');
      if (remotes.includes('upstream')) {
        // Count commits upstream has that we don't
        let aheadCount = 0;
        try {
          execSync('git fetch upstream --dry-run', { cwd: versionInfo.edgePath, stdio: 'pipe' });
          aheadCount = parseInt(
            execSync('git rev-list HEAD..upstream/main --count', {
              cwd: versionInfo.edgePath, encoding: 'utf-8'
            }).trim(), 10
          ) || 0;
        } catch {
          // fetch dry-run can fail on no-network; skip count
        }
        const sourcePath = versionInfo.edgePath.replace(os.homedir(), '~');
        if (aheadCount > 0) {
          check(
            'Customize Mode',
            'info',
            `Active — source: ${sourcePath} | upstream has ${aheadCount} commit(s) — tell Steward "sync my AIWG" to update`,
          );
        } else {
          check('Customize Mode', 'ok', `Active (fork) — source: ${sourcePath} — up to date with upstream`);
        }
      } else {
        // Local clone mode (no upstream remote)
        const sourcePath = versionInfo.edgePath.replace(os.homedir(), '~');
        check('Customize Mode', 'ok', `Active (local clone) — source: ${sourcePath}`);
      }
    } catch {
      const sourcePath = versionInfo.edgePath.replace(os.homedir(), '~');
      check('Customize Mode', 'ok', `Active — source: ${sourcePath}`);
    }
  }

  // 3. Check .aiwg directory in current project
  const projectAiwg = path.join(process.cwd(), '.aiwg');
  const hasProjectAiwg = await fileExists(projectAiwg);
  if (hasProjectAiwg) {
    check('Project .aiwg/', 'ok', 'Found in current directory');
  } else {
    check('Project .aiwg/', 'info', 'No .aiwg/ in current directory (not an AIWG project)');
  }

  // 4-5. Provider-aware agents + commands check (#1057).
  // Determine which providers to inspect:
  //   --provider <name>  → just that one
  //   --all-providers    → every supported provider
  //   (default)          → auto-detect deployed providers via PROVIDER_AGENT_DIRS
  const { provider: providerArg, allProviders, noBudgetCheck } = parseDoctorArgs(process.argv.slice(2));
  let providersToCheck = [];
  if (providerArg) {
    providersToCheck = [providerArg];
  } else if (allProviders) {
    providersToCheck = Object.keys(PROVIDER_LABELS);
  } else {
    providersToCheck = await detectDeployedProviders();
    // Always include claude as a baseline so existing single-provider users
    // still get the "Claude Code Agents" line they're used to.
    if (!providersToCheck.includes('claude')) providersToCheck.unshift('claude');
  }

  for (const provName of providersToCheck) {
    const provider = await loadProvider(provName);
    const label = PROVIDER_LABELS[provName] || provName;
    if (!provider || !provider.paths) {
      check(`${label} Agents`, 'warn', `Unknown provider: ${provName}`);
      continue;
    }

    // Agents
    const agentsPathRel = provider.paths.agents;
    const agentsPath = resolveProviderPath(agentsPathRel);
    if (agentsPath && await fileExists(agentsPath)) {
      try {
        const stat = await fs.stat(agentsPath);
        if (stat.isDirectory()) {
          const files = await fs.readdir(agentsPath);
          const agentCount = files.filter(f => f.endsWith('.md') || f.endsWith('.agent.md')).length;
          check(`${label} Agents`, 'ok', `${agentCount} agents deployed (${agentsPathRel})`);
        } else {
          // Aggregated single-file (e.g. Hermes/Windsurf AGENTS.md)
          check(`${label} Agents`, 'ok', `Aggregated at ${agentsPathRel}`);
        }
      } catch {
        check(`${label} Agents`, 'info', `No agents deployed at ${agentsPathRel}`);
      }
    } else if (providerArg || allProviders) {
      // User explicitly asked about this provider — be explicit when missing.
      check(`${label} Agents`, 'info', `No agents deployed (run: aiwg use sdlc --provider ${provName})`);
    } else if (provName === 'claude') {
      // Default-case fallback for back-compat output.
      check('Claude Code Agents', 'info', 'No agents deployed (run: aiwg use sdlc)');
    }

    // Commands
    const commandsPathRel = provider.paths.commands;
    if (commandsPathRel) {
      const commandsPath = resolveProviderPath(commandsPathRel);
      if (commandsPath && await fileExists(commandsPath)) {
        try {
          const files = await fs.readdir(commandsPath);
          const cmdCount = files.filter(f => f.endsWith('.md') || f.endsWith('.prompt.md')).length;
          check(`${label} Commands`, 'ok', `${cmdCount} commands deployed (${commandsPathRel})`);
        } catch {
          // Skip silently — commands are optional for several providers
        }
      } else if (provName === 'claude') {
        // Claude Code uses a skill-only deployment model — `aiwg use` does not
        // deploy slash commands here. Capabilities are reached via natural
        // language ("create an intake form") or `aiwg discover` (#1228).
        check(
          'Claude Code Commands',
          'ok',
          'Skill-only model — capabilities reached via natural language or `aiwg discover`'
        );
      }
    }

    // Skill listing budget (#1150) — pre-flight warn before the operator
    // sees post-hoc truncation in /doctor inside the running session.
    //
    // Post-kernel-pivot (#1212): the platform's flat skill listing scans
    // `kernelSkillsPath` (e.g., `.claude/skills/`) — that's what the
    // budget actually applies to. Standard-tier skills under
    // `<provider>/.aiwg/skills/` are hidden from the platform scanner
    // and don't count against the budget.
    if (!noBudgetCheck) {
      const budgetPath = provider.kernelSkillsPath || provider.paths.skills;
      await checkSkillBudgetForProvider(provName, label, budgetPath);
    }
  }

  // 6. Check Skill Seekers (optional)
  const skillSeekersPath = path.join(AIWG_ROOT, 'skill-seekers');
  const hasSkillSeekers = await fileExists(skillSeekersPath);
  if (hasSkillSeekers) {
    check('Skill Seekers', 'ok', 'Community skills available');
  } else {
    check('Skill Seekers', 'info', 'Not installed (optional). Run: aiwg install-skill-seekers');
  }

  // 6b. Check Optional Features (#1219) — runtime-optional packages
  // tracked in optionalDependencies + the features catalog.
  try {
    const { getAllFeatureStatuses } = await import(path.join(AIWG_ROOT, 'dist', 'src', 'features', 'status.js'));
    const statuses = await getAllFeatureStatuses();
    for (const s of statuses) {
      const label = `Optional: ${s.feature.name}`;
      if (s.available) {
        const versions = s.packages.map(p => `${p.name} ${p.version ?? '?'}`).join(', ');
        check(label, 'ok', `installed (${versions})`);
      } else {
        check(label, 'info', `not installed — \`aiwg features install ${s.feature.name}\` to enable`);
      }
    }
  } catch (err) {
    // Best-effort — if the features module isn't built yet (e.g. on
    // a fresh dev clone before `npm run build`), just skip the section.
    if (process.env.AIWG_DEBUG) {
      console.error(`Optional Features check skipped: ${err?.message ?? err}`);
    }
  }

  // 7. Check Node.js version
  const nodeVersion = process.version;
  const major = parseInt(nodeVersion.slice(1).split('.')[0]);
  if (major >= 18) {
    check('Node.js', 'ok', nodeVersion);
  } else {
    check('Node.js', 'error', `${nodeVersion} (requires >= 18.0.0)`);
  }

  // 8. Check MCP server
  const mcpServer = path.join(AIWG_ROOT, 'src/mcp/server.mjs');
  const hasMcp = await fileExists(mcpServer);
  if (hasMcp) {
    check('MCP Server', 'ok', 'Available (run: aiwg mcp serve)');
  } else {
    check('MCP Server', 'warn', 'Not found');
  }

  // 8b. Check CLI runtime integrity — catches older published packages that
  // shipped without helper scripts the current CLI depends on (e.g. 2026.3.3
  // was published before tools/cli/deploy.mjs existed, causing `aiwg sync` to
  // fail with MODULE_NOT_FOUND).
  const requiredCliScripts = [
    'deploy.mjs',
    'update.mjs',
    'version.mjs',
    'runtime-info.mjs',
    'config-gitignore.mjs',
  ];
  const missingCli = [];
  for (const script of requiredCliScripts) {
    const scriptPath = path.join(AIWG_ROOT, 'tools/cli', script);
    if (!(await fileExists(scriptPath))) {
      missingCli.push(script);
    }
  }
  if (missingCli.length === 0) {
    check('CLI Runtime Integrity', 'ok', `${requiredCliScripts.length} helper scripts present`);
  } else {
    check(
      'CLI Runtime Integrity',
      'error',
      `Missing tools/cli scripts: ${missingCli.join(', ')}. Your installed AIWG is missing files the CLI depends on. Upgrade: npm install -g aiwg@latest`,
    );
  }

  // 9. Check installed addons
  const addonChecks = [
    { id: 'daemon', label: 'Daemon Addon', manifest: 'agentic/code/addons/daemon/manifest.json',
      artifacts: ['behaviors/concierge.behavior.md', 'agents/concierge.md', 'skills/daemon-status/SKILL.md', 'rules/daemon-interaction.md'] },
    { id: 'agent-loop', label: 'Agent Loop Addon', manifest: 'agentic/code/addons/agent-loop/manifest.json',
      artifacts: ['agents/ralph-loop.md'] },
    { id: 'rlm', label: 'RLM Addon', manifest: 'agentic/code/addons/rlm/manifest.json',
      artifacts: [] },
    { id: 'ring', label: 'Ring Methodology', manifest: 'agentic/code/addons/ring-methodology/manifest.json',
      artifacts: [] },
  ];

  for (const addon of addonChecks) {
    const manifestPath = path.join(AIWG_ROOT, addon.manifest);
    const hasManifest = await fileExists(manifestPath);
    if (hasManifest) {
      // Check key artifacts exist
      const missing = [];
      for (const artifact of addon.artifacts) {
        const artifactPath = path.join(path.dirname(manifestPath), artifact);
        if (!(await fileExists(artifactPath))) {
          missing.push(artifact);
        }
      }
      if (missing.length > 0) {
        check(addon.label, 'warn', `Installed but missing: ${missing.join(', ')}`);
      } else {
        try {
          const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
          check(addon.label, 'ok', `v${manifest.version || 'unknown'}`);
        } catch {
          check(addon.label, 'ok', 'Installed');
        }
      }
    }
    // Skip silently if not installed — addons are optional
  }

  // 9b. Upstream addon manifest sweep (#1088)
  // Every directory under agentic/code/addons/ must declare itself via
  // either manifest.json (canonical) or WIP.md (deferred). Anything else
  // ships dark — discoverable by `aiwg use <name>` but invisible to the
  // catalog, registry, and validator.
  try {
    const upstreamAddonsDir = path.join(AIWG_ROOT, 'agentic/code/addons');
    if (await fileExists(upstreamAddonsDir)) {
      const entries = await fs.readdir(upstreamAddonsDir, { withFileTypes: true });
      const orphaned = [];
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const addonPath = path.join(upstreamAddonsDir, entry.name);
        const hasManifest = await fileExists(path.join(addonPath, 'manifest.json'));
        const hasWip = await fileExists(path.join(addonPath, 'WIP.md'));
        if (!hasManifest && !hasWip) {
          orphaned.push(entry.name);
        }
      }
      if (orphaned.length > 0) {
        check(
          'Upstream addon manifests',
          'warn',
          `${orphaned.length} addon(s) missing both manifest.json and WIP.md: ${orphaned.join(', ')}. ` +
            `Each upstream addon must declare itself as deployable (manifest.json) or deferred (WIP.md). See #1088.`,
        );
      } else {
        check('Upstream addon manifests', 'ok', `${entries.filter(e => e.isDirectory()).length} addons declared`);
      }
    }
  } catch {
    // Sweep is best-effort; never block doctor on FS exceptions
  }

  // 10. Check behaviors (OpenClaw native or Claude emulated)
  const openclawBehaviors = path.join(os.homedir(), '.openclaw', 'behaviors');
  const claudeHooks = path.join(process.cwd(), '.claude', 'hooks');
  const hasOpenclawBehaviors = await fileExists(openclawBehaviors);
  const hasClaudeHooks = await fileExists(claudeHooks);
  if (hasOpenclawBehaviors) {
    const entries = await fs.readdir(openclawBehaviors, { withFileTypes: true });
    const behaviorCount = entries.filter(e => e.isDirectory()).length;
    if (behaviorCount > 0) {
      check('OpenClaw Behaviors', 'ok', `${behaviorCount} behaviors deployed (native)`);
    } else {
      check('OpenClaw Behaviors', 'info', 'Behaviors directory exists but empty (run: aiwg use daemon)');
    }
  } else if (hasClaudeHooks) {
    const entries = await fs.readdir(claudeHooks);
    const hookCount = entries.filter(f => f.endsWith('.md') || f.endsWith('.json')).length;
    if (hookCount > 0) {
      check('Behaviors (Claude)', 'ok', `${hookCount} behavior hooks deployed (emulated)`);
    } else {
      check('Behaviors (Claude)', 'info', 'Hooks directory exists but empty');
    }
  } else {
    check('Behaviors', 'info', 'No behaviors deployed (run: aiwg use daemon)');
  }

  // 11a. Storage config validation (no-op when .aiwg/storage.config absent)
  try {
    const projectDir = process.cwd();
    const storageCfgPath = path.join(projectDir, '.aiwg', 'storage.config');
    if (await fileExists(storageCfgPath)) {
      try {
        const raw = await fs.readFile(storageCfgPath, 'utf-8');
        const parsed = JSON.parse(raw);
        // Lazy import the validator from the compiled storage module so we
        // don't duplicate the credential-walk logic in this script.
        const { validateStorageConfig } = await import(path.join(AIWG_ROOT, 'dist', 'src', 'storage', 'config.js'));
        validateStorageConfig(parsed, storageCfgPath);
        check('Storage Config', 'ok', `Valid: ${storageCfgPath}`);
      } catch (err) {
        check('Storage Config', 'error', err.message);
      }
    } else {
      check('Storage Config', 'info', 'No .aiwg/storage.config (using fs defaults)');
    }
  } catch {
    // Validator import failed (e.g., dist not built in dev). Non-fatal — skip silently.
  }

  // 11b. Validate .aiwg/aiwg.config remotes block (#994)
  // Ensures any declared remote name actually exists in `git remote`.
  try {
    const projectDir = process.cwd();
    const aiwgCfgPath = path.join(projectDir, '.aiwg', 'aiwg.config');
    if (await fileExists(aiwgCfgPath)) {
      let raw;
      try {
        raw = JSON.parse(await fs.readFile(aiwgCfgPath, 'utf-8'));
      } catch (err) {
        check('Remotes Config', 'error', `Failed to parse .aiwg/aiwg.config: ${err.message}`);
        raw = null;
      }
      if (raw && raw.remotes) {
        // Collect actual git remote names; tolerate non-git directories.
        let gitRemotes = [];
        try {
          gitRemotes = execSync('git remote', { cwd: projectDir, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] })
            .trim()
            .split('\n')
            .filter(Boolean);
        } catch {
          // Not a git repo — skip silently
        }

        if (gitRemotes.length > 0) {
          const declared = [];
          if (raw.remotes.primary) declared.push({ field: 'primary', name: raw.remotes.primary });
          if (raw.remotes.issue_tracker) declared.push({ field: 'issue_tracker', name: raw.remotes.issue_tracker });
          if (raw.remotes.ci) declared.push({ field: 'ci', name: raw.remotes.ci });
          for (const sec of raw.remotes.secondary || []) {
            if (sec && sec.name) declared.push({ field: `secondary.${sec.name}`, name: sec.name });
          }

          const missing = declared.filter(d => !gitRemotes.includes(d.name));
          if (missing.length === 0) {
            const primary = raw.remotes.primary || 'origin';
            check('Remotes Config', 'ok', `primary=${primary} (${declared.length} declared, all present)`);
          } else {
            const list = missing.map(m => `${m.field}=${m.name}`).join(', ');
            check(
              'Remotes Config',
              'warn',
              `Declared remote(s) missing from git: ${list}. Available: ${gitRemotes.join(', ')}`,
            );
          }
        }
      }
    }
  } catch {
    // Non-fatal — skip silently
  }

  // 11c. Validate .aiwg/aiwg.config delivery block (#995)
  // Sanity-check the resolved delivery policy against actual repo state.
  try {
    const projectDir = process.cwd();
    const aiwgCfgPath = path.join(projectDir, '.aiwg', 'aiwg.config');
    if (await fileExists(aiwgCfgPath)) {
      let raw;
      try {
        raw = JSON.parse(await fs.readFile(aiwgCfgPath, 'utf-8'));
      } catch {
        raw = null;
      }
      if (raw && raw.delivery) {
        const d = raw.delivery;
        const issues = [];

        // mode validation
        const validModes = ['direct', 'feature-branch', 'pr-required'];
        if (d.mode && !validModes.includes(d.mode)) {
          issues.push(`mode=${d.mode} (must be one of ${validModes.join(', ')})`);
        }

        // merge_style validation
        const validMergeStyles = ['rebase-merge', 'squash', 'merge', 'fast-forward-only'];
        if (d.merge_style && !validMergeStyles.includes(d.merge_style)) {
          issues.push(`merge_style=${d.merge_style} (must be one of ${validMergeStyles.join(', ')})`);
        }

        // force_push_policy validation
        const validForcePush = ['never', 'own-branch-only', 'allowed'];
        if (d.force_push_policy && !validForcePush.includes(d.force_push_policy)) {
          issues.push(`force_push_policy=${d.force_push_policy} (must be one of ${validForcePush.join(', ')})`);
        }

        // default_branch existence — best effort, only when in a git repo
        const defaultBranch = d.default_branch || 'main';
        try {
          execSync(`git -C ${JSON.stringify(projectDir)} rev-parse --verify --quiet ${JSON.stringify(defaultBranch)}`, {
            stdio: 'pipe',
          });
        } catch {
          // Branch may not exist locally on a fresh clone; downgrade to info, not error
          issues.push(`default_branch '${defaultBranch}' not found locally (may be remote-only — this is informational)`);
        }

        if (issues.length === 0) {
          const mode = d.mode || 'pr-required';
          const merge = d.merge_style || 'rebase-merge';
          check('Delivery Policy', 'ok', `mode=${mode} merge=${merge} default_branch=${defaultBranch}`);
        } else {
          check('Delivery Policy', 'warn', issues.join('; '));
        }
      }
    }
  } catch {
    // Non-fatal — skip silently
  }

  // 11. Check .gitignore for AIWG runtime patterns (warning if missing)
  const AIWG_RUNTIME_PATTERNS = ['.aiwg/working/', '.aiwg/ralph/', '.aiwg/ralph-external/'];
  const gitignorePath = path.join(process.cwd(), '.gitignore');
  try {
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    const lines = gitignoreContent.split('\n').map(l => l.trim());
    const isCovered = (pattern) => {
      if (lines.includes(pattern)) return true;
      if (lines.includes(pattern.replace(/\/$/, ''))) return true;
      const parts = pattern.split('/').filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        const parent = parts.slice(0, i).join('/') + '/';
        if (lines.includes(parent) || lines.includes(parent.replace(/\/$/, ''))) return true;
      }
      return false;
    };
    const missing = AIWG_RUNTIME_PATTERNS.filter(p => !isCovered(p));
    if (missing.length === 0) {
      check('.gitignore', 'ok', 'AIWG runtime paths covered');
    } else {
      check('.gitignore', 'warn', `Missing AIWG runtime patterns: ${missing.join(', ')} — run "aiwg config gitignore --fix"`);
    }
  } catch {
    // No .gitignore or unreadable — skip silently
  }

  // Print results
  console.log('');

  const statusSymbols = { ok: '✓', warn: '⚠', error: '✗', info: '○' };
  const colorFns = {
    ok: isTTY ? chalk.green : (s) => s,
    warn: isTTY ? chalk.yellow : (s) => s,
    error: isTTY ? chalk.red : (s) => s,
    info: isTTY ? chalk.cyan : (s) => s
  };

  for (const { name, status, message } of checks) {
    const symbol = statusSymbols[status];
    const colorFn = colorFns[status] || ((s) => s);
    console.log(`  ${colorFn(symbol)} ${name}: ${message}`);
  }

  // Summary
  const pass = checks.filter(c => c.status === 'ok').length;
  const errors = checks.filter(c => c.status === 'error').length;
  const warnings = checks.filter(c => c.status === 'warn').length;

  console.log(rule);
  console.log('');

  if (errors > 0) {
    const msg = `${errors} error(s), ${warnings} warning(s), ${pass} passed`;
    console.log(isTTY ? chalk.red(`  ✗ ${msg}`) : `  FAIL ${msg}`);
    console.log('');
    process.exit(1);
  } else if (warnings > 0) {
    const msg = `${warnings} warning(s), ${pass} passed`;
    console.log(isTTY ? chalk.yellow(`  ⚠ ${msg}`) : `  WARN ${msg}`);
  } else {
    console.log(isTTY ? chalk.green(`  ✓ All ${pass} checks passed`) : `  OK All ${pass} checks passed`);
  }

  console.log('');
}

runDoctor().catch(error => {
  console.error('Doctor failed:', error.message);
  process.exit(1);
});
