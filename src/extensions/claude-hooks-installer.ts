/**
 * Claude Code aiwg-hooks installer (PUW-010 / #1111).
 *
 * When `aiwg use --provider claude` runs and the operator hasn't opted
 * out via `--no-hooks`, this module:
 *   1. Copies the aiwg-hooks addon's JS handler scripts to .claude/hooks/
 *   2. Reads existing .claude/settings.json (backing up first if no AIWG
 *      marker is present, per ADR-3 §5)
 *   3. Merges AIWG hook entries with `_aiwg_managed: true` tagging
 *   4. Writes settings.json atomically
 *
 * The merge preserves operator-authored entries. `aiwg refresh
 * --restore-hooks` reads the most-recent .bak.<timestamp> file and
 * restores it.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * Hook script → Claude Code hook event mapping.
 *
 * Per the script-source comments at agentic/code/addons/aiwg-hooks/hooks/.
 */
const HOOK_SCRIPTS: ReadonlyArray<{ file: string; events: ReadonlyArray<string> }> = [
  { file: 'aiwg-permissions.js', events: ['PermissionRequest'] },
  { file: 'aiwg-session.js', events: ['SessionStart'] },
  { file: 'aiwg-trace.js', events: ['SubagentStart', 'SubagentStop'] },
];

interface HookEntry {
  type: string;
  command: string;
  _aiwg_managed?: boolean;
  _aiwg_id?: string;
}

interface HookMatcher {
  matcher: string;
  hooks: HookEntry[];
}

interface ClaudeSettings {
  [key: string]: unknown;
  hooks?: HookMatcher[];
}

export interface InstallOptions {
  /** Project root absolute path (where .claude/ lives) */
  projectPath: string;
  /** Framework root (where agentic/code/addons/aiwg-hooks/ lives) */
  frameworkRoot: string;
  /** Don't write files; describe what would happen */
  dryRun?: boolean;
  /** Force overwrite even when settings.json has no AIWG marker (with backup) */
  force?: boolean;
  /** Verbose logging */
  verbose?: boolean;
}

export interface InstallResult {
  installedScripts: string[];
  settingsPath: string;
  backupPath?: string;
  registeredEvents: string[];
  warnings: string[];
}

/**
 * Detect whether the existing settings.json carries the AIWG signature
 * (any hook entry tagged `_aiwg_managed: true`).
 */
function hasAiwgMarker(settings: ClaudeSettings): boolean {
  if (!Array.isArray(settings.hooks)) return false;
  return settings.hooks.some((m) =>
    Array.isArray(m.hooks) && m.hooks.some((h) => h && h._aiwg_managed === true),
  );
}

/**
 * Atomic write via tmpfile+rename so partial state never persists.
 */
async function atomicWrite(filePath: string, content: string): Promise<void> {
  const dir = path.dirname(filePath);
  const tmp = path.join(dir, `.${path.basename(filePath)}.tmp.${process.pid}`);
  await fs.writeFile(tmp, content, 'utf8');
  try {
    await fs.rename(tmp, filePath);
  } catch (err) {
    await fs.unlink(tmp).catch(() => undefined);
    throw err;
  }
}

/**
 * Install AIWG hooks for Claude Code.
 *
 * Returns null if the addon source isn't present (e.g., aiwg-hooks not
 * installed). Otherwise returns an InstallResult describing what was
 * written.
 */
export async function installAiwgHooks(opts: InstallOptions): Promise<InstallResult | null> {
  const sourceHooksDir = path.join(
    opts.frameworkRoot,
    'agentic',
    'code',
    'addons',
    'aiwg-hooks',
    'hooks',
  );

  let sourceFiles: string[];
  try {
    sourceFiles = await fs.readdir(sourceHooksDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }

  const result: InstallResult = {
    installedScripts: [],
    settingsPath: path.join(opts.projectPath, '.claude', 'settings.json'),
    registeredEvents: [],
    warnings: [],
  };

  // 1. Copy hook scripts to .claude/hooks/
  const claudeHooksDir = path.join(opts.projectPath, '.claude', 'hooks');
  if (!opts.dryRun) {
    await fs.mkdir(claudeHooksDir, { recursive: true });
  }

  for (const { file } of HOOK_SCRIPTS) {
    if (!sourceFiles.includes(file)) {
      result.warnings.push(`hook script not found in addon source: ${file}`);
      continue;
    }
    const src = path.join(sourceHooksDir, file);
    const dst = path.join(claudeHooksDir, file);
    if (opts.dryRun) {
      result.installedScripts.push(`${dst} (dry-run)`);
      continue;
    }
    await fs.copyFile(src, dst);
    try {
      await fs.chmod(dst, 0o755);
    } catch {
      // Non-POSIX
    }
    result.installedScripts.push(dst);
  }

  // 2. Read existing settings.json
  let settings: ClaudeSettings = {};
  try {
    const raw = await fs.readFile(result.settingsPath, 'utf8');
    settings = JSON.parse(raw);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw err;
    }
  }

  // 3. Backup if existing settings.json has no AIWG marker
  if (!opts.dryRun) {
    try {
      const exists = await fs
        .access(result.settingsPath)
        .then(() => true)
        .catch(() => false);
      if (exists && !hasAiwgMarker(settings)) {
        const backup = `${result.settingsPath}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
        await fs.copyFile(result.settingsPath, backup);
        result.backupPath = backup;
        result.warnings.push(`Backed up pre-existing settings.json to ${backup}`);
      }
    } catch (err) {
      result.warnings.push(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // 4. Merge AIWG hook entries
  if (!Array.isArray(settings.hooks)) {
    settings.hooks = [];
  }

  for (const { file, events } of HOOK_SCRIPTS) {
    if (!sourceFiles.includes(file)) continue;
    const command = `node ${path.join('.claude', 'hooks', file)}`;
    const hookId = file.replace(/\.js$/, '');

    for (const event of events) {
      let matcher = settings.hooks.find((m) => m.matcher === event);
      if (!matcher) {
        matcher = { matcher: event, hooks: [] };
        settings.hooks.push(matcher);
      }
      // Skip if AIWG entry already present
      const exists = matcher.hooks.some((h) => h._aiwg_id === hookId);
      if (exists) continue;
      matcher.hooks.push({
        type: 'command',
        command,
        _aiwg_managed: true,
        _aiwg_id: hookId,
      });
      result.registeredEvents.push(`${event} → ${hookId}`);
    }
  }

  // 5. Atomic write
  if (!opts.dryRun) {
    await fs.mkdir(path.dirname(result.settingsPath), { recursive: true });
    await atomicWrite(result.settingsPath, JSON.stringify(settings, null, 2) + '\n');
  }

  return result;
}

/**
 * Restore the most-recent settings.json backup (per ADR-3 §5 rollback).
 *
 * Reads `.claude/settings.json.bak.<RFC3339>` files and restores the
 * lexicographically-latest one (timestamp ordering). Returns the path
 * restored or null if no backup exists.
 */
export async function restoreSettingsBackup(projectPath: string): Promise<string | null> {
  const claudeDir = path.join(projectPath, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.json');
  let entries: string[];
  try {
    entries = await fs.readdir(claudeDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw err;
  }
  const backups = entries
    .filter((e) => e.startsWith('settings.json.bak.'))
    .sort();
  if (backups.length === 0) return null;
  const latest = backups[backups.length - 1];
  const src = path.join(claudeDir, latest);
  await fs.copyFile(src, settingsPath);
  return src;
}
