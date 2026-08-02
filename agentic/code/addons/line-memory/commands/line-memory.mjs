import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';

export const DEFAULT_CONFIG = Object.freeze({
  path: '.aiwg/memory/line-memory.txt',
  metadataPath: '.aiwg/memory/line-memory.meta.json',
  maxLines: 200,
  dedupe: true,
  trimBlankLines: true,
});

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_SEARCH_LIMIT = 5;
const MAX_QUERY_LIMIT = 1000;
const CONFIG_PATH = '.aiwg/memory/line-memory.config.json';
const LOCK_PATH = '.aiwg/memory/line-memory.lock';
const TRANSACTION_PATH = '.aiwg/memory/transactions';
const CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIG));

function memoryDigest(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function newMemoryId() {
  return `lm_${randomUUID()}`;
}

function validatedMemoryId(value) {
  if (!/^lm_[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value ?? '')) {
    throw new Error('line-memory handle must be an lm_-prefixed UUID');
  }
  return value;
}

function wantsJson(args) {
  return args.includes('--json');
}

function emit(args, value, readable) {
  if (wantsJson(args)) console.log(JSON.stringify({
    schemaVersion: '1.0.0',
    status: value.status ?? 'ok',
    command: `line-memory.${value.operation ?? 'unknown'}`,
    ...value,
  }, null, 2));
  else if (readable) console.log(readable);
}

function emitError(args, subcommand, message) {
  if (!wantsJson(args)) return;
  console.log(JSON.stringify({
    schemaVersion: '1.0.0',
    status: 'error',
    command: `line-memory.${subcommand}`,
    error: { code: 'LINE_MEMORY_ERROR', message },
  }, null, 2));
}

function optionValue(args, name) {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
}

function result(exitCode, message) {
  return message ? { exitCode, message } : { exitCode };
}

function normalizeMemory(value) {
  return value.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim();
}

function assertProjectRelativePath(cwd, candidate) {
  if (typeof candidate !== 'string' || candidate.trim() === '') {
    throw new Error('Config path must be a non-empty project-relative path.');
  }
  if (path.isAbsolute(candidate) || candidate.includes('\0')) {
    throw new Error('Config path must remain inside the project.');
  }
  const resolved = path.resolve(cwd, candidate);
  const relative = path.relative(path.resolve(cwd), resolved);
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Config path must remain inside the project.');
  }
  return resolved;
}

function parsePositiveInteger(value, label) {
  if (!/^\d+$/.test(String(value))) {
    throw new Error(`${label} must be a positive integer.`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw new Error(`${label} must be a positive integer.`);
  }
  return parsed;
}

function parseBoolean(value, label) {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  throw new Error(`${label} must be true or false.`);
}

function normalizeConfig(raw, cwd) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Config root must be a JSON object.');
  }

  const config = { ...DEFAULT_CONFIG };
  if ('path' in raw) {
    assertProjectRelativePath(cwd, raw.path);
    config.path = raw.path;
  }
  if ('metadataPath' in raw) {
    assertProjectRelativePath(cwd, raw.metadataPath);
    config.metadataPath = raw.metadataPath;
  }
  if ('maxLines' in raw) config.maxLines = parsePositiveInteger(raw.maxLines, 'maxLines');
  if ('dedupe' in raw) config.dedupe = parseBoolean(raw.dedupe, 'dedupe');
  if ('trimBlankLines' in raw) {
    config.trimBlankLines = parseBoolean(raw.trimBlankLines, 'trimBlankLines');
  }
  return config;
}

export async function loadConfig(cwd, { warn = true } = {}) {
  const configPath = path.join(cwd, CONFIG_PATH);
  try {
    const raw = JSON.parse(await fs.readFile(configPath, 'utf8'));
    return { config: normalizeConfig(raw, cwd), recovered: false, configPath };
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return { config: { ...DEFAULT_CONFIG }, recovered: true, configPath };
    }
    if (warn) {
      console.error(
        `line-memory: invalid config at ${CONFIG_PATH}; using safe defaults (${error.message})`,
      );
    }
    return { config: { ...DEFAULT_CONFIG }, recovered: true, configPath };
  }
}

