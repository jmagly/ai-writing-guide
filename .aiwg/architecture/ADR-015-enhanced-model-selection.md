# ADR-015: Provider-Aware Model Policy Compilation

## Status

Accepted — implementation incomplete

**Decision date:** 2026-07-20

**Implementation parent:** Gitea #1185

**Supersedes:** the 2025-12-12 draft of this ADR

Implementation is decomposed into Gitea #1801–#1807. #1185 remains the
integration and closure gate.

## Context

AIWG publishes one canonical corpus of agents and skills to providers with
different model-selection surfaces. The original design assumed that
`opus|sonnet|haiku` could act as portable role hints and that every provider
could receive a concrete `model:` field. Neither assumption holds.

The 2026-07-20 audit found:

- 196 canonical deployable agents: 154 Sonnet-class, 34 Opus-class, seven
  Haiku-class, and one without model metadata. Only 3.6% are lower-tier.
- 156 non-plugin skill model hints: 108 Sonnet, 39 Opus, and nine Haiku. These
  hints live at `commandHint.model`, not in provider-native skill fields.
- a clean SDLC deploy to Codex maps 116 modeled agents to
  `gpt-5.3-codex`, regardless of whether the source agent is reasoning, coding,
  or efficiency class;
- `aiwg use ... --model-tier economy` is accepted but ignored;
- the v2 resolver and runtime router are not imported by the production deploy
  path;
- `aiwg models` is documented but does not exist;
- model flags are lost on refresh, addon, extension, and project-local paths;
- most skill-to-command translations discard model intent; and
- exact model IDs, accepted schemas, inheritance, and fallback behavior differ
  across providers.

The defect is architectural: canonical intent, current catalog data, provider
capabilities, deployment transforms, and CLI mutation are separate systems.

## Decision

AIWG will represent model choice as provider-neutral policy and compile it into
the target provider's supported configuration. Exact provider model IDs will
not be the canonical role vocabulary.

### 1. Canonical policy dimensions

Agent source metadata will express four independent concerns:

```yaml
model-role: efficiency       # efficiency | coding | reasoning
model-tier: economy          # economy | standard | premium
model-effort: low            # provider-neutral hint; optional
model-override: null         # exact provider model; exceptional
```

Skill source metadata will use the equivalent fields under `commandHint` until
the AIWG skill schema is revised:

```yaml
commandHint:
  modelRole: efficiency
  modelTier: economy
  modelEffort: low
```

The current `model:` and `commandHint.model` values remain migration inputs:

| Legacy value | Canonical role | Initial tier |
| --- | --- | --- |
| `haiku` or Haiku-family ID | `efficiency` | `economy` |
| `sonnet` or Sonnet-family ID | `coding` | `standard` |
| `opus` or Opus-family ID | `reasoning` | `premium` |

The migration mapping is only a starting point. The corpus must be reviewed
because the current distribution contradicts the cheap-first policy.

### 2. One tier taxonomy

AIWG will use one public execution taxonomy:

| Numeric | Name | Meaning |
| ---: | --- | --- |
| 0 | `deterministic` | No model call; use a script, cache, or existing answer |
| 1 | `economy` | Default for bounded, routine, read-heavy, formatting, and support work |
| 2 | `standard` | Multi-step implementation, debugging, synthesis, and normal reviews |
| 3 | `premium` | High-impact or unusually ambiguous work; supervised by default |

`max-quality` remains a deprecated compatibility alias for `premium` during
migration. It is not a fifth execution tier.

The existing runtime router must map numeric Tier 1 to `economy`, Tier 2 to
`standard`, and Tier 3 to `premium`. Its current mapping of Tier 1 to
`standard` is inconsistent with #1185.

### 3. Cheap-first defaults

Subagents and isolated skill workers default to `economy` unless their
canonical metadata or a higher-precedence operator policy selects another
tier. Main-session model choice is outside this default.

For the first corpus migration:

- a strict majority of non-orchestrator subagents and isolated skill workers
  must default to `economy`;
- the working target is at least 60% economy;
- every `premium` default requires a short rationale and a named quality or
  risk reason;
- escalation is advisory unless the target has a native, testable runtime
  routing primitive; and
- an inherited parent model is not considered a cheap default.

### 4. Resolution precedence

The resolver will apply one documented precedence chain:

1. exact invocation override;
2. exact CLI override (`--model`);
3. CLI tier/role/effort override;
4. project artifact override;
5. user artifact override;
6. canonical artifact policy;
7. workspace default subagent policy;
8. AIWG built-in `economy` default.

Provider policy and account constraints may reject a resolved pin. The deploy
result must report that possibility, and live verification must record the
model actually selected where the provider exposes it.

### 5. Provider compilation, not generic copying

A model capability registry will record, per provider:

- per-agent model support;
- per-skill model support;
- global or run-wide child-model support;
- accepted identifier syntax;
- effort/reasoning controls;
- inheritance and invalid-pin fallback;
- configuration target and artifact format;
- last verified date and source; and
- validation/smoke-test method.

