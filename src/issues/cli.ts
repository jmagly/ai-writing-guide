/**
 * Local issue CLI — `aiwg issue <subcommand>`
 *
 * This command is intentionally local-only. External tracker issues are routed
 * through the configured `remotes.issue_tracker` topology and matching tracker
 * tools; local issue storage uses `.aiwg/issues/` plus this CLI.
 *
 * @issue #1462
 */

import { readFile, writeFile } from 'fs/promises';
import {
  LocalIssueProviderCore,
  buildExternalIssueSnapshotFromLocal,
  buildLocalIssueConflictReport,
  localIssueRoot,
  parseCommentIdMappings,
  parseExternalIssueSnapshot,
} from './index.js';

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | boolean>;
}

export async function main(args: string[], cwd = process.cwd()): Promise<void> {
  const parsed = parseArgs(args);
  const subcommand = parsed.positional[0];
  const rest = parsed.positional.slice(1);
  const provider = stringFlag(parsed, 'provider');
  if (provider && provider !== 'local') {
    throw new Error(`aiwg issue is for local issue storage only; configured external trackers use their tracker tools (${provider})`);
  }

  const issues = new LocalIssueProviderCore(localIssueRoot(cwd));

  switch (subcommand) {
    case 'init':
      await handleInit(issues, parsed);
      return;
    case 'new':
    case 'create':
      await handleNew(issues, parsed);
      return;
    case 'list':
    case 'ls':
      await handleList(issues, parsed);
      return;
    case 'show':
      await handleShow(issues, rest, parsed);
      return;
    case 'import':
      await handleImport(issues, parsed);
      return;
    case 'export':
      await handleExport(issues, rest, parsed);
      return;
    case 'sync':
      await handleSync(issues, rest, parsed);
      return;
    case 'comment':
      await handleComment(issues, rest, parsed);
      return;
    case 'close':
      await handleClose(issues, rest, parsed);
      return;
    case 'index':
      await handleIndex(issues, rest, parsed);
      return;
    default:
      printUsage();
      if (subcommand) throw new Error(`Unknown issue subcommand: ${subcommand}`);
  }
}

async function handleInit(issues: LocalIssueProviderCore, args: ParsedArgs): Promise<void> {
  const padding = stringFlag(args, 'padding');
  const config = await issues.init({
    prefix: stringFlag(args, 'prefix'),
    padding: padding ? Number.parseInt(padding, 10) : undefined,
  });
  printJsonOrText(args, config, `Initialized local issues with prefix ${config.issue_key.prefix}`);
}

async function handleNew(issues: LocalIssueProviderCore, args: ParsedArgs): Promise<void> {
  const title = stringFlag(args, 'title') ?? args.positional[1];
  if (!title) throw new Error('Usage: aiwg issue new --title <title> [--body <text>|--body-file <path>]');
  const body = await readBody(args);
  const issue = await issues.createIssue({
    title,
    body,
    type: stringFlag(args, 'type') as never,
    priority: stringFlag(args, 'priority') as never,
    labels: csvFlag(args, 'label'),
    assignees: csvFlag(args, 'assignee'),
    author: stringFlag(args, 'author'),
  });
  printJsonOrText(args, issue, `Created ${issue.fields.id}: ${issue.fields.title}`);
}

async function handleList(issues: LocalIssueProviderCore, args: ParsedArgs): Promise<void> {
  const limit = stringFlag(args, 'limit');
  const result = await issues.listIssues({
    limit: limit ? Number.parseInt(limit, 10) : undefined,
    cursor: stringFlag(args, 'cursor'),
    filter: {
      status: stringFlag(args, 'status') as never,
      labels: csvFlag(args, 'label'),
      type: stringFlag(args, 'type') as never,
      priority: stringFlag(args, 'priority') as never,
      assignee: stringFlag(args, 'assignee'),
      search: stringFlag(args, 'search'),
    },
  });
  if (args.flags.has('json')) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }
  for (const issue of result.issues) {
    console.log(`${issue.id}\t${issue.status}\t${issue.priority}\t${issue.title}`);
  }
  if (result.nextCursor) console.log(`next cursor: ${result.nextCursor}`);
}

