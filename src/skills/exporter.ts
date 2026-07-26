/**
 * Strict Agent Skills export boundary.
 *
 * Canonical AIWG skills can carry provider and orchestration metadata. Export
 * writes a portable SKILL.md projection plus a non-portable provenance sidecar
 * so the omitted AIWG fields are auditable without entering standard
 * frontmatter.
 *
 * @implements #1896
 */

import { createHash, randomUUID } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stringify } from 'yaml';
import {
  AGENT_SKILLS_BASELINE,
  AIWG_SKILL_CONTROL_FIELDS,
  projectStrictAgentSkill,
  type AgentSkillDocument,
  type AgentSkillsStandardMetadata,
  type AiwgSkillControlMetadata,
} from './agent-skills.js';
import type {
  AgentSkillExportOptions,
  AgentSkillExportResult,
} from './types.js';
import { validateAgentSkillContent } from './validator.js';

export const AGENT_SKILL_EXPORT_SIDECAR = '.aiwg-agent-skill-export.json';

const STANDARD_FIELDS = [
  'name',
  'description',
  'license',
  'compatibility',
  'metadata',
  'allowed-tools',
] as const;
const AIWG_FIELDS = new Set<string>(AIWG_SKILL_CONTROL_FIELDS);

interface ExportDirectory {
  kind: 'directory';
  relativePath: string;
}

interface ExportFile {
  kind: 'file';
  relativePath: string;
  bytes: Buffer;
}

type ExportEntry = ExportDirectory | ExportFile;

export class AgentSkillExportError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'AgentSkillExportError';
  }
}

function fail(code: string, message: string): never {
  throw new AgentSkillExportError(code, message);
}

function pathContains(parent: string, child: string): boolean {
  const relative = path.relative(parent, child);
  return relative === ''
    || (!relative.startsWith('..') && !path.isAbsolute(relative));
}

function detectAiwgVersion(): string {
  let current = path.dirname(fileURLToPath(import.meta.url));
  for (let depth = 0; depth < 6; depth += 1) {
    const packagePath = path.join(current, 'package.json');
    if (fs.existsSync(packagePath)) {
      try {
        const parsed = JSON.parse(fs.readFileSync(packagePath, 'utf8')) as {
          name?: string;
          version?: string;
        };
        if (
          parsed.name === 'aiwg'
          && typeof parsed.version === 'string'
          && parsed.version.length > 0
        ) {
          return parsed.version;
        }
      } catch {
        // Continue toward the package root.
      }
    }
    current = path.dirname(current);
  }
  return 'unknown';
}

function resolveExportedAt(value: string | undefined): string {
  if (value === undefined) return new Date().toISOString();
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.valueOf()) || parsed.toISOString() !== value) {
    fail('AS_EXPORT_TIME_INVALID', 'exportedAt must be an exact ISO-8601 timestamp');
  }
  return value;
}

function assertSafeSourceEntry(
  sourceRoot: string,
  absolutePath: string,
  relativePath: string,
): fs.Stats {
  if (
    relativePath.length === 0
    || relativePath.includes('\\')
    || path.posix.isAbsolute(relativePath)
    || relativePath.split('/').some((segment) => segment === '.' || segment === '..')
    || /[\u0000-\u001f\u007f]/.test(relativePath)
  ) {
    fail('AS_EXPORT_PATH', `unsafe export source path "${relativePath}"`);
  }
  const stat = fs.lstatSync(absolutePath);
  if (stat.isSymbolicLink()) {
    fail('AS_EXPORT_SYMLINK', `source contains a symlink: ${relativePath}`);
  }
  if (!stat.isDirectory() && !stat.isFile()) {
    fail('AS_EXPORT_SPECIAL_FILE', `source contains a non-regular entry: ${relativePath}`);
  }
  const realRoot = fs.realpathSync.native(sourceRoot);
  const realEntry = fs.realpathSync.native(absolutePath);
  if (!pathContains(realRoot, realEntry)) {
    fail('AS_EXPORT_ESCAPE', `source entry escapes its root: ${relativePath}`);
  }
  return stat;
}

