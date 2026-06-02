/**
 * Induction quality: frontmatter backfill + per-type induction depth audit (#1504).
 *
 * TS-native port of section9 `backfill_frontmatter.py` + `audit_inductions.py`.
 * The audit is **source-type-aware** (#1509): required-section checks come from
 * the source-type registry, so a blog isn't flagged for missing "Benchmark
 * Results" and a repo is checked for "Architecture"/"Maintenance Signals". This
 * is the audit consumer that demonstrates the #1509 registry end-to-end.
 *
 * Reconciles with `research-quality-audit` (GRADE evidence quality) and
 * `best-practices-audit` (corpus-wide best practices): this is the structural +
 * depth + per-type-section induction check, not a GRADE assessment.
 *
 * @source historical: corpus/audit_inductions.py, corpus/backfill_frontmatter.py
 * @tests @test/unit/artifacts/induction-audit.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { parseFrontmatter } from '../corpus-views/ref-parser.js';
import { classifyFirst, VENUE_PATTERNS } from '../corpus-views/taxonomies.js';
import {
  loadSourceTypeRegistry,
  normalizeSourceType,
  getSourceType,
  type SourceTypeRegistry,
} from './source-types.js';

const REFS_DIR = ['documentation', 'references'];
const CITES_DIR = ['documentation', 'citations'];
const PDFS_DIR = ['pdfs', 'full'];
const LEGACY_EXCLUDED_TYPES = new Set(['redirect', 'gap-note', 'chapter']);

function asStr(v: unknown): string {
  return v == null ? '' : String(v);
}

// ── Depth bands (port of audit_inductions depth logic) ───────────────────────
function depthBand(lines: number): string {
  if (lines < 80) return 'STUB';
  if (lines < 150) return 'compact';
  if (lines < 250) return 'good';
  if (lines < 400) return 'full';
  return 'deep';
}

function refFiles(root: string): string[] {
  const dir = path.join(root, ...REFS_DIR);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => /^REF-\d{3,4}[a-z]?(-.*)?\.md$/.test(f)).sort();
}

function refIdOf(filename: string): string | null {
  const m = filename.match(/^(REF-\d{3,4}[a-z]?)/);
  return m ? m[1] : null;
}

function findAnalysis(root: string, refId: string): string | null {
  const dir = path.join(root, ...REFS_DIR);
  if (!fs.existsSync(dir)) return null;
  const m = fs.readdirSync(dir).find((f) => f === `${refId}.md` || f.startsWith(`${refId}-`));
  return m ? path.join(dir, m) : null;
}

function hasPdf(root: string, refId: string): boolean {
  const dir = path.join(root, ...PDFS_DIR);
  if (!fs.existsSync(dir)) return false;
  return fs.readdirSync(dir).some((f) => f === `${refId}.pdf` || f.startsWith(`${refId}-`));
}

export interface AuditResult {
  ref: string;
  analysisExists: boolean;
  analysisLines: number;
  sidecarExists: boolean;
  pdfExists: boolean;
  pdfExcluded: boolean;
  sourceType: string;
  depthBand: string;
  missingSections: string[];
  issues: string[];
}

export interface AuditOptions {
  start?: number;
  end?: number;
  refs?: string[];
}

/** Audit one ref. Required sections come from its source type's registry entry. */
function auditRef(root: string, refId: string, reg: SourceTypeRegistry): AuditResult {
  const r: AuditResult = {
    ref: refId, analysisExists: false, analysisLines: 0, sidecarExists: false,
    pdfExists: false, pdfExcluded: false, sourceType: 'other', depthBand: '',
    missingSections: [], issues: [],
  };

  const analysis = findAnalysis(root, refId);
  if (analysis) {
    r.analysisExists = true;
    const text = fs.readFileSync(analysis, 'utf-8');
    const low = text.toLowerCase();
    r.analysisLines = text.split('\n').length;
    r.depthBand = depthBand(r.analysisLines);
    if (r.depthBand === 'STUB') r.issues.push('below-80-line-stub-threshold');

    const fm = parseFrontmatter(text);
    const venue = classifyFirst(text.slice(0, 3500).toLowerCase(), VENUE_PATTERNS);
    r.sourceType = normalizeSourceType(
      { type: asStr(fm.type), sourceType: asStr(fm.source_type), venue },
      reg,
    );

    // Required sections by source type (the #1509 consumer). `meta` docs
    // (redirects/stubs) are exempt; unknown types fall back to a base set.
    if (r.sourceType !== 'meta') {
      const required = getSourceType(r.sourceType, reg)?.requiredSections ?? ['Citation', 'Summary'];
      for (const sec of required) {
        if (!low.includes(sec.toLowerCase())) r.missingSections.push(sec);
      }
    }

    // PDF-exclusion conventions (audit-exclude-missing-pdf flag or legacy type).
    const flag = asStr(fm['audit-exclude-missing-pdf']).toLowerCase();
    if (['true', 'yes', '1'].includes(flag)) r.pdfExcluded = true;
    if (LEGACY_EXCLUDED_TYPES.has(asStr(fm.type).toLowerCase())) r.pdfExcluded = true;
  } else {
    r.issues.push('MISSING-ANALYSIS-DOC');
  }

  r.sidecarExists = fs.existsSync(path.join(root, ...CITES_DIR, `${refId}-citations.md`));
  if (!r.sidecarExists) r.issues.push('MISSING-SIDECAR');

  r.pdfExists = hasPdf(root, refId);
  if (r.pdfExists && r.pdfExcluded) r.issues.push('PDF-PRESENT-BUT-MARKED-EXCLUDED');
  else if (!r.pdfExists && !r.pdfExcluded) r.issues.push('MISSING-PDF');

  // missingSections is an informational per-type completeness signal, not a hard
  // issue — the registry's required set is the type's full template, which real
  // inductions don't always fill. Structural problems + stub depth are the issues.
  return r;
}

