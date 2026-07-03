#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const outRoot = path.join(repoRoot, 'prebuilt', 'fortemi-core', 'framework');
const generatedAt = process.env.AIWG_PREBUILT_INDEX_GENERATED_AT ?? '1970-01-01T00:00:00.000Z';

process.env.AIWG_ROOT ??= repoRoot;

const { buildIndex } = await import('../../src/artifacts/index-builder.ts');
const { buildAiwgFortemiIndexExport } = await import('../../src/artifacts/browser-export.ts');

rmSync(outRoot, { recursive: true, force: true });
mkdirSync(outRoot, { recursive: true });

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
    item.search.body = searchText;
    item.search.frontmatter = {};
  }
  delete item.chunks;
}

const exportJson = JSON.stringify(exported) + '\n';
const checksum = createHash('sha256').update(exportJson).digest('hex');
const exportPath = path.join(outRoot, 'aiwg-fortemi-index-v2.json');
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
writeFileSync(path.join(outRoot, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

const size = readFileSync(exportPath).byteLength;
console.log(`Prebuilt Fortemi Core framework index: ${exported.items.length} items, ${size} bytes`);
