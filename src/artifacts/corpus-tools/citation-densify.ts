/**
 * Citation-graph densification (#1505): two TS-native tools that close gaps in
 * a research corpus's citation graph.
 *
 *  - extract-crossrefs — scan analysis docs' Cross-References / Related-Work /
 *    Referenced-By sections for REF ids that have a sidecar but are missing from
 *    the source's Outgoing table, and (with --write) inject them as outgoing
 *    edges. Port of section9 `extract_crossrefs.py`. This is new capability —
 *    no existing skill covers cross-reference → outgoing densification.
 *  - citation-backfill — compute the inverse of the outgoing map and report /
 *    inject missing Incoming edges + dangling cited-but-no-sidecar targets.
 *    TS-native parity for `citation_backfill.py`; the prose `citation-backfill`
 *    skill orchestrates this deterministic tool.
 *
 * Both default to dry-run; pass `{ write: true }` to persist.
 *
 * @source historical: corpus/extract_crossrefs.py, corpus/citation_backfill.py
 * @tests @test/unit/artifacts/citation-densify.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { refTitle } from './sidecar-lint.js';

const CITES_DIR = ['documentation', 'citations'];
const REFS_DIR = ['documentation', 'references'];
const REF_ID_RE = /\bREF-\d+[a-z]?\b/g;

function citesDir(root: string): string {
  return path.join(root, ...CITES_DIR);
}
function listSidecars(root: string): string[] {
  const dir = citesDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^REF-.*-citations\.md$/.test(f)).sort().map((f) => path.join(dir, f));
}
function refOf(file: string): string {
  return path.basename(file).replace(/-citations\.md$/, '');
}
function sidecarPath(root: string, ref: string): string {
  return path.join(citesDir(root), `${ref}-citations.md`);
}
function hasSidecar(root: string, ref: string): boolean {
  return fs.existsSync(sidecarPath(root, ref));
}
function analysisDoc(root: string, ref: string): string | null {
  const dir = path.join(root, ...REFS_DIR);
  if (!fs.existsSync(dir)) return null;
  const m = fs.readdirSync(dir).find((f) => f === `${ref}.md` || f.startsWith(`${ref}-`));
  return m ? path.join(dir, m) : null;
}

/** Edge tokens in an analysis doc's cross-reference-style sections (port of extract_crossref_refs). */
function scanCrossrefs(text: string, selfRef: string | null): Set<string> {
  const refs = new Set<string>();
  let inSection = false;
  for (const line of text.split('\n')) {
    const low = line.toLowerCase().trim();
    if (low.startsWith('## ') || low.startsWith('# ')) {
      inSection =
        low.includes('cross-reference') ||
        low.includes('cross reference') ||
        low.includes('external reference') ||
        low.includes('related work') ||
        low.includes('related sources') ||
        low.includes('referenced by');
      continue;
    }
    if (!inSection) continue;
    const m = line.match(REF_ID_RE);
    if (m) for (const r of m) if (r !== selfRef) refs.add(r);
  }
  return refs;
}

