import { assessWritingFidelity, type FidelityAssessment } from '../writing/fidelity.js';
import { parseWritingBrief, type WritingBrief } from '../writing/writing-brief.js';
import type { ResolvedOutputMode } from './types.js';

export interface OutputModeValidationDiagnostic {
  mode: string;
  level: ResolvedOutputMode['validation']['level'];
  message: string;
}

export interface OutputModeRuntimeOptions {
  transform: (content: string, mode: ResolvedOutputMode) => Promise<string> | string;
  validate?: (content: string, mode: ResolvedOutputMode) => Promise<{ valid: boolean; message?: string }> | { valid: boolean; message?: string };
  onMandatoryValidationFailure?: 'unaltered' | 'fail';
  validationTimeoutMs?: number;
  fidelity?: { brief: WritingBrief };
  validateFinal?: (original: string, candidate: string) => Promise<{ outcome: 'pass' | 'fail' | 'uncertain'; message?: string }> | { outcome: 'pass' | 'fail' | 'uncertain'; message?: string };
  requireFinalValidator?: boolean;
}

export interface OutputModeRuntimeResult {
  content: string;
  diagnostics: OutputModeValidationDiagnostic[];
  applied: string[];
  fallback: 'none' | 'unaltered';
  attempted?: string[];
  retained?: string[];
  fidelity?: FidelityAssessment;
}

type ProtectedLiteral = { token: string; value: string };

function protectedPattern(classes: string[]): RegExp | null {
  const set = new Set(classes);
  const alternatives: string[] = [];
  if (set.has('machine-readable-blocks') || set.has('code')) {
    alternatives.push('^ {0,3}(?<backtickFence>`{3,})[^\\n]*\\n[\\s\\S]*?(?:^ {0,3}\\k<backtickFence>`*[ \\t]*$|(?![\\s\\S]))');
    alternatives.push('^ {0,3}(?<tildeFence>~{3,})[^\\n]*\\n[\\s\\S]*?(?:^ {0,3}\\k<tildeFence>~*[ \\t]*$|(?![\\s\\S]))');
  }
  if (set.has('code') || set.has('commands')) alternatives.push('(?<!`)(?<ticks>`+)(?!`)[\\s\\S]*?(?<!`)\\k<ticks>(?!`)');
  if (set.has('quoted-text')) alternatives.push('^ {0,3}>.*(?:\\n {0,3}>.*)*', '“[^”]*”', '"[^"\\n]+"');
  if (set.has('citations')) alternatives.push('\\[[^\\]\\n]+\\]\\([^\\s)]+\\)', '\\[[0-9]+\\]');
  if (set.has('identifiers')) alternatives.push('\\b(?:[A-Za-z_$][\\w$]*\\.)+[A-Za-z_$][\\w$]*\\b', '\\b[A-Z][A-Z0-9_]{2,}\\b');
  return alternatives.length ? new RegExp(alternatives.join('|'), 'gm') : null;
}

function markdownLinkRanges(content: string): Array<{ start: number; end: number }> {
  const ranges: Array<{ start: number; end: number }> = [];
  for (let start = 0; start < content.length; start++) {
    if (content[start] !== '[' || content[start - 1] === '\\') continue;
    let at = start + 1, brackets = 1;
    for (; at < content.length && brackets; at++) {
      if (content[at] === '\\') { at++; continue; }
      if (content[at] === '[') brackets++;
      if (content[at] === ']') brackets--;
    }
    if (brackets || content[at] !== '(') continue;
    let depth = 1; let quote = '';
    for (at++; at < content.length && depth; at++) {
      const char = content[at];
      if (char === '\\') { at++; continue; }
      if (quote) { if (char === quote) quote = ''; continue; }
      if ((char === '"' || char === "'") && /\s/.test(content[at - 1])) { quote = char; continue; }
      if (char === '(') depth++;
      if (char === ')') depth--;
    }
    if (!depth) { ranges.push({ start, end: at }); start = at - 1; }
  }
  return ranges;
}

function protect(content: string, classes: string[]): { content: string; literals: ProtectedLiteral[] } {
  const literals: ProtectedLiteral[] = [];
  const pattern = protectedPattern(classes);
  const ranges = pattern ? [...content.matchAll(pattern)].map(m => ({ start: m.index!, end: m.index! + m[0].length })) : [];
  if (classes.includes('citations')) ranges.push(...markdownLinkRanges(content));
  ranges.sort((a, b) => a.start - b.start || b.end - a.end);
  const merged: typeof ranges = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range.start < last.end) last.end = Math.max(last.end, range.end);
    else merged.push({ ...range });
  }
  let tokenPrefix = '\uE000AIWG_OUTPUT_MODE_';
  while (content.includes(tokenPrefix)) tokenPrefix += '_';
  let protectedContent = ''; let cursor = 0;
  for (const range of merged) {
    const token = `${tokenPrefix}${literals.length}\uE001`;
    literals.push({ token, value: content.slice(range.start, range.end) });
    protectedContent += content.slice(cursor, range.start) + token;
    cursor = range.end;
  }
  return { content: protectedContent + content.slice(cursor), literals };
}

