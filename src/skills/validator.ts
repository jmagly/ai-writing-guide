/**
 * Shared Agent Skills parser and conformance validator.
 *
 * This module is the only place that parses SKILL.md for Agent Skills
 * conformance. Consumers may add their own quality or deployment policy, but
 * must retain these diagnostics unchanged.
 *
 * @implements #1878
 */

import fs from 'node:fs';
import path from 'node:path';
import { parseDocument } from 'yaml';
import {
  AGENT_SKILLS_BASELINE,
  AGENT_SKILL_VALIDATION_PROFILES,
  AIWG_SKILL_CONTROL_FIELDS,
  STANDARD_SKILL_FIELDS,
  validateCompatibleAgentSkillMetadata,
} from './agent-skills.js';
import type {
  AgentSkillDiagnostic,
  AgentSkillValidationProfile,
} from './agent-skills.js';

export type AgentSkillValidationState =
  | 'valid'
  | 'warning'
  | 'invalid'
  | 'skipped';

export interface AgentSkillValidationMetrics {
  lines: number;
  estimatedTokens: number;
}

export interface AgentSkillValidationResult {
  schemaVersion: 1;
  profile: AgentSkillValidationProfile;
  file: string;
  state: AgentSkillValidationState;
  valid: boolean;
  discoverable: boolean;
  frontmatter?: Record<string, unknown>;
  body: string;
  diagnostics: AgentSkillDiagnostic[];
  metrics: AgentSkillValidationMetrics;
}

export interface AgentSkillValidationOptions {
  profile?: AgentSkillValidationProfile;
  file?: string;
  directoryName?: string;
  skillRoot?: string;
  checkResources?: boolean;
}

export interface AgentSkillScanOptions {
  profile?: AgentSkillValidationProfile;
  recursive?: boolean;
}

export interface AgentSkillScanReport {
  schemaVersion: 1;
  profile: AgentSkillValidationProfile;
  files: AgentSkillValidationResult[];
  summary: {
    scanned: number;
    valid: number;
    warnings: number;
    invalid: number;
    skipped: number;
    errors: number;
  };
}

