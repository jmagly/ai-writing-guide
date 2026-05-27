/**
 * Curator (PROF-S) tooling — discovery-provenance / source-tracking subsystem (#1499).
 *
 * - curator-status: per-curator yield (inducted REFs, avg GRADE, return-to score),
 *   revisit-cadence staleness (shared computeStaleness), and the curator-orphan
 *   check (discovery.curator-id set but the PROF-S is missing that REF).
 * - curator-init: scaffold a PROF-S source profile from a handle.
 *
 * The discovery block + PROF-S frontmatter are already parsed by the #1497
 * parser (extractDiscovery / loadProfiles incl. `sources`); the read views
 * by-source / by-curator shipped in #1492. This is the write/compute side.
 *
 * @source historical: documentation/SOURCE-TRACKING.md, profiles/sources/TEMPLATE-source-profile.md
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadProfiles, loadCorpus } from '../corpus-views/ref-parser.js';
import { computeStaleness } from '../corpus-views/corpus-config.js';
import { readAnalysisGrade } from './radar-shared.js';

/** GRADE letter → numeric for averaging (A=4 … D=1; signs interpolate). */
const GRADE_VALUE: Record<string, number> = { A: 4, 'A-': 3.7, B: 3, 'B-': 2.7, C: 2, 'C-': 1.7, D: 1 };

function gradeNum(g: string): number | null {
  return GRADE_VALUE[g.toUpperCase()] ?? GRADE_VALUE[(g[0] ?? '').toUpperCase()] ?? null;
}

