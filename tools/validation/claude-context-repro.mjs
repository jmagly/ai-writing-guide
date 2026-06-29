#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const DEFAULT_REPRO_PROMPT =
  'docSync code2doc then make sure the blog post is fully covering our work for the month then commit-and-push, we will review before release';

export const VALIDATION_SYSTEM_PROMPT =
  'Validation harness for AIWG issue 1672: do not modify files, do not stage, do not commit, do not push, and stop after producing the initial decomposition and first safe scope-discovery actions. The user prompt is the repro scenario; validate that it does not immediately exhaust context.';

export const DEFAULT_DISALLOWED_TOOLS = [
  'Edit',
  'Write',
  'Bash(git commit*)',
  'Bash(git push*)',
  'Bash(git add*)',
];

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function run(command, args, options = {}) {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env ?? process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      options.onStdout?.(chunk);
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
      options.onStderr?.(chunk);
    });
    child.on('error', (error) => {
      resolve({ code: 127, stdout, stderr: `${stderr}${error.message}` });
    });
    child.on('close', (code, signal) => {
      resolve({ code: code ?? 1, signal, stdout, stderr });
    });
    if (options.timeoutMs) {
      setTimeout(() => {
        child.kill('SIGTERM');
      }, options.timeoutMs).unref();
    }
  });
}

export function buildClaudeArgs(options = {}) {
  const prompt = options.prompt ?? DEFAULT_REPRO_PROMPT;
  const debugFile = options.debugFile ?? 'claude-debug.log';
  return [
    '-p',
    '--verbose',
    '--model',
    options.model ?? 'sonnet',
    '--permission-mode',
    'plan',
    '--max-budget-usd',
    String(options.maxBudgetUsd ?? '1.00'),
    '--output-format',
    'stream-json',
    '--debug-file',
    debugFile,
    '--disallowedTools',
    DEFAULT_DISALLOWED_TOOLS.join(','),
    '--append-system-prompt',
    VALIDATION_SYSTEM_PROMPT,
    prompt,
  ];
}

export function classifyClaudeStream(stdout, stderr = '') {
  const text = `${stdout}\n${stderr}`;
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const parsed = [];
  for (const line of lines) {
    try {
      parsed.push(JSON.parse(line));
    } catch {
      // Keep parsing best-effort; Claude may emit plain text warnings on stderr.
    }
  }

  const assistantText = parsed
    .flatMap((event) => event?.message?.content ?? [])
    .filter((item) => item?.type === 'text')
    .map((item) => item.text)
    .join('\n');
  const resultText = parsed.map((event) => event?.result ?? '').filter(Boolean).join('\n');
  const combined = `${text}\n${assistantText}\n${resultText}`;
  const usageInputTokens = parsed.reduce((sum, event) => {
    const usage = event?.message?.usage ?? event?.usage;
    return sum + Number(usage?.input_tokens ?? 0) + Number(usage?.cache_read_input_tokens ?? 0);
  }, 0);

  const authBlocked = /Not logged in|authentication_failed|Please run \/login/i.test(combined);
  const contextExhausted = /Context limit reached|context[_ -]?limit|compact or \/clear/i.test(combined);
  const reachedModel = usageInputTokens > 0 || (assistantText.length > 0 && !authBlocked);
  const mentionsSafeScopeDiscovery = /git status --short|git diff --name-only|changed-file|scope/i.test(combined);

  let verdict = 'unknown';
  if (authBlocked) verdict = 'auth-blocked';
  else if (contextExhausted) verdict = 'context-exhausted';
  else if (reachedModel) verdict = 'model-ran';

  return {
    verdict,
    authBlocked,
    contextExhausted,
    reachedModel,
    mentionsSafeScopeDiscovery,
    usageInputTokens,
    assistantText,
  };
}

async function prepareWorkdir(rootDir, workdir) {
  await fs.rm(workdir, { recursive: true, force: true });
  await fs.mkdir(path.dirname(workdir), { recursive: true });
  const rsyncArgs = [
    '-a',
    '--delete',
    '--exclude',
    'node_modules',
    '--exclude',
    'apps/web/node_modules',
    '--exclude',
    'dist',
    '--exclude',
    'coverage',
    `${rootDir.replace(/\/$/, '')}/`,
    `${workdir.replace(/\/$/, '')}/`,
  ];
  const copyResult = await run('rsync', rsyncArgs);
  if (copyResult.code !== 0) {
    throw new Error(`rsync failed:\n${copyResult.stderr}`);
  }
  await run('git', ['remote', 'remove', 'origin'], { cwd: workdir });
  await run('git', ['remote', 'remove', 'github'], { cwd: workdir });
}