function collectSourceEntries(sourceRoot: string): ExportEntry[] {
  const resolved = path.resolve(sourceRoot);
  const rootStat = fs.lstatSync(resolved);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    fail('AS_EXPORT_SOURCE_TYPE', 'export source must be a real skill directory');
  }
  const entries: ExportEntry[] = [];
  const walk = (current: string, prefix: string): void => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(current, entry.name);
      const stat = assertSafeSourceEntry(resolved, absolutePath, relativePath);
      if (stat.isDirectory()) {
        entries.push({ kind: 'directory', relativePath });
        walk(absolutePath, relativePath);
      } else {
        entries.push({
          kind: 'file',
          relativePath,
          bytes: fs.readFileSync(absolutePath),
        });
      }
    }
  };
  walk(resolved, '');
  return entries;
}

function treeDigest(entries: readonly ExportEntry[], prefix: string): string {
  const hash = createHash('sha256');
  hash.update(prefix);
  hash.update('\0');
  for (const entry of [...entries].sort((left, right) => (
    left.relativePath.localeCompare(right.relativePath)
    || left.kind.localeCompare(right.kind)
  ))) {
    hash.update(entry.kind);
    hash.update('\0');
    hash.update(entry.relativePath);
    hash.update('\0');
    if (entry.kind === 'file') {
      hash.update(String(entry.bytes.length));
      hash.update('\0');
      hash.update(entry.bytes);
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

function parseDocument(
  sourceRoot: string,
  entries: readonly ExportEntry[],
): {
  document: AgentSkillDocument;
  description: string;
  omittedAiwgFields: string[];
} {
  const skillFile = entries.find((entry): entry is ExportFile => (
    entry.kind === 'file' && entry.relativePath === 'SKILL.md'
  ));
  if (!skillFile) {
    fail('AS_EXPORT_SKILL_MISSING', 'export source must contain SKILL.md');
  }
  const content = new TextDecoder('utf-8', { fatal: true }).decode(skillFile.bytes);
  const validation = validateAgentSkillContent(content, {
    profile: 'compatible',
    file: path.join(sourceRoot, 'SKILL.md'),
    directoryName: path.basename(sourceRoot),
    skillRoot: sourceRoot,
    checkResources: true,
  });
  const errors = validation.diagnostics.filter((item) => item.severity === 'error');
  if (!validation.frontmatter || errors.length > 0) {
    fail(
      'AS_EXPORT_VALIDATION',
      `source skill is not Agent Skills compatible: ${errors
        .map((item) => item.code)
        .join(', ')}`,
    );
  }

  const standard: Partial<AgentSkillsStandardMetadata> = {};
  for (const key of STANDARD_FIELDS) {
    const value = validation.frontmatter[key];
    if (value !== undefined) Object.assign(standard, { [key]: structuredClone(value) });
  }
  const aiwg: AiwgSkillControlMetadata = {};
  for (const [key, value] of Object.entries(validation.frontmatter)) {
    if (AIWG_FIELDS.has(key)) {
      aiwg[key as keyof AiwgSkillControlMetadata] = structuredClone(value);
    }
  }

  return {
    document: {
      standard: standard as AgentSkillsStandardMetadata,
      body: validation.body,
      resources: [],
      aiwg,
      unknownFields: [],
    },
    description: validation.frontmatter.description as string,
    omittedAiwgFields: Object.keys(aiwg).sort(),
  };
}

function strictSkillEntry(
  sourceRoot: string,
  document: AgentSkillDocument,
): ExportFile {
  const frontmatter = stringify(projectStrictAgentSkill(document), {
    lineWidth: 0,
    sortMapEntries: false,
  }).trimEnd();
  const content = `---\n${frontmatter}\n---\n${document.body}`;
  const validation = validateAgentSkillContent(content, {
    profile: 'strict',
    file: 'SKILL.md',
    directoryName: document.standard.name,
    skillRoot: sourceRoot,
    checkResources: true,
  });
  const errors = validation.diagnostics.filter((item) => item.severity === 'error');
  if (errors.length > 0) {
    fail(
      'AS_EXPORT_STRICT_VALIDATION',
      `strict export failed validation: ${errors.map((item) => item.code).join(', ')}`,
    );
  }
  return {
    kind: 'file',
    relativePath: 'SKILL.md',
    bytes: Buffer.from(content, 'utf8'),
  };
}

function sidecarEntry(
  result: Omit<AgentSkillExportResult, 'schemaVersion' | 'status' | 'dryRun'>,
): ExportFile {
  return {
    kind: 'file',
    relativePath: AGENT_SKILL_EXPORT_SIDECAR,
    bytes: Buffer.from(`${JSON.stringify({
      schemaVersion: 1,
      kind: 'aiwg-agent-skill-export',
      upstreamBaseline: AGENT_SKILLS_BASELINE,
      ...result,
    }, null, 2)}\n`, 'utf8'),
  };
}

function outputMatches(outputPath: string, desired: readonly ExportEntry[]): boolean {
  if (!fs.existsSync(outputPath) || !fs.lstatSync(outputPath).isDirectory()) {
    return false;
  }
  const actual = new Map<string, 'directory' | Buffer>();
  const walk = (current: string, prefix: string): boolean => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })
      .sort((left, right) => left.name.localeCompare(right.name))) {
      const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      const absolutePath = path.join(current, entry.name);
      const stat = fs.lstatSync(absolutePath);
      if (stat.isSymbolicLink()) return false;
      if (stat.isDirectory()) {
        actual.set(relativePath, 'directory');
        if (!walk(absolutePath, relativePath)) return false;
      } else if (stat.isFile()) {
        actual.set(relativePath, fs.readFileSync(absolutePath));
      } else {
        return false;
      }
    }
    return true;
  };
  if (!walk(outputPath, '')) return false;
  if (actual.size !== desired.length) return false;
  return desired.every((entry) => {
    const value = actual.get(entry.relativePath);
    return entry.kind === 'directory'
      ? value === 'directory'
      : Buffer.isBuffer(value) && value.equals(entry.bytes);
  });
}

