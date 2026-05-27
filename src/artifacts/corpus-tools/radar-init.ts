/**
 * radar-init — scaffold a radar/freshness sidecar for a REF (#1498).
 *
 * Faithful port of corpus/radar_init.py scaffold(): pulls title/authors from the
 * citation sidecar and GRADE from the analysis doc, defaults the refresh cadence
 * from GRADE (shared cadenceForGrade) and the cluster from the externalized
 * cluster map, and stamps `documentation/radar/REF-XXX-radar.md`. Skip-if-exists;
 * dry-run unless `write`.
 *
 * @source historical: corpus/radar_init.py (scaffold, main --all-missing)
 */

import * as fs from 'fs';
import * as path from 'path';
import { cadenceForGrade } from '../corpus-views/corpus-config.js';
import {
  readAnalysisGrade,
  readCitationMeta,
  analysisRelPath,
  loadClusterMap,
  listCitationRefs,
  listRadarRefs,
} from './radar-shared.js';

export interface ScaffoldOptions {
  /** Override the GRADE-derived cadence. */
  cadence?: string;
  /** Override the cluster-map-derived cluster tag. */
  cluster?: string;
  /** Actually write the file (default: dry-run). */
  write?: boolean;
  /** ISO date stamp (defaults to today, UTC). */
  today?: string;
  /** Pre-loaded cluster resolver (batch reuse); built per-call when omitted. */
  clusterResolver?: (refId: string) => string;
}

export interface ScaffoldResult {
  refId: string;
  status: 'wrote' | 'skip' | 'dry-run';
  message: string;
  /** Corpus-relative output path. */
  outPath: string;
  /** Generated sidecar content (present for dry-run and wrote). */
  content?: string;
}

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build the `../…` link from documentation/radar/ to the analysis doc. */
function analysisLink(relPath: string | null, refId: string): string {
  if (!relPath) return `../references/${refId}-*.md`;
  const segs = relPath.split(path.sep);
  // documentation/references/REF.md -> ../references/REF.md
  return segs[0] === 'documentation' ? `../${segs.slice(1).join('/')}` : `../${segs.join('/')}`;
}

/** Render the radar-sidecar markdown body. Mirrors radar_init.scaffold()'s line block. */
function renderSidecar(args: {
  refId: string;
  title: string;
  authors: string[];
  grade: string;
  cadence: string;
  cluster: string;
  today: string;
  analysisRel: string | null;
}): string {
  const { refId, title, authors, grade, cadence, cluster, today, analysisRel } = args;
  const link = analysisLink(analysisRel, refId);
  const analysisName = analysisRel ? analysisRel.split(path.sep).pop()! : 'n/a';

  const lines: string[] = [
    '---',
    `ref: ${refId}`,
    `title: "${title}"`,
    'type: radar',
    `refresh-cadence: ${cadence}`,
    `last-refreshed: ${today}`,
    'last-refreshed-by: radar-init-scaffold',
  ];
  if (cluster) lines.push(`cluster: ${cluster}`);
  lines.push(
    `grade-original: ${grade}`,
    `grade-current: ${grade}`,
    'grade-trajectory: stable',
    'sources-searched: []    # populate on first refresh',
    '---',
    '',
    `# ${refId} Radar`,
    '',
    `**Paper**: [citation sidecar](../citations/${refId}-citations.md) · [analysis doc](${link})`,
    `**Title**: ${title}`,
  );
  if (authors.length) {
    const display = authors.slice(0, 3);
    const suffix = authors.length > 3 ? ' et al.' : '';
    lines.push(`**Authors**: ${display.join(', ')}${suffix}`);
  }
  lines.push(
    `**Last refreshed**: ${today}`,
    '**Next refresh due**: — (compute from cadence)',
    '**Refresh rationale**: Initial scaffold. Full multi-vector signal gather pending first `/radar refresh` invocation.',
    '',
    '---',
    '',
    '## 1. GRADE Re-Assessment',
    '',
    '| Attribute | At Induction | Current | Δ |',
    '|---|---|---|---|',
    `| GRADE letter | ${grade} | ${grade} | — |`,
    '| Peer-reviewed | — | — | — |',
    '| Replication status | — | — | — |',
    '| Retraction status | clean | clean | — |',
    '| Author active | — | — | — |',
    '',
    '**Rationale**: Initial scaffold, no re-assessment performed yet.',
    '',
    '## 2. Citation Signals',
    '',
    `**As of ${today}** — pending first refresh.`,
    '',
    '## 3. Implementation / Code Signals',
    '',
    'Pending first refresh.',
    '',
    '## 4. News & Discussion',
    '',
    'Pending first refresh.',
    '',
    '## 5. Retractions / Corrections / Concerns',
    '',
    '| Category | Status | Detail |',
    '|---|---|---|',
    `| Retraction Watch | unchecked (scaffold created ${today}) | — |`,
    '| PubPeer | unchecked | — |',
    '| Formal corrigenda | none known | — |',
    '| Methodology critiques | none known | — |',
    '| Reproducibility attempts | — | — |',
    '',
    '## 6. Notable Links',
    '',
    '**Primary**:',
    `- Analysis doc: [${analysisName}](${link})`,
    `- Citation sidecar: [${refId}-citations.md](../citations/${refId}-citations.md)`,
    '- PDF: (in `pdfs/full/`)',
    '',
    '## 7. Open Questions / Watch Items',
    '',
    'Pending first refresh — what should we watch for?',
    '',
    '## 8. Refresh History',
    '',
    '| Date | Refreshed by | GRADE before → after | Key changes |',
    '|---|---|---|---|',
    `| ${today} | radar-init-scaffold | — → ${grade} | Initial scaffold (no signals gathered yet) |`,
    '',
  );
  return lines.join('\n');
}

