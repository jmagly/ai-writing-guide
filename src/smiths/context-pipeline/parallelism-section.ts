/**
 * Parallelism Cap Section — context-file injector
 *
 * Generates the markdown section that surfaces the project's
 * `.aiwg/aiwg.config` `parallelism` cap in regenerated context files
 * (AIWG.md, CLAUDE.md, AGENTS.md). Agents read context at session start;
 * having the cap inline means no extra IO every session.
 *
 * Wrapped in managed-block markers so future regenerations replace the
 * section in-place without disturbing operator additions outside it.
 *
 * Env var `AIWG_HIDE_PARALLELISM_IN_CONTEXT=1` suppresses injection.
 *
 * @implements #1362
 */

import { readAiwgConfig, resolveParallelism, PROVIDER_PARALLELISM_DEFAULTS } from '../../config/aiwg-config.js';

export const PARALLELISM_BLOCK_START = '<!-- AIWG-PARALLELISM-CAP:START -->';
export const PARALLELISM_BLOCK_END = '<!-- AIWG-PARALLELISM-CAP:END -->';

function delegationSupport(provider: string | undefined): string {
  switch (provider) {
    case 'claude':
    case 'codex':
    case 'copilot':
    case 'cursor':
    case 'factory':
    case 'opencode':
    case 'openclaw':
      return `**Provider behavior (${provider})**: native custom subagents can select the deployed model-worker wrapper. Verify the resolved model when provider or account policy may substitute it.`;
    case 'openhuman':
      return '**Provider behavior (openhuman)**: wrapper roles compile to OpenHuman agent definitions; exact pins validate while semantic hints may be routed dynamically.';
    case 'warp':
    case 'hermes':
      return `**Provider behavior (${provider})**: delegation is available, but model selection is global/run-scoped. Use the wrapper rubric for task selection while reporting that heterogeneous per-worker pinning is not enforced.`;
    case 'windsurf':
      return '**Provider behavior (windsurf)**: portable subagent model selection is unsupported. Apply the decomposition rubric in the primary agent and do not claim wrapper pinning or parallel delegation.';
    default:
      return '**Provider behavior (unknown)**: delegation and per-worker model selection are unverified. Apply the rubric only where the active provider exposes those capabilities, and state any fallback explicitly.';
  }
}

/**
 * Build the parallelism-cap markdown section for injection into context files.
 * Returns `''` when injection should be skipped:
 *   - `AIWG_HIDE_PARALLELISM_IN_CONTEXT=1` is set
 *   - No `.aiwg/aiwg.config` exists at the project path
 */
export async function buildParallelismSection(projectPath: string): Promise<string> {
  if (process.env.AIWG_HIDE_PARALLELISM_IN_CONTEXT === '1') return '';

  const cfg = await readAiwgConfig(projectPath);
  if (!cfg) return '';

  const primary = cfg.providers[0];
  const resolved = resolveParallelism(cfg.parallelism, primary);
  const providerDefaults = primary && PROVIDER_PARALLELISM_DEFAULTS[primary];

  const isOverride = (field: keyof typeof resolved): boolean => {
    if (!providerDefaults) return false;
    if (field === 'rationale') return false;
    const def = providerDefaults[field as 'max_parallel_subagents' | 'max_parallel_ralph_loops' | 'max_parallel_mc_missions'];
    return resolved[field] !== def;
  };

  const label = (field: 'max_parallel_subagents' | 'max_parallel_ralph_loops' | 'max_parallel_mc_missions'): string => {
    const value = resolved[field];
    if (isOverride(field)) return `${value} (operator override)`;
    if (primary) return `${value} (provider default for ${primary})`;
    return `${value} (conservative default — unknown provider)`;
  };

  const lines: string[] = [];
  lines.push(PARALLELISM_BLOCK_START);
  lines.push('## Parallelism Cap');
  lines.push('');
  lines.push('This project caps parallel agent fan-out (#1359):');
  lines.push('');
  lines.push(`- **max_parallel_subagents**: ${label('max_parallel_subagents')}`);
  lines.push(`- **max_parallel_ralph_loops**: ${label('max_parallel_ralph_loops')}`);
  lines.push(`- **max_parallel_mc_missions**: ${label('max_parallel_mc_missions')}`);
  if (resolved.rationale) {
    lines.push('');
    lines.push(`*Rationale*: ${resolved.rationale}`);
  }
  lines.push('');
  lines.push('### Model-selected delegation rubric');
  lines.push('');
  lines.push('For each non-trivial task, assess whether it contains independent, bounded subtasks that can run concurrently. When delegation is supported, prefer the deployed model-pinned wrappers by task characteristics and consequence:');
  lines.push('');
  lines.push('- `aiwg-model-efficiency-worker`: discovery, inventory, focused edits, and other bounded low-cost work.');
  lines.push('- `aiwg-model-coding-worker`: implementation, tests, debugging, and routine technical delivery.');
  lines.push('- `aiwg-model-reasoning-worker`: architecture, synthesis, difficult analysis, and high-consequence review.');
  lines.push('');
  lines.push('Do not delegate trivial work, tightly coupled changes, serial dependencies, or tasks likely to collide in shared state; also keep work local when coordination costs exceed the expected benefit. Parallelize only independent work, and take the MIN of provider limits, `max_parallel_subagents`, `AIWG_CONTEXT_WINDOW` budget, framework-specific caps (including the RLM 7-agent hard cap for RLM dispatches), and natural task decomposition. Bump the project cap via `aiwg config set --project parallelism.max_parallel_subagents N`.');
  lines.push('');
  lines.push('The primary agent retains orchestration, final integration, conflict resolution, validation, and user-facing accountability.');
  lines.push('');
  lines.push(delegationSupport(primary));
  lines.push('');
  lines.push(PARALLELISM_BLOCK_END);
  lines.push('');

  return lines.join('\n');
}

/**
 * Replace an existing parallelism-cap block inside `content` (between the
 * managed-block markers) with `newSection`. If no block exists yet, appends
 * the new section. If `newSection` is empty (cap is hidden), strips any
 * existing block in-place.
 *
 * Used by AIWG.md and AGENTS.md generators when reprocessing a file that
 * already has a parallelism block from a prior regeneration.
 */
export function replaceOrAppendParallelismBlock(content: string, newSection: string): string {
  const startIdx = content.indexOf(PARALLELISM_BLOCK_START);
  const endIdx = content.indexOf(PARALLELISM_BLOCK_END);

  if (startIdx >= 0 && endIdx > startIdx) {
    const before = content.slice(0, startIdx);
    const after = content.slice(endIdx + PARALLELISM_BLOCK_END.length);
    // Trim leading newline from `after` if present, since newSection ends with one
    const cleanAfter = after.startsWith('\n') ? after.slice(1) : after;
    return before + newSection + cleanAfter;
  }

  if (!newSection) return content;
  // No existing block — append before the final trailing newline
  return content.trimEnd() + '\n\n' + newSection;
}
