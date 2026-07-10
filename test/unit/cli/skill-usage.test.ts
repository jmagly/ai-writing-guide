import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readFile, stat, writeFile } from 'fs/promises';
import path from 'path';
import os from 'os';
import {
  maybeAppendSkillUsage,
  ingestSkillUsageTranscript,
  readSkillUsageReport,
  type SkillUsageEvent,
} from '../../../src/cli/skill-usage.js';
import { emptyConfig, writeAiwgConfig } from '../../../src/config/aiwg-config.js';

async function tmpProject(): Promise<string> {
  return mkdtemp(path.join(os.tmpdir(), 'aiwg-skill-usage-'));
}

async function append(projectDir: string, overrides: Partial<Parameters<typeof maybeAppendSkillUsage>[0]> = {}) {
  await maybeAppendSkillUsage({
    command: 'run',
    args: ['skill', 'issue-audit', '--token=abc123', 'do not store this prompt'],
    cwd: projectDir,
    frameworkRoot: process.cwd(),
    durationMs: 12.4,
    exitStatus: 0,
    env: {},
    ...overrides,
  });
}

async function readProjectEvents(projectDir: string): Promise<SkillUsageEvent[]> {
  const raw = await readFile(path.join(projectDir, '.aiwg', 'telemetry', 'skill-usage.jsonl'), 'utf8');
  return raw.trim().split('\n').map(line => JSON.parse(line) as SkillUsageEvent);
}

async function writeFixtureSkill(frameworkRoot: string, id: string, description: string) {
  const dir = path.join(frameworkRoot, 'agentic', 'code', 'addons', 'fixture', 'skills', id);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, 'SKILL.md'), `---\nname: ${id}\ndescription: ${description}\n---\n# ${id}\n`, 'utf8');
}