function fmStr(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

export interface CuratorRow {
  profId: string;
  name: string;
  handle: string;
  platform: string;
  signalQuality: string;
  revisitCadence: string;
  lastHarvested: string;
  inductedCount: number;
  avgGrade: number;
  /** return-to score = inducted-ref-count × avg-GRADE (SOURCE-TRACKING §2). */
  returnToScore: number;
  overdueDays: number | null;
  isStale: boolean;
}

export interface CuratorOrphan {
  refId: string;
  curatorId: string;
  reason: string;
}

export interface CuratorStatusOptions {
  today?: string;
}

/** Per-curator (PROF-S) yield rows, ranked by return-to score (highest first). */
export function curatorRows(corpusRoot: string, opts: CuratorStatusOptions = {}): CuratorRow[] {
  const today = new Date(`${opts.today ?? new Date().toISOString().slice(0, 10)}T00:00:00Z`);
  const rows = loadProfiles(corpusRoot)
    .filter((p) => p.type === 'source')
    .map((p) => {
      const grades = p.corpusRefs.map((r) => gradeNum(readAnalysisGrade(corpusRoot, r))).filter((x): x is number => x !== null);
      const avgGrade = grades.length ? grades.reduce((a, b) => a + b, 0) / grades.length : 0;
      const cadence = fmStr(p.frontmatter['revisit-cadence']);
      const last = fmStr(p.frontmatter['last-harvested']);
      const s = computeStaleness(cadence, last, today);
      return {
        profId: p.profId,
        name: p.name ?? '',
        handle: fmStr(p.frontmatter.handle) ?? '',
        platform: fmStr(p.frontmatter.platform) ?? '',
        signalQuality: fmStr(p.frontmatter['signal-quality']) ?? '—',
        revisitCadence: cadence ?? '—',
        lastHarvested: last ?? '',
        inductedCount: p.corpusRefs.length,
        avgGrade: Math.round(avgGrade * 100) / 100,
        returnToScore: Math.round(p.corpusRefs.length * avgGrade * 100) / 100,
        overdueDays: s.overdueDays,
        isStale: s.isStale,
      };
    });
  return rows.sort((a, b) => b.returnToScore - a.returnToScore || (a.profId < b.profId ? -1 : a.profId > b.profId ? 1 : 0));
}

/**
 * Curator orphans: a citation sidecar with `discovery.curator-id` set, but the
 * named PROF-S is absent or is missing that REF in its `corpus-refs`. The check
 * fires ONLY when curator-id is set (SOURCE-TRACKING §0/§3) — a missing or
 * null/`direct` discovery block is never an orphan.
 */
export function curatorOrphans(corpusRoot: string): CuratorOrphan[] {
  const { records } = loadCorpus(corpusRoot);
  const curatorRefs = new Map(
    loadProfiles(corpusRoot)
      .filter((p) => p.type === 'source')
      .map((p) => [p.profId, new Set(p.corpusRefs)] as const),
  );
  const orphans: CuratorOrphan[] = [];
  for (const r of records) {
    const cid = r.discovery?.curatorId;
    if (!cid) continue;
    if (!curatorRefs.has(cid)) orphans.push({ refId: r.refId, curatorId: cid, reason: 'no PROF-S profile' });
    else if (!curatorRefs.get(cid)!.has(r.refId)) orphans.push({ refId: r.refId, curatorId: cid, reason: 'REF missing from curator corpus-refs' });
  }
  return orphans;
}

/** Render the curator yield ranking + an orphan section. */
export function renderCuratorStatus(rows: CuratorRow[], orphans: CuratorOrphan[]): string {
  const lines = [
    '# Curators (PROF-S) — yield & freshness',
    '',
    `${rows.length} curators · ${orphans.length} discovery orphans`,
    '',
    '| Curator | Handle | Signal | Cadence | Last Harvested | Inducted | Avg GRADE | Return-to | Overdue |',
    '|---|---|---|---|---|---:|---:|---:|---:|',
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.profId} | ${r.handle || '—'} | ${r.signalQuality} | ${r.revisitCadence} | ${r.lastHarvested || '—'} | ${r.inductedCount} | ${r.avgGrade || '—'} | ${r.returnToScore || '—'} | ${r.overdueDays ?? '—'} |`,
    );
  }
  lines.push('', '## Discovery orphans', '');
  if (orphans.length) {
    lines.push('`discovery.curator-id` set but the curator is missing the REF (SOURCE-TRACKING §3):', '', '| REF | Curator | Issue |', '|---|---|---|');
    for (const o of orphans) lines.push(`| ${o.refId} | ${o.curatorId} | ${o.reason} |`);
  } else {
    lines.push('None — every `discovery.curator-id` resolves to a PROF-S that lists the REF.');
  }
  return lines.join('\n') + '\n';
}

/** Curator slug from a handle: lowercased, leading punctuation stripped, `_`→`-`. */
export function curatorSlug(handle: string): string {
  return handle
    .trim()
    .replace(/^[@/]+/, '')
    .toLowerCase()
    .replace(/_/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface CuratorInitOptions {
  platform?: string;
  name?: string;
  cadence?: string;
  write?: boolean;
  today?: string;
}

export interface CuratorInitResult {
  slug: string;
  status: 'wrote' | 'skip' | 'dry-run';
  message: string;
  outPath: string;
  content?: string;
}

/** Scaffold a PROF-S source/curator profile from a handle. */
export function scaffoldCurator(corpusRoot: string, handle: string, opts: CuratorInitOptions = {}): CuratorInitResult {
  const slug = curatorSlug(handle);
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const platform = opts.platform || 'x';
  const cadence = opts.cadence || 'weekly';
  const name = opts.name || handle;
  const outRel = path.join('documentation', 'profiles', 'sources', `PROF-S-${slug}.md`);
  const content = [
    '---',
    `prof-id: PROF-S-${slug}`,
    `name: "${name}"`,
    'type: source',
    `platform: ${platform}`,
    `handle: "${handle}"`,
    'url: ""',
    'operator: ""',
    'corpus-refs: []',
    'surfaces: []',
    'focus-areas: []',
    'signal-quality: "—"',
    'grade-trajectory: unknown',
    `revisit-cadence: ${cadence}`,
    `last-harvested: ${today}`,
    'last-harvested-by: curator-init-scaffold',
    'candidate-yield: 0',
    '---',
    '',
    `# ${name} — Source / Curator Profile`,
    '',
    '**Type**: Source / Curator',
    `**Profile ID**: \`PROF-S-${slug}\``,
    `**Platform**: ${platform} · **Handle**: ${handle}`,
    `**Revisit cadence**: ${cadence}`,
    `**Last harvested**: ${today}`,
    '',
    '---',
    '',
    '## 1. Curator Summary',
    '',
    'Initial scaffold — describe what this account posts and why it is worth tracking on first harvest.',
    '',
    '## 2. Sources Surfaced',
    '',
    '### Inducted (in corpus)',
    '| REF | Title | Surfaced | GRADE |',
    '|---|---|---|---|',
    '',
    '### Candidate Sources Surfaced (not yet inducted)',
    '| Candidate | Surfaced | Harvest batch | Working file |',
    '|---|---|---|---|',
    '',
    '## 3. Notes',
    '',
    `- Scaffolded by \`aiwg corpus curator-init\` on ${today}. Populate yield + signal-quality on first harvest.`,
    '',
  ].join('\n');

  const outAbs = path.join(corpusRoot, outRel);
  if (!opts.write) return { slug, status: 'dry-run', message: `DRY-RUN PROF-S-${slug}: ${name}`, outPath: outRel, content };
  if (fs.existsSync(outAbs)) return { slug, status: 'skip', message: `SKIP PROF-S-${slug} (exists)`, outPath: outRel };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, content, 'utf-8');
  return { slug, status: 'wrote', message: `WROTE PROF-S-${slug}: ${name}`, outPath: outRel, content };
}
