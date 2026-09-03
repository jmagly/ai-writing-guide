#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { relative, resolve, sep } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const output = resolve(root, 'schemas/catalog/domains/repository-json-schemas.json');
const checkOnly = process.argv.includes('--check');
function trackedSchemas() {
  return execFileSync('git', ['ls-files', '--cached', '--', '*.schema.json'], { cwd: root, encoding: 'utf8' })
    .split('\n')
    .filter(Boolean)
    .filter(path => !path.startsWith('schemas/catalog/'))
    .sort()
    .map(path => resolve(root, path));
}

function repositoryPath(path) {
  return relative(root, path).split(sep).join('/');
}

function preference(path) {
  if (path.startsWith('schemas/')) return 0;
  if (path.startsWith('src/')) return 1;
  if (path.startsWith('agentic/code/frameworks/') || path.startsWith('agentic/code/addons/') || path.startsWith('agentic/code/extensions/')) return 2;
  if (path.startsWith('apps/')) return 3;
  if (path.startsWith('agentic/code/plugins/')) return 4;
  return 5;
}

function ownerFor(path) {
  const segments = path.split('/');
  if (segments[0] === 'schemas') return segments[1] ? `schema-${segments[1]}` : 'schema-core';
  if (segments[0] === 'agentic') return segments[3] ? `bundle-${segments[3]}` : 'agentic-frameworks';
  if (segments[0] === 'apps') return `app-${segments[1] ?? 'unknown'}`;
  if (segments[0] === 'src') return `runtime-${segments[1] ?? 'core'}`;
  return 'aiwg-maintainers';
}

function logicalName(path) {
  return path.replace(/\.schema\.json$/u, '').replace(/[^a-zA-Z0-9]+/gu, '.').replace(/^\.|\.$/gu, '').toLowerCase();
}

function versionFor(path, schema) {
  const source = `${path} ${schema.$id ?? ''}`;
  const semver = source.match(/(?:^|[/.@_-])v?(\d+)\.(\d+)\.(\d+)(?:$|[/.@_-])/u);
  if (semver) return `${semver[1]}.${semver[2]}.${semver[3]}`;
  const major = source.match(/(?:^|[/.@_-])v(\d+)(?:$|[/.@_-])/u);
  return major ? `${major[1]}.0.0` : '1.0.0';
}

const records = trackedSchemas().map(path => {
  const repoPath = repositoryPath(path);
  const schema = JSON.parse(readFileSync(path, 'utf8'));
  return { path: repoPath, schema, digest: `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}` };
});

const byId = new Map();
for (const record of records) {
  const id = record.schema.$id;
  if (typeof id !== 'string' || id.length === 0) throw new Error(`${record.path} has no $id`);
  const values = byId.get(id) ?? [];
  values.push(record);
  byId.set(id, values);
}

const artifacts = [...byId.entries()].map(([id, values]) => {
  values.sort((a, b) => preference(a.path) - preference(b.path) || a.path.localeCompare(b.path));
  const canonical = values[0];
  const projections = values.slice(1).map(value => ({ kind: 'mirror', path: value.path, digest: value.digest, generated: value.path.includes('/plugins/') || value.path.includes('/contracts/') }));
  return {
    logicalName: logicalName(canonical.path),
    id,
    version: versionFor(canonical.path, canonical.schema),
    format: 'json-schema',
    dialect: canonical.schema.$schema,
    lifecycle: 'active',
    stability: 'stable',
    owner: { id: ownerFor(canonical.path) },
    authority: { kind: 'canonical', path: canonical.path },
    compatibility: { mode: 'unknown' },
    consumers: [],
    ...(projections.length ? { projections } : {}),
  };
}).sort((a, b) => a.id.localeCompare(b.id));

const manifest = {
  $schema: '../domain-manifest.v1.schema.json',
  schemaVersion: '1',
  domain: 'repository-json-schemas',
  owner: { id: 'aiwg-maintainers' },
  policy: { strict: true, remoteReferences: 'locked', compatibility: 'unknown' },
  artifacts,
};

const rendered = `${JSON.stringify(manifest, null, 2)}\n`;
if (checkOnly) {
  if (readFileSync(output, 'utf8') !== rendered) {
    console.error(`${repositoryPath(output)} is stale; run npm run schema:catalog.`);
    process.exitCode = 1;
  } else console.log(`${repositoryPath(output)} is current (${artifacts.length} authorities, ${records.length} files).`);
} else {
  writeFileSync(output, rendered);
  console.log(`Wrote ${repositoryPath(output)} with ${artifacts.length} authorities from ${records.length} schema files.`);
}
