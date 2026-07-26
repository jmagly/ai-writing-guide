import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';
import {
  AGENT_SKILL_COLLISION_PRECEDENCE,
  AGENT_SKILL_PROJECTION_STATUSES,
  AGENT_SKILL_VALIDATION_PROFILES,
  AGENT_SKILLS_BASELINE,
  AGENT_SKILLS_SIDECAR_SCHEMA,
  AIWG_SKILL_CONTROL_FIELDS,
  STANDARD_SKILL_FIELDS,
  createAgentSkillSidecar,
  equivalentPortableAllowedTools,
  projectStrictAgentSkill,
  resolveAgentSkillCollision,
  restoreAgentSkillFromSidecar,
  type AgentSkillDocument,
  type AgentSkillProvenance,
} from '../../../src/skills/agent-skills.js';

const document: AgentSkillDocument = {
  standard: {
    name: 'portable-skill',
    description: 'A fully portable fixture.',
    license: 'LICENSE.txt',
    compatibility: 'Requires a POSIX-compatible shell.',
    metadata: {
      author: 'AIWG',
      version: '1',
    },
    'allowed-tools': 'Read Grep',
  },
  body: '# Portable skill\n\nSee [the reference](references/guide.md).\n',
  resources: [
    {
      path: 'references/guide.md',
      digest: '1'.repeat(64),
      size: 42,
    },
  ],
  aiwg: {
    namespace: 'aiwg',
    platforms: ['all'],
    triggers: ['use the portable fixture'],
    commandHint: {
      allowedTools: 'Read, Grep, Bash',
      orchestration: true,
    },
    requires: ['fixture'],
    userInvocable: true,
  },
  unknownFields: [
    {
      key: 'external-policy',
      value: {
        trustMe: true,
      },
    },
  ],
};

const provenance: AgentSkillProvenance = {
  sourceKind: 'git',
  locator: 'https://example.invalid/skills.git#skills/portable-skill',
  requestedRevision: 'v1.0.0',
  resolvedRevision: 'a'.repeat(40),
  sourceDigest: 'b'.repeat(64),
  importedAt: '2026-07-26T12:00:00.000Z',
  aiwgVersion: '2026.7.20',
};

describe('Agent Skills portability contract', () => {
  it('pins the reviewed upstream baseline', () => {
    expect(AGENT_SKILLS_BASELINE).toEqual({
      repository: 'agentskills/agentskills',
      revision: '38a2ff82958afee88dadf4831509e6f7e9d8ef4e',
      referenceValidatorVersion: '0.1.0',
      pinnedAt: '2026-07-25',
    });
  });

  it('defines deterministic strict, compatible, and discovery profiles', () => {
    expect(AGENT_SKILL_VALIDATION_PROFILES).toEqual({
      strict: {
        recognizedAiwgFields: false,
        unknownField: 'error',
        cosmeticNameDefect: 'error',
        missingDescription: 'error',
        invalidYaml: 'error',
      },
      compatible: {
        recognizedAiwgFields: true,
        unknownField: 'error',
        cosmeticNameDefect: 'error',
        missingDescription: 'error',
        invalidYaml: 'error',
      },
      discovery: {
        recognizedAiwgFields: true,
        unknownField: 'warning',
        cosmeticNameDefect: 'warning',
        missingDescription: 'error',
        invalidYaml: 'error',
      },
    });
  });

  it('strictly projects all standard fields and no AIWG-only fields', () => {
    const projection = projectStrictAgentSkill(document);

    expect(Object.keys(projection)).toEqual(STANDARD_SKILL_FIELDS);
    expect(projection).toEqual(document.standard);
    expect(projection).not.toHaveProperty('namespace');
    expect(projection).not.toHaveProperty('platforms');
    expect(projection).not.toHaveProperty('commandHint');
    expect(projection).not.toHaveProperty('external-policy');
  });

  it('recovers omitted AIWG metadata through the sidecar', () => {
    const sidecar = createAgentSkillSidecar(
      document,
      provenance,
      'compatible',
      {
        state: 'untrusted',
        activation: 'inactive',
      },
    );
    const restored = restoreAgentSkillFromSidecar(
      projectStrictAgentSkill(document),
      document.body,
      document.resources,
      sidecar,
    );

    expect(sidecar.$schema).toBe(AGENT_SKILLS_SIDECAR_SCHEMA);
    expect(sidecar.provenance).toEqual(provenance);
    expect(sidecar.trust).toEqual({
      state: 'untrusted',
      activation: 'inactive',
    });
    expect(restored.standard).toEqual(document.standard);
    expect(restored.body).toBe(document.body);
    expect(restored.resources).toEqual(document.resources);
    expect(restored.aiwg).toEqual(document.aiwg);
    expect(restored.unknownFields).toEqual([]);
  });

  it('translates only semantically equivalent direct allowed-tools policy', () => {
    expect(equivalentPortableAllowedTools({
      allowedTools: ['Read', 'Grep'],
      commandHint: {
        allowedTools: 'Bash, Write',
      },
    })).toBe('Read Grep');
    expect(equivalentPortableAllowedTools({
      commandHint: {
        allowedTools: 'Bash, Write',
      },
    })).toBeUndefined();
    expect(equivalentPortableAllowedTools({
      allowedTools: ['Read', 'not a tool'],
    })).toBeUndefined();

    const withoutPortableTools: AgentSkillDocument = {
      ...document,
      standard: {
        name: document.standard.name,
        description: document.standard.description,
      },
      aiwg: {
        allowedTools: ['Read', 'Grep'],
        commandHint: {
          allowedTools: 'Bash, Write',
        },
      },
    };
    expect(projectStrictAgentSkill(withoutPortableTools)['allowed-tools'])
      .toBe('Read Grep');
  });

  it('applies deterministic collision precedence', () => {
    expect(AGENT_SKILL_COLLISION_PRECEDENCE).toEqual({
      project: 400,
      user: 300,
      imported: 200,
      'aiwg-managed': 100,
    });
    expect(resolveAgentSkillCollision([
      'aiwg-managed',
      'imported',
      'user',
      'project',
    ])).toBe('project');
    expect(resolveAgentSkillCollision([
      'aiwg-managed',
      'imported',
    ])).toBe('imported');
    expect(resolveAgentSkillCollision([])).toBeUndefined();
  });

  it('requires every provider limitation to use an explicit result status', () => {
    expect(AGENT_SKILL_PROJECTION_STATUSES).toEqual([
      'native',
      'projected',
      'degraded',
      'unsupported',
    ]);
  });

  it('keeps the JSON Schema aligned with every retained AIWG field', () => {
    const schema = JSON.parse(readFileSync(
      resolve('schemas/skills/agent-skill-sidecar.v1.schema.json'),
      'utf8',
    )) as {
      $id: string;
      $defs: {
        aiwgMetadata: {
          properties: Record<string, unknown>;
        };
      };
    };

    expect(schema.$id).toBe(AGENT_SKILLS_SIDECAR_SCHEMA);
    expect(Object.keys(schema.$defs.aiwgMetadata.properties).sort()).toEqual(
      [...AIWG_SKILL_CONTROL_FIELDS].sort(),
    );

    const ajv = new Ajv2020({ strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    const sidecar = createAgentSkillSidecar(
      document,
      provenance,
      'compatible',
      {
        state: 'untrusted',
        activation: 'inactive',
      },
    );
    expect(validate(sidecar), JSON.stringify(validate.errors)).toBe(true);
    expect(validate({
      ...sidecar,
      provenance: {
        ...sidecar.provenance,
        sourceDigest: 'not-a-sha256',
      },
    })).toBe(false);
  });
});
