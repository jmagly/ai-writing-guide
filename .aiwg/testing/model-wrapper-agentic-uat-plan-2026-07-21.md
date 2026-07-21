# Model Wrapper Agentic UAT Plan

Date: 2026-07-21
Status: Executed — local acceptance complete; remote delivery gate pending
Issues: #1829, #1830, #1831, #1832, #1833, #1834, #1835, #1836, #1837
System under test: Steward model routing, provider wrapper deployment, and regenerate branch selection

## Objective

Prove that AIWG can classify work, select an economy, standard, or premium model
role, bind an agent/skill/rule/workflow to the corresponding wrapper, deploy every
required wrapper for configured providers, and execute bounded subagent work with
traceable evidence. Also prove that canonical, legacy, and existing-project
regeneration remain explicit, isolated, idempotent, and non-destructive, while
the unqualified `aiwg-regenerate` skill intelligently selects the right branch.

## Acceptance Criteria

1. Every supported provider compiles all three wrapper roles with an honest
   native, compiled, inherited, global-only, informational, or unsupported result.
2. `aiwg steward models --route` emits a versioned envelope containing the routing
   decision, selected capability, wrapper, effective model, launch mechanism, and
   bounded prompt.
3. Routine, complex, and authorized high-impact work select efficiency, coding,
   and reasoning wrappers respectively. Premium work still requires confirmation
   unless the operator explicitly authorizes it.
4. An unfiltered `aiwg use` deployment fails when a provider-native agent directory
   is missing any required wrapper; filtered deployments warn instead.
5. Configured Claude and Codex deployments contain all three wrappers after deploy.
   Providers without agent-scoped enforcement report their degraded contract
   rather than claiming model isolation.
6. Three live subagent rehearsals load the selected wrapper and capability, remain
   inside their bounded assignment, and return capability and validation evidence.
7. `aiwg regenerate --workspace` and `--full-inject` exercise separate linked skill
   branches; conflicting or unknown flags fail with usage status.
8. Existing-project extraction into `WORKSPACE.md` runs only after the issue-specific
   authorization gate for #1830 is satisfied, and then preserves attribution,
   backups, conflict checks, and the no-credential migration gate.
9. The normal unqualified `aiwg-regenerate` entry point detects stable existing
   project signals and routes to preview/apply extraction; adopted and fresh
   workspaces route to canonical regeneration. Explicit branch flags take precedence.
10. Every defect found during execution receives a tracker issue, threat preflight,
   address-issues cycle evidence, a verified fix, and closure only after delivery.

## Evidence Contract

For every case record: case id, start/end time, provider, catalog source, requested
signals, selected tier/role/model/wrapper, capability type/id, launch mechanism,
exact command or subagent assignment, exit status, changed files, assertions,
result, linked issue, and remaining risk. Never record credentials or raw provider
authentication material.

## Test Matrix

| ID | Area | Scenario | Expected result |
| --- | --- | --- | --- |
| MW-001 | Static policy | Compile three roles across all 11 providers | Complete matrix with explicit outcomes; no missing provider |
| MW-002 | Route | Deterministic assignment | No model or wrapper |
| MW-003 | Route | Routine skill assignment | Economy / efficiency wrapper |
| MW-004 | Route | Complex agent assignment | Standard / coding wrapper |
| MW-005 | Route | High-impact assignment without authorization | Premium decision requires confirmation |
| MW-006 | Route | High-impact assignment with authorization | Premium / reasoning wrapper; no confirmation |
| MW-007 | Route | Empty assignment or unknown provider/type | Usage failure; no launch envelope |
| MW-008 | Catalog | Offline route with fresh runtime cache | Uses cached observed models with static fallback metadata |
| MW-009 | Deploy | Isolated Codex full deployment | Three `.codex/agents` wrappers present |
| MW-010 | Deploy | Isolated Claude full deployment | Three `.claude/agents` wrappers present |
| MW-011 | Deploy | Remove one wrapper after deployment | Verifier names the exact missing wrapper |
| MW-012 | Deploy | Agentless/degraded provider | Honest inherited/global/informational result |
| MW-013 | Live agent | Efficiency wrapper + status skill | Read-only status evidence; no edits |
| MW-014 | Live agent | Coding wrapper + test-engineer | Focused suite evidence; no unrequested edits |
| MW-015 | Live agent | Reasoning wrapper + reviewer | Contract/risk review evidence; no edits |
| MW-016 | Regenerate | Canonical dry-run and apply in fixture | WORKSPACE graph and minimal provider adapter |
| MW-017 | Regenerate | Legacy dry-run and apply in fixture | Inline managed block; no WORKSPACE creation |
| MW-018 | Regenerate | Conflicting/unknown flags | Exit 2; no writes |
| MW-019 | Regenerate | Repeat each branch | Idempotent output; operator content preserved |
| MW-020 | Migration | Existing-project extraction | Gated on #1830 authorization; attributed project context only |
| MW-021 | Isolation | Full CLI-router characterization suite | Fixture-contained mutations; repository context changes only through the authorized migration |
| MW-022 | Selector | Invoke unqualified `aiwg-regenerate` across fresh, existing, and adopted fixtures | Intelligent branch selection; explicit flags remain authoritative |

## Execution Phases

### Phase 0 — Preflight

- Capture commit, worktree status, provider inventory, `.aiwg/aiwg.config`, model
  catalog source, wrapper definitions, and issue-tracker topology.
- Confirm issue actor and signing policy. Do not hydrate signing material until the
  final commit operation.

### Phase 1 — Deterministic and Unit Validation

- Run typecheck and focused route, deployment, regenerate, and CLI handler suites.
- Compile the full provider × wrapper matrix and verify all 33 rows.
- Run negative route and regenerate cases and assert no mutation.

### Phase 2 — Isolated Deployment

- Create explicit temporary project targets.
- Run full `aiwg use` for Codex and Claude with verbose evidence.
- Verify all wrappers recursively in each provider agent directory.
- Tamper only with a disposable target to prove missing-wrapper detection.
- Remove temporary targets after evidence is summarized.

### Phase 3 — Live Agentic Rehearsal

- Launch one bounded subagent for each wrapper level.
- Each subagent must first load its wrapper definition and selected capability.
- Record the Steward envelope separately from the runtime. If the provider runtime
  does not expose the actual child model id, report that limitation honestly; the
  compiled model field is configuration evidence, not telemetry.
- Forbid nested mutation in the efficiency and reasoning review cases. The coding
  case may run tests but may not edit unless a newly filed issue explicitly scopes
  a fix.

### Phase 4 — Regenerate and Migration

- Exercise canonical and legacy branches in disposable fixtures.
- Confirm linked skill files describe the same CLI contract.
- Run MW-020 only after #1830 receives explicit issue-specific authorization.
- Exercise MW-022 through the selector source and the installed executable-skill
  surface so ordinary user invocation, not only direct CLI flags, is covered.

### Phase 5 — Defect Loop and Release Gate

- File each new defect after duplicate search and environment capture.
- Run mandatory threat assessment before address-issues implementation.
- Re-run the failed case plus regression suites after every fix.
- Require full test/build/lint verification, signed commit, push to `origin/main`,
  and green remote CI before closing issues.

## Stop Conditions

- Stop a mutation case if its explicit target cannot be resolved.
- Stop migration on conflicts, possible credentials, or missing #1830 authorization.
- Do not claim a live child model was observed when only configuration was compiled.
- Do not close an issue on local-only evidence or a failing remote pipeline.

## Execution Record

Results will be written to
`.aiwg/testing/model-wrapper-agentic-uat-report-2026-07-21.md` and will reference
this plan by case id.
