/**
 * discovery-log — record the source-tracking `discovery:` block on a citation
 * sidecar (#1499). Adds or replaces the block in the sidecar frontmatter,
 * preserving the rest of the file. Dry-run unless `write`.
 *
 * The `discovery` block is OPTIONAL by design (SOURCE-TRACKING §0): `date` +
 * `surface` are the only meaningful required fields; `curator-id` is set only
 * when the source came through a named, repeatable curator.
 *
 * @source historical: documentation/SOURCE-TRACKING.md §1
 */

import * as fs from 'fs';
import * as path from 'path';

const SURFACE_VOCAB = ['x-account', 'x-search', 'x-bookmarks', 'x-foryou', 'x-following', 'rss', 'newsletter', 'web', 'referral', 'direct'];

export interface DiscoveryFields {
  surface: string;
  date?: string;
  via?: string;
  curatorId?: string;
  harvestBatch?: string;
  harvestedBy?: string;
}

export interface DiscoveryLogOptions extends DiscoveryFields {
  write?: boolean;
}

export interface DiscoveryLogResult {
  refId: string;
  status: 'wrote' | 'dry-run' | 'skip';
  message: string;
  /** The rendered discovery block (always present). */
  block: string;
  /** The full sidecar content after splicing (dry-run + wrote). */
  content?: string;
}

/** Render the `discovery:` YAML block (2-space indented under the key). */
export function renderDiscoveryBlock(f: DiscoveryFields, today: string): string {
  const lines = ['discovery:', `  date: ${f.date || today}`, `  surface: ${f.surface}`];
  if (f.via) lines.push(`  via: "${f.via}"`);
  lines.push(`  curator-id: ${f.curatorId || 'null'}`);
  if (f.harvestBatch) lines.push(`  harvest-batch: ${f.harvestBatch}`);
  if (f.harvestedBy) lines.push(`  harvested-by: ${f.harvestedBy}`);
  return lines.join('\n');
}

/** Drop an existing top-level `discovery:` block (key + its indented lines) from frontmatter lines. */
function stripDiscovery(fmLines: string[]): string[] {
  const out: string[] = [];
  let skipping = false;
  for (const line of fmLines) {
    if (skipping) {
      if (/^\s/.test(line) || line.trim() === '') continue; // still inside the block's indented body
      skipping = false;
    }
    if (/^discovery:\s*$/.test(line)) {
      skipping = true;
      continue;
    }
    out.push(line);
  }
  return out;
}

/** Add or replace the discovery block in REF-XXX-citations.md frontmatter. */
export function logDiscovery(corpusRoot: string, refId: string, opts: DiscoveryLogOptions): DiscoveryLogResult {
  const today = opts.date || new Date().toISOString().slice(0, 10);
  const block = renderDiscoveryBlock(opts, today);

  if (!SURFACE_VOCAB.includes(opts.surface)) {
    throw new Error(`discovery-log: unknown surface '${opts.surface}' (one of: ${SURFACE_VOCAB.join(', ')})`);
  }

  const sidecar = path.join(corpusRoot, 'documentation', 'citations', `${refId}-citations.md`);
  if (!fs.existsSync(sidecar)) {
    return { refId, status: 'skip', message: `SKIP ${refId}: no citation sidecar found`, block };
  }

  const text = fs.readFileSync(sidecar, 'utf-8');
  const m = text.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) {
    return { refId, status: 'skip', message: `SKIP ${refId}: citation sidecar has no YAML frontmatter`, block };
  }
  const fmLines = stripDiscovery(m[1].split('\n'));
  const newFm = [...fmLines, block].join('\n');
  const content = `---\n${newFm}\n---\n${m[2]}`;

  if (!opts.write) {
    return { refId, status: 'dry-run', message: `DRY-RUN ${refId}: would set discovery (surface=${opts.surface}${opts.curatorId ? `, curator=${opts.curatorId}` : ''})`, block, content };
  }
  fs.writeFileSync(sidecar, content, 'utf-8');
  return { refId, status: 'wrote', message: `WROTE discovery block to ${refId}-citations.md`, block, content };
}
