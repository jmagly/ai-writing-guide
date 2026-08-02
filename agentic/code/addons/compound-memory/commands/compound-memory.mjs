import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';

const REQUIRED_ADDONS = ['aiwg-utils', 'semantic-memory', 'llm-wiki', 'line-memory'];
const LINE_PATH = '.aiwg/memory/line-memory.txt';
const LINE_METADATA_PATH = '.aiwg/memory/line-memory.meta.json';
const WIKI_ROOT = '.aiwg/wiki';
const WIKI_INDEX = '.aiwg/wiki/index.md';
const MAX_STATUS_FILES = 1000;
const DEFAULT_REVIEW_LIMIT = 50;
const MAX_REVIEW_LIMIT = 200;
const SESSION_CATALOG = '.aiwg/sessions/catalog.sqlite';
const MAINTENANCE_RECEIPTS = '.aiwg/memory/compound-memory/maintenance-receipts';

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

export async function compoundMemoryStatus(cwd, frameworkRoot, candidateReview = null) {
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
  if (candidateReview?.count > 0 || candidateReview === null) {
    nextActions.push('aiwg compound-memory review --json');
  }
  return {
    schemaVersion: 'aiwg.compound-memory.status.v1',
    status: missingDependencies.length > 0 || integrityFailures.length > 0
      ? 'degraded'
      : 'ready',
    dependencies,
    lineMemory,
    wiki,
    review: {
      pending: candidateReview?.count ?? null,
      status: candidateReview?.status ?? 'query-required',
      bounded: candidateReview?.bounded ?? true,
      command: 'aiwg compound-memory review --json',
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
    `Review queue: ${report.review.pending ?? report.review.status}`,
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
    '--operation-id', '--limit', '--workspace-id', '--db',
    '--budget', '--line-budget', '--wiki-budget', '--citation-budget',
    '--instruction-budget', '--max-files',
    '--reviewer', '--reason', '--scope', '--classification', '--review-at',
    '--expires-at', '--revoke', '--import',
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

function boundedInteger(value, fallback, minimum, maximum, name) {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} must be an integer from ${minimum} through ${maximum}`);
  }
  return parsed;
}

function stableDigest(value) {
  return `sha256:${createHash('sha256').update(JSON.stringify(value)).digest('hex')}`;
}

function resolveProjectPath(cwd, requested, label) {
  const root = path.resolve(cwd);
  const candidate = path.resolve(root, requested);
  if (candidate !== root && !candidate.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} must resolve inside the project`);
  }
  return candidate;
}