/** Outgoing/Incoming edge sets from a sidecar (port of parse_sidecar_sections). */
function scanEdges(text: string, selfRef: string): { outgoing: Set<string>; incoming: Set<string> } {
  const outgoing = new Set<string>();
  const incoming = new Set<string>();
  let current: 'out' | 'in' | null = null;
  for (const line of text.split('\n')) {
    const low = line.toLowerCase().trim();
    const isHeader = low.startsWith('# ') || (low.startsWith('## ') && !low.startsWith('### '));
    if (isHeader) {
      const h = low.replace(/^#+/, '').trim();
      if (h.startsWith('notes') || h === 'note') current = null;
      else if (h.startsWith('outgoing')) current = 'out';
      else if (h.startsWith('incoming')) current = 'in';
      else if (h.includes('cited by') || h.includes('referenced by') || h.includes('citing this') || h.includes('that cite')) current = 'in';
      else if (h.includes('papers this work cites') || h.includes('works / resources referenced') || h.startsWith('references ') || h === 'references') current = 'out';
      else current = null;
      continue;
    }
    if (current === null) continue;
    const m = line.match(REF_ID_RE);
    if (!m) continue;
    for (const r of m) {
      if (r === selfRef) continue;
      if (current === 'out') outgoing.add(r);
      else incoming.add(r);
    }
  }
  return { outgoing, incoming };
}

/**
 * Inject edge rows into a sidecar's Outgoing or Incoming section. Finds the
 * section, locates the last table row + max row number, builds
 * `| N | title | — | — | — | REF |` rows, and splices them in. Creates a table
 * header if the section has none. Returns the new text, or null if no matching
 * section. Shared by both tools (ports the section9 injection logic).
 */
function injectRows(
  root: string,
  text: string,
  which: 'out' | 'in',
  targets: string[],
): string | null {
  const lines = text.split('\n');
  const want = which === 'out'
    ? (h: string) => h.includes('outgoing') || h.includes('cites') || h.includes('references this') || h.includes('papers this work cites') || h.includes('works / resources referenced')
    : (h: string) => h.includes('incoming') || h.includes('cited by') || h.includes('referenced by') || h.includes('citing this') || h.includes('that cite');

  let start: number | null = null;
  for (let i = 0; i < lines.length; i++) {
    const low = lines[i].toLowerCase().trim();
    if ((low.startsWith('## ') || low.startsWith('# ')) && want(low.replace(/^#+/, '').trim())) {
      start = i;
      break;
    }
  }
  if (start === null) return null;

  let end = lines.length;
  for (let j = start + 1; j < lines.length; j++) {
    if (lines[j].startsWith('## ') || lines[j].startsWith('# ')) {
      end = j;
      break;
    }
  }

  let lastRow = -1;
  let maxNum = 0;
  for (let j = start + 1; j < end; j++) {
    const s = lines[j].trim();
    if (s.startsWith('|') && s.endsWith('|')) {
      if (s.includes('---')) {
        lastRow = j;
        continue;
      }
      const cells = s.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (cells[0] && /^\d+$/.test(cells[0])) {
        lastRow = j;
        maxNum = Math.max(maxNum, parseInt(cells[0], 10));
      } else if (cells[0] === '—') {
        lastRow = j;
      }
    }
  }

  const rows: string[] = [];
  for (const tgt of [...targets].sort()) {
    maxNum += 1;
    rows.push(`| ${maxNum} | ${refTitle(root, tgt)} | — | — | — | ${tgt} |`);
  }

  let out: string[];
  if (lastRow === -1) {
    const header = ['', '| # | Title | Authors | Year | DOI/URL | Inducted REF |', '|---|-------|---------|------|---------|--------------|'];
    out = [...lines.slice(0, start + 1), ...header, ...rows, ...lines.slice(start + 1)];
  } else {
    out = [...lines.slice(0, lastRow + 1), ...rows, ...lines.slice(lastRow + 1)];
  }
  return out.join('\n');
}

// ── extract-crossrefs ────────────────────────────────────────────────────────

export interface CrossrefResult {
  scanned: number;
  /** source ref → target refs to add as outgoing edges */
  perSource: Record<string, string[]>;
  totalAdditions: number;
  applied: number;
}

export function extractCrossrefs(root: string, opts: { refs?: string[]; write?: boolean } = {}): CrossrefResult {
  const sources = opts.refs && opts.refs.length
    ? opts.refs
    : listSidecars(root).map(refOf);
  const perSource: Record<string, string[]> = {};
  let totalAdditions = 0;
  let applied = 0;

  for (const ref of sources) {
    const doc = analysisDoc(root, ref);
    const scPath = sidecarPath(root, ref);
    if (!doc || !fs.existsSync(scPath)) continue;
    const crossrefs = scanCrossrefs(fs.readFileSync(doc, 'utf-8'), ref);
    const existing = scanEdges(fs.readFileSync(scPath, 'utf-8'), ref).outgoing;
    // Only targets that themselves have a sidecar become outgoing edges.
    const missing = [...crossrefs].filter((t) => hasSidecar(root, t) && !existing.has(t));
    if (missing.length) {
      perSource[ref] = missing.sort();
      totalAdditions += missing.length;
    }
  }

  if (opts.write) {
    for (const [ref, targets] of Object.entries(perSource)) {
      const scPath = sidecarPath(root, ref);
      const text = fs.readFileSync(scPath, 'utf-8');
      const updated = injectRows(root, text, 'out', targets);
      if (updated && updated !== text) {
        fs.writeFileSync(scPath, updated.endsWith('\n') ? updated : updated + '\n');
        applied += 1;
      }
    }
  }

  return { scanned: sources.length, perSource, totalAdditions, applied };
}

export function renderCrossrefs(r: CrossrefResult, write: boolean): string {
  const out: string[] = [];
  out.push(`extract-crossrefs (${write ? 'WRITE' : 'dry-run'})`);
  out.push(`Analysis docs scanned: ${r.scanned}`);
  out.push(`New outgoing edges to add: ${r.totalAdditions}`);
  out.push(`Source REFs with gaps: ${Object.keys(r.perSource).length}`);
  if (write) out.push(`Applied to ${r.applied} source sidecars`);
  out.push('');
  const top = Object.entries(r.perSource).sort((a, b) => b[1].length - a[1].length).slice(0, 20);
  for (const [ref, tgts] of top) {
    const head = tgts.slice(0, 5).join(', ') + (tgts.length > 5 ? '...' : '');
    out.push(`  ${ref}: +${tgts.length} (${head})`);
  }
  return out.join('\n') + '\n';
}

// ── citation-backfill (inverse incoming) ─────────────────────────────────────

export interface BackfillResult {
  scanned: number;
  totalOutgoing: number;
  totalIncomingCurrent: number;
  totalIncomingExpected: number;
  missingEdges: number;
  /** target ref → source refs missing from its incoming table */
  perTarget: Record<string, string[]>;
  /** cited but no sidecar: target ref → citing sources */
  dangling: Array<{ target: string; sources: string[] }>;
  applied: number;
}

export function backfillCitations(root: string, opts: { write?: boolean } = {}): BackfillResult {
  const sidecars = listSidecars(root);
  const outgoingMap = new Map<string, Set<string>>();
  const incomingCurrent = new Map<string, Set<string>>();
  for (const file of sidecars) {
    const ref = refOf(file);
    const { outgoing, incoming } = scanEdges(fs.readFileSync(file, 'utf-8'), ref);
    outgoingMap.set(ref, outgoing);
    incomingCurrent.set(ref, incoming);
  }

  // Invert: each src→tgt implies tgt should list src as incoming.
  const computedIncoming = new Map<string, Set<string>>();
  for (const [src, targets] of outgoingMap) {
    for (const tgt of targets) {
      (computedIncoming.get(tgt) ?? computedIncoming.set(tgt, new Set()).get(tgt)!).add(src);
    }
  }

  const perTarget: Record<string, string[]> = {};
  const dangling: Array<{ target: string; sources: string[] }> = [];
  let missingEdges = 0;
  for (const [tgt, sources] of computedIncoming) {
    if (!incomingCurrent.has(tgt)) {
      dangling.push({ target: tgt, sources: [...sources].sort() });
      continue;
    }
    const cur = incomingCurrent.get(tgt)!;
    const missing = [...sources].filter((s) => !cur.has(s)).sort();
    if (missing.length) {
      perTarget[tgt] = missing;
      missingEdges += missing.length;
    }
  }

  let applied = 0;
  if (opts.write) {
    for (const [tgt, sources] of Object.entries(perTarget)) {
      const scPath = sidecarPath(root, tgt);
      if (!fs.existsSync(scPath)) continue;
      const text = fs.readFileSync(scPath, 'utf-8');
      const updated = injectRows(root, text, 'in', sources);
      if (updated && updated !== text) {
        fs.writeFileSync(scPath, updated.endsWith('\n') ? updated : updated + '\n');
        applied += 1;
      }
    }
  }

  return {
    scanned: sidecars.length,
    totalOutgoing: [...outgoingMap.values()].reduce((n, s) => n + s.size, 0),
    totalIncomingCurrent: [...incomingCurrent.values()].reduce((n, s) => n + s.size, 0),
    totalIncomingExpected: [...computedIncoming.values()].reduce((n, s) => n + s.size, 0),
    missingEdges,
    perTarget,
    dangling,
    applied,
  };
}

export function renderBackfill(r: BackfillResult, write: boolean): string {
  const out: string[] = [];
  out.push(`citation-backfill (${write ? 'WRITE' : 'dry-run'})`);
  out.push(`Sidecars scanned:              ${r.scanned}`);
  out.push(`Outgoing edges total:          ${r.totalOutgoing}`);
  out.push(`Incoming edges (current):      ${r.totalIncomingCurrent}`);
  out.push(`Incoming edges (expected):     ${r.totalIncomingExpected}`);
  out.push(`Missing incoming edges:        ${r.missingEdges}`);
  out.push(`Dangling (cited, no sidecar):  ${r.dangling.length}`);
  if (write) out.push(`Applied to ${r.applied} target sidecars`);
  out.push('');
  const top = Object.entries(r.perTarget).sort((a, b) => b[1].length - a[1].length).slice(0, 20);
  out.push('Top targets by missing-edge count:');
  for (const [tgt, srcs] of top) out.push(`  ${tgt}: ${srcs.length} missing`);
  if (r.dangling.length) {
    out.push('');
    out.push('Dangling (cited but no sidecar):');
    for (const d of r.dangling.slice(0, 20)) out.push(`  ${d.target}: cited by ${d.sources.length}`);
  }
  return out.join('\n') + '\n';
}
