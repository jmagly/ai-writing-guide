/**
 * Research-corpus markdown-view renderers (#1490).
 *
 * TypeScript port of build.py's 12 renderers. Output is byte-identical to the
 * Python source (modulo the volatile `Generated:` line). Trailing-newline and
 * `.rstrip()` behavior is preserved per-renderer because the golden fixtures
 * diff exactly.
 *
 * @source historical: corpus-index-build/build.py
 */

import * as path from 'path';
import { PIPELINE_STAGES, SIZE_TIERS } from './taxonomies.js';
import { type RefRecord, compareRefId, refSortKey, normalizeAuthor, loadProfileSlugs } from './ref-parser.js';
import { computeStaleness } from './corpus-config.js';

export interface RenderContext {
  records: RefRecord[];
  corpusRoot: string;
  generated: string;
  checksum: string;
}

function header(title: string, ctx: RenderContext, count: number): string[] {
  return [
    `# ${title}`,
    '',
    `Generated: ${ctx.generated}`,
    `Sources: ${count} references`,
    `Source-Checksum: sha256:${ctx.checksum}`,
    '',
  ];
}

function refLink(r: RefRecord): string {
  return `**${r.refId}** — ${r.title}`;
}

/** Stable multi-key sort. Each key fn returns a comparable (number or string); arrays compared element-wise. */
function sortByKeys<T>(arr: T[], keyFn: (item: T) => Array<number | string | boolean>): T[] {
  return [...arr].sort((a, b) => {
    const ka = keyFn(a), kb = keyFn(b);
    for (let i = 0; i < ka.length; i++) {
      const x = ka[i], y = kb[i];
      if (x < y) return -1;
      if (x > y) return 1;
    }
    return 0;
  });
}

function bySortedRefs(records: RefRecord[]): RefRecord[] {
  return [...records].sort((a, b) => compareRefId(a.refId, b.refId));
}

function renderGrouped(title: string, ctx: RenderContext, groups: Map<string, RefRecord[]>, trailingLabel = 'Uncategorized'): string {
  const lines = header(title, ctx, ctx.records.length);
  const names = sortByKeys([...groups.keys()], (n) => [n === trailingLabel, -groups.get(n)!.length, n.toLowerCase()]);
  for (const name of names) {
    const items = bySortedRefs(groups.get(name)!);
    lines.push(`## ${name} (${items.length} papers)`, '');
    for (const r of items) lines.push(`- ${refLink(r)}`);
    lines.push('');
  }
  return lines.join('\n').replace(/\s+$/, '') + '\n';
}

function groupBy(records: RefRecord[], keyFn: (r: RefRecord) => string[]): Map<string, RefRecord[]> {
  const groups = new Map<string, RefRecord[]>();
  for (const r of records) {
    for (const key of keyFn(r)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(r);
    }
  }
  return groups;
}

function renderByYear(ctx: RenderContext): string {
  const groups = groupBy(ctx.records, (r) => [r.year ? String(r.year) : 'Year Unknown']);
  const lines = header('Index: Papers by Year', ctx, ctx.records.length);
  const years = sortByKeys([...groups.keys()], (y) => [y === 'Year Unknown' ? -1 : -parseInt(y, 10), y]);
  for (const year of years) {
    const items = bySortedRefs(groups.get(year)!);
    lines.push(`## ${year} (${items.length} papers)`, '');
    for (const r of items) lines.push(`- ${refLink(r)}`);
    lines.push('');
  }
  return lines.join('\n').replace(/\s+$/, '') + '\n';
}

