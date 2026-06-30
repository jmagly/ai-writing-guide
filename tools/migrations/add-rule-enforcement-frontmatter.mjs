#!/usr/bin/env node
/**
 * Migration: add a machine-readable `enforcement:` frontmatter field to every
 * AIWG rule source file (#1673, accepted ADR adr-rule-deployment-context-budget).
 *
 * The deploy-path tier selection (always-on CRITICAL+HIGH vs on-demand) needs a
 * single, reliable signal. Today enforcement level lives in two places: a body
 * marker (`**Enforcement Level**: HIGH`) on most rules, and a frontmatter
 * `level:` field on a few. This migration normalizes to a canonical
 * `enforcement: <critical|high|medium|low>` frontmatter field, resolving from
 * (in order): existing `enforcement:`, frontmatter `level:`, the body marker,
 * then an explicit triage map for the rules that declare none.
 *
 * Idempotent: a second run makes no changes. Body markers are left intact
 * (human-readable); frontmatter is the machine field. Edits are minimal —
 * a single inserted line for files that already have frontmatter, a small
 * prepended block for body-only files — to keep diffs reviewable.
 *
 * Usage:
 *   node tools/migrations/add-rule-enforcement-frontmatter.mjs [--root <repo>] [--dry-run]
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const VALID = new Set(['critical', 'high', 'medium', 'low']);

// Triage assignments for rules that declare no enforcement level anywhere.
// Keys are paths relative to agentic/code/. HIGH = behavior/safety/authorization
// rules that should remain always-on; MEDIUM = domain/quality/conditional rules
// that are fine on-demand. See the #1673 cycle comment for rationale.
export const TRIAGE = {
  'addons/agentic-installer/rules/installer-safety.md': 'high',
  'addons/agentic-installer/rules/installer-authoring.md': 'high',
  'addons/aiwg-utils/rules/agent-deployment.md': 'high',
  'addons/aiwg-utils/rules/respect-repo-access-manifest.md': 'high',
  'frameworks/sdlc-complete/rules/sdlc-orchestration.md': 'medium',
  'frameworks/sdlc-complete/rules/self-maintenance.md': 'medium',
  'frameworks/sdlc-complete/rules/stateless-processes.md': 'medium',
  'frameworks/sdlc-complete/rules/config-in-environment.md': 'medium',
  'frameworks/sdlc-complete/rules/logs-as-event-streams.md': 'medium',
  'frameworks/sdlc-complete/rules/disposable-processes.md': 'medium',
  'frameworks/sdlc-complete/rules/mention-wiring.md': 'medium',
  'extensions/sys/rules/sys-immutable-base.md': 'medium',
  'addons/context-curator/rules/scoped-reasoning.md': 'medium',
  'addons/context-curator/rules/distractor-filter.md': 'medium',
  'addons/aiwg-utils/rules/no-time-estimates.md': 'medium',
  'addons/aiwg-utils/rules/soul-enforcement.md': 'medium',
  'addons/voice-framework/rules/voice-framework.md': 'medium',
  'addons/verbalized-sampling/rules/diversity-awareness.md': 'medium',
};

function splitFrontmatter(content) {
  if (!content.startsWith('---\n')) return { fm: null, body: content };
  const end = content.indexOf('\n---', 4);
  if (end === -1) return { fm: null, body: content };
  const fmEnd = content.indexOf('\n', end + 1); // end of the closing --- line
  return {
    fm: content.slice(4, end), // between opening ---\n and \n---
    rest: content.slice(fmEnd + 1),
  };
}

/**
 * Resolve a rule's enforcement level. Returns the level and where it came from:
 *   'enforcement-fm' | 'level-fm' | 'body' | 'triage' | null.
 * A 'triage' source means the rule declares no level anywhere — the audited
 * label must be written back into the file so it becomes self-describing.
 */
export function resolveEnforcement(content, relPath) {
  const { fm } = splitFrontmatter(content);
  if (fm != null) {
    const enf = fm.match(/^enforcement:\s*([A-Za-z]+)/m);
    if (enf && VALID.has(enf[1].toLowerCase())) return { level: enf[1].toLowerCase(), source: 'enforcement-fm' };
    const lvl = fm.match(/^level:\s*([A-Za-z]+)/m);
    if (lvl && VALID.has(lvl[1].toLowerCase())) return { level: lvl[1].toLowerCase(), source: 'level-fm' };
  }
  const body = content.match(/Enforcement Level\**:?\s*\**\s*(CRITICAL|HIGH|MEDIUM|LOW)/i);
  if (body) return { level: body[1].toLowerCase(), source: 'body' };
  if (relPath && TRIAGE[relPath]) return { level: TRIAGE[relPath], source: 'triage' };
  return { level: null, source: null };
}