export function auditInductions(root: string, opts: AuditOptions = {}): AuditResult[] {
  const reg = loadSourceTypeRegistry(root);
  let ids: string[];
  if (opts.refs?.length) {
    ids = opts.refs;
  } else if (opts.start != null && opts.end != null) {
    ids = [];
    for (let n = opts.start; n <= opts.end; n++) ids.push(`REF-${n}`);
  } else {
    ids = refFiles(root).map(refIdOf).filter((x): x is string => !!x);
    ids = [...new Set(ids)];
  }
  return ids.map((id) => auditRef(root, id, reg));
}

export function renderAudit(results: AuditResult[]): string {
  const out: string[] = [];
  const present = results.filter((r) => r.analysisExists);
  const bands: Record<string, number> = {};
  for (const r of present) bands[r.depthBand] = (bands[r.depthBand] ?? 0) + 1;
  out.push(`Induction audit — ${results.length} refs`);
  out.push(`Analysis present: ${present.length}/${results.length}`);
  out.push(`Sidecars present: ${results.filter((r) => r.sidecarExists).length}/${results.length}`);
  out.push(`Depth bands: ${['STUB', 'compact', 'good', 'full', 'deep'].map((b) => `${b}=${bands[b] ?? 0}`).join('  ')}`);
  // Per-type required-section completeness (informational — consumes the #1509 registry).
  const incompleteByType: Record<string, number> = {};
  for (const r of present) if (r.missingSections.length) incompleteByType[r.sourceType] = (incompleteByType[r.sourceType] ?? 0) + 1;
  if (Object.keys(incompleteByType).length) {
    out.push(`Per-type incomplete required sections: ${Object.entries(incompleteByType).map(([t, n]) => `${t}=${n}`).join('  ')}`);
  }
  out.push('');
  out.push(`${'REF'.padEnd(10)} ${'type'.padEnd(14)} ${'lines'.padEnd(6)} ${'band'.padEnd(8)} ${'miss-sec'.padEnd(8)} issues`);
  for (const r of results) {
    if (!r.issues.length && r.depthBand !== 'STUB' && r.missingSections.length === 0) continue;
    out.push(`${r.ref.padEnd(10)} ${r.sourceType.padEnd(14)} ${String(r.analysisLines).padEnd(6)} ${r.depthBand.padEnd(8)} ${String(r.missingSections.length).padEnd(8)} ${r.issues.join(', ')}`);
  }
  const clean = results.filter((r) => !r.issues.length).length;
  out.push('');
  out.push(`${clean}/${results.length} refs free of structural issues; section-completeness shown above (informational).`);
  return out.join('\n') + '\n';
}

