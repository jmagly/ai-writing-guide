import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

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

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function optionValues(args, name) {
  const values = [];
  for (let index = 0; index < args.length; index++) {
    if (args[index] === name && args[index + 1]) values.push(args[++index]);
  }
  return values;
}

function positionalValues(args) {
  const valued = new Set([
    '--media-type', '--context-pack-id', '--context-pack-digest',
    '--source-ref', '--source-digest', '--supersedes', '--conflicts-with',
    '--operation-id',
  ]);
  const values = [];
  for (let index = 0; index < args.length; index++) {
    if (valued.has(args[index])) {
      index++;
      continue;
    }
    if (args[index].startsWith('--')) continue;
    values.push(args[index]);
  }
  return values;
}

function inferSourceKind(ref) {
  if (/^https?:\/\//i.test(ref)) return 'url';
  if (ref.startsWith('session:') || ref.startsWith('session-candidate:')) return 'session';
  if (ref.startsWith('note:')) return 'note';
  if (ref.startsWith('context-pack:')) return 'context-pack';
  if (ref.startsWith('file:')) return 'file';
  return 'artifact';
}

async function loadOutputRegistration(frameworkRoot) {
  const candidates = [
    path.join(frameworkRoot, 'dist/src/sessions/output-registration.js'),
    path.join(frameworkRoot, 'src/sessions/output-registration.ts'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return await import(pathToFileURL(candidate).href);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw error;
    }
  }
  throw new Error('compound-memory output-registration runtime is unavailable');
}

function emitResult(args, value, readable) {
  if (args.includes('--json')) console.log(JSON.stringify(value, null, 2));
  else if (readable) console.log(readable);
}

async function captureOutput(args, context) {
  const runtime = await loadOutputRegistration(context.frameworkRoot);
  const store = new runtime.FilesystemOutputRegistrationStore(context.cwd);
  const index = new runtime.FilesystemDerivedOutputIndex(context.cwd);
  const coordinator = new runtime.OutputRegistrationCoordinator(context.cwd, store, index);

  if (args.includes('--replay')) {
    const pending = store.pending();
    if (!args.includes('--confirm')) {
      const preview = {
        schemaVersion: 'aiwg.compound-memory.command.v1',
        status: 'preview',
        command: 'compound-memory.capture-output',
        operation: 'replay',
        pending: pending.length,
        confirmationRequired: true,
      };
      emitResult(args, preview, `Preview: ${pending.length} pending output registration(s).`);
      return { exitCode: 0 };
    }
    const receipts = await coordinator.replayPending();
    const result = {
      schemaVersion: 'aiwg.compound-memory.command.v1',
      status: 'ok',
      command: 'compound-memory.capture-output',
      operation: 'replay',
      completed: receipts.length,
      remaining: store.pending().length,
      receipts,
    };
    emitResult(args, result, `Replayed ${receipts.length} output registration(s).`);
    return { exitCode: result.remaining > 0 ? 1 : 0 };
  }

  const outputPath = positionalValues(args)[0];
  const mediaType = optionValue(args, '--media-type');
  const contextPackId = optionValue(args, '--context-pack-id');
  const contextPackDigest = optionValue(args, '--context-pack-digest');
  const sourceRefs = optionValues(args, '--source-ref');
  const sourceDigests = optionValues(args, '--source-digest');
  if (!outputPath || !mediaType || !contextPackId || !contextPackDigest || sourceRefs.length === 0) {
    return {
      exitCode: 2,
      message: 'Usage: aiwg compound-memory capture-output <file> --media-type <type> --context-pack-id <id> --context-pack-digest sha256:<digest> --source-ref <ref> [--dry-run|--confirm --operation-id <id>] [--json]',
    };
  }
  if (sourceDigests.length > sourceRefs.length) {
    return { exitCode: 2, message: '--source-digest cannot outnumber --source-ref values' };
  }
  const request = {
    outputPath,
    mediaType,
    contextPack: {
      id: contextPackId,
      digest: contextPackDigest,
      sources: sourceRefs.map((ref, index) => ({
        kind: inferSourceKind(ref),
        ref,
        digest: sourceDigests[index] ?? null,
        span: null,
      })),
    },
    supersedes: optionValues(args, '--supersedes'),
    conflictsWith: optionValues(args, '--conflicts-with'),
  };
  const preview = coordinator.preview(request);
  if (!args.includes('--confirm')) {
    const result = {
      schemaVersion: 'aiwg.compound-memory.command.v1',
      status: 'preview',
      command: 'compound-memory.capture-output',
      preview,
      mutation: { wouldRegister: !preview.duplicate, wouldPromoteKnowledge: false },
    };
    emitResult(args, result, `Preview: register ${preview.output.locator}; operation ${preview.operationId}`);
    return { exitCode: 0 };
  }
  const operationId = optionValue(args, '--operation-id');
  if (!operationId) {
    return { exitCode: 2, message: '--confirm requires --operation-id from the exact preview' };
  }
  const receipt = await coordinator.register({ request, operationId });
  const result = {
    schemaVersion: 'aiwg.compound-memory.command.v1',
    status: 'ok',
    command: 'compound-memory.capture-output',
    receipt,
    knowledgePromotion: 'not-performed',
    nextAction: 'extract and review individual candidates before promotion',
  };
  emitResult(args, result, `Registered ${receipt.outputLocator}; no knowledge was promoted.`);
  return { exitCode: 0 };
}

export default async function compoundMemoryCommand(args, context) {
  try {
    if (context.subcommand === 'status') {
      const report = await compoundMemoryStatus(context.cwd, context.frameworkRoot);
      if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
      else console.log(renderHuman(report));
      return { exitCode: report.status === 'degraded' ? 1 : 0 };
    }
    if (context.subcommand === 'capture-output') return await captureOutput(args, context);
    return { exitCode: 2, message: `Unknown compound-memory subcommand: ${context.subcommand}` };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (args.includes('--json')) {
      console.log(JSON.stringify({
        schemaVersion: 'aiwg.compound-memory.command.v1',
        status: 'error',
        command: `compound-memory.${context.subcommand}`,
        error: { code: error?.code ?? 'COMPOUND_MEMORY_ERROR', message },
      }, null, 2));
      return { exitCode: 1 };
    }
    return { exitCode: 1, message };
  }
}
