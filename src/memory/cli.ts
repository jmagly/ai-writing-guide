/**
 * Memory CLI — `aiwg memory <subcommand>`
 *
 * Thin storage wrapper for the `memory` subsystem. Routes all
 * persistence through `resolveStorage('memory')` so the four memory
 * skills (memory-ingest, memory-lint, memory-log-append,
 * memory-query-capture) honor `.aiwg/storage.config` redirection
 * without each one re-implementing path resolution.
 *
 * Subcommands:
 *   path [<subpath>] [--json]
 *   list [--prefix <p>] [--json]
 *   get <path>
 *   put <path>                    Reads stdin
 *   delete <path>
 *   append-log <log-path>         Reads stdin (one JSON object); appends
 *                                 a single JSONL line. Uses
 *                                 adapter.append (#976) for atomicity
 *                                 when the backend supports it.
 *
 * @design @.aiwg/architecture/storage-design.md (§4)
 * @issue #934
 * @issue #966
 */

import { getLoadedConfig, resolveStorage } from '../storage/index.js';
import { resolveSubsystemRoot } from '../storage/config.js';

export async function main(args: string[]): Promise<void> {
  const subcommand = args[0];
  const subArgs = args.slice(1);

  switch (subcommand) {
    case 'path':
      await handlePath(subArgs);
      break;
    case 'list':
      await handleList(subArgs);
      break;
    case 'get':
      await handleGet(subArgs);
      break;
    case 'put':
      await handlePut(subArgs);
      break;
    case 'delete':
      await handleDelete(subArgs);
      break;
    case 'append-log':
      await handleAppendLog(subArgs);
      break;
    default:
      printUsage();
      if (subcommand) {
        throw new Error(`Unknown memory subcommand: ${subcommand}`);
      }
  }
}

async function handlePath(args: string[]): Promise<void> {
  const subpath = args.find((a) => !a.startsWith('--'));
  const json = args.includes('--json');
  const projectRoot = process.cwd();
  const config = await getLoadedConfig(projectRoot);

  const backend = config?.backends?.['memory']?.type ?? 'fs';
  if (backend !== 'fs') {
    if (json) {
      console.log(
        JSON.stringify(
          {
            backend,
            note: `memory subsystem uses backend "${backend}" — physical filesystem path is not applicable. Use \`aiwg memory get/list\` instead.`,
          },
          null,
          2
        )
      );
    } else {
      console.log(`memory backend: ${backend}`);
      console.log(`  (filesystem path not applicable for this backend; use \`aiwg memory get/list\`)`);
    }
    return;
  }

  const root = resolveSubsystemRoot('memory', projectRoot, config);
  const fullPath = subpath ? `${root}/${subpath}` : root;
  if (json) {
    console.log(JSON.stringify({ backend, root, path: fullPath }, null, 2));
  } else {
    console.log(fullPath);
  }
}

async function handleList(args: string[]): Promise<void> {
  let prefix = '';
  let json = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prefix') prefix = args[++i] ?? '';
    else if (args[i] === '--json') json = true;
  }
  const adapter = await resolveStorage('memory');
  const entries = await adapter.list(prefix);
  if (json) {
    console.log(
      JSON.stringify(
        entries.map((e) => ({
          path: e.path,
          size: e.size,
          modifiedAt: e.modifiedAt?.toISOString(),
        })),
        null,
        2
      )
    );
    return;
  }
  if (entries.length === 0) {
    console.log(`No memory entries${prefix ? ` matching prefix "${prefix}"` : ''}.`);
    return;
  }
  for (const e of entries) console.log(e.path);
}

async function handleGet(args: string[]): Promise<void> {
  const path = args[0];
  if (!path) throw new Error('Usage: aiwg memory get <path>');
  const adapter = await resolveStorage('memory');
  const content = await adapter.read(path);
  if (content === null) throw new Error(`Memory entry not found: ${path}`);
  process.stdout.write(content);
}

async function handlePut(args: string[]): Promise<void> {
  const path = args[0];
  if (!path) {
    throw new Error(
      `Usage: aiwg memory put <path>\n` +
        `  Reads content from stdin. Creates parent directories. Overwrites existing.`
    );
  }
  const content = await readStdin();
  const adapter = await resolveStorage('memory');
  await adapter.write(path, content);
  console.log(`Wrote ${content.length} bytes to memory:${path}`);
}

async function handleDelete(args: string[]): Promise<void> {
  const path = args[0];
  if (!path) throw new Error('Usage: aiwg memory delete <path>');
  const adapter = await resolveStorage('memory');
  await adapter.delete(path);
  console.log(`Deleted memory:${path} (no-op if missing)`);
}

/**
 * Append a JSONL event to a memory log file. The stdin payload must be
 * a single JSON object (no surrounding array, no array of objects).
 *
 * Uses adapter.append (#976) when the backend supports atomic append,
 * giving correct semantics under concurrent agents writing to the same
 * log. Falls back to read-then-write when not.
 */
async function handleAppendLog(args: string[]): Promise<void> {
  const logPath = args[0];
  if (!logPath) {
    throw new Error(
      `Usage: aiwg memory append-log <log-path>\n` +
        `  Reads a single JSON object from stdin and appends it as one JSONL line.\n` +
        `  Example:\n` +
        `    echo '{"type":"observation","summary":"foo","ts":"2026-04-28T12:00:00Z"}' \\\n` +
        `      | aiwg memory append-log research-complete/log.jsonl`
    );
  }

  const stdinContent = (await readStdin()).trim();
  if (stdinContent.length === 0) {
    throw new Error('append-log: stdin must contain a single JSON object (got empty input)');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(stdinContent);
  } catch (err) {
    throw new Error(`append-log: stdin must be valid JSON: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('append-log: stdin must be a single JSON object (not an array, not a primitive)');
  }

  const line = JSON.stringify(parsed) + '\n';
  const adapter = await resolveStorage('memory');

  if (typeof adapter.append === 'function') {
    // Ensure trailing newline before our line if existing log lacks one
    const existing = (await adapter.read(logPath)) ?? '';
    if (existing.length > 0 && !existing.endsWith('\n')) {
      await adapter.append(logPath, '\n');
    }
    await adapter.append(logPath, line);
  } else {
    const existing = (await adapter.read(logPath)) ?? '';
    const trailing = existing.length === 0 || existing.endsWith('\n') ? '' : '\n';
    await adapter.write(logPath, existing + trailing + line);
  }

  console.log(`Appended JSONL event to memory:${logPath}`);
}

async function readStdin(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
}

function printUsage(): void {
  console.log(`Usage: aiwg memory <subcommand>

Subcommands:
  path [<subpath>] [--json]      Resolved physical path (fs backend)
  list [--prefix <p>] [--json]   List entries through the adapter
  get <path>                     Read entry to stdout
  put <path>                     Write stdin to entry
  delete <path>                  Delete entry (no-op if missing)
  append-log <log-path>          Append a JSONL event from stdin (atomic
                                 when the backend supports adapter.append)

Examples:
  aiwg memory path                                # /home/user/proj/.aiwg/memory
  aiwg memory list --prefix research-complete/
  aiwg memory get research-complete/index.md
  echo '# index' | aiwg memory put research-complete/index.md
  echo '{"type":"obs","summary":"foo"}' | aiwg memory append-log research-complete/log.jsonl

The memory subsystem persists at .aiwg/memory/ on the default fs
backend. Configure .aiwg/storage.config to redirect (#934). For
non-fs backends, \`aiwg memory path\` reports the backend type instead
of a filesystem path.`);
}
