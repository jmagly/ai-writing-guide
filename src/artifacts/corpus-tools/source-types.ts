/**
 * Canonical, extensible source-type registry + normalizer (#1509).
 *
 * A research corpus accumulates three drifting type vocabularies — frontmatter
 * `type:` (mixes source type with doc role), `source_type:` (hyphen/underscore
 * drift), and a body "Source Type" field. This module gives one canonical
 * registry and a `normalizeSourceType` that folds all three (plus a venue
 * fallback) into a single source-type dimension.
 *
 * The authoritative runtime default is `DEFAULT_SOURCE_TYPES` below; the
 * human-readable + overridable form ships at
 * `agentic/code/frameworks/research-complete/config/source-types.yaml`
 * (a corpus may override at `documentation/source-types.yaml`). A drift test
 * keeps the YAML and this constant in sync.
 *
 * Consumed by: the `by-source-type` index view, per-type induction audit
 * (#1504), acquisition dispatch (#1507).
 *
 * @source historical: section9 REFERENCE-TEMPLATE*.md per-type rules
 * @tests @test/unit/artifacts/source-types.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';

export interface SourceType {
  description: string;
  aliases: string[];
  template: string;
  requiredSections: string[];
  citationFormat: string;
  acquisition: string;
  storage: string;
  qualityRules: string;
  defaultRadarCadence: string;
}

export interface SourceTypeRegistry {
  version: number;
  types: Record<string, SourceType>;
  /** VENUE_PATTERNS label → canonical type (fallback when frontmatter type is absent/generic). */
  venueFallback: Record<string, string>;
  /** Doc-role values that are NOT source types → normalized to `meta`. */
  metaRoles: string[];
}

const OVERRIDE_FILE = ['documentation', 'source-types.yaml'];