const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const MARKDOWN_LINK = /!?\[[^\]]*]\(\s*(?:<([^>]+)>|([^\s)]+))(?:\s+["'][^)]*["'])?\s*\)/g;
const STANDARD_FIELDS = new Set<string>(STANDARD_SKILL_FIELDS);
const AIWG_FIELDS = new Set<string>(AIWG_SKILL_CONTROL_FIELDS);

function diagnostic(
  code: string,
  severity: AgentSkillDiagnostic['severity'],
  file: string,
  yamlPath: string,
  message: string,
  remediation: string,
): AgentSkillDiagnostic {
  return {
    code,
    severity,
    file,
    yamlPath,
    message,
    upstreamBaseline: AGENT_SKILLS_BASELINE.revision,
    remediation,
  };
}

function sortDiagnostics(
  diagnostics: AgentSkillDiagnostic[],
): AgentSkillDiagnostic[] {
  return diagnostics.sort((left, right) => (
    left.file.localeCompare(right.file)
    || left.code.localeCompare(right.code)
    || left.yamlPath.localeCompare(right.yamlPath)
    || left.message.localeCompare(right.message)
  ));
}

function normalizeMetadataDiagnostics(
  diagnostics: AgentSkillDiagnostic[],
  frontmatter: Record<string, unknown>,
  profile: AgentSkillValidationProfile,
  file: string,
): AgentSkillDiagnostic[] {
  const policy = AGENT_SKILL_VALIDATION_PROFILES[profile];
  const normalized = diagnostics.flatMap((item) => {
    if (item.code === 'AS_FIELD_UNKNOWN') {
      return [{
        ...item,
        severity: policy.unknownField,
      }];
    }
    if (
      profile === 'discovery'
      && (item.code === 'AS_NAME_FORMAT' || item.code === 'AS_NAME_DIRECTORY')
    ) {
      return [{ ...item, severity: policy.cosmeticNameDefect }];
    }
    return [item];
  });

  if (!policy.recognizedAiwgFields) {
    for (const key of Object.keys(frontmatter).sort()) {
      if (!AIWG_FIELDS.has(key)) continue;
      normalized.push(diagnostic(
        'AS_FIELD_EXTENSION',
        'error',
        file,
        `$.${key}`,
        `AIWG extension field "${key}" is not allowed by the strict profile`,
        'Remove the extension field or validate with the compatible profile.',
      ));
    }
  }

  return normalized;
}

function resourceDiagnostics(
  content: string,
  file: string,
  skillRoot: string | undefined,
  checkResources: boolean,
): AgentSkillDiagnostic[] {
  const diagnostics: AgentSkillDiagnostic[] = [];
  const references = new Set<string>();
  for (const match of content.matchAll(MARKDOWN_LINK)) {
    const raw = (match[1] ?? match[2] ?? '').trim();
    if (
      raw.length === 0
      || raw.startsWith('#')
      || /^(?:https?|mailto|data):/i.test(raw)
    ) {
      continue;
    }
    const withoutFragment = raw.split('#', 1)[0] ?? '';
    const decoded = (() => {
      try {
        return decodeURIComponent(withoutFragment);
      } catch {
        return withoutFragment;
      }
    })();
    references.add(decoded);
  }

  for (const reference of [...references].sort()) {
    const normalized = reference.replaceAll('\\', '/');
    if (
      path.isAbsolute(reference)
      || normalized === '..'
      || normalized.startsWith('../')
      || normalized.includes('/../')
    ) {
      diagnostics.push(diagnostic(
        'AS_RESOURCE_PATH',
        'warning',
        file,
        '$.body',
        `resource reference "${reference}" is not an in-skill relative path`,
        'Reference a file relative to SKILL.md without parent traversal.',
      ));
      continue;
    }

    const segments = normalized.split('/').filter(Boolean);
    if (segments.length > 2) {
      diagnostics.push(diagnostic(
        'AS_ADVISORY_RESOURCE_DEPTH',
        'warning',
        file,
        '$.body',
        `resource reference "${reference}" is deeper than one resource-directory level`,
        'Prefer resources such as references/topic.md, scripts/run.sh, or assets/example.json.',
      ));
    }

    if (!checkResources || !skillRoot) continue;
    const resolved = path.resolve(skillRoot, reference);
    const relative = path.relative(skillRoot, resolved);
    if (
      relative.startsWith('..')
      || path.isAbsolute(relative)
      || !fs.existsSync(resolved)
    ) {
      diagnostics.push(diagnostic(
        'AS_RESOURCE_MISSING',
        'warning',
        file,
        '$.body',
        `referenced resource "${reference}" does not exist`,
        'Add the referenced file or correct the relative resource path.',
      ));
      continue;
    }
    const stat = fs.lstatSync(resolved);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      diagnostics.push(diagnostic(
        'AS_RESOURCE_TYPE',
        'warning',
        file,
        '$.body',
        `referenced resource "${reference}" is not a regular file`,
        'Replace the reference target with an in-tree regular file.',
      ));
    }
  }
  return diagnostics;
}

function resultState(
  diagnostics: readonly AgentSkillDiagnostic[],
  profile: AgentSkillValidationProfile,
): AgentSkillValidationState {
  const errors = diagnostics.filter((item) => item.severity === 'error');
  if (errors.length > 0) {
    if (
      profile === 'discovery'
      && errors.some((item) => (
        item.code === 'AS_DESCRIPTION_REQUIRED'
        || item.code === 'AS_FRONTMATTER_REQUIRED'
        || item.code === 'AS_YAML_PARSE'
        || item.code === 'AS_YAML_TYPE'
      ))
    ) {
      return 'skipped';
    }
    return 'invalid';
  }
  return diagnostics.some((item) => item.severity === 'warning')
    ? 'warning'
    : 'valid';
}

export function validateAgentSkillContent(
  content: string,
  options: AgentSkillValidationOptions = {},
): AgentSkillValidationResult {
  const profile = options.profile ?? 'compatible';
  const file = options.file ?? 'SKILL.md';
  const directoryName = options.directoryName
    ?? (options.skillRoot ? path.basename(options.skillRoot) : undefined)
    ?? (path.dirname(file) !== '.' ? path.basename(path.dirname(file)) : undefined);
  const lines = content.split(/\r?\n/).length;
  const metrics = {
    lines,
    // The upstream guidance is advisory. A deterministic UTF-16/4 estimate
    // avoids a runtime tokenizer dependency while keeping CI snapshots stable.
    estimatedTokens: Math.ceil(content.length / 4),
  };
  const diagnostics: AgentSkillDiagnostic[] = [];
  const match = FRONTMATTER.exec(content);
  if (!match) {
    diagnostics.push(diagnostic(
      'AS_FRONTMATTER_REQUIRED',
      'error',
      file,
      '$',
      'SKILL.md must begin with YAML frontmatter',
      'Add a leading YAML mapping delimited by `---` lines.',
    ));
    const state = resultState(diagnostics, profile);
    return {
      schemaVersion: 1,
      profile,
      file,
      state,
      valid: false,
      discoverable: false,
      body: content,
      diagnostics,
      metrics,
    };
  }

  const document = parseDocument(match[1] ?? '', {
    prettyErrors: false,
    strict: true,
    uniqueKeys: true,
  });
  if (document.errors.length > 0) {
    for (const error of document.errors) {
      diagnostics.push(diagnostic(
        'AS_YAML_PARSE',
        'error',
        file,
        '$',
        `SKILL.md frontmatter is invalid YAML: ${error.message}`,
        'Correct the YAML syntax before validation or discovery.',
      ));
    }
    const state = resultState(diagnostics, profile);
    return {
      schemaVersion: 1,
      profile,
      file,
      state,
      valid: false,
      discoverable: false,
      body: content.slice(match[0].length),
      diagnostics: sortDiagnostics(diagnostics),
      metrics,
    };
  }

  const parsed = document.toJS({ maxAliasCount: 100 }) as unknown;
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    diagnostics.push(diagnostic(
      'AS_YAML_TYPE',
      'error',
      file,
      '$',
      'SKILL.md frontmatter must be a YAML mapping',
      'Use top-level key/value fields.',
    ));
    const state = resultState(diagnostics, profile);
    return {
      schemaVersion: 1,
      profile,
      file,
      state,
      valid: false,
      discoverable: false,
      body: content.slice(match[0].length),
      diagnostics,
      metrics,
    };
  }

  const frontmatter = parsed as Record<string, unknown>;
  diagnostics.push(...normalizeMetadataDiagnostics(
    validateCompatibleAgentSkillMetadata(
      frontmatter,
      directoryName
        ?? (typeof frontmatter['name'] === 'string' ? frontmatter['name'] : ''),
      file,
      lines,
    ),
    frontmatter,
    profile,
    file,
  ));

  if (Object.prototype.hasOwnProperty.call(frontmatter, 'allowed-tools')) {
    const value = frontmatter['allowed-tools'];
    if (
      typeof value === 'string'
      && (value.trim() !== value || value.length === 0 || /\s{2,}|\t|\r|\n/.test(value))
    ) {
      diagnostics.push(diagnostic(
        'AS_ALLOWED_TOOLS_FORMAT',
        'error',
        file,
        '$.allowed-tools',
        'allowed-tools must contain non-empty tool identifiers separated by single spaces',
        'Normalize allowed-tools to a single space-delimited string.',
      ));
    }
    diagnostics.push(diagnostic(
      'AS_ALLOWED_TOOLS_EXPERIMENTAL',
      'warning',
      file,
      '$.allowed-tools',
      'allowed-tools is experimental in the pinned Agent Skills baseline',
      'Treat allowed-tools as advisory unless the target provider documents enforcement.',
    ));
  }

  const body = content.slice(match[0].length);
  if (body.trim().length === 0) {
    diagnostics.push(diagnostic(
      'AS_BODY_REQUIRED',
      'error',
      file,
      '$.body',
      'SKILL.md must contain Markdown instructions after frontmatter',
      'Add the skill instructions below the closing frontmatter delimiter.',
    ));
  }
  if (metrics.estimatedTokens > 5_000) {
    diagnostics.push(diagnostic(
      'AS_ADVISORY_TOKENS',
      'warning',
      file,
      '$',
      `SKILL.md is approximately ${metrics.estimatedTokens} tokens; the recommendation is at most 5,000`,
      'Move detailed material to referenced resources.',
    ));
  }
  diagnostics.push(...resourceDiagnostics(
    body,
    file,
    options.skillRoot,
    options.checkResources ?? Boolean(options.skillRoot),
  ));

  // Defensive policy check: a future field added to one allow-list must not
  // silently escape classification in this parser.
  for (const key of Object.keys(frontmatter).sort()) {
    if (STANDARD_FIELDS.has(key) || AIWG_FIELDS.has(key)) continue;
    if (!diagnostics.some((item) => item.yamlPath === `$.${key}`)) {
      diagnostics.push(diagnostic(
        'AS_FIELD_UNKNOWN',
        AGENT_SKILL_VALIDATION_PROFILES[profile].unknownField,
        file,
        `$.${key}`,
        `unrecognized top-level field "${key}"`,
        'Remove the field or map it explicitly before granting it policy meaning.',
      ));
    }
  }

  sortDiagnostics(diagnostics);
  const state = resultState(diagnostics, profile);
  return {
    schemaVersion: 1,
    profile,
    file,
    state,
    valid: state === 'valid' || state === 'warning',
    discoverable: state !== 'skipped',
    frontmatter,
    body,
    diagnostics,
    metrics,
  };
}

