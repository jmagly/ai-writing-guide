/**
 * Citation Sidecar Edge Extraction
 *
 * Parses markdown citation sidecar files into typed graph edges.
 * Each sidecar has YAML frontmatter with `ref: <id>` and two markdown tables:
 *
 * - **Outgoing**: papers this work cites (column: "Inducted REF") → `cites` edges
 * - **Incoming**: corpus papers that cite this work (column: "REF") → `cited-by` edges
 *
 * Supported node-id forms (#105):
 * - `REF-\d+[a-z]?`                research-paper IDs (REF-001, REF-434a, ...)
 * - `PROF-[POFG]-[a-z0-9-]+`       entity-profile IDs:
 *     - `PROF-P-*` people, `PROF-O-*` orgs, `PROF-F-*` funders, `PROF-G-*` groups
 *
 * Both forms can appear as the sidecar's source (`frontmatter.ref`) and as
 * targets in the outgoing/incoming tables. The two ID spaces are
 * unambiguous (always prefixed) and orthogonal.
 *
 * @implements #722
 * @implements #105
 * @source @src/artifacts/types.ts
 * @tests @test/unit/artifacts/citation-parser.test.ts
 */

import type { TypedEdge } from './types.js';
import { parseFrontmatter } from './index-builder.js';

/**
 * Match a single node identifier (REF-* or PROF-*) anywhere in a string.
 * Used by `extractRefsFromTable` to pull every ID out of a table cell.
 */
const NODE_ID_PATTERN = /(?:REF-\d+[a-z]?|PROF-[POFG]-[a-z0-9-]+)/g;

/**
 * Validate that a string is a complete node identifier.
 * Used by `parseCitationSidecar` and `buildRefToPathMap` to gate
 * frontmatter `ref` values.
 */
const NODE_ID_FULL = /^(?:REF-\d+[a-z]?|PROF-[POFG]-[a-z0-9-]+)$/;

/** Explicit column aliases used by historical citation-sidecar variants. */
const CITATION_REF_COLUMNS = [
  'Inducted REF',
  'REF',
  'Corpus REF',
  'In-corpus REF',
] as const;

/**
 * Preserve the corpus snapshot's legacy edge semantics: every node ID on a
 * pipe-delimited line inside an outgoing/incoming section is a declaration.
 * Explicit column parsing remains the primary path, while this compatibility
 * scan covers malformed rows and prose continuations that historical corpus
 * snapshots already count.
 */
function extractSectionNodeIds(section: string): string[] {
  const refs: string[] = [];
  for (const line of section.split('\n')) {
    if (!line.includes('|')) continue;
    NODE_ID_PATTERN.lastIndex = 0;
    const matches = line.match(NODE_ID_PATTERN);
    if (matches) refs.push(...matches);
  }
  return [...new Set(refs)];
}

/**
 * Test whether a string is a valid sidecar node identifier.
 *
 * Accepts `REF-\d+[a-z]?` and `PROF-[POFG]-[a-z0-9-]+`. Returns false for any
 * other input (including unrelated `PROF-` prefixed strings that don't
 * match the four-letter type code form).
 */
export function isNodeId(value: unknown): value is string {
  return typeof value === 'string' && NODE_ID_FULL.test(value);
}

/**
 * Result of parsing a single citation sidecar file
 */
export interface CitationParseResult {
  /** Source node identifier (e.g., "REF-008" or "PROF-P-marks-samuel") */
  ref: string;

  /** Outgoing "cites" edges — node IDs this paper references */
  cites: string[];

  /** Incoming "cited-by" edges — node IDs of papers that cite this one */
  citedBy: string[];
}

/**
 * Extract node identifiers from a markdown table column.
 *
 * Scans table rows for a column matching `columnName` (case-insensitive)
 * and extracts node IDs (REF-* or PROF-*), skipping empty/dash values.
 *
 * @param tableText - Markdown table text (header + separator + rows)
 * @param columnName - Column header to extract from (e.g., "Inducted REF")
 * @returns Array of node identifiers found
 */
