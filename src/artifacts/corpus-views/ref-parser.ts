/**
 * Research-corpus REF parser (#1490).
 *
 * TypeScript port of build.py's RefRecord parsing: scans
 * `documentation/references/REF-*.md` + `documentation/citations/REF-*-citations.md`,
 * parses frontmatter, and extracts/classifies the fields the markdown-view
 * renderers consume. Faithful to the Python source so output is byte-identical
 * (modulo the volatile `Generated:` timestamp).
 *
 * @source historical: corpus-index-build/build.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
import { load as loadYaml } from 'js-yaml';
import {
  TOPIC_PATTERNS, METHOD_PATTERNS, VENUE_PATTERNS, SIZE_PATTERNS, SIZE_TIERS,
  classifyFirst, classifyMany,
} from './taxonomies.js';
import { normalizeSourceType, loadSourceTypeRegistry } from '../corpus-tools/source-types.js';

const REF_FILE_RE = /^REF-(\d{3,4}[a-z]?)-/;
const REF_ID_RE = /REF-\d{3,4}[a-z]?/g;
const YEAR_RE = /\b(?:19|20)(\d{2})\b/;

export interface RefRecord {
  refId: string;
  /** Canonical source type (#1509): paper/preprint/blog/repo/… (or meta/other). */
  sourceType: string;
  title: string;
  path: string;
  year: number | null;
  authors: string[];
  affiliations: string[];
  primaryAffiliation: string | null;
  venue: string | null;
  topics: string[];
  methods: string[];
  sizeTier: string | null;
  paramsM: number | null;
  incoming: Set<string>;
  outgoing: Set<string>;
  /** Radar/freshness sidecar (documentation/radar/REF-NNN-radar.md), or null. (#1497) */
  radar: RadarMeta | null;
  /** Discovery/source-tracking block from the citation sidecar, or null. (#1497) */
  discovery: DiscoveryMeta | null;
  /** Funder linkage from the citation sidecar `funders[]`. (#1497) */
  funders: FunderRef[];
}

/** Radar freshness-sidecar metadata (documentation/radar/REF-NNN-radar.md). */
export interface RadarMeta {
  gradeCurrent: string | null;
  gradeOriginal: string | null;
  gradeTrajectory: string | null;
  /** Enum word: monthly | quarterly | biannual | annual | on-demand. */
  refreshCadence: string | null;
  /** ISO date (YYYY-MM-DD). */
  lastRefreshed: string | null;
  cluster: string | null;
  sourcesSearched: string[];
}

/** Discovery/source-tracking block (citation sidecar `discovery:`). */
export interface DiscoveryMeta {
  date: string | null;
  /** Vocab: x-search | x-account | rss | web | newsletter | referral | direct | … */
  surface: string | null;
  via: string | null;
  /** PROF-S backlink, or null. */
  curatorId: string | null;
  harvestBatch: string | null;
  harvestedBy: string | null;
}

/** Funder linkage entry (citation sidecar `funders[]`). */
export interface FunderRef {
  /** PROF-F slug or raw funder name. */
  id: string;
  grantId: string | null;
}

export interface CorpusParse {
  records: RefRecord[];
  corpusRoot: string;
  checksum: string;
}

/** Sort key for REF ids: [numeric, alpha-suffix]. Mirrors build.py ref_sort_key. */
export function refSortKey(refId: string): [number, string] {
  const m = refId.match(/REF-(\d+)([a-z]?)/);
  return m ? [parseInt(m[1], 10), m[2]] : [999999, refId];
}

/** Compare two REF ids by (numeric, suffix). */
export function compareRefId(a: string, b: string): number {
  const [an, as_] = refSortKey(a);
  const [bn, bs] = refSortKey(b);
  return an !== bn ? an - bn : as_ < bs ? -1 : as_ > bs ? 1 : 0;
}

/** Title-case matching Python str.title(): cap first letter of each alpha run, lowercase the rest. */
export function slugToTitle(value: string): string {
  return value.replace(/-/g, ' ').replace(/_/g, ' ').replace(/[A-Za-z]+/g, (w) => w[0].toUpperCase() + w.slice(1).toLowerCase());
}

/** Normalize an author name to "Last, First" form. Mirrors build.py normalize_author. */
export function normalizeAuthor(name: string): string {
  let n = name.trim().replace(/^[.,]+|[.,]+$/g, '').trim();
  if (!n || n.includes(',')) return n;
  const parts = n.split(/\s+/);
  return parts.length === 1 ? n : `${parts[parts.length - 1]}, ${parts.slice(0, -1).join(' ')}`;
}

