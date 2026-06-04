/**
 * `aiwg corpus` subcommand router — radar/freshness tools (#1498).
 *
 * Mirrors src/artifacts/cli.ts (the `aiwg index` router): a thin arg parser that
 * resolves the corpus root (env > research.corpusRoot > cwd, via build.ts's
 * resolveCorpusRoot) and dispatches to the corpus-tools functions. The
 * research-complete radar-* skills wrap these subcommands.
 *
 * Subcommands:
 *   radar-init   --ref REF-XXX | --all-missing [--cadence C] [--cluster T] [--write]
 *   radar-status [--stale-only] [--format table|csv|list] [--out PATH]
 *   radar-report [--cluster T] [--out PATH]
 *
 * @source historical: corpus/radar_init.py, radar_staleness.py, radar_report.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { resolveCorpusRoot } from '../corpus-views/build.js';
import { scaffoldRadar, radarInitMissing } from './radar-init.js';
import { radarStatusRows, renderRadarStatus, type RadarStatusFormat } from './radar-status.js';
import { renderRadarReport } from './radar-report.js';
import { profileStatusRows, renderProfileStatus, type ProfileStatusFormat } from './profile-status.js';
import { generateTier1Profiles } from './profile-generate.js';
import { generateFmProfiles } from './profile-generate-fm.js';
import { curatorRows, curatorOrphans, renderCuratorStatus, scaffoldCurator } from './curator.js';
import { logDiscovery } from './discovery-log.js';
import { computeMetrics, renderMetrics } from './profile-metrics.js';
import { computeTrajectory, renderTrajectory } from './profile-temporal.js';
import { detectCommunities, renderCommunities } from './profile-communities.js';
import { funderRows, cofundingClusters, renderFunderNetwork } from './funder-network.js';
import { lintSidecars, renderLint, findOrphans, renderOrphans } from './sidecar-lint.js';
import { repairAuthors, normalizeAffiliations, renderRepair } from './sidecar-repair.js';
import { extractCrossrefs, renderCrossrefs, backfillCitations, renderBackfill } from './citation-densify.js';
import { scanCorpus, renderScan, writeQuarantineReports, failsThreshold } from './integrity-scan.js';
import { loadSourceTypeRegistry, renderSourceTypes } from './source-types.js';
import { auditInductions, renderAudit, backfillFrontmatter, renderBackfill as renderBackfillFm } from './induction-audit.js';
import { buildProfileEdges, renderProfileEdges } from './profile-edges.js';
import { extractPages, renderExtract, resolveAdapter, rasterizePdf } from './vision-extract.js';

function flagValue(args: string[], name: string): string | undefined {
  const i = args.indexOf(name);
  return i !== -1 && i + 1 < args.length ? args[i + 1] : undefined;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

const HELP = `aiwg corpus — research-corpus tools

Usage:
  aiwg corpus radar-init --ref REF-XXX [--cadence C] [--cluster T] [--write]
  aiwg corpus radar-init --all-missing [--write]
  aiwg corpus radar-status [--stale-only] [--format table|csv|list] [--out PATH]
  aiwg corpus radar-report [--cluster TAG] [--out PATH]
  aiwg corpus profile-status [--stale-only] [--format table|csv|list] [--out PATH]
  aiwg corpus profile-generate [--limit N] [--scan N] [--write]
  aiwg corpus profile-generate --fm [--write]
  aiwg corpus curator-status [--out PATH]
  aiwg corpus curator-init --handle @h [--platform x] [--name "N"] [--cadence weekly] [--write]
  aiwg corpus discovery-log --ref REF-XXX --surface SURFACE [--via "..."] [--curator PROF-S-x] [--date D] [--batch B] [--by A] [--write]
  aiwg corpus profile-metrics [--papers] [--out PATH]
  aiwg corpus profile-temporal --entity PROF-P-x [--out PATH]
  aiwg corpus profile-communities [--out PATH]
  aiwg corpus funder-network [--scan-acks] [--out PATH]
  aiwg corpus sidecar-lint [--orphans] [--out PATH]
  aiwg corpus sidecar-repair [--authors-only | --affiliations-only] [--write] [--out PATH]
  aiwg corpus extract-crossrefs [--refs REF-a,REF-b] [--write] [--out PATH]
  aiwg corpus citation-backfill [--write] [--out PATH]
  aiwg corpus integrity-scan [--ref REF-XXX] [--quarantine] [--fail-on review|quarantine] [--out PATH]
  aiwg corpus source-types [--json] [--out PATH]
  aiwg corpus induction-audit [--start N --end N | --ref REF-XXX] [--out PATH]
  aiwg corpus frontmatter-backfill [--write] [--out PATH]
  aiwg corpus profile-edges [--out PATH]
  aiwg corpus profile-similar --entity PROF-P-x [--top K] | --predict-collabs [--threshold T] [--out PATH]
  aiwg corpus vision-extract --slug SLUG [--images DIR] [--out DIR] [--start N] [--end N] [--provider codex|command] [--command TMPL] [--model M] [--retries N] [--title T] [--force] [--rasterize PDF] [--dpi N]

radar-init scaffolds radar sidecars (dry-run unless --write; skips existing).
radar-status reports overdue radars (most-overdue-first).
radar-report aggregates corpus/cluster freshness.
profile-status reports entity profiles past their refresh cadence.
profile-generate scaffolds PROF-P profiles for unprofiled hub authors (dry-run unless --write).
profile-generate --fm scaffolds FM-author PROF-P + group PROF-G profiles from documentation/profiles/fm-config.yaml.
curator-status reports PROF-S curators by yield (return-to score) + discovery orphans.
curator-init scaffolds a PROF-S source/curator profile from a handle.
discovery-log records the discovery block on a citation sidecar.
profile-metrics computes h-index / CD-index / PageRank / centrality per profile (--papers for paper-level).
profile-temporal computes publication trajectory + hot-streak for one profile.
profile-communities detects co-author communities + modularity + bridge authors.
funder-network reports per-funder yield (A-grade, mean CD, novelty bias) + co-funding clusters.
sidecar-lint reports citation-sidecar structural issues (missing sections/frontmatter, duplicate table headers); --orphans lists zero-edge sidecars.
sidecar-repair backfills (see REF doc) authors from the analysis citation block + normalizes affiliation-primary to PROF-O slugs (dry-run unless --write).
extract-crossrefs injects analysis-doc Cross-References REFs (that have a sidecar) as missing outgoing edges (dry-run unless --write).
citation-backfill computes the inverse citation map + injects missing incoming edges; reports dangling cited-but-no-sidecar targets (dry-run unless --write).
integrity-scan flags LLM residue / placeholders / submission risks per REF (pass/review/quarantine); --quarantine writes per-REF reports; --fail-on exits non-zero at threshold.
source-types lists the canonical source-type registry (paper/preprint/blog/repo/…) that normalizes the type/source_type/Source-Type vocabularies; override per-corpus at documentation/source-types.yaml.
induction-audit checks induction depth-bands + structural integrity + per-source-type required sections (a blog isn't flagged for missing Benchmark Results).
frontmatter-backfill adds minimal ref_id/title/year/pdf_hash frontmatter to legacy analysis docs lacking it (dry-run unless --write; additive, skips docs that already have frontmatter).
profile-edges builds the profile→REF edge graph (first-class adjacency; reconciled against the citation graph so only edges to existing REFs are kept).
profile-similar embeds person profiles (text-embedding; opt-in @xenova/transformers) → nearest researchers (--entity) or collaboration link-prediction (--predict-collabs).
vision-extract transcribes scanned page PNGs → per-page + combined Markdown via a provider-neutral vision adapter (codex | command template), resumable with retry/validation; --rasterize PDF first renders pages via pdftoppm.
`;

function radarInit(root: string, args: string[]): void {
  const write = hasFlag(args, '--write');
  const cadence = flagValue(args, '--cadence');
  const cluster = flagValue(args, '--cluster');
  if (hasFlag(args, '--all-missing')) {
    const results = radarInitMissing(root, { cadence, cluster, write });
    console.log(`Refs missing radars: ${results.length}`);
    for (const r of results) console.log('  ' + r.message);
    return;
  }
  const ref = flagValue(args, '--ref');
  if (!ref) throw new Error('radar-init requires --ref <REF-XXX> or --all-missing');
  console.log(scaffoldRadar(root, ref, { cadence, cluster, write }).message);
}

function radarStatus(root: string, args: string[]): void {
  const staleOnly = hasFlag(args, '--stale-only');
  const format = (flagValue(args, '--format') ?? 'table') as RadarStatusFormat;
  if (!['table', 'csv', 'list'].includes(format)) {
    throw new Error(`radar-status: invalid --format '${format}' (table|csv|list)`);
  }
  const content = renderRadarStatus(radarStatusRows(root, { staleOnly }), format);
  emit(content, flagValue(args, '--out'), root);
}

function radarReport(root: string, args: string[]): void {
  const content = renderRadarReport(root, { cluster: flagValue(args, '--cluster') });
  emit(content, flagValue(args, '--out'), root);
}

function profileStatus(root: string, args: string[]): void {
  const staleOnly = hasFlag(args, '--stale-only');
  const format = (flagValue(args, '--format') ?? 'table') as ProfileStatusFormat;
  if (!['table', 'csv', 'list'].includes(format)) {
    throw new Error(`profile-status: invalid --format '${format}' (table|csv|list)`);
  }
  const content = renderProfileStatus(profileStatusRows(root, { staleOnly }), format);
  emit(content, flagValue(args, '--out'), root);
}

function profileGenerate(root: string, args: string[]): void {
  const write = hasFlag(args, '--write');
  if (hasFlag(args, '--fm')) {
    const results = generateFmProfiles(root, { write });
    console.log(`FM profiles (from fm-config.yaml): ${results.length}`);
    for (const r of results) console.log('  ' + r.message);
    return;
  }
  const limit = flagValue(args, '--limit');
  const scan = flagValue(args, '--scan');
  const results = generateTier1Profiles(root, {
    write,
    limit: limit ? parseInt(limit, 10) : undefined,
    scan: scan ? parseInt(scan, 10) : undefined,
  });
  console.log(`Tier-1 candidates: ${results.length}`);
  for (const r of results) console.log('  ' + r.message);
}

function curatorInit(root: string, args: string[]): void {
  const handle = flagValue(args, '--handle');
  if (!handle) throw new Error('curator-init requires --handle <@account>');
  const res = scaffoldCurator(root, handle, {
    platform: flagValue(args, '--platform'),
    name: flagValue(args, '--name'),
    cadence: flagValue(args, '--cadence'),
    write: hasFlag(args, '--write'),
  });
  console.log(res.message);
}

function discoveryLog(root: string, args: string[]): void {
  const ref = flagValue(args, '--ref');
  const surface = flagValue(args, '--surface');
  if (!ref || !surface) throw new Error('discovery-log requires --ref <REF-XXX> and --surface <surface>');
  const res = logDiscovery(root, ref, {
    surface,
    via: flagValue(args, '--via'),
    curatorId: flagValue(args, '--curator'),
    date: flagValue(args, '--date'),
    harvestBatch: flagValue(args, '--batch'),
    harvestedBy: flagValue(args, '--by'),
    write: hasFlag(args, '--write'),
  });
  console.log(res.message);
  if (res.status === 'dry-run') {
    console.log('--- discovery block ---');
    console.log(res.block);
  }
}

function profileTemporal(root: string, args: string[]): void {
  const entity = flagValue(args, '--entity');
  if (!entity) throw new Error('profile-temporal requires --entity <PROF-P-x>');
  emit(renderTrajectory(computeTrajectory(root, entity)), flagValue(args, '--out'), root);
}

function sidecarLint(root: string, args: string[]): void {
  if (hasFlag(args, '--orphans')) {
    emit(renderOrphans(findOrphans(root)), flagValue(args, '--out'), root);
    return;
  }
  emit(renderLint(lintSidecars(root)), flagValue(args, '--out'), root);
}

function sidecarRepair(root: string, args: string[]): void {
  const write = hasFlag(args, '--write');
  const authorsOnly = hasFlag(args, '--authors-only');
  const affilOnly = hasFlag(args, '--affiliations-only');
  const authors = affilOnly ? [] : repairAuthors(root, { write });
  const affil = authorsOnly
    ? { normalized: 0, alreadyCanonical: 0, ambiguous: [], errors: [], changes: [] }
    : normalizeAffiliations(root, { write });
  emit(renderRepair(authors, affil, write), flagValue(args, '--out'), root);
}

/** Write to --out (resolved against the corpus root) or print to stdout. */
function emit(content: string, out: string | undefined, root: string): void {
  if (!out) {
    process.stdout.write(content);
    return;
  }
  const outPath = path.isAbsolute(out) ? out : path.join(root, out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, content, 'utf-8');
  console.log(`Wrote ${path.relative(root, outPath)}`);
}

