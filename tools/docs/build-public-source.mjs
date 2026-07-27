#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const docs = path.join(root, 'docs');
const outputArg = process.argv[2] || 'dist/public-docs-source';
const output = path.resolve(root, outputArg);
const policy = JSON.parse(await readFile(path.join(docs, 'public-docs.json'), 'utf8'));

await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(docs, output, {
  recursive: true,
  filter(source) {
    const relative = path.relative(docs, source);
    if (!relative) return true;
    return !policy.exclude.some((entry) =>
      relative === entry || relative.startsWith(`${entry}${path.sep}`));
  },
});

// Historical release notes keep their original source wording and relative
// links. The referenced CLI pages are agent-only now, so rewrite only the
// staged copies to the release corpus. This preserves history in source while
// keeping strict public-link validation useful.
const stagedReleases = path.join(output, 'releases');
for (const entry of await readdir(stagedReleases, { withFileTypes: true })) {
  if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
  const filename = path.join(stagedReleases, entry.name);
  const content = await readFile(filename, 'utf8');
  const rewritten = content
    .replaceAll('../cli-reference.md', 'https://github.com/jmagly/aiwg/blob/main/docs/agents/cli-reference.md')
    .replaceAll('../CLI_USAGE.md', 'https://github.com/jmagly/aiwg/blob/main/docs/agents/CLI_USAGE.md');
  if (rewritten !== content) await writeFile(filename, rewritten, 'utf8');
}

const manifestPath = path.join(output, '_manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.order = (manifest.order || []).filter((entry) =>
  !policy.exclude.some((excluded) => entry === excluded || entry.startsWith(`${excluded}/`)));
manifest.exclude = [...new Set([...(manifest.exclude || []), ...policy.exclude])];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Built public documentation source at ${path.relative(root, output)}`);
