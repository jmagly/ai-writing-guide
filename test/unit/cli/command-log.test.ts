import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, stat } from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  maybeAppendCommandLog,
  readCommandLogReport,
  type CommandLogEvent,
} from '../../../src/cli/command-log.js';
import { emptyConfig, writeAiwgConfig } from '../../../src/config/aiwg-config.js';

async function tmpProject(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'aiwg-command-log-'));
}

async function append(projectDir: string, overrides: Partial<Parameters<typeof maybeAppendCommandLog>[0]> = {}) {
  await maybeAppendCommandLog({
    command: 'doctor',
    args: ['--json', 'secret prompt text'],
    cwd: projectDir,
    frameworkRoot: process.cwd(),
    durationMs: 12.4,
    exitStatus: 0,
    env: {},
    ...overrides,
  });
}

async function readProjectEvents(projectDir: string): Promise<CommandLogEvent[]> {
  const raw = await readFile(path.join(projectDir, '.aiwg', 'telemetry', 'cli-commands.jsonl'), 'utf8');
  return raw.trim().split('\n').map(line => JSON.parse(line) as CommandLogEvent);
}

describe('command-log', () => {
  it('is off by default and creates no log files', async () => {
    const projectDir = await tmpProject();

    await append(projectDir);

    await expect(stat(path.join(projectDir, '.aiwg', 'telemetry', 'cli-commands.jsonl'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('writes project-scope events when enabled in project config', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.command_log = { enabled: true, scopes: ['project'] };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    const [event] = await readProjectEvents(projectDir);

    expect(event.command).toBe('doctor');
    expect(event.exit_status).toBe(0);
    expect(event.duration_ms).toBe(12);
    expect(event.project?.relative_path).toBe('.');
    expect(event.project?.root_hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('writes global events when enabled by env override', async () => {
    const projectDir = await tmpProject();
    const stateDir = path.join(projectDir, 'state');

    await append(projectDir, {
      env: {
        AIWG_COMMAND_LOG: 'global',
        XDG_STATE_HOME: stateDir,
      },
    });

    const raw = await readFile(path.join(stateDir, 'aiwg', 'cli-commands.jsonl'), 'utf8');
    const event = JSON.parse(raw.trim()) as CommandLogEvent;
    expect(event.scope).toBe('global');
    expect(event.command).toBe('doctor');
  });

  it('does not store raw positional argument values', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.command_log = { enabled: true, scopes: ['project'] };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir, {
      args: ['--token=abc123', 'do not store this prompt'],
      exitStatus: 2,
    });
    const [event] = await readProjectEvents(projectDir);
    const serialized = JSON.stringify(event);

    expect(event.flags).toEqual(['--token']);
    expect(event.positional_count).toBe(1);
    expect(event.exit_status).toBe(2);
    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('do not store this prompt');
    expect(serialized).not.toContain(projectDir);
  });

  it('reports human and JSON-readable summaries', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.command_log = { enabled: true, scopes: ['project'] };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    await append(projectDir, { command: 'use', exitStatus: 1 });

    const report = await readCommandLogReport({
      cwd: projectDir,
      frameworkRoot: process.cwd(),
      scope: 'project',
    });

    expect(report.summary.total).toBe(2);
    expect(report.summary.by_command.doctor).toBe(1);
    expect(report.summary.failures_by_command.use).toBe(1);
    expect(report.events).toHaveLength(2);
  });

  it('rotates project log stores when max_bytes is exceeded', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.command_log = { enabled: true, scopes: ['project'], max_bytes: 128 };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    await append(projectDir, { command: 'use' });

    const active = await readProjectEvents(projectDir);
    await expect(stat(path.join(projectDir, '.aiwg', 'telemetry', 'cli-commands.jsonl.1'))).resolves.toBeDefined();
    expect(active.at(-1)?.command).toBe('use');
  });
});
