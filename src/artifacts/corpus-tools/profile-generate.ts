/**
 * profile-generate — scaffold compact PROF-P profiles for unprofiled hub authors (#1502).
 *
 * Port of profiles/build_tier1_profiles.py: ranks REFs by corpus in-degree
 * (derived from citation outgoing-edges), takes each top REF's primary author,
 * skips institutional/group "authors" and already-profiled people, and stamps a
 * compact 5-section PROF-P sidecar. Reuses the #1497 parser (loadCorpus gives
 * authors + edges + titles; loadProfileSlugs gives existing profiles) rather
 * than re-parsing citation sidecars. Dry-run unless `write`; skips existing.
 *
 * `corpus-refs` is written as a list of REF-id strings (matching the corpus
 * convention + build_tier1); the #1497 parser tolerates both that and the
 * list-of-dicts shape.
 *
 * @source historical: profiles/build_tier1_profiles.py
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadCorpus, loadProfileSlugs, type RefRecord } from '../corpus-views/ref-parser.js';

/** Institutional / group "author" markers — these get group profiles, not PROF-P. */
const INST_KEYWORDS = ['team', 'labs', 'contributors', 'foundation', 'consortium', 'committee', 'anthropic alignment', 'stanford hai'];

export interface ProfileGenOptions {
  today?: string;
  write?: boolean;
  /** Max profiles to generate (build_tier1 default: 25). */
  limit?: number;
  /** How many top-in-degree REFs to scan for candidates (build_tier1 default: 60). */
  scan?: number;
}

export interface ProfileGenResult {
  slug: string;
  name: string;
  status: 'wrote' | 'skip' | 'dry-run';
  message: string;
  outPath: string;
  content?: string;
}