The compiler will use that registry:

| Provider | Compilation target |
| --- | --- |
| Claude Code | agent `model`/`effort`; skill `model`/`effort` when explicitly requested |
| Codex | standalone agent TOML with `model` and `model_reasoning_effort` |
| GitHub Copilot | custom-agent `model` only after surface/catalog validation |
| Cursor | custom-agent exact model plus supported parameters; verify fallback |
| Factory | native Light/Medium/Heavy or explicit droid model/effort |
| OpenCode | agent `provider/model-id`; no skill model field |
| Warp/Oz | saved profile or run-level model; mark per-file intent degraded |
| Windsurf/Devin Desktop | no supported portable child selector; mark degraded |
| OpenClaw | global/per-agent subagent model config and optional per-spawn override |
| Hermes | one global delegation model/provider; heterogeneous artifact tiers degrade |
| OpenHuman | native TOML `Inherit`, `Exact`, or semantic `Hint` |

Unsupported fields will not be emitted as if they were enforceable. The deploy
report will use `native`, `compiled`, `inherited`, `global-only`,
`informational`, or `unsupported` as explicit outcomes.

### 6. Separate stable intent from volatile catalog data

Provider-neutral tiers and roles are stable policy. Exact model identifiers are
volatile catalog data. They will live in a refreshable, versioned mapping with:

- source URL;
- retrieval and verification timestamps;
- provider/account applicability;
- deprecation state;
- fallback; and
- observed-resolution test status.

The capability matrix remains the source of truth for whether a surface exists.
The model catalog supplies candidates. Neither silently overrides operator
policy.

### 7. One production resolver

`aiwg use`, `aiwg refresh`, provider adapters, CLI inspection/mutation, lint,
doctor, and tests will consume the same resolver and schema. The v1 and v2
loaders will not remain independent production paths.

The CLI will provide:

- `aiwg models audit`;
- `aiwg models list`;
- `aiwg models resolve`;
- `aiwg models set-default`;
- `aiwg models set --agent|--skill|--all`;
- `aiwg models validate`;
- `aiwg models migrate`; and
- `--dry-run` plus machine-readable output for every mutating command.

Unknown flags, unsupported provider operations, and invalid model shapes will
fail before deployment writes.

## Alternatives considered

### Keep concrete Claude IDs in canonical source

Rejected. This leaks one provider's namespace into every adapter, caused the
Codex collapse, and ages poorly.

### Omit all model metadata and inherit the parent

Rejected. Inheritance is the dominant provider default and reproduces the
reported cost failure whenever the parent uses a premium model.

### Stamp one generic `model:` field into every agent and skill

Rejected. Provider schemas and semantics differ; several skill systems ignore
unknown fields, while Warp, Windsurf, Hermes, and OpenClaw use other control
planes.

### Universal runtime escalation

Deferred. Some providers support per-spawn or complexity routing; others do
not. AIWG will first guarantee deterministic deployment-time policy and report
degradation honestly.

## Consequences

### Positive

- Most subagents can use cheaper models by default without losing explicit
  escalation paths.
- Provider adapters become testable compilers instead of string replacers.
- CLI output can explain effective model, source, and fallback.
- Exact model churn is isolated from canonical agent and skill content.

### Negative

- Provider mappings require ongoing verification.
- Some targets can only honor one global child model or a run-level profile.
- Migration touches a large corpus and must be quality-gated.
- Real provider smoke tests may require entitlements and incur small costs.

## Migration

1. Fix the pinned-ID classifier regression and lock it with golden tests.
2. Ship schemas and a compatibility parser for existing metadata.
3. Extend the provider capability matrix and introduce the model mapping
   registry.
4. Wire the single resolver into every deployment scope.
5. Implement CLI audit/resolve/mutation and dry-run behavior.
6. Retier the canonical corpus with reviewed rationales.
7. Enable CI distribution/conformance gates.
8. Remove v1-only and deprecated `max-quality` behavior after one release
   cycle.

## Verification

Completion requires:

- source-role-to-output golden tests for every provider;
- config precedence and saved-config round trips;
- framework, addon, extension, project-local, refresh, and bulk path parity;
- skill-native versus degraded behavior assertions;
- provider schema validation;
- a corpus cheap-default ratio gate;
- live smoke delegation for providers that expose resolved-model metadata; and
- documentation examples executed as tests.

## References

- [Model routing audit](../reports/model-routing-audit-2026-07-20.md)
- [Implementation and test plan](../planning/model-routing-remediation-plan.md)
- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents)
- [Claude Code skills](https://code.claude.com/docs/en/skills)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
- [GitHub Copilot custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
- [Factory custom droids](https://docs.factory.ai/cli/configuration/custom-droids)
- [OpenCode agents](https://opencode.ai/docs/agents)
- [OpenClaw subagents](https://docs.openclaw.ai/tools/subagents)
- [Hermes delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)
