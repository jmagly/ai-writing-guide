import fs from 'node:fs/promises';
import path from 'node:path';

export const DEFAULT_CONFIG = Object.freeze({
  path: '.aiwg/memory/line-memory.txt',
  maxLines: 200,
  dedupe: true,
  trimBlankLines: true,
});

const DEFAULT_LIST_LIMIT = 20;
const DEFAULT_SEARCH_LIMIT = 5;
const MAX_QUERY_LIMIT = 1000;
const CONFIG_PATH = '.aiwg/memory/line-memory.config.json';
const CONFIG_KEYS = new Set(Object.keys(DEFAULT_CONFIG));

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

async function writeMemoryLines(memoryPath, lines) {
  const content = lines.length > 0 ? `${lines.join('\n')}\n` : '';
  await writeAtomic(memoryPath, content);
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

function positionalArgs(args, valueOptions = new Set(['--limit'])) {
  const output = [];
  for (let index = 0; index < args.length; index++) {
    const arg = args[index];
    if (valueOptions.has(arg)) {
      index++;
      continue;
    }
    if (arg === '--no-touch' || arg === '--case-sensitive') continue;
    output.push(arg);
  }
  return output;
}

async function addMemory(args, cwd, config) {
  const memory = normalizeMemory(args.join(' '));
  if (!memory) return result(1, 'A nonblank memory is required.');

  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const next = config.dedupe
    ? lines.filter((line) => line !== memory)
    : [...lines];
  next.push(memory);
  const pruned = pruneLines(next, config.maxLines);
  await writeMemoryLines(memoryPath, pruned);
  return result(0, `Added memory. Retained ${memoryCount(pruned)}/${config.maxLines}.`);
}

async function listMemories(args, cwd, config) {
  const limit = parseLimit(args, DEFAULT_LIST_LIMIT);
  const shouldTouch = !args.includes('--no-touch');
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const indexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() !== '')
    .map(({ index }) => index)
    .slice(-limit);

  if (indexes.length === 0) return result(0, 'No memories found.');
  console.log(indexes.map((index) => lines[index]).reverse().join('\n'));
  if (shouldTouch) await writeMemoryLines(memoryPath, moveIndexesToNewest(lines, indexes));
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
  const indexes = lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => {
      const haystack = caseSensitive ? line : line.toLocaleLowerCase();
      return line.trim() !== '' && haystack.includes(needle);
    })
    .map(({ index }) => index)
    .slice(-limit);

  if (indexes.length === 0) return result(0, 'No matching memories found.');
  console.log(indexes.map((index) => lines[index]).reverse().join('\n'));
  if (shouldTouch) await writeMemoryLines(memoryPath, moveIndexesToNewest(lines, indexes));
  return result(0);
}

async function touchMemory(args, cwd, config) {
  const memory = normalizeMemory(args.join(' '));
  if (!memory) return result(1, 'A nonblank memory is required.');
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const index = lines.findIndex((line) => line === memory);
  if (index < 0) return result(1, 'Exact memory not found.');
  await writeMemoryLines(memoryPath, moveIndexesToNewest(lines, [index]));
  return result(0, 'Memory moved to newest position.');
}

async function pruneMemory(cwd, config) {
  const { lines, memoryPath } = await readMemoryLines(cwd, config);
  const before = memoryCount(lines);
  const pruned = pruneLines(lines, config.maxLines);
  await writeMemoryLines(memoryPath, pruned);
  return result(0, `Pruned ${before - memoryCount(pruned)} memories. Retained ${memoryCount(pruned)}.`);
}

async function configCommand(args, cwd, loaded) {
  const action = args[0];
  if (action === 'get') {
    const key = args[1];
    if (!key) {
      console.log(JSON.stringify(loaded.config, null, 2));
      return result(0);
    }
    if (!CONFIG_KEYS.has(key)) return result(1, `Unknown config key: ${key}`);
    console.log(String(loaded.config[key]));
    return result(0);
  }

  if (action !== 'set' || !args[1] || args[2] === undefined) {
    return result(1, 'Usage: aiwg line-memory config get [key] | set <key> <value>');
  }

  const key = args[1];
  const rawValue = args.slice(2).join(' ');
  if (!CONFIG_KEYS.has(key)) return result(1, `Unknown config key: ${key}`);
  const next = { ...loaded.config };
  if (key === 'maxLines') next.maxLines = parsePositiveInteger(rawValue, 'maxLines');
  if (key === 'dedupe') next.dedupe = parseBoolean(rawValue, 'dedupe');
  if (key === 'trimBlankLines') next.trimBlankLines = parseBoolean(rawValue, 'trimBlankLines');
  if (key === 'path') {
    assertProjectRelativePath(cwd, rawValue);
    next.path = rawValue;
  }
  await writeConfig(loaded.configPath, next);

  if (key === 'maxLines') {
    const { lines, memoryPath } = await readMemoryLines(cwd, next);
    await writeMemoryLines(memoryPath, pruneLines(lines, next.maxLines));
  }
  return result(0, `Set ${key}=${String(next[key])}.`);
}

export async function runLineMemory(subcommand, args, cwd) {
  try {
    const loaded = await loadConfig(cwd);
    switch (subcommand) {
      case 'add':
        return await addMemory(args, cwd, loaded.config);
      case 'list':
        return await listMemories(args, cwd, loaded.config);
      case 'search':
        return await searchMemories(args, cwd, loaded.config);
      case 'touch':
        return await touchMemory(args, cwd, loaded.config);
      case 'prune':
        return await pruneMemory(cwd, loaded.config);
      case 'config':
        return await configCommand(args, cwd, loaded);
      default:
        return result(1, `Unknown line-memory subcommand: ${subcommand}`);
    }
  } catch (error) {
    return result(1, error instanceof Error ? error.message : String(error));
  }
}

export default async function lineMemoryCommand(args, context) {
  return runLineMemory(context.subcommand, args, context.cwd);
}
