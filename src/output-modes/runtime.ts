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
}

export interface OutputModeRuntimeResult {
  content: string;
  diagnostics: OutputModeValidationDiagnostic[];
  applied: string[];
  fallback: 'none' | 'unaltered';
}

type ProtectedLiteral = { token: string; value: string };

function protectedPattern(classes: string[]): RegExp | null {
  const set = new Set(classes);
  const alternatives: string[] = [];
  if (set.has('machine-readable-blocks') || set.has('code')) alternatives.push('```[\\s\\S]*?```');
  if (set.has('code') || set.has('commands')) alternatives.push('`[^`\\n]+`');
  if (set.has('quoted-text')) alternatives.push('^>.*(?:\\n>.*)*', '“[^”]*”', '"[^"\\n]+"');
  if (set.has('citations')) alternatives.push('\\[[^\\]\\n]+\\]\\([^\\s)]+\\)', '\\[[0-9]+\\]');
  if (set.has('identifiers')) alternatives.push('\\b(?:[A-Za-z_$][\\w$]*\\.)+[A-Za-z_$][\\w$]*\\b', '\\b[A-Z][A-Z0-9_]{2,}\\b');
  return alternatives.length ? new RegExp(alternatives.join('|'), 'gm') : null;
}

function protect(content: string, classes: string[]): { content: string; literals: ProtectedLiteral[] } {
  const literals: ProtectedLiteral[] = [];
  const pattern = protectedPattern(classes);
  let tokenPrefix = '\uE000AIWG_OUTPUT_MODE_';
  while (content.includes(tokenPrefix)) tokenPrefix += '_';
  const protectedContent = pattern ? content.replace(pattern, value => {
    const token = `${tokenPrefix}${literals.length}\uE001`;
    literals.push({ token, value });
    return token;
  }) : content;
  return { content: protectedContent, literals };
}

function restore(content: string, literals: ProtectedLiteral[], mode: string): string {
  let restored = content;
  for (const literal of literals) {
    const occurrences = restored.split(literal.token).length - 1;
    if (occurrences !== 1) throw new Error(`Output mode '${mode}' modified, removed, or duplicated a protected literal.`);
    restored = restored.replace(literal.token, literal.value);
  }
  return restored;
}

export async function applyOutputModes(input: string, modes: ResolvedOutputMode[], options: OutputModeRuntimeOptions): Promise<OutputModeRuntimeResult> {
  if (modes.length === 0) return { content: input, diagnostics: [], applied: [], fallback: 'none' };
  let content = input;
  const diagnostics: OutputModeValidationDiagnostic[] = [];
  const applied: string[] = [];
  for (const mode of modes) {
    const masked = protect(content, mode.protectedContent ?? []);
    const transformed = await options.transform(masked.content, mode);
    if (typeof transformed !== 'string') throw new Error(`Output mode '${mode.id}' transform returned a non-string result.`);
    content = restore(transformed, masked.literals, mode.id);
    if (mode.validation.level !== 'advisory') {
      if (!options.validate) throw new Error(`Output mode '${mode.id}' declares ${mode.validation.level} validation but no validator is configured.`);
      const result = await options.validate(content, mode);
      if (!result.valid) {
        diagnostics.push({ mode: mode.id, level: mode.validation.level, message: result.message ?? 'validation failed' });
        if ((options.onMandatoryValidationFailure ?? 'unaltered') === 'fail') throw new Error(`Output mode '${mode.id}' validation failed: ${result.message ?? 'no diagnostic'}`);
        return { content: input, diagnostics, applied, fallback: 'unaltered' };
      }
    }
    applied.push(mode.id);
  }
  return { content, diagnostics, applied, fallback: 'none' };
}
