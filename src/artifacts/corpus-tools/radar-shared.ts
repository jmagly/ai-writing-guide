/**
 * Shared primitives for the radar/freshness subsystem (#1498).
 *
 * Write-side counterpart to the read-only corpus-views renderers. Ports the
 * common helpers from corpus/radar_init.py + radar_report.py:
 *  - externalized cluster map (mechanism only — the literal REF-range table
 *    from radar_init.guess_cluster is NOT ported; the corpus supplies its own
 *    `documentation/radar/clusters.yaml`, per the #1498 "don't port the literal
 *    ranges" requirement),
 *  - GRADE extraction from the analysis doc (improved over the Python source:
 *    also matches the `**Quality**: A-` form the canonical/expanded reference
 *    templates use, and preserves the +/- sign the Python `([A-D])` dropped),
 *  - citation-sidecar title/authors,
 *  - the radar-sidecar loader.
 *
 * @source historical: corpus/radar_init.py, corpus/radar_report.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';
import { parseFrontmatter, extractRadar, type RadarMeta } from '../corpus-views/ref-parser.js';

const RADAR_DIR = ['documentation', 'radar'];
const REFS_DIR = ['documentation', 'references'];
const CITES_DIR = ['documentation', 'citations'];

/** A loaded radar sidecar: parsed meta (via the shared parser) + raw body + title. */
export interface RadarDoc {
  refId: string;
  meta: RadarMeta;
  title: string | null;
  /** Path relative to the corpus root, for report display. */
  relPath: string;
  text: string;
}

function radarDir(corpusRoot: string): string {
  return path.join(corpusRoot, ...RADAR_DIR);
}

/** List REF ids that have a radar sidecar (`documentation/radar/REF-*-radar.md`). */
export function listRadarRefs(corpusRoot: string): string[] {
  try {
    return fs
      .readdirSync(radarDir(corpusRoot))
      .filter((f) => /^REF-\d{3,4}[a-z]?-radar\.md$/.test(f))
      .map((f) => f.replace(/-radar\.md$/, ''))
      .sort();
  } catch {
    return [];
  }
}

/** List REF ids that have a citation sidecar (`documentation/citations/REF-*-citations.md`). */
export function listCitationRefs(corpusRoot: string): string[] {
  try {
    return fs
      .readdirSync(path.join(corpusRoot, ...CITES_DIR))
      .filter((f) => /^REF-\d{3,4}[a-z]?-citations\.md$/.test(f))
      .map((f) => f.replace(/-citations\.md$/, ''))
      .sort();
  } catch {
    return [];
  }
}

/**
 * Build a REF-id → cluster-tag resolver from `documentation/radar/clusters.yaml`.
 *
 * Format (corpus-supplied; absent file → resolver always returns ''):
 *   cluster-tag:
 *     - "599"        # a single REF number
 *     - "600-605"    # an inclusive REF-number range
 *
 * Mirrors the *behavior* of radar_init.guess_cluster (number-range → tag) without
 * porting its hardcoded ranges.
 */
export function loadClusterMap(corpusRoot: string): (refId: string) => string {
  const file = path.join(radarDir(corpusRoot), 'clusters.yaml');
  let raw: unknown;
  try {
    raw = loadYaml(fs.readFileSync(file, 'utf-8'));
  } catch {
    return () => '';
  }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return () => '';

  // Flatten to ordered [low, high, tag] rules; singletons are low===high.
  const rules: Array<[number, number, string]> = [];
  for (const [tag, spec] of Object.entries(raw as Record<string, unknown>)) {
    const entries = Array.isArray(spec) ? spec : [spec];
    for (const e of entries) {
      const s = String(e).trim();
      const range = s.match(/^(\d+)\s*-\s*(\d+)$/);
      if (range) {
        rules.push([parseInt(range[1], 10), parseInt(range[2], 10), tag]);
      } else if (/^\d+$/.test(s)) {
        const n = parseInt(s, 10);
        rules.push([n, n, tag]);
      }
    }
  }

  return (refId: string): string => {
    const m = refId.match(/^REF-(\d+)/);
    if (!m) return '';
    const n = parseInt(m[1], 10);
    for (const [low, high, tag] of rules) {
      if (n >= low && n <= high) return tag;
    }
    return '';
  };
}