/** Route `aiwg corpus <subcommand> [...args]`. Throws on error (handler maps to exit code). */
export async function corpusMain(args: string[], cwd: string = process.cwd()): Promise<void> {
  const sub = args[0];
  const rest = args.slice(1);
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    process.stdout.write(HELP);
    return;
  }
  const root = await resolveCorpusRoot(cwd);
  switch (sub) {
    case 'radar-init':
      return radarInit(root, rest);
    case 'radar-status':
      return radarStatus(root, rest);
    case 'radar-report':
      return radarReport(root, rest);
    case 'profile-status':
      return profileStatus(root, rest);
    case 'profile-generate':
      return profileGenerate(root, rest);
    case 'curator-status':
      return emit(renderCuratorStatus(curatorRows(root), curatorOrphans(root)), flagValue(rest, '--out'), root);
    case 'curator-init':
      return curatorInit(root, rest);
    case 'discovery-log':
      return discoveryLog(root, rest);
    case 'profile-metrics':
      return emit(renderMetrics(computeMetrics(root), hasFlag(rest, '--papers') ? 'papers' : 'people'), flagValue(rest, '--out'), root);
    case 'profile-temporal':
      return profileTemporal(root, rest);
    case 'profile-communities':
      return emit(renderCommunities(detectCommunities(root)), flagValue(rest, '--out'), root);
    case 'funder-network':
      return emit(renderFunderNetwork(funderRows(root, { scanAcks: hasFlag(rest, '--scan-acks') }), cofundingClusters(root)), flagValue(rest, '--out'), root);
    case 'sidecar-lint':
      return sidecarLint(root, rest);
    case 'sidecar-repair':
      return sidecarRepair(root, rest);
    case 'extract-crossrefs': {
      const refs = flagValue(rest, '--refs')?.split(',').map((s) => s.trim()).filter(Boolean);
      const write = hasFlag(rest, '--write');
      return emit(renderCrossrefs(extractCrossrefs(root, { refs, write }), write), flagValue(rest, '--out'), root);
    }
    case 'citation-backfill': {
      const write = hasFlag(rest, '--write');
      return emit(renderBackfill(backfillCitations(root, { write }), write), flagValue(rest, '--out'), root);
    }
    case 'integrity-scan': {
      const result = scanCorpus(root, { ref: flagValue(rest, '--ref') });
      emit(renderScan(result), flagValue(rest, '--out'), root);
      if (hasFlag(rest, '--quarantine')) {
        const written = writeQuarantineReports(root, result);
        if (written.length) {
          console.log('\nQuarantine reports written:');
          for (const w of written) console.log(`  ${w}`);
        }
      }
      const failOn = flagValue(rest, '--fail-on');
      if (failOn === 'review' || failOn === 'quarantine') {
        if (failsThreshold(result, failOn)) throw new Error(`integrity-scan: REFs reached '${failOn}' threshold`);
      }
      return;
    }
    case 'source-types': {
      const reg = loadSourceTypeRegistry(root);
      if (hasFlag(rest, '--json')) {
        emit(JSON.stringify(reg, null, 2) + '\n', flagValue(rest, '--out'), root);
      } else {
        emit(renderSourceTypes(reg), flagValue(rest, '--out'), root);
      }
      return;
    }
    case 'induction-audit': {
      const startStr = flagValue(rest, '--start');
      const endStr = flagValue(rest, '--end');
      const ref = flagValue(rest, '--ref');
      const results = auditInductions(root, {
        start: startStr ? parseInt(startStr, 10) : undefined,
        end: endStr ? parseInt(endStr, 10) : undefined,
        refs: ref ? [ref] : undefined,
      });
      return emit(renderAudit(results), flagValue(rest, '--out'), root);
    }
    case 'frontmatter-backfill': {
      const write = hasFlag(rest, '--write');
      return emit(renderBackfillFm(backfillFrontmatter(root, { write }), write), flagValue(rest, '--out'), root);
    }
    case 'profile-edges':
      return emit(renderProfileEdges(buildProfileEdges(root)), flagValue(rest, '--out'), root);
    case 'vision-extract': {
      const slug = flagValue(rest, '--slug');
      if (!slug) throw new Error('vision-extract requires --slug <slug>');
      const imageDir = flagValue(rest, '--images') ?? path.join(root, '.aiwg', 'research', 'sources', 'images', slug, 'pages');
      const outDir = flagValue(rest, '--out') ?? path.join(root, '.aiwg', 'research', 'sources', 'text', `${slug}-vision`);
      const pdf = flagValue(rest, '--rasterize');
      if (pdf) {
        const dpi = flagValue(rest, '--dpi') ? parseInt(flagValue(rest, '--dpi')!, 10) : 200;
        const n = rasterizePdf(path.isAbsolute(pdf) ? pdf : path.join(root, pdf), imageDir, dpi);
        console.log(`Rasterized ${n} pages → ${imageDir}`);
      }
      const adapter = resolveAdapter({ provider: flagValue(rest, '--provider'), command: flagValue(rest, '--command') });
      const result = await extractPages({
        imageDir,
        outDir,
        adapter,
        title: flagValue(rest, '--title'),
        start: flagValue(rest, '--start') ? parseInt(flagValue(rest, '--start')!, 10) : undefined,
        end: flagValue(rest, '--end') ? parseInt(flagValue(rest, '--end')!, 10) : undefined,
        retries: flagValue(rest, '--retries') ? parseInt(flagValue(rest, '--retries')!, 10) : undefined,
        model: flagValue(rest, '--model'),
        force: hasFlag(rest, '--force'),
      });
      console.log(renderExtract(result));
      console.log(`  per-page + combined → ${outDir}`);
      return;
    }
    case 'profile-similar': {
      const { buildProfileEmbeddings, profileSimilar, collaborationPredictions, renderSimilar, renderCollabPredictions } = await import('./profile-embed.js');
      const emb = await buildProfileEmbeddings(root);
      if (hasFlag(rest, '--predict-collabs')) {
        const threshold = flagValue(rest, '--threshold') ? parseFloat(flagValue(rest, '--threshold')!) : 0.8;
        return emit(renderCollabPredictions(collaborationPredictions(emb, threshold), threshold), flagValue(rest, '--out'), root);
      }
      const entity = flagValue(rest, '--entity');
      if (!entity) throw new Error('profile-similar requires --entity <PROF-P-x> or --predict-collabs');
      const top = flagValue(rest, '--top') ? parseInt(flagValue(rest, '--top')!, 10) : 10;
      return emit(renderSimilar(entity, profileSimilar(emb, entity, top)), flagValue(rest, '--out'), root);
    }
    default:
      process.stderr.write(`Unknown corpus subcommand: ${sub}\n\n${HELP}`);
      throw new Error(`unknown corpus subcommand: ${sub}`);
  }
}
