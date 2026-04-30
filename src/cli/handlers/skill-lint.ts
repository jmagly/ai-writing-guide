/**
 * skill-lint — rubric-based quality scoring for SKILL.md files.
 *
 * Complements `validate-metadata` (#1014's CI gate, schema-only)
 * with a richer per-skill quality score across multiple dimensions.
 * Designed for headless use: `--json` outputs structured results for
 * CI consumption; exit code 0/1 reflects whether all checked files
 * meet the chosen rubric threshold.
 *
 * @module src/cli/handlers/skill-lint
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { validateSkillFrontmatter } from '../../extensions/validation.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

/**
 * Three rubric strictness levels. The minimum-passing score in each
 * mode reflects how much we expect of a SKILL.md before flagging it.
 */
export type RubricMode = 'strict' | 'standard' | 'lenient';

const THRESHOLDS: Record<RubricMode, number> = {
  strict: 80,
  standard: 60,
  lenient: 40,
};

interface DimensionScore {
  /** 0–100 score for this dimension. */
  score: number;
  /** Reasons the dimension lost points; empty when score is 100. */
  notes: string[];
}

interface SkillScore {
  file: string;
  /** Weighted total, 0–100. */
  score: number;
  /** Per-dimension breakdown. */
  dimensions: {
    schema: DimensionScore;
    description: DimensionScore;
    discoverability: DimensionScore;
    body: DimensionScore;
  };
  /** Did the file meet the chosen rubric's threshold? */
  passes: boolean;
}

interface LintReport {
  rubric: RubricMode;
  threshold: number;
  files: SkillScore[];
  /** Average score across files (helpful trend metric). */
  averageScore: number;
  /** Files that did not meet the threshold. */
  failedCount: number;
}

const DIMENSION_WEIGHTS = {
  schema: 0.4,
  description: 0.2,
  discoverability: 0.2,
  body: 0.2,
};

function scoreDimension(passes: boolean, notes: string[] = []): DimensionScore {
  return passes ? { score: 100, notes: [] } : { score: 0, notes };
}

function partialDimension(score: number, notes: string[]): DimensionScore {
  return { score: Math.max(0, Math.min(100, Math.round(score))), notes };
}

/**
 * Score the schema dimension. Binary: pass if `SkillFrontmatterSchema`
 * validates clean, fail otherwise. We treat schema as a hard gate
 * because the cleanup work in #1015 made schema correctness a baseline
 * expectation across the corpus.
 */
function scoreSchema(frontmatter: unknown): DimensionScore {
  const result = validateSkillFrontmatter(frontmatter);
  if (result.success) return scoreDimension(true);
  const notes = result.errors.errors.map(
    (e) => `${e.path.join('.') || '<root>'}: ${e.message}`
  );
  return scoreDimension(false, notes);
}

/**
 * Score the description. Looks for non-empty content, sufficient
 * length, and action-oriented phrasing ("Use when…", verb-leading)
 * that helps NL routing identify when to invoke the skill.
 */
function scoreDescription(fm: Record<string, unknown>): DimensionScore {
  const desc = typeof fm.description === 'string' ? fm.description.trim() : '';
  if (!desc) return scoreDimension(false, ['description is missing or empty']);

  const notes: string[] = [];
  let score = 100;

  if (desc.length < 30) {
    score -= 40;
    notes.push(`description is ${desc.length} chars; aim for ≥30`);
  }
  // Action-oriented phrasing — either explicit "Use when…" or a verb-leading sentence.
  const hasUseWhen = /\buse when\b/i.test(desc);
  const startsWithVerb = /^[A-Z]?[a-z]+(?:s|e|t|d|n)\s/.test(desc); // crude verb heuristic
  if (!hasUseWhen && !startsWithVerb) {
    score -= 30;
    notes.push('description missing "Use when…" clause or action-leading verb');
  }

  return partialDimension(score, notes);
}

/**
 * Score discoverability. A skill is discoverable when one of:
 *  - it has a `triggers:` array of ≥2 entries (NL routing surface)
 *  - or it is explicitly not user-invocable (agent-only / library skills)
 *
 * Skills that are user-invocable but lack triggers won't be found by NL
 * routing, which is the failure mode this dimension guards against.
 */
function scoreDiscoverability(fm: Record<string, unknown>): DimensionScore {
  const triggers = Array.isArray(fm.triggers) ? fm.triggers : [];
  const userInv = fm.userInvocable === true || fm['user-invocable'] === true;

  if (!userInv) {
    // Agent-only skill — discoverability not strictly needed.
    return scoreDimension(true);
  }

  if (triggers.length >= 2) return scoreDimension(true);
  if (triggers.length === 1) {
    return partialDimension(60, ['only 1 trigger phrase; aim for ≥2 for NL routing diversity']);
  }
  return scoreDimension(false, [
    'user-invocable skill has no triggers — NL routing will not find it',
  ]);
}

/**
 * Score the body. Looks for a non-trivial amount of skill content
 * after the frontmatter. Very short bodies usually indicate
 * placeholder or stub skills.
 */
function scoreBody(body: string): DimensionScore {
  const text = body.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  if (wordCount >= 100) return scoreDimension(true);
  if (wordCount >= 30) {
    return partialDimension(60, [`body has ${wordCount} words; aim for ≥100`]);
  }
  return scoreDimension(false, [
    `body has only ${wordCount} words — likely a stub`,
  ]);
}