export function parseFrontmatter(text: string): Record<string, unknown> {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  if (!m) return {};
  try {
    const loaded = loadYaml(m[1]);
    return loaded && typeof loaded === 'object' && !Array.isArray(loaded) ? (loaded as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function extractRefId(filename: string): string | null {
  const m = filename.match(REF_FILE_RE);
  return m ? `REF-${m[1]}` : null;
}

function extractTitle(text: string, fm: Record<string, unknown>): string {
  if (typeof fm.title === 'string') return fm.title.trim().replace(/^"|"$/g, '');
  let m = text.match(/^# REF-[\w-]+[:\s]*(.+?)$/m);
  if (m) return m[1].trim();
  m = text.match(/^# (.+?)$/m);
  return m ? m[1].trim() : '(untitled)';
}

function citationSection(text: string): string | null {
  const m = text.match(/## (?:1\.\s*)?Citation\s*\n+([\s\S]*?)(?:\n##|$)/);
  return m ? m[1] : null;
}

function toInt(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return parseInt(value.trim(), 10);
  return null;
}

function extractYear(text: string, fm: Record<string, unknown>, citation: Record<string, unknown>): number | null {
  for (const source of [fm, citation]) {
    const v = toInt(source.year);
    if (v !== null) return v;
  }
  const cit = citationSection(text);
  const haystack = cit ?? text.slice(0, 4000);
  const paren = haystack.match(/\((\d{4})\)/);
  if (paren) return parseInt(paren[1], 10);
  const ym = haystack.match(YEAR_RE);
  // YEAR_RE captures the last two digits; reconstruct the 4-digit year from the full match.
  if (ym) return parseInt(ym[0], 10);
  return null;
}

function extractAuthors(text: string, fm: Record<string, unknown>, citation: Record<string, unknown>): string[] {
  for (const source of [citation, fm]) {
    const authors = source.authors;
    if (Array.isArray(authors)) {
      const names: string[] = [];
      for (const a of authors) {
        if (a && typeof a === 'object' && 'name' in a && (a as Record<string, unknown>).name) {
          names.push(String((a as Record<string, unknown>).name).trim());
        } else if (typeof a === 'string') {
          names.push(a.trim());
        }
      }
      if (names.length) return names;
    }
  }
  const cit = citationSection(text);
  if (!cit) return [];
  const m = cit.match(/^([\s\S]*?)\s*\(\d{4}\)/);
  if (!m) return [];
  const head = m[1].trim().replace(/,$/, '');
  return head
    .split(/,\s+&\s+|,\s+and\s+|\s+&\s+|\s+and\s+|,\s+(?=[A-Z])/)
    .map((p) => p.trim().replace(/,$/, ''))
    .filter((p) => p && p.length < 100);
}

function extractAffiliations(citation: Record<string, unknown>): { affiliations: string[]; primary: string | null } {
  const affiliations: string[] = [];
  const authors = citation.authors;
  if (Array.isArray(authors)) {
    for (const a of authors) {
      if (a && typeof a === 'object' && (a as Record<string, unknown>).affiliation) {
        affiliations.push(String((a as Record<string, unknown>).affiliation).trim());
      }
    }
  }
  const primaryRaw = citation['affiliation-primary'];
  if (primaryRaw) affiliations.unshift(String(primaryRaw).trim());
  const deduped = [...new Set(affiliations.filter(Boolean))];
  const primary = primaryRaw ? String(primaryRaw).trim() : deduped[0] ?? null;
  return { affiliations: deduped, primary };
}

function extractParams(text: string): { tier: string | null; paramsM: number | null } {
  const slice = text.slice(0, 6000);
  const candidates: number[] = [];
  for (const [pattern, mult] of SIZE_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of slice.matchAll(pattern)) {
      const v = parseFloat(match[1]) * mult;
      if (Number.isFinite(v) && v >= 0.1 && v <= 10_000_000) candidates.push(v);
    }
  }
  if (!candidates.length) return { tier: null, paramsM: null };
  const paramsM = Math.max(...candidates);
  for (const [label, low, high] of SIZE_TIERS) {
    if (paramsM >= low && paramsM <= high) return { tier: label, paramsM };
  }
  return { tier: null, paramsM };
}

function parseCitationEdges(text: string): { outgoing: Set<string>; incoming: Set<string> } {
  const outgoing = new Set<string>();
  const incoming = new Set<string>();
  let section: 'out' | 'in' | null = null;
  for (const line of text.split('\n')) {
    const low = line.toLowerCase();
    if (low.startsWith('## outgoing') || low.includes('out-going')) { section = 'out'; continue; }
    if (low.startsWith('## incoming')) { section = 'in'; continue; }
    if (line.startsWith('## ')) section = null;
    if (section && line.includes('|')) {
      const ids = line.match(REF_ID_RE);
      if (ids) for (const id of ids) (section === 'out' ? outgoing : incoming).add(id);
    }
  }
  return { outgoing, incoming };
}

function asStr(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  // js-yaml parses bare ISO dates (e.g. `last-refreshed: 2026-04-22`) as Date objects.
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return null;
}

function asStrList(v: unknown): string[] {
  return Array.isArray(v) ? v.map((x) => String(x).trim()).filter(Boolean) : [];
}

/** Read + parse the radar sidecar for a REF (documentation/radar/REF-NNN-radar.md), or null when absent. (#1497) */
export function extractRadar(root: string, refId: string): RadarMeta | null {
  const p = path.join(root, 'documentation', 'radar', `${refId}-radar.md`);
  if (!fs.existsSync(p)) return null;
  const fm = parseFrontmatter(fs.readFileSync(p, 'utf-8'));
  return {
    gradeCurrent: asStr(fm['grade-current']),
    gradeOriginal: asStr(fm['grade-original']),
    gradeTrajectory: asStr(fm['grade-trajectory']),
    refreshCadence: asStr(fm['refresh-cadence']),
    lastRefreshed: asStr(fm['last-refreshed']),
    cluster: asStr(fm['cluster']),
    sourcesSearched: asStrList(fm['sources-searched']),
  };
}

/** Extract the discovery/source-tracking block from parsed citation frontmatter. (#1497) */
export function extractDiscovery(citation: Record<string, unknown>): DiscoveryMeta | null {
  const d = citation.discovery;
  if (!d || typeof d !== 'object' || Array.isArray(d)) return null;
  const o = d as Record<string, unknown>;
  return {
    date: asStr(o.date),
    surface: asStr(o.surface),
    via: asStr(o.via),
    curatorId: asStr(o['curator-id']),
    harvestBatch: asStr(o['harvest-batch']),
    harvestedBy: asStr(o['harvested-by']),
  };
}

/** Extract funder linkage from parsed citation frontmatter `funders[]`. (#1497) */
export function extractFunders(citation: Record<string, unknown>): FunderRef[] {
  const f = citation.funders;
  if (!Array.isArray(f)) return [];
  const out: FunderRef[] = [];
  for (const entry of f) {
    if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
      const o = entry as Record<string, unknown>;
      const id = asStr(o.id);
      if (id) out.push({ id, grantId: asStr(o['grant-id']) });
    } else if (typeof entry === 'string' && entry.trim()) {
      out.push({ id: entry.trim(), grantId: null });
    }
  }
  return out;
}

/** Scan a research corpus and parse all REF records. Mirrors build.py load_refs + checksum_sources. */
export function loadCorpus(root: string): CorpusParse {
  const refsDir = path.join(root, 'documentation', 'references');
  const citesDir = path.join(root, 'documentation', 'citations');
  const records: RefRecord[] = [];
  const srcTypeReg = loadSourceTypeRegistry(root); // #1509 source-type registry (corpus override → default)

  const refFiles = listRefMarkdown(refsDir);
  for (const filePath of refFiles) {
    const refId = extractRefId(path.basename(filePath));
    if (!refId) continue;
    const text = fs.readFileSync(filePath, 'utf-8');
    const fm = parseFrontmatter(text);

    const citationPath = path.join(citesDir, `${refId}-citations.md`);
    let citation: Record<string, unknown> = {};
    let outgoing = new Set<string>();
    let incoming = new Set<string>();
    if (fs.existsSync(citationPath)) {
      const citationText = fs.readFileSync(citationPath, 'utf-8');
      citation = parseFrontmatter(citationText);
      ({ outgoing, incoming } = parseCitationEdges(citationText));
    }

    const authors = extractAuthors(text, fm, citation);
    const { affiliations, primary } = extractAffiliations(citation);
    const fmTopics = Array.isArray(fm.topics) ? (fm.topics as unknown[]) : null;
    const haystack = text.slice(0, 6000).toLowerCase();
    const venueRaw = (citation.venue || fm.venue) as string | undefined;
    const venue =
      classifyFirst(`${venueRaw ?? ''} ${text.slice(0, 3500)}`.toLowerCase(), VENUE_PATTERNS) ||
      (venueRaw ? String(venueRaw).trim() : null);
    const { tier, paramsM } = extractParams(text);

    records.push({
      refId,
      sourceType: normalizeSourceType(
        { type: asStr(fm.type), sourceType: asStr(fm.source_type), venue },
        srcTypeReg,
      ),
      title: extractTitle(text, fm),
      path: filePath,
      year: extractYear(text, fm, citation),
      authors,
      affiliations,
      primaryAffiliation: primary,
      venue,
      topics: fmTopics ? fmTopics.map((t) => slugToTitle(String(t))) : [classifyFirst(haystack, TOPIC_PATTERNS) || 'Uncategorized'],
      methods: classifyMany(haystack, METHOD_PATTERNS).length ? classifyMany(haystack, METHOD_PATTERNS) : ['Uncategorized'],
      sizeTier: tier,
      paramsM,
      incoming,
      outgoing,
      radar: extractRadar(root, refId),
      discovery: extractDiscovery(citation),
      funders: extractFunders(citation),
    });
  }

  return { records, corpusRoot: root, checksum: checksumSources(root) };
}

function listRefMarkdown(dir: string): string[] {
  try {
    return fs.readdirSync(dir)
      .filter((f) => /^REF-.*\.md$/.test(f))
      .sort()
      .map((f) => path.join(dir, f));
  } catch {
    return [];
  }
}

/** SHA-256 over sorted REF markdown (relative path bytes + file bytes). Mirrors build.py checksum_sources. */
export function checksumSources(root: string): string {
  const digest = createHash('sha256');
  for (const base of [
    path.join(root, 'documentation', 'references'),
    path.join(root, 'documentation', 'citations'),
    path.join(root, 'documentation', 'radar'),
  ]) {
    let files: string[];
    try {
      files = fs.readdirSync(base).filter((f) => /^REF-.*\.md$/.test(f)).sort();
    } catch {
      continue;
    }
    for (const f of files) {
      const full = path.join(base, f);
      digest.update(path.relative(root, full));
      digest.update(fs.readFileSync(full));
    }
  }
  return digest.digest('hex');
}

/** List PROF-P-* people-profile slugs under the corpus. Used by enriched author renderers. */
export function loadProfileSlugs(corpusRoot: string): Set<string> {
  const dir = path.join(corpusRoot, 'documentation', 'profiles', 'people');
  try {
    return new Set(
      fs.readdirSync(dir)
        .filter((f) => /^PROF-P-.*\.md$/.test(f))
        .map((f) => f.replace(/^PROF-P-/, '').replace(/\.md$/, '')),
    );
  } catch {
    return new Set();
  }
}

/** A parsed entity profile (PROF-{P,O,G,F,S}). */
export interface ProfileRecord {
  profId: string;
  /** person | org | group | funder | source */
  type: string | null;
  name: string | null;
  /** Normalized to REF-id strings regardless of list-of-strings vs list-of-dicts source shape. */
  corpusRefs: string[];
  frontmatter: Record<string, unknown>;
  path: string;
}

const PROFILE_SUBDIRS = ['people', 'orgs', 'groups', 'funders', 'sources'];

/**
 * Load all entity profiles (PROF-{P,O,G,F,S}) from the corpus profiles dirs. (#1497)
 *
 * Tolerates both `corpus-refs` shapes the corpus uses — list-of-strings
 * (`['REF-1']`) and list-of-dicts (`[{ref: 'REF-1', role: 'primary-author'}]`)
 * — normalizing to REF-id strings (the schema-drift flagged in #1501/#1502).
 */
export function loadProfiles(corpusRoot: string): ProfileRecord[] {
  const out: ProfileRecord[] = [];
  for (const sub of PROFILE_SUBDIRS) {
    const dir = path.join(corpusRoot, 'documentation', 'profiles', sub);
    let files: string[];
    try {
      files = fs.readdirSync(dir).filter((f) => /^PROF-[POGFS]-.*\.md$/.test(f)).sort();
    } catch {
      continue;
    }
    for (const f of files) {
      const full = path.join(dir, f);
      const fm = parseFrontmatter(fs.readFileSync(full, 'utf-8'));
      const rawRefs = Array.isArray(fm['corpus-refs']) ? (fm['corpus-refs'] as unknown[]) : [];
      const corpusRefs = rawRefs
        .map((r) => (r && typeof r === 'object' && !Array.isArray(r) ? asStr((r as Record<string, unknown>).ref) : asStr(r)))
        .filter((x): x is string => !!x);
      out.push({
        profId: asStr(fm['prof-id']) ?? f.replace(/\.md$/, ''),
        type: asStr(fm.type),
        name: asStr(fm.name),
        corpusRefs,
        frontmatter: fm,
        path: full,
      });
    }
  }
  return out;
}