function writeDesiredTree(root: string, desired: readonly ExportEntry[]): void {
  fs.mkdirSync(root, { recursive: false, mode: 0o700 });
  for (const entry of desired
    .filter((item): item is ExportDirectory => item.kind === 'directory')
    .sort((left, right) => (
      left.relativePath.split('/').length - right.relativePath.split('/').length
      || left.relativePath.localeCompare(right.relativePath)
    ))) {
    fs.mkdirSync(path.join(root, ...entry.relativePath.split('/')), {
      recursive: true,
      mode: 0o700,
    });
  }
  for (const entry of desired
    .filter((item): item is ExportFile => item.kind === 'file')
    .sort((left, right) => left.relativePath.localeCompare(right.relativePath))) {
    const target = path.join(root, ...entry.relativePath.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true, mode: 0o700 });
    fs.writeFileSync(target, entry.bytes, { flag: 'wx', mode: 0o600 });
  }
}

function promoteAtomically(outputPath: string, desired: readonly ExportEntry[]): 'exported' | 'updated' {
  const parent = path.dirname(outputPath);
  fs.mkdirSync(parent, { recursive: true, mode: 0o700 });
  const suffix = randomUUID();
  const staging = path.join(parent, `.${path.basename(outputPath)}.export-staging-${suffix}`);
  const backup = path.join(parent, `.${path.basename(outputPath)}.export-backup-${suffix}`);
  const existed = fs.existsSync(outputPath);
  try {
    writeDesiredTree(staging, desired);
    if (existed) fs.renameSync(outputPath, backup);
    try {
      fs.renameSync(staging, outputPath);
    } catch (error) {
      if (fs.existsSync(outputPath)) fs.rmSync(outputPath, { recursive: true, force: true });
      if (fs.existsSync(backup)) fs.renameSync(backup, outputPath);
      throw error;
    }
    if (fs.existsSync(backup)) fs.rmSync(backup, { recursive: true, force: true });
    return existed ? 'updated' : 'exported';
  } finally {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true, force: true });
    if (fs.existsSync(backup) && !fs.existsSync(outputPath)) {
      fs.renameSync(backup, outputPath);
    }
  }
}

