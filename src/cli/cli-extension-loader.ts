/**
 * CLI Extension Loader
 *
 * Resolves addon-contributed CLI commands via `.aiwg/cli-extensions.json`.
 * When an addon declares `cli_commands` in its manifest, `aiwg use <addon>`
 * registers the namespace here. The router falls through to this loader
 * when no built-in command matches.
 *
 * @implements #478
 * @architecture Addon manifests → cli-extensions.json → dynamic import → execute
 */

import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import * as ui from './ui.js';

/**
 * Shape of a single subcommand entry in cli-extensions.json
 */
interface CliSubcommand {
  file: string;
  description: string;
  hook_event?: string;
}

/**
 * Shape of a namespace entry in cli-extensions.json
 */
interface CliNamespace {
  source: string;
  description: string;
  subcommands: Record<string, CliSubcommand>;
}

/**
 * Full cli-extensions.json structure
 */
interface CliExtensionsRegistry {
  [namespace: string]: CliNamespace;
}

/**
 * Context passed to addon CLI command handlers
 */
export interface CliCommandContext {
  cwd: string;
  frameworkRoot: string;
  namespace: string;
  subcommand: string;
}

/**
 * Result from an addon CLI command handler
 */
export interface CliCommandResult {
  exitCode: number;
  message?: string;
}

/**
 * Read the cli-extensions registry from the current project
 */
