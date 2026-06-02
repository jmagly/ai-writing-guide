/**
 * Corpus integrity / submission-risk scan (#1506). TS-native port of section9
 * `scripts/corpus/llm_artifact_scan.py`.
 *
 * Conservative triage: flags artifacts carrying LLM residue, placeholder/
 * template markers, unresolved citation markers, or non-final experiment
 * language so they get human review before induction/scoring/synthesis. It
 * does NOT decide misconduct. Reports by default; `--quarantine` writes a
 * per-REF report under `.aiwg/research/quarantine/` (source files untouched).
 *
 * The regex catalog is externalized (epic #1496 principle #3): the built-in
 * `DEFAULT_INTEGRITY_PATTERNS` is overridable per-corpus via
 * `documentation/integrity-patterns.yaml`.
 *
 * @source historical: corpus/llm_artifact_scan.py
 * @tests @test/unit/artifacts/integrity-scan.test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { load as loadYaml } from 'js-yaml';

export type Severity = 'none' | 'low' | 'medium' | 'high' | 'critical';

export interface IntegrityPattern {
  category: string;
  severity: Severity;
  weight: number;
  /** Case-insensitive source (compiled with the `i` flag). */
  regex: string;
  description: string;
}

export interface Finding {
  ref: string;
  path: string;
  line: number;
  category: string;
  severity: Severity;
  weight: number;
  description: string;
  excerpt: string;
}

export interface RefSummary {
  ref: string;
  score: number;
  highestSeverity: Severity;
  findingCount: number;
  categories: Record<string, number>;
  recommendation: 'pass' | 'review' | 'quarantine';
}

export interface ScanResult {
  findings: Finding[];
  summary: Record<string, RefSummary>;
}

const TEXT_SUFFIXES = new Set(['.md', '.txt', '.tex', '.bib', '.yaml', '.yml', '.html', '.htm']);
const SKIP_DIRS = new Set(['.git', '__pycache__', 'node_modules']);
const DEFAULT_TARGET_DIRS = [
  ['documentation', 'references'],
  ['documentation', 'citations'],
  ['documentation', 'radar'],
];
const PATTERNS_FILE = ['documentation', 'integrity-patterns.yaml'];

/** Built-in pattern catalog. Ports the section9 PATTERNS list. */
export const DEFAULT_INTEGRITY_PATTERNS: IntegrityPattern[] = [
  { category: 'llm-meta-comment', severity: 'critical', weight: 35, regex: "\\b(as an ai language model|i cannot|i can(?:not|'t) browse|here is a \\d+\\s+word summary)\\b", description: 'Visible assistant/system meta-comment' },
  { category: 'llm-meta-comment', severity: 'critical', weight: 35, regex: '\\b(would you like me to|let me know if you want|i hope this helps|i have provided)\\b', description: 'Conversational assistant residue' },
  { category: 'placeholder-data', severity: 'critical', weight: 40, regex: '\\b(fill (?:in|this) with (?:the )?real (?:numbers|data|results)|replace with actual|insert actual)\\b', description: 'Explicit instruction to replace fabricated or illustrative data' },
  { category: 'placeholder-data', severity: 'high', weight: 25, regex: '\\b(placeholder|dummy data|sample data|illustrative only|synthetic example values?)\\b', description: 'Placeholder or illustrative data language' },
  { category: 'template-residue', severity: 'high', weight: 25, regex: '(\\[to be filled\\]|\\[todo\\]|\\btodo:\\s*(add|fill|insert|replace)|tbd\\b|xxx)', description: 'Template residue or unfinished TODO marker' },
  { category: 'citation-risk', severity: 'high', weight: 25, regex: '(\\[(citation|reference|source) needed\\]|\\b(citation needed|reference needed|source needed|add citation here)\\b)', description: 'Unresolved citation verification marker' },
  { category: 'experiment-risk', severity: 'high', weight: 25, regex: '\\b(results? (?:are|is) (?:simulated|fabricated|mock|not final)|numbers? (?:are|is) (?:made up|illustrative))\\b', description: 'Experiment or table result is not final/real' },
  { category: 'submission-risk', severity: 'low', weight: 5, regex: '\\b(position paper|survey paper|review article|literature review)\\b', description: 'Content type may need venue/peer-review check before submission' },
  { category: 'ai-disclosure', severity: 'low', weight: 2, regex: '\\b(chatgpt|claude|gemini|copilot|large language model|llm-generated|ai-generated)\\b', description: 'AI/tooling disclosure or generated-content mention' },
];

