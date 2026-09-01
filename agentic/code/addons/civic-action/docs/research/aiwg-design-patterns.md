# AIWG design-pattern audit for the civic-action addon

Status: implementation design input for AIWG issues #2213–#2222
Repository audit date: 2026-09-01
Scope: repository-native packaging, component contracts, composition, discovery,
documentation, and verification. Legal and editorial claims require their own
source research; this report does not replace that evidence base.

## Decision

Implement the accepted capability as the `civic-action` **addon** under
`agentic/code/addons/`. It is a cross-cutting capability bundle, not a complete
lifecycle framework. Keep the addon as the canonical source and generate any
marketplace plugin as a thin distribution wrapper after the addon is stable.

This follows the repository's source boundary: deployable schemas, templates,
rules, skills, and agents belong under `agentic/code/addons/<name>/`, while
`.aiwg/` is project output and is not shipped (`agentic/code/addons/aiwg-dev/rules/addon-boundaries.md:11-17`,
`:35-45`, `:48-71`). An addon is incomplete until it has a manifest, README,
registered artifacts, and valid component metadata
(`agentic/code/addons/aiwg-dev/rules/component-completeness.md:11-23`,
`:81-93`, `:161-168`).

Do not make a plugin the implementation owner. A plugin manifest is a wrapper
that points at an addon/framework/extension payload (`src/extensions/manifest.ts:120-123`),
whereas modern upstream addons own their assets and dependencies directly; see
`agentic/code/addons/composition-engine/manifest.json:20-33` and `:79-92`.

## Canonical patterns found

### Addon manifest

Use the modern bundled-addon shape:

- `id`, `type: "addon"`, human `name`, CalVer `version`, and a concrete
  capability `description`. These are the enforced minimum fields
  (`agentic/code/addons/aiwg-dev/rules/component-completeness.md:81-92`).
- `core: false` and `autoInstall: false`; civic-action is opt-in and carries
  jurisdiction-sensitive behavior.
- `author: "AIWG Contributors"`, `license: "MIT"`, canonical repository URL,
  and discovery-oriented `keywords`.
- `entry` paths for every shipped artifact class and top-level arrays that
  enumerate every agent, skill, rule, template, schema, and flow. The discovery
  coverage checker resolves declared files from those arrays and verifies their
  presence (`tools/manifest/check-discovery-coverage.mjs:17-29`, `:186-192`,
  `:203-249`).
- `dependencies.required: ["aiwg-utils"]` and optional composition dependencies
  for `research-complete`, `media-curator`, `knowledge-base`,
  `media-marketing-kit`, `ops-complete`, and `security-engineering`. This mirrors
  the required/optional dependency split in
  `agentic/code/addons/composition-engine/manifest.json:79-82` and avoids copying
  framework assets.
- `researchFoundation` must name #2213–#2222 and the accepted research reports,
  not merely say “research based.” The established pattern records issue and
  parent provenance (`agentic/code/addons/composition-engine/manifest.json:89-92`).
- If project memory paths are declared, keep them under a normalized
  `.aiwg/civic-action/` topology. Deployable artifacts may reference only paths
  guaranteed by a manifest or `aiwg init`
  (`agentic/code/addons/aiwg-dev/rules/addon-boundaries.md:83-100`).

Recommended identity block:

```json
{
  "id": "civic-action",
  "type": "addon",
  "name": "Civic Action",
  "version": "2026.9.0",
  "core": false,
  "autoInstall": false,
  "dependencies": {
    "required": ["aiwg-utils"],
    "optional": [
      "research-complete",
      "media-curator",
      "knowledge-base",
      "media-marketing-kit",
      "ops-complete",
      "security-engineering"
    ]
  }
}
```

Optional dependencies are deliberate. When one is absent, the civic skill must
emit an explicit degraded/blocked plan and preserve evidence; it must not claim
that transcription, citation verification, legal review, or deployment checks
ran. This is the same fail-honestly pattern used by `transcribe-media`, which
emits a blocked plan rather than fabricated transcript text
(`agentic/code/frameworks/media-curator/skills/transcribe-media/SKILL.md:108-126`).

### Agents