function renderAuthors(ctx: RenderContext): string {
  const groups = groupBy(ctx.records, (r) => (r.authors.length ? r.authors : ['(no authors listed)']).map(normalizeAuthor));
  const lines = header('Index: Papers by Author', ctx, ctx.records.length);
  lines.push('Sorted alphabetically by normalized author name.', '');
  for (const author of [...groups.keys()].sort((a, b) => (a.toLowerCase() < b.toLowerCase() ? -1 : a.toLowerCase() > b.toLowerCase() ? 1 : 0))) {
    const items = bySortedRefs(groups.get(author)!);
    if (items.length === 1) {
      lines.push(`- **${author}** — ${items[0].refId}: ${items[0].title}`);
    } else {
      lines.push(`- **${author}** (${items.length} papers)`);
      for (const r of items) lines.push(`  - ${r.refId}: ${r.title}`);
    }
  }
  return lines.join('\n').replace(/\s+$/, '') + '\n';
}

function authorSlug(author: string): string {
  return author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').replace(/- /g, '-');
}

function renderEntityAuthors(ctx: RenderContext): string {
  const profiles = loadProfileSlugs(ctx.corpusRoot);
  const counts = groupBy(ctx.records, (r) => (r.authors.length ? r.authors : ['(no authors listed)']).map(normalizeAuthor));
  const lines = header('Authors Index (Enriched)', ctx, ctx.records.length);
  lines.push('| Author | Papers | Top Hub Authored | Profile | REFs |', '|---|---:|---|---|---|');
  const entries = sortByKeys([...counts.entries()], ([author, items]) => [-items.length, author.toLowerCase()]);
  for (const [author, items] of entries) {
    const refs = [...new Set(items.map((r) => r.refId))].sort(compareRefId);
    const top = items.reduce<RefRecord | null>((best, r) => (best === null || r.incoming.size > best.incoming.size ? r : best), null);
    const slug = authorSlug(author);
    const profile = profiles.has(slug) ? `[PROF-P-${slug}](../documentation/profiles/people/PROF-P-${slug}.md)` : '-';
    const refsCol = `${refs.slice(0, 12).join(', ')}${refs.length > 12 ? '...' : ''}`;
    lines.push(`| ${author} | ${refs.length} | ${top ? top.refId : '-'} (${top ? top.incoming.size : 0}) | ${profile} | ${refsCol} |`);
  }
  return lines.join('\n') + '\n';
}

/** Stable count of values, preserving first-seen order (mirrors Counter.most_common tie behavior). */
function topCounted(values: string[], n: number): string[] {
  const counts = new Map<string, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return sortByKeys([...counts.keys()], (k) => [-counts.get(k)!]).slice(0, n);
}

function renderOrgs(ctx: RenderContext): string {
  const groups = new Map<string, RefRecord[]>();
  const orgAuthors = new Map<string, string[]>();
  for (const r of ctx.records) {
    const org = r.primaryAffiliation || '(no affiliation listed)';
    if (!groups.has(org)) { groups.set(org, []); orgAuthors.set(org, []); }
    groups.get(org)!.push(r);
    for (const a of r.authors.slice(0, 3)) orgAuthors.get(org)!.push(normalizeAuthor(a));
  }
  const lines = header('Affiliations Index', ctx, ctx.records.length);
  lines.push('| Affiliation | Papers | Top Authors | REFs |', '|---|---:|---|---|');
  const entries = sortByKeys([...groups.entries()], ([org, items]) => [-items.length, org.toLowerCase()]);
  for (const [org, items] of entries) {
    const refs = [...new Set(items.map((r) => r.refId))].sort(compareRefId);
    const topAuthors = topCounted(orgAuthors.get(org)!, 3).join(', ') || '-';
    const refsCol = `${refs.slice(0, 12).join(', ')}${refs.length > 12 ? '...' : ''}`;
    lines.push(`| ${org} | ${refs.length} | ${topAuthors} | ${refsCol} |`);
  }
  return lines.join('\n') + '\n';
}

