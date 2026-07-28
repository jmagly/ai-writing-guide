# ADR: Configurable threat-assessment policy

- Status: Accepted
- Date: 2026-07-28
- Issue: #1938
- Decision owners: AIWG maintainers
- Schema version: `security.threatAssessment.schemaVersion = "1"`

## Context

AIWG's original issue preflight combined detection, scoring, thresholds, and
enforcement in one issue-shaped script. Its fixed score was useful as a
conservative default, but it could not express project risk tolerance, forge
surface, provenance, audit-only adoption, or a deliberately stricter policy.
It also treated a sentence warning against secret storage like a request to
read secrets.

The same trust boundary exists in issue text, pull-request metadata and diff
summaries, reviews, release notes, handoffs, and outbound maintainer content.
All of these can carry attacker-controlled instructions into an agent context.
The decision therefore concerns a provider-neutral policy subsystem, not a
larger regex list.

## Research synthesis

The required local corpus was reviewed before the schema and grammar were
stabilized:

- `REF-1915` supplies the Govern / Map / Measure / Manage loop. It supports
  project-specific risk tolerance and traceable monitoring; it does not
  prescribe a universal threshold.
- `REF-1917` supports risk-informed control selection and tailoring. A control
  catalog is not a universal checklist, so project profiles must be explicit
  and reviewable.
- `REF-1919` supplies the agentic taxonomy used in rule metadata: goal hijack,
  tool misuse, privilege abuse, supply-chain compromise, unexpected execution,
  memory/context poisoning, insecure inter-agent communication, cascading
  failures, human trust exploitation, and rogue behavior. This is a crosswalk,
  not an OWASP conformance claim.
- `REF-1619` supports declarative `trigger -> check -> enforce` separation and
  external deterministic enforcement. Its reported generated-rule recall gaps
  and rigid bans argue against letting generated policy silently become
  authoritative.
- `REF-1514` supports deterministic checks before a consequential action and
  measuring gate precision. It also warns that redundant or inaccurate gates
  can reduce utility.
- `REF-1517` supports moving policy out of prompts into typed contracts,
  validators, and traces, plus measuring over-refusal rather than equating
  interruption with safety.
- `REF-1412` supports calibrated reliance: output must explain performance,
  process, and purpose so an operator can choose an appropriate profile.
- `REF-1012` establishes cross-channel indirect prompt injection. Forge content
  is data, not authority; a tool capability or retrieved instruction is not
  authorization.

These sources are maintained in the local research corpus at
`~/dev/research/research-papers/documentation/references/`.

## Decision

### 1. Use a hybrid risk model

Each deterministic rule emits:

- a stable rule ID;
- likelihood and impact on a five-point scale;
- a stable severity (`informational`, `low`, `moderate`, `high`, `critical`);
- agentic-taxonomy mappings;
- paragraph evidence and semantic context;
- rule and policy provenance.

The engine reports an aggregate score for comparison and benchmarking, but the
score is not the sole authority. A profile maps severity to `flag`,
`require-authorization`, or `reject`, while a small shipped mandatory-action
layer rejects dangerous combinations such as credential probing plus
instruction override or executable supply-chain changes.

This preserves deterministic behavior without pretending one global score is
the project's risk tolerance.

### 2. Separate the pipeline

The engine has five observable stages:

1. normalize surface-aware content and provenance;
2. detect signals;
3. classify likelihood, impact, severity, and semantic context;
4. evaluate profile inheritance, rule packs, statements, and thresholds;
5. select an enforcement action.

The machine-readable output records every stage needed to reproduce the
decision: schema/engine/policy versions, policy hash, profile, mode, surface,
source, actor metadata, requested action, findings, evidence, suppression,
risk, matched mandatory rule, final action, and the action that enforce mode
would have selected.

### 3. Keep the grammar deliberately small

Policy version 1 supports:

- `mode`: `off`, `audit`, or `enforce`;
- a default profile and per-surface mode/profile selection;
- profile inheritance;
- rule-set composition;
- project rule packs containing deterministic regex rules;
- thresholds for `flag`, `requireAuthorization`, and `reject`;
- ordered statements with `suppress` or `set-severity`;
- conditions on surface, semantic context, and requested action;
- narrow, attributable risk-acceptance metadata.

Projects cannot shadow `aiwg:` rule packs or built-in profile names. Unknown
packs, invalid regexes, cyclic inheritance, and invalid thresholds fail config
loading and assessment. The grammar has no arbitrary code, network lookup,
environment interpolation, or model callback.

### 4. Precedence

Precedence is deterministic:

1. the active workspace member's `.aiwg/aiwg.config`;
2. surface override;
3. selected project profile;
4. inherited profiles, left to right;
5. selected shipped/project rule packs;
6. global then profile statements, in declaration order;
7. severity thresholds;
8. mandatory reject combinations;
9. mode projection (`audit` records `wouldAction`; `off` skips findings).

