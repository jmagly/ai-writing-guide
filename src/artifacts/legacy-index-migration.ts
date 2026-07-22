import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import type { ArtifactIndex, GraphType } from './types.js';
import { INDEX_VERSION, getGraphIndexDir, getProjectIndexRoot } from './types.js';
import { syncFortemiCoreIndex } from './fortemi-core-sync.js';

export type LegacyIndexMigrationScope = 'project' | 'user' | 'global';

export interface LegacyIndexMigrationOptions {
  scopes?: LegacyIndexMigrationScope[];
  dryRun?: boolean;
  force?: boolean;
  syncFortemi?: boolean;
  generatedAt?: string;
  homeDir?: string;
  xdgDataHome?: string;
}

export interface LegacyIndexMigrationResult {
  scope: LegacyIndexMigrationScope;
  sourceDir: string;
  destinationDir: string;
  status: 'created' | 'updated' | 'unchanged' | 'skipped' | 'needs-rebuild';
  files: Array<{
    name: string;
    status: 'created' | 'updated' | 'unchanged' | 'skipped';
  }>;
  entries: number | null;
  reason: string | null;
  fortemiCore:
    | {
        status: 'created' | 'updated' | 'unchanged';
        exportPath: string;
        itemCount: number;
      }
    | null;
}

export interface LegacyIndexMigrationReport {
  schemaVersion: 'aiwg.legacy-index-migration.v1';
  dryRun: boolean;
  generatedAt: string;
  results: LegacyIndexMigrationResult[];
  reportPath: string | null;
}

const INDEX_FILES = ['metadata.json', 'tags.json', 'dependencies.json', 'stats.json'] as const;

function sha256File(filePath: string): string | null {
  if (!fs.existsSync(filePath)) return null;
  return createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
}

function readJson<T>(filePath: string): { value: T | null; reason: string | null } {
  try {
    return { value: JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T, reason: null };
  } catch (err) {
    return {
      value: null,
      reason: err instanceof Error ? err.message : String(err),
    };
  }
}

function resolveHome(options: LegacyIndexMigrationOptions): string {
  return options.homeDir ?? process.env.AIWG_HOME ?? os.homedir();
}

function resolveXdgData(options: LegacyIndexMigrationOptions): string {
  return options.xdgDataHome ?? process.env.XDG_DATA_HOME ?? path.join(resolveHome(options), '.local', 'share');
}

function scopePaths(
  cwd: string,
  scope: LegacyIndexMigrationScope,
  options: LegacyIndexMigrationOptions,
): { sourceDir: string; destinationDir: string; syncRoot: string | null; graph: GraphType } {
  switch (scope) {
    case 'project':
      return {
        sourceDir: getProjectIndexRoot(cwd),
        destinationDir: getGraphIndexDir(cwd, 'project'),
        syncRoot: cwd,
        graph: 'project',
      };
    case 'user': {
      const home = resolveHome(options);
      return {
        sourceDir: path.join(home, '.aiwg', '.index'),
        destinationDir: path.join(home, '.aiwg', '.index', 'user'),
        syncRoot: null,
        graph: 'user',
      };
    }
    case 'global': {
      const xdg = resolveXdgData(options);
      return {
        sourceDir: path.join(xdg, 'aiwg', 'index'),
        destinationDir: path.join(xdg, 'aiwg', 'index', 'global'),
        syncRoot: null,
        graph: 'global',
      };
    }
  }
}

function validateLegacyMetadata(sourceDir: string): {
  index: ArtifactIndex | null;
  reason: string | null;
} {
  const metadataPath = path.join(sourceDir, 'metadata.json');
  if (!fs.existsSync(metadataPath)) {
    return { index: null, reason: 'metadata.json not found' };
  }
  const parsed = readJson<Partial<ArtifactIndex>>(metadataPath);
  if (!parsed.value) {
    return { index: null, reason: `metadata.json is unreadable: ${parsed.reason}` };
  }
  if (parsed.value.version !== INDEX_VERSION) {
    return {
      index: null,
      reason: `metadata.json schema version ${String(parsed.value.version ?? 'missing')} is not compatible with ${INDEX_VERSION}`,
    };
  }
  if (!parsed.value.entries || typeof parsed.value.entries !== 'object' || Array.isArray(parsed.value.entries)) {
    return { index: null, reason: 'metadata.json entries must be an object' };
  }
  return { index: parsed.value as ArtifactIndex, reason: null };
}

