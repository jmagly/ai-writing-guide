#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function parseArgs(argv) {
  const options = { repo: 'jmagly/aiwg', category: 'Announcements' };
  for (let index = 0; index < argv.length; index += 1) {
    const name = argv[index];
    if (!['--version', '--repo', '--category'].includes(name) || !argv[index + 1]) {
      throw new Error('Usage: verify-github-release-discussion.mjs --version <version> [--repo owner/repo] [--category Announcements]');
    }
    options[name.slice(2)] = argv[index + 1];
    index += 1;
  }
  if (!/^v?\d{4}\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(options.version ?? '')) {
    throw new Error('--version must be an AIWG CalVer release such as 2026.8.19');
  }
  if (!/^[^/]+\/[^/]+$/.test(options.repo)) throw new Error('--repo must be owner/repo');
  options.version = options.version.replace(/^v/, '');
  return options;
}

export function verifyDiscussion(nodes, { version, repo }) {
  const escaped = version.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const matching = nodes.filter(({ title }) => new RegExp(`^AIWG ${escaped}(?:\\s|:|—|–|-)`).test(title));
  if (matching.length !== 1) {
    throw new Error(`Expected exactly one GitHub announcement discussion for AIWG ${version}; found ${matching.length}.`);
  }

  const discussion = matching[0];
  const tag = `v${version}`;
  const requiredLinks = [
    `https://github.com/${repo}/releases/tag/${tag}`,
    `https://www.npmjs.com/package/aiwg/v/${version}`,
    `https://github.com/${repo}/blob/${tag}/docs/releases/${tag}-announcement.md`,
    `https://github.com/${repo}/blob/${tag}/CHANGELOG.md`,
  ];
  const missing = requiredLinks.filter((link) => !discussion.body.includes(link));
  if (missing.length) throw new Error(`Release discussion ${discussion.url} is missing required links: ${missing.join(', ')}`);
  return discussion;
}

export function fetchAnnouncementDiscussions({ repo, category }) {
  const [owner, name] = repo.split('/');
  const query = 'query($owner:String!,$name:String!){repository(owner:$owner,name:$name){discussions(first:100,orderBy:{field:CREATED_AT,direction:DESC}){nodes{title body url category{name}}}}}';
  const output = execFileSync('gh', [
    'api', 'graphql', '-f', `query=${query}`, '-f', `owner=${owner}`, '-f', `name=${name}`,
  ], { encoding: 'utf8' });
  const nodes = JSON.parse(output)?.data?.repository?.discussions?.nodes;
  if (!Array.isArray(nodes)) throw new Error(`Could not read GitHub discussions for ${repo}.`);
  return nodes.filter((node) => node.category?.name === category);
}

export function main(argv = process.argv.slice(2)) {
  const options = parseArgs(argv);
  const discussion = verifyDiscussion(fetchAnnouncementDiscussions(options), options);
  process.stdout.write(`${JSON.stringify({ ok: true, version: options.version, url: discussion.url })}\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main();
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exitCode = 1;
  }
}