function renderBridges(ctx: RenderContext): string {
  const authorOrgs = new Map<string, Set<string>>();
  const authorRefs = new Map<string, Set<string>>();
  for (const r of ctx.records) {
    for (const a of r.authors) {
      const norm = normalizeAuthor(a);
      if (!authorOrgs.has(norm)) { authorOrgs.set(norm, new Set()); authorRefs.set(norm, new Set()); }
      if (r.primaryAffiliation) authorOrgs.get(norm)!.add(r.primaryAffiliation);
      authorRefs.get(norm)!.add(r.refId);
    }
  }
  const lines = header('Bridge Authors', ctx, ctx.records.length);
  lines.push('Authors whose corpus papers span two or more distinct affiliations.', '', '| Author | Affiliations | Papers | REFs |', '|---|---:|---:|---|');
  const rows = [...authorOrgs.entries()].filter(([, orgs]) => orgs.size >= 2).map(([a, orgs]) => ({ a, orgs, refs: authorRefs.get(a)! }));
  const sorted = sortByKeys(rows, (row) => [-row.orgs.size, -row.refs.size, row.a.toLowerCase()]);
  for (const { a, orgs, refs } of sorted) {
    const sortedRefs = [...refs].sort(compareRefId);
    const refsCol = `${sortedRefs.slice(0, 12).join(', ')}${sortedRefs.length > 12 ? '...' : ''}`;
    lines.push(`| ${a} | ${orgs.size} | ${refs.size} | ${refsCol} |`);
  }
  return lines.join('\n') + '\n';
}

function renderUnprofiledHubs(ctx: RenderContext): string {
  const profileSlugs = loadProfileSlugs(ctx.corpusRoot);
  const lines = header('Unprofiled Top Hubs', ctx, ctx.records.length);
  lines.push('Top in-degree REFs whose primary author does not appear to have a PROF-P profile.', '', '| REF | In-deg | Primary Author | Title |', '|---|---:|---|---|');
  const sorted = sortByKeys(ctx.records, (r) => [-r.incoming.size, ...refSortKey(r.refId)]);
  let emitted = 0;
  for (const r of sorted) {
    if (!r.authors.length) continue;
    const author = normalizeAuthor(r.authors[0]);
    const slug = author.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
    if (profileSlugs.has(slug)) continue;
    lines.push(`| ${r.refId} | ${r.incoming.size} | ${author} | ${r.title.slice(0, 80)} |`);
    if (++emitted >= 50) break;
  }
  return lines.join('\n') + '\n';
}

function renderCitationNetwork(ctx: RenderContext): string {
  const nodes = ctx.records.length;
  const edges = ctx.records.reduce((sum, r) => sum + r.outgoing.size, 0);
  const lines = header('Citation Network', ctx, nodes);
  const density = nodes > 1 ? edges / (nodes * (nodes - 1)) : 0;
  lines.push(`Nodes: ${nodes} | Edges: ${edges} | Density: ${density.toFixed(4)}`, '', '## Top Hubs', '', '| REF | Title | In | Out | Total |', '|---|---|---:|---:|---:|');
  const hubs = sortByKeys(ctx.records, (r) => [-(r.incoming.size + r.outgoing.size), ...refSortKey(r.refId)]).slice(0, 25);
  for (const r of hubs) {
    lines.push(`| ${r.refId} | ${r.title.slice(0, 80)} | ${r.incoming.size} | ${r.outgoing.size} | ${r.incoming.size + r.outgoing.size} |`);
  }
  const isolated = ctx.records.filter((r) => !r.incoming.size && !r.outgoing.size);
  lines.push('', `## Isolated Nodes (${isolated.length})`, '', '| REF | Title |', '|---|---|');
  for (const r of bySortedRefs(isolated).slice(0, 200)) {
    lines.push(`| ${r.refId} | ${r.title.slice(0, 100)} |`);
  }
  return lines.join('\n') + '\n';
}

