import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  CLAUDE_ADAPTER_VERSION,
  ClaudeSessionAdapter,
  CODEX_ADAPTER_VERSION,
  CodexSessionAdapter,
  GENERIC_ADAPTER_VERSION,
  GenericSessionInterchangeAdapter,
  IncrementalSessionImporter,
  SESSION_CONTRACT_VERSION,
  SESSION_PROVIDER_IDS,
  SessionContractError,
  SessionRepository,
  SessionSourceSchema,
  assertSessionProviderId,
  redactSourceLocator,
  type SessionProviderId,
  type SessionSourceAdapter,
  type SelectedSource,
} from '../../sessions/index.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

const JSON_CONTRACT_VERSION = '1.0.0';
const EXIT = {
  ok: 0, usage: 2, unsupported: 3, unavailable: 4, contract: 5, storage: 6,
} as const;

interface Envelope {
  contractVersion: typeof JSON_CONTRACT_VERSION;
  command: string;
  status: 'ok' | 'error' | 'preview';
  data: unknown;
  error: { code: string; message: string } | null;
}

const HELP = `Usage: aiwg sessions <command> [options]

Commands:
  sources                         Show all canonical provider dispositions
  import <file> --source-id <id>  Import a supported provider JSONL source
  list [--limit N] [--cursor N]   List normalized sessions
  show <session-id>               Show a session with events and tags
  search <query> --workspace <id> Search authorized normalized content
  tag <session-id> <tag>          Add a catalog tag
  relocate <source-id> <file>     Update AIWG source-location metadata
  reindex                         Rebuild catalog indexes
  delete <session-id>             Preview deletion; use --confirm to tombstone
  doctor                          Check catalog availability and integrity

Options:
  --json          Emit the versioned JSON contract
  --dry-run       Preview a mutation without changing state
  --db <path>     Override .aiwg/sessions/catalog.sqlite
  --provider <id> Filter list or select an import adapter
  --workspace <id>, --tag <tag>, --limit <n>, --cursor <n>`;

export const sessionsHandler: CommandHandler = {
  id: 'sessions',
  name: 'Sessions',
  description: 'Manage the normalized session catalog (the singular `session` command remains the launcher)',
  category: 'project',
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    const json = ctx.args.includes('--json');
    let parsed: ParsedArgs;
    try {
      parsed = parseArgs(ctx.args);
    } catch (error) {
      const normalized = normalizeError(error);
      const output = envelope('sessions', 'error', null, normalized.error);
      if (json) emit(output);
      else console.error(`${normalized.error.code}: ${normalized.error.message}`);
      return { exitCode: normalized.exitCode, message: normalized.error.message };
    }
    if (!parsed.command || parsed.flags.has('--help') || parsed.flags.has('-h')) {
      if (json) emit(envelope('sessions.help', 'ok', { usage: HELP }, null));
      else console.log(HELP);
      return { exitCode: parsed.command ? EXIT.ok : EXIT.usage };
    }
    try {
      const result = await executeCommand(ctx, parsed);
      if (json) emit(result.envelope);
      else printHuman(result.envelope);
      return { exitCode: result.exitCode };
    } catch (error) {
      const normalized = normalizeError(error);
      const output = envelope(`sessions.${parsed.command}`, 'error', null, normalized.error);
      if (json) emit(output);
      else console.error(`${normalized.error.code}: ${normalized.error.message}`);
      return { exitCode: normalized.exitCode, message: normalized.error.message };
    }
  },
};

interface ParsedArgs {
  command?: string;
  positionals: string[];
  flags: Set<string>;
  values: Map<string, string>;
}