function migrateOneScope(
  cwd: string,
  scope: LegacyIndexMigrationScope,
  options: LegacyIndexMigrationOptions,
): LegacyIndexMigrationResult {
  const { sourceDir, destinationDir, syncRoot, graph } = scopePaths(cwd, scope, options);
  const baseResult: LegacyIndexMigrationResult = {
    scope,
    sourceDir,
    destinationDir,
    status: 'skipped',
    files: [],
    entries: null,
    reason: null,
    fortemiCore: null,
  };

  if (!fs.existsSync(sourceDir)) {
    return { ...baseResult, reason: 'legacy index directory not found' };
  }
  if (path.resolve(sourceDir) === path.resolve(destinationDir)) {
    return {
      ...baseResult,
      reason: 'source and destination are the same directory; no migration needed',
    };
  }

  const validation = validateLegacyMetadata(sourceDir);
  if (!validation.index) {
    return {
      ...baseResult,
      status: 'needs-rebuild',
      reason: validation.reason,
    };
  }

  let changed = false;
  let anyCreated = false;
  for (const name of INDEX_FILES) {
    const sourcePath = path.join(sourceDir, name);
    const destinationPath = path.join(destinationDir, name);
    if (!fs.existsSync(sourcePath)) {
      baseResult.files.push({ name, status: 'skipped' });
      continue;
    }
    const sourceHash = sha256File(sourcePath);
    const destinationHash = sha256File(destinationPath);
    const exists = destinationHash !== null;
    const same = sourceHash !== null && sourceHash === destinationHash;
    const status = same ? 'unchanged' : exists ? 'updated' : 'created';
    baseResult.files.push({ name, status });
    if (!same) {
      changed = true;
      if (!exists) anyCreated = true;
      if (!options.dryRun) {
        fs.mkdirSync(destinationDir, { recursive: true });
        fs.copyFileSync(sourcePath, destinationPath);
      }
    }
  }

  baseResult.entries = Object.keys(validation.index.entries).length;
  baseResult.status = changed ? (anyCreated ? 'created' : 'updated') : 'unchanged';

  if (!options.dryRun && options.syncFortemi !== false && syncRoot) {
    const manifest = syncFortemiCoreIndex(syncRoot, {
      graph,
      generatedAt: options.generatedAt,
    });
    baseResult.fortemiCore = {
      status: manifest.status,
      exportPath: manifest.export_path,
      itemCount: manifest.item_count,
    };
  }

  return baseResult;
}

function defaultReportPath(cwd: string): string {
  return path.join(getProjectIndexRoot(cwd), 'migrations', 'legacy-index-migration.json');
}

export function migrateLegacyIndex(
  cwd: string,
  options: LegacyIndexMigrationOptions = {},
): LegacyIndexMigrationReport {
  const generatedAt = options.generatedAt ?? new Date().toISOString();
  const scopes: LegacyIndexMigrationScope[] = options.scopes?.length ? options.scopes : ['project'];
  const results = scopes.map((scope) => migrateOneScope(cwd, scope, { ...options, generatedAt }));
  const report: LegacyIndexMigrationReport = {
    schemaVersion: 'aiwg.legacy-index-migration.v1',
    dryRun: options.dryRun === true,
    generatedAt,
    results,
    reportPath: options.dryRun ? null : defaultReportPath(cwd),
  };

  if (!options.dryRun) {
    const reportPath = defaultReportPath(cwd);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  }

  return report;
}