Statements can suppress one named signal in a narrow context. They cannot
disable mandatory action for an independent active finding. Built-in names
cannot be overridden, preventing a project pack from masquerading as shipped
policy.

### 5. Modes and profiles

Built-in profiles are:

| Profile | Mode | Purpose |
|---|---|---|
| `trusted` | off | Explicitly skip AIWG assessment for a trusted project. |
| `audit` | audit | Record balanced findings without policy interruption. |
| `balanced` | enforce | Backward-compatible default with contextual suppression. |
| `strict` | enforce | Require authorization from moderate severity. |
| `high-assurance` | enforce | Reject high and critical findings. |

`off` disables only AIWG's own classifier. It does not disable provider,
hosting-platform, repository-authorization, secret-scanning, dependency, or
action-approval safeguards. Its output retains a minimal configuration-state
record (policy hash, profile, mode, surface, and provenance) while recording no
content findings. A project that does not persist the returned report retains
no AIWG assessment log.

### 6. Semantic context is part of the contract

Inputs may explicitly label content as `requested`, `negative`, `quoted`, or
`documentation`. The compatibility path also applies conservative
paragraph-level heuristics. Balanced policy makes negative, quoted, and
documentation findings visible but non-blocking. This resolves issue #1922's
false positive without suppressing a malicious request that asks to retrieve
or publish credentials.

### 7. Defaults and migration

Missing `security.threatAssessment` config resolves to
`aiwg:balanced`/`enforce`, preserving the legacy safe behavior. New
`emptyConfig()` output writes that choice explicitly. Existing files are not
rewritten merely by being read.

Schema version 1 is validated before use or write. Future incompatible grammar
changes require a new schema version and explicit migration. Unknown versions
fail closed; they never resolve to `off`, `trusted`, or a weaker profile.

### 8. Policy pack ownership

Shipped rules remain versioned code/data under AIWG. Project-local rule packs
are validated configuration and are identified as `project:<pack>` in output.
Plugin contributions may provide packs only through the same validated
registration shape in a future schema; unregistered executable plugins are
not policy packs.

## Threat model

| Threat | Control |
|---|---|
| Attacker injects instructions through issue/PR/review content | Explicit surface/source contract; content remains data; deterministic findings before use. |
| Profile inheritance hides a weaker parent | Full resolution before evaluation; cycles and unknown parents fail closed; policy hash records the result. |
| Project shadows a shipped rule/profile | `aiwg:` namespace and built-in profile names are reserved. |
| Invalid config silently disables assessment | Read, write, CLI, and runtime validation reject the policy. |
| Broad suppression masks an independent reject finding | Statements apply per finding; mandatory combinations run after statements over remaining active findings. |
| Risk acceptance becomes unauditable | Suppression carries ID, reason, `acceptedBy`, rationale, and optional expiry. |
| Rule pack is changed after review | Stable policy hash and pack provenance change; shipped packs cannot be overridden. |
| One workspace member's trust posture leaks to another | Assessment receives only the active member's resolved config; no workspace-parent fallback is used. |
| Audit output leaks secrets | Evidence is paragraph-scoped; integrations must apply existing outbound redaction before persistence/posting. |
| Off mode is presented as disabling provider security | Output and docs explicitly limit off to the AIWG classifier. |

## Rejected alternatives

### Fixed aggregate score only

Rejected because likelihood and impact, mandatory rules, and project risk
tolerance collapse into an opaque threshold. The score remains a metric, not
the only decision input.

### LLM semantic classifier as the enforcement authority

Rejected because output would be vendor-dependent and non-reproducible. A
future semantic classifier may add evidence in audit mode, but deterministic
policy remains authoritative.

### Full policy programming language

Rejected because arbitrary expressions or callbacks create a second execution
environment and enlarge bypass/supply-chain risk. Version 1 intentionally uses
finite conditions and deterministic regex packs.

### Fail open on invalid configuration

Rejected because a typo or unavailable pack would silently weaken enforcement.

### Apply every control to every project

Rejected because the NIST sources require tailoring, and the gate research
shows inaccurate/redundant controls can reduce utility without protection.

## Consequences

Positive:

- one provider-neutral decision contract covers all forge surfaces;
- projects can remove AIWG interruptions explicitly or become stricter;
- output supports replay, audit, benchmarking, and operator explanation;
- #1922 becomes a measured false-positive regression;
- provider behavior does not affect deterministic decisions.

Costs:

- project rules require careful review and labeled evaluation;
- regex context remains conservative and cannot solve prompt injection alone;
- integrations must preserve surface/provenance metadata and apply outbound
  redaction to evidence;
- profile or rule changes require benchmark review because interruption is a
  product-quality metric as well as a security metric.

## Verification

The repeatable evaluation is:

```bash
npm run benchmark:threat-assessment
npx vitest run test/unit/security/threat-assessment.test.ts
```

The corpus covers issue title/body/comment, PR title/body/diff summary, review
comment, release note, handoff, and outbound maintainer comment.