function combineScore(dims: SkillScore['dimensions']): number {
  return Math.round(
    dims.schema.score * DIMENSION_WEIGHTS.schema +
      dims.description.score * DIMENSION_WEIGHTS.description +
      dims.discoverability.score * DIMENSION_WEIGHTS.discoverability +
      dims.body.score * DIMENSION_WEIGHTS.body
  );
}

/**
 * Lint a single SKILL.md file end-to-end.
 *
 * @param filePath - Absolute or relative path to the SKILL.md
 * @param rubric - Strictness level (drives the pass threshold)
 */
export async function lintSkillFile(
  filePath: string,
  rubric: RubricMode = 'standard'
): Promise<SkillScore> {
  const content = await fs.readFile(filePath, 'utf-8');
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);

  if (!fmMatch) {
    return {
      file: filePath,
      score: 0,
      passes: false,
      dimensions: {
        schema: scoreDimension(false, ['no YAML frontmatter found']),
        description: scoreDimension(false, ['no frontmatter to derive description from']),
        discoverability: scoreDimension(false, ['no frontmatter']),
        body: scoreBody(content),
      },
    };
  }

  const [, fmText, body = ''] = fmMatch;
  let frontmatter: Record<string, unknown> = {};
  let yamlError: string | null = null;
  try {
    const parsed = yaml.load(fmText);
    if (parsed && typeof parsed === 'object') {
      frontmatter = parsed as Record<string, unknown>;
    }
  } catch (e) {
    yamlError = (e as Error).message.split('\n')[0];
  }

  const dimensions: SkillScore['dimensions'] = {
    schema: yamlError
      ? scoreDimension(false, [`YAML parse error: ${yamlError}`])
      : scoreSchema(frontmatter),
    description: scoreDescription(frontmatter),
    discoverability: scoreDiscoverability(frontmatter),
    body: scoreBody(body),
  };

  const score = combineScore(dimensions);
  return {
    file: filePath,
    score,
    passes: score >= THRESHOLDS[rubric],
    dimensions,
  };
}

async function* walkSkillFiles(rootPath: string): AsyncGenerator<string> {
  const stat = await fs.stat(rootPath);
  if (stat.isFile()) {
    if (path.basename(rootPath) === 'SKILL.md') yield rootPath;
    return;
  }
  if (!stat.isDirectory()) return;

  const entries = await fs.readdir(rootPath, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith('.') || e.name === 'node_modules') continue;
    const p = path.join(rootPath, e.name);
    if (e.isDirectory()) {
      yield* walkSkillFiles(p);
    } else if (e.isFile() && e.name === 'SKILL.md') {
      yield p;
    }
  }
}

/**
 * Lint all SKILL.md files under one or more paths. Returns a structured
 * report. Each path may be a directory (walked recursively) or a
 * specific SKILL.md file. Files in `failedCount` and the per-file list
 * are deduplicated.
 *
 * Pure function — does not print or exit. The CLI handler renders
 * output and translates the report into an exit code.
 */
export async function lintSkills(
  targetPaths: string | string[],
  rubric: RubricMode = 'standard'
): Promise<LintReport> {
  const targets = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
  const seen = new Set<string>();
  const files: SkillScore[] = [];
  for (const target of targets) {
    for await (const f of walkSkillFiles(target)) {
      const resolved = path.resolve(f);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      files.push(await lintSkillFile(f, rubric));
    }
  }
  const total = files.reduce((sum, f) => sum + f.score, 0);
  return {
    rubric,
    threshold: THRESHOLDS[rubric],
    files,
    averageScore: files.length > 0 ? Math.round(total / files.length) : 0,
    failedCount: files.filter((f) => !f.passes).length,
  };
}

function parseArgs(args: string[]): {
  targets: string[];
  rubric: RubricMode;
  json: boolean;
} {
  const targets: string[] = [];
  let rubric: RubricMode = 'standard';
  let json = false;

  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--json') {
      json = true;
    } else if (a === '--rubric' && i + 1 < args.length) {
      const next = args[++i];
      if (next === 'strict' || next === 'standard' || next === 'lenient') {
        rubric = next;
      }
    } else if (!a.startsWith('-')) {
      targets.push(a);
    }
  }
  if (targets.length === 0) targets.push('agentic/code');
  return { targets, rubric, json };
}

function renderTextReport(report: LintReport): void {
  const { files, threshold, rubric, averageScore, failedCount } = report;

  for (const f of files) {
    if (f.passes) continue;
    console.log(`✗ ${f.file} (${f.score}/100)`);
    for (const [name, dim] of Object.entries(f.dimensions)) {
      if (dim.score < 100) {
        console.log(`    ${name} (${dim.score}): ${dim.notes.join('; ')}`);
      }
    }
  }

  console.log(`\nskill-lint (rubric=${rubric}, threshold=${threshold}):`);
  console.log(`  ${files.length} file(s) scanned`);
  console.log(`  ${failedCount} below threshold`);
  console.log(`  average score: ${averageScore}/100`);
}

export const skillLintHandler: CommandHandler = {
  id: 'skill-lint',
  name: 'Skill Lint',
  description: 'Score SKILL.md files against a quality rubric',
  category: 'utility',
  aliases: ['-skill-lint', '--skill-lint'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const { targets, rubric, json } = parseArgs(ctx.args);
    const report = await lintSkills(targets, rubric);

    if (json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      renderTextReport(report);
    }

    return {
      exitCode: report.failedCount > 0 ? 1 : 0,
    };
  },
};