describe('skill-usage', () => {
  it('is off by default and creates no log files', async () => {
    const projectDir = await tmpProject();

    await append(projectDir);

    await expect(stat(path.join(projectDir, '.aiwg', 'telemetry', 'skill-usage.jsonl'))).rejects.toMatchObject({
      code: 'ENOENT',
    });
  });

  it('writes normalized skill events when enabled through telemetry config', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.telemetry = { skill_usage: { enabled: true, scopes: ['project'] } };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    const [event] = await readProjectEvents(projectDir);

    expect(event.event_type).toBe('aiwg.skill_usage');
    expect(event.source).toBe('cli');
    expect(event.artifact).toEqual({ kind: 'skill', id: 'issue-audit' });
    expect(event.action).toBe('invoke');
    expect(event.outcome).toBe('ok');
    expect(event.duration_ms).toBe(12);
    expect(event.project?.relative_path).toBe('.');
    expect(event.project?.root_hash).toMatch(/^[a-f0-9]{16}$/);
  });

  it('uses command_log as a compatibility opt-in alias', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.command_log = { enabled: true, scopes: ['project'] };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir, { command: 'show', args: ['agent', 'security-auditor'] });
    const [event] = await readProjectEvents(projectDir);

    expect(event.artifact).toEqual({ kind: 'agent', id: 'security-auditor' });
    expect(event.action).toBe('show');
  });

  it('writes global events when enabled by env override', async () => {
    const projectDir = await tmpProject();
    const stateDir = path.join(projectDir, 'state');
    await writeAiwgConfig(projectDir, emptyConfig());

    await append(projectDir, {
      env: {
        AIWG_SKILL_USAGE: 'global',
        XDG_STATE_HOME: stateDir,
      },
      command: 'doctor',
      args: ['--json'],
    });

    const raw = await readFile(path.join(stateDir, 'aiwg', 'skill-usage.jsonl'), 'utf8');
    const event = JSON.parse(raw.trim()) as SkillUsageEvent;
    expect(event.scope).toBe('global');
    expect(event.artifact).toEqual({ kind: 'command', id: 'doctor' });
    expect(event.project?.relative_path).toBe('.');
  });

  it('rotates project skill-usage stores when max_bytes is exceeded', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.telemetry = { skill_usage: { enabled: true, scopes: ['project'], max_bytes: 128 } };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    await append(projectDir, { command: 'run', args: ['agent', 'test-engineer'] });

    const active = await readProjectEvents(projectDir);
    await expect(stat(path.join(projectDir, '.aiwg', 'telemetry', 'skill-usage.jsonl.1'))).resolves.toBeDefined();
    expect(active.at(-1)?.artifact).toEqual({ kind: 'agent', id: 'test-engineer' });
  });

  it('does not store raw positional argument values or secrets', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.telemetry = { skill_usage: { enabled: true, scopes: ['project'] } };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    const [event] = await readProjectEvents(projectDir);
    const serialized = JSON.stringify(event);

    expect(serialized).not.toContain('abc123');
    expect(serialized).not.toContain('do not store this prompt');
    expect(serialized).not.toContain(projectDir);
  });

  it('reports summaries by artifact, kind, action, and failures', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.telemetry = { skill_usage: { enabled: true, scopes: ['project'] } };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir);
    await append(projectDir, { command: 'run', args: ['agent', 'test-engineer'], exitStatus: 1 });

    const report = await readSkillUsageReport({
      cwd: projectDir,
      frameworkRoot: process.cwd(),
      scope: 'project',
    });

    expect(report.summary.total).toBe(2);
    expect(report.summary.by_artifact['skill:issue-audit']).toBe(1);
    expect(report.summary.by_artifact['agent:test-engineer']).toBe(1);
    expect(report.summary.by_kind.skill).toBe(1);
    expect(report.summary.by_kind.agent).toBe(1);
    expect(report.summary.by_action.invoke).toBe(1);
    expect(report.summary.by_action.delegate).toBe(1);
    expect(report.summary.failures_by_artifact['agent:test-engineer']).toBe(1);
  });

  it('ingests targeted Claude Code JSONL structural invocations only', async () => {
    const projectDir = await tmpProject();
    const cfg = emptyConfig();
    cfg.telemetry = { skill_usage: { enabled: true, scopes: ['project'] } };
    await writeAiwgConfig(projectDir, cfg);
    const transcript = path.join(projectDir, 'session.jsonl');
    await writeFile(transcript, [
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'text', text: 'Use secret prompt text with issue-audit.' },
            { type: 'tool_use', name: 'Skill', input: { skill_name: 'issue-audit', prompt: 'do not store this' } },
          ],
        },
      }),
      JSON.stringify({
        type: 'assistant',
        message: {
          content: [
            { type: 'tool_use', name: 'Task', input: { subagent_type: 'test-engineer', prompt: 'do not store this either' } },
          ],
        },
      }),
      JSON.stringify({ type: 'user', message: { content: 'Free-form /security-audit mention is not structural.' } }),
    ].join('\n'), 'utf8');

    const result = await ingestSkillUsageTranscript({
      transcriptPath: transcript,
      provider: 'claude-code',
      cwd: projectDir,
      frameworkRoot: process.cwd(),
      env: {},
    });
    const events = await readProjectEvents(projectDir);
    const serialized = JSON.stringify(events);

    expect(result.appended).toBe(2);
    expect(result.skipped).toBe(1);
    expect(events.map(event => `${event.artifact.kind}:${event.artifact.id}`)).toEqual([
      'skill:issue-audit',
      'agent:test-engineer',
    ]);
    expect(events.every(event => event.source === 'transcript')).toBe(true);
    expect(serialized).not.toContain('do not store this');
    expect(serialized).not.toContain('security-audit mention');
  });

  it('reports heatmap, cold spots, and deterministic under-used suggestions', async () => {
    const projectDir = await tmpProject();
    const frameworkRoot = await tmpProject();
    await writeFixtureSkill(frameworkRoot, 'issue-audit', 'Review issue tracker state and identify risks');
    await writeFixtureSkill(frameworkRoot, 'issue-helper', 'Help with issue audit workflows and triage');
    await writeFixtureSkill(frameworkRoot, 'release-helper', 'Help with release publication');
    const cfg = emptyConfig();
    cfg.telemetry = { skill_usage: { enabled: true, scopes: ['project'] } };
    await writeAiwgConfig(projectDir, cfg);

    await append(projectDir, { frameworkRoot, command: 'run', args: ['skill', 'issue-audit'] });
    await append(projectDir, { frameworkRoot, command: 'run', args: ['skill', 'issue-audit'] });

    const report = await readSkillUsageReport({
      cwd: projectDir,
      frameworkRoot,
      scope: 'project',
      suggestFor: 'issue audit',
      now: new Date(),
    });

    expect(report.heatmap[0]).toMatchObject({
      artifact: 'skill:issue-audit',
      kind: 'skill',
      id: 'issue-audit',
      count: 2,
      frequency_bucket: 'low',
      recency_bucket: 'today',
    });
    expect(report.cold_spots.map(entry => entry.id)).toEqual(['issue-helper', 'release-helper']);
    expect(report.suggestions[0]).toMatchObject({
      artifact: 'skill:issue-helper',
      kind: 'skill',
      id: 'issue-helper',
    });
  });
});
