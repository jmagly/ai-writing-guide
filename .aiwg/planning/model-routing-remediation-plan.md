# Provider-Aware Model Routing Remediation Plan

**Date:** 2026-07-20

**Parent:** Gitea #1185

**ADR:** [ADR-015](../architecture/ADR-015-enhanced-model-selection.md)

**Audit:** [model-routing-audit-2026-07-20.md](../reports/model-routing-audit-2026-07-20.md)

## Objective

Make cheap-first subagent policy real, portable, observable, and safely
mutable. Completion means that the same canonical intent resolves through one
schema and one resolver, then compiles honestly for each provider.

## Issue map

| Issue | Delivery slice | Priority/dependency |
| --- | --- | --- |
| #1801 | Fix pinned-ID classification, role filters, and model collapse | P0; first |
| #1802 | Provider capability registry, model catalog, and typed compilers | After classifier/schema |
| #1803 | Preserve and compile skill model policy | Depends on capability registry |
| #1804 | Model audit, resolution, and safe bulk-mutation CLI | Depends on resolver/schema |
| #1805 | Provider-aware schema, lint, doctor, and diagnostics | Starts with schema |
| #1806 | Cheap-first canonical corpus migration and evaluation | After resolver/validation |
| #1807 | Provider conformance, distribution, and live smoke coverage | Continuous; gates closure |

Issue #1185 owns the shared policy schema, resolution precedence, production-path
integration, and final acceptance across these slices.

## Work breakdown

### Workstream A — stop incorrect routing

1. Introduce one `classifyModelRole()` that recognizes:
   - bare aliases;
   - pinned Claude family IDs;
   - provider-qualified IDs;
   - current provider mappings; and
   - an explicit unknown state.
2. Use it in provider transforms, role filtering, lint, and migration.
3. Add real pinned-ID fixtures and distribution goldens.
4. Fix Codex, Claude override, and Warp override behavior first.

Exit criteria:

- reasoning, coding, and efficiency fixtures remain distinct;
- role filters select expected nonzero populations; and
- no adapter silently treats unknown as coding.

### Workstream B — complete #1185 and unify configuration

1. Revise and version the model-policy schema.
2. Make the production deploy path consume the v2 resolver.
3. Correct the numeric runtime tier mapping.
4. Implement explicit v1 compatibility and migration.
5. Resolve config relative to the deployment target.
6. Remove framework-specific fallback leakage.

Exit criteria:

- one resolver is imported by use, refresh, adapters, lint, doctor, and CLI;
- precedence is covered by table-driven tests; and
- #1185 acceptance is demonstrated on at least Claude, Codex, Factory,
  OpenClaw, and Hermes.

### Workstream C — provider capability and model registry

1. Extend the provider capability schema for agent, skill, and global child
   model selection.
2. Add accepted syntax, inheritance, fallback, and verification fields.
3. Store volatile exact IDs in a separately refreshable mapping.
4. Generate provider artifacts through typed adapters.
5. Emit explicit degradation outcomes.

Exit criteria:

- all 11 providers have a dated, sourced entry;
- unsupported surfaces do not receive pretend model fields;
- Codex custom agents use the current TOML contract; and
- live or fixture validation records the resolved model/fallback.

### Workstream D — skill policy

1. Migrate `commandHint.model` into provider-neutral role/tier intent.
2. Preserve intent through both skill-to-command paths.
3. Compile Claude's turn-scoped skill model fields where intended.
4. Associate skill execution with an agent or global policy where the provider
   lacks skill-level control.
5. Label unsupported/global-only behavior in dry-run output.

Exit criteria:

- model intent is never silently discarded;
- native and degraded semantics are documented and tested per provider; and
- a skill cannot claim a per-skill model on a provider that ignores it.

### Workstream E — maintainable CLI

Implement:

```text
aiwg models audit
aiwg models list [--provider P]
aiwg models resolve [--agent A|--skill S] [--provider P]
aiwg models set-default TIER [--scope project|user]
aiwg models set --agent A|--skill S|--all --tier TIER
aiwg models validate
aiwg models migrate
```

Requirements:

- typed option parsing shared by use and refresh;
- `--dry-run`, `--json`, and deterministic exit codes;
- no partial write on validation failure;
- target-relative config;
- idempotent writes preserving comments/order where practical;
- selectors for exact name, glob, role, tier, framework, and provider;
- before/after summary with affected artifacts and effective resolution; and
- explicit unsupported/degraded output.

