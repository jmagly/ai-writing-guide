/**
 * AGENTS.md size validation and auto-split (PUW-029 / #1130).
 *
 * Per ADR-1 §6: when AGENTS.md content exceeds the 30KB warn threshold or
 * Codex's 32KB hard cap, auto-split moves entries to the spillover block in
 * AGENTS.override.md. The cap (32KB) comes from `codex-rs/config_toml.rs:68`.
 * AGENTS.override.md takes precedence at load time (`agents_md.rs:65`).
 *
 * Priority semantics:
 * - 1 (high): pinned to AGENTS.md; never moves to spillover
 * - 2 (medium): default; moves second
 * - 3 (low): moves first
 * - safety-critical: always pinned to priority 1, regardless of manifest
 *
 * If priority-1 alone exceeds 32KB, that is a hard error (per ADR-1 §6 —
 * operator must split the framework, not silently lose safeguards).
 */

import type { AgentsMdSection, IndexEntry } from './types.js';

export const SOFT_WARN_BYTES = 30 * 1024;
export const HARD_ERROR_BYTES = 32 * 1024;

export const SPILLOVER_START = '<!-- spillover-from-AGENTS.md:START -->';
export const SPILLOVER_END = '<!-- spillover-from-AGENTS.md:END -->';

/**
 * Operator-declared priority map keyed by artifact id.
 *
 * Special key `*` is the default for any id not explicitly listed.
 * Values are 1 (high; pinned), 2 (medium; default), 3 (low; first to overflow).
 * Per ADR-1 §6 the canonical home for this is each framework/addon's
 * `manifest.json:overflow_priority`. Callers merge maps from all installed
 * manifests when assembling the AGENTS.md content.
 */
export type OverflowPriorityMap = Record<string, 1 | 2 | 3>;

/**
 * Resolved priority for one entry — combines safety-critical pinning with
 * the manifest priority lookup. Safety-critical always wins.
 */
function resolvePriority(entry: IndexEntry, map: OverflowPriorityMap): 1 | 2 | 3 {
  if (entry.safetyCritical) return 1;
  if (map[entry.id] !== undefined) return map[entry.id];
  if (map['*'] !== undefined) return map['*'];
  return 2;
}

/**
 * Errors emitted when the safety-critical floor cannot fit.
 *
 * Thrown rather than silently truncating safeguards. Operator must break
 * the framework into smaller bundles.
 */
export class SafetyCriticalOverflowError extends Error {
  constructor(public readonly bytes: number) {
    super(
      `AGENTS.md priority-1 content alone is ${bytes} bytes, which exceeds the ${HARD_ERROR_BYTES}-byte hard cap. ` +
      `Operator must split the framework or reduce safety-critical pinning. ` +
      `Per ADR-1 §6, safety-critical content cannot be moved to the spillover block.`,
    );
    this.name = 'SafetyCriticalOverflowError';
  }
}

/**
 * Split an entry list by priority, returning [keep, overflow] arrays where
 * `keep` stays in the main file and `overflow` goes to the spillover block.
 *
 * Strategy: estimate bytes per entry; remove priority-3 first (alphabetical
 * within tier), then priority-2 (alphabetical within tier), until the keep
 * total is under the soft-warn threshold (30KB). Priority-1 stays in keep
 * regardless. Returns the unsplit list when total is already under threshold.
 */
function splitEntriesByPriority(
  entries: IndexEntry[],
  map: OverflowPriorityMap,
  estimateBytes: (entry: IndexEntry) => number,
  budgetBytes: number,
): { keep: IndexEntry[]; overflow: IndexEntry[] } {
  // Annotate each entry with its priority and bytes.
  const annotated = entries.map((e) => ({
    entry: e,
    priority: resolvePriority(e, map),
    bytes: estimateBytes(e),
  }));

  // Sort: priority asc (1 stays first), then by id alphabetical for determinism.
  annotated.sort((a, b) => a.priority - b.priority || a.entry.id.localeCompare(b.entry.id));

  const keep: IndexEntry[] = [];
  const overflow: IndexEntry[] = [];
  let totalKept = 0;

  for (const a of annotated) {
    if (a.priority === 1) {
      keep.push(a.entry);
      totalKept += a.bytes;
    } else if (totalKept + a.bytes <= budgetBytes) {
      keep.push(a.entry);
      totalKept += a.bytes;
    } else {
      overflow.push(a.entry);
    }
  }

  // Re-sort keep array to its natural id order (callers expect alpha).
  keep.sort((a, b) => a.id.localeCompare(b.id));
  overflow.sort((a, b) => a.id.localeCompare(b.id));

  return { keep, overflow };
}

/**
 * Estimate the rendered byte size of one entry, including markdown overhead.
 * Rough but stable: id + description + path + per-entry markdown skeleton.
 */
function defaultEstimateEntry(entry: IndexEntry): number {
  let bytes = 6; // bullet + emphasis markers
  bytes += entry.id.length;
  bytes += entry.description.length;
  bytes += entry.path.length;
  bytes += 12; // "  - Path: `…`" overhead
  if (entry.tags && entry.tags.length > 0) {
    bytes += entry.tags.join(', ').length + 12;
  }
  if (entry.safetyCritical) bytes += 24; // "(SAFETY-CRITICAL)" + emphasis
  bytes += 4; // trailing whitespace + newline
  return bytes;
}

