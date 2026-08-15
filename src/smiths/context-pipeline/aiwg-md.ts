/**
 * AIWG.md generator — content-rich CLAUDE.md companion for non-Claude providers.
 *
 * Per ADR-1 §0.5: AIWG.md at project root has the same content shape as
 * CLAUDE.md. Both files `@`-reference the project's `.aiwg/AIWG.md` (the
 * source of truth). Non-Claude providers reach AIWG.md transitively via the
 * provider startup adapters. WORKSPACE.md and AIWG.md contain
 * identical framework prose; they exist as two named files because Claude
 * Code looks for `CLAUDE.md` and the seven AGENTS.md providers reach
 * AIWG.md via the AGENTS.md hook-up.
 *
 * Generation strategy: read the project's CLAUDE.md (which already exists in
 * a properly-configured repo) and emit AIWG.md as the same content with the
 * AIWG signature comment in place. If CLAUDE.md is absent (early-init repos),
 * fall back to a minimal stub that points readers at `.aiwg/AIWG.md`.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { projectControlPath } from '../../config/project-artifacts.js';
import { buildParallelismSection, replaceOrAppendParallelismBlock } from './parallelism-section.js';
import { buildContextFinalizationBlock, replaceOrAppendFinalizationBlock } from './finalization.js';
import {
  buildExternalLinksSection,
  replaceOrAppendExternalLinksBlock,
} from './external-links-section.js';

const AIWG_SIGNATURE_COMMENT = '<!-- aiwg-managed -->';

/**
 * Build the AIWG.md content for emission at project root.
 *
 * - When CLAUDE.md exists at project root: copy its content with the AIWG
 *   signature comment inserted in the second line so future runs of the
 *   generator know the file is AIWG-managed.
 * - When CLAUDE.md does not exist: emit a minimal stub directing readers to
 *   the project's `.aiwg/AIWG.md` source.
 *
 * Returns the rendered content as a string. Caller is responsible for the
 * atomic-write emission and the operator-claimed-file detection.
 */
export async function buildAiwgMdContent(
  projectPath: string,
  stagedClaudeMdContent?: string | null,
): Promise<string> {
  let claudeMdContent = stagedClaudeMdContent;
  if (stagedClaudeMdContent === undefined) {
    const claudeMdPath = path.join(projectPath, 'CLAUDE.md');
    try {
      claudeMdContent = await fs.readFile(claudeMdPath, 'utf8');
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw err;
      }
      claudeMdContent = null;
    }
  }

  // #1362: parallelism cap section, injected after generation so it surfaces
  // in regenerated context files regardless of CLAUDE.md content.
  const parallelismSection = await buildParallelismSection(projectPath);
  const finalizationBlock = await buildContextFinalizationBlock(projectPath);
  const externalLinksSection = await buildExternalLinksSection(projectPath);

  if (claudeMdContent) {
    // Insert the AIWG signature comment as the second line.
    // Top line is typically `# AIWG` or `# Project` heading; preserve it.
    const lines = claudeMdContent.split('\n');

    // #1268: strip `@AIWG.md` self-include directives. CLAUDE.md uses
    // `@AIWG.md` to pull in the framework context; AIWG.md IS that framework
    // context, so the directive becomes a self-reference when copied through.
    // Match the directive when it appears on its own line (possibly indented).
    const SELF_INCLUDE_PATTERN = /^\s*@AIWG\.md\s*$/;
    const filtered = lines.filter((line) => !SELF_INCLUDE_PATTERN.test(line));

    const firstLine = filtered[0] ?? '';
    const rest = filtered.slice(1);

    // If the file already carries the signature elsewhere, don't double-insert.
    const alreadySigned = filtered.slice(0, 4).some((l) => l.includes(AIWG_SIGNATURE_COMMENT));
    const baseContent = alreadySigned
      ? filtered.join('\n')
      : [
          firstLine,
          AIWG_SIGNATURE_COMMENT,
          '<!-- AIWG.md is the CLAUDE.md companion for non-Claude providers; same content. -->',
          ...rest,
        ].join('\n');

    const withParallelism = replaceOrAppendParallelismBlock(baseContent, parallelismSection);
    const withFinalization = replaceOrAppendFinalizationBlock(withParallelism, finalizationBlock);
    return replaceOrAppendExternalLinksBlock(withFinalization, externalLinksSection);
  }

  // Fallback stub.
  const normalizedPath = projectControlPath(projectPath, 'AIWG.md');
  const normalizedRelative = path.relative(projectPath, normalizedPath).replace(/\\/g, '/');
  const normalizedLink = normalizedRelative.startsWith('.') ? normalizedRelative : `./${normalizedRelative}`;
  const stub = [
    '# AIWG.md',
    AIWG_SIGNATURE_COMMENT,
    '<!-- CLAUDE.md companion for non-Claude providers. -->',
    '',
    'CLAUDE.md was not found at project root. AIWG.md normally mirrors that content.',
    `See [${normalizedRelative}](${normalizedLink}) for the project framework context.`,
    '',
  ].join('\n');
  const withParallelism = replaceOrAppendParallelismBlock(stub, parallelismSection);
  const withFinalization = replaceOrAppendFinalizationBlock(withParallelism, finalizationBlock);
  return replaceOrAppendExternalLinksBlock(withFinalization, externalLinksSection);
}

/**
 * Public API: build AIWG.md content for a given project.
 *
 * The wrapper exists so future variants (per-provider AIWG.md customization,
 * AIWG.local.md operator overrides, etc.) have a single entry point in the
 * surface API without callers reaching into the implementation.
 */
export async function generateAiwgMd(projectPath: string): Promise<string> {
  return buildAiwgMdContent(projectPath);
}