async function readRegistry(cwd: string): Promise<CliExtensionsRegistry | null> {
  const registryPath = path.join(cwd, '.aiwg', 'cli-extensions.json');
  try {
    const content = await fs.readFile(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Write the cli-extensions registry to the current project
 */
export async function writeRegistry(cwd: string, registry: CliExtensionsRegistry): Promise<void> {
  const dir = path.join(cwd, '.aiwg');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'cli-extensions.json'),
    JSON.stringify(registry, null, 2) + '\n'
  );
}

/**
 * Register an addon's CLI commands into the project's cli-extensions.json
 *
 * Called by `aiwg use <addon>` after reading the addon manifest.
 */
export async function registerCliCommands(
  cwd: string,
  namespace: string,
  description: string,
  source: string,
  subcommands: Record<string, CliSubcommand>
): Promise<void> {
  const existing = await readRegistry(cwd) ?? {};
  existing[namespace] = { source, description, subcommands };
  await writeRegistry(cwd, existing);
}

/**
 * Try to execute an addon-contributed CLI command
 *
 * Returns null if the namespace is not registered (caller should show "unknown command").
 * Returns a CliCommandResult if the namespace is found.
 */
export async function tryExecuteCliExtension(
  rawCommand: string,
  commandArgs: string[],
  cwd: string,
  frameworkRoot: string
): Promise<CliCommandResult | null> {
  const registry = await readRegistry(cwd);
  if (!registry || !registry[rawCommand]) {
    return null;
  }

  const ns = registry[rawCommand];
  const subcommand = commandArgs[0];

  // `aiwg <addon> --help` or `aiwg <addon>` with no subcommand
  if (!subcommand || subcommand === '--help' || subcommand === '-h') {
    printNamespaceHelp(rawCommand, ns);
    return { exitCode: 0 };
  }

  // Look up subcommand
  const sub = ns.subcommands[subcommand];
  if (!sub) {
    ui.error(`Unknown subcommand: ${rawCommand} ${subcommand}`);
    printNamespaceHelp(rawCommand, ns);
    return { exitCode: 1 };
  }

  // Resolve the mjs file path
  const mjsPath = path.resolve(ns.source, path.basename(sub.file));

  try {
    await fs.access(mjsPath);
  } catch {
    ui.error(`CLI extension file not found: ${mjsPath}`);
    return { exitCode: 1, message: `Missing: ${mjsPath}` };
  }

  // Dynamic import the mjs module
  const moduleUrl = pathToFileURL(mjsPath).href;
  const mod = await import(moduleUrl);

  if (typeof mod.default !== 'function') {
    ui.error(`CLI extension ${sub.file} does not export a default function`);
    return { exitCode: 1 };
  }

  // Build context
  const ctx: CliCommandContext = {
    cwd,
    frameworkRoot,
    namespace: rawCommand,
    subcommand,
  };

  // Execute
  const result = await mod.default(commandArgs.slice(1), ctx);

  // Normalize result
  if (typeof result === 'object' && result !== null) {
    return {
      exitCode: result.exitCode ?? 0,
      message: result.message,
    };
  }

  return { exitCode: 0 };
}

/**
 * Hook events that should be auto-registered.
 * FeatureComplete is excluded — it's a deliberate user action, not a background event.
 */
const AUTO_HOOK_EVENTS = new Set(['Stop', 'SessionStart', 'SessionEnd', 'PreToolUse', 'PostToolUse']);

/**
 * Shape of a Claude Code hook entry in settings.json
 */
interface ClaudeHookEntry {
  type: string;
  command: string;
}

interface ClaudeHookGroup {
  matcher?: string;
  hooks: ClaudeHookEntry[];
}

/** Legacy shape written before #107: array of `{matcher, hooks}` */
interface LegacyClaudeHookMatcher {
  matcher: string;
  hooks: ClaudeHookEntry[];
}

type ClaudeHooksField = Record<string, ClaudeHookGroup[]>;

interface ClaudeSettings {
  [key: string]: unknown;
  hooks?: ClaudeHooksField | LegacyClaudeHookMatcher[];
}

/**
 * Migrate legacy array-shaped hooks to the object form Claude Code expects.
 * See #107.
 */
function normalizeClaudeHooks(
  raw: ClaudeHooksField | LegacyClaudeHookMatcher[] | undefined,
): ClaudeHooksField {
  if (Array.isArray(raw)) {
    const out: ClaudeHooksField = {};
    for (const m of raw) {
      if (!m || typeof m.matcher !== 'string' || !Array.isArray(m.hooks)) continue;
      if (!out[m.matcher]) out[m.matcher] = [];
      out[m.matcher].push({ hooks: m.hooks });
    }
    return out;
  }
  if (raw && typeof raw === 'object') return raw;
  return {};
}

/**
 * Register Claude Code hooks from addon manifest hook_event annotations.
 *
 * Reads .claude/settings.json, merges hook entries for subcommands that
 * declare hook_event, and writes back. Idempotent — duplicate entries
 * are skipped. Only registers events in AUTO_HOOK_EVENTS.
 *
 * Schema: writes the object-keyed form Claude Code requires (#107). If
 * an existing settings.json has a legacy array-shaped `hooks` field, it
 * is migrated to the object shape during this write.
 *
 * @implements #480
 */
export async function registerHooks(
  cwd: string,
  namespace: string,
  subcommands: Record<string, CliSubcommand>
): Promise<string[]> {
  const settingsPath = path.join(cwd, '.claude', 'settings.json');
  let settings: ClaudeSettings;

  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    // No settings file yet — start fresh
    settings = {};
  }

  const wasLegacy = Array.isArray(settings.hooks);
  const hooksObj = normalizeClaudeHooks(settings.hooks);
  settings.hooks = hooksObj;

  const registered: string[] = [];

  for (const [name, sub] of Object.entries(subcommands)) {
    if (!sub.hook_event || !AUTO_HOOK_EVENTS.has(sub.hook_event)) {
      continue;
    }

    const command = `aiwg ${namespace} ${name}`;
    const event = sub.hook_event;

    if (!hooksObj[event]) hooksObj[event] = [];
    const groups = hooksObj[event];

    // Skip if any existing group already has this command
    const exists = groups.some(
      (g) => Array.isArray(g.hooks) && g.hooks.some((h) => h.command === command),
    );
    if (exists) continue;

    groups.push({ hooks: [{ type: 'command', command }] });
    registered.push(`${event} → ${command}`);
  }

  // Write if we registered anything OR migrated an existing legacy field.
  if (registered.length > 0 || wasLegacy) {
    await fs.mkdir(path.join(cwd, '.claude'), { recursive: true });
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  return registered;
}

/**
 * Remove Claude Code hooks for a given namespace.
 *
 * Strips hook entries whose command matches `aiwg <namespace> *`.
 * Removes empty groups. Writes back only if changes were made.
 *
 * Migrates legacy array-shaped `hooks` fields to object form on write
 * (#107).
 */
export async function unregisterHooks(
  cwd: string,
  namespace: string
): Promise<number> {
  const settingsPath = path.join(cwd, '.claude', 'settings.json');
  let settings: ClaudeSettings;

  try {
    const content = await fs.readFile(settingsPath, 'utf-8');
    settings = JSON.parse(content);
  } catch {
    return 0;
  }

  if (!settings.hooks) return 0;

  const wasLegacy = Array.isArray(settings.hooks);
  const hooksObj = normalizeClaudeHooks(settings.hooks);
  settings.hooks = hooksObj;

  const prefix = `aiwg ${namespace} `;
  let removed = 0;

  for (const event of Object.keys(hooksObj)) {
    const groups = hooksObj[event];
    for (const group of groups) {
      const before = group.hooks.length;
      group.hooks = group.hooks.filter((h) => !h.command.startsWith(prefix));
      removed += before - group.hooks.length;
    }
    // Drop empty groups
    hooksObj[event] = groups.filter((g) => g.hooks.length > 0);
    // Drop the event entirely if no groups remain
    if (hooksObj[event].length === 0) delete hooksObj[event];
  }

  if (removed > 0 || wasLegacy) {
    await fs.writeFile(settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  return removed;
}

/**
 * Print help for a CLI extension namespace
 */
function printNamespaceHelp(namespace: string, ns: CliNamespace): void {
  ui.blank();
  console.log(`  ${ui.bold(`aiwg ${namespace}`)} — ${ns.description}`);
  ui.blank();
  console.log('  Subcommands:');
  ui.blank();

  const entries = Object.entries(ns.subcommands);
  const maxLen = Math.max(...entries.map(([name]) => name.length));

  for (const [name, sub] of entries) {
    console.log(`    ${name.padEnd(maxLen + 2)} ${sub.description}`);
  }

  ui.blank();
  console.log(`  Usage: aiwg ${namespace} <subcommand> [args]`);
  ui.blank();
}