async function resolveExistingProjectPath(cwd, requested, label) {
  const candidate = resolveProjectPath(cwd, requested, label);
  const [root, actual] = await Promise.all([fs.realpath(cwd), fs.realpath(candidate)]);
  if (actual !== root && !actual.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} cannot traverse a link outside the project`);
  }
  return actual;
}

async function assertWriteTargetInsideProject(cwd, filePath, label) {
  resolveProjectPath(cwd, path.relative(cwd, filePath), label);
  const root = await fs.realpath(cwd);
  let ancestor = path.dirname(filePath);
  while (!await fileStat(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) break;
    ancestor = parent;
  }
  const actual = await fs.realpath(ancestor);
  if (actual !== root && !actual.startsWith(`${root}${path.sep}`)) {
    throw new Error(`${label} cannot traverse a link outside the project`);
  }
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

async function loadContextPackRuntime(frameworkRoot) {
  const candidates = [
    path.join(frameworkRoot, 'dist/src/memory/context-pack.js'),
    path.join(frameworkRoot, 'src/memory/context-pack.ts'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return await import(pathToFileURL(candidate).href);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw error;
    }
  }
  throw new Error('compound-memory context-pack runtime is unavailable');
}

async function loadCanonicalContextRuntime(frameworkRoot) {
  const candidates = [
    path.join(frameworkRoot, 'dist/src/memory/canonical-context.js'),
    path.join(frameworkRoot, 'src/memory/canonical-context.ts'),
  ];
  for (const candidate of candidates) {
    try {
      await fs.access(candidate);
      return await import(pathToFileURL(candidate).href);
    } catch (error) {
      if (error?.code !== 'ENOENT' && error?.code !== 'ERR_UNKNOWN_FILE_EXTENSION') throw error;
    }
  }
  throw new Error('compound-memory canonical-context runtime is unavailable');
}

async function loadLineMemoryRuntime(frameworkRoot) {
  const candidate = path.join(
    frameworkRoot,
    'agentic/code/addons/line-memory/commands/line-memory.mjs',
  );
  await fs.access(candidate);
  return import(pathToFileURL(candidate).href);
}

async function contextPack(args, context) {
  const task = positionalValues(args).join(' ').trim();
  if (!task) return { exitCode: 2, message: 'Usage: aiwg compound-memory context <task> [--budget <characters>] [--no-touch] [--json]' };
  const totalCharacters = boundedInteger(optionValue(args, '--budget'), 8000, 256, 65536, '--budget');
  const lineCharacters = boundedInteger(optionValue(args, '--line-budget'), 2000, 0, 65536, '--line-budget');
  const wikiCharacters = boundedInteger(optionValue(args, '--wiki-budget'), 4000, 0, 65536, '--wiki-budget');
  const citationCharacters = boundedInteger(optionValue(args, '--citation-budget'), 1500, 0, 16384, '--citation-budget');
  const instructionCharacters = boundedInteger(optionValue(args, '--instruction-budget'), 500, 0, 8192, '--instruction-budget');
  const maxFiles = boundedInteger(optionValue(args, '--max-files'), 1000, 1, 10000, '--max-files');
  const runtime = await loadContextPackRuntime(context.frameworkRoot);
  const pack = runtime.buildWorkspaceContextPack(context.cwd, task, {
    maxFiles,
    budget: {
      totalCharacters,
      lineCharacters,
      wikiCharacters,
      citationCharacters,
      instructionCharacters,
    },
  });
  let recency = { touched: false, entries: 0, operationId: null };
  const selectedLineValues = pack.items
    .filter(item => item.tier === 'line')
    .map(item => item.text);
  if (!args.includes('--no-touch') && selectedLineValues.length > 0) {
    const lineMemory = await loadLineMemoryRuntime(context.frameworkRoot);
    const loaded = await lineMemory.loadConfig(context.cwd, { warn: false });
    const receipt = await lineMemory.touchMemoryValues(selectedLineValues, context.cwd, loaded.config);
    recency = {
      touched: receipt.touched.length > 0,
      entries: receipt.touched.length,
      operationId: receipt.operationId,
    };
  }
  const result = { ...pack, recency, inspection: args.includes('--no-touch') };
  emitResult(
    args,
    result,
    `Context pack ${pack.id}: ${pack.items.length} item(s), ${pack.used.totalCharacters}/${pack.budget.totalCharacters} characters.`,
  );
  return { exitCode: 0 };
}

function requiredOption(args, name) {
  const value = optionValue(args, name);
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function updateContext(args, context) {
  const runtime = await loadCanonicalContextRuntime(context.frameworkRoot);
  const repository = new runtime.CanonicalContextRepository(context.cwd);
  if (args.includes('--export')) {
    const bundle = repository.export();
    emitResult(args, bundle, `Exported ${bundle.entries.length} canonical context entr${bundle.entries.length === 1 ? 'y' : 'ies'}.`);
    return { exitCode: 0 };
  }

  let preview;
  let confirmation;
  const importPath = optionValue(args, '--import');
  const revokeId = optionValue(args, '--revoke');
  if (importPath) {
    const absolute = await resolveExistingProjectPath(context.cwd, importPath, 'context import');
    const bundle = JSON.parse(await fs.readFile(absolute, 'utf8'));
    const allowCrossWorkspace = args.includes('--allow-cross-workspace');
    preview = repository.previewImport(bundle, allowCrossWorkspace);
    confirmation = { preview, bundle, allowCrossWorkspace };
  } else if (revokeId) {
    const revoke = {
      entryId: revokeId,
      reviewer: requiredOption(args, '--reviewer'),
      reason: requiredOption(args, '--reason'),
    };
    preview = repository.previewRevoke(revoke.entryId, revoke.reviewer, revoke.reason);
    confirmation = { preview, revoke };
  } else {
    const positional = positionalValues(args);
    if (positional.length < 3) {
      return {
        exitCode: 2,
        message: 'Usage: aiwg compound-memory update <target> <key> <value> --source-ref <ref> --reviewer <id> --reason <text> [--confirm --operation-id <id>] [--json]',
      };
    }
    const proposal = {
      target: positional[0],
      key: positional[1],
      value: positional.slice(2).join(' '),
      sourceRef: requiredOption(args, '--source-ref'),
      sourceDigest: optionValue(args, '--source-digest') ?? null,
      reviewer: requiredOption(args, '--reviewer'),
      reason: requiredOption(args, '--reason'),
      scope: optionValue(args, '--scope') ?? 'project',
      classification: optionValue(args, '--classification') ?? 'internal',
      reviewAt: optionValue(args, '--review-at') ?? null,
      expiresAt: optionValue(args, '--expires-at') ?? null,
    };
    preview = repository.previewUpsert(proposal);
    confirmation = { preview, proposal };
  }

  if (!args.includes('--confirm')) {
    emitResult(args, preview, `Preview ${preview.operation}: ${preview.diff.length} change(s), operation ${preview.operationId}.`);
    return { exitCode: 0 };
  }
  const operationId = requiredOption(args, '--operation-id');
  if (operationId !== preview.operationId) {
    throw new Error('--confirm requires --operation-id from the exact current context preview');
  }
  const receipt = repository.confirm(confirmation);
  const result = {
    schemaVersion: 'aiwg.compound-memory.command.v1',
    status: 'ok',
    command: 'compound-memory.update',
    receipt,
    providerAdaptersModified: false,
  };
  emitResult(args, result, `Canonical context ${receipt.operation} recorded at revision ${receipt.revision}.`);
  return { exitCode: 0 };
}

async function pendingCandidateQueue(args, context) {
  const limit = boundedInteger(optionValue(args, '--limit'), DEFAULT_REVIEW_LIMIT, 1, MAX_REVIEW_LIMIT, '--limit');
  const workspaceId = optionValue(args, '--workspace-id');
  const requestedDb = optionValue(args, '--db') ?? SESSION_CATALOG;
  const candidatePath = resolveProjectPath(context.cwd, requestedDb, 'session catalog');
  if (!await fileStat(candidatePath)) {
    return {
      status: 'ready',
      database: path.relative(context.cwd, candidatePath),
      items: [],
      count: 0,
      bounded: true,
      limit,
    };
  }
  const databasePath = await resolveExistingProjectPath(context.cwd, requestedDb, 'session catalog');
  let Database;
  try {
    const module = await import('better-sqlite3');
    Database = module.default;
  } catch {
    return {
      status: 'unavailable',
      database: path.relative(context.cwd, databasePath),
      items: [],
      count: null,
      bounded: true,
      limit,
      detail: 'candidate query requires the optional better-sqlite3 dependency',
    };
  }
  const database = new Database(databasePath, { readonly: true, fileMustExist: true });
  try {
    const scanLimit = Math.min(MAX_STATUS_FILES, Math.max(limit * 4, limit));
    const rows = database.prepare(
      'SELECT data FROM intelligence_candidates WHERE review_state=? ORDER BY candidate_id, version LIMIT ?',
    ).all('pending', scanLimit);
    const candidates = rows.map(row => JSON.parse(String(row.data)))
      .filter(candidate => !workspaceId || candidate.projectScope === workspaceId);
    const selected = candidates.slice(0, limit).map(candidate => ({
      candidateId: candidate.candidateId,
      version: candidate.version,
      type: candidate.type,
      assertionDigest: stableDigest(candidate.assertion),
      confidence: candidate.confidence,
      sensitivity: candidate.sensitivity,
      warningCount: Array.isArray(candidate.security?.warnings)
        ? candidate.security.warnings.length
        : 0,
      conflictsWith: Array.isArray(candidate.conflictsWith) ? candidate.conflictsWith : [],
      supersedes: Array.isArray(candidate.supersedes) ? candidate.supersedes : [],
      evidenceCount: Array.isArray(candidate.evidence) ? candidate.evidence.length : 0,
    }));
    return {
      status: 'ready',
      database: path.relative(context.cwd, databasePath),
      items: selected,
      count: selected.length,
      bounded: candidates.length <= limit && rows.length < scanLimit,
      limit,
      workspaceId: workspaceId ?? null,
    };
  } finally {
    database.close();
  }
}

async function reviewQueue(args, context) {
  const queue = await pendingCandidateQueue(args, context);
  const result = {
    schemaVersion: 'aiwg.compound-memory.review.v1',
    command: 'compound-memory.review',
    ...queue,
    mutation: false,
    nextAction: queue.count
      ? 'inspect evidence with aiwg sessions candidates, then use exact-version aiwg sessions review'
      : null,
  };
  emitResult(args, result, `Pending review candidates: ${queue.count ?? 'unavailable'}`);
  return { exitCode: queue.status === 'unavailable' ? 1 : 0 };
}

async function maintenancePlan(args, context) {
  const [status, review] = await Promise.all([
    compoundMemoryStatus(context.cwd, context.frameworkRoot),
    pendingCandidateQueue(args, context),
  ]);
  const runtime = await loadOutputRegistration(context.frameworkRoot);
  const store = new runtime.FilesystemOutputRegistrationStore(context.cwd);
  const pending = store.pending();
  const actions = [];
  if (pending.length > 0) actions.push({
    id: 'replay-output-index',
    mode: 'automatic',
    count: pending.length,
    operationIds: pending.map(record => record.operationId).sort(),
  });
  if (status.lineMemory.integrity !== 'ok') actions.push({
    id: 'line-memory-integrity',
    mode: 'delegated',
    state: status.lineMemory.integrity,
    command: status.lineMemory.integrity === 'repairable'
      ? 'aiwg line-memory list --no-touch'
      : 'review .aiwg/memory/line-memory.meta.json before mutation',
  });
  if (status.wiki.stale || !status.wiki.indexPresent) actions.push({
    id: 'wiki-index',
    mode: 'delegated',
    state: status.wiki.stale ? 'stale' : 'missing',
    command: 'run the llm-wiki index refresh workflow',
  });
  if ((review.count ?? 0) > 0) actions.push({
    id: 'candidate-review',
    mode: 'review-required',
    count: review.count,
    candidateIds: review.items.map(item => `${item.candidateId}@${item.version}`),
  });
  const snapshot = {
    lineMemory: { facts: status.lineMemory.facts, integrity: status.lineMemory.integrity },
    wiki: {
      initialized: status.wiki.initialized,
      indexPresent: status.wiki.indexPresent,
      stale: status.wiki.stale,
    },
    pendingOutputOperations: pending.map(record => record.operationId).sort(),
    pendingCandidates: review.items.map(item => `${item.candidateId}@${item.version}`),
  };
  return {
    schemaVersion: 'aiwg.compound-memory.maintenance-preview.v1',
    operationId: stableDigest({ operation: 'compound-memory-maintain', snapshot, actions }),
    snapshot,
    actions,
    confirmationRequired: true,
  };
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function writeJsonAtomic(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx', mode: 0o600 });
  try {
    await fs.link(temporary, filePath);
    return true;
  } catch (error) {
    if (error?.code === 'EEXIST') return false;
    throw error;
  } finally {
    await fs.unlink(temporary).catch(error => {
      if (error?.code !== 'ENOENT') throw error;
    });
  }
}

async function maintain(args, context) {
  const preview = await maintenancePlan(args, context);
  if (!args.includes('--confirm')) {
    emitResult(args, preview, `Maintenance preview: ${preview.actions.length} action(s); operation ${preview.operationId}`);
    return { exitCode: 0 };
  }
  const operationId = optionValue(args, '--operation-id');
  if (!operationId || operationId !== preview.operationId) {
    throw new Error('--confirm requires --operation-id from the exact current maintenance preview');
  }
  const receiptRoot = path.join(context.cwd, MAINTENANCE_RECEIPTS);
  const receiptPath = path.join(receiptRoot, `${operationId.replace(':', '_')}.json`);
  await assertWriteTargetInsideProject(context.cwd, receiptPath, 'maintenance receipt');
  const existing = await readJson(receiptPath);
  if (existing) {
    const duplicate = { ...existing, duplicate: true };
    emitResult(args, duplicate, `Maintenance already recorded for ${operationId}.`);
    return { exitCode: 0 };
  }
  const runtime = await loadOutputRegistration(context.frameworkRoot);
  const store = new runtime.FilesystemOutputRegistrationStore(context.cwd);
  const index = new runtime.FilesystemDerivedOutputIndex(context.cwd);
  const coordinator = new runtime.OutputRegistrationCoordinator(context.cwd, store, index);
  const replayed = preview.actions.some(action => action.id === 'replay-output-index')
    ? await coordinator.replayPending()
    : [];
  const receipt = {
    schemaVersion: 'aiwg.compound-memory.maintenance-receipt.v1',
    operationId,
    completedAt: new Date().toISOString(),
    duplicate: false,
    results: preview.actions.map(action => action.id === 'replay-output-index'
      ? { id: action.id, status: 'completed', replayed: replayed.length }
      : { id: action.id, status: 'deferred', mode: action.mode, command: action.command ?? null }),
  };
  const created = await writeJsonAtomic(receiptPath, receipt);
  if (!created) {
    const duplicate = { ...await readJson(receiptPath), duplicate: true };
    emitResult(args, duplicate, `Maintenance already recorded for ${operationId}.`);
    return { exitCode: 0 };
  }
  emitResult(args, receipt, `Maintenance receipt recorded; replayed ${replayed.length} output registration(s).`);
  return { exitCode: 0 };
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
      const candidateReview = await pendingCandidateQueue(args, context);
      const report = await compoundMemoryStatus(context.cwd, context.frameworkRoot, candidateReview);
      if (args.includes('--json')) console.log(JSON.stringify(report, null, 2));
      else console.log(renderHuman(report));
      return { exitCode: report.status === 'degraded' ? 1 : 0 };
    }
    if (context.subcommand === 'capture-output') return await captureOutput(args, context);
    if (context.subcommand === 'context') return await contextPack(args, context);
    if (context.subcommand === 'update') return await updateContext(args, context);
    if (context.subcommand === 'review') return await reviewQueue(args, context);
    if (context.subcommand === 'maintain') return await maintain(args, context);
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