/** Authoritative runtime default registry. Mirrors the framework source-types.yaml. */
export const DEFAULT_SOURCE_TYPES: SourceTypeRegistry = {
  version: 1,
  // VENUE_PATTERNS label → canonical type. Academic conferences/journals → paper;
  // arXiv → preprint; lab/vendor research posts → blog; GitHub/Docs → repo;
  // RFC → standard; Wikipedia → encyclopedia. Used only when frontmatter
  // type/source_type is absent or unmatched.
  venueFallback: {
    NeurIPS: 'paper', ICML: 'paper', ICLR: 'paper', ACL: 'paper', EMNLP: 'paper',
    NAACL: 'paper', CVPR: 'paper', ICCV: 'paper', ECCV: 'paper', AAAI: 'paper',
    IJCAI: 'paper', KDD: 'paper', SIGIR: 'paper', WWW: 'paper', RSS: 'paper',
    CoRL: 'paper', ICRA: 'paper', IROS: 'paper', OSDI: 'paper', SOSP: 'paper',
    NSDI: 'paper', 'USENIX ATC': 'paper', 'USENIX Security': 'paper',
    'IEEE S&P / Oakland': 'paper', CCS: 'paper', CHI: 'paper', UIST: 'paper',
    VLDB: 'paper', SIGMOD: 'paper', FAccT: 'paper', TMLR: 'paper', JMLR: 'paper',
    Nature: 'paper', Science: 'paper', PNAS: 'paper',
    arXiv: 'preprint',
    'RFC (IETF)': 'standard',
    'Anthropic Research': 'blog', 'OpenAI Research': 'blog',
    'DeepMind / Google Research': 'blog', 'Meta AI / FAIR': 'blog',
    'Microsoft Research': 'blog',
    'GitHub / Documentation': 'repo',
    'Blog / Web Article': 'blog',
    Wikipedia: 'encyclopedia',
  },
  metaRoles: ['redirect', 'stub', 'gap-note', 'merged', 'index'],
  types: {
    paper: { description: 'Peer-reviewed conference or journal paper.', aliases: ['paper', 'conference-paper', 'conference_paper', 'conference paper', 'journal_article', 'journal-article', 'journal article', 'reference', 'peer-reviewed'], template: 'reference-academic', requiredSections: ['Citation', 'Summary', 'Key Contributions', 'Benchmark Results', 'Comparison with Related Work'], citationFormat: 'doi-bibtex', acquisition: 'pdf-download', storage: 'sources/pdfs/full', qualityRules: 'peer-review-grade', defaultRadarCadence: 'quarterly' },
    preprint: { description: 'arXiv / preprint server; not yet peer reviewed.', aliases: ['preprint', 'arxiv', 'arxiv-preprint', 'eprint'], template: 'reference-academic', requiredSections: ['Citation', 'Summary', 'Key Contributions', 'Benchmark Results'], citationFormat: 'arxiv-id', acquisition: 'pdf-download', storage: 'sources/pdfs/full', qualityRules: 'preprint-hedged-grade', defaultRadarCadence: 'quarterly' },
    blog: { description: 'Blog post, lab announcement, or vendor research post.', aliases: ['blog', 'blog-post', 'blog post', 'announcement', 'lab-announcement', 'lab announcement', 'vendor-research', 'post'], template: 'reference-web', requiredSections: ['Citation', 'Executive Summary', 'Key Claim', 'Practical Relevance'], citationFormat: 'url-venue-retrieved', acquisition: 'web-snapshot', storage: 'sources/web', qualityRules: 'non-peer-reviewed-hedging', defaultRadarCadence: 'biannual' },
    repo: { description: 'Code repository or benchmark repository.', aliases: ['repo', 'codebase', 'code', 'repository', 'benchmark-repository', 'benchmark-repo', 'benchmark repository', 'github'], template: 'reference-repo', requiredSections: ['Citation', 'Summary', 'Architecture', 'Maintenance Signals'], citationFormat: 'repo-url-commit', acquisition: 'git-clone', storage: 'sources/repos', qualityRules: 'maintenance-activity-signals', defaultRadarCadence: 'on-demand' },
    book: { description: 'Book.', aliases: ['book', 'monograph'], template: 'reference-academic', requiredSections: ['Citation', 'Summary', 'Key Contributions'], citationFormat: 'isbn', acquisition: 'manual', storage: 'sources/pdfs/full', qualityRules: 'editorial-grade', defaultRadarCadence: 'on-demand' },
    chapter: { description: 'Book chapter.', aliases: ['chapter', 'book_chapter', 'book-chapter', 'book chapter'], template: 'reference-academic', requiredSections: ['Citation', 'Summary', 'Key Contributions'], citationFormat: 'isbn-chapter', acquisition: 'manual', storage: 'sources/pdfs/full', qualityRules: 'editorial-grade', defaultRadarCadence: 'on-demand' },
    standard: { description: 'RFC, IETF/ISO/W3C standard, or formal specification.', aliases: ['standard', 'rfc', 'spec', 'specification', 'ietf', 'iso', 'w3c'], template: 'reference-web', requiredSections: ['Citation', 'Summary', 'Scope', 'Key Requirements'], citationFormat: 'standard-id', acquisition: 'web-snapshot', storage: 'sources/web', qualityRules: 'normative-spec', defaultRadarCadence: 'annual' },
    doc: { description: 'Maintainer/vendor documentation, technical report, or report.', aliases: ['doc', 'documentation', 'maintainer-doc', 'vendor-doc', 'technical-report', 'technical report', 'report', 'manual'], template: 'reference-web', requiredSections: ['Citation', 'Summary', 'Practical Relevance'], citationFormat: 'url-venue-retrieved', acquisition: 'web-snapshot', storage: 'sources/web', qualityRules: 'non-peer-reviewed-hedging', defaultRadarCadence: 'biannual' },
    discussion: { description: 'Issue, forum thread, or discussion.', aliases: ['discussion', 'issue', 'thread', 'forum'], template: 'reference-web', requiredSections: ['Citation', 'Summary', 'Key Points'], citationFormat: 'url-venue-retrieved', acquisition: 'web-snapshot', storage: 'sources/web', qualityRules: 'anecdotal-hedging', defaultRadarCadence: 'on-demand' },
    encyclopedia: { description: 'Encyclopedia / reference-work entry (e.g. Wikipedia).', aliases: ['encyclopedia', 'wikipedia', 'wiki'], template: 'reference-web', requiredSections: ['Citation', 'Summary'], citationFormat: 'url-venue-retrieved', acquisition: 'web-snapshot', storage: 'sources/web', qualityRules: 'tertiary-source-hedging', defaultRadarCadence: 'annual' },
    'expert-material': { description: 'Expert commentary, talk, or interview material.', aliases: ['expert-material', 'expert material', 'talk', 'interview', 'keynote'], template: 'reference-media', requiredSections: ['Citation', 'Media Profile', 'Summary', 'Key Timestamps'], citationFormat: 'timestamp-transcript', acquisition: 'manual', storage: 'media/transcripts', qualityRules: 'expert-opinion-hedging', defaultRadarCadence: 'on-demand' },
    video: { description: 'Video, conference recording, course recording, or platform-hosted talk.', aliases: ['video', 'recording', 'webcast', 'livestream', 'stream', 'lecture-video', 'conference-video'], template: 'reference-media', requiredSections: ['Citation', 'Media Profile', 'Summary', 'Key Timestamps', 'Evidence and Transcript Method'], citationFormat: 'timestamp-transcript', acquisition: 'media-curator', storage: 'media/video', qualityRules: 'media-grade', defaultRadarCadence: 'on-demand' },
    audio: { description: 'Audio recording, lecture audio, or direct-hosted audio source.', aliases: ['audio', 'audio-recording', 'lecture-audio', 'recording-audio'], template: 'reference-media', requiredSections: ['Citation', 'Media Profile', 'Summary', 'Key Timestamps', 'Evidence and Transcript Method'], citationFormat: 'timestamp-transcript', acquisition: 'media-curator', storage: 'media/audio', qualityRules: 'media-grade', defaultRadarCadence: 'on-demand' },
    podcast: { description: 'Podcast episode or feed-hosted interview.', aliases: ['podcast', 'podcast-episode', 'episode', 'interview-audio'], template: 'reference-media', requiredSections: ['Citation', 'Media Profile', 'Summary', 'Key Timestamps', 'Evidence and Transcript Method'], citationFormat: 'timestamp-transcript', acquisition: 'media-curator', storage: 'media/audio', qualityRules: 'interview-hedged-grade', defaultRadarCadence: 'on-demand' },
    lecture: { description: 'Institutional lecture, course video, keynote, seminar, or invited talk recording.', aliases: ['lecture', 'course', 'seminar', 'keynote', 'talk', 'invited-talk', 'conference-talk'], template: 'reference-media', requiredSections: ['Citation', 'Media Profile', 'Summary', 'Key Timestamps', 'Evidence and Transcript Method'], citationFormat: 'timestamp-transcript', acquisition: 'media-curator', storage: 'media/video', qualityRules: 'lecture-grade', defaultRadarCadence: 'on-demand' },
    'packet-evidence': { description: 'Governed observational evidence derived from a saved network packet capture.', aliases: ['packet-evidence', 'packet evidence', 'pcap-evidence', 'network-trace', 'network trace'], template: 'reference-packet-evidence', requiredSections: ['Evidence Citation', 'Collection Context', 'Observed Facts', 'Inferences', 'Limitations', 'Provenance'], citationFormat: 'pcap-digest-frame-stream-time', acquisition: 'governed-evidence-bundle', storage: 'sources/evidence', qualityRules: 'observational-evidence-no-grade', defaultRadarCadence: 'on-demand' },
    'internal-review': { description: 'Internal research note or architecture review (not an external source).', aliases: ['internal-review', 'internal-research', 'internal-architecture-review', 'audit'], template: 'reference-internal', requiredSections: ['Summary', 'Findings'], citationFormat: 'internal-ref', acquisition: 'internal', storage: 'documentation/synthesis', qualityRules: 'internal-note', defaultRadarCadence: 'on-demand' },
  },
};

