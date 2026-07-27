#!/usr/bin/env node

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const docs = path.join(root, 'docs');
const policy = JSON.parse(await readFile(path.join(docs, 'public-docs.json'), 'utf8'));
const outputFlag = process.argv.indexOf('--output');
const outputArgument = outputFlag >= 0 ? process.argv[outputFlag + 1] : process.argv[2];
if (outputFlag >= 0 && !outputArgument) {
  throw new Error('--output requires a path');
}
const output = path.resolve(root, outputArgument || 'dist/docs-audience-audit.json');

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map(async (entry) => {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) return markdownFiles(filename);
    return entry.isFile() && entry.name.endsWith('.md') ? [filename] : [];
  }));
  return nested.flat();
}

const files = await markdownFiles(docs);
const historical = (relative) =>
  relative.startsWith('releases/') || relative.startsWith('blog/');
const agentReference = (relative) => relative.startsWith('agents/');
const commandPattern = /\baiwg\s+([a-z][a-z-]*(?:\s+skill)?)/g;
const rows = [];

for (const filename of files) {
  const relative = path.relative(docs, filename).split(path.sep).join('/');
  const content = await readFile(filename, 'utf8');
  const commands = [...content.matchAll(commandPattern)].map((match) => match[1]);
  const agentOwned = commands.filter((command) =>
    policy.agentOwnedCommands.some((owned) => command === owned || command.startsWith(`${owned} `)));
  rows.push({
    path: relative,
    classification: agentReference(relative)
      ? 'agent-operator'
      : historical(relative)
        ? 'historical'
        : relative.startsWith('development/') || relative.startsWith('contributing/')
          ? 'contributor-maintainer'
          : 'public-user',
    commandMentions: commands.length,
    agentOwnedMentions: agentOwned.length,
  });
}

const core = new Set(policy.coreJourneys);
const coreRows = rows.filter((row) => core.has(row.path));
const coreJourneyCommandMentions = coreRows.reduce((sum, row) => sum + row.commandMentions, 0);
const siteConfig = JSON.parse(await readFile(path.join(docs, 'config.json'), 'utf8'));
const docsManifest = JSON.parse(await readFile(path.join(docs, '_manifest.json'), 'utf8'));
const homepageCommandChecklistItems = (siteConfig.welcome?.checklist || [])
  .filter((item) => /\b(?:aiwg|npm)\b/.test(item)).length;
const publicCliNavigationEntries = (docsManifest.order || [])
  .filter((item) => item === 'CLI_USAGE' || item === 'cli-reference' || item.startsWith('agents/')).length;
const onboardingPattern = /(^getting-started\/|quickstart|how-to|howto)/i;
const onboardingSurfaces = [];
for (const row of rows.filter((entry) => onboardingPattern.test(entry.path))) {
  const content = await readFile(path.join(docs, row.path), 'utf8');
  const maintainer = row.classification === 'contributor-maintainer';
  const historicalRow = row.classification === 'historical';
  const canonical = row.path === 'getting-started/install-connect-verify.md';
  const linksCanonical = /install-connect-verify(?:\.md|\.html)/.test(content);
  const hasUseAll = /aiwg use all --provider/.test(content);
  const hasRegenerate = /aiwg-regenerate/.test(content);
  onboardingSurfaces.push({
    path: row.path,
    classification: maintainer
      ? 'contributor-maintainer'
      : historicalRow
        ? 'historical'
        : canonical
          ? 'canonical-onboarding'
          : linksCanonical
            ? 'links-canonical-onboarding'
            : 'specialized-needs-review',
    canonicalSignals: { linksCanonical, hasUseAll, hasRegenerate },
    commandMentions: row.commandMentions,
  });
}
const summary = {
  generatedAt: new Date().toISOString(),
  policy: 'docs/public-docs.json',
  totals: {
    markdownFiles: rows.length,
    publicUserFiles: rows.filter((row) => row.classification === 'public-user').length,
    agentReferenceFiles: rows.filter((row) => row.classification === 'agent-operator').length,
    coreJourneyAgentOwnedMentions: coreRows.reduce((sum, row) => sum + row.agentOwnedMentions, 0),
    onboardingSurfaces: onboardingSurfaces.length,
    onboardingNeedsReview: onboardingSurfaces.filter((row) => row.classification === 'specialized-needs-review').length,
  },
  beforeAfter: {
    baseline: policy.baseline,
    current: {
      coreJourneyCommandMentions,
      homepageCommandChecklistItems,
      publicCliNavigationEntries,
    },
  },
  coreJourneys: coreRows,
  onboardingSurfaces,
  inventory: rows,
};

await writeFile(output, `${JSON.stringify(summary, null, 2)}\n`, 'utf8');
console.log(JSON.stringify(summary.totals));
