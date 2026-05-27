/**
 * profile-generate-fm — PROF-P (FM authors) + PROF-G (group) profiles (#1502).
 *
 * Port of profiles/build_fm_profiles.py. The hardcoded FM_PAPERS + group_specs
 * dicts are NOT ported — they are corpus-specific data and live in a
 * corpus-local `documentation/profiles/fm-config.yaml` (absent → no-op). Reuses
 * the shared generation context + PROF-P body builder from profile-generate.
 *
 * @source historical: profiles/build_fm_profiles.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';
import { loadGenContext, buildProfileBody, slugifyAuthor, type ProfileGenResult } from './profile-generate.js';

/** Institutional markers excluded from FM PROF-P generation (build_fm_profiles). */
const FM_INST_KEYWORDS = [' team', 'ai @', 'deepseek-ai', 'anthropic', 'openai', 'et al.'];

interface FmPaper {
  model: string;
  topAuthors: number;
  group?: string;
}
interface GroupSpec {
  slug: string;
  name: string;
  parentOrg: string;
  parentSlug?: string;
  refs: string[];
}
export interface FmConfig {
  fmPapers: Map<string, FmPaper>;
  groups: GroupSpec[];
}

/**
 * Load `documentation/profiles/fm-config.yaml` (absent → empty). Shape:
 *   fm-papers:
 *     REF-052: { model: "GPT-3", top-authors: 5 }
 *     REF-835: { model: "Llama 3", group: PROF-G-llama-team }
 *   groups:
 *     PROF-G-llama-team:
 *       name: "Llama Team — AI @ Meta"
 *       parent-org: "Meta AI Research"
 *       parent-slug: PROF-O-meta-fair
 *       refs: [REF-835]
 */
export function loadFmConfig(corpusRoot: string): FmConfig {
  const file = path.join(corpusRoot, 'documentation', 'profiles', 'fm-config.yaml');
  let raw: unknown;
  try {
    raw = loadYaml(fs.readFileSync(file, 'utf-8'));
  } catch {
    return { fmPapers: new Map(), groups: [] };
  }
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};

  const fmPapers = new Map<string, FmPaper>();
  const papers = obj['fm-papers'];
  if (papers && typeof papers === 'object' && !Array.isArray(papers)) {
    for (const [ref, v] of Object.entries(papers as Record<string, unknown>)) {
      const e = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
      fmPapers.set(ref, {
        model: String(e.model ?? ref),
        topAuthors: typeof e['top-authors'] === 'number' ? (e['top-authors'] as number) : 0,
        group: e.group ? String(e.group) : undefined,
      });
    }
  }

  const groups: GroupSpec[] = [];
  const grp = obj['groups'];
  if (grp && typeof grp === 'object' && !Array.isArray(grp)) {
    for (const [slug, v] of Object.entries(grp as Record<string, unknown>)) {
      const e = (v && typeof v === 'object' && !Array.isArray(v) ? v : {}) as Record<string, unknown>;
      groups.push({
        slug,
        name: String(e.name ?? slug),
        parentOrg: String(e['parent-org'] ?? ''),
        parentSlug: e['parent-slug'] ? String(e['parent-slug']) : undefined,
        refs: Array.isArray(e.refs) ? (e.refs as unknown[]).map((r) => String(r)) : [],
      });
    }
  }
  return { fmPapers, groups };
}