/** Coerce a parsed YAML registry (snake_case fields) into the typed registry. */
function coerceRegistry(raw: any): SourceTypeRegistry | null {
  if (!raw || typeof raw !== 'object' || !raw.types) return null;
  const types: Record<string, SourceType> = {};
  for (const [k, v] of Object.entries(raw.types as Record<string, any>)) {
    types[k] = {
      description: String(v.description ?? ''),
      aliases: (v.aliases ?? []).map(String),
      template: String(v.template ?? ''),
      requiredSections: (v.required_sections ?? v.requiredSections ?? []).map(String),
      citationFormat: String(v.citation_format ?? v.citationFormat ?? ''),
      acquisition: String(v.acquisition ?? ''),
      storage: String(v.storage ?? ''),
      qualityRules: String(v.quality_rules ?? v.qualityRules ?? ''),
      defaultRadarCadence: String(v.default_radar_cadence ?? v.defaultRadarCadence ?? 'on-demand'),
    };
  }
  return {
    version: Number(raw.version ?? 1),
    types,
    venueFallback: (raw.venue_fallback ?? raw.venueFallback ?? {}) as Record<string, string>,
    metaRoles: (raw.meta_roles ?? raw.metaRoles ?? []).map(String),
  };
}

/** Load the registry: corpus override (`documentation/source-types.yaml`) → built-in default. */
export function loadSourceTypeRegistry(corpusRoot: string): SourceTypeRegistry {
  const override = path.join(corpusRoot, ...OVERRIDE_FILE);
  if (fs.existsSync(override)) {
    try {
      const reg = coerceRegistry(loadYaml(fs.readFileSync(override, 'utf-8')));
      if (reg && Object.keys(reg.types).length) return reg;
    } catch {
      /* malformed override → default */
    }
  }
  return DEFAULT_SOURCE_TYPES;
}

