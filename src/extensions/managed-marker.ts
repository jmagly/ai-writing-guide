/**
 * Managed-marker normalization for hash equivalence.
 *
 * The deployer injects a managed-marker comment into every deployed
 * markdown artifact (see `tools/agents/providers/base.mjs:addManagedMarker`).
 * Two forms exist:
 *
 *   1. YAML-frontmatter inline (current — non-breaking for parsers):
 *
 *        ---
 *        # aiwg:managed v<VERSION> <SOURCE>
 *        name: ...
 *        ...
 *        ---
 *
 *   2. HTML-comment-on-line-1 (legacy — files with no frontmatter):
 *
 *        <!-- aiwg:managed v<VERSION> <SOURCE> -->
 *        # Some heading
 *
 * Source files in the repo do NOT carry the marker; it's a deploy-time
 * artifact only. That means a naive `sha256(source) == sha256(deployed)`
 * comparison will always fail by exactly one line, producing the spurious
 * drift detected in #1086 and the same false-positive surface in
 * `aiwg remove`'s pristine/mutated classifier (per #1048's design).
 *
 * This module makes the marker invisible to the equivalence relation:
 * both deploy-time hash recording and post-deploy comparison hash the
 * marker-stripped form. The marker therefore never participates in the
 * "is this the same file?" check.
 *
 * Trade-off: an operator who removes the marker from a deployed file
 * but leaves the rest unchanged is NOT flagged as drift (stripped both
 * sides → same content → same hash). This is a conscious choice — the
 * marker exists for `aiwg remove`'s ownership labelling, not as a
 * tamper-evident seal. Real content edits remain detected normally.
 *
 * @implements #1086
 */

import { readFile } from 'fs/promises';
import { createHash } from 'crypto';

/**
 * Match either marker form:
 *   - HTML comment at line 1: `<!-- aiwg:managed v... ... -->\n`
 *   - YAML comment inside frontmatter (line 2): `# aiwg:managed v... ...\n`
 *
 * Multiline mode anchors `^` to start of any line, so the YAML form is
 * matched whether it appears as the first or second line of the file.
 *
 * The pattern intentionally does NOT consume any other line; it strips
 * only the single marker line and its trailing newline.
 */
const MANAGED_MARKER_LINE_RE = /^(?:<!-- aiwg:managed [^\n]*-->|# aiwg:managed [^\n]*)\n/m;

/**
 * Return the content with the managed-marker line removed if present.
 * Idempotent — calling twice on the same input is the same as calling once.
 *
 * If no marker is present, returns the input unchanged (referentially —
 * same string instance).
 */
export function stripManagedMarker(content: string): string {
  return content.replace(MANAGED_MARKER_LINE_RE, '');
}

/**
 * Read a file from disk, strip any managed-marker line, and return the
 * SHA-256 hex digest of the result.
 *
 * Throws on read errors (caller should catch and treat as missing).
 *
 * Used in two places:
 *   - `hashBundleArtifacts()` records this hash for source files at
 *     deploy time. Source files have no marker, so this is identical
 *     to the previous unnormalized hash — backwards-compatible with
 *     existing registry entries.
 *   - Drift detection (`aiwg doctor`) and pristine classification
 *     (`aiwg remove`) hash the deployed file using this function. The
 *     marker line is stripped before hashing so the two sides match.
 */
export async function sha256OfFileNormalized(absPath: string): Promise<string> {
  const buf = await readFile(absPath, 'utf8');
  const stripped = stripManagedMarker(buf);
  return createHash('sha256').update(stripped, 'utf8').digest('hex');
}
