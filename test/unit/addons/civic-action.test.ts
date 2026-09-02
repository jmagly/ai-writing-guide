import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
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
    expect(read('skills/civic-newsroom-plan/SKILL.md')).toContain('flows/civic-newsroom.yaml');
    expect(read('skills/civic-newsroom-plan/SKILL.md')).not.toContain('civic-newsroom.playbook.yaml');
  });

  it('keeps civic user guidance prompt-first, synchronized, and linked to CLI reference', () => {
    for (const canonical of files('docs').filter((file) => file.endsWith('.md'))) {
      const relative = canonical.slice('docs/'.length);
      const published = readFileSync(resolve('docs/addons/civic-action', relative), 'utf8');
      expect(published, `${relative} drifted from the canonical addon document`).toBe(read(canonical));
    }

    const userGuides = [
      read('README.md'),
      read('docs/overview.md'),
      read('docs/quickstart.md'),
      readFileSync(resolve('docs/addons/civic-action/overview.md'), 'utf8'),
      readFileSync(resolve('docs/addons/civic-action/quickstart.md'), 'utf8'),
    ];
    for (const guide of userGuides) {
      expect(guide).toContain('```text');
      expect(guide).toContain('AIWG steward');
      expect(guide).not.toMatch(/^\s*(?:npx\s+)?aiwg\s+/mu);
    }

    const quickstart = read('docs/quickstart.md');
    for (const heading of [
      'Ask the steward to set up Civic Action',
      'Review a public source',
      'Plan a public-records request',
      'Reconcile a public meeting',
      'Review public technology',
      'Index local public resources',
      'Prepare a correction',
      'Review a publication packet',
    ]) expect(quickstart).toContain(heading);
    expect(quickstart).toContain('cli--reference.html#civic-action');

    const cliReference = readFileSync(resolve('docs/cli/reference.md'), 'utf8');
    expect(cliReference).toContain('### civic-action');
    expect(cliReference).toContain('aiwg use civic-action');
    expect(cliReference).toContain('aiwg civic source-gate');
    expect(cliReference).toContain('aiwg civic meeting-gate');
    expect(cliReference).toContain('aiwg civic publish-gate');
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
    const playbookSchema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json'), 'utf8'));
    const capabilitySchema = JSON.parse(readFileSync(resolve('agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json'), 'utf8'));
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const validatePlaybook = ajv.compile(playbookSchema);
    const validateCapability = ajv.compile(capabilitySchema);
    const manifest = json('manifest.json');
    const capabilityFiles = files('flows/capabilities').filter((item) => item.endsWith('.yaml'));
    const capabilityNames = new Set(capabilityFiles.map((file) => {
      const capability: any = yaml.load(read(file));
      expect(validateCapability(capability), `${file}: ${JSON.stringify(validateCapability.errors)}`).toBe(true);
      expect(capability.metadata.annotations.research).toBe('docs/research/control-source-matrix.md');
      return capability.metadata.name;
    }));

    for (const file of files('flows').filter((item) => item.endsWith('.yaml') && !item.includes('/capabilities/'))) {
      const flow: any = yaml.load(read(file));
      expect(validatePlaybook(flow), `${file}: ${JSON.stringify(validatePlaybook.errors)}`).toBe(true);
      const ids = new Set(flow.spec.steps.map((step: any) => step.id));
      for (const step of flow.spec.steps) for (const dependency of step.depends_on ?? []) expect(ids.has(dependency)).toBe(true);
      for (const step of flow.spec.steps) {
        if (step.capability) expect(capabilityNames.has(step.capability), `${file} has unresolved capability ${step.capability}`).toBe(true);
        for (const agent of step.fanout?.agents ?? []) expect(manifest.agents).toContain(agent);
        if (step.fanout?.synthesize) expect(manifest.agents).toContain(step.fanout.synthesize);
      }
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
    const alternate = json('examples/valid/source-registry.json');
    alternate.acquisition.decision = 'public_record_alternative';
    alternate.empty_result.observed_records = 0;
    alternate.retrievals = [];
    alternate.fallback.last_good_copy_hash = null;
    const deferred = evaluateSourceRegistry(alternate);
    expect(deferred.status).toBe('block');
    expect(deferred.findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'PUBLIC_RECORD_ALTERNATIVE_REQUIRED',
      'EMPTY_RESULT_THRESHOLD',
      'SOURCE_LAST_GOOD_COPY_MISSING',
    ]));

    for (const decision of ['block', 'pending', 'manual_only']) {
      const denied = json('examples/valid/source-registry.json');
      denied.review.decision = decision;
      expect(evaluateSourceRegistry(denied).findings.map((item) => item.code)).toContain('SOURCE_REVIEW_DECISION_NOT_ALLOW');
    }

    const expiredDeclaration = json('examples/valid/source-registry.json');
    expiredDeclaration.freshness.deadline = '2026-08-31T00:00:00Z';
    expect(evaluateSourceRegistry(expiredDeclaration, { now: new Date('2026-09-01T00:00:00Z') }).findings.map((item) => item.code)).toContain('SOURCE_FRESHNESS_DEADLINE_PASSED');

    const unresolvedJurisdiction = json('examples/valid/source-registry.json');
    unresolvedJurisdiction.jurisdiction = 'unresolved';
    expect(evaluateSourceRegistry(unresolvedJurisdiction).findings.map((item) => item.code)).toContain('JURISDICTION_UNRESOLVED');

    const overdueReview = json('examples/valid/source-registry.json');
    overdueReview.freshness.next_review_at = '2026-08-31T00:00:00Z';
    expect(evaluateSourceRegistry(overdueReview, { now: new Date('2026-09-01T00:00:00Z') }).findings.map((item) => item.code)).toContain('SOURCE_REVIEW_DUE');

    const expiredException = json('examples/valid/source-registry.json');
    expiredException.review.exception_id = 'exception-1';
    expiredException.review.exception_expires_at = '2026-08-31T00:00:00Z';
    expect(evaluateSourceRegistry(expiredException, { now: new Date('2026-09-01T00:00:00Z') }).findings.map((item) => item.code)).toContain('SOURCE_EXCEPTION_EXPIRED');
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

    const undated = json('examples/valid/meeting-reconciliation.json');
    undated.human_review.reviewed_at = null;
    expect(evaluateMeeting(json('examples/valid/vote-ledger.json'), undated).findings.map((item) => item.code)).toContain('MEETING_REVIEW_PENDING');

    const emptyLedger = json('examples/valid/vote-ledger.json');
    const emptyReconciliation = json('examples/valid/meeting-reconciliation.json');
    emptyLedger.motions = [];
    emptyReconciliation.comparisons = [];
    expect(evaluateMeeting(emptyLedger, emptyReconciliation).findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'MOTION_INVENTORY_EMPTY',
      'RECONCILIATION_INVENTORY_EMPTY',
    ]));

    const absentPending = json('examples/valid/meeting-reconciliation.json');
    absentPending.comparisons[0].relation = 'absent_from_source';
    absentPending.comparisons[0].materiality = 'material';
    absentPending.comparisons[0].decision = 'pending';
    expect(evaluateMeeting(json('examples/valid/vote-ledger.json'), absentPending).findings.map((item) => item.code)).toContain('RECONCILIATION_PENDING');
  });

  it('blocks uncited allegations, incomplete privacy/accessibility, and missing exact-hash approval', () => {
    const blocked = evaluatePublication(json('examples/invalid/publication-uncited.json'));
    expect(blocked.status).toBe('block');
    expect(blocked.findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'MATERIAL_CLAIM_UNCITED',
      'SECTION_EMPTY',
      'SECTION_MINIMUM_COUNT_UNMET',
      'SECTION_SOURCE_EXPIRED',
      'MATERIAL_LINK_BROKEN',
      'MATERIAL_SOURCE_EXPIRED',
      'ALLEGATION_UNATTRIBUTED',
      'PRIVACY_REVIEW_INCOMPLETE',
      'ACCESSIBILITY_MANUAL_REVIEW_REQUIRED',
      'STRUCTURED_DATA_INVALID',
      'HUMAN_PUBLICATION_APPROVAL_MISSING',
      'CORRECTION_UNRESOLVED',
      'CORRECTION_REINDEX_PENDING',
      'LAST_GOOD_COPY_MISSING',
      'DEPLOYMENT_VERIFICATION_PENDING',
      'LIVE_PAGE_VERIFICATION_PENDING',
      'DEPLOYMENT_SITEMAP_STATE_PENDING',
      'DEPLOYMENT_REINDEX_STATE_PENDING',
      'DEPLOYMENT_CACHE_STATE_PENDING',
    ]));
    expect(evaluatePublication(json('examples/valid/publication-packet.json')).status).toBe('pass');

    const anonymousReviews = json('examples/valid/publication-packet.json');
    anonymousReviews.privacy.reviewer = null;
    anonymousReviews.accessibility.reviewer = null;
    expect(evaluatePublication(anonymousReviews).findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'PRIVACY_REVIEW_INCOMPLETE',
      'ACCESSIBILITY_MANUAL_REVIEW_REQUIRED',
    ]));

    const superseded = json('examples/valid/publication-packet.json');
    superseded.publication_state = 'superseded';
    expect(evaluatePublication(superseded).findings.map((item) => item.code)).toContain('PUBLICATION_STATE_BLOCKED');

    const emptyEvidence = json('examples/valid/publication-packet.json');
    emptyEvidence.claims = [];
    emptyEvidence.upstream_gates = [];
    expect(evaluatePublication(emptyEvidence).findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'CLAIM_INVENTORY_EMPTY',
      'UPSTREAM_GATE_INVENTORY_EMPTY',
    ]));

    const contradictoryValidation = json('examples/valid/publication-packet.json');
    contradictoryValidation.structured_data.status = 'pass';
    contradictoryValidation.structured_data.errors = ['validator failed'];
    expect(evaluatePublication(contradictoryValidation).findings.map((item) => item.code)).toContain('STRUCTURED_DATA_INVALID');

    const selfReviewed = json('examples/valid/publication-packet.json');
    selfReviewed.human_review.reviewer = selfReviewed.prepared_by;
    expect(evaluatePublication(selfReviewed).findings.map((item) => item.code)).toContain('HUMAN_PUBLICATION_APPROVAL_MISSING');
  });

  it('schema-locks consequential civic actions to review-only outputs', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    for (const schema of files('schemas').filter((file) => file.endsWith('.schema.json')).map(json)) ajv.addSchema(schema);

    const records = json('examples/valid/public-records-plan.json');
    records.automatic_submission = true;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-records-plan.schema.json')!(records)).toBe(false);

    const incompleteRecords = json('examples/valid/public-records-plan.json');
    delete incompleteRecords.tracking.appeal_deadline;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-records-plan.schema.json')!(incompleteRecords)).toBe(false);

    const unprovedSubmission = json('examples/valid/public-records-plan.json');
    unprovedSubmission.status = 'submitted';
    unprovedSubmission.human_review.state = 'approved';
    unprovedSubmission.human_review.reviewer = 'records-reviewer';
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-records-plan.schema.json')!(unprovedSubmission)).toBe(false);

    const procurement = json('examples/valid/public-technology-review.json');
    procurement.award_recommendation = 'award to Vendor A';
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-technology-review.schema.json')!(procurement)).toBe(false);

    const incompleteProcurement = json('examples/valid/public-technology-review.json');
    delete incompleteProcurement.source_class_inventory.public_comment;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-technology-review.schema.json')!(incompleteProcurement)).toBe(false);

    const emptyProcurement = json('examples/valid/public-technology-review.json');
    emptyProcurement.evidence = [];
    emptyProcurement.risks = [];
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/public-technology-review.schema.json')!(emptyProcurement)).toBe(false);

    const resource = json('examples/valid/local-resource-index.json');
    resource.vertical = 'personal-profile';
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/local-resource-index.schema.json')!(resource)).toBe(false);

    const incompleteVertical = json('examples/valid/local-resource-index.json');
    delete incompleteVertical.vertical_fields.identifier;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/local-resource-index.schema.json')!(incompleteVertical)).toBe(false);
    for (const vertical of ['gtfs', 'hsds']) {
      const wrongProfile = json('examples/valid/local-resource-index.json');
      wrongProfile.vertical = vertical;
      expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/local-resource-index.schema.json')!(wrongProfile), `${vertical} accepted CAP fields`).toBe(false);
    }

    const unsafePublishedResource = json('examples/valid/local-resource-index.json');
    unsafePublishedResource.publisher_verified = false;
    unsafePublishedResource.freshness_state = 'expired';
    unsafePublishedResource.public_scope = false;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/local-resource-index.schema.json')!(unsafePublishedResource)).toBe(false);

    const mismatchedResourceFormat = json('examples/valid/local-resource-index.json');
    mismatchedResourceFormat.structured_data.format = 'gtfs-static';
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/local-resource-index.schema.json')!(mismatchedResourceFormat)).toBe(false);

    const incompleteVote = json('examples/valid/vote-ledger.json');
    delete incompleteVote.motions[0].mover;
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/vote-ledger.schema.json')!(incompleteVote)).toBe(false);

    const emptyVote = json('examples/valid/vote-ledger.json');
    emptyVote.motions = [];
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/vote-ledger.schema.json')!(emptyVote)).toBe(false);

    const emptyComparison = json('examples/valid/meeting-reconciliation.json');
    emptyComparison.comparisons = [];
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/meeting-reconciliation.schema.json')!(emptyComparison)).toBe(false);

    const emptyPublication = json('examples/valid/publication-packet.json');
    emptyPublication.claims = [];
    emptyPublication.upstream_gates = [];
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/publication-packet.schema.json')!(emptyPublication)).toBe(false);

    const emptyCorrection = json('examples/valid/correction-record.json');
    emptyCorrection.changed_claim_ids = [];
    emptyCorrection.downstream_targets = [];
    expect(ajv.getSchema('https://aiwg.io/schemas/civic-action/v1/correction-record.schema.json')!(emptyCorrection)).toBe(false);
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

  it('rejects schema-invalid source, meeting, and publication inputs before rule evaluation', async () => {
    const temporaryRoot = mkdtempSync(join(tmpdir(), 'aiwg-civic-schema-'));
    try {
      for (const file of ['source.json', 'ledger.json', 'reconciliation.json', 'publication.json']) {
        writeFileSync(join(temporaryRoot, file), '{}\n');
      }

      const results = [
        await civicAction(['source.json'], { cwd: temporaryRoot, subcommand: 'source-gate' }),
        await civicAction(['ledger.json', 'reconciliation.json'], { cwd: temporaryRoot, subcommand: 'meeting-gate' }),
        await civicAction(['publication.json'], { cwd: temporaryRoot, subcommand: 'publish-gate' }),
      ];

      for (const result of results) {
        const payload = JSON.parse(result.message);
        expect(result.exitCode).toBe(2);
        expect(payload.code).toBe('CIVIC_SCHEMA_INVALID');
        expect(payload.validation_errors.length).toBeGreaterThan(0);
      }

      const noisy = json('examples/valid/source-registry.json');
      noisy.retrievals = Array.from({ length: 100 }, () => ({}));
      writeFileSync(join(temporaryRoot, 'noisy-source.json'), `${JSON.stringify(noisy)}\n`);
      const bounded = await civicAction(['noisy-source.json'], { cwd: temporaryRoot, subcommand: 'source-gate' });
      const boundedPayload = JSON.parse(bounded.message);
      expect(bounded.exitCode).toBe(2);
      expect(boundedPayload.validation_error_count).toBeGreaterThan(50);
      expect(boundedPayload.validation_errors).toHaveLength(50);
      expect(boundedPayload.validation_errors_truncated).toBe(true);
    } finally {
      rmSync(temporaryRoot, { recursive: true, force: true });
    }
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
    const manifest = json('manifest.json');
    for (const skill of manifest.skills) {
      expect(read(`skills/${skill}/SKILL.md`), `${skill} does not link the control-to-source matrix`)
        .toContain('docs/research/control-source-matrix.md');
    }
  });
});