/** Port of build_tier1_profiles.slugify: "Last, First" / "First Last" → "last-first". */
export function slugifyAuthor(name: string): string {
  let last: string;
  let first: string;
  if (name.includes(',')) {
    const [l, f] = name.split(',', 2).map((s) => s.trim());
    last = l ?? '';
    first = f ?? '';
  } else {
    const parts = name.trim().split(/\s+/);
    first = parts[0] ?? '';
    last = parts[parts.length - 1] ?? '';
  }
  const firstWord = first.split(/\s+/)[0] ?? '';
  const slug = `${last}-${firstWord}`.toLowerCase().replace(/ /g, '-').replace(/\./g, '').replace(/'/g, '');
  return slug.replace(/-+/g, '-');
}

function shortTitle(t: string | null | undefined, n = 70): string {
  const s = (t ?? '').replace(/"/g, '').trim();
  return s.length > n ? s.slice(0, n) + '...' : s;
}

/** Compute corpus in-degree per REF from citation outgoing-edges (within corpus). */
function inDegrees(records: RefRecord[], byId: Map<string, RefRecord>): Map<string, number> {
  const inDeg = new Map<string, number>();
  for (const r of records) {
    for (const t of r.outgoing) {
      if (byId.has(t)) inDeg.set(t, (inDeg.get(t) ?? 0) + 1);
    }
  }
  return inDeg;
}

/** Build the compact 5-section PROF-P markdown body. Mirrors generate_profile(). */
function buildBody(name: string, slug: string, refs: string[], byId: Map<string, RefRecord>, inDeg: Map<string, number>, today: string): string {
  const refsData = refs
    .map((r) => ({ ref: r, title: shortTitle(byId.get(r)?.title), year: byId.get(r)?.year != null ? String(byId.get(r)!.year) : '—', deg: inDeg.get(r) ?? 0 }))
    .sort((a, b) => b.deg - a.deg);
  const topRef = refsData[0] ?? { ref: '—', deg: 0, year: '—', title: '' };

  // Co-author counts across this author's refs.
  const coCount = new Map<string, number>();
  const coRefs = new Map<string, string[]>();
  for (const r of refs) {
    for (const ca of byId.get(r)?.authors ?? []) {
      if (ca === name) continue;
      coCount.set(ca, (coCount.get(ca) ?? 0) + 1);
      (coRefs.get(ca) ?? coRefs.set(ca, []).get(ca)!).push(r);
    }
  }
  const topCo = [...coCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10);
  const yamlRefs = '[' + refs.map((r) => `'${r}'`).join(', ') + ']';
  const nextDue = new Date(new Date(`${today}T00:00:00Z`).getTime() + 180 * 86_400_000).toISOString().slice(0, 10);
  const summary =
    `${name} is the primary author of ${topRef.ref} (corpus in-degree ${topRef.deg}), ` +
    `one of the top hubs in the corpus citation network. ${refs.length} corpus paper${refs.length !== 1 ? 's' : ''}.`;

  const lines: string[] = [
    '---',
    `prof-id: PROF-P-${slug}`,
    `name: "${name}"`,
    'type: person',
    'affiliation: ""',
    `aliases: ["${name}"]`,
    `corpus-refs: ${yamlRefs}`,
    'refresh-cadence: semi-annual',
    `last-refreshed: ${today}`,
    'last-refreshed-by: profile-generate-scaffold',
    'grade-influence: A',
    'grade-trajectory: stable',
    'sources-searched: [corpus-citation-sidecars]',
    '---',
    '',
    `# ${name} — Entity Profile`,
    '',
    '**Type**: Person',
    `**Profile ID**: \`PROF-P-${slug}\``,
    `**Last refreshed**: ${today}`,
    `**Next refresh due**: ${nextDue}`,
    '',
    '---',
    '',
    '## 1. Entity Summary',
    '',
    summary,
    '',
    '**Research Identity**: Foundational corpus author.',
    `**Top hub authored**: [${topRef.ref}](../../references/) (in-degree ${topRef.deg})`,
    `**Active in corpus since**: ${refsData[refsData.length - 1]?.year ?? '—'}`,
    '',
    '---',
    '',
    '## 2. Corpus Presence',
    '',
    '| REF | Title | Year | In-degree |',
    '|---|---|---|---:|',
  ];
  for (const rd of refsData) lines.push(`| [${rd.ref}](../../references/) | ${rd.title} | ${rd.year} | ${rd.deg} |`);
  lines.push(
    '',
    `**Total corpus appearances**: ${refs.length}`,
    `**Most-cited corpus paper**: ${topRef.ref} (in-degree ${topRef.deg})`,
    '',
    '---',
    '',
    '## 3. Research Focus Profile',
    '',
    'Derived mechanically from corpus paper titles. Manual topic-classification deferred to next refresh.',
    '',
    '---',
    '',
    '## 4. Co-Author Network (Top 10)',
    '',
    '| Co-Author | Joint Papers | REFs |',
    '|---|---|---|',
  );
  if (topCo.length) {
    for (const [ca, count] of topCo) lines.push(`| ${ca} | ${count} | ${(coRefs.get(ca) ?? []).join(', ')} |`);
  } else {
    lines.push('| (single-author papers — no co-authors recorded) | — | — |');
  }
  lines.push(
    '',
    `_Derived mechanically from ${refs.length} corpus citation sidecar(s) on ${today}.${coCount.size ? ` Top 10 of ${coCount.size} unique collaborators.` : ''}_`,
    '',
    '---',
    '',
    '## 5. Notes',
    '',
    '- Profile generated by `aiwg corpus profile-generate` (Tier-1 hub-primary-author pass).',
    '- Mechanical extraction from citation-sidecar frontmatter. Affiliation intentionally blank — populate after consulting the listed REFs.',
    '- Refresh recommended after the next major induction wave touches this researcher.',
    '',
  );
  return lines.join('\n');
}

/** Generate Tier-1 PROF-P profiles for unprofiled hub primary authors. */
export function generateTier1Profiles(corpusRoot: string, opts: ProfileGenOptions = {}): ProfileGenResult[] {
  const today = opts.today || new Date().toISOString().slice(0, 10);
  const limit = opts.limit ?? 25;
  const scan = opts.scan ?? 60;

  const { records } = loadCorpus(corpusRoot);
  const byId = new Map(records.map((r) => [r.refId, r]));
  const inDeg = inDegrees(records, byId);
  const existing = loadProfileSlugs(corpusRoot);

  const authorRefs = new Map<string, Set<string>>();
  for (const r of records) for (const a of r.authors) (authorRefs.get(a) ?? authorRefs.set(a, new Set()).get(a)!).add(r.refId);

  const ranked = [...inDeg.entries()].sort((a, b) => b[1] - a[1]).slice(0, scan);
  const results: ProfileGenResult[] = [];
  const seen = new Set<string>();
  for (const [refId] of ranked) {
    if (results.length >= limit) break;
    const r = byId.get(refId);
    const primary = r?.authors[0];
    if (!primary) continue;
    if (INST_KEYWORDS.some((kw) => primary.toLowerCase().includes(kw))) continue;
    const slug = slugifyAuthor(primary);
    if (existing.has(slug) || seen.has(slug)) continue;
    seen.add(slug);

    const refs = [...(authorRefs.get(primary) ?? [])].sort();
    const outRel = path.join('documentation', 'profiles', 'people', `PROF-P-${slug}.md`);
    const content = buildBody(primary, slug, refs, byId, inDeg, today);
    const outAbs = path.join(corpusRoot, outRel);

    if (!opts.write) {
      results.push({ slug, name: primary, status: 'dry-run', message: `DRY-RUN PROF-P-${slug}: ${primary} (${refs.length} refs)`, outPath: outRel, content });
      continue;
    }
    if (fs.existsSync(outAbs)) {
      results.push({ slug, name: primary, status: 'skip', message: `SKIP PROF-P-${slug} (exists)`, outPath: outRel });
      continue;
    }
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, content, 'utf-8');
    results.push({ slug, name: primary, status: 'wrote', message: `WROTE PROF-P-${slug}: ${primary} (${refs.length} refs)`, outPath: outRel, content });
  }
  return results;
}