async function executeCommand(
  ctx: HandlerContext,
  args: ParsedArgs,
): Promise<{ envelope: Envelope; exitCode: number }> {
  const command = args.command!;
  if (command === 'sources') {
    const reports = [...SESSION_PROVIDER_IDS].sort().map(providerDisposition);
    return ok(command, { providers: reports, count: reports.length });
  }
  if (command === 'import') return importSource(ctx, args);

  const repository = openRepository(ctx, args);
  try {
    switch (command) {
      case 'list': {
        const limit = boundedInteger(args.values.get('--limit'), 50, 1, 500, '--limit');
        const offset = boundedInteger(args.values.get('--cursor'), 0, 0, Number.MAX_SAFE_INTEGER, '--cursor');
        const provider = args.values.get('--provider');
        if (provider) assertSessionProviderId(provider);
        const result = repository.listSessions({
          provider,
          workspaceId: args.values.get('--workspace'),
          tag: args.values.get('--tag'),
          limit,
          offset,
        });
        const nextCursor = offset + result.items.length < result.total
          ? String(offset + result.items.length) : null;
        return ok(command, {
          items: result.items,
          page: { limit, cursor: String(offset), nextCursor, total: result.total },
        });
      }
      case 'show': {
        const id = requiredPositional(args, 0, 'session-id');
        const session = repository.getSession(id);
        if (!session) throw new CliError('SESSION_NOT_FOUND', `session not found: ${id}`, EXIT.unavailable);
        return ok(command, {
          session,
          tags: repository.listTags(id),
          events: repository.listEvents(id),
        });
      }
      case 'search': {
        const query = requiredPositional(args, 0, 'query');
        const workspaceId = requiredValue(args, '--workspace');
        const provider = args.values.get('--provider');
        if (provider) assertSessionProviderId(provider);
        const result = repository.search({
          query,
          workspaceId,
          providers: provider ? [provider] : undefined,
          dateFrom: args.values.get('--date-from'),
          dateTo: args.values.get('--date-to'),
          participant: args.values.get('--participant'),
          model: args.values.get('--model'),
          role: args.values.get('--role'),
          tool: args.values.get('--tool'),
          tag: args.values.get('--tag'),
          entity: args.values.get('--entity'),
          sensitivity: args.values.get('--sensitivity'),
          extractionState: args.values.get('--extraction-state'),
          limit: boundedInteger(args.values.get('--limit'), 50, 1, 500, '--limit'),
          cursor: args.values.get('--cursor'),
        });
        return ok(command, {
          items: result.items,
          page: { limit: boundedInteger(args.values.get('--limit'), 50, 1, 500, '--limit'),
            nextCursor: result.nextCursor },
        });
      }
      case 'tag': {
        const id = requiredPositional(args, 0, 'session-id');
        const tag = requiredPositional(args, 1, 'tag');
        if (!/^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/.test(tag)) {
          throw new CliError('INVALID_TAG', 'tag must be 1-64 safe identifier characters', EXIT.usage);
        }
        if (isDryRun(ctx, args)) return preview(command, { sessionId: id, tag, wouldAdd: true });
        if (!repository.tagSession(id, tag)) {
          if (!repository.getSession(id)) throw new CliError('SESSION_NOT_FOUND', `session not found: ${id}`, EXIT.unavailable);
        }
        return ok(command, { sessionId: id, tag, tags: repository.listTags(id) });
      }
      case 'relocate': {
        const sourceId = requiredPositional(args, 0, 'source-id');
        const locator = requiredPositional(args, 1, 'file');
        if (!repository.getSource(sourceId)) {
          throw new CliError('SOURCE_NOT_FOUND', `source not found: ${sourceId}`, EXIT.unavailable);
        }
        const redactedLocator = redactSourceLocator(locator);
        if (isDryRun(ctx, args)) return preview(command, { sourceId, redactedLocator });
        repository.relocateSource(sourceId, redactedLocator);
        return ok(command, { sourceId, redactedLocator });
      }
      case 'reindex': {
        if (isDryRun(ctx, args)) return preview(command, { operation: 'reindex' });
        repository.reindex();
        return ok(command, { operation: 'reindex' });
      }
      case 'delete': {
        const id = requiredPositional(args, 0, 'session-id');
        const counts = repository.deletionPreview(id);
        if (counts.sessions === 0) {
          throw new CliError('SESSION_NOT_FOUND', `session not found: ${id}`, EXIT.unavailable);
        }
        if (!args.flags.has('--confirm') || isDryRun(ctx, args)) {
          return preview(command, {
            sessionId: id, counts, providerLogsModified: false,
            confirmationRequired: true,
          });
        }
        repository.tombstoneSession(id);
        return ok(command, {
          sessionId: id, counts, providerLogsModified: false, outcome: 'tombstoned',
        });
      }
      case 'doctor':
        return ok(command, {
          database: redactSourceLocator(databasePath(ctx, args)),
          health: repository.doctor(),
          jsonContractVersion: JSON_CONTRACT_VERSION,
        });
      default:
        throw new CliError('UNKNOWN_COMMAND', `unknown sessions command: ${command}`, EXIT.usage);
    }
  } finally {
    repository.close();
  }
}