interface CompiledPattern extends IntegrityPattern {
  re: RegExp;
}

/** Load the pattern catalog (corpus override → built-in default), compiled. */
export function loadIntegrityPatterns(root: string): CompiledPattern[] {
  let patterns = DEFAULT_INTEGRITY_PATTERNS;
  const file = path.join(root, ...PATTERNS_FILE);
  if (fs.existsSync(file)) {
    try {
      const raw = loadYaml(fs.readFileSync(file, 'utf-8'));
      if (Array.isArray(raw) && raw.length) patterns = raw as IntegrityPattern[];
    } catch {
      /* malformed override → fall back to defaults */
    }
  }
  return patterns.map((p) => ({ ...p, re: new RegExp(p.regex, 'i') }));
}

const SEVERITY_RANK: Record<Severity, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 };

function refFromPath(p: string): string {
  const m = p.match(/REF-\d{3,}[a-z]?/);
  return m ? m[0] : 'NO-REF';
}

function excerpt(line: string, limit = 220): string {
  const compact = line.trim().split(/\s+/).join(' ');
  return compact.length <= limit ? compact : compact.slice(0, limit - 3) + '...';
}

function* iterFiles(targets: string[]): Generator<string> {
  for (const target of targets) {
    if (!fs.existsSync(target)) continue;
    const stat = fs.statSync(target);
    if (stat.isFile()) {
      if (TEXT_SUFFIXES.has(path.extname(target).toLowerCase())) yield target;
      continue;
    }
    const stack = [target];
    while (stack.length) {
      const dir = stack.pop()!;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
        if (entry.isDirectory()) {
          if (!SKIP_DIRS.has(entry.name)) stack.push(path.join(dir, entry.name));
        } else if (TEXT_SUFFIXES.has(path.extname(entry.name).toLowerCase())) {
          yield path.join(dir, entry.name);
        }
      }
    }
  }
}

function scanFile(root: string, file: string, patterns: CompiledPattern[]): Finding[] {
  const findings: Finding[] = [];
  const ref = refFromPath(file);
  const rel = path.relative(root, file);
  let lines: string[];
  try {
    lines = fs.readFileSync(file, 'utf-8').split('\n');
  } catch (e) {
    return [{ ref, path: rel, line: 0, category: 'read-error', severity: 'high', weight: 20, description: `Could not read file: ${String(e)}`, excerpt: '' }];
  }
  for (let i = 0; i < lines.length; i++) {
    for (const p of patterns) {
      if (p.re.test(lines[i])) {
        findings.push({ ref, path: rel, line: i + 1, category: p.category, severity: p.severity, weight: p.weight, description: p.description, excerpt: excerpt(lines[i]) });
      }
    }
  }
  return findings;
}

function recommendation(score: number, highest: Severity): RefSummary['recommendation'] {
  if (highest === 'critical') return 'quarantine';
  if (score >= 50 && SEVERITY_RANK[highest] >= SEVERITY_RANK.high) return 'quarantine';
  if (score >= 20 || SEVERITY_RANK[highest] >= SEVERITY_RANK.high) return 'review';
  return 'pass';
}

function scoreFindings(findings: Finding[]): Record<string, RefSummary> {
  const byRef: Record<string, RefSummary> = {};
  for (const f of findings) {
    const rec = (byRef[f.ref] ??= { ref: f.ref, score: 0, highestSeverity: 'none', findingCount: 0, categories: {}, recommendation: 'pass' });
    rec.score += f.weight;
    rec.findingCount += 1;
    rec.categories[f.category] = (rec.categories[f.category] ?? 0) + 1;
    if (SEVERITY_RANK[f.severity] > SEVERITY_RANK[rec.highestSeverity]) rec.highestSeverity = f.severity;
  }
  for (const rec of Object.values(byRef)) {
    rec.score = Math.min(100, rec.score);
    rec.recommendation = recommendation(rec.score, rec.highestSeverity);
  }
  return byRef;
}

export interface ScanOptions {
  /** Limit to paths containing this REF id (e.g. "REF-888"). */
  ref?: string;
  /** Explicit target files/dirs (relative to root or absolute). Defaults to the corpus text dirs. */
  targets?: string[];
}