async function handleShow(issues: LocalIssueProviderCore, rest: string[], args: ParsedArgs): Promise<void> {
  const id = rest[0];
  if (!id) throw new Error('Usage: aiwg issue show <id> [--comments last:10|all]');
  const issue = await issues.getIssue(id, { comments: (stringFlag(args, 'comments') ?? 'all') as never });
  if (args.flags.has('json')) {
    console.log(JSON.stringify(issue, null, 2));
    return;
  }
  console.log(`# ${issue.fields.id}: ${issue.fields.title}`);
  console.log(`status: ${issue.fields.status}`);
  console.log(`priority: ${issue.fields.priority}`);
  console.log(`labels: ${issue.fields.labels.join(', ') || '(none)'}`);
  console.log('');
  console.log(issue.body);
  if (issue.events.length > 0) {
    console.log('\n## Events');
    for (const event of issue.events) {
      console.log(`- ${event.created_at} ${event.type} by ${event.author}${event.body ? `: ${event.body}` : ''}`);
    }
  }
}

async function handleImport(issues: LocalIssueProviderCore, args: ParsedArgs): Promise<void> {
  const snapshot = parseExternalIssueSnapshot(JSON.parse(await readRequiredFile(args, 'snapshot-file')));
  const from = stringFlag(args, 'from');
  if (from && from !== snapshot.provider) throw new Error(`snapshot provider ${snapshot.provider} does not match --from ${from}`);
  const issue = await issues.importIssue({
    provider: snapshot.provider,
    external_id: snapshot.external_id,
    external_url: snapshot.external_url,
    title: snapshot.title,
    body: snapshot.body,
    status: snapshot.status,
    labels: snapshot.labels,
    created_at: snapshot.created_at,
    updated_at: snapshot.updated_at,
    comments: snapshot.comments,
  });
  printJsonOrText(args, issue, `Imported ${snapshot.provider}#${snapshot.external_id} as ${issue.fields.id}`);
}

async function handleExport(issues: LocalIssueProviderCore, rest: string[], args: ParsedArgs): Promise<void> {
  const id = rest[0];
  if (!id) throw new Error('Usage: aiwg issue export <id> --to gitea|github [--out path]');
  const provider = stringFlag(args, 'to');
  if (provider !== 'gitea' && provider !== 'github') throw new Error('Usage: aiwg issue export <id> --to gitea|github [--out path]');
  const issue = await issues.getIssue(id, { body: true, comments: 'all' });
  const snapshot = buildExternalIssueSnapshotFromLocal(issue, provider);
  await writeOptionalOutput(args, snapshot);
}

async function handleSync(issues: LocalIssueProviderCore, rest: string[], args: ParsedArgs): Promise<void> {
  const action = rest[0];
  if (action === 'conflicts' || action === 'conflict-report') {
    const id = rest[1];
    if (!id) throw new Error('Usage: aiwg issue sync conflicts <id> --snapshot-file path');
    const issue = await issues.getIssue(id, { body: true, comments: 'all' });
    const snapshot = parseExternalIssueSnapshot(JSON.parse(await readRequiredFile(args, 'snapshot-file')));
    const report = buildLocalIssueConflictReport(issue, snapshot);
    await writeOptionalOutput(args, report);
    return;
  }
  if (action === 'map-comments') {
    const id = rest[1];
    if (!id) throw new Error('Usage: aiwg issue sync map-comments <id> --map-file path');
    const mappings = parseCommentIdMappings(JSON.parse(await readRequiredFile(args, 'map-file')));
    const events = await issues.applyCommentIdMappings(id, mappings);
    printJsonOrText(args, events, `Mapped ${mappings.length} external comment id(s) for ${id}`);
    return;
  }
  throw new Error('Usage: aiwg issue sync conflicts <id> --snapshot-file path | map-comments <id> --map-file path');
}

async function handleComment(issues: LocalIssueProviderCore, rest: string[], args: ParsedArgs): Promise<void> {
  const id = rest[0];
  if (!id) throw new Error('Usage: aiwg issue comment <id> --body <text>|--body-file <path>');
  const body = await readBody(args);
  const event = await issues.commentIssue(id, body, { author: stringFlag(args, 'author') });
  printJsonOrText(args, event, `Commented on ${id}`);
}