async function importSource(
  ctx: HandlerContext,
  args: ParsedArgs,
): Promise<{ envelope: Envelope; exitCode: number }> {
  const input = resolve(ctx.cwd, requiredPositional(args, 0, 'file'));
  const provider = (args.values.get('--provider') ?? 'generic') as SessionProviderId;
  assertSessionProviderId(provider);
  if (provider !== 'generic' && provider !== 'claude' && provider !== 'codex') {
    throw new CliError('UNSUPPORTED_OPERATION', `session import is not implemented for ${provider}`, EXIT.unsupported);
  }
  const sourceId = requiredValue(args, '--source-id');
  const workspaceId = args.values.get('--workspace') ?? 'default';
  const isClaude = provider === 'claude';
  const isCodex = provider === 'codex';
  const adapter: SessionSourceAdapter = isClaude
    ? new ClaudeSessionAdapter()
    : isCodex ? new CodexSessionAdapter() : new GenericSessionInterchangeAdapter();
  const locatorClass = isClaude
    ? (input.endsWith('.hooks.jsonl') ? 'claude-hook-jsonl' : 'claude-transcript-jsonl')
    : isCodex
      ? (input.endsWith('.app-server.jsonl') ? 'codex-app-server-jsonl' : 'codex-rollout-jsonl')
      : 'manual-export';
  const selectedSource: SelectedSource = {
    provider, locator: input, locatorClass, sourceId,
    authorizedScope: { workspaceId, allowedRoots: [dirname(input)] },
  };
  const probe = await adapter.inspect(selectedSource);
  const source = SessionSourceSchema.parse({
    contractVersion: SESSION_CONTRACT_VERSION, sourceId, provider,
    providerProfile: isClaude
      ? 'documented-local-jsonl'
      : isCodex ? 'app-server-v2-rollout-fallback' : 'manual-interchange',
    locatorClass, redactedLocator: redactSourceLocator(input),
    adapterVersion: isClaude
      ? CLAUDE_ADAPTER_VERSION
      : isCodex ? CODEX_ADAPTER_VERSION : GENERIC_ADAPTER_VERSION,
    sourceSchemaVersion: probe.sourceSchemaVersion,
    disposition: isClaude || isCodex ? 'implemented' : 'manual-only',
    operationalState: probe.operationalState,
    consistency: probe.consistency, authorizedAt: new Date().toISOString(),
    extensions: isClaude
      ? { 'native.claude': {} }
      : isCodex ? { 'native.codex': {} } : { 'native.generic': {} },
  });
  if (isDryRun(ctx, args)) {
    return preview('import', { source, wouldInspect: true, wouldPersist: false });
  }
  const repository = openRepository(ctx, args);
  try {
    const receipts = await new IncrementalSessionImporter(repository).import({
      source, selectedSource, adapter, workspaceId, policyVersion: '1.0.0',
    });
    return ok('import', {
      sourceId,
      receipts,
      totals: {
        sessionsInserted: receipts.reduce((sum, item) => sum + item.sessionsInserted, 0),
        eventsInserted: receipts.reduce((sum, item) => sum + item.eventsInserted, 0),
      },
    });
  } finally {
    repository.close();
  }
}

function providerDisposition(provider: SessionProviderId): Record<string, unknown> {
  if (provider === 'codex') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['discover', 'inspect', 'stream'],
      acquisitionModes: ['api', 'jsonl'],
      reasonCode: null,
      remediation: 'Authorize an App Server export or Codex sessions root, then import an explicit JSONL source.',
      evidence: {
        adapterVersion: CODEX_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://github.com/openai/codex/blob/main/codex-rs/app-server/README.md',
      },
    };
  }
  if (provider === 'claude') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['discover', 'inspect', 'stream'],
      acquisitionModes: ['jsonl', 'hook'],
      reasonCode: null,
      remediation: 'Authorize a Claude projects or hook root, then import an explicit JSONL file.',
      evidence: {
        adapterVersion: CLAUDE_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://code.claude.com/docs/en/sessions',
      },
    };
  }
  if (provider === 'generic') {
    return {
      provider, disposition: 'manual-only', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'], acquisitionModes: ['manual-export'],
      reasonCode: 'MANUAL_SOURCE_SELECTION_REQUIRED',
      remediation: 'Pass a declared interchange file to `aiwg sessions import`.',
      evidence: { adapterVersion: GENERIC_ADAPTER_VERSION, verifiedAt: '2026-07-26' },
    };
  }
  return {
    provider, disposition: 'unsupported', operationalState: 'unavailable',
    supportedOperations: [], acquisitionModes: [],
    reasonCode: 'ADAPTER_NOT_IMPLEMENTED',
    remediation: 'Use the generic interchange until the provider adapter milestone is delivered.',
    evidence: { adapterVersion: null, verifiedAt: '2026-07-26' },
  };
}

