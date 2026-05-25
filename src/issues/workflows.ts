import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { LocalIssueProviderCore, localIssueRoot } from './index.js';
import type { LocalIssueFilter, LocalIssueRecord, LocalIssueEventWithBody } from './types.js';

interface ParsedArgs {
  positional: string[];
  flags: Map<string, string | boolean>;
}

interface ThreatReport {
  verdict: 'safe' | 'flag' | 'reject';
  action: string;
  score: number;
  signals: Array<{ id: string; severity: number; evidence: string[] }>;
}

interface SelectedIssue extends LocalIssueRecord {
  events: LocalIssueEventWithBody[];
}

export async function auditLocalIssuesCli(args: string[], cwd = process.cwd()): Promise<void> {
  const parsed = parseArgs(args);
  requireLocalProvider(parsed, 'issue-audit');
  const issues = new LocalIssueProviderCore(localIssueRoot(cwd));
  const limit = numberFlag(parsed, 'limit') ?? 50;
  const result = await issues.listIssues({
    limit,
    cursor: stringFlag(parsed, 'cursor'),
    filter: buildFilter(parsed),
  });

  const counts = {
    open: result.issues.filter((issue) => issue.status === 'open').length,
    closed: result.issues.filter((issue) => issue.status === 'closed').length,
    archived: result.issues.filter((issue) => issue.status === 'archived').length,
  };

  if (parsed.flags.has('json')) {
    console.log(JSON.stringify({ provider: 'local', limit, nextCursor: result.nextCursor, counts, issues: result.issues }, null, 2));
    return;
  }

  console.log('# Issue Audit');
  console.log('');
  console.log('Scope: local .aiwg/issues/');
  console.log(`Mode: ${parsed.flags.has('apply') ? 'apply requested, local audit is read-only' : 'read-only'}`);
  console.log('');
  console.log('## Counts');
  console.log(`- Issues audited: ${result.issues.length}`);
  console.log(`- Open: ${counts.open}`);
  console.log(`- Closed: ${counts.closed}`);
  console.log(`- Archived: ${counts.archived}`);
  console.log('');
  console.log('## Findings');
  for (const issue of result.issues) {
    console.log(`- ${issue.id} [${issue.status}/${issue.priority}] ${issue.title}`);
  }
  if (result.nextCursor) console.log(`\nNext cursor: ${result.nextCursor}`);
}

export async function addressLocalIssuesCli(args: string[], cwd = process.cwd()): Promise<void> {
  const parsed = parseArgs(args);
  requireLocalProvider(parsed, 'address-issues');
  const issues = new LocalIssueProviderCore(localIssueRoot(cwd));
  const selected = await selectIssues(issues, parsed);
  const cycle = numberFlag(parsed, 'cycle') ?? 1;
  const dryRun = parsed.flags.has('dry-run');
  const reports = [];

  for (const issue of selected) {
    const threat = await runThreatAssessment(issue, cwd);
    let eventId: string | null = null;
    if (threat.verdict === 'safe' && !dryRun) {
      const event = await issues.commentIssue(issue.fields.id, cycleStatusBody(issue, cycle, threat), {
        author: stringFlag(parsed, 'author') ?? 'aiwg',
        type: 'cycle_status',
      });
      eventId = event.event_id;
    }
    reports.push({
      id: issue.fields.id,
      title: issue.fields.title,
      threat: threat.verdict,
      action: threat.action,
      eventId,
      status: threat.verdict === 'safe' ? (dryRun ? 'ready-dry-run' : 'cycle-status-appended') : 'human-authorization-required',
    });
  }

  if (parsed.flags.has('json')) {
    console.log(JSON.stringify({ provider: 'local', selected: reports }, null, 2));
    return;
  }

  console.log('# Address Issues');
  console.log('');
  console.log('Provider: local');
  console.log(`Selected issues: ${reports.length}`);
  for (const report of reports) {
    console.log(`- ${report.id}: ${report.status}; threat=${report.threat}${report.eventId ? `; event=${report.eventId}` : ''}`);
  }
}

async function selectIssues(issues: LocalIssueProviderCore, args: ParsedArgs): Promise<SelectedIssue[]> {
  const explicitIds = args.positional.filter((arg) => !arg.startsWith('-'));
  const comments = (stringFlag(args, 'comments') ?? 'all') as 'all';
  if (explicitIds.length > 0) {
    return Promise.all(explicitIds.map((id) => issues.getIssue(id, { comments })));
  }
  if (!args.flags.has('all-open') && !stringFlag(args, 'filter') && !hasFilterFlags(args)) {
    throw new Error('Usage: aiwg address-issues <issue-id...> --provider local [--limit N]');
  }
  const listed = await issues.listIssues({
    limit: numberFlag(args, 'limit') ?? 5,
    cursor: stringFlag(args, 'cursor'),
    filter: {
      status: args.flags.has('all-open') ? 'open' : undefined,
      ...buildFilter(args),
    },
  });
  return Promise.all(listed.issues.map((issue) => issues.getIssue(issue.id, { comments })));
}