export function scanCorpus(root: string, opts: ScanOptions = {}): ScanResult {
  const patterns = loadIntegrityPatterns(root);
  const targets = opts.targets && opts.targets.length
    ? opts.targets.map((t) => (path.isAbsolute(t) ? t : path.join(root, t)))
    : DEFAULT_TARGET_DIRS.map((parts) => path.join(root, ...parts));

  const findings: Finding[] = [];
  for (const file of iterFiles(targets)) {
    if (opts.ref && !file.includes(opts.ref)) continue;
    findings.push(...scanFile(root, file, patterns));
  }
  return { findings, summary: scoreFindings(findings) };
}

export function renderScan(result: ScanResult): string {
  const out: string[] = [];
  out.push('LLM Artifact / Integrity Scan');
  out.push(`Findings: ${result.findings.length}`);
  const recs = Object.values(result.summary);
  out.push(`REFs flagged: ${recs.length}`);
  out.push('');
  if (!recs.length) {
    out.push('No suspect patterns found.');
    return out.join('\n') + '\n';
  }
  out.push(`${'REF'.padEnd(12)} ${'score'.padEnd(6)} ${'severity'.padEnd(10)} ${'rec'.padEnd(11)} findings  categories`);
  for (const rec of recs.sort((a, b) => b.score - a.score || a.ref.localeCompare(b.ref))) {
    const cats = Object.entries(rec.categories).sort().map(([k, v]) => `${k}=${v}`).join(', ');
    out.push(`${rec.ref.padEnd(12)} ${String(rec.score).padEnd(6)} ${rec.highestSeverity.padEnd(10)} ${rec.recommendation.padEnd(11)} ${String(rec.findingCount).padEnd(8)} ${cats}`);
  }
  return out.join('\n') + '\n';
}

/** Write per-REF quarantine reports for `quarantine`-recommended REFs. Returns relative paths written. */
export function writeQuarantineReports(root: string, result: ScanResult): string[] {
  const dir = path.join(root, '.aiwg', 'research', 'quarantine');
  const byRef: Record<string, Finding[]> = {};
  for (const f of result.findings) (byRef[f.ref] ??= []).push(f);

  const written: string[] = [];
  for (const rec of Object.values(result.summary).sort((a, b) => a.ref.localeCompare(b.ref))) {
    if (rec.recommendation !== 'quarantine') continue;
    fs.mkdirSync(dir, { recursive: true });
    const lines = [
      '---', `ref: ${rec.ref}`, 'type: llm-artifact-scan', `score: ${rec.score}`,
      `highest-severity: ${rec.highestSeverity}`, `recommendation: ${rec.recommendation}`, '---', '',
      `# ${rec.ref} LLM Artifact Scan`, '',
      'Triage artifact (possible LLM residue / placeholders / submission risk) — not a misconduct determination.', '',
      '## Summary', '',
      `- Score: ${rec.score}/100`, `- Highest severity: ${rec.highestSeverity}`,
      `- Findings: ${rec.findingCount}`, `- Recommendation: ${rec.recommendation}`, '',
      '## Findings', '', '| Severity | Category | File | Line | Excerpt |', '|---|---|---|---:|---|',
    ];
    for (const f of byRef[rec.ref] ?? []) {
      lines.push(`| ${f.severity} | ${f.category} | ${f.path} | ${f.line} | ${f.excerpt.replace(/\|/g, '\\|')} |`);
    }
    lines.push('', '## Required Triage', '',
      '- Confirm each finding is source-authored text, OCR noise, or generated-note residue.',
      '- Source-authored residue → downgrade trust/grade until externally verified.',
      '- Generated-note residue → fix the note and rerun the scan.',
      '- Do not use this REF in synthesis until the quarantine recommendation clears.');
    const file = path.join(dir, `${rec.ref}-llm-artifact-scan.md`);
    fs.writeFileSync(file, lines.join('\n') + '\n');
    written.push(path.relative(root, file));
  }
  return written;
}

/** True if any REF reaches the fail threshold (quarantine, or review+quarantine when threshold=review). */
export function failsThreshold(result: ScanResult, threshold: 'review' | 'quarantine'): boolean {
  return Object.values(result.summary).some(
    (r) => r.recommendation === threshold || (threshold === 'review' && r.recommendation === 'quarantine'),
  );
}