Each agent file needs `name`, `description`, `model`, and `tools` frontmatter and
must be registered in the addon manifest
(`agentic/code/addons/aiwg-dev/rules/component-completeness.md:62-71`). A good
agent body makes responsibilities, hard behavior rules, output contract, and
safety gates explicit; the runbook executor demonstrates that shape
(`agentic/code/frameworks/ops-complete/agents/ops-runbook-executor.md:1-14`,
`:16-34`, `:36-48`).

Use four bounded agents:

1. `civic-newsroom-operator`: orchestration, source packet assembly, handoffs,
   and gate state; it does not publish or contact anyone autonomously.
2. `news-caster`: evidence-bound explainers and public-meeting recaps; every
   factual claim carries a source pointer and uncertainty state.
3. `citation-editor`: checks claim/source alignment and invokes existing
   citation/provenance capabilities; it does not invent missing citations.
4. `correction-editor`: produces correction records and amendment plans while
   retaining superseded evidence and review history.

Do not add an “AI lawyer” or autonomous outreach agent. Jurisdiction and legal
uncertainty terminate in a human gate. Existing agent metadata permits explicit
read-only and delegation boundaries (`src/extensions/validation.ts:155-173`),
and those should be used conservatively.

### Skills: instructional versus executable

All skills use `skills/<name>/SKILL.md`, a required non-empty `description`, a
title, a Process/Behavior section, examples, and manifest registration
(`agentic/code/addons/aiwg-dev/rules/component-completeness.md:27-60`). Add
specific natural-language `triggers`; a declared empty trigger list is a known
discoverability regression and is rejected
(`src/extensions/validation.ts:248-285`).

Use **instructional skills** for judgment-heavy work:

- `civic-newsroom-plan`
- `public-records-plan`
- `public-technology-review`
- `local-resource-index`
- `editorial-correction-review`

These should declare `commandHint` only when direct user invocation is useful.
They must produce schemas/templates as outputs, state uncertainty, and stop at
human approval. They should be thin maps to shared corpus references rather than
restating other frameworks; the repository explicitly prefers thin skills with
references (`docs/development/skill-creation-guide.md:160-194`).

Use an **executable validator behind an instructional skill** when success can
be proved deterministically:

- `source-compliance-gate`: schema completeness, allowed acquisition-state
  vocabulary, URL/source identifiers, timestamps, and provenance fields. Human
  review still decides terms, jurisdiction, and access-control uncertainty.
- `public-meeting-reconcile`: schema validation and deterministic comparison of
  supplied transcript/agenda/minutes records. Extraction and speaker identity
  remain reviewed claims.
- `civic-publish-gate`: freshness, minimum-count, citation-coverage,
  empty-section, broken-link, correction-state, and machine-readable severity
  checks.

Executable skills declare `script.entrypoint`, `runtime`, `cwd: project-root`,
and `argsHint`, as `transcribe-media` does
(`agentic/code/frameworks/media-curator/skills/transcribe-media/SKILL.md:1-19`).
The runner contract executes from the caller's project root and keeps artifacts
out of the installed skill directory (`test/unit/skills/run.test.ts:23-52`,
`:144-174`). Every executable gate therefore needs fixtures, exit-code tests,
JSON output tests, and a dry-run/preflight path.

### Flows

Use the forward names `apiVersion: flow.aiwg.io/v1`, `kind: FlowPlaybook`, and
`kind: FlowCapability`. The schemas accept these aliases
(`agentic/code/addons/aiwg-utils/workflow/schemas/workflow-playbook.schema.json:7-24`,
`agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json:7-24`),
and conformance tests explicitly cover them
(`test/unit/workflow/workflow-schema-validation.test.ts:287-325`).

Flows must be declarative DAGs:

- each capability declares explicit inputs and outputs;
- every ordering edge uses `depends_on`;
- high-stakes transitions are inline `kind: gate` steps;
- publication follows legal/editorial/source gates and cannot bypass them;
- verification is a separate final capability.