function restore(content: string, literals: ProtectedLiteral[], mode: string): string {
  let restored = content;
  for (const literal of literals) {
    const occurrences = restored.split(literal.token).length - 1;
    if (occurrences !== 1) throw new Error(`Output mode '${mode}' modified, removed, or duplicated a protected literal.`);
    restored = restored.replace(literal.token, () => literal.value);
  }
  if (literals.length && restored.includes(literals[0].token.slice(0, -2))) throw new Error(`Output mode '${mode}' introduced an invalid protected literal token.`);
  return restored;
}

async function bounded<T>(action: () => Promise<T> | T, milliseconds: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([Promise.resolve().then(action), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error('Output validation timed out.')), milliseconds);
    })]);
  } finally { if (timer) clearTimeout(timer); }
}

export async function applyOutputModes(input: string, modes: ResolvedOutputMode[], options: OutputModeRuntimeOptions): Promise<OutputModeRuntimeResult> {
  options = { ...options, ...(options.fidelity ? { fidelity: { brief: parseWritingBrief(options.fidelity.brief) } } : {}) };
  if (modes.length === 0 && !options.requireFinalValidator && !options.fidelity && !options.validateFinal) return { content: input, diagnostics: [], applied: [], fallback: 'none' };
  const activeModes = structuredClone(modes).filter(mode => mode.id !== 'unaltered');
  const brief = options.fidelity ? parseWritingBrief(options.fidelity.brief) : undefined;
  let content = input;
  const diagnostics: OutputModeValidationDiagnostic[] = [];
  const attempted: string[] = [];
  const applied: string[] = [];
  const timeout = options.validationTimeoutMs ?? 30_000;
  if (!Number.isFinite(timeout) || timeout <= 0 || timeout > 300_000) throw new Error('Invalid output validation timeout.');
  // Earlier stage protection remains mandatory through later presentation passes.
  const protectedClasses = [...new Set(activeModes.flatMap(mode => mode.protectedContent ?? []))];
  let fidelity: FidelityAssessment | undefined;
  let currentMode = 'final';
  let level: ResolvedOutputMode['validation']['level'] = 'validated';
  try {
    for (const mode of activeModes) {
      currentMode = mode.id; level = mode.validation.level;
      attempted.push(mode.id);
      const masked = protect(content, protectedClasses);
      const transformed = await options.transform(masked.content, structuredClone(mode));
      if (typeof transformed !== 'string') throw new Error('Output transform returned a non-string result.');
      content = restore(transformed, masked.literals, mode.id);
      if (mode.validation.level !== 'advisory') {
        if (!options.validate) throw new Error('Mandatory output validator is missing.');
        const result = await bounded(() => options.validate!(content, structuredClone(mode)), timeout);
        if (result?.valid !== true) {
          diagnostics.push({ mode: mode.id, level: mode.validation.level, message: result?.message ?? 'Mandatory output validation did not pass.' });
          throw new Error('Mandatory output validation did not pass.');
        }
      }
      applied.push(mode.id);
    }
    currentMode = 'final'; level = 'validated';
    // Recheck every mandatory stage against final prose, including structure/presentation changes.
    for (const mode of activeModes.filter(mode => mode.validation.level !== 'advisory')) {
      if (!options.validate) throw new Error('Mandatory output validator is missing.');
      const result = await bounded(() => options.validate!(content, structuredClone(mode)), timeout);
      if (result?.valid !== true) {
        diagnostics.push({ mode: mode.id, level: mode.validation.level, message: result?.message ?? 'Mandatory validation of final output did not pass.' });
        throw new Error('Mandatory validation of final output did not pass.');
      }
    }
    if (brief) {
      fidelity = assessWritingFidelity(input, content, brief);
      if (fidelity.outcome === 'fail') throw new Error('Final fidelity guards detected a material change.');
    }
    if (options.requireFinalValidator && !options.validateFinal) throw new Error('Required final validator is missing.');
    if (options.validateFinal) {
      const final = await bounded(() => options.validateFinal!(input, content), timeout);
      if (final?.outcome !== 'pass') throw new Error('Final semantic validation failed or requires review.');
    } else if (fidelity?.outcome === 'uncertain') throw new Error('Changed prose requires semantic review.');
    return { content, diagnostics, applied, attempted, retained: [...applied], fallback: 'none', ...(fidelity ? { fidelity } : {}) };
  } catch (error) {
    if (!diagnostics.length) diagnostics.push({ mode: currentMode, level, message: error instanceof Error && /^(Output mode|Output validation|Mandatory|Required final|Final |Changed prose)/.test(error.message) ? error.message : 'Output transformation or validation failed.' });
    if (options.onMandatoryValidationFailure === 'fail' || (options.onMandatoryValidationFailure === undefined && error instanceof Error && error.message.includes('protected literal'))) throw error;
    return { content: input, diagnostics, applied: [], attempted, retained: [], fallback: 'unaltered', ...(fidelity ? { fidelity } : {}) };
  }
}
