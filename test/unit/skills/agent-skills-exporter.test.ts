import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { main as skillsMain } from '../../../src/skills/cli.js';
import {
  AGENT_SKILL_EXPORT_SIDECAR,
  AgentSkillExportError,
  exportAgentSkillDirectory,
} from '../../../src/skills/exporter.js';
import { validateAgentSkillFile } from '../../../src/skills/validator.js';

let root: string;
let source: string;
let outDir: string;

function createSource(name = 'portable-export'): string {
  const skill = path.join(source, name);
  fs.mkdirSync(path.join(skill, 'references'), { recursive: true });
  fs.mkdirSync(path.join(skill, 'assets'), { recursive: true });
  fs.mkdirSync(path.join(skill, 'scripts'), { recursive: true });
  fs.writeFileSync(path.join(skill, 'SKILL.md'), [
    '---',
    `name: ${name}`,
    'description: Use this fixture to verify strict Agent Skills export.',
    'license: LICENSE.txt',
    'metadata:',
    '  owner: "tests"',
    'allowed-tools: Read Bash',
    'namespace: fixtures',
    'platforms: [all]',
    'commandHint:',
    '  allowedTools: Read, Bash',
    '---',
    '',
    `# ${name}`,
    '',
    'Read [the guide](references/guide.md) and inspect [data](assets/data.json).',
    '',
  ].join('\n'));
  fs.writeFileSync(path.join(skill, 'LICENSE.txt'), 'Test license.\n');
  fs.writeFileSync(path.join(skill, 'references', 'guide.md'), '# Guide\n');
  fs.writeFileSync(path.join(skill, 'assets', 'data.json'), '{"ok":true}\n');
  fs.writeFileSync(path.join(skill, 'scripts', 'check.sh'), '#!/bin/sh\nexit 0\n');
  return skill;
}

beforeEach(() => {
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-agent-skill-export-'));
  source = path.join(root, 'source');
  outDir = path.join(root, 'out');
  fs.mkdirSync(source);
});

afterEach(() => {
  process.exitCode = undefined;
  vi.restoreAllMocks();
  fs.rmSync(root, { recursive: true, force: true });
});

describe('strict Agent Skills export', () => {
  it('plans and writes a strict portable directory with sidecar provenance', () => {
    const skill = createSource();
    const planned = exportAgentSkillDirectory(skill, {
      outDir,
      dryRun: true,
      exportedAt: '2026-07-26T16:00:00.000Z',
      aiwgVersion: 'test-version',
    });
    expect(planned).toMatchObject({
      status: 'planned',
      dryRun: true,
      name: 'portable-export',
      omittedAiwgFields: ['commandHint', 'namespace', 'platforms'],
    });
    expect(fs.existsSync(planned.outputPath)).toBe(false);

    const exported = exportAgentSkillDirectory(skill, {
      outDir,
      exportedAt: '2026-07-26T16:00:00.000Z',
      aiwgVersion: 'test-version',
    });
    expect(exported.status).toBe('exported');
    expect(exported.exportDigest).toMatch(/^[0-9a-f]{64}$/);
    const skillPath = path.join(exported.outputPath, 'SKILL.md');
    const validation = validateAgentSkillFile(skillPath, {
      profile: 'strict',
      directoryName: 'portable-export',
    });
    expect(validation.valid).toBe(true);
    expect(validation.frontmatter).not.toHaveProperty('namespace');
    expect(validation.frontmatter).not.toHaveProperty('platforms');
    expect(validation.frontmatter).not.toHaveProperty('commandHint');
    for (const relative of [
      'LICENSE.txt',
      'references/guide.md',
      'assets/data.json',
      'scripts/check.sh',
    ]) {
      expect(fs.readFileSync(path.join(exported.outputPath, relative)))
        .toEqual(fs.readFileSync(path.join(skill, relative)));
    }
    const sidecar = JSON.parse(fs.readFileSync(
      path.join(exported.outputPath, AGENT_SKILL_EXPORT_SIDECAR),
      'utf8',
    )) as Record<string, unknown>;
    expect(sidecar).toMatchObject({
      schemaVersion: 1,
      kind: 'aiwg-agent-skill-export',
      name: 'portable-export',
      exportDigest: exported.exportDigest,
      omittedAiwgFields: ['commandHint', 'namespace', 'platforms'],
    });
    expect(exportAgentSkillDirectory(skill, {
      outDir,
      exportedAt: '2026-07-26T16:00:00.000Z',
      aiwgVersion: 'test-version',
    }).status).toBe('unchanged');
  });

  it('protects existing output unless force is explicit', () => {
    const skill = createSource();
    const target = path.join(outDir, 'portable-export');
    fs.mkdirSync(target, { recursive: true });
    fs.writeFileSync(path.join(target, 'README.md'), 'user owned\n');

    expect(() => exportAgentSkillDirectory(skill, { outDir }))
      .toThrow(AgentSkillExportError);
    expect(fs.readFileSync(path.join(target, 'README.md'), 'utf8'))
      .toBe('user owned\n');

    const forced = exportAgentSkillDirectory(skill, {
      outDir,
      force: true,
      exportedAt: '2026-07-26T16:00:00.000Z',
      aiwgVersion: 'test-version',
    });
    expect(forced.status).toBe('updated');
    expect(fs.existsSync(path.join(target, 'README.md'))).toBe(false);
  });

  it('exports a canonical local AIWG skill through the CLI', async () => {
    const projectDir = path.join(root, 'project');
    fs.mkdirSync(projectDir);
    vi.spyOn(process, 'cwd').mockReturnValue(projectDir);
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);

    await skillsMain([
      'export',
      'aiwg-status',
      '--out',
      outDir,
      '--json',
    ]);

    const exported = path.join(outDir, 'aiwg-status');
    expect(validateAgentSkillFile(path.join(exported, 'SKILL.md'), {
      profile: 'strict',
      directoryName: 'aiwg-status',
    }).valid).toBe(true);
    expect(fs.existsSync(path.join(exported, AGENT_SKILL_EXPORT_SIDECAR))).toBe(true);
  });
});
