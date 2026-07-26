import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PROVIDER_IDS } from '../../../src/providers/provider-definitions.js';
import { deployImportedAgentSkill } from '../../../src/skills/deployer.js';
import { buildAgentSkillsDoctorSection } from '../../../src/skills/doctor.js';
import { importAgentSkill } from '../../../src/skills/importer.js';

const roots: string[] = [];

afterEach(() => {
  for (const root of roots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('Agent Skills doctor section', () => {
  it('reports invalid imported bytes, deployed drift, and provider degradation', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-skill-doctor-'));
    roots.push(root);
    const projectDir = path.join(root, 'project');
    const source = path.join(root, 'doctor-skill');
    fs.mkdirSync(projectDir);
    fs.mkdirSync(source);
    const content = [
      '---',
      'name: doctor-skill',
      'description: Use when validating Agent Skills doctor diagnostics.',
      '---',
      '',
      '# Doctor Skill',
    ].join('\n');
    fs.writeFileSync(path.join(source, 'SKILL.md'), content);
    await importAgentSkill(
      { kind: 'directory', path: source },
      {
        projectDir,
        profile: 'strict',
        trust: true,
        activate: true,
        importedAt: '2026-07-26T12:00:00.000Z',
      },
    );
    const deployed = path.join(
      projectDir,
      '.claude',
      'skills',
      'doctor-skill',
      'SKILL.md',
    );
    fs.mkdirSync(path.dirname(deployed), { recursive: true });
    fs.writeFileSync(deployed, `${content}\nDrift.\n`);

    const section = buildAgentSkillsDoctorSection(projectDir);
    expect(section.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      'AS_DOCTOR_DEPLOYED_DRIFT',
      'AS_DOCTOR_PROVIDER_DEGRADED',
    ]));
    expect(section.hasFailures).toBe(true);

    const managed = path.join(
      projectDir,
      '.aiwg',
      'skills',
      'imported',
      'doctor-skill',
      'source',
      'SKILL.md',
    );
    fs.writeFileSync(managed, 'not a skill');
    const drifted = buildAgentSkillsDoctorSection(projectDir);
    expect(drifted.diagnostics.map((item) => item.code)).toContain(
      'AS_IMPORT_MANAGED_DRIFT',
    );
  });

  it('accepts regenerated strict projections for every provider', async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-skill-doctor-'));
    roots.push(root);
    const projectDir = path.join(root, 'project');
    const homeDir = path.join(root, 'home');
    const source = path.join(root, 'healthy-skill');
    fs.mkdirSync(projectDir);
    fs.mkdirSync(homeDir);
    fs.mkdirSync(path.join(source, 'references'), { recursive: true });
    fs.writeFileSync(path.join(source, 'SKILL.md'), [
      '---',
      'name: healthy-skill',
      'description: Use when validating a healthy provider projection.',
      'namespace: fixture',
      'platforms: [all]',
      '---',
      '',
      '# Healthy Skill',
      '',
      'Read [the guide](references/guide.md).',
    ].join('\n'));
    fs.writeFileSync(path.join(source, 'references', 'guide.md'), '# Guide\n');
    await importAgentSkill(
      { kind: 'directory', path: source },
      {
        projectDir,
        profile: 'compatible',
        trust: true,
        activate: true,
        importedAt: '2026-07-26T12:00:00.000Z',
      },
    );
    for (const target of PROVIDER_IDS) {
      deployImportedAgentSkill('healthy-skill', {
        projectDir,
        homeDir,
        target,
      });
    }

    const section = buildAgentSkillsDoctorSection(projectDir, { homeDir });
    expect(section.hasFailures).toBe(false);
    expect(section.diagnostics).toEqual([]);
  });
});