async function writeAtomic(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.tmp-${process.pid}-${Math.random().toString(36).slice(2)}`;
  try {
    await fs.writeFile(temporary, content, 'utf8');
    await fs.rename(temporary, filePath);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function writeConfig(configPath, config) {
  await writeAtomic(configPath, `${JSON.stringify(config, null, 2)}\n`);
}

async function withLock(cwd, operation) {
  const lockPath = path.join(cwd, LOCK_PATH);
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  let handle;
  for (let attempt = 0; attempt < 100; attempt++) {
    try {
      handle = await fs.open(lockPath, 'wx', 0o600);
      await handle.writeFile(`${JSON.stringify({ pid: process.pid, createdAt: new Date().toISOString() })}\n`);
      break;
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      try {
        const owner = JSON.parse(await fs.readFile(lockPath, 'utf8'));
        if (!Number.isInteger(owner.pid) || owner.pid < 1) throw new Error('invalid lock owner');
        process.kill(owner.pid, 0);
      } catch (ownerError) {
        if (ownerError?.code === 'ESRCH' || ownerError?.message === 'invalid lock owner') {
          await fs.rm(lockPath, { force: true });
          continue;
        }
      }
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }
  if (!handle) throw new Error('line-memory: timed out waiting for the project memory lock');
  try {
    await recoverTransactions(cwd);
    return await operation();
  } finally {
    await handle.close().catch(() => {});
    await fs.rm(lockPath, { force: true }).catch(() => {});
  }
}

function memoryContent(lines) {
  return lines.length > 0 ? `${lines.join('\n')}\n` : '';
}

function projectRelative(cwd, target) {
  const relative = path.relative(path.resolve(cwd), path.resolve(target));
  if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('line-memory transaction path must remain inside the project');
  }
  return relative;
}

async function commitMemoryState(cwd, memoryPath, lines, metadataPath, metadata, operation) {
  const transactionRoot = path.join(cwd, TRANSACTION_PATH);
  await fs.mkdir(transactionRoot, { recursive: true });
  const operationId = createHash('sha256').update(JSON.stringify({
    operation,
    memory: memoryContent(lines),
    metadata,
  })).digest('hex');
  const journalPath = path.join(transactionRoot, `${operationId}.json`);
  const journal = {
    schemaVersion: 'aiwg.line-memory.transaction.v1',
    operationId,
    operation,
    memoryPath: projectRelative(cwd, memoryPath),
    metadataPath: projectRelative(cwd, metadataPath),
    memoryContent: memoryContent(lines),
    metadataContent: `${JSON.stringify(metadata, null, 2)}\n`,
  };
  await writeAtomic(journalPath, `${JSON.stringify(journal, null, 2)}\n`);
  await writeAtomic(memoryPath, journal.memoryContent);
  await writeAtomic(metadataPath, journal.metadataContent);
  await fs.rm(journalPath, { force: true });
  return operationId;
}

async function recoverTransactions(cwd) {
  const transactionRoot = path.join(cwd, TRANSACTION_PATH);
  let names;
  try {
    names = await fs.readdir(transactionRoot);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  for (const name of names.filter((candidate) => candidate.endsWith('.json')).sort()) {
    const journalPath = path.join(transactionRoot, name);
    const journal = JSON.parse(await fs.readFile(journalPath, 'utf8'));
    if (journal?.schemaVersion !== 'aiwg.line-memory.transaction.v1') {
      throw new Error(`line-memory: invalid transaction journal ${name}`);
    }
    const memoryPath = assertProjectRelativePath(cwd, journal.memoryPath);
    const metadataPath = assertProjectRelativePath(cwd, journal.metadataPath);
    await writeAtomic(memoryPath, journal.memoryContent);
    await writeAtomic(metadataPath, journal.metadataContent);
    await fs.rm(journalPath, { force: true });
  }
}

async function loadMetadata(cwd, config = DEFAULT_CONFIG) {
  const metadataPath = assertProjectRelativePath(cwd, config.metadataPath);
  try {
    const parsed = JSON.parse(await fs.readFile(metadataPath, 'utf8'));
    if (parsed?.version !== 1 || typeof parsed.entries !== 'object' || Array.isArray(parsed.entries)) {
      throw new Error('invalid metadata schema');
    }
    parsed.store = {
      memoryPath: config.path,
      metadataPath: config.metadataPath,
    };
    return { metadataPath, metadata: parsed };
  } catch (error) {
    if (error?.code !== 'ENOENT') {
      console.error(`line-memory: invalid metadata at ${config.metadataPath}; rebuilding safe metadata (${error.message})`);
    }
    return {
      metadataPath,
      metadata: {
        schemaVersion: 'aiwg.line-memory.v1',
        version: 1,
        store: { memoryPath: config.path, metadataPath: config.metadataPath },
        entries: {},
      },
    };
  }
}

async function writeMetadata(metadataPath, metadata) {
  await writeAtomic(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
}

function ensureEntry(metadata, value, now = new Date().toISOString(), preferredId) {
  const digest = memoryDigest(value);
  const existing = Object.values(metadata.entries).find(
    (entry) => entry.digest === digest && entry.value === value && entry.status === 'active',
  );
  const id = existing?.id ?? (preferredId ? validatedMemoryId(preferredId) : newMemoryId());
  if (!existing && metadata.entries[id] && metadata.entries[id].value !== value) {
    throw new Error(`line-memory handle already belongs to a different fact: ${id}`);
  }
  metadata.entries[id] = existing
    ? { ...existing, value, digest, status: 'active', updatedAt: now }
    : {
        id,
        value,
        digest,
        status: 'active',
        createdAt: now,
        updatedAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        sources: [],
      };
  return metadata.entries[id];
}

function recordSource(entry, args, now = new Date().toISOString()) {
  const sourceRef = optionValue(args, '--source-ref');
  if (!sourceRef) return;
  const source = {
    ref: sourceRef,
    reviewer: optionValue(args, '--reviewer') ?? null,
    reason: optionValue(args, '--reason') ?? null,
    recordedAt: now,
  };
  if (!entry.sources.some((item) => item.ref === source.ref && item.reviewer === source.reviewer)) {
    entry.sources.push(source);
  }
}

function entryView(value, metadata, recency) {
  const digest = memoryDigest(value);
  const entry = Object.values(metadata.entries).find(
    (candidate) => candidate.digest === digest && candidate.value === value && candidate.status === 'active',
  ) ?? {
    id: null,
    value,
    digest,
    status: 'active',
    createdAt: null,
    updatedAt: null,
    lastAccessedAt: null,
    accessCount: 0,
    sources: [],
  };
  return { ...entry, recency };
}

function reconcileMetadata(lines, metadata) {
  let changed = false;
  const now = new Date().toISOString();
  for (const value of lines.filter((line) => line.trim() !== '')) {
    const digest = memoryDigest(value);
    const existing = Object.values(metadata.entries).find(
      (entry) => entry.digest === digest && entry.value === value && entry.status === 'active',
    );
    if (!existing) {
      ensureEntry(metadata, value, now);
      changed = true;
    }
  }
  return changed;
}

export async function readMemoryLines(cwd, config) {
  const memoryPath = assertProjectRelativePath(cwd, config.path);
  let raw;
  try {
    raw = await fs.readFile(memoryPath, 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return { lines: [], memoryPath };
    throw error;
  }

  const lines = raw.split(/\r?\n/);
  if (lines.at(-1) === '') lines.pop();
  return {
    lines: config.trimBlankLines ? lines.filter((line) => line.trim() !== '') : lines,
    memoryPath,
  };
}

function memoryCount(lines) {
  return lines.filter((line) => line.trim() !== '').length;
}

export function pruneLines(lines, maxLines) {
  const output = [...lines];
  let excess = memoryCount(output) - maxLines;
  for (let index = 0; excess > 0 && index < output.length;) {
    if (output[index].trim() !== '') {
      output.splice(index, 1);
      excess--;
    } else {
      index++;
    }
  }
  return output;
}

function moveIndexesToNewest(lines, indexes) {
  if (indexes.length === 0) return [...lines];
  const selected = new Set(indexes);
  return [
    ...lines.filter((_, index) => !selected.has(index)),
    ...indexes.map((index) => lines[index]),
  ];
}

function parseLimit(args, defaultValue) {
  const index = args.indexOf('--limit');
  if (index < 0) return defaultValue;
  if (!args[index + 1]) throw new Error('--limit requires a positive integer.');
  const requested = parsePositiveInteger(args[index + 1], '--limit');
  return Math.min(requested, MAX_QUERY_LIMIT);
}

function positionalArgs(args, valueOptions = new Set([
  '--limit', '--source-ref', '--reviewer', '--reason', '--by', '--handle',
])) {
  const output = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (valueOptions.has(arg)) {
      index++;
      continue;
    }
    if (arg === '--no-touch' || arg === '--case-sensitive' || arg === '--json'
      || arg === '--confirm' || arg === '--dry-run') continue;
    output.push(arg);
  }
  return output;
}

async function addMemory(args, cwd, config, operation = 'add') {
  const memory = normalizeMemory(positionalArgs(args).join(' '));
  if (!memory) return result(1, 'A nonblank memory is required.');

  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const { metadataPath, metadata } = await loadMetadata(cwd, config);
  reconcileMetadata(lines, metadata);
  const next = config.dedupe
    ? lines.filter((line) => line !== memory)
    : [...lines];
  next.push(memory);
  const pruned = pruneLines(next, config.maxLines);
  const now = new Date().toISOString();
  const entry = ensureEntry(metadata, memory, now, optionValue(args, '--handle'));
  entry.lastAccessedAt = now;
  recordSource(entry, args, now);
  for (const value of next.filter((line) => !pruned.includes(line))) {
    const removed = Object.values(metadata.entries).find(
      (candidate) => candidate.digest === memoryDigest(value) && candidate.value === value && candidate.status === 'active',
    );
    if (removed) {
      removed.status = 'pruned';
      removed.updatedAt = now;
    }
  }
  const operationId = await commitMemoryState(
    cwd, memoryPath, pruned, metadataPath, metadata, operation,
  );
  const view = entryView(memory, metadata, pruned.length - 1);
  emit(args, { operation, operationId, retained: memoryCount(pruned), maxLines: config.maxLines, entry: view });
  return result(0, wantsJson(args) ? undefined : `Added memory. Retained ${memoryCount(pruned)}/${config.maxLines}.`);
}

async function listMemories(args, cwd, config) {
  const limit = parseLimit(args, DEFAULT_LIST_LIMIT);
  const shouldTouch = !args.includes('--no-touch');
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const { metadataPath, metadata } = await loadMetadata(cwd, config);
  const metadataChanged = reconcileMetadata(lines, metadata);
  const indexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() !== '')
    .map(({ index }) => index)
    .slice(-limit);

  if (indexes.length === 0) {
    if (metadataChanged) await writeMetadata(metadataPath, metadata);
    emit(args, { operation: 'list', entries: [] });
    return result(0, wantsJson(args) ? undefined : 'No memories found.');
  }
  const values = indexes.map((index) => lines[index]).reverse();
  emit(args, { operation: 'list', entries: values.map((value, index) => entryView(value, metadata, lines.length - 1 - index)) }, values.join('\n'));
  if (shouldTouch) {
    const reordered = moveIndexesToNewest(lines, indexes);
    const now = new Date().toISOString();
    for (const value of values) {
      const entry = ensureEntry(metadata, value, now);
      entry.lastAccessedAt = now;
      entry.accessCount = (entry.accessCount ?? 0) + 1;
    }
    await commitMemoryState(cwd, memoryPath, reordered, metadataPath, metadata, 'list-touch');
  } else if (metadataChanged) {
    await writeMetadata(metadataPath, metadata);
  }
  return result(0);
}

async function searchMemories(args, cwd, config) {
  const query = normalizeMemory(positionalArgs(args).join(' '));
  if (!query) return result(1, 'A nonblank search query is required.');
  const limit = parseLimit(args, DEFAULT_SEARCH_LIMIT);
  const shouldTouch = !args.includes('--no-touch');
  const caseSensitive = args.includes('--case-sensitive');
  const needle = caseSensitive ? query : query.toLocaleLowerCase();
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const { metadataPath, metadata } = await loadMetadata(cwd, config);
  const metadataChanged = reconcileMetadata(lines, metadata);
  const indexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => {
      const haystack = caseSensitive ? line : line.toLocaleLowerCase();
      return line.trim() !== '' && haystack.includes(needle);
    })
    .map(({ index }) => index)
    .slice(-limit);

  if (indexes.length === 0) {
    if (metadataChanged) await writeMetadata(metadataPath, metadata);
    emit(args, { operation: 'search', query, entries: [] });
    return result(0, wantsJson(args) ? undefined : 'No matching memories found.');
  }
  const values = indexes.map((index) => lines[index]).reverse();
  emit(args, { operation: 'search', query, entries: values.map((value, index) => entryView(value, metadata, lines.length - 1 - index)) }, values.join('\n'));
  if (shouldTouch) {
    const reordered = moveIndexesToNewest(lines, indexes);
    const now = new Date().toISOString();
    for (const value of values) {
      const entry = ensureEntry(metadata, value, now);
      entry.lastAccessedAt = now;
      entry.accessCount = (entry.accessCount ?? 0) + 1;
    }
    await commitMemoryState(cwd, memoryPath, reordered, metadataPath, metadata, 'search-touch');
  } else if (metadataChanged) {
    await writeMetadata(metadataPath, metadata);
  }
  return result(0);
}

async function touchMemory(args, cwd, config) {
  const memory = normalizeMemory(positionalArgs(args).join(' '));
  if (!memory) return result(1, 'A nonblank memory is required.');
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const { metadataPath, metadata } = await loadMetadata(cwd, config);
  const index = lines.findIndex((line) => line === memory);
  if (index < 0) return result(1, 'Exact memory not found.');
  const reordered = moveIndexesToNewest(lines, [index]);
  const now = new Date().toISOString();
  const entry = ensureEntry(metadata, memory, now);
  entry.lastAccessedAt = now;
  entry.accessCount = (entry.accessCount ?? 0) + 1;
  const operationId = await commitMemoryState(
    cwd, memoryPath, reordered, metadataPath, metadata, 'touch',
  );
  emit(args, { operation: 'touch', operationId, entry: entryView(memory, metadata, lines.length - 1) });
  return result(0, wantsJson(args) ? undefined : 'Memory moved to newest position.');
}

/** Touch only exact values selected by an external bounded retrieval planner. */
export async function touchMemoryValues(values, cwd, config) {
  const selected = [...new Set(values.map(normalizeMemory).filter(Boolean))];
  if (selected.length === 0) return { operationId: null, touched: [] };
  return withLock(cwd, async () => {
    const { lines, memoryPath } = await readMemoryLines(cwd, config);
    const { metadataPath, metadata } = await loadMetadata(cwd, config);
    reconcileMetadata(lines, metadata);
    const indexes = selected
      .map(value => lines.findIndex(line => line === value))
      .filter(index => index >= 0);
    if (indexes.length === 0) return { operationId: null, touched: [] };
    const touched = indexes.map(index => lines[index]);
    const reordered = moveIndexesToNewest(lines, indexes);
    const now = new Date().toISOString();
    for (const value of touched) {
      const entry = ensureEntry(metadata, value, now);
      entry.lastAccessedAt = now;
      entry.accessCount = (entry.accessCount ?? 0) + 1;
    }
    const operationId = await commitMemoryState(
      cwd, memoryPath, reordered, metadataPath, metadata, 'context-pack-touch',
    );
    return { operationId, touched };
  });
}

async function pruneMemory(args, cwd, config) {
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const { metadataPath, metadata } = await loadMetadata(cwd, config);
  const before = memoryCount(lines);
  const pruned = pruneLines(lines, config.maxLines);
  const retained = new Set(pruned);
  const now = new Date().toISOString();
  for (const value of lines.filter((line) => line.trim() && !retained.has(line))) {
    const entry = ensureEntry(metadata, value, now);
    entry.status = 'pruned';
    entry.updatedAt = now;
  }
  const operationId = await commitMemoryState(
    cwd, memoryPath, pruned, metadataPath, metadata, 'prune',
  );
  const count = before - memoryCount(pruned);
  emit(args, {
    operation: 'prune', operationId, pruned: count, retained: memoryCount(pruned),
  });
  return result(0, wantsJson(args) ? undefined : `Pruned ${count} memories. Retained ${memoryCount(pruned)}.`);
}

async function importMemory(args, cwd, config) {
  const dryRun = args.includes('--dry-run');
  if (!dryRun && !args.includes('--confirm')) return result(1, 'Reviewed import requires --confirm.');
  if (!optionValue(args, '--source-ref') || !optionValue(args, '--reviewer')) {
    return result(1, 'Reviewed import requires --source-ref and --reviewer.');
  }
  if (dryRun) {
    const memory = normalizeMemory(positionalArgs(args).join(' '));
    if (!memory) return result(1, 'A nonblank memory is required.');
    const { lines } = await readMemoryLines(cwd, config);
    const { metadata } = await loadMetadata(cwd, config);
    reconcileMetadata(lines, metadata);
    const existing = Object.values(metadata.entries).find(
      (entry) => entry.value === memory
        && entry.digest === memoryDigest(memory)
        && entry.status === 'active',
    );
    const next = config.dedupe ? lines.filter((line) => line !== memory) : [...lines];
    next.push(memory);
    const retained = pruneLines(next, config.maxLines);
    const preferred = optionValue(args, '--handle');
    const proposedHandle = existing?.id
      ?? (preferred ? validatedMemoryId(preferred) : null);
    emit(args, {
      operation: 'import',
      status: 'preview',
      confirmationRequired: true,
      mutation: {
        wouldWrite: true,
        wouldDedupe: config.dedupe && lines.includes(memory),
        retained: memoryCount(retained),
        pruned: memoryCount(next) - memoryCount(retained),
      },
      entry: {
        id: proposedHandle,
        value: memory,
        digest: memoryDigest(memory),
        existing: Boolean(existing),
      },
    }, `Preview: import would retain ${memoryCount(retained)}/${config.maxLines} memories.`);
    return result(0);
  }
  return addMemory(args, cwd, config, 'import');
}

async function dispositionMemory(action, args, cwd, config) {
  const operation = action === 'archived' ? 'archive'
    : action === 'superseded' ? 'supersede'
      : 'remove';
  const expectedStatus = action === 'remove' ? 'removed' : action;
  const dryRun = args.includes('--dry-run');
  const selector = normalizeMemory(positionalArgs(args).join(' '));
  if (!selector) return result(1, `A memory handle or exact value is required for ${operation}.`);
  if (!dryRun && !args.includes('--confirm')) return result(1, `${operation} requires --confirm.`);
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const { metadataPath, metadata } = await loadMetadata(cwd, config);
  const selectedEntry = metadata.entries[selector];
  const index = lines.findIndex((line) => line === selector || (
    selectedEntry?.status === 'active'
    && selectedEntry.value === line
    && selectedEntry.digest === memoryDigest(line)
  ));
  if (index < 0 && selectedEntry?.status === expectedStatus) {
    emit(args, {
      operation,
      ...(dryRun ? { status: 'preview', confirmationRequired: true } : {}),
      duplicate: true,
      mutation: { wouldWrite: false, occurrencesRemoved: 0 },
      entry: { ...selectedEntry, recency: -1 },
    });
    return result(0, wantsJson(args) ? undefined : `Memory already marked ${expectedStatus}.`);
  }
  if (index < 0) return result(1, 'Exact memory not found.');
  const value = lines[index];
  const replacement = optionValue(args, '--by') ?? null;
  if (action === 'superseded' && !replacement) {
    return result(1, 'supersede requires --by <replacement-handle-or-reference>.');
  }
  const occurrencesRemoved = selectedEntry
    ? lines.filter((line) => line === selectedEntry.value).length
    : 1;
  if (dryRun) {
    emit(args, {
      operation,
      status: 'preview',
      confirmationRequired: true,
      duplicate: false,
      mutation: { wouldWrite: true, occurrencesRemoved },
      entry: {
        ...(selectedEntry ?? entryView(value, metadata, index)),
        status: expectedStatus,
        recency: index,
        disposition: {
          reviewer: optionValue(args, '--reviewer') ?? null,
          reason: optionValue(args, '--reason') ?? null,
          replacement,
        },
      },
    }, `Preview: ${operation} would remove ${occurrencesRemoved} active occurrence(s).`);
    return result(0);
  }
  // A handle identifies the normalized logical fact. When legacy configuration
  // permits duplicate physical lines, a handle disposition applies to every
  // occurrence so an active copy cannot survive behind a tombstoned identity.
  const next = selectedEntry
    ? lines.filter((line) => line !== selectedEntry.value)
    : lines.filter((_, candidate) => candidate !== index);
  const now = new Date().toISOString();
  const entry = ensureEntry(metadata, value, now);
  entry.status = expectedStatus;
  entry.updatedAt = now;
  entry.disposition = {
    reviewer: optionValue(args, '--reviewer') ?? null,
    reason: optionValue(args, '--reason') ?? null,
    replacement,
    recordedAt: now,
  };
  const operationId = await commitMemoryState(
    cwd, memoryPath, next, metadataPath, metadata, operation,
  );
  emit(args, {
    operation,
    operationId,
    duplicate: false,
    mutation: { wouldWrite: true, occurrencesRemoved },
    entry: { ...entry, recency: -1 },
  });
  return result(0, wantsJson(args) ? undefined : `Memory marked ${expectedStatus}.`);
}

async function configCommand(args, cwd, loaded) {
  const values = args.filter((arg) => arg !== '--json');
  const action = values[0];
  if (action === 'get') {
    const key = values[1];
    if (!key) {
      emit(args, { operation: 'config', config: loaded.config }, JSON.stringify(loaded.config, null, 2));
      return result(0);
    }
    if (!CONFIG_KEYS.has(key)) return result(1, `Unknown config key: ${key}`);
    emit(args, { operation: 'config', key, value: loaded.config[key] }, String(loaded.config[key]));
    return result(0);
  }

  if (action !== 'set' || !values[1] || values[2] === undefined) {
    return result(1, 'Usage: aiwg line-memory config get [key] | set <key> <value>');
  }

  const key = values[1];
  const rawValue = values.slice(2).join(' ');
  if (!CONFIG_KEYS.has(key)) return result(1, `Unknown config key: ${key}`);
  const next = { ...loaded.config };
  if (key === 'maxLines') next.maxLines = parsePositiveInteger(rawValue, 'maxLines');
  if (key === 'dedupe') next.dedupe = parseBoolean(rawValue, 'dedupe');
  if (key === 'trimBlankLines') next.trimBlankLines = parseBoolean(rawValue, 'trimBlankLines');
  if (key === 'path' || key === 'metadataPath') {
    assertProjectRelativePath(cwd, rawValue);
    next[key] = rawValue;
  }
  await writeConfig(loaded.configPath, next);

  if (key === 'maxLines') {
    await pruneMemory([], cwd, next);
  }
  emit(args, { operation: 'config', key, value: next[key], config: next });
  return result(0, wantsJson(args) ? undefined : `Set ${key}=${String(next[key])}.`);
}

export async function runLineMemory(subcommand, args, cwd) {
  try {
    const outcome = await withLock(cwd, async () => {
      const loaded = await loadConfig(cwd);
      switch (subcommand) {
        case 'add':
          return await addMemory(args, cwd, loaded.config);
        case 'import':
          return await importMemory(args, cwd, loaded.config);
        case 'list':
          return await listMemories(args, cwd, loaded.config);
        case 'search':
          return await searchMemories(args, cwd, loaded.config);
        case 'touch':
          return await touchMemory(args, cwd, loaded.config);
        case 'archive':
          return await dispositionMemory('archived', args, cwd, loaded.config);
        case 'remove':
          return await dispositionMemory('remove', args, cwd, loaded.config);
        case 'supersede':
          return await dispositionMemory('superseded', args, cwd, loaded.config);
        case 'prune':
          return await pruneMemory(args, cwd, loaded.config);
        case 'config':
          return await configCommand(args, cwd, loaded);
        default:
          return result(1, `Unknown line-memory subcommand: ${subcommand}`);
      }
    });
    if (outcome.exitCode !== 0) emitError(args, subcommand, outcome.message ?? 'line-memory operation failed');
    return wantsJson(args) && outcome.exitCode !== 0
      ? { ...outcome, message: undefined }
      : outcome;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    emitError(args, subcommand, message);
    return result(1, wantsJson(args) ? undefined : message);
  }
}

function deterministicPromotionHandle(candidateId, version) {
  const hex = createHash('sha256').update(`${candidateId}\0${version}`).digest('hex');
  return `lm_${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Session promotion adapter that writes through the same locked store used by
 * the CLI. The plan contains only inert fact/provenance data; the reviewed
 * candidate gate and durable promotion receipt remain owned by sessions.
 */
export class LineMemoryPromotionDestination {
  constructor({ projectRoot, consumer = 'line-memory' }) {
    this.consumer = consumer;
    this.projectRoot = path.resolve(projectRoot);
  }

  plan(candidate) {
    const fact = normalizeMemory(candidate.assertion ?? '');
    if (!fact) throw new Error('line-memory promotion requires a nonblank candidate assertion');
    const sourceRef = `session-candidate:${candidate.candidateId}:v${candidate.version}`;
    const configPath = path.join(this.projectRoot, CONFIG_PATH);
    let config = { ...DEFAULT_CONFIG };
    try {
      config = normalizeConfig(JSON.parse(requireText(configPath)), this.projectRoot);
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const memoryPath = assertProjectRelativePath(this.projectRoot, config.path);
    const metadataPath = assertProjectRelativePath(this.projectRoot, config.metadataPath);
    let existingHandle = null;
    try {
      const metadata = JSON.parse(safeRequireText(metadataPath));
      existingHandle = Object.values(metadata.entries ?? {}).find(
        (entry) => entry?.status === 'active'
          && entry?.value === fact
          && entry?.digest === memoryDigest(fact),
      )?.id ?? null;
    } catch {
      // The locked write path owns sidecar recovery. Planning a new identity is
      // safe because the write validates handle ownership before committing.
    }
    const handle = existingHandle
      ?? deterministicPromotionHandle(candidate.candidateId, candidate.version);
    const before = [safeRequireText(memoryPath), safeRequireText(metadataPath)].join('\0');
    const payload = { fact, handle, sourceRef };
    return {
      consumer: this.consumer,
      destinationRef: `${config.metadataPath}#${handle}`,
      beforeHash: before === '\0'
        ? null
        : `sha256:${createHash('sha256').update(before).digest('hex')}`,
      afterHash: `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`,
      content: JSON.stringify(payload),
    };
  }

  async write(plan) {
    const payload = JSON.parse(plan.content);
    if (!plan.destinationRef.endsWith(`#${payload.handle}`)) {
      throw new Error('line-memory promotion destination changed');
    }
    const expected = `sha256:${createHash('sha256').update(JSON.stringify(payload)).digest('hex')}`;
    if (expected !== plan.afterHash) throw new Error('line-memory promotion plan hash changed');
    const outcome = await runLineMemory('import', [
      payload.fact,
      '--handle', payload.handle,
      '--source-ref', payload.sourceRef,
      '--reviewer', 'session-review-gateway',
      '--reason', 'reviewed session candidate promotion',
      '--confirm',
    ], this.projectRoot);
    if (outcome.exitCode !== 0) throw new Error(outcome.message ?? 'line-memory promotion failed');
  }
}

function requireText(filePath) {
  return readFileSync(filePath, 'utf8');
}

function safeRequireText(filePath) {
  try {
    return requireText(filePath);
  } catch (error) {
    if (error?.code === 'ENOENT') return '';
    throw error;
  }
}

export default async function lineMemoryCommand(args, context) {
  return runLineMemory(context.subcommand, args, context.cwd);
}
