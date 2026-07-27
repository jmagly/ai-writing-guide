import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  CLAUDE_ADAPTER_VERSION,
  ClaudeSessionAdapter,
  CODEX_ADAPTER_VERSION,
  CodexSessionAdapter,
  COPILOT_ADAPTER_VERSION,
  CopilotSessionAdapter,
  CURSOR_ADAPTER_VERSION,
  CursorSessionAdapter,
  FACTORY_ADAPTER_VERSION,
  FactorySessionAdapter,
  HERMES_ADAPTER_VERSION,
  HermesSessionAdapter,
  OPENCODE_ADAPTER_VERSION,
  OpenCodeSessionAdapter,
  OPENCLAW_ADAPTER_VERSION,
  OpenClawSessionAdapter,
  OPENHUMAN_ADAPTER_VERSION,
  OpenHumanSessionAdapter,
  WARP_ADAPTER_VERSION,
  WarpSessionAdapter,
  CandidateExtractionService,
  GENERIC_ADAPTER_VERSION,
  GenericSessionInterchangeAdapter,
  IncrementalSessionImporter,
  FilesystemMemoryDestination,
  MemoryPromotionGateway,
  SESSION_CONTRACT_VERSION,
  SESSION_PROVIDER_IDS,
  SessionContractError,
  SessionRepository,
  SessionSourceSchema,
  StructuralCandidateExtractor,
  resolveMemoryConsumerManifest,
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
  extract [session-id] --workspace <id> Extract structural candidates
  candidates [--state <state>]    List the candidate review queue
  review <id> <version> <state>   Record an explicit review transition
  promote <id> <version>          Preview promotion; use --confirm to write
  tag <session-id> <tag>          Add a catalog tag
  relocate <source-id> <file>     Update AIWG source-location metadata
  reindex                         Rebuild catalog indexes
  delete <session-id>             Preview deletion; use --confirm to tombstone
  restore <session-id>            Restore a reversible catalog tombstone
  purge <session-id>              Preview terminal AIWG-copy purge
  doctor                          Check catalog availability and integrity