export function extractRefsFromTable(
  tableText: string,
  columnName: string | readonly string[],
): string[] {
  const aliases = (Array.isArray(columnName) ? columnName : [columnName])
    .map(name => name.trim().toLowerCase());
  const tableBlocks: string[][] = [];
  let currentBlock: string[] = [];
  for (const line of tableText.split('\n')) {
    if (line.trim().startsWith('|')) {
      currentBlock.push(line);
    } else if (currentBlock.length > 0) {
      tableBlocks.push(currentBlock);
      currentBlock = [];
    }
  }
  if (currentBlock.length > 0) tableBlocks.push(currentBlock);

  const parseRow = (line: string): string[] => {
    let row = line.trim();
    if (row.startsWith('|')) row = row.slice(1);
    if (row.endsWith('|')) row = row.slice(0, -1);
    return row.split('|').map(cell => cell.trim());
  };

  const refs: string[] = [];
  for (const lines of tableBlocks) {
    const headerCells = parseRow(lines[0]);
    const colIndex = headerCells.findIndex(
      header => {
        const normalized = header.toLowerCase().replace(/[`*_]/g, '').trim();
        return aliases.some(alias =>
          normalized === alias ||
          normalized.startsWith(`${alias} /`) ||
          normalized.startsWith(`${alias} (`),
        );
      },
    );
    if (lines.length < 3 || colIndex === -1) {
      // Legacy sidecars sometimes have headerless continuation rows or a
      // generic table whose rows were extended with a final REF cell. The
      // corpus snapshot has always treated every in-section table REF as an
      // outgoing/incoming declaration, so retain that compatibility fallback.
      const dataLines = lines.length >= 3 ? lines.slice(2) : lines;
      for (const line of dataLines) {
        NODE_ID_PATTERN.lastIndex = 0;
        const refMatches = line.match(NODE_ID_PATTERN);
        if (refMatches) refs.push(...refMatches);
      }
      continue;
    }

    // Skip this table's header and separator, preserving all interior cells.
    for (let i = 2; i < lines.length; i++) {
      const cells = parseRow(lines[i]);
      if (colIndex >= cells.length) continue;

      // Historical rows may expand the named REF cell into an issue/REF pair
      // or append placeholder cells without extending the header. Scan from
      // the named column through the remainder of the row; columns before the
      // alias (title/authors/year) remain excluded.
      const value = cells.slice(colIndex).join(' | ');
      if (!value || value === '—' || value === '-' || value === '–') continue;

      NODE_ID_PATTERN.lastIndex = 0;
      const refMatches = value.match(NODE_ID_PATTERN);
      if (refMatches) refs.push(...refMatches);
    }
  }

  return [...new Set(refs)];
}

/**
 * Parse a citation sidecar markdown file into structured edges.
 *
 * @param content - Full markdown content of the sidecar file
 * @returns Parse result with ref ID and edge arrays, or null if not a valid sidecar
 */
export function parseCitationSidecar(content: string): CitationParseResult | null {
  const { data, body } = parseFrontmatter(content);

  // Must have a node identifier in frontmatter (REF-* or PROF-*)
  const ref = typeof data.ref === 'string' ? data.ref : null;
  if (!ref || !NODE_ID_FULL.test(ref)) return null;

  // Split body into sections by ## headings
  const sections = body.split(/^## /m).filter(Boolean);

  let cites: string[] = [];
  let citedBy: string[] = [];

  for (const section of sections) {
    const sectionLower = section.toLowerCase();

    if (sectionLower.startsWith('outgoing')) {
      cites.push(...extractRefsFromTable(section, CITATION_REF_COLUMNS));
      cites.push(...extractSectionNodeIds(section));
    } else if (sectionLower.startsWith('incoming')) {
      citedBy.push(...extractRefsFromTable(section, CITATION_REF_COLUMNS));
      citedBy.push(...extractSectionNodeIds(section));
    }
  }

  return { ref, cites: [...new Set(cites)], citedBy: [...new Set(citedBy)] };
}

/**
 * Convert a CitationParseResult into TypedEdge arrays for the dependency graph.
 *
 * @param result - Parsed citation sidecar
 * @param refToPath - Map from REF-XXX to file path in the index
 * @returns Object with upstream (cites) and downstream (cited-by) typed edges
 */
export function citationResultToEdges(
  result: CitationParseResult,
  refToPath: Map<string, string>
): { upstream: TypedEdge[]; downstream: TypedEdge[] } {
  const upstream: TypedEdge[] = [];
  const downstream: TypedEdge[] = [];

  // Outgoing citations → upstream "cites" edges
  for (const citedRef of result.cites) {
    const targetPath = refToPath.get(citedRef);
    if (targetPath) {
      upstream.push({ path: targetPath, type: 'cites' });
    }
  }

  // Incoming citations → downstream "cited-by" edges
  for (const citingRef of result.citedBy) {
    const sourcePath = refToPath.get(citingRef);
    if (sourcePath) {
      downstream.push({ path: sourcePath, type: 'cited-by' });
    }
  }

  return { upstream, downstream };
}

/**
 * Build a node-id → file path mapping from indexed entries.
 *
 * Scans entry frontmatter for `ref` fields matching the node-id pattern
 * (REF-* or PROF-*).
 *
 * @param entries - Map of path → parsed frontmatter data
 * @returns Map from node identifier to file path
 */
export function buildRefToPathMap(
  entries: Map<string, Record<string, unknown>>
): Map<string, string> {
  const map = new Map<string, string>();
  for (const [filePath, data] of entries) {
    const ref = typeof data.ref === 'string' ? data.ref : null;
    if (ref && NODE_ID_FULL.test(ref)) {
      map.set(ref, filePath);
    }
  }
  return map;
}