export function exportAgentSkillDirectory(
  sourceDir: string,
  options: AgentSkillExportOptions,
): AgentSkillExportResult {
  const resolvedSource = path.resolve(sourceDir);
  const exportedAt = resolveExportedAt(options.exportedAt);
  const aiwgVersion = options.aiwgVersion ?? detectAiwgVersion();
  const sourceEntries = collectSourceEntries(resolvedSource);
  const { document, description, omittedAiwgFields } = parseDocument(
    resolvedSource,
    sourceEntries,
  );
  const outputPath = path.resolve(options.outDir, document.standard.name);
  const sourceDigest = treeDigest(sourceEntries, 'aiwg-agent-skill-export-source-v1');
  const portableEntries: ExportEntry[] = sourceEntries
    .filter((entry) => (
      entry.relativePath !== 'SKILL.md'
      && entry.relativePath !== AGENT_SKILL_EXPORT_SIDECAR
    ))
    .map((entry) => (
      entry.kind === 'directory'
        ? { ...entry }
        : { ...entry, bytes: Buffer.from(entry.bytes) }
    ));
  portableEntries.push(strictSkillEntry(resolvedSource, document));

  const preliminary = {
    name: document.standard.name,
    description,
    sourcePath: resolvedSource,
    outputPath,
    sourceDigest,
    exportDigest: '',
    omittedAiwgFields,
    fileCount: 0,
    totalBytes: 0,
    exportedAt,
    aiwgVersion,
  };
  const exportDigest = treeDigest(portableEntries, 'aiwg-agent-skill-export-v1');
  const desiredEntries = [
    ...portableEntries,
    sidecarEntry({
      ...preliminary,
      exportDigest,
      fileCount: portableEntries.filter((entry) => entry.kind === 'file').length,
      totalBytes: portableEntries.reduce(
        (total, entry) => total + (entry.kind === 'file' ? entry.bytes.length : 0),
        0,
      ),
    }),
  ].sort((left, right) => (
    left.relativePath.localeCompare(right.relativePath)
    || left.kind.localeCompare(right.kind)
  ));
  const fileCount = desiredEntries.filter((entry) => entry.kind === 'file').length;
  const totalBytes = desiredEntries.reduce(
    (total, entry) => total + (entry.kind === 'file' ? entry.bytes.length : 0),
    0,
  );

  const resultBase = {
    schemaVersion: 1 as const,
    dryRun: Boolean(options.dryRun),
    name: document.standard.name,
    description,
    sourcePath: resolvedSource,
    outputPath,
    sourceDigest,
    exportDigest,
    omittedAiwgFields,
    fileCount,
    totalBytes,
    exportedAt,
    aiwgVersion,
  };
  if (outputMatches(outputPath, desiredEntries)) {
    return { ...resultBase, status: 'unchanged' };
  }
  if (fs.existsSync(outputPath) && !options.force) {
    fail(
      'AS_EXPORT_COLLISION',
      `export target already exists at ${outputPath}; use --force after review`,
    );
  }
  if (options.dryRun) {
    return { ...resultBase, status: 'planned' };
  }
  return {
    ...resultBase,
    status: promoteAtomically(outputPath, desiredEntries),
  };
}
