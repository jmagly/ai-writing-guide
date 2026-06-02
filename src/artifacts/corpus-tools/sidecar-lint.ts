/**
 * Citation-sidecar structural lint + orphan detection (#1503).
 *
 * TS-native port of section9 `scripts/corpus/lint_sidecars.py` (structural
 * lint) and `scripts/corpus/find_orphans.py` (zero-edge sidecars). These are
 * *sidecar-structural* checks — distinct from the generic `aiwg lint
 * --ruleset research` (note-level frontmatter/orphans) that the `research-lint`
 * skill runs. The `research-lint` skill references these for sidecar depth
 * rather than duplicating them (reconcile, don't duplicate).
 *
 * @source historical: corpus/lint_sidecars.py, corpus/find_orphans.py
 * @tests @test/unit/artifacts/sidecar-lint.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';

const REF_ID_RE = /\bREF-\d+[a-z]?\b/g;

const CITES_DIR = ['documentation', 'citations'];
const REFS_DIR = ['documentation', 'references'];

/** List `documentation/citations/REF-*-citations.md` files under the corpus root. */
function listSidecars(root: string): string[] {
  const dir = path.join(root, ...CITES_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^REF-.*-citations\.md$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

/** Extract the ref id (`REF-NNN`) from a sidecar filename. */
function refOf(file: string): string {
  return path.basename(file).replace(/-citations\.md$/, '');
}

/**
 * Structural lint for one sidecar's text. Mirrors `lint_sidecars.lint`:
 *  - frontmatter present + has `ref:`/`title:`/`type:`
 *  - has an Outgoing section + an Incoming section (merge-redirects exempt)
 *  - no duplicate `| # | Title` table headers under the same sub-header
 *    (the doubled-append bug pattern)
 */
export function lintSidecarText(text: string): string[] {
  const issues: string[] = [];
  const lines = text.split('\n');

  // Frontmatter
  if (!text.startsWith('---')) {
    issues.push('missing-frontmatter');
  } else {
    const end = lines.indexOf('---', 1);
    if (end === -1) {
      issues.push('malformed-frontmatter');
    } else {
      const fm = lines.slice(1, end).join('\n');
      for (const req of ['ref:', 'title:', 'type:']) {
        if (!fm.includes(req)) issues.push(`frontmatter-missing-${req.replace(/:$/, '')}`);
      }
    }
  }

  // Section presence (H1/H2 only; sub-headers belong to the enclosing section)
  let hasOutgoing = false;
  let hasIncoming = false;
  for (const line of lines) {
    const low = line.toLowerCase().trim();
    if (low.startsWith('## ') && !low.startsWith('### ')) {
      const h = low.replace(/^#+/, '').trim();
      if (
        h.startsWith('outgoing') ||
        h.includes('papers this work cites') ||
        h.includes('works / resources referenced')
      ) {
        hasOutgoing = true;
      }
      if (
        h.startsWith('incoming') ||
        h.includes('cited by') ||
        h.includes('referenced by') ||
        h.includes('citing this') ||
        h.includes('that cite')
      ) {
        hasIncoming = true;
      }
    }
  }

  const isRedirect = text.includes('MERGED INTO') || text.includes('status: merged');
  if (!hasOutgoing && !isRedirect) issues.push('missing-outgoing-section');
  if (!hasIncoming && !isRedirect) issues.push('missing-incoming-section');

  // Duplicate table headers: two `| # | Title` headers with no intervening
  // sub-header (a doubled-append signature).
  let bugDupes = 0;
  let lastSubHdr = -1;
  let lastTable = -1;
  for (let i = 0; i < lines.length; i++) {
    const s = lines[i].trim();
    if (s.startsWith('## ') || s.startsWith('### ')) {
      lastSubHdr = i;
      lastTable = -1;
    } else if (s.startsWith('| # | Title')) {
      if (lastTable !== -1 && lastTable > lastSubHdr) bugDupes++;
      lastTable = i;
    }
  }
  if (bugDupes > 0) issues.push(`duplicate-table-headers-count=${bugDupes}`);

  return issues;
}

export interface SidecarLintResult {
  totalFiles: number;
  filesWithIssues: number;
  totalIssues: number;
  /** issue label → ref ids exhibiting it */
  byIssue: Record<string, string[]>;
}

export function lintSidecars(root: string): SidecarLintResult {
  const files = listSidecars(root);
  const byIssue: Record<string, string[]> = {};
  let filesWithIssues = 0;
  let totalIssues = 0;
  for (const file of files) {
    const issues = lintSidecarText(fs.readFileSync(file, 'utf-8'));
    if (issues.length) {
      filesWithIssues++;
      totalIssues += issues.length;
      for (const issue of issues) (byIssue[issue] ??= []).push(refOf(file));
    }
  }
  return { totalFiles: files.length, filesWithIssues, totalIssues, byIssue };
}

export function renderLint(r: SidecarLintResult): string {
  const out: string[] = [];
  out.push(`Sidecars linted: ${r.totalFiles}`);
  out.push(`Files with issues: ${r.filesWithIssues}`);
  out.push(`Total issues: ${r.totalIssues}`);
  out.push('');
  const sorted = Object.entries(r.byIssue).sort((a, b) => b[1].length - a[1].length);
  for (const [issue, refs] of sorted) {
    out.push(`  ${issue}: ${refs.length} files`);
    for (const ref of refs.slice(0, 10)) out.push(`    ${ref}`);
    if (refs.length > 10) out.push(`    ... and ${refs.length - 10} more`);
  }
  return out.join('\n') + '\n';
}

export interface Orphan {
  ref: string;
  title: string;
}

/**
 * Read the title from a reference analysis doc (`REF-NNN-*.md` or `REF-NNN.md`).
 * Prefers frontmatter `title:`, then the first `# ` heading in the body — so
 * docs that open with a `---` frontmatter block still yield a real title (the
 * section9 original read the literal first line and rendered `---`).
 */
export function refTitle(root: string, ref: string): string {
  const refsDir = path.join(root, ...REFS_DIR);
  if (!fs.existsSync(refsDir)) return '?';
  const match = fs
    .readdirSync(refsDir)
    .find((f) => f === `${ref}.md` || f.startsWith(`${ref}-`));
  if (!match) return '?';
  const text = fs.readFileSync(path.join(refsDir, match), 'utf-8');

  // 1. frontmatter title:
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (fm) {
    const t = fm[1].match(/^title:\s*(.+)$/m);
    if (t) return t[1].trim().replace(/^["']|["']$/g, '').slice(0, 80);
  }
  // 2. first `# ` heading (strip a `REF-NNN:` prefix if present)
  const heading = text.match(/^#\s+(.+)$/m);
  if (heading) return heading[1].replace(/^REF-[^:]*:\s*/, '').trim().slice(0, 80) || '?';
  return '?';
}

/**
 * Scan a sidecar's Outgoing/Incoming sections for any `REF-NNN` edge token
 * (excluding self). Faithful port of `find_orphans.parse_sections` — lenient
 * by design: it matches any ref id appearing in an edge section regardless of
 * table-column naming, unlike the column-specific `parseCitationSidecar`.
 */
function scanEdges(text: string, selfRef: string): { outgoing: Set<string>; incoming: Set<string> } {
  const outgoing = new Set<string>();
  const incoming = new Set<string>();
  let current: 'out' | 'in' | null = null;
  for (const line of text.split('\n')) {
    const low = line.toLowerCase().trim();
    const isSectionHeader = low.startsWith('# ') || (low.startsWith('## ') && !low.startsWith('### '));
    if (isSectionHeader) {
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
    const matches = line.match(REF_ID_RE);
    if (!matches) continue;
    for (const m of matches) {
      if (m === selfRef) continue;
      if (current === 'out') outgoing.add(m);
      else incoming.add(m);
    }
  }
  return { outgoing, incoming };
}

/** Sidecars with zero incoming AND zero outgoing edges (lenient section scan). */
export function findOrphans(root: string): Orphan[] {
  const orphans: Orphan[] = [];
  for (const file of listSidecars(root)) {
    const ref = refOf(file);
    const { outgoing, incoming } = scanEdges(fs.readFileSync(file, 'utf-8'), ref);
    if (outgoing.size === 0 && incoming.size === 0) {
      orphans.push({ ref, title: refTitle(root, ref) });
    }
  }
  return orphans;
}

export function renderOrphans(orphans: Orphan[]): string {
  const out: string[] = [];
  out.push(`Orphaned sidecars (no incoming AND no outgoing edges): ${orphans.length}`);
  for (const o of orphans) out.push(`  ${o.ref}: ${o.title}`);
  return out.join('\n') + '\n';
}