// ── Frontmatter backfill (port of backfill_frontmatter.py) ────────────────────

export interface BackfillResult {
  changed: string[];
  skippedExisting: number;
  holdouts: Array<{ ref: string; missing: string }>;
}

function extractTitle(refId: string, text: string): string | null {
  const m1 = text.match(new RegExp(`^#\\s+${refId}[:\\s]+(.+?)\\s*$`, 'm'));
  if (m1) return m1[1].trim();
  const m2 = text.match(/^#\s+(.+?)\s*$/m);
  if (m2) return m2[1].replace(new RegExp(`^${refId}[:\\s]+`), '').trim();
  return null;
}

function extractYear(text: string): string | null {
  const cite = text.match(/^##\s+(?:1\.\s*)?Citation\s*\n+([\s\S]*?)(?:\n##|$)/m);
  const space = (cite ? cite[1] : text).slice(0, 3000);
  const paren = space.match(/\((19|20)\d{2}\)/);
  if (paren) return paren[0].replace(/[()]/g, '');
  const bare = space.match(/\b(19|20)\d{2}\b/);
  return bare ? bare[0] : null;
}

function pdfHash(root: string, refId: string): string | null {
  const dir = path.join(root, ...PDFS_DIR);
  if (!fs.existsSync(dir)) return null;
  const m = fs.readdirSync(dir).find((f) => f === `${refId}.pdf` || f.startsWith(`${refId}-`));
  if (!m) return null;
  return createHash('sha256').update(fs.readFileSync(path.join(dir, m))).digest('hex');
}

/** Additive frontmatter backfill: skips docs that already have frontmatter. */
export function backfillFrontmatter(root: string, opts: { write?: boolean; date?: string } = {}): BackfillResult {
  const dir = path.join(root, ...REFS_DIR);
  const res: BackfillResult = { changed: [], skippedExisting: 0, holdouts: [] };
  if (!fs.existsSync(dir)) return res;
  const date = opts.date ?? 'backfilled';
  for (const f of fs.readdirSync(dir).filter((x) => /^REF-.*\.md$/.test(x)).sort()) {
    const refId = refIdOf(f);
    if (!refId) continue;
    const full = path.join(dir, f);
    const text = fs.readFileSync(full, 'utf-8');
    if (text.startsWith('---\n')) {
      res.skippedExisting++;
      continue;
    }
    const title = extractTitle(refId, text);
    const year = extractYear(text);
    if (!title || !year) {
      const missing = [!title && 'title', !year && 'year'].filter(Boolean).join(',');
      res.holdouts.push({ ref: refId, missing });
      continue;
    }
    const digest = pdfHash(root, refId);
    const fm = ['---', `ref_id: ${refId}`, `title: ${JSON.stringify(title)}`, `year: ${year}`];
    if (digest) fm.push(`pdf_hash: ${JSON.stringify(digest)}`);
    fm.push(`frontmatter-backfilled: ${date}`, '---', '');
    if (opts.write) fs.writeFileSync(full, fm.join('\n') + text);
    res.changed.push(refId);
  }
  return res;
}

export function renderBackfill(r: BackfillResult, write: boolean): string {
  const out: string[] = [];
  out.push(`frontmatter-backfill (${write ? 'WRITE' : 'dry-run'})`);
  out.push(`changed: ${r.changed.length}  skipped (already had frontmatter): ${r.skippedExisting}  holdouts: ${r.holdouts.length}`);
  for (const h of r.holdouts.slice(0, 20)) out.push(`  ! ${h.ref}: missing ${h.missing}`);
  return out.join('\n') + '\n';
}
