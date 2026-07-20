import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import { describe, expect, it } from 'vitest';

const ADDON_ROOT = resolve('agentic/code/addons/twelve-factor');

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(resolve(ADDON_ROOT, path), 'utf8')) as T;
}

function read(path: string): string {
  return readFileSync(resolve(ADDON_ROOT, path), 'utf8');
}

describe('twelve-factor addon', () => {
  it('registers required design and audit artifacts in the manifest', () => {
    const manifest = readJson<{
      id: string;
      type: string;
      skills: string[];
      agents: string[];
      rules: string[];
      prompts: string[];
      checklists: string[];
      templates: string[];
      schemas: string[];
      fixtures: string[];
    }>('manifest.json');

    expect(manifest.id).toBe('twelve-factor');
    expect(manifest.type).toBe('addon');
    expect(manifest.skills).toEqual(
      expect.arrayContaining(['twelve-factor-design', 'twelve-factor-audit']),
    );
    expect(manifest.agents).toContain('twelve-factor-reviewer');
    expect(manifest.rules).toContain('twelve-factor-evidence');
    expect(manifest.prompts).toEqual(expect.arrayContaining(['architecture-review', 'audit-evidence']));
    expect(manifest.checklists).toEqual(expect.arrayContaining(['design-checklist', 'audit-checklist']));
    expect(manifest.templates).toEqual(expect.arrayContaining(['audit-report', 'remediation-backlog']));
    expect(manifest.schemas).toContain('audit-report.schema');
    expect(manifest.fixtures).toContain('sample-audit-report');
  });

  it('exposes one design workflow and one audit workflow with discoverable trigger language', () => {
    const designSkill = read('skills/twelve-factor-design/SKILL.md');
    const auditSkill = read('skills/twelve-factor-audit/SKILL.md');

    expect(designSkill).toContain('name: twelve-factor-design');
    expect(designSkill).toContain('12 factor design review');
    expect(designSkill).toContain('## Behavior');

    expect(auditSkill).toContain('name: twelve-factor-audit');
    expect(auditSkill).toContain('12 factor audit evidence');
    expect(auditSkill).toContain('schemas/audit-report.schema.json');
  });

  it('assigns the reviewer a provider-neutral standard-context policy', () => {
    const reviewer = read('agents/twelve-factor-reviewer.md');
    expect(reviewer).toContain('model: sonnet');
    expect(reviewer).toContain('model-role: coding');
    expect(reviewer).toContain('model-tier: standard');
    expect(reviewer).not.toContain('model: claude-sonnet-4-6');
  });

  it('validates the sample audit artifact against the audit schema', () => {
    const schema = readJson<{
      $defs: { status: { enum: string[] } };
    }>('schemas/audit-report.schema.json');
    const fixture = readJson<{
      overallStatus: string;
      factors: Array<{ status: string; evidence: unknown[] }>;
    }>('fixtures/sample-audit-report.json');
    const ajv = new Ajv2020({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    expect(validate(fixture), JSON.stringify(validate.errors, null, 2)).toBe(true);
    expect(schema.$defs.status.enum).toEqual(['pass', 'partial', 'fail', 'not_applicable']);
    expect(schema.$defs.status.enum).toContain(fixture.overallStatus);
    expect(fixture.factors.length).toBeGreaterThanOrEqual(2);
    for (const factor of fixture.factors) {
      expect(schema.$defs.status.enum).toContain(factor.status);
      expect(factor.evidence.length).toBeGreaterThanOrEqual(1);
    }
  });
});