/** Build alias → canonical and meta-role lookups for fast normalization. */
function buildLookup(reg: SourceTypeRegistry): { alias: Map<string, string>; meta: Set<string> } {
  const alias = new Map<string, string>();
  for (const [canonical, t] of Object.entries(reg.types)) {
    alias.set(canonical.toLowerCase(), canonical);
    for (const a of t.aliases) alias.set(a.toLowerCase().trim(), canonical);
  }
  return { alias, meta: new Set(reg.metaRoles.map((r) => r.toLowerCase())) };
}

export interface NormalizeInput {
  /** frontmatter `type:` */
  type?: string | null;
  /** frontmatter `source_type:` */
  sourceType?: string | null;
  /** body "Source Type" field */
  bodySourceType?: string | null;
  /** classified venue label (VENUE_PATTERNS) — used as a fallback. */
  venue?: string | null;
}

/**
 * Normalize any of the three drifting type vocabularies (+ venue fallback) to a
 * canonical source type. Returns the canonical key, `'meta'` for doc-role
 * values (redirect/stub/…), or `'other'` when nothing matches.
 */
export function normalizeSourceType(input: NormalizeInput, reg: SourceTypeRegistry = DEFAULT_SOURCE_TYPES): string {
  const { alias, meta } = buildLookup(reg);
  const candidates = [input.sourceType, input.type, input.bodySourceType]
    .map((v) => (v ?? '').toLowerCase().trim())
    .filter(Boolean);
  for (const c of candidates) {
    if (meta.has(c)) return 'meta';
    if (alias.has(c)) return alias.get(c)!;
  }
  // No explicit type matched — try the venue classification fallback.
  if (input.venue && reg.venueFallback[input.venue]) return reg.venueFallback[input.venue];
  return 'other';
}

/** Look up a canonical source type's rules. */
export function getSourceType(canonical: string, reg: SourceTypeRegistry = DEFAULT_SOURCE_TYPES): SourceType | null {
  return reg.types[canonical] ?? null;
}

/** List canonical source-type keys. */
export function listSourceTypes(reg: SourceTypeRegistry = DEFAULT_SOURCE_TYPES): string[] {
  return Object.keys(reg.types).sort();
}

/** Render the registry as a human-readable table. */
export function renderSourceTypes(reg: SourceTypeRegistry): string {
  const out: string[] = [];
  out.push(`Source-type registry (v${reg.version}) — ${Object.keys(reg.types).length} canonical types`);
  out.push('');
  out.push(`${'type'.padEnd(16)} ${'template'.padEnd(20)} ${'acquisition'.padEnd(14)} ${'cadence'.padEnd(10)} aliases`);
  for (const key of listSourceTypes(reg)) {
    const t = reg.types[key];
    out.push(`${key.padEnd(16)} ${t.template.padEnd(20)} ${t.acquisition.padEnd(14)} ${t.defaultRadarCadence.padEnd(10)} ${t.aliases.slice(0, 4).join(', ')}${t.aliases.length > 4 ? ', …' : ''}`);
  }
  out.push('');
  out.push(`meta roles (not source types): ${reg.metaRoles.join(', ')}`);
  return out.join('\n') + '\n';
}
