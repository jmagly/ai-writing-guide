#!/usr/bin/env node

import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isContributor,
  isHistorical,
  isPublicUserDocument,
  rewritePublicUserCommands,
} from './public-command-policy.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const docs = path.join(root, 'docs');
const outputArg = process.argv[2] || 'dist/public-docs-source';
const output = path.resolve(root, outputArg);
const policy = JSON.parse(await readFile(path.join(docs, 'public-docs.json'), 'utf8'));

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(filename);
    return entry.isFile() && entry.name.endsWith('.md') ? [filename] : [];
  }));
  return nested.flat();
}

function insertAfterTitle(content, notice) {
  const title = /^# .+$/m.exec(content);
  if (!title) return `${notice}\n\n${content}`;
  const end = title.index + title[0].length;
  return `${content.slice(0, end)}\n\n${notice}${content.slice(end)}`;
}

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
    .replaceAll('../cli-reference.md', 'https://github.com/jmagly/aiwg/blob/main/docs/cli/reference.md')
    .replaceAll('../CLI_USAGE.md', 'https://github.com/jmagly/aiwg/blob/main/docs/cli/agent-usage.md');
  if (rewritten !== content) await writeFile(filename, rewritten, 'utf8');
}

// The source tree is also the installed agent/reference corpus, so it retains
// exact implementation examples. The public user build replaces executable
// advanced CLI blocks with natural-language agent prompts. Historical and
// contributor material remains byte-accurate, and dedicated CLI references are
// kept out of the end-user publication.
for (const filename of await markdownFiles(output)) {
  const relative = path.relative(output, filename).split(path.sep).join('/');
  if (isHistorical(relative) || isContributor(relative)) continue;
  const content = await readFile(filename, 'utf8');
  if (!isPublicUserDocument(relative, content)) continue;
  const rewritten = rewritePublicUserCommands(content, policy.directTouchCommands);
  if (!rewritten.changed) continue;
  const notice = `${policy.operatorNotice.marker}\n${policy.operatorNotice.text}`;
  const withNotice = rewritten.content.includes(policy.operatorNotice.marker)
    ? rewritten.content
    : insertAfterTitle(rewritten.content, notice);
  await writeFile(filename, withNotice, 'utf8');
}

const manifestPath = path.join(output, '_manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
manifest.order = (manifest.order || []).filter((entry) =>
  !policy.exclude.some((excluded) => entry === excluded || entry.startsWith(`${excluded}/`)));
manifest.exclude = [...new Set([...(manifest.exclude || []), ...policy.exclude])];
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

console.log(`Built public documentation source at ${path.relative(root, output)}`);