/**
 * Partition all sections into "in main" vs "in spillover" entry lists,
 * preserving safety-critical pinning and respecting the priority map.
 *
 * Strategy: each section is split independently using a per-section budget
 * proportional to the total budget. This is intentionally conservative —
 * we'd rather overflow a few low-priority entries from each section than
 * preferentially overflow one whole section.
 *
 * Throws SafetyCriticalOverflowError when priority-1 alone exceeds the
 * hard cap. Otherwise returns the partition.
 */
export function partitionForOverflow(
  sections: AgentsMdSection[],
  priorityMap: OverflowPriorityMap,
  totalBudgetBytes: number = SOFT_WARN_BYTES,
  estimateEntry: (entry: IndexEntry) => number = defaultEstimateEntry,
): {
  mainSections: AgentsMdSection[];
  spilloverSections: AgentsMdSection[];
  estimatedMainBytes: number;
  estimatedSpilloverBytes: number;
  splitOccurred: boolean;
} {
  // First, compute the priority-1 (pinned) byte total across all sections.
  // If that alone exceeds the hard cap, throw — operator must intervene.
  let priorityOneBytes = 0;
  for (const section of sections) {
    for (const entry of section.entries) {
      if (resolvePriority(entry, priorityMap) === 1) {
        priorityOneBytes += estimateEntry(entry);
      }
    }
  }
  if (priorityOneBytes > HARD_ERROR_BYTES) {
    throw new SafetyCriticalOverflowError(priorityOneBytes);
  }

  // Compute total budget per section. Allocate proportionally to current
  // section size so a small section doesn't get an outsized share.
  const totalBytes = sections.reduce(
    (acc, s) => acc + s.entries.reduce((a, e) => a + estimateEntry(e), 0),
    0,
  );

  if (totalBytes <= totalBudgetBytes) {
    return {
      mainSections: sections,
      spilloverSections: [],
      estimatedMainBytes: totalBytes,
      estimatedSpilloverBytes: 0,
      splitOccurred: false,
    };
  }

  const mainSections: AgentsMdSection[] = [];
  const spilloverSections: AgentsMdSection[] = [];
  let mainTotal = 0;
  let spilloverTotal = 0;

  for (const section of sections) {
    const sectionBytes = section.entries.reduce((a, e) => a + estimateEntry(e), 0);
    // Per-section share: proportional to section's contribution, but never
    // exceeding the overall budget (and never zero). Earlier versions floored
    // at 1024 unconditionally — that broke small-budget unit tests and
    // arguably violated the global cap. The cap is the real invariant.
    const share = totalBytes > 0
      ? Math.min(totalBudgetBytes, Math.max(64, Math.floor((sectionBytes / totalBytes) * totalBudgetBytes)))
      : totalBudgetBytes;

    const { keep, overflow } = splitEntriesByPriority(
      section.entries,
      priorityMap,
      estimateEntry,
      share,
    );

    if (keep.length > 0) {
      mainSections.push({ type: section.type, entries: keep });
      mainTotal += keep.reduce((a, e) => a + estimateEntry(e), 0);
    }
    if (overflow.length > 0) {
      spilloverSections.push({ type: section.type, entries: overflow });
      spilloverTotal += overflow.reduce((a, e) => a + estimateEntry(e), 0);
    }
  }

  return {
    mainSections,
    spilloverSections,
    estimatedMainBytes: mainTotal,
    estimatedSpilloverBytes: spilloverTotal,
    splitOccurred: spilloverSections.length > 0,
  };
}

/**
 * Inject or update the spillover block within an existing AGENTS.override.md
 * content string. Operator-authored content (everything outside the spillover
 * markers) is preserved byte-for-byte.
 *
 * Returns the updated content. The caller writes this back to disk.
 */
export function injectSpilloverBlock(
  existingContent: string,
  spilloverMarkdown: string,
): string {
  const startIdx = existingContent.indexOf(SPILLOVER_START);
  const endIdx = existingContent.indexOf(SPILLOVER_END);

  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    // No existing spillover block. Append a new one at the end.
    const trimmed = existingContent.replace(/\n+$/, '');
    const prefix = trimmed.length > 0 ? trimmed + '\n\n' : '';
    return `${prefix}${SPILLOVER_START}\n${spilloverMarkdown}\n${SPILLOVER_END}\n`;
  }

  // Replace existing block in place.
  const before = existingContent.slice(0, startIdx);
  const after = existingContent.slice(endIdx + SPILLOVER_END.length);
  return `${before}${SPILLOVER_START}\n${spilloverMarkdown}\n${SPILLOVER_END}${after}`;
}

/**
 * Extract the operator-authored portion of AGENTS.override.md (everything
 * outside the spillover block). Used for hash-protection diffs.
 */
export function extractNonSpillover(content: string): string {
  const startIdx = content.indexOf(SPILLOVER_START);
  const endIdx = content.indexOf(SPILLOVER_END);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    return content;
  }
  const before = content.slice(0, startIdx).replace(/\n+$/, '');
  const after = content.slice(endIdx + SPILLOVER_END.length).replace(/^\n+/, '');
  return [before, after].filter(Boolean).join('\n\n');
}