/** Scaffold a radar sidecar for one REF. */
export function scaffoldRadar(corpusRoot: string, refId: string, opts: ScaffoldOptions = {}): ScaffoldResult {
  const outRel = path.join('documentation', 'radar', `${refId}-radar.md`);
  const citationPath = path.join(corpusRoot, 'documentation', 'citations', `${refId}-citations.md`);
  if (!fs.existsSync(citationPath)) {
    return { refId, status: 'skip', message: `SKIP ${refId}: no citation sidecar found`, outPath: outRel };
  }

  const { title, authors } = readCitationMeta(corpusRoot, refId);
  const grade = readAnalysisGrade(corpusRoot, refId);
  const cadence = opts.cadence || cadenceForGrade(grade);
  const resolve = opts.clusterResolver ?? loadClusterMap(corpusRoot);
  const cluster = opts.cluster ?? resolve(refId);
  const today = opts.today || todayUtc();
  const content = renderSidecar({
    refId,
    title,
    authors,
    grade,
    cadence,
    cluster,
    today,
    analysisRel: analysisRelPath(corpusRoot, refId),
  });

  const outAbs = path.join(corpusRoot, outRel);
  if (!opts.write) {
    return { refId, status: 'dry-run', message: `DRY-RUN ${refId}: would write ${outRel} (${content.length} chars)`, outPath: outRel, content };
  }
  if (fs.existsSync(outAbs)) {
    return { refId, status: 'skip', message: `SKIP ${refId}: radar already exists at ${outRel}`, outPath: outRel };
  }
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, content, 'utf-8');
  return { refId, status: 'wrote', message: `WROTE ${outRel}`, outPath: outRel, content };
}

/** Scaffold radars for every REF with a citation sidecar but no radar yet. */
export function radarInitMissing(corpusRoot: string, opts: ScaffoldOptions = {}): ScaffoldResult[] {
  const haveRadar = new Set(listRadarRefs(corpusRoot));
  const missing = listCitationRefs(corpusRoot).filter((r) => !haveRadar.has(r));
  const clusterResolver = opts.clusterResolver ?? loadClusterMap(corpusRoot);
  return missing.map((refId) => scaffoldRadar(corpusRoot, refId, { ...opts, clusterResolver }));
}