export function validateAgentSkillFile(
  filePath: string,
  options: Omit<AgentSkillValidationOptions, 'file' | 'skillRoot'> = {},
): AgentSkillValidationResult {
  const resolved = path.resolve(filePath);
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    const content = '';
    const result = validateAgentSkillContent(content, {
      ...options,
      file: resolved,
      skillRoot: path.dirname(resolved),
    });
    result.diagnostics = [diagnostic(
      'AS_SKILL_FILE_TYPE',
      'error',
      resolved,
      '$',
      'SKILL.md must be a regular file, not a symbolic link or special file',
      'Replace SKILL.md with an in-tree regular file.',
    )];
    result.state = options.profile === 'discovery' ? 'skipped' : 'invalid';
    result.valid = false;
    result.discoverable = false;
    return result;
  }
  const result = validateAgentSkillContent(fs.readFileSync(resolved, 'utf8'), {
    ...options,
    file: resolved,
    directoryName: options.directoryName ?? path.basename(path.dirname(resolved)),
    skillRoot: path.dirname(resolved),
    checkResources: true,
  });
  if (path.basename(resolved) !== 'SKILL.md') {
    result.diagnostics.push(diagnostic(
      'AS_SKILL_FILENAME',
      'error',
      resolved,
      '$',
      'the skill entrypoint must be named SKILL.md',
      'Rename the entrypoint to SKILL.md.',
    ));
    sortDiagnostics(result.diagnostics);
    result.state = resultState(result.diagnostics, result.profile);
    result.valid = false;
  }
  return result;
}

