#!/usr/bin/env node
import { createHash } from 'node:crypto';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { acquireDirectoryLock } from '../../src/artifacts/prebuilt-build-lock.ts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prebuiltRoot = path.join(repoRoot, 'prebuilt', 'fortemi-core');
const outRoot = path.join(prebuiltRoot, 'framework');
const lockRoot = path.join(prebuiltRoot, '.framework-build.lock');
const generatedAt = process.env.AIWG_PREBUILT_INDEX_GENERATED_AT ?? '1970-01-01T00:00:00.000Z';

process.env.AIWG_ROOT ??= repoRoot;

const releaseLock = await acquireDirectoryLock(lockRoot);
let nextRoot;
let previousRoot;
let size = 0;
let itemCount = 0;

try {
  const { buildIndex } = await import('../../src/artifacts/index-builder.ts');
  const { buildAiwgFortemiIndexExport } = await import('../../src/artifacts/browser-export.ts');

  mkdirSync(prebuiltRoot, { recursive: true });
  nextRoot = mkdtempSync(path.join(prebuiltRoot, '.framework-next-'));

  await buildIndex(repoRoot, { graph: 'framework', force: true, explicit: true });

  const exported = buildAiwgFortemiIndexExport(repoRoot, {
    graph: 'framework',
    repo: 'aiwg',
    privacy: 'public',
    generatedAt,
    schemaVersion: 'v2',
    includeSourceBody: false,
  });

  for (const item of exported.items) {
    const searchText = [
      item.title,
      item.name,
      item.summary,
      item.search?.capability,
      item.source?.path,
      ...(item.search?.triggers ?? []),
      ...(item.tags ?? []),
    ]
      .filter((part) => typeof part === 'string' && part.length > 0)
      .join('\n');
    item.text = item.summary || item.title || '';
    if (item.search) {
      const executableFrontmatter = item.search.frontmatter?.aiwg_script
        ? { aiwg_script: item.search.frontmatter.aiwg_script }
        : {};
      item.search.body = searchText;
      // The prebuilt export intentionally drops general frontmatter to stay
      // compact, but aiwg_script is runtime metadata rather than search-only
      // decoration. `aiwg run skill` needs it when no local index exists.
      item.search.frontmatter = executableFrontmatter;
    }
    delete item.chunks;
  }

  const exportJson = JSON.stringify(exported) + '\n';
  const checksum = createHash('sha256').update(exportJson).digest('hex');
  const exportPath = path.join(nextRoot, 'aiwg-fortemi-index-v2.json');
  writeFileSync(exportPath, exportJson, 'utf-8');

  const manifest = {
    schema_version: 'aiwg.fortemi.prebuilt.v1',
    backend: 'fortemi-core',
    graph: 'framework',
    generated_at: generatedAt,
    export_path: 'aiwg-fortemi-index-v2.json',
    export_schema_version: 'aiwg.fortemi.index.export.v2',
    export_checksum: checksum,
    item_count: exported.items.length,
    privacy: 'public',
  };
  writeFileSync(path.join(nextRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  size = readFileSync(exportPath).byteLength;
  itemCount = exported.items.length;

  if (existsSync(outRoot)) {
    previousRoot = path.join(prebuiltRoot, `.framework-previous-${process.pid}-${Date.now()}`);
    renameSync(outRoot, previousRoot);
  }
  try {
    renameSync(nextRoot, outRoot);
    nextRoot = undefined;
  } catch (error) {
    if (previousRoot && !existsSync(outRoot)) renameSync(previousRoot, outRoot);
    throw error;
  }
  if (previousRoot) {
    rmSync(previousRoot, { recursive: true, force: true });
    previousRoot = undefined;
  }
} finally {
  if (nextRoot) rmSync(nextRoot, { recursive: true, force: true });
  if (previousRoot && !existsSync(outRoot)) renameSync(previousRoot, outRoot);
  if (previousRoot) rmSync(previousRoot, { recursive: true, force: true });
  await releaseLock();
}

console.log(`Prebuilt Fortemi Core framework index: ${itemCount} items, ${size} bytes`);
