import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const addonRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const REQUIRED_SECTIONS = [
  'Stages',
  'Roles',
  'State Rules',
  'Verification Rules',
  'Evidence Contract',
  'Stopping Conditions',
  'Execution Map',
];
const ALLOWED_KINDS = new Set(['validator', 'script', 'agent', 'flow', 'manual']);

function extractExecutionMap(markdown) {
  const match = markdown.match(/<!-- nlah:execution-map:start -->\s*```json\s*([\s\S]*?)```\s*<!-- nlah:execution-map:end -->/m);
  if (!match) throw new Error('NLAH execution map markers and JSON block are required.');
  return JSON.parse(match[1]);
}

export function parseNlah(markdown) {
  const headings = [...markdown.matchAll(/^##\s+(.+?)\s*$/gm)].map((match) => match[1]);
  const clauses = [...markdown.matchAll(/^-\s+MUST\s+\[([a-z0-9-]+)\]:\s+(.+)$/gmi)]
    .map((match) => ({ id: match[1], text: match[2] }));
  const ambiguous = [...markdown.matchAll(/^-\s+(SHOULD|MAY)\s+\[?([a-z0-9-]*)\]?:?\s*(.+)$/gmi)]
    .map((match) => ({ strength: match[1].toUpperCase(), id: match[2] || null, text: match[3] }));
  return { headings, clauses, ambiguous, executionMap: extractExecutionMap(markdown) };
}

export function validateNlah(markdown) {
  const parsed = parseNlah(markdown);
  const missingSections = REQUIRED_SECTIONS.filter((section) => !parsed.headings.includes(section));
  const modules = parsed.executionMap.modules;
  if (!Array.isArray(modules) || modules.length === 0) throw new Error('Execution map requires modules[].');
  const mappings = modules.flatMap((module) => {
    if (!module.id || !Array.isArray(module.clauses)) throw new Error('Each execution module requires id and clauses[].');
    return module.clauses.map((clause) => ({ ...clause, module: module.id }));
  });
  for (const mapping of mappings) {
    if (!mapping.id || !ALLOWED_KINDS.has(mapping.kind) || !mapping.target || !mapping.stage) {
      throw new Error(`Invalid deterministic mapping for clause '${mapping.id ?? 'unknown'}'.`);
    }
  }
  const counts = new Map();
  for (const mapping of mappings) counts.set(mapping.id, (counts.get(mapping.id) ?? 0) + 1);
  const unmapped = parsed.clauses.filter((clause) => !counts.has(clause.id)).map((clause) => clause.id);
  const duplicateMappings = [...counts.entries()].filter(([, count]) => count !== 1).map(([id]) => id);
  const undeclaredMappings = mappings.filter((mapping) => !parsed.clauses.some((clause) => clause.id === mapping.id)).map((mapping) => mapping.id);
  return {
    schema_version: parsed.executionMap.version ?? '1',
    valid: missingSections.length === 0 && unmapped.length === 0 && duplicateMappings.length === 0 && undeclaredMappings.length === 0,
    required_sections: {present: REQUIRED_SECTIONS.filter((section) => parsed.headings.includes(section)), missing: missingSections},
    executable_clauses: parsed.clauses,
    mappings,
    ambiguous_clauses: parsed.ambiguous,
    comparison_to_current_flow: parsed.executionMap.comparison ?? null,
    diagnostics: {unmapped, duplicate_mappings: duplicateMappings, undeclared_mappings: undeclaredMappings},
  };
}

export function planNlah(markdown) {
  const report = validateNlah(markdown);
  if (!report.valid) throw new Error(`NLAH validation failed: ${JSON.stringify(report.diagnostics)}`);
  const stages = [...new Set(report.mappings.map((mapping) => mapping.stage))];
  return {
    schema_version: report.schema_version,
    mode: 'plan-only',
    stages: stages.map((stage) => ({
      stage,
      actions: report.mappings.filter((mapping) => mapping.stage === stage),
    })),
    manual_gates: report.mappings.filter((mapping) => mapping.kind === 'manual'),
    ambiguous_clauses: report.ambiguous_clauses,
    comparison_to_current_flow: report.comparison_to_current_flow,
    execution_warning: 'Natural-language prose is not executable; only validated mappings may be dispatched by an authorized runtime.',
  };
}

export function ablateNlah(markdown, moduleId) {
  if (!moduleId) throw new Error('--remove requires a module id.');
  const parsed = parseNlah(markdown);
  const baseline = validateNlah(markdown);
  const removed = parsed.executionMap.modules.find((module) => module.id === moduleId);
  if (!removed) throw new Error(`Unknown NLAH module '${moduleId}'.`);
  const remainingMappings = baseline.mappings.filter((mapping) => mapping.module !== moduleId);
  return {
    schema_version: baseline.schema_version,
    ablation: {removed_module: moduleId, removed_clauses: removed.clauses.map((clause) => clause.id)},
    comparison: {
      baseline_mapping_count: baseline.mappings.length,
      ablated_mapping_count: remainingMappings.length,
      coverage_delta: remainingMappings.length - baseline.mappings.length,
      newly_unmapped_clauses: removed.clauses.map((clause) => clause.id),
      ambiguous_clauses: baseline.ambiguous_clauses,
      comparison_to_current_flow: baseline.comparison_to_current_flow,
    },
    result: 'comparison-only',
  };
}

function option(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

export default async function nlahCommand(args, context) {
  const subcommand = context.subcommand;
  if (args.includes('--help') || args.includes('-h')) {
    return {exitCode: 0, message: `Usage: aiwg harness ${subcommand} [NLAH.md]${subcommand === 'ablate' ? ' --remove MODULE' : ''}`};
  }
  const documentArg = args.find((arg, index) => !arg.startsWith('--') && args[index - 1] !== '--remove');
  const documentPath = documentArg
    ? path.resolve(context.cwd, documentArg)
    : path.join(addonRoot, 'fixtures', 'research-evaluation', 'NLAH.md');
  const markdown = await fs.readFile(documentPath, 'utf8');
  const report = subcommand === 'validate'
    ? validateNlah(markdown)
    : subcommand === 'plan'
      ? planNlah(markdown)
      : ablateNlah(markdown, option(args, '--remove'));
  return {exitCode: report.valid === false ? 1 : 0, message: JSON.stringify(report, null, 2)};
}
