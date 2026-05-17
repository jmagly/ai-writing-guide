#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..');
const fixtureDir = join(repoRoot, 'test', 'fixtures', 'sandbox-api', 'sandbox-transport');

const args = new Set(process.argv.slice(2));
const endpoint = process.env.AIWG_SANDBOX_ENDPOINT?.replace(/\/$/, '');

if (!args.has('--write') && !args.has('--diff')) {
  fail('record-sandbox-api requires --write or --diff');
}

if (!endpoint) {
  fail('AIWG_SANDBOX_ENDPOINT must point at a live sandbox management HTTP endpoint');
}

const command = process.env.AIWG_SANDBOX_RECORD_COMMAND ?? 'echo aiwg-contract';
const agentId = process.env.AIWG_SANDBOX_RECORD_AGENT_ID ?? 'contract-agent';

function fail(message) {
  console.error(`[record-sandbox-api] ${message}`);
  process.exit(2);
}

function normalize(value) {
  if (typeof value === 'string') {
    return value
      .replace(/task[-_][A-Za-z0-9-]+/g, 'task-contract-1')
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z/g, '<RFC3339>')
      .replace(/pty-[^-\\s]+-\d+/g, 'pty-contract-agent-<timestamp>');
  }

  if (Array.isArray(value)) return value.map(normalize);

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, normalize(entry)]));
  }

  return value;
}

function stableJson(value) {
  return `${JSON.stringify(normalize(value), null, 2)}\n`;
}

async function request(method, path, body) {
  const headers = body === undefined ? undefined : { 'Content-Type': 'application/json' };
  const response = await fetch(`${endpoint}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const text = await response.text();
  let parsed;
  if (contentType.includes('application/json') && text) {
    parsed = JSON.parse(text);
  }

  return {
    status: response.status,
    headers: contentType ? { 'content-type': contentType.split(';')[0] } : {},
    body: parsed,
    bodyText: parsed === undefined ? text : undefined,
  };
}

function fixture(name, method, path, requestBody, response) {
  const result = {
    name,
    endpoint: `${method} ${path.replace(/task-contract-1/g, ':taskId').replace(/offset=0/, 'offset=:offset')}`,
    request: {
      method,
      path,
    },
    response: {
      status: response.status,
      headers: response.headers,
    },
  };

  if (requestBody !== undefined) {
    result.request.headers = { 'content-type': 'application/json' };
    result.request.body = requestBody;
  }

  if (response.body !== undefined) result.response.body = response.body;
  else result.response.bodyText = response.bodyText ?? '';

  return normalize(result);
}

function writeOrDiff(name, content) {
  const path = join(fixtureDir, `${name}.json`);
  if (args.has('--write')) {
    mkdirSync(fixtureDir, { recursive: true });
    writeFileSync(path, content);
    console.log(`[record-sandbox-api] wrote ${path}`);
    return;
  }

  const current = readFileSync(path, 'utf8');
  if (current === content) {
    console.log(`[record-sandbox-api] unchanged ${path}`);
    return;
  }

  console.log(`[record-sandbox-api] drift ${path}`);
  const currentLines = current.split('\n');
  const nextLines = content.split('\n');
  const max = Math.max(currentLines.length, nextLines.length);
  for (let index = 0; index < max; index += 1) {
    if (currentLines[index] === nextLines[index]) continue;
    if (currentLines[index] !== undefined) console.log(`-${currentLines[index]}`);
    if (nextLines[index] !== undefined) console.log(`+${nextLines[index]}`);
  }
  process.exitCode = 1;
}

const manifest = {
  manifest_yaml: [
    'version: "1"',
    'kind: Task',
    'metadata:',
    `  name: "pty-${agentId}-${Date.now()}"`,
    '  labels:',
    '    aiwg_transport: pty',
    'claude:',
    `  prompt: "${command}"`,
    '  headless: true',
    '  skip_permissions: true',
    'vm:',
    '  profile: agentic-dev',
  ].join('\n'),
};

const submit = await request('POST', '/api/v1/tasks', manifest);
const taskId = submit.body?.task_id ?? submit.body?.id;
if (!taskId) fail('POST /api/v1/tasks did not return task_id or id');

const taskPath = `/api/v1/tasks/${taskId}`;
const logPath = `/api/v1/tasks/${taskId}/logs?offset=0`;
const status = await request('GET', taskPath);
const logs = await request('GET', logPath);
const stdin = await request('PATCH', taskPath, { stdin: 'input line\n' });
const list = await request('GET', '/api/v1/tasks?state=running');
const deleted = await request('DELETE', taskPath);

const files = [
  ['task-submit', fixture('task-submit', 'POST', '/api/v1/tasks', manifest, submit)],
  ['task-status-running', fixture('task-status-running', 'GET', '/api/v1/tasks/task-contract-1', undefined, status)],
  ['task-logs', fixture('task-logs', 'GET', '/api/v1/tasks/task-contract-1/logs?offset=0', undefined, logs)],
  ['task-stdin', fixture('task-stdin', 'PATCH', '/api/v1/tasks/task-contract-1', { stdin: 'input line\n' }, stdin)],
  ['task-list-running', fixture('task-list-running', 'GET', '/api/v1/tasks?state=running', undefined, list)],
  ['task-delete', fixture('task-delete', 'DELETE', '/api/v1/tasks/task-contract-1', undefined, deleted)],
];

for (const [name, data] of files) {
  writeOrDiff(name, stableJson(data));
}