Exit criteria:

- framework, addon, extension, project-local, refresh, and bulk paths receive
  equivalent options;
- saved config round-trips through a fresh process; and
- CLI help examples are executed by tests.

### Workstream F — corpus retiering

1. Inventory unique canonical agents and skills.
2. Classify bounded/routine workers for `economy`.
3. Keep multi-step implementation and normal review at `standard`.
4. Restrict `premium` to high-impact or unusually ambiguous work.
5. Add rationale for every premium default.
6. Review aliases and duplicate definitions across frameworks/addons.

Initial policy gate:

- more than 50% of non-orchestrator subagents and isolated skill workers use
  `economy`;
- target at least 60% after quality evaluation;
- premium defaults remain an explicit allowlist; and
- every changed category passes representative output evals.

### Workstream G — validation and observability

1. Ship JSON/YAML schemas referenced by config and docs.
2. Make linter classification provider-neutral.
3. Make doctor compare canonical policy, compiled artifact, provider capability,
   and observed/fallback status.
4. Add catalog freshness/deprecation warnings.
5. Add an audit command suitable for CI.

Exit criteria:

- malformed or unsupported policy fails before writes;
- doctor no longer reports skill pins that the provider cannot enforce; and
- CI detects distribution drift and model collapse.

## Test strategy

### Unit

- classification for aliases, pinned IDs, namespaced IDs, unknowns;
- tier/role/effort resolution and precedence;
- v1 compatibility and migration;
- provider capability lookup;
- fallback/degradation rendering;
- CLI parser, selectors, and validation.

### Golden provider compilation

Use three real canonical fixtures:

- one reasoning/premium candidate;
- one coding/standard candidate; and
- one efficiency/economy candidate.

For each provider, assert:

- output path and format;
- model and effort field names;
- exact semantic mapping or declared degradation;
- omission of unsupported keys; and
- stable dry-run versus write plan.

### Integration

- clean deployment for every framework and provider;
- config precedence across built-in/user/project/CLI;
- `--target` isolation;
- use/refresh/addon/extension/project-local/bulk parity;
- saved-config fresh-process round trip;
- skill-to-command compilation;
- role and glob filtering;
- no-write behavior on invalid config.

### Corpus policy

- unique artifact counts;
- no missing role/tier without an approved exemption;
- cheap-default ratio;
- premium rationale presence;
- duplicate-name policy consistency;
- no exact provider IDs in canonical policy except explicit overrides.

### Live provider smoke

For each accessible provider:

1. deploy a three-agent fixture;
2. invoke one bounded delegation per tier;
3. capture resolved model/effort where exposed;
4. test one invalid or blocked pin;
5. record fallback and account/admin constraints; and
6. store timestamped evidence.

Live tests are gated and cost-bounded. Fixture/schema tests remain mandatory in
normal CI.

## Migration sequence

1. Patch the classifier regression without changing public schema.
2. Add schemas and compatibility reads.
3. Add provider capability/model registries.
4. Connect resolver to deployment behind a compatibility flag.
5. ship `aiwg models audit|resolve|validate`;
6. retier and evaluate the corpus;
7. make new resolver the default;
8. add mutation commands;
9. deprecate v1 and `max-quality`;
10. remove compatibility paths after one announced release cycle.

## Rollback

- retain the last v1 config reader for one release;
- keep generated artifact backups/manifest hashes during migration;
- allow `aiwg models migrate --dry-run` before writes;
- allow a project to select the legacy resolver only during the compatibility
  window; and
- never roll back by rewriting user-owned provider config without a recorded
  preimage.

## Risks and controls

| Risk | Control |
| --- | --- |
| Cheap defaults reduce quality | Representative evals and explicit standard/premium policy |
| Provider model IDs churn | Refreshable mappings with dates and deprecation checks |
| Silent provider fallback | Dry-run warnings plus live resolved-model smoke evidence |
| Bulk mutation damages user config | Typed validation, preimage, atomic write, dry-run |
| Unsupported skill routing is overstated | Capability-aware degradation status |
| Parallel tests incur cost | Fixture-first CI and gated bounded live matrix |

## Documentation updates

- revise provider pages with native/inherited/degraded semantics;
- replace historical examples that use stale exact IDs;
- document CLI precedence and selectors;
- document the cheap-first policy and escalation boundary;
- keep the model catalog separate from provider capability claims; and
- add a troubleshooting decision tree for “my subagents still use the parent
  model.”