Options:
  --json          Emit the versioned JSON contract
  --dry-run       Preview a mutation without changing state
  --db <path>     Override .aiwg/sessions/catalog.sqlite
  --provider <id> Filter list or select an import adapter
  --consumer <id> Select a named memory consumer for promotion
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
      case 'extract': {
        const workspaceId = requiredValue(args, '--workspace');
        const sessionId = args.positionals[0];
        const documents = repository.authorizedSearchDocuments({
          workspaceId,
          limit: 500,
        }).filter((document) => !sessionId || document.sessionId === sessionId);
        if (sessionId && documents.length === 0) {
          throw new CliError(
            'SESSION_NOT_FOUND',
            `no authorized evidence found for session: ${sessionId}`,
            EXIT.unavailable,
          );
        }
        const dryRun = isDryRun(ctx, args);
        const service = new CandidateExtractionService(dryRun
          ? { saveCandidates: (candidates) => [...candidates] }
          : repository);
        const items = await service.extract({
          documents,
          extractor: new StructuralCandidateExtractor(),
          policy: {
            version: args.values.get('--policy-version') ?? '1.0.0',
            projectScope: workspaceId,
            temporalScope: 'source-event',
            minimumConfidence: boundedNumber(
              args.values.get('--min-confidence'),
              0.5,
              0,
              1,
              '--min-confidence',
            ),
          },
        });
        return dryRun
          ? preview(command, { items, count: items.length, durableMemoryWrites: 0 })
          : ok(command, { items, count: items.length, durableMemoryWrites: 0 });
      }
      case 'candidates': {
        const state = candidateState(args.values.get('--state'));
        return ok(command, {
          items: repository.listCandidates(state),
        });
      }
      case 'review': {
        const candidateId = requiredPositional(args, 0, 'candidate-id');
        const version = boundedInteger(
          requiredPositional(args, 1, 'version'),
          1,
          1,
          Number.MAX_SAFE_INTEGER,
          'version',
        );
        const toState = candidateState(requiredPositional(args, 2, 'state'));
        if (!toState) throw new CliError('INVALID_ARGUMENT', 'review state is required', EXIT.usage);
        if (isDryRun(ctx, args)) {
          return preview(command, {
            candidateId, version, toState,
            reviewer: requiredValue(args, '--reviewer'),
            reason: requiredValue(args, '--reason'),
          });
        }
        return ok(command, repository.reviewCandidate({
          candidateId,
          version,
          toState,
          reviewer: requiredValue(args, '--reviewer'),
          reason: requiredValue(args, '--reason'),
        }));
      }
      case 'promote': {
        const candidateId = requiredPositional(args, 0, 'candidate-id');
        const version = boundedInteger(
          requiredPositional(args, 1, 'version'),
          1,
          1,
          Number.MAX_SAFE_INTEGER,
          'version',
        );
        const consumer = requiredValue(args, '--consumer');
        const destination = new FilesystemMemoryDestination({
          projectRoot: ctx.cwd,
          consumer,
          manifestPath: resolveMemoryConsumerManifest(ctx.cwd, consumer),
        });
        const gateway = new MemoryPromotionGateway(repository);
        const promotionPreview = gateway.preview({ candidateId, version, destination });
        if (!args.flags.has('--confirm') || isDryRun(ctx, args)) {
          return preview(command, promotionPreview);
        }
        const receipt = await gateway.promote({
          candidateId,
          version,
          destination,
          reviewer: requiredValue(args, '--reviewer'),
          operationId: promotionPreview.operationId,
        });
        return ok(command, { preview: promotionPreview, receipt });
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
      case 'restore': {
        const id = requiredPositional(args, 0, 'session-id');
        if (isDryRun(ctx, args)) return preview(command, { sessionId: id, wouldRestore: true });
        if (!repository.restoreSession(id)) {
          throw new CliError('SESSION_NOT_FOUND', `tombstoned session not found: ${id}`, EXIT.unavailable);
        }
        return ok(command, { sessionId: id, outcome: 'restored', providerLogsModified: false });
      }
      case 'purge': {
        const id = requiredPositional(args, 0, 'session-id');
        const completed = repository.getCompletedPurge(id);
        if (completed) {
          return ok(command, {
            receipt: completed,
            dependentDecisions: repository.listPromotionDependencyDecisions(completed.operationId),
            duplicate: true,
            providerLogsModified: false,
          });
        }
        const purgePreview = repository.previewPurge(id);
        if (!args.flags.has('--confirm') || isDryRun(ctx, args)) {
          return preview(command, { ...purgePreview, providerLogsModified: false });
        }
        const action = purgePreview.promotedDependents.length > 0
          ? dependentAction(requiredValue(args, '--dependent-action'))
          : 'origin_unavailable';
        const basis = purgePreview.promotedDependents.length > 0
          ? requiredValue(args, '--basis')
          : (args.values.get('--basis') ?? 'no-promoted-dependents');
        const receipt = repository.purgeSession({
          preview: purgePreview,
          actorClass: requiredValue(args, '--actor-class'),
          reasonCode: requiredValue(args, '--reason-code'),
          decisions: purgePreview.promotedDependents.map((item) => ({
            dependentId: item.dependentId,
            action,
            basis,
          })),
        });
        return ok(command, {
          receipt,
          dependentDecisions: repository.listPromotionDependencyDecisions(receipt.operationId),
          providerLogsModified: false,
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
  if (provider !== 'generic' && provider !== 'claude' && provider !== 'codex'
    && provider !== 'copilot' && provider !== 'cursor' && provider !== 'factory'
    && provider !== 'hermes' && provider !== 'opencode' && provider !== 'openclaw'
    && provider !== 'openhuman' && provider !== 'warp') {
    throw new CliError('UNSUPPORTED_OPERATION', `session import is not implemented for ${provider}`, EXIT.unsupported);
  }
  const sourceId = requiredValue(args, '--source-id');
  const workspaceId = args.values.get('--workspace') ?? 'default';
  const isClaude = provider === 'claude';
  const isCodex = provider === 'codex';
  const isCopilot = provider === 'copilot';
  const isCursor = provider === 'cursor';
  const isFactory = provider === 'factory';
  const isHermes = provider === 'hermes';
  const isOpenCode = provider === 'opencode';
  const isOpenClaw = provider === 'openclaw';
  const isOpenHuman = provider === 'openhuman';
  const isWarp = provider === 'warp';
  const adapter: SessionSourceAdapter = isClaude
    ? new ClaudeSessionAdapter()
    : isCodex
      ? new CodexSessionAdapter()
      : isCopilot
        ? new CopilotSessionAdapter()
        : isCursor
          ? new CursorSessionAdapter()
          : isFactory
            ? new FactorySessionAdapter()
            : isHermes
              ? new HermesSessionAdapter()
              : isOpenCode
                ? new OpenCodeSessionAdapter()
                : isOpenClaw
                  ? new OpenClawSessionAdapter()
                  : isOpenHuman
                    ? new OpenHumanSessionAdapter()
                    : isWarp ? new WarpSessionAdapter() : new GenericSessionInterchangeAdapter();
  const locatorClass = isClaude
    ? (input.endsWith('.hooks.jsonl') ? 'claude-hook-jsonl' : 'claude-transcript-jsonl')
    : isCodex
      ? (input.endsWith('.app-server.jsonl') ? 'codex-app-server-jsonl' : 'codex-rollout-jsonl')
      : isCopilot
        ? 'copilot-chat-json-export'
        : isCursor
          ? cursorLocatorClass(input)
          : isFactory
            ? 'factory-droid-jsonl'
            : isHermes
              ? 'hermes-export-jsonl'
              : isOpenCode
                ? 'opencode-export-json'
                : isOpenClaw
                  ? 'openclaw-consistent-snapshot-jsonl'
                  : isOpenHuman
                    ? 'openhuman-enriched-jsonl'
                    : isWarp ? 'warp-markdown-export' : 'manual-export';
  const selectedSource: SelectedSource = {
    provider, locator: input, locatorClass, sourceId,
    authorizedScope: { workspaceId, allowedRoots: [dirname(input)] },
  };
  const probe = await adapter.inspect(selectedSource);
  const source = SessionSourceSchema.parse({
    contractVersion: SESSION_CONTRACT_VERSION, sourceId, provider,
    providerProfile: isClaude
      ? 'documented-local-jsonl'
      : isCodex
        ? 'app-server-v2-rollout-fallback'
        : isCopilot
          ? 'vscode-chat-json-export'
          : isCursor
            ? cursorProviderProfile(locatorClass)
            : isFactory
              ? 'documented-project-jsonl'
              : isHermes
                ? 'native-schema-23-export'
                : isOpenCode
                  ? 'sanitized-json-export'
                  : isOpenClaw
                    ? 'schema-16-event-v3-consistent-snapshot'
                    : isOpenHuman
                      ? 'schema-1-session-raw-enriched'
                      : isWarp ? 'manual-lossy-markdown-export' : 'manual-interchange',
    locatorClass, redactedLocator: redactSourceLocator(input),
    adapterVersion: isClaude
      ? CLAUDE_ADAPTER_VERSION
      : isCodex
        ? CODEX_ADAPTER_VERSION
        : isCopilot
          ? COPILOT_ADAPTER_VERSION
          : isCursor
            ? CURSOR_ADAPTER_VERSION
            : isFactory
              ? FACTORY_ADAPTER_VERSION
              : isHermes
                ? HERMES_ADAPTER_VERSION
                : isOpenCode
                  ? OPENCODE_ADAPTER_VERSION
                  : isOpenClaw
                    ? OPENCLAW_ADAPTER_VERSION
                    : isOpenHuman
                      ? OPENHUMAN_ADAPTER_VERSION
                      : isWarp ? WARP_ADAPTER_VERSION : GENERIC_ADAPTER_VERSION,
    sourceSchemaVersion: probe.sourceSchemaVersion,
    disposition: isWarp
      ? 'manual-only'
      : isClaude || isCodex || isCopilot || isCursor || isFactory || isHermes
        || isOpenCode || isOpenClaw || isOpenHuman
        ? 'implemented' : 'manual-only',
    operationalState: probe.operationalState,
    consistency: probe.consistency, authorizedAt: new Date().toISOString(),
    extensions: isClaude
      ? { 'native.claude': {} }
      : isCodex
        ? { 'native.codex': {} }
        : isCopilot
          ? { 'native.copilot': {} }
          : isCursor
            ? { 'native.cursor': {} }
            : isFactory
              ? { 'native.factory': {} }
              : isHermes
                ? { 'native.hermes': {} }
                : isOpenCode
                  ? { 'native.opencode': {} }
                  : isOpenClaw
                    ? { 'native.openclaw': {} }
                    : isOpenHuman
                      ? { 'native.openhuman': {} }
                      : isWarp ? { 'native.warp': {} } : { 'native.generic': {} },
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
  if (provider === 'copilot') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['manual-export'],
      reasonCode: null,
      remediation: 'Use Chat: Export Chat in VS Code, then import the explicitly selected JSON file.',
      evidence: {
        adapterVersion: COPILOT_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://code.visualstudio.com/docs/chat/chat-sessions#_export-a-chat-session-as-a-json-file',
      },
    };
  }
  if (provider === 'cursor') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['api', 'jsonl', 'manual-export'],
      reasonCode: null,
      remediation: 'Import Cursor CLI stream-json, captured Cloud Agent v1 events, or an editor Markdown export.',
      evidence: {
        adapterVersion: CURSOR_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://docs.cursor.com/en/cli/reference/output-format',
      },
    };
  }
  if (provider === 'factory') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['discover', 'inspect', 'stream'],
      acquisitionModes: ['jsonl', 'api'],
      reasonCode: null,
      remediation: 'Authorize a Factory projects root and import a Droid JSONL transcript; API and Exec require explicit negotiated transports.',
      evidence: {
        adapterVersion: FACTORY_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://docs.factory.ai/reference/hooks-reference',
      },
    };
  }
  if (provider === 'hermes') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['jsonl', 'api', 'sqlite-snapshot'],
      reasonCode: null,
      remediation: 'Use `hermes sessions export` or an explicitly verified sqlite3.backup() snapshot export.',
      evidence: {
        adapterVersion: HERMES_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://hermes-agent.nousresearch.com/docs/user-guide/sessions/',
      },
    };
  }
  if (provider === 'opencode') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['manual-export', 'api', 'jsonl'],
      reasonCode: null,
      remediation: 'Use `opencode export <sessionID>` or an explicitly authorized negotiated local API/SSE transport.',
      evidence: {
        adapterVersion: OPENCODE_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://opencode.ai/docs/cli/',
      },
    };
  }
  if (provider === 'openclaw') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['api', 'sqlite-snapshot', 'jsonl'],
      reasonCode: null,
      remediation: 'Use an authorized read-only Gateway transport or a schema-16/event-v3 sqlite3.backup() projection.',
      evidence: {
        adapterVersion: OPENCLAW_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://docs.openclaw.ai/reference/session-management-compaction',
      },
    };
  }
  if (provider === 'openhuman') {
    return {
      provider, disposition: 'implemented', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['jsonl'],
      reasonCode: null,
      remediation: 'Import an explicitly selected schema-1 session_raw JSONL file, optionally bundled with thread/turn enrichment.',
      evidence: {
        adapterVersion: OPENHUMAN_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://github.com/tinyhumansai/openhuman/releases',
      },
    };
  }
  if (provider === 'warp') {
    return {
      provider, disposition: 'manual-only', operationalState: 'available',
      supportedOperations: ['inspect', 'stream'],
      acquisitionModes: ['manual-export'],
      reasonCode: 'LOSSY_MARKDOWN_ONLY',
      remediation: 'Run `/export-to-file` in Warp and import the explicitly selected Markdown file.',
      evidence: {
        adapterVersion: WARP_ADAPTER_VERSION,
        verifiedAt: '2026-07-27',
        documentation: 'https://docs.warp.dev/agent-platform/capabilities/slash-commands',
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

function cursorLocatorClass(input: string): string {
  if (input.endsWith('.md') || input.endsWith('.markdown')) return 'cursor-editor-markdown';
  if (input.endsWith('.cloud.jsonl')) return 'cursor-cloud-events-jsonl';
  return 'cursor-cli-stream-json';
}

function cursorProviderProfile(locatorClass: string): string {
  if (locatorClass === 'cursor-editor-markdown') return 'editor-markdown-lossy';
  if (locatorClass === 'cursor-cloud-events-jsonl') return 'cloud-agents-api-v1';
  return 'cli-stream-json';
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
    '--state', '--reviewer', '--reason', '--policy-version', '--min-confidence',
    '--consumer', '--actor-class', '--reason-code', '--dependent-action', '--basis',
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

function boundedNumber(
  value: string | undefined,
  fallback: number,
  min: number,
  max: number,
  name: string,
): number {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new CliError('INVALID_ARGUMENT', `${name} must be between ${min} and ${max}`, EXIT.usage);
  }
  return parsed;
}

type CandidateState = 'pending' | 'accepted' | 'rejected' | 'deferred' | 'promoted' | 'superseded';

function candidateState(value: string | undefined): CandidateState | undefined {
  if (value === undefined) return undefined;
  const states = new Set<CandidateState>([
    'pending', 'accepted', 'rejected', 'deferred', 'promoted', 'superseded',
  ]);
  if (!states.has(value as CandidateState)) {
    throw new CliError('INVALID_ARGUMENT', `invalid candidate state: ${value}`, EXIT.usage);
  }
  return value as CandidateState;
}

function dependentAction(
  value: string,
): 'revoke' | 'supersede' | 'retain' | 'origin_unavailable' {
  const actions = new Set(['revoke', 'supersede', 'retain', 'origin_unavailable']);
  if (!actions.has(value)) {
    throw new CliError('INVALID_ARGUMENT', `invalid dependent action: ${value}`, EXIT.usage);
  }
  return value as 'revoke' | 'supersede' | 'retain' | 'origin_unavailable';
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