function shortTitle(t: string | null | undefined, n = 60): string {
  const s = (t ?? '').replace(/"/g, '').trim();
  return s.length > n ? s.slice(0, n) + '...' : s;
}

/** Build a PROF-G group profile body. Mirrors build_fm_profiles' group block. */
function buildGroupBody(g: GroupSpec, byId: Map<string, { title: string; year: number | null }>, today: string): string {
  const nextDue = new Date(new Date(`${today}T00:00:00Z`).getTime() + 180 * 86_400_000).toISOString().slice(0, 10);
  const yamlRefs = '[' + g.refs.map((r) => `'${r}'`).join(', ') + ']';
  const lines: string[] = [
    '---',
    `prof-id: ${g.slug}`,
    `name: "${g.name}"`,
    'type: group',
    `parent-org: ${g.parentSlug ?? '(no PROF-O entry)'}`,
    `aliases: ["${g.name}"]`,
    `corpus-refs: ${yamlRefs}`,
    'refresh-cadence: semi-annual',
    `last-refreshed: ${today}`,
    'last-refreshed-by: profile-generate-scaffold',
    'grade-influence: A',
    'grade-trajectory: rising',
    'sources-searched: [corpus-citation-sidecars]',
    '---',
    '',
    `# ${g.name} — Entity Profile`,
    '',
    '**Type**: Group (foundation-model release team)',
    `**Profile ID**: \`${g.slug}\``,
    `**Parent organization**: ${g.parentOrg}`,
    `**Last refreshed**: ${today}`,
    `**Next refresh due**: ${nextDue}`,
    '',
    '---',
    '',
    '## 1. Entity Summary',
    '',
    `The ${g.name} is the institutional collective publishing foundation-model release papers under collective authorship rather than under named individuals — typical of large open-weight launches where the contributor list is too large for first-author attribution.`,
    '',
    '**Research Identity**: Foundation-model release team.',
    `**Parent**: ${g.parentOrg}.`,
    '',
    '---',
    '',
    '## 2. Corpus Presence',
    '',
    '| REF | Title | Year |',
    '|---|---|---|',
  ];
  for (const r of g.refs) {
    const rec = byId.get(r);
    lines.push(`| [${r}](../../references/) | ${shortTitle(rec?.title)} | ${rec?.year ?? '—'} |`);
  }
  lines.push(
    '',
    `**Total corpus appearances**: ${g.refs.length}`,
    '',
    '---',
    '',
    '## 3. Notes',
    '',
    '- Group profile for a foundation-model release team. Individual contributors are profiled where corpus presence supports it.',
    '- Generated by `aiwg corpus profile-generate --fm` from `documentation/profiles/fm-config.yaml`.',
    '',
  );
  return lines.join('\n');
}

export interface FmGenOptions {
  today?: string;
  write?: boolean;
}

/** Generate FM-author PROF-P + group PROF-G profiles from fm-config.yaml. */
export function generateFmProfiles(corpusRoot: string, opts: FmGenOptions = {}): ProfileGenResult[] {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const cfg = loadFmConfig(corpusRoot);
  const ctx = loadGenContext(corpusRoot);
  const results: ProfileGenResult[] = [];
  const seen = new Set<string>();

  // PROF-P for unprofiled top-N authors of each FM paper.
  for (const [ref, paper] of cfg.fmPapers) {
    if (paper.topAuthors <= 0) continue;
    const authors = ctx.byId.get(ref)?.authors ?? [];
    for (const a of authors.slice(0, paper.topAuthors)) {
      if (FM_INST_KEYWORDS.some((kw) => a.toLowerCase().includes(kw))) continue;
      const slug = slugifyAuthor(a);
      if (ctx.existing.has(slug) || seen.has(slug)) continue;
      seen.add(slug);
      const refs = [...(ctx.authorRefs.get(a) ?? [])].sort();
      const outRel = path.join('documentation', 'profiles', 'people', `PROF-P-${slug}.md`);
      const content = buildProfileBody(a, slug, refs, ctx.byId, ctx.inDeg, today);
      results.push(emitProfile(corpusRoot, outRel, content, `${a} (top author of ${paper.model})`, opts.write));
    }
  }

  // PROF-G for institutional/team authorship.
  for (const g of cfg.groups) {
    const outRel = path.join('documentation', 'profiles', 'groups', `${g.slug}.md`);
    const content = buildGroupBody(g, ctx.byId, today);
    results.push(emitProfile(corpusRoot, outRel, content, g.name, opts.write));
  }
  return results;
}

/** Write/skip/dry-run a profile; result `slug` is the full prof-id (PROF-P-… / PROF-G-…) from the path. */
function emitProfile(corpusRoot: string, outRel: string, content: string, name: string, write?: boolean): ProfileGenResult {
  const id = path.basename(outRel).replace(/\.md$/, '');
  const outAbs = path.join(corpusRoot, outRel);
  if (!write) return { slug: id, name, status: 'dry-run', message: `DRY-RUN ${id}: ${name}`, outPath: outRel, content };
  if (fs.existsSync(outAbs)) return { slug: id, name, status: 'skip', message: `SKIP ${id} (exists)`, outPath: outRel };
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, content, 'utf-8');
  return { slug: id, name, status: 'wrote', message: `WROTE ${id}: ${name}`, outPath: outRel, content };
}
