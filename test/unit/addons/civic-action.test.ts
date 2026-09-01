import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import yaml from 'js-yaml';
import { describe, expect, it } from 'vitest';
import civicAction from '../../../agentic/code/addons/civic-action/commands/civic-action.mjs';
import {
  evaluateMeeting,
  evaluatePublication,
  evaluateSourceRegistry,
} from '../../../agentic/code/addons/civic-action/lib/gate-engine.mjs';

const ROOT = resolve('agentic/code/addons/civic-action');
const read = (path: string) => readFileSync(resolve(ROOT, path), 'utf8');
const json = (path: string) => JSON.parse(read(path));

function files(dir: string): string[] {
  return readdirSync(resolve(ROOT, dir)).flatMap((name) => {
    const relative = `${dir}/${name}`;
    return statSync(resolve(ROOT, relative)).isDirectory() ? files(relative) : [relative];
  });
}

describe('civic-action addon', () => {
  it('declares every shipped operational asset without placeholders', () => {
    const manifest = json('manifest.json');
    expect(manifest.id).toBe('civic-action');
    expect(manifest.type).toBe('addon');
    expect(manifest.core).toBe(false);
    expect(manifest.autoInstall).toBe(false);

    for (const name of manifest.agents) expect(files('agents')).toContain(`agents/${name}.md`);
    for (const name of manifest.skills) expect(files('skills')).toContain(`skills/${name}/SKILL.md`);
    for (const name of manifest.rules) expect(files('rules')).toContain(`rules/${name}.md`);
    for (const name of manifest.schemas) expect(files('schemas')).toContain(`schemas/${name}.schema.json`);
    for (const name of manifest.flows) expect(files('flows')).toContain(`flows/${name}.yaml`);
    for (const name of manifest.templates) {
      expect(files('templates').some((file) => file === `templates/${name}.md` || file === `templates/${name}.yaml`)).toBe(true);
    }

    for (const file of [...files('agents'), ...files('skills')]) {
      const content = read(file);
      expect(content).not.toMatch(/\[(?:trigger phrase|Core domain|Description|param\d|related-skill)/i);
      expect(content).not.toContain('(none yet)');
    }
    const rulesIndex = read('rules/RULES-INDEX.md');
    for (const name of manifest.rules) expect(rulesIndex).toContain(`${name}.md`);
  });

  it('compiles every civic schema and validates each positive fixture', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const schemas = files('schemas').filter((file) => file.endsWith('.schema.json')).map(json);
    for (const schema of schemas) ajv.addSchema(schema);
    const fixtures: Record<string, string> = {
      'source-registry': 'source-registry',
      'vote-ledger': 'vote-ledger',
      'meeting-reconciliation': 'meeting-reconciliation',
      'public-records-plan': 'public-records-plan',
      'public-technology-review': 'public-technology-review',
      'local-resource-index': 'local-resource-index',
      'correction-record': 'correction-record',
      'publication-packet': 'publication-packet',
      'compliance-gate-result': 'compliance-gate-result',
      'publication-gate-result': 'publication-gate-result',
    };
    for (const [schemaName, fixtureName] of Object.entries(fixtures)) {
      const schema = schemas.find((item) => item.$id.includes(`/${schemaName}.schema.json`));
      const validate = ajv.getSchema(schema.$id)!;
      const value = json(`examples/valid/${fixtureName}.json`);
      expect(validate(value), `${schemaName}: ${JSON.stringify(validate.errors)}`).toBe(true);
      const missingRequired = structuredClone(value);
      delete missingRequired.schema;
      expect(validate(missingRequired), `${schemaName} accepted a missing schema discriminator`).toBe(false);
      const unknownField = { ...value, unreviewed_extension: true };
      expect(validate(unknownField), `${schemaName} accepted an unknown top-level field`).toBe(false);
    }
  });

  it('validates FlowPlaybooks and proves consequential paths contain human gates', () => {
    const schema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json'), 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    for (const file of files('flows').filter((item) => item.endsWith('.yaml'))) {
      const flow: any = yaml.load(read(file));
      expect(validate(flow), `${file}: ${JSON.stringify(validate.errors)}`).toBe(true);
      const ids = new Set(flow.spec.steps.map((step: any) => step.id));
      for (const step of flow.spec.steps) for (const dependency of step.depends_on ?? []) expect(ids.has(dependency)).toBe(true);
      const gates = flow.spec.steps.filter((step: any) => step.kind === 'gate');
      expect(gates.length).toBeGreaterThan(0);
      expect(gates.every((gate: any) => /human/i.test(gate.description))).toBe(true);
    }
  });

  it('fails closed on source access bypass and allows the reviewed fixture', () => {
    const unsafe = evaluateSourceRegistry(json('examples/invalid/source-control-bypass.json'));
    expect(unsafe.status).toBe('block');
    expect(unsafe.findings.map((item) => item.code)).toContain('ACCESS_CONTROL_BYPASS');
    expect(evaluateSourceRegistry(json('examples/valid/source-registry.json')).status).toBe('pass');
  });

  it('blocks inferred/conflicted votes and accepts human-verified reconciliation', () => {
    const ledger = json('examples/valid/vote-ledger.json');
    const reconciliation = json('examples/valid/meeting-reconciliation.json');
    expect(evaluateMeeting(ledger, reconciliation).status).toBe('pass');
    ledger.motions[0].vote_entries[0].source_cue_id = null;
    ledger.motions[0].verification_state = 'conflict';
    const blocked = evaluateMeeting(ledger, reconciliation);
    expect(blocked.status).toBe('block');
    expect(blocked.findings.map((item) => item.code)).toEqual(expect.arrayContaining(['VOTE_CONFLICT', 'VOTE_INFERRED_WITHOUT_SOURCE']));
  });

  it('blocks uncited allegations, incomplete privacy/accessibility, and missing exact-hash approval', () => {
    const blocked = evaluatePublication(json('examples/invalid/publication-uncited.json'));
    expect(blocked.status).toBe('block');
    expect(blocked.findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'MATERIAL_CLAIM_UNCITED',
      'SECTION_EMPTY',
      'MATERIAL_LINK_BROKEN',
      'MATERIAL_SOURCE_EXPIRED',
      'ALLEGATION_UNATTRIBUTED',
      'PRIVACY_REVIEW_INCOMPLETE',
      'ACCESSIBILITY_MANUAL_REVIEW_REQUIRED',
      'HUMAN_PUBLICATION_APPROVAL_MISSING',
      'CORRECTION_UNRESOLVED',
      'CORRECTION_REINDEX_PENDING',
      'LAST_GOOD_COPY_MISSING',
      'DEPLOYMENT_VERIFICATION_PENDING',
    ]));
    expect(evaluatePublication(json('examples/valid/publication-packet.json')).status).toBe('pass');
  });

  it('schema-locks consequential civic actions to review-only outputs', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    for (const schema of files('schemas').filter((file) => file.endsWith('.schema.json')).map(json)) ajv.addSchema(schema);

    const records = json('examples/valid/public-records-plan.json');
    records.automatic_submission = true;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-records-plan.schema.json')!(records)).toBe(false);

    const procurement = json('examples/valid/public-technology-review.json');
    procurement.award_recommendation = 'award to Vendor A';
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-technology-review.schema.json')!(procurement)).toBe(false);

    const resource = json('examples/valid/local-resource-index.json');
    resource.vertical = 'personal-profile';
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/local-resource-index.schema.json')!(resource)).toBe(false);
  });

  it('exposes stable JSON CLI results and usage exit codes', async () => {
    const ok = await civicAction(['examples/valid/source-registry.json'], { cwd: ROOT, subcommand: 'source-gate' });
    expect(ok.exitCode).toBe(0);
    expect(JSON.parse(ok.message).status).toBe('pass');
    const blocked = await civicAction(['examples/invalid/publication-uncited.json'], { cwd: ROOT, subcommand: 'publish-gate' });
    expect(blocked.exitCode).toBe(1);
    expect(JSON.parse(blocked.message).status).toBe('block');
    expect((await civicAction([], { cwd: ROOT, subcommand: 'source-gate' })).exitCode).toBe(2);
  });

  it('contains cited, dated research and explicit scope limits', () => {
    for (const file of ['aiwg-design-patterns.md', 'civic-workflow-standards.md', 'legal-ethics-guardrails.md']) {
      const content = read(`docs/research/${file}`);
      expect(content).toContain('2026-09-01');
    }
    expect((read('docs/research/aiwg-design-patterns.md').match(/agentic\/code|tools\/|test\/|src\//g) ?? []).length).toBeGreaterThan(20);
    for (const file of ['civic-workflow-standards.md', 'legal-ethics-guardrails.md']) {
      expect((read(`docs/research/${file}`).match(/https:\/\//g) ?? []).length).toBeGreaterThan(5);
    }
    expect(read('docs/research/synthesis-and-readiness.md')).toContain('proceed with an opt-in addon');
  });
});