function openRepository(ctx: HandlerContext, args: ParsedArgs): SessionRepository {
  const path = databasePath(ctx, args);
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  try {
    return new SessionRepository(path);
  } catch (error) {
    throw new CliError(
      'CATALOG_UNAVAILABLE',
      error instanceof Error ? error.message : String(error),
      EXIT.storage,
    );
  }
}

function databasePath(ctx: HandlerContext, args: ParsedArgs): string {
  return resolve(ctx.cwd, args.values.get('--db') ?? '.aiwg/sessions/catalog.sqlite');
}

function parseArgs(argv: string[]): ParsedArgs {
  const flags = new Set<string>();
  const values = new Map<string, string>();
  const positionals: string[] = [];
  const valueFlags = new Set([
    '--db', '--provider', '--workspace', '--tag', '--limit', '--cursor', '--source-id',
    '--date-from', '--date-to', '--participant', '--model', '--role', '--tool',
    '--entity', '--sensitivity', '--extraction-state',
  ]);
  let command: string | undefined;
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (valueFlags.has(arg)) {
      const value = argv[index + 1];
      if (!value || value.startsWith('--')) {
        throw new CliError('MISSING_OPTION_VALUE', `missing value for ${arg}`, EXIT.usage);
      }
      values.set(arg, value);
      index += 1;
    } else if (arg.startsWith('-')) {
      flags.add(arg);
    } else if (!command) {
      command = arg;
    } else {
      positionals.push(arg);
    }
  }
  return { command, positionals, flags, values };
}

function requiredPositional(args: ParsedArgs, index: number, name: string): string {
  const value = args.positionals[index];
  if (!value) throw new CliError('MISSING_ARGUMENT', `missing required ${name}`, EXIT.usage);
  return value;
}

function requiredValue(args: ParsedArgs, flag: string): string {
  const value = args.values.get(flag);
  if (!value) throw new CliError('MISSING_ARGUMENT', `missing required ${flag}`, EXIT.usage);
  return value;
}

function boundedInteger(
  value: string | undefined, fallback: number, min: number, max: number, name: string,
): number {
  if (value === undefined) return fallback;
  if (!/^\d+$/.test(value)) throw new CliError('INVALID_ARGUMENT', `${name} must be an integer`, EXIT.usage);
  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new CliError('INVALID_ARGUMENT', `${name} must be between ${min} and ${max}`, EXIT.usage);
  }
  return parsed;
}

function isDryRun(ctx: HandlerContext, args: ParsedArgs): boolean {
  return Boolean(ctx.dryRun || args.flags.has('--dry-run'));
}

function ok(command: string, data: unknown): { envelope: Envelope; exitCode: number } {
  return { envelope: envelope(`sessions.${command}`, 'ok', data, null), exitCode: EXIT.ok };
}

function preview(command: string, data: unknown): { envelope: Envelope; exitCode: number } {
  return { envelope: envelope(`sessions.${command}`, 'preview', data, null), exitCode: EXIT.ok };
}

function envelope(
  command: string, status: Envelope['status'], data: unknown, error: Envelope['error'],
): Envelope {
  return { contractVersion: JSON_CONTRACT_VERSION, command, status, data, error };
}

function emit(value: Envelope): void {
  console.log(JSON.stringify(value, null, 2));
}

function printHuman(value: Envelope): void {
  if (value.status === 'preview') console.log('Preview (no changes applied)');
  console.log(JSON.stringify(value.data, null, 2));
}

class CliError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly exitCode: number,
  ) {
    super(message);
  }
}

function normalizeError(error: unknown): {
  error: { code: string; message: string };
  exitCode: number;
} {
  if (error instanceof CliError) {
    return { error: { code: error.code, message: error.message }, exitCode: error.exitCode };
  }
  if (error instanceof SessionContractError) {
    const exitCode = error.code === 'UNSUPPORTED_OPERATION' ? EXIT.unsupported : EXIT.contract;
    return { error: { code: error.code, message: error.message }, exitCode };
  }
  return {
    error: { code: 'INTERNAL_ERROR', message: error instanceof Error ? error.message : String(error) },
    exitCode: EXIT.storage,
  };
}