This is the canonical model: capabilities are reusable verbs, playbooks compose
them, and human gates pause judgment-sensitive steps
(`agentic/code/addons/aiwg-utils/workflow/docs/overview.md:5-9`, `:13-38`,
`:40-78`, `:114-130`). Flow YAML is indexed directly from `metadata.name`,
`spec.description`, and labels, so descriptive metadata is part of discovery,
not decoration (`src/artifacts/index-builder.ts:692-716`, `:726-785`).

Recommended playbooks:

- `civic-newsroom.playbook.yaml`: intake → source gate → research/citation →
  draft → parallel citation/correction review → human publication gate →
  publish verification.
- `public-meeting-reconcile.playbook.yaml`: legality/intake gate → media
  handoff → agenda segmentation → vote/action ledger → minutes reconciliation →
  human verification → optional newsroom handoff.
- `public-records.playbook.yaml`: jurisdiction/agency research → request plan →
  human legal/content review → external manual submission → response ingest →
  provenance/correction handoff. Submission is never an automated capability.

### Rules, templates, and schemas

Rules encode invariants that must apply across several skills. Each rule needs
an enforcement level and a `RULES-INDEX.md` entry
(`agentic/code/addons/aiwg-dev/rules/component-completeness.md:126-133`,
`:178-182`). Use three rules:

- `civic-safety.md`: blocked harassment, intimidation, doxxing, stalking,
  targeting, access-control bypass, and covert outreach; safe alternatives and
  human escalation.
- `source-and-claim-integrity.md`: distinguish source record, verified fact,
  allegation, inference, and opinion; require evidence and freshness.
- `publication-human-review.md`: mandatory human review for publication,
  records requests, legal assertions, outreach, corrections, and takedowns.

Templates are human-reviewable working artifacts. Schemas are the machine
contract for those templates and for executable gate output. Follow the pattern
of pairing a declared schema with fixtures and manifest registration, as in
`agentic/code/addons/agentic-installer/manifest.json:18-23`, `:29-47`. JSON
Schemas should set a stable `$id`, reject unknown properties where practical,
enumerate state/severity values, and define required evidence fields.

## Reuse and composition map

| Civic need | Reuse | Civic-specific layer | Why not duplicate |
|---|---|---|---|
| Research provenance and citation | `research-complete` `citation-guard`, `research-provenance`, REF templates, and GRADE artifacts | Map civic source IDs/claims to REF or source-registry records; add freshness and public-record classification | `citation-guard` already blocks nonexistent citations and checks timestamp quotes (`agentic/code/frameworks/sdlc-complete/skills/citation-guard/SKILL.md:23-54`). Research topology already requires provenance and GRADE at ingest (`agentic/code/frameworks/research-complete/manifest.json:79-104`). |
| Meeting transcription and speakers | `media-curator` `transcribe-media` and `diarize-media`; `research-complete` `induct-media` | Meeting legality intake, agenda segments, vote/action ledger, minutes reconciliation | Transcript sidecars already carry hashes, stable segments, provenance, and explicit quality limits (`agentic/code/frameworks/media-curator/skills/transcribe-media/SKILL.md:80-106`, `:128-142`). Diarization is anonymous clustering, not identity proof (`agentic/code/frameworks/media-curator/skills/diarize-media/SKILL.md:27-34`). |
| Timestamp citations from meetings | `induct-media` | Cite agenda item, motion, vote, and reconciliation record to exact segments | The existing handoff verifies transcript schema/hashes and requires exact timestamp text plus human publication review (`agentic/code/frameworks/research-complete/skills/induct-media/SKILL.md:82-116`). |
| Local public-information graph | `knowledge-base` `kb-ingest` and templates | Source authority, jurisdiction, public/private-person status, correction/takedown state, freshness | KB ingest already summarizes, cross-links, preserves existing content, and limits uncontrolled page creation (`agentic/code/frameworks/knowledge-base/skills/kb-ingest/SKILL.md:62-101`, `:121-132`). A KB entry alone is not evidence or publication approval. |
| Editorial approval | `media-marketing-kit` `approval-workflow` and `review-synthesis` | Civic risk tiers, public-interest review, correction/takedown gates, no automated notifications | Approval workflow already models chains, status, rationale, and audit history (`agentic/code/frameworks/media-marketing-kit/skills/approval-workflow/SKILL.md:21-59`). Review synthesis already preserves conflicts and prioritizes legal blockers (`agentic/code/frameworks/media-marketing-kit/skills/review-synthesis/SKILL.md:20-63`, `:126-142`, `:163-188`). |
| Publication QA | `media-marketing-kit` `qa-protocol` | Source coverage, freshness, empty sections, allegations, last-good-copy, corrections, sitemap/reindex state | QA already separates blocking and advisory results with remediation (`agentic/code/frameworks/media-marketing-kit/skills/qa-protocol/SKILL.md:20-65`). Do not copy mutable social-channel limits into civic schemas. |
| Deploy verification/audit | `ops-complete` `ops-verify` and runbook executor pattern | Vendor-neutral static/CMS adapter contract and civic gate result | Ops verification already defines execute → compare → structured PASS/FAIL (`agentic/code/frameworks/ops-complete/skills/ops-verify.md:7-23`); the runbook agent adds safety gates and bounded audit evidence (`agentic/code/frameworks/ops-complete/agents/ops-runbook-executor.md:16-34`). |

