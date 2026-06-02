/**
 * Citation-sidecar metadata repair (#1503): author backfill + affiliation
 * normalization. TS-native port of section9 `scripts/corpus/fix_broken_authors.py`
 * and `scripts/corpus/normalize_affiliation.py`.
 *
 * Both default to dry-run; pass `{ write: true }` to persist. The affiliation
 * map is loaded from the corpus (`documentation/profiles/orgs/affiliation-map.yaml`)
 * with the built-in `DEFAULT_AFFILIATION_MAP` as fallback — the hardcoded
 * section9 map is externalized to config per epic #1496 principle #3.
 *
 * @source historical: corpus/fix_broken_authors.py, corpus/normalize_affiliation.py
 * @tests @test/unit/artifacts/sidecar-repair.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';
import { DEFAULT_AFFILIATION_MAP, buildAffiliationReverse } from '../corpus-views/corpus-config.js';

const CITES_DIR = ['documentation', 'citations'];
const REFS_DIR = ['documentation', 'references'];
const AFFIL_MAP_FILE = ['documentation', 'profiles', 'orgs', 'affiliation-map.yaml'];

function listSidecars(root: string): string[] {
  const dir = path.join(root, ...CITES_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => /^REF-.*-citations\.md$/.test(f))
    .sort()
    .map((f) => path.join(dir, f));
}

function refOf(file: string): string {
  return path.basename(file).replace(/-citations\.md$/, '');
}

// ── Author repair ──────────────────────────────────────────────────────────

const INITIAL_RE = /^[A-Z]\.(?:[\s-]*[A-Z]\.)*$/;
const INST_KEYWORDS = [
  'labs', 'contributors', 'foundation', 'team', 'datatracker', 'improvement proposal',
  'task force', 'consortium', 'committee', 'working group', 'society', 'council', 'inc',
  'llc', 'corp', 'openai', 'anthropic', 'deepmind', 'meta', 'google', 'microsoft',
  'ietf', 'ieee', 'iso', 'w3c', 'nist',
];

function isInstitutional(name: string): boolean {
  const nm = name.toLowerCase();
  return INST_KEYWORDS.some((k) => nm.includes(k));
}

/** Extract the body of the `## Citation` section from an analysis doc. */
export function extractCitationBlock(text: string): string {
  const m = text.match(/##\s+(?:1\.\s+)?Citation\s*\n\s*\n([\s\S]+?)(?=\n##\s|\n---|$)/);
  return m ? m[1].trim() : '';
}

/**
 * Parse author names from a citation string. Faithful port of
 * `fix_broken_authors.parse_authors` — handles "Last, F. M., Last2, F. (YYYY)",
 * "& "/" and " separators, et-al truncation, institutional single-authors, and
 * spelled-out first names.
 */
export function parseAuthors(citation: string): string[] {
  if (!citation) return [];
  const firstLine = citation.split('\n')[0].trim();
  const m = firstLine.match(/^(.+?)\s*\((\d{4})/);
  let authorsStr: string;
  if (!m) {
    // Institutional: "Org. *Title*..." or "Org Name. Title..."
    const m2 = firstLine.match(/^([A-Z][^.*]+?)\.\s+\*?\S/);
    if (m2) return [m2[1].trim()];
    return [];
  }
  authorsStr = m[1].trim().replace(/[,.]+$/, '');
  if (/et al/i.test(authorsStr)) {
    authorsStr = authorsStr.split(/,?\s*et\s+al\.?/i)[0];
  }
  if (!authorsStr) return [];

  // Institutional single author
  if (!authorsStr.includes(',') && !/\s+&\s+|\s+and\s+/.test(authorsStr)) {
    return [authorsStr.trim().replace(/\.$/, '')];
  }
  if (isInstitutional(authorsStr.split(',')[0]) && !/^[A-Z][a-z]+,\s*[A-Z]\./.test(authorsStr)) {
    return [authorsStr.trim().replace(/\.$/, '')];
  }

  // Normalize separators
  let norm = authorsStr.replace(/ & /g, ', ');
  norm = norm.replace(/\s+and\s+/gi, ', ');
  norm = norm.replace(/\s*&\s*/g, ', ');
  const parts = norm.split(/,\s*/).map((p) => p.trim()).filter(Boolean);

  const out: string[] = [];
  let i = 0;
  while (i < parts.length) {
    const cur = parts[i].trim();
    if (!cur) {
      i++;
      continue;
    }
    if (i + 1 < parts.length) {
      const nxt = parts[i + 1].trim();
      if (INITIAL_RE.test(nxt) || /^[A-Z]\.\s*[A-Z]\.?$/.test(nxt)) {
        out.push(`${cur}, ${nxt}`);
        i += 2;
        continue;
      }
      if (/^[A-Z]\.?(?:\s+[A-Z]\.?)*$/.test(nxt) && nxt.length <= 8) {
        out.push(`${cur}, ${nxt}`);
        i += 2;
        continue;
      }
      if (
        /^[A-Z][a-zA-Z'-]+$/.test(cur) &&
        /^[A-Z][a-zA-Z'-]+$/.test(nxt) &&
        nxt.split(' ').length === 1
      ) {
        out.push(`${cur}, ${nxt}`);
        i += 2;
        continue;
      }
    }
    out.push(cur);
    i++;
  }

  const cleaned: string[] = [];
  for (let a of out) {
    a = a.trim().replace(/[,.]+$/, '').trim().replace(/\s+/g, ' ');
    if (!a) continue;
    if (['the', 'et al', 'et al.', 'n/a', 'and'].includes(a.toLowerCase())) continue;
    if (a.length < 3 && !isInstitutional(a)) continue;
    cleaned.push(a);
  }
  return cleaned;
}

function findAnalysisDoc(root: string, ref: string): string | null {
  const dir = path.join(root, ...REFS_DIR);
  if (!fs.existsSync(dir)) return null;
  const match = fs.readdirSync(dir).find((f) => f.startsWith(`${ref}-`));
  return match ? path.join(dir, match) : null;
}

export interface AuthorRepairResult {
  ref: string;
  ok: boolean;
  reason: string;
  authors?: string[];
}

export function repairAuthors(root: string, opts: { write?: boolean } = {}): AuthorRepairResult[] {
  const results: AuthorRepairResult[] = [];
  for (const file of listSidecars(root)) {
    const text = fs.readFileSync(file, 'utf-8');
    if (!text.includes('(see REF doc)') && !text.includes('"see REF doc"')) continue;
    const ref = refOf(file);
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) {
      results.push({ ref, ok: false, reason: 'no-frontmatter' });
      continue;
    }
    const analysis = findAnalysisDoc(root, ref);
    if (!analysis) {
      results.push({ ref, ok: false, reason: 'no-analysis-doc' });
      continue;
    }
    const authors = parseAuthors(extractCitationBlock(fs.readFileSync(analysis, 'utf-8')));
    if (!authors.length) {
      results.push({ ref, ok: false, reason: 'could-not-parse-authors' });
      continue;
    }
    const newBlock = ['authors:', ...authors.map((a) => `  - name: "${a}"`)].join('\n');
    const newFm = fmMatch[1].replace(/authors:\s*(?:\n\s*-\s*.*)+/, newBlock);
    if (newFm === fmMatch[1]) {
      results.push({ ref, ok: false, reason: 'frontmatter-replace-no-op' });
      continue;
    }
    const newText = `---\n${newFm}\n---\n${text.slice(fmMatch[0].length)}`;
    if (opts.write) fs.writeFileSync(file, newText);
    results.push({ ref, ok: true, reason: 'fixed', authors });
  }
  return results;
}

// ── Affiliation normalization ────────────────────────────────────────────────

/** Load the corpus affiliation map (data-file override → built-in default). */
export function loadAffiliationMap(root: string): Map<string, string> {
  const file = path.join(root, ...AFFIL_MAP_FILE);
  if (fs.existsSync(file)) {
    try {
      const raw = loadYaml(fs.readFileSync(file, 'utf-8'));
      if (raw && typeof raw === 'object') {
        return buildAffiliationReverse(raw as Record<string, string[]>);
      }
    } catch {
      /* fall through to default on malformed override */
    }
  }
  return buildAffiliationReverse(DEFAULT_AFFILIATION_MAP);
}

/** Resolve an affiliation string to a canonical PROF-O slug, or null if ambiguous. */
export function normalizeAffiliation(value: string, reverse: Map<string, string>): string | null {
  if (!value) return null;
  const v = value.trim().replace(/^"|"$/g, '').trim();
  if (/^PROF-O-[a-z0-9-]+$/.test(v)) return v; // already canonical
  const key = v.toLowerCase().trim();
  if (reverse.has(key)) return reverse.get(key)!;
  // Compound (multiple orgs) — skip
  if ([';', ' / ', ' — ', ' ↔ '].some((sep) => v.includes(sep))) return null;
  // Parenthetical — try the part before the paren
  if (v.includes('(') && v.includes(')')) {
    const before = v.split('(')[0].trim().replace(/,$/, '').trim().toLowerCase();
    return reverse.get(before) ?? null;
  }
  return null;
}

export interface AffiliationResult {
  normalized: number;
  alreadyCanonical: number;
  ambiguous: Array<{ ref: string; value: string }>;
  errors: Array<{ ref: string; reason: string }>;
  changes: Array<{ ref: string; from: string; to: string }>;
}

export function normalizeAffiliations(root: string, opts: { write?: boolean } = {}): AffiliationResult {
  const reverse = loadAffiliationMap(root);
  const res: AffiliationResult = { normalized: 0, alreadyCanonical: 0, ambiguous: [], errors: [], changes: [] };
  for (const file of listSidecars(root)) {
    const ref = refOf(file);
    const text = fs.readFileSync(file, 'utf-8');
    const fmMatch = text.match(/^---\n([\s\S]*?)\n---\n/);
    if (!fmMatch) {
      res.errors.push({ ref, reason: 'no-frontmatter' });
      continue;
    }
    let fm: Record<string, unknown>;
    try {
      fm = (loadYaml(fmMatch[1]) as Record<string, unknown>) ?? {};
    } catch {
      res.errors.push({ ref, reason: 'yaml-parse-error' });
      continue;
    }
    const cur = String(fm['affiliation-primary'] ?? '').trim().replace(/^"|"$/g, '');
    if (!cur) {
      res.alreadyCanonical++;
      continue;
    }
    const canonical = normalizeAffiliation(cur, reverse);
    if (canonical === null) {
      res.ambiguous.push({ ref, value: cur });
      continue;
    }
    if (canonical === cur) {
      res.alreadyCanonical++;
      continue;
    }
    const newFm = fmMatch[1].replace(
      /^(affiliation-primary:\s*)"?[^"\n]*"?\s*$/m,
      `$1${canonical}`,
    );
    if (newFm === fmMatch[1]) {
      res.errors.push({ ref, reason: 'regex-no-op' });
      continue;
    }
    if (opts.write) fs.writeFileSync(file, `---\n${newFm}\n---\n${text.slice(fmMatch[0].length)}`);
    res.normalized++;
    res.changes.push({ ref, from: cur, to: canonical });
  }
  return res;
}

export function renderRepair(authors: AuthorRepairResult[], affil: AffiliationResult, write: boolean): string {
  const out: string[] = [];
  const mode = write ? 'WRITE' : 'dry-run';
  const fixed = authors.filter((a) => a.ok && a.reason === 'fixed');
  const failed = authors.filter((a) => !a.ok);
  out.push(`Sidecar repair (${mode})`);
  out.push('');
  out.push(`Authors — fixed: ${fixed.length}, failed: ${failed.length}`);
  for (const r of fixed.slice(0, 5)) out.push(`  ${r.ref}: ${(r.authors ?? []).join('; ')}`);
  for (const r of failed.slice(0, 10)) out.push(`  ! ${r.ref}: ${r.reason}`);
  out.push('');
  out.push(
    `Affiliations — normalized: ${affil.normalized}, already-canonical/none: ${affil.alreadyCanonical}, ` +
      `ambiguous: ${affil.ambiguous.length}, errors: ${affil.errors.length}`,
  );
  for (const c of affil.changes.slice(0, 10)) out.push(`  ${c.ref}: ${c.from} → ${c.to}`);
  for (const a of affil.ambiguous.slice(0, 10)) out.push(`  ? ${a.ref}: ${a.value.slice(0, 80)}`);
  return out.join('\n') + '\n';
}