function collectSkillFiles(
  targetPath: string,
  recursive: boolean,
  files: Set<string>,
): void {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) return;
  const stat = fs.lstatSync(resolved);
  if (stat.isSymbolicLink()) return;
  if (stat.isFile()) {
    if (path.basename(resolved) === 'SKILL.md') files.add(resolved);
    return;
  }
  if (!stat.isDirectory()) return;
  const direct = path.join(resolved, 'SKILL.md');
  if (fs.existsSync(direct) && !fs.lstatSync(direct).isSymbolicLink()) {
    files.add(direct);
  }
  if (!recursive) return;
  for (const entry of fs.readdirSync(resolved, { withFileTypes: true })
    .sort((left, right) => left.name.localeCompare(right.name))) {
    if (
      !entry.isDirectory()
      || entry.isSymbolicLink()
      || entry.name.startsWith('.')
      || entry.name === 'node_modules'
    ) {
      continue;
    }
    collectSkillFiles(path.join(resolved, entry.name), true, files);
  }
}

export function scanAgentSkillPaths(
  targetPaths: string | readonly string[],
  options: AgentSkillScanOptions = {},
): AgentSkillScanReport {
  const profile = options.profile ?? 'compatible';
  const files = new Set<string>();
  for (const target of typeof targetPaths === 'string' ? [targetPaths] : targetPaths) {
    collectSkillFiles(target, options.recursive ?? true, files);
  }
  const results = [...files]
    .sort((left, right) => left.localeCompare(right))
    .map((file) => validateAgentSkillFile(file, { profile }));
  return {
    schemaVersion: 1,
    profile,
    files: results,
    summary: {
      scanned: results.length,
      valid: results.filter((result) => result.state === 'valid').length,
      warnings: results.filter((result) => result.state === 'warning').length,
      invalid: results.filter((result) => result.state === 'invalid').length,
      skipped: results.filter((result) => result.state === 'skipped').length,
      errors: results.reduce(
        (count, result) => count
          + result.diagnostics.filter((item) => item.severity === 'error').length,
        0,
      ),
    },
  };
}
