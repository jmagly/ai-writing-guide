import { readFileSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { globSync } from 'glob';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  AIWG_SKILL_CONTROL_FIELDS,
  STANDARD_SKILL_FIELDS,
  validateCompatibleAgentSkillMetadata,
  type AgentSkillDiagnostic,
} from '../../../src/skills/agent-skills.js';

const ROOT = resolve('.');
const CANONICAL_PATTERNS = [
  'agentic/code/addons/**/SKILL.md',
  'agentic/code/extensions/**/SKILL.md',
  'agentic/code/frameworks/**/SKILL.md',
];
const MEDIA_SKILLS = [
  'archive-acquisition',
  'audio-extraction',
  'cover-art-embedding',
  'integrity-verification',
  'metadata-tagging',
  'provenance-tracking',
  'quality-filtering',
  'transcribe-media',
  'youtube-acquisition',
];

interface ParsedSkill {
  file: string;
  frontmatter: Record<string, unknown>;
  content: string;
}

function parseSkill(file: string): ParsedSkill {
  const content = readFileSync(file, 'utf8');
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!match) {
    throw new Error(`${relative(ROOT, file)}: missing YAML frontmatter`);
  }
  const frontmatter = parse(match[1] ?? '');
  if (
    typeof frontmatter !== 'object'
    || frontmatter === null
    || Array.isArray(frontmatter)
  ) {
    throw new Error(`${relative(ROOT, file)}: frontmatter is not an object`);
  }
  return {
    file,
    frontmatter: frontmatter as Record<string, unknown>,
    content,
  };
}

function canonicalSkills(): ParsedSkill[] {
  return globSync(CANONICAL_PATTERNS, {
    absolute: true,
    nodir: true,
  }).sort().map(parseSkill);
}

function formatDiagnostics(diagnostics: readonly AgentSkillDiagnostic[]): string {
  return diagnostics.map((diagnostic) => (
    `${diagnostic.code} ${diagnostic.file} ${diagnostic.yamlPath}: `
    + diagnostic.message
  )).join('\n');
}

describe('canonical Agent Skills-compatible corpus', () => {
  it('keeps all canonical skills compatible with stable path diagnostics', () => {
    const skills = canonicalSkills();
    const diagnostics = skills.flatMap((skill) => (
      validateCompatibleAgentSkillMetadata(
        skill.frontmatter,
        basename(dirname(skill.file)),
        relative(ROOT, skill.file),
        skill.content.split(/\r?\n/).length,
      )
    ));
    const errors = diagnostics.filter((diagnostic) => (
      diagnostic.severity === 'error'
    ));
    const lineAdvisories = diagnostics.filter((diagnostic) => (
      diagnostic.code === 'AS_ADVISORY_LINES'
    ));

    expect(skills).toHaveLength(518);
    expect(errors, formatDiagnostics(errors)).toEqual([]);
    expect(lineAdvisories).toHaveLength(85);
    expect(lineAdvisories.every((diagnostic) => (
      diagnostic.file.endsWith('/SKILL.md')
    ))).toBe(true);
  });

  it('limits strict-only failures to mapped AIWG extension fields', () => {
    const standardFields = new Set<string>(STANDARD_SKILL_FIELDS);
    const aiwgFields = new Set<string>(AIWG_SKILL_CONTROL_FIELDS);
    const unexpected: string[] = [];

    for (const skill of canonicalSkills()) {
      for (const key of Object.keys(skill.frontmatter)) {
        if (!standardFields.has(key) && !aiwgFields.has(key)) {
          unexpected.push(`${relative(ROOT, skill.file)}: $.${key}`);
        }
      }
    }

    expect(unexpected).toEqual([]);
  });

  it('retains the al and agent-loop aliases after normalizing ralph', () => {
    const ralph = parseSkill(resolve(
      'agentic/code/addons/agent-loop/skills/ralph/SKILL.md',
    )).frontmatter;

    expect(ralph['name']).toBe('ralph');
    expect(ralph['aliases']).toEqual(['al', 'agent-loop']);
    expect(ralph['deprecated_names']).toEqual(['al']);
  });

  it('keeps generated media-curator mirrors byte-identical to canonical skills', () => {
    for (const name of MEDIA_SKILLS) {
      const canonical = readFileSync(resolve(
        `agentic/code/frameworks/media-curator/skills/${name}/SKILL.md`,
      ));
      const mirror = readFileSync(resolve(
        `agentic/code/plugins/media-curator/skills/${name}/SKILL.md`,
      ));
      expect(mirror, name).toEqual(canonical);
    }
  });

  it('reports stable diagnostic codes and affected paths', () => {
    const diagnostics = validateCompatibleAgentSkillMetadata(
      {
        name: 'Wrong Name',
        description: 'fixture',
        metadata: {
          nested: {
            value: true,
          },
        },
        unexpected: true,
      },
      'expected-name',
      'fixtures/expected-name/SKILL.md',
      501,
    );

    expect(diagnostics.map(({ code, file, yamlPath, severity }) => ({
      code,
      file,
      yamlPath,
      severity,
    }))).toEqual([
      {
        code: 'AS_ADVISORY_LINES',
        file: 'fixtures/expected-name/SKILL.md',
        yamlPath: '$',
        severity: 'warning',
      },
      {
        code: 'AS_FIELD_UNKNOWN',
        file: 'fixtures/expected-name/SKILL.md',
        yamlPath: '$.unexpected',
        severity: 'error',
      },
      {
        code: 'AS_METADATA_VALUE_TYPE',
        file: 'fixtures/expected-name/SKILL.md',
        yamlPath: '$.metadata.nested',
        severity: 'error',
      },
      {
        code: 'AS_NAME_DIRECTORY',
        file: 'fixtures/expected-name/SKILL.md',
        yamlPath: '$.name',
        severity: 'error',
      },
      {
        code: 'AS_NAME_FORMAT',
        file: 'fixtures/expected-name/SKILL.md',
        yamlPath: '$.name',
        severity: 'error',
      },
    ]);
  });
});