async function runThreatAssessment(issue: SelectedIssue, cwd: string): Promise<ThreatReport> {
  const text = [
    issue.fields.title,
    issue.body,
    ...issue.events
      .filter((event) => event.type === 'comment' || event.type === 'cycle_status')
      .map((event) => `${event.author}\n${event.body ?? ''}`),
  ].filter(Boolean).join('\n\n');
  const script = resolveThreatAssessmentScript(cwd);
  const output = await runNodeScript(script, ['--format', 'json'], text);
  return JSON.parse(output) as ThreatReport;
}

function resolveThreatAssessmentScript(cwd: string): string {
  const relative = 'agentic/code/frameworks/sdlc-complete/skills/address-issues-threat-assess/scripts/assess.mjs';
  const projectLocal = join(cwd, relative);
  if (existsSync(projectLocal)) return projectLocal;

  let current = dirname(fileURLToPath(import.meta.url));
  while (current !== dirname(current)) {
    const candidate = join(current, relative);
    if (existsSync(candidate)) return candidate;
    current = dirname(current);
  }
  throw new Error(`address-issues-threat-assess script not found: ${relative}`);
}

function cycleStatusBody(issue: SelectedIssue, cycle: number, threat: ThreatReport): string {
  return [
    `**AL CYCLE #${cycle} - Progress**`,
    '',
    '### Actions This Cycle',
    `- Loaded bounded local issue slice for ${issue.fields.id}.`,
    `- Ran address-issues-threat-assess: ${threat.verdict} (score ${threat.score}).`,
    '',
    '### Task Checklist',
    '- [x] Local issue fetched from `.aiwg/issues/`',
    '- [x] Threat preflight completed before implementation work',
    '- [ ] Implementation and verification remain for the active agent loop',
    '',
    '### Blockers',
    'None from local provider wiring.',
    '',
    '### Next Steps',
    'Continue the issue-specific implementation loop and post the next cycle status after verification.',
  ].join('\n');
}

function runNodeScript(script: string, args: string[], stdin: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf-8');
    child.stderr.setEncoding('utf-8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `threat assessment exited with code ${code}`));
    });
    child.stdin.end(stdin);
  });
}

function buildFilter(args: ParsedArgs): LocalIssueFilter {
  const expression = stringFlag(args, 'filter');
  const filter: LocalIssueFilter = {};
  if (expression) {
    for (const token of expression.split(/\s+/).filter(Boolean)) {
      const [key, value] = token.split(/:(.*)/s);
      if (!value) continue;
      if (key === 'status') filter.status = value as never;
      else if (key === 'label') filter.labels = [...(filter.labels ?? []), value];
      else if (key === 'type') filter.type = value as never;
      else if (key === 'priority') filter.priority = value as never;
      else if (key === 'assignee') filter.assignee = value;
      else if (key === 'search') filter.search = value;
    }
  }
  filter.status = (stringFlag(args, 'status') as never) ?? filter.status;
  const labels = csvFlag(args, 'label');
  if (labels.length > 0) filter.labels = [...(filter.labels ?? []), ...labels];
  filter.type = (stringFlag(args, 'type') as never) ?? filter.type;
  filter.priority = (stringFlag(args, 'priority') as never) ?? filter.priority;
  filter.assignee = stringFlag(args, 'assignee') ?? filter.assignee;
  filter.search = stringFlag(args, 'search') ?? filter.search;
  return filter;
}

function requireLocalProvider(args: ParsedArgs, command: string): void {
  const provider = stringFlag(args, 'provider');
  if (provider !== 'local') {
    throw new Error(`${command} CLI workflow support is currently local-only; pass --provider local or use the configured external tracker workflow`);
  }
}

function hasFilterFlags(args: ParsedArgs): boolean {
  return ['status', 'label', 'type', 'priority', 'assignee', 'search'].some((flag) => args.flags.has(flag));
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

function numberFlag(args: ParsedArgs, name: string): number | undefined {
  const value = stringFlag(args, name);
  if (!value) return undefined;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 1) throw new Error(`--${name} must be a positive integer`);
  return parsed;
}

function csvFlag(args: ParsedArgs, name: string): string[] {
  const value = stringFlag(args, name);
  return value ? value.split(',').map((item) => item.trim()).filter(Boolean) : [];
}