function usage() {
  return `Usage: node tools/validation/claude-context-repro.mjs [options]

Options:
  --root <repo>           Source repo to copy. Default: current directory.
  --workdir <path>        Disposable validation directory. Default: /tmp/aiwg-1672-claude-validation
  --prompt <text>         Repro prompt. Default: issue #1672 prompt.
  --claude-bin <path>     Claude Code binary. Default: claude
  --model <model>         Claude model alias. Default: sonnet
  --timeout-ms <n>        Kill Claude after this many ms. Default: 240000
  --skip-copy             Run in --workdir as-is instead of copying root.
  --help                  Show this help.

The harness runs Claude Code in plan mode with edit/write/git mutation tools denied.
It exits 0 when the model runs without context exhaustion, 2 when auth is missing,
3 on context exhaustion, and 1 for other failures.`;
}

export async function main(argv = process.argv.slice(2)) {
  let rootDir = process.cwd();
  let workdir = '/tmp/aiwg-1672-claude-validation';
  let prompt = DEFAULT_REPRO_PROMPT;
  let claudeBin = 'claude';
  let model = 'sonnet';
  let timeoutMs = 240000;
  let skipCopy = false;

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--root' && argv[i + 1]) {
      rootDir = path.resolve(argv[++i]);
    } else if (arg.startsWith('--root=')) {
      rootDir = path.resolve(arg.slice('--root='.length));
    } else if (arg === '--workdir' && argv[i + 1]) {
      workdir = path.resolve(argv[++i]);
    } else if (arg.startsWith('--workdir=')) {
      workdir = path.resolve(arg.slice('--workdir='.length));
    } else if (arg === '--prompt' && argv[i + 1]) {
      prompt = argv[++i];
    } else if (arg.startsWith('--prompt=')) {
      prompt = arg.slice('--prompt='.length);
    } else if (arg === '--claude-bin' && argv[i + 1]) {
      claudeBin = argv[++i];
    } else if (arg.startsWith('--claude-bin=')) {
      claudeBin = arg.slice('--claude-bin='.length);
    } else if (arg === '--model' && argv[i + 1]) {
      model = argv[++i];
    } else if (arg.startsWith('--model=')) {
      model = arg.slice('--model='.length);
    } else if (arg === '--timeout-ms' && argv[i + 1]) {
      timeoutMs = Number(argv[++i]);
    } else if (arg.startsWith('--timeout-ms=')) {
      timeoutMs = Number(arg.slice('--timeout-ms='.length));
    } else if (arg === '--skip-copy') {
      skipCopy = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(usage());
      return 0;
    }
  }

  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    console.error('Invalid --timeout-ms value.');
    return 1;
  }

  if (!skipCopy) {
    await prepareWorkdir(rootDir, workdir);
  } else if (!(await pathExists(workdir))) {
    console.error(`--workdir does not exist: ${workdir}`);
    return 1;
  }

  const reportDir = path.join(workdir, '.aiwg', 'reports');
  await fs.mkdir(reportDir, { recursive: true });
  const stamp = timestamp();
  const transcriptPath = path.join(reportDir, `claude-context-repro-${stamp}.jsonl`);
  const debugFile = path.join(reportDir, `claude-context-repro-${stamp}.debug.log`);
  const args = buildClaudeArgs({ prompt, model, debugFile });

  console.log(`Running Claude Code validation in ${workdir}`);
  console.log(`Command: ${claudeBin} ${args.map(shellQuote).join(' ')}`);

  let transcript = '';
  const result = await run(claudeBin, args, {
    cwd: workdir,
    timeoutMs,
    onStdout: (chunk) => {
      transcript += chunk;
    },
    onStderr: (chunk) => {
      transcript += chunk;
    },
  });
  await fs.writeFile(transcriptPath, transcript, 'utf8');

  const classification = classifyClaudeStream(result.stdout, result.stderr);
  const summary = {
    verdict: classification.verdict,
    authBlocked: classification.authBlocked,
    contextExhausted: classification.contextExhausted,
    reachedModel: classification.reachedModel,
    mentionsSafeScopeDiscovery: classification.mentionsSafeScopeDiscovery,
    usageInputTokens: classification.usageInputTokens,
    exitCode: result.code,
    signal: result.signal ?? null,
    transcriptPath,
    debugFile,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (classification.authBlocked) return 2;
  if (classification.contextExhausted) return 3;
  if (!classification.reachedModel) return 1;
  return 0;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const code = await main();
  process.exitCode = code;
}