/** GRADE patterns, tried in order. Each captures a letter plus optional +/- sign. */
const GRADE_PATTERNS: RegExp[] = [
  // Canonical/expanded reference templates: §14/§20 Document Classification.
  /\*\*Quality\*\*:\s*([A-D][+-]?)/,
  // radar_init.py forms (sign-preserving; the Python source dropped the sign).
  /GRADE[^|\n]*\|\s*\*{0,2}([A-D][+-]?)\*{0,2}/,
  /\*\*GRADE[^:]*:\*\*\s*([A-D][+-]?)/,
  /\bGRADE\s*[-—:]\s*([A-D][+-]?)/,
];

/**
 * Extract the GRADE letter (with sign, e.g. `A-`) from the REF analysis doc.
 * Scans `documentation/references/REF-XXX-*.md` (skipping templates). Returns
 * `?` when no GRADE is found. Improves on radar_init.read_analysis_grade by
 * matching the `**Quality**:` classification form and preserving the sign.
 */
export function readAnalysisGrade(corpusRoot: string, refId: string): string {
  for (const file of analysisFiles(corpusRoot, refId)) {
    const text = fs.readFileSync(file, 'utf-8');
    for (const pat of GRADE_PATTERNS) {
      const m = text.match(pat);
      if (m) return m[1].toUpperCase();
    }
  }
  return '?';
}

/** Analysis-doc files for a REF (references/REF-XXX-*.md), excluding TEMPLATE-* . */
function analysisFiles(corpusRoot: string, refId: string): string[] {
  const dir = path.join(corpusRoot, ...REFS_DIR);
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.startsWith(`${refId}-`) && f.endsWith('.md') && !f.startsWith('TEMPLATE'))
      .sort()
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** Corpus-relative path of the first analysis doc for a REF, or null. */
export function analysisRelPath(corpusRoot: string, refId: string): string | null {
  const files = analysisFiles(corpusRoot, refId);
  return files.length ? path.relative(corpusRoot, files[0]) : null;
}

/** Title + author display names parsed from the citation sidecar frontmatter. */
export function readCitationMeta(corpusRoot: string, refId: string): { title: string; authors: string[] } {
  const p = path.join(corpusRoot, ...CITES_DIR, `${refId}-citations.md`);
  if (!fs.existsSync(p)) return { title: '', authors: [] };
  const fm = parseFrontmatter(fs.readFileSync(p, 'utf-8'));
  const title = typeof fm.title === 'string' ? fm.title.trim() : '';
  const authors: string[] = [];
  if (Array.isArray(fm.authors)) {
    for (const a of fm.authors) {
      if (a && typeof a === 'object' && 'name' in a && (a as Record<string, unknown>).name) {
        authors.push(String((a as Record<string, unknown>).name).trim());
      } else if (typeof a === 'string' && a.trim()) {
        authors.push(a.trim());
      }
    }
  }
  return { title, authors };
}

/** Load every radar sidecar in the corpus (parsed meta + title + raw body). */
export function loadRadars(corpusRoot: string): RadarDoc[] {
  const out: RadarDoc[] = [];
  for (const refId of listRadarRefs(corpusRoot)) {
    const meta = extractRadar(corpusRoot, refId);
    if (!meta) continue;
    const full = path.join(radarDir(corpusRoot), `${refId}-radar.md`);
    const text = fs.readFileSync(full, 'utf-8');
    const fm = parseFrontmatter(text);
    out.push({
      refId,
      meta,
      title: typeof fm.title === 'string' ? fm.title.trim() : null,
      relPath: path.relative(corpusRoot, full),
      text,
    });
  }
  return out;
}
