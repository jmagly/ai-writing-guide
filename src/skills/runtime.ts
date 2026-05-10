/**
 * Skill script runtime registry (#1227).
 *
 * Resolves a runtime name from a skill's `script.runtime` declaration to
 * an interpreter command + args list. The CLI uses this dispatch table
 * to invoke skill scripts with the right interpreter, regardless of the
 * agent's host platform.
 *
 * Schema in SKILL.md frontmatter:
 *
 *   script:
 *     entrypoint: scripts/voice_loader.py
 *     runtime: python3
 *
 * No silent fallbacks: an unknown runtime name produces a clear error
 * with the supported list. `auto` dispatches by file extension, with
 * shebang as a tiebreaker for ambiguous extensions.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';

/**
 * A resolved runtime invocation: the interpreter binary plus any leading
 * args that prefix the entrypoint path.
 */
export interface RuntimeInvocation {
  command: string;
  prefixArgs: string[];
}

/**
 * Built-in runtime → interpreter mapping. Keep this small and explicit.
 * New runtimes go here, not in random call sites.
 */
const RUNTIME_TABLE: Record<string, RuntimeInvocation> = {
  node: { command: 'node', prefixArgs: [] },
  python: { command: 'python3', prefixArgs: [] },
  python3: { command: 'python3', prefixArgs: [] },
  bash: { command: 'bash', prefixArgs: [] },
  sh: { command: 'sh', prefixArgs: [] },
  pwsh: { command: 'pwsh', prefixArgs: ['-File'] },
  ruby: { command: 'ruby', prefixArgs: [] },
};

/**
 * The set of supported runtime names — used in error messages so users
 * see what they can pick from when they typo a runtime.
 */
export function supportedRuntimes(): string[] {
  return [...Object.keys(RUNTIME_TABLE), 'auto'];
}

/**
 * Resolve a runtime name (potentially `auto`) to an invocation.
 *
 * `auto` resolves by file extension first; if the extension is unknown,
 * it reads the entrypoint's shebang line. Returns null if neither path
 * yields a known runtime — callers must surface that as a user error.
 */
export async function resolveRuntime(
  runtimeName: string,
  entrypointAbsPath: string,
): Promise<RuntimeInvocation | null> {
  const name = runtimeName.toLowerCase().trim();
  if (name !== 'auto') {
    return RUNTIME_TABLE[name] ?? null;
  }
  // auto: extension first
  const ext = path.extname(entrypointAbsPath).toLowerCase();
  const byExt: Record<string, string> = {
    '.js': 'node',
    '.mjs': 'node',
    '.cjs': 'node',
    '.py': 'python3',
    '.sh': 'bash',
    '.bash': 'bash',
    '.ps1': 'pwsh',
    '.rb': 'ruby',
  };
  const byExtName = byExt[ext];
  if (byExtName) return RUNTIME_TABLE[byExtName] ?? null;
  // Shebang fallback
  try {
    const head = await fs.readFile(entrypointAbsPath, 'utf8');
    const firstLine = head.split('\n', 1)[0] ?? '';
    if (firstLine.startsWith('#!')) {
      if (firstLine.includes('python3')) return RUNTIME_TABLE.python3;
      if (firstLine.includes('python')) return RUNTIME_TABLE.python3;
      if (firstLine.includes('node')) return RUNTIME_TABLE.node;
      if (firstLine.includes('bash')) return RUNTIME_TABLE.bash;
      if (firstLine.match(/\bsh\b/)) return RUNTIME_TABLE.sh;
      if (firstLine.includes('ruby')) return RUNTIME_TABLE.ruby;
      if (firstLine.includes('pwsh')) return RUNTIME_TABLE.pwsh;
    }
  } catch {
    // unreadable — fall through to null
  }
  return null;
}