Composition must be explicit in each civic skill's `## References` section.
Never copy another framework's skill into this addon. If an optional dependency
is absent, emit a declared `blocked-dependency-missing` or `manual-review-required`
result and list the safe next step.

## Proposed file tree

```text
agentic/code/addons/civic-action/
├── README.md
├── manifest.json
├── agents/
│   ├── civic-newsroom-operator.md
│   ├── news-caster.md
│   ├── citation-editor.md
│   └── correction-editor.md
├── skills/
│   ├── civic-newsroom-plan/SKILL.md
│   ├── source-compliance-gate/
│   │   ├── SKILL.md
│   │   └── scripts/source_compliance_gate.mjs
│   ├── public-meeting-reconcile/
│   │   ├── SKILL.md
│   │   └── scripts/meeting_reconcile.mjs
│   ├── public-records-plan/SKILL.md
│   ├── public-technology-review/SKILL.md
│   ├── local-resource-index/SKILL.md
│   ├── editorial-correction-review/SKILL.md
│   └── civic-publish-gate/
│       ├── SKILL.md
│       └── scripts/publish_gate.mjs
├── rules/
│   ├── RULES-INDEX.md
│   ├── civic-safety.md
│   ├── source-and-claim-integrity.md
│   └── publication-human-review.md
├── flows/
│   ├── civic-newsroom.playbook.yaml
│   ├── public-meeting-reconcile.playbook.yaml
│   ├── public-records.playbook.yaml
│   └── capabilities/
│       ├── source-compliance-check.yaml
│       ├── meeting-ledger-validate.yaml
│       ├── meeting-reconciliation-verify.yaml
│       ├── publication-review-gate.yaml
│       └── publication-verify.yaml
├── schemas/
│   ├── source-registry.schema.json
│   ├── compliance-gate-result.schema.json
│   ├── vote-ledger.schema.json
│   ├── meeting-reconciliation.schema.json
│   ├── public-records-plan.schema.json
│   ├── public-technology-review.schema.json
│   ├── local-resource-index.schema.json
│   ├── correction-record.schema.json
│   └── publication-gate-result.schema.json
├── templates/
│   ├── source-registry.yaml
│   ├── jurisdiction-review.md
│   ├── public-meeting-source-packet.md
│   ├── vote-ledger.yaml
│   ├── minutes-reconciliation.md
│   ├── public-records-plan.md
│   ├── public-technology-review.md
│   ├── local-resource-index.md
│   ├── correction-record.md
│   └── publication-review.md
├── examples/
│   ├── valid/
│   └── invalid/
└── docs/
    ├── overview.md
    ├── quickstart.md
    └── research/
        ├── aiwg-design-patterns.md
        ├── legal-ethics-guardrails.md
        ├── public-sources-and-records.md
        └── meetings-publishing-and-corrections.md
```

The first implementation may omit scripts until their deterministic contract is
specified, but it must then label the corresponding skill instructional and must
not claim machine execution. Do not ship empty placeholder directories or list
unimplemented assets in the manifest.

## Issue-to-artifact traceability

