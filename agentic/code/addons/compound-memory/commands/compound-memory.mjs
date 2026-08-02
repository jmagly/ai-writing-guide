import fs from 'node:fs/promises';
import path from 'node:path';

const REQUIRED_ADDONS = ['aiwg-utils', 'semantic-memory', 'llm-wiki', 'line-memory'];
const LINE_PATH = '.aiwg/memory/line-memory.txt';
const LINE_METADATA_PATH = '.aiwg/memory/line-memory.meta.json';
const WIKI_ROOT = '.aiwg/wiki';
const WIKI_INDEX = '.aiwg/wiki/index.md';
const MAX_STATUS_FILES = 1000;

async function fileStat(filePath) {
  try {
    return await fs.stat(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function newestMarkdownMtime(root) {
  const pending = [root];
  let visited = 0;
  let newest = 0;
  while (pending.length > 0 && visited < MAX_STATUS_FILES) {
    const current = pending.shift();
    let entries;
    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch (error) {
      if (error?.code === 'ENOENT') continue;
      throw error;
    }
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
      if (visited++ >= MAX_STATUS_FILES) break;
      const child = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(child);
      else if (entry.isFile() && entry.name.endsWith('.md') && child !== path.join(root, 'index.md')) {
        const stat = await fs.stat(child);
        newest = Math.max(newest, stat.mtimeMs);
      }
    }
  }
  return { newest, visited, bounded: pending.length > 0 || visited >= MAX_STATUS_FILES };
}

async function dependencyStatus(frameworkRoot) {
  return Promise.all(REQUIRED_ADDONS.map(async id => ({
    id,
    available: Boolean(await fileStat(path.join(
      frameworkRoot,
      'agentic/code/addons',
      id,
      'manifest.json',
    ))),
  })));
}

async function lineMemoryStatus(cwd) {
  const memoryPath = path.join(cwd, LINE_PATH);
  const metadataPath = path.join(cwd, LINE_METADATA_PATH);
  const text = await fs.readFile(memoryPath, 'utf8').catch(error => {
    if (error?.code === 'ENOENT') return '';
    throw error;
  });
  const facts = text.split(/\r?\n/).filter(value => value.trim() !== '');
  let metadata = null;
  let integrity = 'ok';
  let detail = null;
  try {
    metadata = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    if (metadata?.schemaVersion !== 'aiwg.line-memory.v1'
      || typeof metadata.entries !== 'object'
      || Array.isArray(metadata.entries)) {
      integrity = 'invalid';
      detail = 'metadata schema is invalid';
    } else {
      const active = Object.values(metadata.entries)
        .filter(entry => entry?.status === 'active')
        .map(entry => entry.value);
      const missing = [...new Set(facts)].filter(value => !active.includes(value));
      if (missing.length > 0) {
        integrity = 'invalid';
        detail = `${missing.length} active text fact(s) have no sidecar identity`;
      }
    }
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      integrity = 'invalid';
      detail = 'metadata is not valid JSON';
    } else if (facts.length > 0) {
      integrity = 'repairable';
      detail = 'legacy text facts will receive sidecar identities on the next line-memory operation';
    }
  }
  return {
    path: LINE_PATH,
    metadataPath: LINE_METADATA_PATH,
    facts: facts.length,
    initialized: Boolean(await fileStat(memoryPath) || await fileStat(metadataPath)),
    integrity,
    detail,
  };
}

async function wikiStatus(cwd) {
  const wikiRoot = path.join(cwd, WIKI_ROOT);
  const indexStat = await fileStat(path.join(cwd, WIKI_INDEX));
  const pages = await newestMarkdownMtime(wikiRoot);
  const stale = pages.newest > 0 && (!indexStat || pages.newest > indexStat.mtimeMs);
  return {
    root: WIKI_ROOT,
    initialized: Boolean(await fileStat(wikiRoot)),
    indexPath: WIKI_INDEX,
    indexPresent: Boolean(indexStat),
    stale,
    scan: { filesVisited: pages.visited, bounded: pages.bounded },
  };
}

export async function compoundMemoryStatus(cwd, frameworkRoot) {
  const [dependencies, lineMemory, wiki] = await Promise.all([
    dependencyStatus(frameworkRoot),
    lineMemoryStatus(cwd),
    wikiStatus(cwd),
  ]);
  const missingDependencies = dependencies.filter(item => !item.available).map(item => item.id);
  const integrityFailures = lineMemory.integrity === 'invalid'
    ? [{ component: 'line-memory', detail: lineMemory.detail }]
    : [];
  const nextActions = [];
  if (missingDependencies.length > 0) nextActions.push('aiwg use compound-memory');
  if (lineMemory.integrity === 'repairable') nextActions.push('aiwg line-memory list --no-touch');
  if (lineMemory.integrity === 'invalid') nextActions.push('review .aiwg/memory/line-memory.meta.json before mutation');
  if (wiki.stale) nextActions.push('run the llm-wiki index refresh workflow');
  nextActions.push('aiwg sessions candidates --state pending --json');
  return {
    schemaVersion: 'aiwg.compound-memory.status.v1',
    status: missingDependencies.length > 0 || integrityFailures.length > 0
      ? 'degraded'
      : 'ready',
    dependencies,
    lineMemory,
    wiki,
    review: {
      pending: null,
      status: 'query-required',
      command: 'aiwg sessions candidates --state pending --json',
    },
    integrityFailures,
    nextActions: [...new Set(nextActions)],
  };
}

function renderHuman(report) {
  const lines = [
    `Compound memory: ${report.status}`,
    `Dependencies: ${report.dependencies.filter(item => item.available).length}/${report.dependencies.length} available`,
    `Line memory: ${report.lineMemory.facts} fact(s), integrity=${report.lineMemory.integrity}`,
    `Wiki: ${report.wiki.initialized ? 'initialized' : 'empty'}, index=${report.wiki.indexPresent ? (report.wiki.stale ? 'stale' : 'current') : 'missing'}`,
    'Review queue: query required',
    'Next actions:',
    ...report.nextActions.map(action => `  - ${action}`),
  ];
  return lines.join('\n');
}

export default async function compoundMemoryCommand(args, context) {
  if (context.subcommand !== 'status') {
    return { exitCode: 2, message: `Unknown compound-memory subcommand: ${context.subcommand}` };
  }
  const report = await compoundMemoryStatus(context.cwd, context.frameworkRoot);
  if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
  else console.log(renderHuman(report));
  return { exitCode: report.status === 'degraded' ? 1 : 0 };
}
