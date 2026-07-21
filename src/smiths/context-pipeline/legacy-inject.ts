import { promises as fs } from 'node:fs';
import path from 'node:path';
import { getProviderDefinition } from '../../providers/provider-definitions.js';
import type { Platform } from '../../agents/types.js';

export const LEGACY_INJECT_START = '<!-- BEGIN AIWG -->';
export const LEGACY_INJECT_END = '<!-- END AIWG -->';

const MANAGED_BLOCKS: Array<[string, string]> = [
  ['<!-- AIWG:context-hook:start -->', '<!-- AIWG:context-hook:end -->'],
  ['<!-- AIWG:claude-md-hook:start -->', '<!-- AIWG:claude-md-hook:end -->'],
  ['<!-- AIWG:provider-bootstrap:start -->', '<!-- AIWG:provider-bootstrap:end -->'],
];

export interface LegacyInjectResult {
  targets: string[];
  backups: string[];
  changed: string[];
  dryRun: boolean;
  warnings: string[];
}

function legacyBlock(content: string): string {
  return [
    LEGACY_INJECT_START,
    '<!-- Legacy compatibility mode. Regenerate with `aiwg regenerate --full-inject`. -->',
    '',
    content.trim(),
    '',
    LEGACY_INJECT_END,
  ].join('\n');
}

function replaceMarked(content: string, start: string, end: string, replacement: string): string | null {
  const first = content.indexOf(start);
  const last = content.indexOf(end);
  if (first < 0 && last < 0) return null;
  if (first < 0 || last < first) throw new Error(`Malformed managed context block: ${start} / ${end}`);
  return content.slice(0, first) + replacement + content.slice(last + end.length);
}

function withoutCanonicalBlocks(content: string): string {
  let output = content;
  for (const [start, end] of MANAGED_BLOCKS) {
    const replaced = replaceMarked(output, start, end, '');
    if (replaced !== null) output = replaced;
  }
  return output.trim();
}

function renderLegacyTarget(existing: string | null, frameworkContent: string): string {
  const block = legacyBlock(frameworkContent);
  if (existing === null) return `${block}\n`;
  const replaced = replaceMarked(existing, LEGACY_INJECT_START, LEGACY_INJECT_END, block);
  if (replaced !== null) return `${replaced.trim()}\n`;
  if (existing.includes('<!-- aiwg-managed -->')) return `${block}\n`;
  const operator = withoutCanonicalBlocks(existing);
  return `${operator ? `${operator}\n\n` : ''}${block}\n`;
}

async function readOptional(file: string): Promise<string | null> {
  try { return await fs.readFile(file, 'utf8'); }
  catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

async function atomicWrite(file: string, content: string): Promise<void> {
  await fs.mkdir(path.dirname(file), { recursive: true });
  const temporary = path.join(path.dirname(file), `.${path.basename(file)}.tmp.${process.pid}`);
  await fs.writeFile(temporary, content, 'utf8');
  try { await fs.rename(temporary, file); }
  catch (error) { await fs.rm(temporary, { force: true }); throw error; }
}

export async function injectLegacyContext(
  provider: Platform,
  projectPath: string,
  frameworkContent: string,
  options: { dryRun?: boolean } = {},
): Promise<LegacyInjectResult> {
  const definition = getProviderDefinition(provider);
  const targets = definition?.context.bootstrapTargets ?? [];
  if (targets.length === 0) {
    return {
      targets: [], backups: [], changed: [], dryRun: Boolean(options.dryRun),
      warnings: [`Provider ${provider} has no project-local startup target for legacy injection.`],
    };
  }
  const backups: string[] = [];
  const changed: string[] = [];
  for (const relative of targets) {
    const target = path.join(projectPath, relative);
    const existing = await readOptional(target);
    const output = renderLegacyTarget(existing, frameworkContent);
    if (existing === output) continue;
    changed.push(target);
    if (options.dryRun) continue;
    if (existing !== null) {
      const backup = `${target}.bak.${new Date().toISOString().replace(/[:.]/g, '-')}`;
      await fs.mkdir(path.dirname(backup), { recursive: true });
      await fs.writeFile(backup, existing, 'utf8');
      backups.push(backup);
    }
    await atomicWrite(target, output);
  }
  return { targets: targets.map(target => path.join(projectPath, target)), backups, changed, dryRun: Boolean(options.dryRun), warnings: [] };
}
