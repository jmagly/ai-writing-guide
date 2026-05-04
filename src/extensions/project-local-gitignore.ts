/**
 * Project-local .gitignore management.
 *
 * AIWG-managed projects historically `.gitignore` the whole `.aiwg/` tree
 * because most of it is generated state (working scratch, ralph state,
 * research corpora, etc.). With #1033's project-local artifact lifecycle,
 * `.aiwg/{addons,extensions,frameworks,plugins}/` is now also operator-
 * authored source — and a blanket ignore silently drops it from version
 * control.
 *
 * This module provides:
 *
 *   - `detectAiwgBlanketIgnore()`   — read .gitignore, classify the rules
 *   - `appendAiwgSourceTrackBlock()` — append the canonical un-ignore
 *                                      block (sentinel-marked, idempotent)
 *   - `checkBundleManifestIgnored()` — per-bundle: is its manifest.json
 *                                      git-ignored right now?
 *
 * @implements #1085
 */

import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileP = promisify(execFile);

/**
 * Sentinel comment that marks the AIWG-managed un-ignore block.
 *
 * We detect existing blocks by this exact line so re-running new-bundle
 * never produces duplicate blocks.
 */
export const AIWG_GITIGNORE_SENTINEL = '# AIWG project-local bundle source — track these (managed by AIWG)';

/**
 * The canonical block we append when a project blanket-ignores `.aiwg/`
 * but doesn't yet un-ignore the source directories.
 */
export const AIWG_GITIGNORE_BLOCK = [
  '',
  AIWG_GITIGNORE_SENTINEL,
  '!.aiwg/aiwg.config',
  '!.aiwg/addons/',
  '!.aiwg/extensions/',
  '!.aiwg/frameworks/',
  '!.aiwg/plugins/',
  '',
].join('\n');

export interface BlanketIgnoreReport {
  /** True when `.gitignore` contains a rule that ignores `.aiwg/` wholesale. */
  blanketIgnore: boolean;
  /**
   * True when `.gitignore` already explicitly un-ignores at least one of
   * the project-local source directories (addons/extensions/frameworks/
   * plugins). Treated as "operator already configured this — don't touch".
   */
  hasExistingNegation: boolean;
  /**
   * True when our sentinel-marked block is already present (in any form,
   * even if the operator edited individual lines). Used for idempotency.
   */
  hasManagedBlock: boolean;
  /** `.gitignore` exists at the project root. False means "no git project here". */
  gitignoreExists: boolean;
}

/**
 * Inspect a project's `.gitignore` and classify it for our purposes.
 *
 * Detection rules — only the patterns we actually need:
 *
 *   blanket ignore: a non-negation, non-comment line that matches the
 *   `.aiwg/` directory directly. Specifically: `.aiwg`, `.aiwg/`,
 *   `.aiwg/*`, `.aiwg/**`, or path-anchored variants thereof.
 *
 *   existing negation: a line beginning with `!` that points into one of
 *   our four source directories. e.g. `!.aiwg/addons/` or
 *   `!.aiwg/extensions/foo/`.
 */