async function handleClose(issues: LocalIssueProviderCore, rest: string[], args: ParsedArgs): Promise<void> {
  const id = rest[0];
  if (!id) throw new Error('Usage: aiwg issue close <id> [--reason <text>|--body-file <path>]');
  const reason = stringFlag(args, 'reason') ?? stringFlag(args, 'body') ?? await optionalBodyFile(args);
  const issue = await issues.closeIssue(id, { author: stringFlag(args, 'author'), reason });
  printJsonOrText(args, issue, `Closed ${issue.fields.id}`);
}

async function handleIndex(issues: LocalIssueProviderCore, rest: string[], args: ParsedArgs): Promise<void> {
  if (rest[0] !== 'rebuild') throw new Error('Usage: aiwg issue index rebuild');
  const index = await issues.rebuildIssueIndex();
  printJsonOrText(args, index, `Rebuilt local issue index (${index.issues.length} issues)`);
}

async function readRequiredFile(args: ParsedArgs, flag: string): Promise<string> {
  const file = stringFlag(args, flag);
  if (!file) throw new Error(`Missing required --${flag} path`);
  return readFile(file, 'utf-8');
}

async function writeOptionalOutput(args: ParsedArgs, value: unknown): Promise<void> {
  const out = stringFlag(args, 'out');
  const rendered = JSON.stringify(value, null, 2) + '\n';
  if (out) {
    await writeFile(out, rendered, 'utf-8');
    if (!args.flags.has('json')) console.log(`Wrote ${out}`);
    return;
  }
  console.log(rendered.trimEnd());
}

async function readBody(args: ParsedArgs): Promise<string> {
  const body = stringFlag(args, 'body');
  if (body !== undefined) return body;
  const bodyFile = stringFlag(args, 'body-file');
  if (bodyFile) return readFile(bodyFile, 'utf-8');
  return '';
}

async function optionalBodyFile(args: ParsedArgs): Promise<string | undefined> {
  const bodyFile = stringFlag(args, 'body-file');
  return bodyFile ? readFile(bodyFile, 'utf-8') : undefined;
}

function printJsonOrText(args: ParsedArgs, value: unknown, text: string): void {
  if (args.flags.has('json')) {
    console.log(JSON.stringify(value, null, 2));
  } else {
    console.log(text);
  }
}

function parseArgs(args: string[]): ParsedArgs {
  const positional: string[] = [];
  const flags = new Map<string, string | boolean>();
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (!arg.startsWith('--')) {
      positional.push(arg);
      continue;
    }
    const [rawKey, inline] = arg.slice(2).split(/=(.*)/s).filter((part) => part !== undefined);
    if (inline !== undefined && inline !== '') {
      flags.set(rawKey, inline);
      continue;
    }
    const next = args[i + 1];
    if (next && !next.startsWith('--')) {
      flags.set(rawKey, next);
      i++;
    } else {
      flags.set(rawKey, true);
    }
  }
  return { positional, flags };
}

function stringFlag(args: ParsedArgs, name: string): string | undefined {
  const value = args.flags.get(name);
  if (value === undefined || value === true) return undefined;
  return String(value);
}

function csvFlag(args: ParsedArgs, name: string): string[] {
  const value = stringFlag(args, name);
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}

function printUsage(): void {
  console.log(`Usage:
  aiwg issue init [--prefix KEY] [--padding N]
  aiwg issue new --title "..." [--body "..."] [--body-file path]
  aiwg issue list [--status open] [--label bug] [--limit 20] [--json]
  aiwg issue show <KEY> [--comments last:10|all]
  aiwg issue import --from gitea|github --snapshot-file path [--json]
  aiwg issue export <KEY> --to gitea|github [--out path]
  aiwg issue sync conflicts <KEY> --snapshot-file path [--out path]
  aiwg issue sync map-comments <KEY> --map-file path [--json]
  aiwg issue comment <KEY> --body "..." [--author name]
  aiwg issue close <KEY> [--reason "..."]
  aiwg issue index rebuild`);
}
