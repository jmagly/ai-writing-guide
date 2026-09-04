import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projectAiwgPath, resolveProjectAiwgDir } from '../../../src/config/project-artifacts.js';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(__dirname, '../../..');
function resolveTestPath(rel: string): string {
  if (rel === '.aiwg') return resolveProjectAiwgDir(repo);
  if (rel.startsWith('.aiwg/')) return projectAiwgPath(repo, rel.slice('.aiwg/'.length));
  return resolve(repo, rel);
}
function read(rel: string): string {
  return readFileSync(resolveTestPath(rel), 'utf8');
}
function exists(rel: string): boolean {
  return existsSync(resolveTestPath(rel));
}

const fortemiCorpusIt = exists('.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md')
  ? it
  : it.skip;

describe('routing documentation regressions', () => {
  it('agent-loop documents native /goal routing for Codex and Claude Code', () => {
    const skill = read('agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md');
    expect(skill).toContain('Provider with native `/goal` (Codex, Claude Code)');
    expect(skill).toContain('/goal "<task>; completion: <measurable criterion>"');
    expect(skill).toContain('/goal "<task>; completion: <criterion>"');
    expect(skill).toContain('stays AIWG-native');
    const addressIssues = read('agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md');
    expect(addressIssues).toContain('Codex and Claude Code');
    expect(addressIssues).toContain('MUST NOT author a free-form cycle comment');
    expect(addressIssues).toContain('scripts/cycle-comment.mjs');
    expect(addressIssues).toContain('templates/issue-comments/al-cycle.md');
    expect(addressIssues).toContain('structured checkpoint is returned to address-issues');
    if (exists('.aiwg/research/codex-goal-integration.md')) {
      expect(exists('.aiwg/research/codex-goal-integration.md')).toBe(true);
    }
    if (exists('.aiwg/architecture/adr-codex-goal-routing.md')) {
      expect(exists('.aiwg/architecture/adr-codex-goal-routing.md')).toBe(true);
    }
  });

  it('address-issues resolves semantic human-interaction labels and preserves their lifecycle (#1726, #1789)', () => {
    const docs = [
      'agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md',
      'agentic/code/plugins/sdlc/skills/address-issues/SKILL.md',
      'agentic/code/plugins/codex-sdlc/skills/address-issues/SKILL.md',
    ];

    for (const docPath of docs) {
      const doc = read(docPath);
      expect(doc).toContain('question-label-lifecycle');
      expect(doc).toContain('Audit stale human-question labels');
      expect(doc).toContain('never silently provision it');
      expect(doc).toContain('Add the resolved label after posting the question-bearing comment');
      expect(doc).toContain('Preserve unrelated labels');
      expect(doc).toContain('Question labels are active-state labels');
    }

    const template = read('agentic/code/frameworks/sdlc-complete/templates/issue-comments/feedback-needed.md');
    expect(template).toContain('Apply the configured human-interaction semantic label');
  });

  it('all issue mutation workflows use the semantic label contract (#1789)', () => {
    const docs = [
      'issue-create',
      'issue-update',
      'issue-close',
      'issue-comment',
      'issue-sync',
    ];
    for (const name of docs) {
      const doc = read(`agentic/code/frameworks/sdlc-complete/skills/${name}/SKILL.md`);
      expect(doc).toContain('Semantic Label Contract (#1789)');
      expect(doc).toContain('issues.labels');
      expect(doc).toMatch(/preserv/i);
      expect(doc).toMatch(/never (provision|create)/i);
    }
  });

  it('agent-loop documents external-route /workflow handling (verified against codex 0.135.0)', () => {
    const skill = read('agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md');
    expect(skill).toContain('native dynamic orchestration (Claude Code Workflow tool)');
    expect(skill).toContain('Codex has no core `/workflow`');
    expect(skill).toContain('detached/resume-after-session work stays AIWG-native');
    if (exists('.aiwg/architecture/adr-workflow-routing.md')) {
      expect(exists('.aiwg/architecture/adr-workflow-routing.md')).toBe(true);
    }
    if (exists('.aiwg/research/provider-workflow-integration.md')) {
      expect(exists('.aiwg/research/provider-workflow-integration.md')).toBe(true);
    }
  });

  it('steward Tier-3 reference surfaces orchestration/loop routing incl. cross-stack Missions (#1538/#1546)', () => {
    const addon = read('agentic/code/addons/aiwg-utils/agents/aiwg-steward.md');
    const persona = read('agentic/code/agents/personas/aiwg-steward.md');
    const reference = read('agentic/code/addons/aiwg-utils/docs/agent-examples/aiwg-steward-routing-reference.md');
    for (const doc of [addon, persona]) {
      expect(doc).toContain('Tier Loading Contract');
      expect(doc).toContain('aiwg discover "agent-loop"');
      expect(doc).toContain('[[aiwg-steward routing reference]]');
    }
    for (const doc of [reference]) {
      expect(doc).toContain('Orchestration & Loop Routing');
      // External/background stays AIWG-native (native primitives are session-scoped)
      expect(doc).toContain('AIWG-native external route');
      // AIWG-owned Codex Mission entry, not the plugin /workflow
      expect(doc).toContain('/aiwg-mission');
      expect(doc).toMatch(/plugin-provided|plugin/i);
      // Cross-stack Mission conductor (#1546) routed via serve runtime:<name>
      expect(doc).toContain('Cross-stack Mission');
      expect(doc).toContain('runtime:<name>');
      // Retained-ownership invariant
      expect(doc.toLowerCase()).toContain('activity-log');
      expect(doc.toLowerCase()).toContain('best-output');
    }
  });

  it('steward routes project-local authoring through Tier-1 pointers and Tier-3 details', () => {
    const steward = read('agentic/code/addons/aiwg-utils/skills/steward/SKILL.md');
    const persona = read('agentic/code/agents/personas/aiwg-steward.md');
    const reference = read('agentic/code/addons/aiwg-utils/docs/agent-examples/aiwg-steward-routing-reference.md');
    for (const doc of [steward, reference]) {
      expect(doc).toContain('Project-Local Authoring Routing');
      expect(doc).toContain('aiwg new-bundle <name> --starter skill');
      expect(doc).toContain('aiwg new-provider <name>');
      expect(doc).toContain('providerConfig.extends');
      expect(doc).toContain('docs/customization/project-local-quickstart.md');
      expect(doc).toContain('docs/customization/project-local-lifecycle.md');
      expect(doc).not.toContain('docs/project-local/overview.md');
    }
    expect(persona).toContain('aiwg discover "project-local customization"');
    expect(persona).toContain('[[steward-quickref]]');
    expect(persona).toContain('[[aiwg-steward routing reference]]');
    const quickref = read('agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md');
    expect(quickref).toContain('aiwg discover "project-local customization"');
  });

  it('steward Tier-1 definitions stay small and point at Tier-2/Tier-3 routes (#1661)', () => {
    const docs = [
      'agentic/code/addons/aiwg-utils/agents/aiwg-steward.md',
      'agentic/code/plugins/utils/agents/aiwg-steward.md',
      'agentic/code/agents/personas/aiwg-steward.md',
    ];
    for (const docPath of docs) {
      const doc = read(docPath);
      expect(Buffer.byteLength(doc, 'utf8')).toBeLessThanOrEqual(12 * 1024);
      expect(doc).toContain('Tier Loading Contract');
      expect(doc).toContain('[[steward-quickref]]');
      expect(doc).toContain('[[aiwg-steward routing reference]]');
      expect(doc).toContain('ask **one** clarifying question');
      expect(doc).toContain('file a detailed AIWG correction issue');
    }

    const reference = read('agentic/code/addons/aiwg-utils/docs/agent-examples/aiwg-steward-routing-reference.md');
    const examples = read('agentic/code/addons/aiwg-utils/docs/agent-examples/aiwg-steward-examples.md');
    expect(reference).toContain('Issue Workflow Routing');
    expect(reference).toContain('Project-Local Authoring Routing');
    expect(examples).toContain('Badge Helper');
    expect(reference).toContain('aiwg discover "aiwg-steward routing reference"');
  });

  it('Claude Code docs cover the managed 1M-context default and opt-in path', () => {
    const operationalReference = read('docs/agents/providers/claude.md');
    expect(operationalReference).toContain('CLAUDE_CODE_DISABLE_1M_CONTEXT=1');
    expect(operationalReference).toContain('export CLAUDE_CODE_DISABLE_1M_CONTEXT=0');
    const changelog = read('CHANGELOG.md');
    expect(changelog).toContain('Claude Code external loop launches now default-disable 1M-context model variants');
  });

  it('aiwg-pr is explicitly AIWG-specific and has a discoverable delivery alias', () => {
    const skill = read('agentic/code/addons/aiwg-utils/skills/aiwg-pr/SKILL.md');
    expect(skill).toContain('Do not use `aiwg-pr` for ordinary repository pull request work');
    expect(skill).toContain('`aiwg-delivery-pr` is the explicit alias');
    const alias = read('agentic/code/addons/aiwg-utils/skills/aiwg-delivery-pr/SKILL.md');
    expect(alias).toContain('not a generic repository PR guide');
    const quickref = read('agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md');
    expect(quickref).toContain('"open a PR for this repo"');
    expect(quickref).toContain('`aiwg-pr`');
  });

  // #1480: skill-first CLI augmentation audit. The cli-secondary rule must state
  // the augment/orchestration invariants and distinguish discovery from paired
  // commands; cli-reference.md must carry that framing; and the named paired
  // surfaces must be covered. This is the documented audit procedure (criterion 6).
  it('cli-secondary rule states the augment-not-replace + skill-orchestration invariants (#1480)', () => {
    const rule = read('agentic/code/addons/aiwg-utils/rules/cli-secondary.md');
    expect(rule).toMatch(/augment[\s\S]*do not replace/i);
    // skill owns orchestration/formatting/presentation/synthesis/gates/recovery
    expect(rule.toLowerCase()).toContain('orchestrat');
    expect(rule.toLowerCase()).toContain('synthesis');
    expect(rule.toLowerCase()).toContain('recovery');
    // discovery surface stays direct-callable, distinct from paired action commands
    expect(rule.toLowerCase()).toContain('discovery surface');
    expect(rule.toLowerCase()).toContain('paired');
    // the named paired action surfaces are covered by the rule's pairing table
    for (const cmd of ['use', 'refresh', 'regenerate', 'doctor', 'doc-sync', 'ralph', 'sdlc-accelerate', 'mc']) {
      expect(rule).toContain(`aiwg ${cmd}`);
    }
  });

  it('cli-reference.md carries the skill-first reading guide (#1480)', () => {
    const ref = read('docs/cli/reference.md');
    expect(ref).toContain('skill-first');
    expect(ref).toContain('augment');
    // distinguishes the two categories and routes paired commands through the skill
    expect(ref.toLowerCase()).toContain('direct-callable');
    expect(ref).toContain('paired skill');
    expect(ref).toContain('cli-secondary.md');
  });

  it('KB and semantic-memory docs distinguish Fortemi storage from Fortemi Core search', () => {
    const docs = [
      'agentic/code/frameworks/knowledge-base/skills/knowledge-base-quickref/SKILL.md',
      'agentic/code/plugins/knowledge-base/skills/knowledge-base-quickref/SKILL.md',
      'agentic/code/frameworks/knowledge-base/skills/kb-ingest/SKILL.md',
      'agentic/code/plugins/knowledge-base/skills/kb-ingest/SKILL.md',
      'agentic/code/frameworks/knowledge-base/skills/kb-health/SKILL.md',
      'agentic/code/plugins/knowledge-base/skills/kb-health/SKILL.md',
      'agentic/code/addons/semantic-memory/skills/memory-query-capture/SKILL.md',
    ];

    for (const rel of docs) {
      const doc = read(rel);
      expect(doc).toContain('Fortemi storage routing');
      expect(doc).toMatch(/Fortemi Core index\/search\s+backend/);
    }

    const quickref = read('agentic/code/frameworks/knowledge-base/skills/knowledge-base-quickref/SKILL.md');
    expect(quickref).toContain('aiwg index neighbors --graph kb');
    expect(quickref).toContain('aiwg index sync');
  });

  it('Fortemi storage docs stay separate from Fortemi Core index/search', () => {
    const doc = read('docs/storage/backends/fortemi.md');
    const qualification = read('docs/storage/qualification.md');
    const secrets = read('docs/contributing/ci-cd-secrets.md');
    const prebuilt = read('docs/fortemi-core-prebuilt-indices.md');
    expect(doc).toContain('Fortemi MCP storage adapter');
    expect(doc).toMatch(/not the Fortemi\s+Core index\/search backend/);
    expect(doc).toContain('aiwg index sync');
    expect(doc).toContain('"type": "fortemi"');
    expect(doc).toContain('This command is read-only by default');
    expect(doc).toContain('Only the exact value `1` enables');
    expect(doc).toContain('Endpoint access alone is not mutation authorization');
    expect(doc).toContain('Until that receipt implementation lands');
    expect(qualification).toContain('PostgreSQL Direct, PostgREST, and Fortemi jobs');
    expect(qualification).toContain('uploaded directory or console report is not certification evidence');
    expect(secrets).toContain('ci/vault-fetch.storage-fortemi.spec');
    expect(secrets).toContain('ci/vault-fetch.storage-fortemi-auth.spec');
    expect(prebuilt).toContain('`AIWG_FORTEMI_CORE_LIVE` is a legacy test-only placeholder');
    expect(prebuilt).toContain('It does not contact Fortemi');
  });

  it('documents provider-neutral corpus ingest and credential references (#1508)', () => {
    const migration = read('docs/storage/migration.md');
    const fortemi = read('docs/storage/backends/fortemi.md');
    const cli = read('docs/cli/reference.md');

    for (const doc of [migration, fortemi, cli]) {
      expect(doc).toContain('aiwg storage import-corpus');
      expect(doc).toContain('--header-env');
      expect(doc).toContain('AIWG_FORTEMI_TOKEN');
    }
    expect(migration).toContain('Only the environment-variable name is persisted');
    expect(migration).toContain('--to obsidian:~/vault');
    expect(migration).toContain('does not read legacy Claude credential files');
    expect(fortemi).toContain('non-loopback endpoints require');
    expect(cli).toContain('without connecting');
  });

  it('CLI reference documents Fortemi Core graph traversal backend flags', () => {
    const ref = read('docs/cli/reference.md');

    expect(ref).toContain(
      'aiwg index query "static retrieval evidence" --fulltext --graph project --json',
    );
    expect(ref).toContain('Fortemi static-cache text/chunks');
    expect(ref).toContain('without rereading source files');
    expect(ref).toContain('aiwg index neighbors --graph kb --node retrieval.md --json');
    expect(ref).toContain(
      'aiwg index deps .aiwg/architecture/search-adr.md --graph project --json',
    );
    expect(ref).toContain('aiwg index neighbors --graph <name> --node <id> [options]');
    expect(ref).toContain('Use `aiwg index similar` for semantic-neighbor lookup.');
    expect(ref).not.toContain('aiwg index neighbors --node REF-008 --semantic --top-k 5');
    expect(ref).not.toContain('aiwg index neighbors --node REF-008 --depth 2');
    expect(ref).toContain('Fortemi Core reads graph relationships');
    expect(ref).toContain('Fortemi Core reads dependency relationships');

    const indexDocs = [
      'agentic/code/addons/aiwg-utils/skills/index/SKILL.md',
      'agentic/code/plugins/utils/skills/index/SKILL.md',
    ];
    for (const docPath of indexDocs) {
      const doc = read(docPath);
      expect(doc).toContain('aiwg index neighbors --graph <name> --node <node-id> --json');
      expect(doc).toContain(
        'aiwg index set --graph <name> --op intersection --node-a <node-id> --node-b <node-id> --json',
      );
    }

    const artifactLookupDocs = [
      'agentic/code/frameworks/sdlc-complete/skills/artifact-lookup/SKILL.md',
      'agentic/code/plugins/codex-sdlc/skills/artifact-lookup/SKILL.md',
      'agentic/code/plugins/sdlc/skills/artifact-lookup/SKILL.md',
    ];
    for (const docPath of artifactLookupDocs) {
      const doc = read(docPath);
      expect(doc).toContain('aiwg index neighbors --graph project --node UC-001 --json');
      expect(doc).toContain(
        'aiwg index set --graph project --op intersection --node-a UC-001 --node-b ADR-001 --json',
      );
    }
  });

  fortemiCorpusIt('Fortemi current-surface inventory reflects current public command signatures', () => {
    const inventory = read('.aiwg/planning/fortemi-core-index-migration/current-surface-inventory.md');

    expect(inventory).toContain('status: local-evidence-mapped');
    expect(inventory).toContain('aiwg index build/query/deps/neighbors/set/stats/list/status/export/sync');
    expect(inventory).toContain('aiwg show <type> <name> [--json] [--first] [--graph <name>] [--backend local\\|fortemi-core]');
    expect(inventory).toContain('aiwg index query "<text>" [--type] [--phase] [--tags] [--path] [--updated-after] [--limit] [--json] [--graph <name>] [--backend local\\|fortemi-core]');
    expect(inventory).toContain('aiwg index query "<text>" --fulltext [--json] [--graph <name>] [--backend local\\|fortemi-core]');
    expect(inventory).toContain('aiwg index deps <path> [--direction] [--depth] [--edge-type] [--json] [--graph <name>] [--backend local\\|fortemi-core]');
    expect(inventory).toContain('aiwg index set --graph <name> --op <operation> --node-a <id> --node-b <id> [--direction] [--edge-type] [--json] [--backend local\\|fortemi-core]');
    expect(inventory).toContain('aiwg index export --format fortemi [--schema-version v1\\|v2]');
    expect(inventory).toContain('aiwg research-query <question> [--backend local\\|fortemi-core] [--graph <name>] [--depth quick\\|thorough]');
    expect(inventory).toContain('direct v2 package-acceptance gate');
    expect(inventory).toContain('value-bearing backend/depth/graph/max-source flags fail fast');
  });

  it('Fortemi integration guide documents status checks for malformed static caches', () => {
    const doc = read('docs/integrations/fortemi-index-export.md');

    expect(doc).toContain('aiwg index status --json');
    expect(doc).toContain('manifest is unreadable');
    expect(doc).toMatch(/export file is missing or\s+unreadable/);
    expect(doc).toContain('export checksum no longer matches the manifest');
    expect(doc).toContain('export schema no longer matches');
    expect(doc).toContain('source graph has been rebuilt after the Fortemi sync');
    expect(doc).toMatch(/reports\s+`status: "unchanged"`/);
    expect(doc).toContain('A valid synced cache with zero items is not stale');
    expect(doc).toMatch(/Fortemi\s+static-cache no-match hint/);
    expect(doc).toContain('--backend local');
    expect(doc).toContain('Pass `--backend local` on search/traversal commands');

    const addonSkill = read('agentic/code/addons/aiwg-utils/skills/index/SKILL.md');
    const pluginSkill = read('agentic/code/plugins/utils/skills/index/SKILL.md');
    for (const skillDoc of [addonSkill, pluginSkill]) {
      expect(skillDoc).toContain('A valid synced Fortemi cache with zero items is not stale');
      expect(skillDoc).toContain('show does not fall back to the local AIWG corpus');
    }
  });

  it('Fortemi preview release notes document storage and issue boundaries', () => {
    const release = read('docs/releases/v2026.7.1-announcement.md');
    const manifest = JSON.parse(read('docs/releases/_manifest.json')) as { order?: string[] };
    const changelog = read('CHANGELOG.md');

    expect(manifest.order).toContain('v2026.7.1-announcement');
    expect(release).toContain('Boundary clarifications');
    expect(release).toContain('Fortemi MCP');
    expect(release).toContain('aiwg issue list --search');
    expect(release).toContain('does not require or use');
    expect(release).toContain('cache with zero items is valid');
    expect(release).toContain('Fortemi static-cache no-match hint');
    expect(release).toContain('does not fall back to the local AIWG corpus');
    expect(release).toContain('source-body chunks');
    expect(release).toContain('embedding metadata slots');
    expect(release).toContain('static semantic/hybrid query');
    expect(release).toContain('--backend local');
    expect(release).toContain('#1551');
    expect(release).toContain('#1508');
    expect(release).toMatch(/body-level embedding/);
    expect(release).toMatch(/provider-neutral\s+storage\/index boundary/);
    expect(release).toContain('operator-approved target environment');
    expect(release).toMatch(/Direct Fortemi\s+REST import and hardcoded-token patterns remain out of scope/);
    expect(changelog).toContain('Fortemi boundary docs');
    expect(changelog).toContain('local issue search');
    expect(changelog).toContain('Valid empty-cache semantics');
    expect(changelog).toContain('Fortemi static-cache no-match hint');
    expect(changelog).toContain('source-body chunks');
    expect(changelog).toMatch(/embedding metadata\s+slots/);
    expect(changelog).toContain('fulltext/static semantic/hybrid query');
    expect(changelog).toContain('Legacy rollback gate docs');
    expect(changelog).toContain('`--backend local` rollback');
    expect(changelog).toContain('#1551');
    expect(changelog).toContain('#1508');
    expect(changelog).toMatch(/body-level embedding/);
    expect(changelog).toMatch(/provider-neutral\s+corpus-to-storage\/index boundary/);
    expect(changelog).toContain('direct Fortemi REST import');
  });

  it('local issue docs keep issue search on the local provider', () => {
    const doc = read('docs/local-issues.md');

    expect(doc).toContain('Local issue search remains served by the local issue provider');
    expect(doc).toContain('aiwg issue` commands intentionally do not accept `--backend fortemi-core`');
    expect(doc).toMatch(/use `aiwg index` commands for\s+artifact-index Fortemi Core queries/);
  });

  fortemiCorpusIt('research-query docs use the synced Fortemi Core cache by default', () => {
    const source = read('agentic/code/frameworks/research-complete/skills/research-query/SKILL.md');
    const plugin = read('agentic/code/plugins/research/skills/research-query/SKILL.md');

    for (const doc of [source, plugin]) {
      expect(doc).toContain('By default, research-query uses the Fortemi static cache');
      expect(doc).toContain('aiwg index sync');
      expect(doc).toContain('--backend local');
      expect(doc).toContain('fail with recovery guidance');
      expect(doc).toContain('instead of falling back silently');
      expect(doc).toContain('--include-diagnostics');
      expect(doc).toContain('diagnostics are not research evidence');
      expect(doc).toContain('without rereading source files');
    }

    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');
    for (const doc of [audit, traceability]) {
      expect(doc).toContain('strict');
      expect(doc).toContain('backend/depth/graph/max-source');
      expect(doc).toContain('test/unit/research/query-cli.test.ts');
    }
  });

  it('corpus snapshot docs preserve the accepted AIWG-rendered boundary', () => {
    const source = read('agentic/code/frameworks/research-complete/skills/corpus-snapshot/SKILL.md');
    const plugin = read('agentic/code/plugins/research/skills/corpus-snapshot/SKILL.md');

    for (const doc of [source, plugin]) {
      expect(doc).toContain('Fortemi Core Migration Note');
      expect(doc).toContain('corpus snapshots remain');
      expect(doc).toMatch(/AIWG-rendered from\s+corpus sidecars, corpus views, and the local `.aiwg\/\.index`/);
      expect(doc).toMatch(/Fortemi\s+v2 projects the underlying research and KB records/);
      expect(doc).toContain('does not replace the snapshot renderer');
      expect(doc).toContain('golden corpus-view fixtures');
    }
  });

  fortemiCorpusIt('Fortemi package-boundary proposal documents npm release-age override safeguards', () => {
    const proposal = read('.aiwg/planning/fortemi-core-index-migration/fortemi-package-boundary-workflow-proposal.md');

    expect(proposal).toContain('npm Release-Age Override Record');
    expect(proposal).toContain('@fortemi/core@2026.7.7');
    expect(proposal).toContain('--min-release-age=0');
    expect(proposal).toContain('explicit human approval');
    expect(proposal).toContain('Approval record to fill before copying');
    expect(proposal).toContain('Approver: `<human maintainer name or handle>`');
    expect(proposal).toContain('Approved at: `<UTC timestamp>`');
    expect(proposal).toContain('CI Supply-Chain Audit Notes');
    expect(proposal).toContain('actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5');
    expect(proposal).toContain('node:20@sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5');
    expect(proposal).toContain('does not reference `secrets.*`');
    expect(proposal).toContain('fortemi:package-boundary');
    expect(proposal).toContain('--ignore-scripts');
    expect(proposal).toContain('AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1');
    expect(proposal).toContain('does not switch defaults');
    expect(proposal).toContain('`--backend local` rollback');
    expect(proposal).toContain('npm ci');
  });

  fortemiCorpusIt('Fortemi completion audit records current local validation evidence', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const closeout = read('.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md');
    const checklist = read('.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');
    const trackerStatus = read('.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md');
    const scope = read('.aiwg/planning/fortemi-core-index-migration/review-branch-scope.md');

    expect(audit).toContain('Latest local `npm run test:ci` pass');
    expect(audit).toContain('7367` tests passed');
    expect(audit).toContain('`npm test` passed after the latest evidence edits');
    expect(audit).not.toContain('7358');
    expect(audit).toContain('UAT suite `5` files and `95` tests passed');
    expect(audit).toContain('Latest full-suite local test evidence after docs/runbook hardening');
    expect(audit).toContain('itemCount: 1097');
    expect(audit).toContain('avoid self-referential index churn');
    expect(audit).toContain('default-backend-switch-issue-draft.md');
    expect(audit).toContain('pr-readiness-checklist.md');
    expect(audit).toContain('tracker-status-refresh.md');
    expect(audit).toContain('package-boundary-decision-record.md');
    expect(audit).toContain('handoff-readiness-report.md');
    expect(closeout).toContain('pr-readiness-checklist.md');
    expect(closeout).toContain('tracker-status-refresh.md');
    expect(closeout).toContain('package-boundary-decision-record.md');
    expect(traceability).toContain('pr-readiness-checklist.md');
    expect(traceability).toContain('tracker-status-refresh.md');
    expect(traceability).toContain('package-boundary-decision-record.md');
    expect(traceability).toContain('handoff-readiness-report.md');
    expect(checklist).toContain('Do not remove `.aiwg/.index/<graph>/` fallback behavior');
    expect(checklist).toContain('tracker-status-refresh.md');
    expect(checklist).toContain('package-boundary decision');
    expect(checklist).toContain('handoff readiness report');
    expect(checklist).toContain('tea login list');
    expect(checklist).toContain('Remote CI must prove `npm run test:ci`');
    expect(checklist).toContain('review-branch-scope.md');
    expect(audit).toContain('tea issues create');
    expect(audit).not.toContain('after adding the review branch scope manifest');
    expect(checklist).not.toContain('after adding the review branch scope manifest');
    expect(trackerStatus).toContain('issuecomment-77378');
    expect(trackerStatus).toContain('Comment id: 77378');
    expect(trackerStatus).toContain('#1685 -> #1684 -> #1686 -> #1687 -> (#1688 + #1689 + #1690) -> #1691 -> legacy-removal issue');
    expect(trackerStatus).toContain('no live Fortemi');
    expect(trackerStatus).toContain('historical tracker-source fact');
    expect(trackerStatus).toContain('future tracker mutations use `tea` as `roctinam`');
    for (const scopedPath of [
      'test/integration/cockpit-bridge.test.js',
      'test/unit/artifacts/corpus-views.test.ts',
      'test/unit/artifacts/index-status.test.ts',
      'test/unit/cli/doctor.test.ts',
      'test/unit/cli/handlers/subcommands.test.ts',
      'test/unit/issues/cli.test.ts',
      'agentic/code/plugins/codex-sdlc/skills/artifact-lookup/SKILL.md',
      'agentic/code/plugins/knowledge-base/skills/knowledge-base-quickref/SKILL.md',
      'agentic/code/plugins/research/skills/research-query/SKILL.md',
      'agentic/code/plugins/utils/skills/index/SKILL.md',
      '.aiwg/security/working/ci-workflow-audit.md',
      'docs/releases/v2026.7.1-announcement.md',
      'src/research/query-cli.ts',
    ]) {
      expect(scope).toContain(scopedPath);
    }
    expect(scope).toContain('doc-sync-20260630T164445Z.md');
    expect(scope).toContain('Do not include `.gitea/workflows/` changes');
    expect(scope).toContain('git commit -S62297562B1C7053088F405DB0117DAAA677A5BF2');
    expect(trackerStatus).toContain('#1664 | open');
    expect(trackerStatus).toContain('#1684 | open');
    expect(trackerStatus).toContain('#1691 | open');
    expect(trackerStatus).toContain('Do not use this snapshot as permission');
  });

  fortemiCorpusIt('Fortemi default-backend switch draft preserves post-gate filing constraints', () => {
    const draft = read('.aiwg/planning/fortemi-core-index-migration/default-backend-switch-issue-draft.md');
    const closeout = read('.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');

    expect(draft).toContain('status: draft-do-not-file-before-ci');
    expect(draft).toContain('Do not file it until');
    expect(draft).toContain('through `tea` as `roctinam`');
    expect(draft).toContain('#1691 is green in remote CI');
    expect(draft).toContain('direct v2 package acceptance');
    expect(draft).toContain('`--backend local`');
    expect(draft).toContain('`--backend local` rollback');
    expect(draft).toContain('AIWG_FORTEMI_CORE_PACKAGE_REQUIRED');
    expect(draft).toContain('Removing the local `.aiwg/.index/<graph>/` backend');
    expect(draft).toContain('missing/stale/corrupt/schema-mismatched Fortemi cache recovery');
    expect(closeout).toContain('default-backend-switch-issue-draft.md');
    expect(traceability).toContain('default-backend-switch-issue-draft.md');
  });

  fortemiCorpusIt('Fortemi migration evidence keeps required CI free of live/package flags', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');

    for (const doc of [audit, traceability]) {
      expect(doc).toContain('.gitea/workflows/ci.yml');
      expect(doc).toContain('AIWG_FORTEMI_CORE_LIVE');
      expect(doc).toContain('AIWG_FORTEMI_CORE_PACKAGE_REQUIRED');
      expect(doc).toContain('only perf-budget env vars');
    }
  });

  fortemiCorpusIt('Fortemi completion evidence records traversal flag and operand parser hardening', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');

    for (const doc of [audit, traceability]) {
      expect(doc).toContain('Error: --backend must be local or fortemi-core');
      expect(doc).toContain('Error: --graph requires a graph name');
      expect(doc).toContain('Error: --direction must be upstream, downstream, or both');
      expect(doc).toContain('Error: --direction must be in, out, or both');
      expect(doc).toContain('Error: --node is required for neighbors command');
      expect(doc).toContain('Error: --node-a and --node-b are required');
      expect(doc).toContain('Error: --type requires a value');
      expect(doc).toContain('Error: --limit must be a positive integer');
      expect(doc).toContain('Error: --depth must be a positive integer');
      expect(doc).toContain('Error: --edge-type requires a value');
      expect(doc).toContain('Error: --repo requires a value');
      expect(doc).toContain('Error: --schema-version must be v1 or v2');
      expect(doc).toContain('Error: --out requires a file path');
      expect(doc).toContain('instead of falling back');
      expect(doc).toContain('index discover');
      expect(doc).toContain('index query');
      expect(doc).toContain('index export');
      expect(doc).toContain('index sync');
      expect(doc).toContain('test/unit/artifacts/fortemi-core-discover-show.test.ts');
    }
  });

  fortemiCorpusIt('Fortemi completion evidence records corrupt-manifest status validation', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');

    for (const doc of [audit, traceability]) {
      expect(doc).toMatch(/unreadable[- ]manifest|manifest is\s+unreadable/);
      expect(doc).toContain('manifest file is unreadable');
      expect(doc).toContain('test/unit/artifacts/fortemi-core-sync.test.ts test/unit/artifacts/index-status.test.ts');
    }
  });

  fortemiCorpusIt('Fortemi React issue audit records the no-new-issue decision', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/fortemi-react-issue-audit.md');

    expect(audit).toMatch(/[Pp]ublic Gitea API recheck/);
    expect(audit).toMatch(/listed\s+three open Fortemi/);
    expect(audit).toMatch(/#219 and #220 were\s+the AIWG v2/);
    expect(audit).toMatch(/#212 is an unrelated\s+GraphRAG integration spike/);
    expect(audit).toContain('recheck on');
    expect(audit).toContain('direct v2 package contract');
    expect(audit).toMatch(/validator now accept AIWG v2/);
    expect(audit).toContain('No new Fortemi React issue is needed at this time');
    expect(audit).toContain('direct v2 package contract');
    expect(audit).toContain('v2 relationship-field validation');
    expect(audit).toContain('local v2-to-v1 projection');
    expect(audit).toContain('operator-authorized Gitea MCP connector');
  });

  fortemiCorpusIt('Fortemi tracker closeout plan records tea commands and MCP authorization boundary', () => {
    const plan = read('.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md');

    expect(plan).toContain('tea whoami');
    expect(plan).toContain('tea logins list');
    expect(plan).toContain('`whoami` does not accept `--login`');
    expect(plan).toContain('Use `--login roctinam` on every `tea` command that accepts the flag');
    expect(plan).toContain('operator explicitly authorizes the Gitea MCP');
    expect(plan).toMatch(/Do not use unauthorized `roctibot` paths as closure\s+evidence/);
    expect(plan).toContain('issuecomment-77505');
    expect(plan).toContain('non-closing local status update');
    expect(plan).toContain('tea actions runs list --login roctinam --repo roctinam/aiwg --branch main --status success --output json');
    expect(plan).toContain('tea actions runs view --login roctinam --repo roctinam/aiwg --jobs --output json <run-id>');
    expect(plan).toContain('tea comment --login roctinam');
    expect(plan).toContain('tea issues close --login roctinam');
    expect(plan).toContain('tea issues create --login roctinam');
    expect(plan).toContain('tea api --login roctinam');
    expect(plan).toContain('not execution evidence until');
    expect(plan).toContain('use the connector');
  });

  fortemiCorpusIt('Fortemi tracker snapshot records the operator-authorized MCP status comment', () => {
    const snapshot = read('.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md');

    expect(snapshot).toContain('Operator-Authorized MCP Status Comment');
    expect(snapshot).toContain('Comment id: 77505');
    expect(snapshot).toContain('Route: operator-authorized Gitea MCP');
    expect(snapshot).toMatch(/not\s+closure evidence/);
  });

  fortemiCorpusIt('Fortemi default-backend switch draft keeps rollback and CI gates explicit', () => {
    const plan = read('.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md');

    expect(plan).toContain('Default-Backend Switch Issue Draft');
    expect(plan).toContain('Acceptance criteria');
    expect(plan).toContain('forces local mode for rollback');
    expect(plan).toContain('at least one release after the default switch');
    expect(plan).toMatch(/Remote CI covers both default Fortemi behavior and `--backend local` rollback\s+behavior/);
    expect(plan).toContain('Required CI still has no live Fortemi service');
    expect(plan).toContain('AIWG_FORTEMI_CORE_PACKAGE_REQUIRED');
  });

  fortemiCorpusIt('Fortemi completion audit records that legacy removal remains gated', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');

    for (const doc of [audit, traceability]) {
      expect(doc).toContain('legacy');
      expect(doc).toContain('--backend local');
      expect(doc).toContain('removal');
    }
  });

  fortemiCorpusIt('Fortemi tracker refresh preserves related issue ordering gates', () => {
    const refresh = read('.aiwg/planning/fortemi-core-index-migration/tracker-status-refresh.md');
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');

    for (const doc of [refresh, audit, traceability]) {
      expect(doc).toContain('#1551');
      expect(doc).toContain('#1508');
      expect(doc).toMatch(/body-level embedding/);
      expect(doc).toMatch(/provider-neutral\s+(corpus\s+)?storage\/index boundary/);
    }

    expect(refresh).toContain('deferred, needs-infrastructure');
    expect(refresh).toContain('do not port the direct Fortemi REST/token pattern');
  });

  fortemiCorpusIt('Fortemi post-CI closeout keeps related issues non-closing', () => {
    const plan = read('.aiwg/planning/fortemi-core-index-migration/post-ci-tracker-closeout-plan.md');
    const checklist = read('.aiwg/planning/fortemi-core-index-migration/pr-readiness-checklist.md');

    for (const doc of [plan, checklist]) {
      expect(doc).toContain('#1551');
      expect(doc).toContain('#1508');
      expect(doc).toMatch(/body-level embedding/);
      expect(doc).toMatch(/provider-neutral\s+corpus[- ]to[- ]storage\/index|provider-neutral corpus storage\/index/);
    }

    expect(plan).toContain('Do not close #1551 or #1508');
    expect(plan).toContain('No closure requested by this comment');
    expect(plan).toContain('Direct Fortemi REST import and hardcoded-token patterns remain out of scope');
  });

  fortemiCorpusIt('Fortemi package evidence separates availability from direct v2 acceptance', () => {
    const audit = read('.aiwg/planning/fortemi-core-index-migration/completion-gate-audit.md');
    const traceability = read('.aiwg/planning/fortemi-core-index-migration/traceability-matrix.md');
    const decision = read('.aiwg/planning/fortemi-core-index-migration/package-boundary-decision-record.md');

    for (const doc of [audit, traceability]) {
      expect(doc).toContain(
        'npm view @fortemi/core@2026.7.7 version dist-tags exports',
      );
      expect(doc).toContain('--min-release-age=0');
      expect(doc).toMatch(/confirmed the\s+published (package still exports|exports still include)\s+`\.\/aiwg-index`/);
      expect(doc).toMatch(/PASS evidence for\s+package availability/);
      expect(doc).toMatch(/direct v2[\s\S]*package-contract adoption/i);
    }

    expect(decision).toContain('direct-v2-accepted');
    expect(decision).toContain('aiwg.fortemi.index.export.v2');
    expect(decision).toContain('aiwg.fortemi.index.record.v2');
    expect(decision).toContain('--min-release-age=0');
    expect(decision).toContain('no `preinstall`, `install`, `postinstall`, or `prepare`');
    expect(decision).toContain('Fortemi/fortemi-react#219');
    expect(decision).toContain('Fortemi/fortemi-react#220');
    expect(decision).toContain('Fortemi Core is the default backend');
  });

  fortemiCorpusIt('Fortemi Core ADR locks storage, issue-search, and verified package-boundary limits', () => {
    const adr = read('.aiwg/architecture/adr-fortemi-core-indexing-substrate.md');

    expect(adr).toContain('"type": "fortemi"');
    expect(adr).toContain('Fortemi MCP persistence');
    expect(adr).toMatch(/does not switch AIWG\s+discovery/);
    expect(adr).toContain('aiwg issue list --search');
    expect(adr).toContain('.aiwg/issues/index/issues.index.json');
    expect(adr).toContain('local issue CLI contract');
    expect(adr).toContain('@fortemi/core@2026.7.11');
    expect(adr).toContain('blocking shard conformance CI');
    expect(adr).toContain('clean PGlite import/re-export');
    expect(adr).toContain('clean Fortemi server import/re-export');
    expect(adr).toContain('not `full-v1`');
    expect(adr).toContain('source-body chunk export');
    expect(adr).toContain('vector embedding ownership');
  });
});
