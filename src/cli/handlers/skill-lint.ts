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
import { validateSkillFrontmatter } from '../../extensions/validation.js';
import { validateAgentSkillFile } from '../../skills/validator.js';
import type {
  AgentSkillDiagnostic,
  AgentSkillValidationProfile,
} from '../../skills/agent-skills.js';
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
  conformance: {
    profile: AgentSkillValidationProfile;
    state: 'valid' | 'warning' | 'invalid' | 'skipped';
    diagnostics: AgentSkillDiagnostic[];
  };
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

interface CompanionCliInventoryItem {
  file: string;
  commands: string[];
  workflowLanguage: boolean;
  risk: 'ok' | 'review';
  notes: string[];
}

interface LintReport {
  rubric: RubricMode;
  profile: AgentSkillValidationProfile;
  threshold: number;
  files: SkillScore[];
  /** Average score across files (helpful trend metric). */
  averageScore: number;
  /** Files that did not meet the threshold. */
  failedCount: number;
  companionCli: {
    total: number;
    reviewCount: number;
    items: CompanionCliInventoryItem[];
  };
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
function scoreSchema(
  frontmatter: unknown,
  diagnostics: readonly AgentSkillDiagnostic[],
): DimensionScore {
  const conformanceErrors = diagnostics.filter((item) => item.severity === 'error');
  if (conformanceErrors.length > 0) {
    const notes = conformanceErrors.map((item) => (
      item.code === 'AS_YAML_PARSE'
        ? `YAML parse error: ${item.message}`
        : `${item.yamlPath}: ${item.message} [${item.code}]`
    ));
    return scoreDimension(false, notes);
  }
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
 *
 * Also flags post-kernel-pivot regressions: slash-prefix references to
 * non-kernel AIWG skills (e.g. `/issue-list`). Only kernel-listed skills
 * are platform-invokable; everything else must be reached via
 * `aiwg discover` / `aiwg show`. See agentic/code/addons/aiwg-utils/rules/skill-discovery.md
 * and issue #1260.
 */
function scoreBody(body: string): DimensionScore {
  const text = body.trim();
  const wordCount = text.split(/\s+/).filter(Boolean).length;

  // Kernel / built-in skills are still legitimately invokable as
  // slash commands; references to these should not be flagged. The
  // generated-output exception (templates like aiwg-regenerate-claude
  // that emit user-facing CLAUDE.md) is handled by the marker below.
  const KERNEL_SKILLS = new Set([
    'aiwg-doctor', 'aiwg-refresh', 'aiwg-status', 'aiwg-help', 'use', 'steward',
    // Claude Code built-ins
    'help', 'clear', 'init', 'review', 'security-review',
  ]);

  const slashRefRe = /`\/([a-z][a-z0-9-]+)`/g;
  const offenders = new Set<string>();
  // Skip lines after the "Available Slash Commands" marker — that block
  // is template output and slash prefixes there are intentional.
  const lines = body.split('\n');
  let inTemplateBlock = false;
  for (const line of lines) {
    if (/Available Slash Commands/i.test(line)) {
      inTemplateBlock = true;
      continue;
    }
    if (inTemplateBlock && /^#{1,3}\s/.test(line)) {
      // Next heading closes the template block.
      inTemplateBlock = false;
    }
    if (inTemplateBlock) continue;
    for (const m of line.matchAll(slashRefRe)) {
      const name = m[1];
      if (!KERNEL_SKILLS.has(name)) offenders.add(name);
    }
  }

  const notes: string[] = [];
  if (offenders.size > 0) {
    notes.push(
      `slash-prefix refs to non-kernel skills: ${[...offenders].slice(0, 8).join(', ')}` +
      (offenders.size > 8 ? ` (+${offenders.size - 8} more)` : '') +
      ' — drop the "/" prefix; non-kernel skills are reached via `aiwg discover` + `aiwg show` (#1260)'
    );
  }

  if (wordCount >= 100) {
    return offenders.size > 0 ? partialDimension(80, notes) : scoreDimension(true);
  }
  if (wordCount >= 30) {
    notes.unshift(`body has ${wordCount} words; aim for ≥100`);
    return partialDimension(offenders.size > 0 ? 45 : 60, notes);
  }
  notes.unshift(`body has only ${wordCount} words — likely a stub`);
  return scoreDimension(false, notes);
}

function combineScore(dims: SkillScore['dimensions']): number {
  return Math.round(
    dims.schema.score * DIMENSION_WEIGHTS.schema +
      dims.description.score * DIMENSION_WEIGHTS.description +
      dims.discoverability.score * DIMENSION_WEIGHTS.discoverability +
      dims.body.score * DIMENSION_WEIGHTS.body
  );
}

const AIWG_COMMAND_RE = /`(aiwg\s+[^`\n]+)`/g;
const WORKFLOW_SUPPORT_RE = /\b(skill|workflow|orchestrat|review|interpret|summari[sz]e|validate|report|decide|triage|guide)\b/i;
const REPLACEMENT_RISK_RE = /\b(?:just|only|simply)\s+run\s+`?aiwg\b|\b(?:replaces?|instead of)\s+(?:the\s+)?skill\b|\bdo not use this skill\b/i;

