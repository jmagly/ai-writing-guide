/**
 * Field sanitization for AGENTS.md link-index entries.
 *
 * Per ADR-1 §2: AGENTS.md is loaded into model context every session, so a poisoned
 * link entry is a high-reach prompt-injection vector. The sanitizer rejects backticks,
 * code fences, control characters, absolute URLs (any scheme except relative paths),
 * and HTML at generation time, before the bytes are written.
 *
 * Description field is also length-capped at 120 chars.
 */

const DESCRIPTION_MAX_LEN = 120;

const FORBIDDEN_PATTERNS: ReadonlyArray<{ pattern: RegExp; reason: string }> = [
  { pattern: /`/, reason: 'backtick' },
  { pattern: /```/, reason: 'code fence' },
  { pattern: /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/, reason: 'control character' },
  { pattern: /<\s*[a-zA-Z][^>]*>/, reason: 'HTML tag' },
  // Absolute URLs with schemes (http, https, file, ftp, etc.) — reject any scheme://
  // Relative paths (./foo, foo/bar.md, ~/...) are allowed.
  { pattern: /\b[a-zA-Z][a-zA-Z0-9+\-.]*:\/\//, reason: 'absolute URL' },
];

/**
 * Result of a sanitization attempt.
 */
export interface SanitizeResult {
  ok: boolean;
  value: string;
  /** Reason the input was rejected; empty when ok=true */
  rejectedFor: string;
}

/**
 * Sanitize a description field for the AGENTS.md link index.
 *
 * Returns `ok: false` with a `rejectedFor` reason when the input contains
 * forbidden content. Caller decides whether to skip the entry or abort.
 *
 * On `ok: true`, the returned `value` is trimmed and length-capped.
 */
export function sanitizeDescription(input: string): SanitizeResult {
  if (typeof input !== 'string') {
    return { ok: false, value: '', rejectedFor: 'non-string input' };
  }

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(input)) {
      return { ok: false, value: '', rejectedFor: reason };
    }
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, value: '', rejectedFor: 'empty after trim' };
  }

  // Length-cap at 120 chars; truncate with ellipsis marker if needed.
  const value = trimmed.length > DESCRIPTION_MAX_LEN
    ? trimmed.slice(0, DESCRIPTION_MAX_LEN - 1).trimEnd() + '…'
    : trimmed;

  return { ok: true, value, rejectedFor: '' };
}

/**
 * Sanitize a tag value. Tags are short identifiers (kebab-case typical).
 * No length cap, but same forbidden-pattern set as description.
 */
export function sanitizeTag(input: string): SanitizeResult {
  if (typeof input !== 'string') {
    return { ok: false, value: '', rejectedFor: 'non-string input' };
  }

  for (const { pattern, reason } of FORBIDDEN_PATTERNS) {
    if (pattern.test(input)) {
      return { ok: false, value: '', rejectedFor: reason };
    }
  }

  const trimmed = input.trim();
  if (trimmed.length === 0) {
    return { ok: false, value: '', rejectedFor: 'empty after trim' };
  }

  // Reject whitespace inside tags (kebab-case convention).
  if (/\s/.test(trimmed)) {
    return { ok: false, value: '', rejectedFor: 'whitespace in tag' };
  }

  return { ok: true, value: trimmed, rejectedFor: '' };
}

/**
 * Convenience: sanitize an array of tags. Drops invalid tags rather than rejecting
 * the whole array. Returns the kept tags and a list of rejection reasons for telemetry.
 */
export function sanitizeTags(inputs: ReadonlyArray<string>): { kept: string[]; rejected: string[] } {
  const kept: string[] = [];
  const rejected: string[] = [];
  for (const input of inputs) {
    const result = sanitizeTag(input);
    if (result.ok) {
      kept.push(result.value);
    } else {
      rejected.push(`${input || '<empty>'}: ${result.rejectedFor}`);
    }
  }
  return { kept, rejected };
}

export const SANITIZER_INTERNALS = {
  DESCRIPTION_MAX_LEN,
  FORBIDDEN_PATTERNS,
};