/** Insert a `**Enforcement Level**: X` body marker just after the first H1. */
function insertBodyMarker(content, level) {
  const upper = level.toUpperCase();
  const lines = content.split('\n');
  const h1 = lines.findIndex((l) => /^#\s+\S/.test(l));
  if (h1 === -1) {
    // No heading — put the marker at the very top of the body.
    return `**Enforcement Level**: ${upper}\n\n${content}`;
  }
  // Place after the H1 and a single blank line, matching corpus convention.
  const after = h1 + 1;
  const hasBlank = (lines[after] ?? '').trim() === '';
  const insertAt = hasBlank ? after + 1 : after;
  const marker = hasBlank ? `**Enforcement Level**: ${upper}\n` : `\n**Enforcement Level**: ${upper}\n`;
  lines.splice(insertAt, 0, marker.replace(/\n$/, ''));
  return lines.join('\n');
}

/** Apply the field; returns {changed, level, source} without writing. */
export function withEnforcement(content, relPath) {
  const { level, source } = resolveEnforcement(content, relPath);
  if (!level || !VALID.has(level)) return { changed: false, level: null, source: null, content };

  let next = content;
  // Audited-and-corrected: write the human-readable body marker into rules that
  // declared no level anywhere, so they are self-describing for fast future lookups.
  if (source === 'triage' && !/Enforcement Level/i.test(next)) {
    next = insertBodyMarker(next, level);
  }

  const { fm } = splitFrontmatter(next);
  if (fm != null) {
    if (/^enforcement:\s*/m.test(fm)) {
      return { changed: next !== content, level, source, content: next }; // fm already has it
    }
    next = next.replace(/^---\n/, `---\nenforcement: ${level}\n`);
  } else {
    next = `---\nenforcement: ${level}\n---\n\n${next}`;
  }
  return { changed: next !== content, level, source, content: next };
}

async function listRuleFiles(root) {
  const out = [];
  async function walk(dir) {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const abs = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === '.git') continue;
        await walk(abs);
      } else if (
        e.isFile() &&
        e.name.endsWith('.md') &&
        e.name !== 'RULES-INDEX.md' &&
        /(?:^|\/)rules$/.test(dir.split(path.sep).join('/'))
      ) {
        out.push(abs);
      }
    }
  }
  await walk(path.join(root, 'agentic', 'code'));
  return out.sort();
}

export async function main(argv = process.argv.slice(2)) {
  let root = process.cwd();
  let dryRun = false;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--root' && argv[i + 1]) root = path.resolve(argv[++i]);
    else if (argv[i].startsWith('--root=')) root = path.resolve(argv[i].slice(7));
    else if (argv[i] === '--dry-run') dryRun = true;
  }

  const files = await listRuleFiles(root);
  const byLevel = {};
  const bySource = {};
  let changed = 0;
  const corrected = [];
  const unresolved = [];
  for (const abs of files) {
    const rel = path.relative(path.join(root, 'agentic', 'code'), abs).split(path.sep).join('/');
    const content = await fs.readFile(abs, 'utf8');
    const result = withEnforcement(content, rel);
    if (!result.level) {
      unresolved.push(rel);
      continue;
    }
    byLevel[result.level] = (byLevel[result.level] || 0) + 1;
    bySource[result.source] = (bySource[result.source] || 0) + 1;
    if (result.source === 'triage') corrected.push(`${rel} -> ${result.level.toUpperCase()}`);
    if (result.changed) {
      changed += 1;
      if (!dryRun) await fs.writeFile(abs, result.content, 'utf8');
    }
  }

  console.log(`Rule files scanned: ${files.length}`);
  console.log(`Enforcement distribution: ${JSON.stringify(byLevel)}`);
  console.log(`Resolution source: ${JSON.stringify(bySource)}`);
  console.log(`${dryRun ? 'Would change' : 'Changed'}: ${changed}`);
  if (corrected.length) {
    console.log(`Audited + corrected (was unlabelled, body marker written): ${corrected.length}`);
    for (const c of corrected) console.log(`  ${c}`);
  }
  if (unresolved.length) {
    console.error(`UNRESOLVED (no level, not in triage map): ${unresolved.length}`);
    for (const u of unresolved) console.error(`  ${u}`);
    return 1;
  }
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await main();
}