export async function detectAiwgBlanketIgnore(
  projectDir: string,
): Promise<BlanketIgnoreReport> {
  const path = join(projectDir, '.gitignore');
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch {
    return {
      blanketIgnore: false,
      hasExistingNegation: false,
      hasManagedBlock: false,
      gitignoreExists: false,
    };
  }

  const lines = raw.split(/\r?\n/);
  const stripped = lines.map(l => l.trim()).filter(l => l.length > 0 && !l.startsWith('#'));

  const isBlanket = (l: string): boolean => {
    if (l.startsWith('!')) return false;
    // Strip a leading slash so `/.aiwg/` and `.aiwg/` are equivalent.
    const norm = l.replace(/^\//, '');
    return norm === '.aiwg' || norm === '.aiwg/' || norm === '.aiwg/*' || norm === '.aiwg/**';
  };

  const isSourceNegation = (l: string): boolean => {
    if (!l.startsWith('!')) return false;
    // `.aiwg/addons/`, `.aiwg/extensions/foo`, `/.aiwg/plugins/**`, etc.
    const body = l.slice(1).replace(/^\//, '');
    return /^\.aiwg\/(addons|extensions|frameworks|plugins)(\/.*)?$/.test(body);
  };

  const blanketIgnore = stripped.some(isBlanket);
  const hasExistingNegation = stripped.some(isSourceNegation);
  const hasManagedBlock = lines.some(l => l.trim() === AIWG_GITIGNORE_SENTINEL);

  return { blanketIgnore, hasExistingNegation, hasManagedBlock, gitignoreExists: true };
}

export interface AppendResult {
  /** True when we appended the un-ignore block. */
  added: boolean;
  /**
   * Brief reason, for printing. e.g.
   *   "appended .aiwg/{addons,extensions,frameworks,plugins} un-ignore block"
   *   "no .gitignore — skipped"
   *   "no blanket .aiwg ignore — already tracking sources"
   *   "block already present — no change"
   *   "operator has explicit !.aiwg negation — no change"
   */
  reason: string;
}

/**
 * Append the canonical un-ignore block to `.gitignore` if and only if:
 *
 *   - `.gitignore` exists, AND
 *   - it blanket-ignores `.aiwg/`, AND
 *   - it does NOT already have any source-directory negation, AND
 *   - it does NOT already have our sentinel-marked block.
 *
 * The function is idempotent in all four conditions. No-op when the
 * project doesn't blanket-ignore (operator has presumably configured a
 * selective ignore already).
 */
export async function appendAiwgSourceTrackBlock(
  projectDir: string,
): Promise<AppendResult> {
  const report = await detectAiwgBlanketIgnore(projectDir);

  if (!report.gitignoreExists) {
    return { added: false, reason: 'no .gitignore — skipped' };
  }
  if (!report.blanketIgnore) {
    return { added: false, reason: 'no blanket .aiwg ignore — already tracking sources' };
  }
  // Check managed-block presence BEFORE generic negation detection — once
  // we've added our block, it itself contains source-directory negations,
  // so the existing-negation check would otherwise mis-fire on subsequent
  // runs.
  if (report.hasManagedBlock) {
    return { added: false, reason: 'block already present — no change' };
  }
  if (report.hasExistingNegation) {
    return { added: false, reason: 'operator has explicit !.aiwg negation — no change' };
  }

  const path = join(projectDir, '.gitignore');
  const existing = await readFile(path, 'utf8');
  const sep = existing.endsWith('\n') ? '' : '\n';
  await writeFile(path, existing + sep + AIWG_GITIGNORE_BLOCK, 'utf8');
  return { added: true, reason: 'appended .aiwg/{addons,extensions,frameworks,plugins} un-ignore block' };
}

/**
 * Per-bundle: is its `manifest.json` currently ignored by git?
 *
 * Uses `git check-ignore` which is authoritative — it reflects every
 * `.gitignore` precedence rule, including negations and core.excludesFile.
 *
 * Returns `null` when git isn't installed or the project isn't a git
 * repo. Caller should treat null as "skip the check".
 */
export async function checkBundleManifestIgnored(
  projectDir: string,
  manifestRelPath: string,
): Promise<boolean | null> {
  // Quick sanity: ensure path doesn't try to escape projectDir
  if (manifestRelPath.startsWith('/') || manifestRelPath.includes('..')) {
    return null;
  }
  try {
    await access(join(projectDir, '.git'));
  } catch {
    return null;
  }
  try {
    // `git check-ignore -q <path>` returns exit 0 if path is ignored,
    // 1 if not ignored, 128 on error. We want a tristate.
    await execFileP('git', ['check-ignore', '-q', manifestRelPath], {
      cwd: projectDir,
    });
    // exit 0 → ignored
    return true;
  } catch (err) {
    const code = (err as { code?: number }).code;
    if (code === 1) return false; // not ignored
    return null; // 128 or other — skip the check
  }
}