| Issue | Primary proof artifacts |
|---|---|
| #2213 | `rules/civic-safety.md`, `rules/publication-human-review.md`, jurisdiction template, blocked-class negative fixtures, cited guardrail research |
| #2214 | source registry and compliance-result schemas/templates, `source-compliance-gate`, provenance handoff tests |
| #2215 | addon manifest/README, composition map, `civic-newsroom-plan`, newsroom flow |
| #2216 | transcript handoff contract, vote-ledger/reconciliation schemas, meeting flow, human-verification gate |
| #2217 | public-records planning schema/template/skill, jurisdiction uncertainty and manual-submission gate |
| #2218 | public-technology review schema/template/skill, primary-source and neutral-language checks |
| #2219 | four bounded agents, editorial correction skill, claim/evidence and tone tests |
| #2220 | executable publish-gate result schema, static/CMS fixtures, last-good-copy and correction/reindex checks |
| #2221 | local-resource schema/template/skill, three initial vertical fixtures, freshness/correction/takedown gates |
| #2222 | canonical addon manifest, optional dependency design, public docs, deferred thin plugin wrapper decision |

## Verification and test plan

### Static contract tests

Create `test/unit/addons/civic-action.test.ts` to prove:

- manifest `id` equals directory name; the repository already enforces this for
  every bundled addon (`test/integration/use-all-deployment.test.ts:159-175`);
- all manifest entries resolve to files, and no shipped agent/skill/rule/schema/
  template/flow is orphaned;
- every skill has a specific description, at least one trigger, required
  sections, and valid references;
- every agent has required frontmatter and explicit safety/output sections;
- every rule is in `RULES-INDEX.md`;
- optional dependency names resolve to real manifests;
- vendor names appear only in examples of optional adapters, never as required
  schema values or core workflow steps.

### Schema and executable tests

For every schema, compile with AJV and test at least one valid and multiple
invalid fixtures. Negative fixtures must cover:

- missing source/provenance/citation;
- stale or empty source sections;
- unknown acquisition or legal-status vocabulary;
- unsupported factual claim or allegation presented as fact;
- missing human-review record;
- transcript segment/timestamp mismatch;
- vote totals that do not reconcile;
- correction/takedown state without audit history;
- attempted automatic records submission, outreach, targeting, or access-control
  bypass;
- unknown gate severity and invalid last-good-copy state.

Executable skills need preflight, `--dry-run`, JSON output, stable exit codes,
project-root CWD, no-write-on-failure, idempotency, and degraded-dependency tests.
The executable-skill runner tests are the model for argument forwarding and exit
code propagation (`test/unit/skills/run.test.ts:206-223`, `:242-250`).

### Flow tests

Validate every FlowPlaybook/FlowCapability against the shared workflow schemas.
Assert that:

- all `depends_on` targets exist and the graph is acyclic;
- every capability resolves;
- publication and external-action paths cross a human gate;
- verification is downstream of publication preparation, never parallel to it;
- missing optional dependencies terminate in blocked/manual-review states;
- no flow step can submit a records request, publish, contact a person, or
  identify a speaker without captured human authorization.

The shared workflow test suite demonstrates positive and negative schema
validation (`test/unit/workflow/workflow-schema-validation.test.ts:261-325`).

### Discovery and deployment tests

Add a discovery fixture/integration test for at least these phrases:

- “organize a lawful civic newsroom workflow”
- “check whether a public source may be acquired”
- “reconcile a public meeting transcript with minutes”
- “plan a public records request”
- “review a public technology procurement”
- “publish cited local public information”
- “correct an unsupported civic claim”
- “index local public resources with citations”

Build the framework index and assert that each phrase returns the intended civic
skill or flow above generic marketing results. The repository's discovery gate
requires every shipped component to map to an indexed driver with a capability
and search intent (`test/integration/artifacts/component-discovery-coverage.test.ts:31-67`).

Also run an isolated `aiwg use civic-action` deployment and verify all declared
agents, skills, rules, templates, schemas, and flows are copied/indexed without
writing into the source tree. `aiwg use all` auto-discovers addons rather than
using a hard-coded allowlist (`test/integration/use-all-deployment.test.ts:159-175`).

