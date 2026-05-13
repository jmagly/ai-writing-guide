/**
 * AIWG MCP Server — Shared Helpers
 *
 * @architecture @.aiwg/architecture/sketch-hermes-mcp-parity.md
 * @issues #1311 (scope split), #1312 (command-run), #1313 (discover + pairs)
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Resolve AIWG_ROOT, with safe fallback to known install locations.
 */
export const AIWG_ROOT = process.env.AIWG_ROOT ||
  path.join(process.env.HOME || '', '.local/share/ai-writing-guide');

/**
 * Walk up the directory tree looking for `.aiwg/`.
 *
 * @param {string} startDir
 * @returns {Promise<string>}
 * @throws {Error} when no .aiwg directory found
 */
export async function findProjectRoot(startDir = process.cwd()) {
  let currentDir = startDir;
  while (currentDir !== path.dirname(currentDir)) {
    const aiwgPath = path.join(currentDir, '.aiwg');
    try {
      const stat = await fs.stat(aiwgPath);
      if (stat.isDirectory()) return currentDir;
    } catch {
      // continue up
    }
    currentDir = path.dirname(currentDir);
  }
  throw new Error('No .aiwg directory found. Run from an AIWG project or `aiwg new` first.');
}

/**
 * Resolve project root with optional global fallback (#1311).
 *
 * Tools that operate on global registries (discover, *-show against the
 * canonical corpus) accept a missing project root and fall back to AIWG_ROOT.
 * Tools that operate on `.aiwg/` artifacts (artifact-read, memory-*) reject
 * with a structured remediation message.
 *
 * @param {string|undefined} explicitDir
 * @param {{ allowGlobal?: boolean, toolName?: string }} [options]
 * @returns {Promise<{ root: string, isGlobal: boolean }>}
 */
export async function resolveProjectRoot(explicitDir, { allowGlobal = false, toolName = 'tool' } = {}) {
  if (explicitDir && explicitDir !== '.') {
    return { root: path.resolve(explicitDir), isGlobal: false };
  }
  try {
    const root = await findProjectRoot();
    return { root, isGlobal: false };
  } catch (err) {
    if (allowGlobal) {
      return { root: AIWG_ROOT, isGlobal: true };
    }
    throw new Error(
      `Tool "${toolName}" requires a project root. ${err.message} ` +
      `Remediation: Run from an AIWG project directory or pass project_dir explicitly.`
    );
  }
}

/**
 * The set of MCP tools that are allowed to operate without a project root
 * (they fall back to AIWG_ROOT). Maintained here so tool registrations
 * stay in sync (#1311).
 */
export const GLOBAL_ALLOWED_TOOLS = new Set([
  'discover',
  'skill-list',
  'skill-show',
  'command-list',
  'command-show',
  'rule-list',
  'rule-show',
  'agent-list',  // existing; canonical corpus enumeration
  'agent-show',
  'template-list',
  'template-show',
  'template-render',  // existing; uses corpus templates
]);

export function isGlobalAllowed(toolName) {
  return GLOBAL_ALLOWED_TOOLS.has(toolName);
}

/**
 * Spawn the `aiwg` CLI as a subprocess with safe argv handling (#1312).
 *
 * NEVER use `shell: true` — args must pass as an array so user-provided
 * strings are never interpreted as shell metacharacters. Token security
 * (RULES: token-security) — command path is logged, args content is not.
 *
 * @param {string[]} args
 * @param {{ cwd?: string, env?: object, timeoutMs?: number, input?: string }} [options]
 * @returns {Promise<{ stdout: string, stderr: string, code: number }>}
 */
export function runAiwgCli(args, { cwd, env, timeoutMs = 120_000, input } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn('aiwg', args, {
      shell: false,
      cwd: cwd || process.cwd(),
      env: { ...process.env, ...(env || {}) },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGTERM');
    }, timeoutMs);

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        reject(new Error(`aiwg ${args[0] || ''} timed out after ${timeoutMs}ms`));
        return;
      }
      resolve({ stdout, stderr, code: code ?? -1 });
    });
    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });

    if (input !== undefined) {
      proc.stdin.write(input);
      proc.stdin.end();
    } else {
      proc.stdin.end();
    }
  });
}

/**
 * Structured MCP error response.
 */
export function mcpError(message, { remediation, requiresConfirmation } = {}) {
  const body = { error: message };
  if (remediation) body.remediation = remediation;
  if (requiresConfirmation) body.requires_confirmation = true;
  return {
    content: [{ type: 'text', text: JSON.stringify(body, null, 2) }],
    isError: true,
  };
}

/**
 * Structured MCP success response wrapping a JSON or text payload.
 */
export function mcpJson(data) {
  const text = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
  return { content: [{ type: 'text', text }] };
}

/**
 * Read AIWG CLI command registry to build the command-run allow-list.
 *
 * Lazily loaded from `src/extensions/commands/definitions.ts` — extracts
 * `id:` fields. Cached after first read.
 */
let _commandIds = null;
export async function loadCommandAllowList() {
  if (_commandIds) return _commandIds;
  const defPath = path.join(AIWG_ROOT, 'src/extensions/commands/definitions.ts');
  // Fall back to source-checkout location if AIWG_ROOT points to the project itself
  const candidates = [
    defPath,
    path.resolve(process.cwd(), 'src/extensions/commands/definitions.ts'),
  ];
  let text = '';
  for (const c of candidates) {
    try {
      text = await fs.readFile(c, 'utf-8');
      break;
    } catch {
      // try next
    }
  }
  if (!text) {
    // Last-resort fallback: spawn `aiwg help` and parse — slower but always works
    try {
      const { stdout } = await runAiwgCli(['help'], { timeoutMs: 30_000 });
      _commandIds = new Set(
        Array.from(stdout.matchAll(/^\s{4}([a-z][a-z0-9-]+)\s/gm))
          .map(m => m[1])
      );
      return _commandIds;
    } catch (e) {
      _commandIds = new Set();
      return _commandIds;
    }
  }
  const ids = new Set();
  for (const m of text.matchAll(/^  id: '([^']+)'/gm)) {
    ids.add(m[1]);
  }
  _commandIds = ids;
  return _commandIds;
}

/**
 * Commands that mutate fleet/project state and require explicit `confirmed: true`
 * before `command-run` will execute them. Defensive default.
 */
export const DESTRUCTIVE_COMMANDS = new Set([
  'remove',
  'rollback-workspace',
  'promote',
  'uninstall-plugin',
  'cleanup-audit',
  'doc-sync',
  'sandbox',  // local executor sandbox
  'ralph',    // long-running loop
  'agent-loop-ext',
  'ralph-abort',
]);

export function isDestructive(command) {
  return DESTRUCTIVE_COMMANDS.has(command);
}
