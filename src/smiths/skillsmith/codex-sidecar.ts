/**
 * Codex `agents/openai.yaml` UI sidecar emission.
 *
 * Per ADR-1 sign-off (2026-05-05) and #1129 PUW-028: when AIWG deploys a skill
 * to a Codex skills directory, also emit `agents/openai.yaml` inside the skill
 * folder so Codex's skill-picker UI surfaces display name, icon, brand color,
 * and default prompt.
 *
 * Sidecar is purely additive — its absence is graceful (Codex falls back to
 * SKILL.md frontmatter for picker metadata). Sidecar emission must not block
 * the skill deploy path on failure; the deploy succeeds even when the sidecar
 * write errors out.
 *
 * Per ADR-1 sign-off: AIWG-wide brand defaults for icon and brand color
 * (single brand identity). Per-category mapping is a follow-up if demand
 * surfaces. Sidecar contents are sanitized through the AGENTS.md sanitizer
 * to keep the same prompt-injection defense surface.
 */

import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as yaml from 'js-yaml';
import { sanitizeDescription } from '../context-pipeline/sanitizer.js';
import { AIWG_BRAND_DEFAULTS } from '../context-pipeline/types.js';

/**
 * Frontmatter shape we extract from a SKILL.md to populate the sidecar.
 */
export interface SkillMetadata {
  /** Skill id; falls back to folder name. */
  name?: string;
  /** Description; lifted verbatim into `default_prompt` after sanitization. */
  description?: string;
}

/**
 * Sidecar payload structure that Codex's UI consumes.
 *
 * Field names match what Codex's skill picker reads (per the UI sidecar
 * convention documented at PUW-028 in `.aiwg/research/parity/codex/`).
 */
export interface CodexSidecarPayload {
  display_name: string;
  icon: string;
  brand_color: string;
  default_prompt: string;
}

/**
 * Build the sidecar payload from skill metadata.
 *
 * Returns null when the skill has no usable name AND no description — there
 * is nothing meaningful to emit. Caller skips sidecar in that case.
 */
export function buildSidecarPayload(
  metadata: SkillMetadata,
  folderName: string,
): CodexSidecarPayload | null {
  const name = (metadata.name && metadata.name.trim()) || folderName;
  if (!name) return null;

  // default_prompt is sanitized through the same surface as AGENTS.md fields
  // because the sidecar payload reaches the model context once Codex loads
  // the skill picker. Same prompt-injection blast radius applies.
  const desc = metadata.description ? sanitizeDescription(metadata.description) : null;
  const default_prompt = desc?.ok ? desc.value : `Run the ${name} skill.`;

  return {
    display_name: name,
    icon: AIWG_BRAND_DEFAULTS.icon,
    brand_color: AIWG_BRAND_DEFAULTS.brandColor,
    default_prompt,
  };
}

/**
 * Render a sidecar payload as YAML.
 *
 * Wraps js-yaml.dump with a stable formatting set (no anchor refs, sorted
 * keys, double-quoted scalars where needed).
 */
export function renderSidecarYaml(payload: CodexSidecarPayload): string {
  return yaml.dump(payload, {
    sortKeys: true,
    noRefs: true,
    quotingType: '"',
    forceQuotes: false,
  });
}

/**
 * Emit `agents/openai.yaml` inside a deployed skill folder.
 *
 * - skillFolder: absolute path to the deployed skill folder (e.g.
 *   `~/.codex/skills/address-issues/` or `.codex/skills/address-issues/`).
 * - metadata: SkillMetadata extracted from the skill's SKILL.md frontmatter.
 *
 * Returns the absolute sidecar path on successful write, or null when there
 * was nothing to emit. Throws on filesystem error so the caller can decide
 * whether to surface the failure as a deploy warning (recommended) or
 * abort. The PUW-028 contract requires sidecar absence to be graceful, so
 * callers should treat throws as warnings, not errors.
 */
export async function emitCodexSidecar(
  skillFolder: string,
  metadata: SkillMetadata,
): Promise<string | null> {
  const folderName = path.basename(skillFolder);
  const payload = buildSidecarPayload(metadata, folderName);
  if (!payload) return null;

  const sidecarDir = path.join(skillFolder, 'agents');
  await fs.mkdir(sidecarDir, { recursive: true });

  const sidecarPath = path.join(sidecarDir, 'openai.yaml');
  const content = renderSidecarYaml(payload);
  await fs.writeFile(sidecarPath, content, 'utf8');

  return sidecarPath;
}