### Public documentation

Addon-local `docs/overview.md` and `docs/quickstart.md` ship with the corpus, but
public documentation also needs `docs/addons/civic-action/{overview,quickstart}.md`.
Register the parent and both pages in the top-level `docs/_manifest.json` order
and sections arrays. Existing addon pages demonstrate both registrations
(`docs/_manifest.json:258-285`, `:2202-2242`). The quickstart should lead with
natural-language asks and make human review/degraded states visible; it must not
present legal conclusions or automated outreach as product behavior.

### Suggested verification commands

```bash
node bin/aiwg.mjs validate-metadata agentic/code/addons/civic-action --recursive --ci --strict
node tools/scaffolding/validate.mjs agentic/code/addons/civic-action
node tools/manifest/check-discovery-coverage.mjs .
npx vitest run test/unit/addons/civic-action.test.ts
npx vitest run test/integration/civic-action-discovery.test.ts
npx vitest run test/integration/civic-action-deployment.test.ts
node bin/aiwg.mjs use civic-action --dry-run
```

Passing `validate-metadata` alone is insufficient: it validates metadata
profiles and recursively scanned skill documents, but behavioral, schema,
flow, discovery-relevance, and deployment tests prove different requirements
(`tools/cli/validate-metadata.mjs:30-75`, `:82-108`).

## Known anti-patterns to reject

1. **Planning-only assets claimed as implementation.** A README and prose skills
   do not satisfy machine-readable gate, schema, flow, or test acceptance.
2. **Duplicating shared frameworks.** Do not fork citation, provenance,
   transcription, diarization, KB ingest, approval, QA, or ops verification into
   civic-action.
3. **Automated legal judgment.** `allowed`/`prohibited` states need captured
   basis and reviewer; jurisdiction uncertainty blocks high-stakes action.
4. **Automated outreach or records submission.** The addon may prepare drafts
   and checklists; a human performs external submission/publication.
5. **Speaker identification by model inference.** Existing diarization only
   proves anonymous clusters and explicitly forbids unverified names
   (`agentic/code/frameworks/media-curator/skills/diarize-media/SKILL.md:27-34`).
6. **Citation presence treated as claim support.** Verify that evidence entails
   the claim, its source is current, and allegation/opinion/fact state is
   explicit.
7. **Prompt-only “machine-readable” gates.** Deterministic outputs need schemas,
   scripts, fixtures, exit codes, and negative tests.
8. **Empty or generic skill descriptions/triggers.** Discovery derives its
   capability and routing terms from this metadata
   (`tools/manifest/check-discovery-coverage.mjs:105-135`, `:154-182`).
9. **Rules without `RULES-INDEX.md`.** Such rules are not deployed
   (`agentic/code/addons/aiwg-dev/rules/component-completeness.md:19-23`).
10. **Implicit flow order.** `depends_on` is the only ordering primitive
    (`agentic/code/addons/aiwg-utils/workflow/docs/overview.md:40-78`).
11. **Plugin/source divergence.** Generate wrappers from the addon after
    verification; never maintain two hand-edited implementations.
12. **Vendor-locked contracts.** Browsers, OCR/STT, CMS, hosting, search, and
    structured-data adapters remain optional; canonical records use neutral
    fields and capability names.
13. **Mutable platform limits copied as timeless facts.** Channel rules and
    laws change; record source, jurisdiction, effective date, checked-at time,
    and refresh cadence.
14. **Unbounded personal-data retention.** Minimize private-person data, record
    retention basis, and support correction/takedown review without deleting
    the audit chain.
15. **Happy-path-only tests.** The highest-value fixtures are blocked classes,
    stale/empty sources, ambiguous votes, unsupported claims, and missing human
    approval.

## Readiness gate

The addon is ready to claim implementation only when every manifest-listed
artifact exists, every issue row above has direct proof, all research claims are
cited in the dedicated research reports, shared capabilities are composed rather
than copied, all high-stakes paths contain a human gate, and static/schema/flow/
discovery/deployment tests pass. Until then, issue checkboxes should remain open
even if the initial agents and instructional skills are present.
