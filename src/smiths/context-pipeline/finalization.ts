/**
 * Context-finalization pass for generated provider context files.
 *
 * Templates provide the stable structure; this pass stitches in current
 * workspace facts from `.aiwg/aiwg.config` and the discover-first protocol so
 * provider context files do not remain template-only (#1365).
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { readAiwgConfig, type AiwgConfig } from '../../config/aiwg-config.js';

export const FINALIZATION_START = '<!-- aiwg-context-finalization:START -->';
export const FINALIZATION_END = '<!-- aiwg-context-finalization:END -->';
const AIWG_SIGNATURE_COMMENT = '<!-- aiwg-managed -->';

function formatList(values: readonly string[]): string {
  return values.length > 0 ? values.join(', ') : 'none recorded';
}

async function readConfig(projectPath: string): Promise<AiwgConfig | null> {
  try {
    return await readAiwgConfig(projectPath);
  } catch {
    return null;
  }
}

export async function buildContextFinalizationBlock(projectPath: string): Promise<string> {
  const config = await readConfig(projectPath);
  const providers = config?.providers ?? [];
  const installed = Object.entries(config?.installed ?? {});
  const installedNames = installed.map(([name]) => name);
  const providerDeployments = new Set<string>();

  for (const [, entry] of installed) {
    for (const provider of Object.keys(entry.deployedTo ?? {})) {
      providerDeployments.add(provider);
    }
  }

  const lines = [
    FINALIZATION_START,
    '## Context Finalization',
    '',
    'This section is synthesized after template emission from the current workspace state. Preserve operator-authored content outside AIWG-managed blocks; rerun `aiwg regenerate` to refresh this section after provider, framework, or MCP wiring changes.',
    '',
    '### Workspace Snapshot',
    '',
    `- Configured providers: ${formatList(providers)}`,
    `- Installed frameworks/addons: ${formatList(installedNames)}`,
    `- Recorded deployments: ${formatList([...providerDeployments].sort())}`,
    '- Normalized project context: `.aiwg/AIWG.md`',
    '',
    '### Discover-First Protocol',
    '',
    'Before declining an AIWG request as out of scope or inventing a workflow from memory, run `aiwg discover "<the user need>"`. The CLI ranks AIWG capabilities across the installed corpus. Fetch the selected item with `aiwg show <type> <name>`. This prevents decline-without-search failures and hallucinated skill or agent names. Full rule: `agentic/code/addons/aiwg-utils/rules/skill-discovery.md`.',
    '',
    '### Source Model',
    '',
    '- `.aiwg/AIWG.md` is the normalized project-local context entry point.',
    '- Root `AIWG.md` is the generated cross-provider companion loaded through `AGENTS.md` and provider twins.',
    '- `AGENTS.md`, `WARP.md`, `.hermes.md`, and `.github/copilot-instructions.md` are provider-facing bridges, not replacements for `.aiwg/AIWG.md`.',
    FINALIZATION_END,
    '',
  ];

  return lines.join('\n');
}

export function replaceOrAppendFinalizationBlock(content: string, block: string): string {
  const pattern = new RegExp(
    `${FINALIZATION_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${FINALIZATION_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\n?`,
  );

  if (pattern.test(content)) {
    return content.replace(pattern, block);
  }

  const trimmed = content.replace(/\s+$/, '');
  return `${trimmed}\n\n${block}`;
}

export async function buildNormalizedAiwgMd(projectPath: string, existing = ''): Promise<string> {
  const block = await buildContextFinalizationBlock(projectPath);
  const base = existing.trim().length > 0
    ? existing
    : [
        '# AIWG.md',
        AIWG_SIGNATURE_COMMENT,
        '<!-- Normalized project-local AIWG context. Operator notes may live outside AIWG-managed blocks. -->',
        '',
        'This file is the stable `.aiwg/AIWG.md` entry point for AIWG skills, rules, and generated provider context.',
        '',
      ].join('\n');

  const signed = base.includes(AIWG_SIGNATURE_COMMENT)
    ? base
    : base.replace(/^([^\n]*)(\n|$)/, `$1\n${AIWG_SIGNATURE_COMMENT}\n`);

  return replaceOrAppendFinalizationBlock(signed, block);
}

export async function writeNormalizedAiwgMd(projectPath: string): Promise<string> {
  const targetPath = path.join(projectPath, '.aiwg', 'AIWG.md');
  let existing = '';
  try {
    existing = await fs.readFile(targetPath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  const content = await buildNormalizedAiwgMd(projectPath, existing);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.writeFile(targetPath, content.endsWith('\n') ? content : `${content}\n`, 'utf8');
  return targetPath;
}