function renderModelSize(ctx: RenderContext): string {
  const groups = groupBy(ctx.records, (r) => [r.sizeTier || 'Not Applicable / No Extractable Size']);
  const lines = header('Index: Papers by Model Size', ctx, ctx.records.length);
  const tierOrder = [...SIZE_TIERS.map((t) => t[0]), 'Not Applicable / No Extractable Size'];
  for (const tier of tierOrder) {
    const items = groups.get(tier);
    if (!items) continue;
    lines.push(`## ${tier} (${items.length} papers)`, '');
    const sorted = sortByKeys(items, (r) => [-(r.paramsM ?? 0), ...refSortKey(r.refId)]);
    for (const r of sorted) {
      const size = r.paramsM && r.paramsM >= 1000 ? ` [${(r.paramsM / 1000).toFixed(1)}B]` : r.paramsM ? ` [${Math.round(r.paramsM)}M]` : '';
      lines.push(`- **${r.refId}**${size} — ${r.title}`);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\s+$/, '') + '\n';
}

function renderPipeline(ctx: RenderContext): string {
  const available = new Set(ctx.records.map((r) => r.refId));
  const lines = header('Index: Training Pipeline Reading Order', ctx, ctx.records.length);
  lines.push('Stages move from data preparation through training, alignment, deployment, and monitoring.', '');
  for (const [title, blurb, refs] of PIPELINE_STAGES) {
    lines.push(`## ${title}`, '', `_${blurb}_`, '');
    for (const ref of refs) {
      lines.push(`- **${ref}${available.has(ref) ? '' : ' (not in corpus)'}**`);
    }
    lines.push('');
  }
  return lines.join('\n').replace(/\s+$/, '') + '\n';
}

// ── Radar / discovery / funder views (#1492) ──────────────────────────────
// Cadence → window math lives in corpus-config.ts (the one staleness helper, #1498/#1502).

/** GRADE display order; unknown grades fall after, 'Ungraded' last. */
const GRADE_ORDER = ['A', 'A-', 'B', 'B-', 'C', 'C-', 'D'];

/** Papers grouped by current GRADE (radar `grade-current`); no-radar → Ungraded. (#1492) */
function renderByGrade(ctx: RenderContext): string {
  const groups = groupBy(ctx.records, (r) => [r.radar?.gradeCurrent || 'Ungraded']);
  const lines = header('Index: Papers by GRADE', ctx, ctx.records.length);
  const names = [...groups.keys()].sort((a, b) => {
    if (a === 'Ungraded') return 1;
    if (b === 'Ungraded') return -1;
    const ia = GRADE_ORDER.indexOf(a);
    const ib = GRADE_ORDER.indexOf(b);
    const ra = ia === -1 ? GRADE_ORDER.length : ia;
    const rb = ib === -1 ? GRADE_ORDER.length : ib;
    return ra !== rb ? ra - rb : a < b ? -1 : a > b ? 1 : 0;
  });
  for (const name of names) {
    const items = bySortedRefs(groups.get(name)!);
    lines.push(`## ${name} (${items.length} papers)`, '');
    for (const r of items) lines.push(`- ${refLink(r)}`);
    lines.push('');
  }
  return lines.join('\n').replace(/\s+$/, '') + '\n';
}

/** Radar-tracked papers ranked by overdue-ness (cadence window vs last-refreshed). (#1492) */
function renderStaleQueue(ctx: RenderContext): string {
  const today = new Date(`${ctx.generated.slice(0, 10)}T00:00:00Z`);
  interface Row { r: RefRecord; cadence: string; last: string; overdue: number; }
  const rows: Row[] = [];
  for (const r of ctx.records) {
    const rad = r.radar;
    if (!rad || !rad.refreshCadence || !rad.lastRefreshed) continue;
    const { overdueDays } = computeStaleness(rad.refreshCadence, rad.lastRefreshed, today);
    if (overdueDays === null) continue; // on-demand / unknown cadence / unparseable date → not queued
    rows.push({ r, cadence: rad.refreshCadence, last: rad.lastRefreshed, overdue: overdueDays });
  }
  const sorted = sortByKeys(rows, (row) => [-row.overdue, ...refSortKey(row.r.refId)]);
  const staleCount = sorted.filter((x) => x.overdue > 0).length;
  const lines = header('Index: Radar Stale-Refresh Queue', ctx, ctx.records.length);
  lines.push(
    `Overdue = days since last refresh minus the cadence window. ${staleCount} of ${rows.length} radar-tracked papers are overdue.`,
    '',
    '| REF | Title | GRADE | Cadence | Last Refreshed | Overdue (days) | Stale |',
    '|---|---|---|---|---|---:|---|',
  );
  for (const { r, cadence, last, overdue } of sorted) {
    lines.push(`| ${r.refId} | ${r.title.slice(0, 70)} | ${r.radar!.gradeCurrent ?? '—'} | ${cadence} | ${last} | ${overdue} | ${overdue > 0 ? 'yes' : 'no'} |`);
  }
  return lines.join('\n') + '\n';
}

/** Supported renderer names — `name` in the index.graphs.indices.manifest selects one of these. */
export const SUPPORTED_VIEWS = [
  'by-year', 'by-topic', 'authors', 'by-venue', 'by-method', 'by-model-size',
  'training-pipeline', 'citation-network', 'by-author', 'by-org', 'by-bridge', 'unprofiled-hubs',
  // radar / discovery / funder views (#1492)
  'by-grade', 'radar-stale-queue', 'by-trajectory', 'by-source', 'by-curator', 'by-funder',
] as const;

export type ViewName = (typeof SUPPORTED_VIEWS)[number];

/** Render one named view. Throws on an unsupported name (mirrors build.py build_graph). */
export function renderView(name: string, ctx: RenderContext): string {
  switch (name) {
    case 'by-year': return renderByYear(ctx);
    case 'by-topic': return renderGrouped('Index: Papers by Topic', ctx, groupBy(ctx.records, (r) => r.topics));
    case 'authors': return renderAuthors(ctx);
    case 'by-venue': return renderGrouped('Index: Papers by Venue', ctx, groupBy(ctx.records, (r) => [r.venue || 'Unmatched']));
    case 'by-method': return renderGrouped('Index: Papers by Method', ctx, groupBy(ctx.records, (r) => r.methods));
    case 'by-model-size': return renderModelSize(ctx);
    case 'training-pipeline': return renderPipeline(ctx);
    case 'citation-network': return renderCitationNetwork(ctx);
    case 'by-author': return renderEntityAuthors(ctx);
    case 'by-org': return renderOrgs(ctx);
    case 'by-bridge': return renderBridges(ctx);
    case 'unprofiled-hubs': return renderUnprofiledHubs(ctx);
    // Radar / discovery / funder views (#1492)
    case 'by-grade': return renderByGrade(ctx);
    case 'radar-stale-queue': return renderStaleQueue(ctx);
    case 'by-trajectory': return renderGrouped('Index: Papers by GRADE Trajectory', ctx, groupBy(ctx.records, (r) => [r.radar?.gradeTrajectory || 'unknown']), 'unknown');
    case 'by-source': return renderGrouped('Index: Papers by Discovery Surface', ctx, groupBy(ctx.records, (r) => [r.discovery?.surface || 'unknown-surface']), 'unknown-surface');
    case 'by-curator': return renderGrouped('Index: Papers by Curator', ctx, groupBy(ctx.records, (r) => [r.discovery?.curatorId || 'no-curator']), 'no-curator');
    case 'by-funder': return renderGrouped('Index: Papers by Funder', ctx, groupBy(ctx.records, (r) => (r.funders.length ? r.funders.map((f) => f.id) : ['unfunded'])), 'unfunded');
    default: throw new Error(`unsupported graph: ${name}`);
  }
}

/** Default output path for a view: entry.output or indices/<name>.md. */
export function outputForView(name: string, output: string | undefined): string {
  return output ? output : path.join('indices', `${name}.md`);
}
