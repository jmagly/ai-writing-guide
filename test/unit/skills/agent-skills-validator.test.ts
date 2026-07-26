import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { AGENT_SKILLS_BASELINE } from '../../../src/skills/agent-skills.js';
import {
  scanAgentSkillPaths,
  validateAgentSkillContent,
  validateAgentSkillFile,
} from '../../../src/skills/validator.js';

const temporaryRoots: string[] = [];

function temporarySkill(name: string, content: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-validator-'));
  temporaryRoots.push(root);
  const skillRoot = path.join(root, name);
  fs.mkdirSync(skillRoot, { recursive: true });
  const file = path.join(skillRoot, 'SKILL.md');
  fs.writeFileSync(file, content);
  return file;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

describe('shared Agent Skills validator', () => {
  it('validates in-memory content without inventing a parent-directory mismatch', () => {
    const result = validateAgentSkillContent(
      '---\nname: memory-skill\ndescription: Use when validating in-memory content.\n---\nBody\n',
      { profile: 'strict' },
    );

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('accepts normative fields and exact name-directory boundaries', () => {
    const name = 'a'.repeat(64);
    const description = 'd'.repeat(1024);
    const result = validateAgentSkillContent(
      `---\nname: ${name}\ndescription: ${description}\ncompatibility: x\nmetadata: {owner: "aiwg"}\n---\n\n# Valid\n`,
      { profile: 'strict', directoryName: name },
    );

    expect(result.valid).toBe(true);
    expect(result.diagnostics).toEqual([]);
  });

  it('enforces standard length, directory, and string metadata rules', () => {
    const result = validateAgentSkillContent(
      `---\nname: Wrong_Name\ndescription: ${'d'.repeat(1025)}\nmetadata: {retries: 3}\n---\n\nBody\n`,
      { profile: 'compatible', directoryName: 'right-name' },
    );

    expect(result.valid).toBe(false);
    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      'AS_DESCRIPTION_LENGTH',
      'AS_METADATA_VALUE_TYPE',
      'AS_NAME_DIRECTORY',
      'AS_NAME_FORMAT',
    ]));
  });

  it('separates strict, compatible, and discovery field policy', () => {
    const content = [
      '---',
      'name: Demo_Name',
      'description: Use when testing conformance profiles.',
      'namespace: aiwg',
      'platforms: [all]',
      'external-policy: retained-only-as-evidence',
      '---',
      '',
      '# Demo',
    ].join('\n');
    const strict = validateAgentSkillContent(content, {
      profile: 'strict',
      directoryName: 'demo-name',
    });
    const compatible = validateAgentSkillContent(content, {
      profile: 'compatible',
      directoryName: 'demo-name',
    });
    const discovery = validateAgentSkillContent(content, {
      profile: 'discovery',
      directoryName: 'demo-name',
    });

    expect(strict.diagnostics.filter((item) => item.code === 'AS_FIELD_EXTENSION'))
      .toHaveLength(2);
    expect(compatible.valid).toBe(false);
    expect(compatible.diagnostics.find((item) => item.code === 'AS_FIELD_UNKNOWN')?.severity)
      .toBe('error');
    expect(discovery.valid).toBe(true);
    expect(discovery.state).toBe('warning');
    expect(discovery.diagnostics.every((item) => item.severity === 'warning')).toBe(true);
  });

  it('marks unparseable or description-less discovery candidates as skipped', () => {
    const invalidYaml = validateAgentSkillContent(
      '---\nname: demo\nmetadata: [one] [two]\n---\nBody\n',
      { profile: 'discovery', directoryName: 'demo' },
    );
    const missingDescription = validateAgentSkillContent(
      '---\nname: demo\n---\nBody\n',
      { profile: 'discovery', directoryName: 'demo' },
    );

    expect(invalidYaml.state).toBe('skipped');
    expect(invalidYaml.discoverable).toBe(false);
    expect(missingDescription.state).toBe('skipped');
  });

  it('reports experimental allowed-tools shape and size advisories', () => {
    const body = `${'x'.repeat(20_100)}\n${Array.from({ length: 501 }, () => 'line').join('\n')}`;
    const result = validateAgentSkillContent(
      `---\nname: demo\ndescription: Use when checking advisory limits.\nallowed-tools: "Read  Grep"\n---\n${body}`,
      { directoryName: 'demo' },
    );

    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      'AS_ADVISORY_LINES',
      'AS_ADVISORY_TOKENS',
      'AS_ALLOWED_TOOLS_EXPERIMENTAL',
      'AS_ALLOWED_TOOLS_FORMAT',
    ]));
  });

  it('validates relative resources, depth, type, and existence', () => {
    const file = temporarySkill('resources', [
      '---',
      'name: resources',
      'description: Use when validating resource references.',
      '---',
      '',
      '[ok](references/topic.md)',
      '[deep](references/nested/topic.md)',
      '[missing](assets/missing.json)',
      '[escape](../outside.md)',
    ].join('\n'));
    const root = path.dirname(file);
    fs.mkdirSync(path.join(root, 'references', 'nested'), { recursive: true });
    fs.writeFileSync(path.join(root, 'references', 'topic.md'), 'topic');
    fs.writeFileSync(path.join(root, 'references', 'nested', 'topic.md'), 'nested');

    const result = validateAgentSkillFile(file);
    expect(result.diagnostics.map((item) => item.code)).toEqual(expect.arrayContaining([
      'AS_ADVISORY_RESOURCE_DEPTH',
      'AS_RESOURCE_MISSING',
      'AS_RESOURCE_PATH',
    ]));
  });

  it('emits deterministic recursive JSON ordering', () => {
    const z = temporarySkill(
      'z-skill',
      '---\nname: z-skill\ndescription: Use when scanning Z.\n---\nBody\n',
    );
    const root = path.dirname(path.dirname(z));
    const aRoot = path.join(root, 'a-skill');
    fs.mkdirSync(aRoot);
    fs.writeFileSync(
      path.join(aRoot, 'SKILL.md'),
      '---\nname: a-skill\ndescription: Use when scanning A.\n---\nBody\n',
    );

    const first = scanAgentSkillPaths(root);
    const second = scanAgentSkillPaths(root);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.files.map((item) => path.basename(path.dirname(item.file))))
      .toEqual(['a-skill', 'z-skill']);
  });

  it('matches the pinned upstream oracle wherever the reference parser accepts', () => {
    const fixtureRoot = path.resolve(
      'test/fixtures/agent-skills',
      `upstream-${AGENT_SKILLS_BASELINE.revision}`,
    );
    const oracle = JSON.parse(
      fs.readFileSync(path.join(fixtureRoot, 'oracle.json'), 'utf8'),
    ) as {
      revision: string;
      referenceValidatorVersion: string;
      cases: Array<{ path: string; referenceValid: boolean }>;
    };

    expect(oracle.revision).toBe(AGENT_SKILLS_BASELINE.revision);
    expect(oracle.referenceValidatorVersion)
      .toBe(AGENT_SKILLS_BASELINE.referenceValidatorVersion);
    for (const fixture of oracle.cases) {
      const result = validateAgentSkillFile(path.join(fixtureRoot, fixture.path), {
        profile: 'strict',
      });
      expect(
        result.valid,
        `${fixture.path}: ${result.diagnostics.map((item) => item.code).join(', ')}`,
      ).toBe(fixture.referenceValid);
    }
  });
});