function inventoryCompanionCli(filePath: string, body: string): CompanionCliInventoryItem | null {
  const commands = [...body.matchAll(AIWG_COMMAND_RE)]
    .map((m) => m[1]!.replace(/\s+/g, ' ').trim());
  const uniqueCommands = [...new Set(commands)];
  if (uniqueCommands.length === 0) return null;

  const workflowLanguage = WORKFLOW_SUPPORT_RE.test(body);
  const notes: string[] = [];
  if (!workflowLanguage) {
    notes.push('mentions aiwg CLI commands but does not describe the surrounding skill/workflow judgment');
  }
  if (REPLACEMENT_RISK_RE.test(body)) {
    notes.push('wording may position the CLI command as replacing the skill workflow');
  }

  return {
    file: filePath,
    commands: uniqueCommands.slice(0, 12),
    workflowLanguage,
    risk: notes.length > 0 ? 'review' : 'ok',
    notes,
  };
}

/**
 * Lint a single SKILL.md file end-to-end.
 *
 * @param filePath - Absolute or relative path to the SKILL.md
 * @param rubric - Strictness level (drives the pass threshold)
 */
export async function lintSkillFile(
  filePath: string,
  rubric: RubricMode = 'standard',
  profile: AgentSkillValidationProfile = 'compatible',
): Promise<SkillScore> {
  const validation = validateAgentSkillFile(filePath, { profile });
  const frontmatter = validation.frontmatter ?? {};
  const body = validation.body;

  const dimensions: SkillScore['dimensions'] = {
    schema: scoreSchema(frontmatter, validation.diagnostics),
    description: scoreDescription(frontmatter),
    discoverability: scoreDiscoverability(frontmatter),
    body: scoreBody(body),
  };

  const score = combineScore(dimensions);
  return {
    file: filePath,
    score,
    conformance: {
      profile,
      state: validation.state,
      diagnostics: validation.diagnostics,
    },
    passes: validation.valid && score >= THRESHOLDS[rubric],
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

  const entries = (await fs.readdir(rootPath, { withFileTypes: true }))
    .sort((left, right) => left.name.localeCompare(right.name));
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
  rubric: RubricMode = 'standard',
  profile: AgentSkillValidationProfile = 'compatible',
): Promise<LintReport> {
  const targets = Array.isArray(targetPaths) ? targetPaths : [targetPaths];
  const seen = new Set<string>();
  const files: SkillScore[] = [];
  for (const target of targets) {
    for await (const f of walkSkillFiles(target)) {
      const resolved = path.resolve(f);
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      files.push(await lintSkillFile(f, rubric, profile));
    }
  }
  const total = files.reduce((sum, f) => sum + f.score, 0);
  const companionItems: CompanionCliInventoryItem[] = [];
  for (const file of seen) {
    const content = await fs.readFile(file, 'utf-8');
    const body = content.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/)?.[1] ?? content;
    const item = inventoryCompanionCli(file, body);
    if (item) companionItems.push(item);
  }
  return {
    rubric,
    profile,
    threshold: THRESHOLDS[rubric],
    files,
    averageScore: files.length > 0 ? Math.round(total / files.length) : 0,
    failedCount: files.filter((f) => !f.passes).length,
    companionCli: {
      total: companionItems.length,
      reviewCount: companionItems.filter((i) => i.risk === 'review').length,
      items: companionItems,
    },
  };
}

function parseArgs(args: string[]): {
  targets: string[];
  rubric: RubricMode;
  profile: AgentSkillValidationProfile;
  json: boolean;
} {
  const targets: string[] = [];
  let rubric: RubricMode = 'standard';
  let profile: AgentSkillValidationProfile = 'compatible';
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
    } else if (a === '--profile' && i + 1 < args.length) {
      const next = args[++i];
      if (next === 'strict' || next === 'compatible' || next === 'discovery') {
        profile = next;
      }
    } else if (!a.startsWith('-')) {
      targets.push(a);
    }
  }
  if (targets.length === 0) targets.push('agentic/code');
  return { targets, rubric, profile, json };
}

function renderTextReport(report: LintReport): void {
  const { files, threshold, rubric, profile, averageScore, failedCount } = report;

  for (const f of files) {
    if (f.passes && f.conformance.diagnostics.length === 0) continue;
    const mark = !f.passes
      ? '✗'
      : f.conformance.diagnostics.some((item) => item.severity === 'warning')
        ? '⚠'
        : '✓';
    console.log(`${mark} ${f.file} (${f.score}/100, conformance=${f.conformance.state})`);
    for (const item of f.conformance.diagnostics) {
      console.log(
        `    ${item.severity} ${item.code} ${item.yamlPath}: ${item.message}; `
        + `fix: ${item.remediation}`,
      );
    }
    for (const [name, dim] of Object.entries(f.dimensions)) {
      if (!f.passes && dim.score < 100) {
        console.log(`    ${name} (${dim.score}): ${dim.notes.join('; ')}`);
      }
    }
  }

  console.log(`\nskill-lint (rubric=${rubric}, profile=${profile}, threshold=${threshold}):`);
  console.log(`  ${files.length} file(s) scanned`);
  console.log(`  ${failedCount} below threshold`);
  console.log(`  average score: ${averageScore}/100`);
  console.log(`  companion CLI workflows: ${report.companionCli.total} inventoried, ${report.companionCli.reviewCount} need review`);
  for (const item of report.companionCli.items.filter((i) => i.risk === 'review').slice(0, 10)) {
    console.log(`    review ${item.file}: ${item.notes.join('; ')}`);
  }
}

export const skillLintHandler: CommandHandler = {
  id: 'skill-lint',
  name: 'Skill Lint',
  description: 'Score SKILL.md files against a quality rubric',
  category: 'utility',
  aliases: ['-skill-lint', '--skill-lint'],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const { targets, rubric, profile, json } = parseArgs(ctx.args);
    const report = await lintSkills(targets, rubric, profile);

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
