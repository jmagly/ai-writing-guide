# Model Routing and Deployment Audit

**Date:** 2026-07-20

**Scope:** canonical agents and skills, deployment adapters, model configuration,
CLI mutation paths, tests, and 11 provider targets

**Parent issue:** Gitea #1185

**Result:** fail — high-cost defaults and routing defects are reproducible

## Executive result

The report that subagents use the highest or near-highest model is credible.
There are three independent causes:

1. the canonical corpus is already weighted heavily toward Sonnet/Opus-class
   models;
2. Codex and several override/filter paths misclassify pinned Claude model IDs
   as coding; and
3. providers commonly inherit the parent model when AIWG fails to compile an
   enforceable child policy.

This is not safely repairable with a bulk string replacement. Provider
configuration surfaces differ enough that AIWG needs a provider-neutral policy
schema, a single resolver, and provider-specific compilation with explicit
degradation.

## Audit method

The audit combined:

- repository-wide frontmatter inventory;
- controlled clean deployments to temporary targets;
- direct adapter characterization with real pinned source IDs;
- CLI help, dry-run, config, and test inspection;
- existing issue/ADR review, including #1185, #613, #411, #1056, and #1103;
- `aiwg steward capabilities --all`;
- official provider documentation retrieved on 2026-07-20; and
- 88 focused unit tests plus existing deployment output comparison.

No live paid-model requests were required for the audit. Live resolution is a
required implementation acceptance step because several providers silently
inherit or fall back.

Remediation is tracked by #1185 and child issues #1801–#1807. The child issues
separate classifier correctness, provider compilation, skill semantics, CLI
management, validation, corpus migration, and conformance testing so that each
has independently checkable acceptance criteria.

Environment used for reproducible defects:

```text
AIWG: 2026.7.13 [dev], commit 615b3f2e4
Provider under direct reproduction: codex, factory, copilot
OS: Ubuntu 24.04-derived Linux, kernel 7.0.0-28-generic, x86_64
Node: v24.12.0
npm: 11.11.0
```

## Quantitative baseline

### Canonical deployable agents

| Source model family | Count | Share |
| --- | ---: | ---: |
| Sonnet | 154 | 78.6% |
| Opus | 34 | 17.3% |
| Haiku | 7 | 3.6% |
| Missing | 1 | 0.5% |
| **Total** | **196** | **100%** |

Only 3.6% of modeled agents are lower-tier before any provider transform.
Across the broader source tree, including duplicate agent definitions, 307 of
401 entries pin Sonnet, 65 pin Opus, 11 pin Haiku, and 18 omit the field.

### Canonical skill hints

Of 156 non-plugin framework/addon skills with `commandHint.model`, 108 request
Sonnet, 39 Opus, and nine Haiku. A broader scan found 993 skill files: 354 have
a command hint and 639 have no model hint. None uses the provider-native
top-level `model` field.

The current corpus therefore does not satisfy “subagents should lean on lower
tier models.”

## Confirmed defects

### 1. Codex collapses all modeled agents to one coding model

A clean controlled SDLC deploy produced:

```json
{"gpt-5.3-codex":116,"<missing>":1}
```

The same distribution is visible in the workspace deployment: all 194 modeled
Codex agents use `gpt-5.3-codex`.

Root cause:

- `tools/agents/providers/codex.mjs` recognizes only exact bare `opus` and
  `haiku` in `replaceModelFrontmatter`;
- canonical source values are pinned IDs such as `claude-opus-4-7` and
  `claude-haiku-4-5`; and
- every non-exact value falls through to coding.

An architecture, implementation, and efficiency agent therefore all compile to
the same model.

### 2. Claude and Warp overrides repeat the classifier defect

Claude normally copies pinned IDs unchanged. When any role override is active,
its transform uses the same exact-alias classifier. Pinned Opus and Haiku
agents become coding agents. Warp has the same behavior.

### 3. Role filtering is nonfunctional with pinned IDs

`tools/agents/providers/base.mjs` maps only exact
`opus|sonnet|haiku`. On the audited SDLC set:

```text
--filter-role reasoning  -> 0 agents
--filter-role coding     -> 118 agents
--filter-role efficiency -> 0 agents
```

This breaks “update some agents” workflows and allows a bulk change to affect
the wrong population.

### 4. The tier resolver is disconnected

`src/models/config-loader.ts`, `src/models/resolver.ts`,
`src/models/router.ts`, and `models-v2.json` implement a second model system.
Production deployment uses the v1 loader in
`tools/agents/providers/base.mjs`.

Consequences:

- `--model-tier` is not parsed by `deploy-agents.mjs`;
- `aiwg use sdlc --model-tier economy` produces the default distribution;
- `aiwg models --help` returns `Unknown command: models`;
- frontmatter `model-tier` and `model-override` are not compiled; and
- #1185's remaining deployment acceptance is not complete.

The runtime router also maps numeric Tier 1 (“cheap/default” in #1185) to
`standard`, not `economy`.

### 5. Skill model intent is usually nonfunctional

AIWG stores skill model hints inside `commandHint.model`.

- `skill-command-translator.ts` parses the hint but omits it when generating
  command wrappers.
- A second mirror path emits only name and description.
- OpenCode, Codex, Copilot, and common skill schemas do not define a portable
  skill model field.
- Claude Code does support a top-level, turn-scoped skill `model`, but AIWG does
  not emit it from `commandHint.model`.
- Factory transforms the nested hint, but this is provider-specific and is not
  a universal native skill contract.

The correct fix is capability-aware compilation, not copying the same field
everywhere.

### 6. Model flags disappear across CLI paths

The primary framework `aiwg use` path forwards remaining arguments, while
addon-only, project-local, source-directory, and portions of bulk deployment
reconstruct argument arrays and omit model/filter/save values.

`aiwg refresh` advertises model flags but its handler parses and forwards none
of them. This makes saved policy and repeated deployment unreliable.

### 7. Configuration precedence is documented more broadly than implemented

The production v1 loader:

- selects the first file rather than merging a hierarchy;
- looks for project config under process cwd rather than `--target`;
- falls back to the SDLC config for other frameworks; and
- is materially consumed only by the Factory adapter unless CLI overrides are
  present.

The v2 loader merges default/user/project settings but is not connected to
deployment.

### 8. Validation and tests provide false confidence

- referenced model JSON schemas are absent;
- model config validation is mostly `JSON.parse`;
- the agent linter exact-compares bare aliases, so pinned IDs evade its tier
  heuristics;
- the linter recommends Opus for all Task-capable orchestrators, contrary to
  cheap-first policy;
- provider tests exercise bare aliases rather than current pinned IDs;
- integration tests check allowed model sets, not semantic distribution; and
- focused tests pass while every reproduction above remains.

`aiwg doctor` reports “Model Pinning: all deployed agents/skills pin specific
model variants” even though deployed skills do not carry a provider-native
model field. Doctor needs semantic, provider-aware validation.

## Provider capability survey

| Provider | Per-agent | Per-skill | Global/run child control | Required AIWG behavior |
| --- | --- | --- | --- | --- |
| Claude Code | Native model and effort | Native, turn-scoped | Environment/per-invocation override | Compile aliases or verified IDs; top-level skill fields |
| Codex | Native standalone TOML | No documented field | Parent/session config | Emit TOML agents; put skill policy on agents |
| GitHub Copilot | Native model field | Not established | Session/Auto | Validate current surface; Auto may force inheritance |
| Cursor | Native exact ID and params | No documented field | Parent | Verify plan/admin fallback |
| Factory | Native model, effort, complexity | No portable native field | Light/Medium/Heavy and org policy | Prefer native complexity tiers |
| OpenCode | Native `provider/model-id` | Unknown fields ignored | Global primary | Compile agent only; use installed catalog |
| Warp/Oz | Saved profile/run model | No | Profile or run | Report run-wide/global-only |
| Windsurf/Devin | No portable custom-child field found | No | UI-selected main model | Report unsupported; do not claim enforcement |
| OpenClaw | Native global/per-agent/per-spawn | No documented field | Yes | Write subagent config; verify resolved metadata |
| Hermes | No heterogeneous per-child field | No | One delegation model/provider | Set a global cheap default; report degradation |
| OpenHuman | TOML Inherit/Exact/Hint | Not established | Router/provider defaults | Compile semantic hints where stable |

### Authoritative sources

- [Claude Code subagents](https://code.claude.com/docs/en/sub-agents) and
  [skills](https://code.claude.com/docs/en/skills)
- [Codex subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents)
  and [skills](https://learn.chatgpt.com/docs/build-skills.md)
- [GitHub Copilot custom agents](https://docs.github.com/en/copilot/reference/custom-agents-configuration)
  and [CLI reference](https://docs.github.com/en/copilot/reference/copilot-cli-reference/cli-command-reference)
- [Cursor subagents](https://cursor.com/docs/subagents.md)
- [Factory custom droids](https://docs.factory.ai/cli/configuration/custom-droids)
  and [model selection](https://docs.factory.ai/cli/user-guides/choosing-your-model)
- [OpenCode agents](https://opencode.ai/docs/agents) and
  [skills](https://opencode.ai/docs/skills/)
- [Warp agent profiles](https://docs.warp.dev/agent-platform/capabilities/agent-profiles-permissions)
- [Windsurf/Devin skills](https://docs.devin.ai/desktop/cascade/skills)
- [OpenClaw subagents](https://docs.openclaw.ai/tools/subagents)
- [Hermes delegation](https://hermes-agent.nousresearch.com/docs/user-guide/features/delegation)
- [OpenHuman agent definition source](https://github.com/tinyhumansai/openhuman/blob/main/src/openhuman/agent/harness/definition.rs#L582-L610)

## Impact assessment

### Users and cost

High. Default inheritance or coding/premium collapse can multiply token cost
across parallel children. The effect grows with fan-out and is least visible on
providers that do not expose resolved child metadata.

### Quality

Medium in both directions. Cheap-first bulk replacement without a reviewed
policy can degrade security, architecture, or complex implementation work.
The chosen design therefore separates default tier, task role, effort, and
escalation rather than equating every task with one model family.

### Compatibility

Medium-high. Existing project/user v1 configs, direct CLI overrides, and
provider-specific artifacts need a compatibility parser and a staged migration.

### Operations

Medium. Exact model catalogs are volatile and account-dependent. Provider
capability and model catalog refresh need separate ownership and timestamps.

### Security

Medium. A provider fallback may silently switch models with different tool,
context, or policy characteristics. Deployment must report fallback semantics,
and sensitive/premium paths need explicit validation.

## Options

| Option | Cost control | Provider correctness | Maintainability | Decision |
| --- | ---: | ---: | ---: | --- |
| Keep pinned Claude IDs | Low | Low | Low | Reject |
| Make every child inherit | Low | Medium | High | Reject |
| Bulk rewrite most files to Haiku | Medium | Low | Low | Reject |
| Provider-neutral policy compiled per target | High | High | High | Accept |
| Universal runtime router immediately | Potentially high | Low today | Low | Defer |

## Required work

The implementation is decomposed in
[the remediation plan](../planning/model-routing-remediation-plan.md). #1185
should remain open as the parent until:

- the shared resolver is used by every deploy path;
- provider capabilities and transformations are explicit;
- model CLI mutation is functional and testable;
- the corpus meets cheap-first policy; and
- provider conformance and live-resolution evidence are recorded.

## Confidence and limitations

Repository defect findings are high confidence and locally reproducible.
Provider surface findings are high confidence for Claude, Codex, Factory,
OpenCode, OpenClaw, and Hermes; medium for Copilot, Cursor, Warp, Windsurf, and
OpenHuman where plan, admin, early-beta, or public-documentation limits apply.

The audit does not claim that a configured model pin is honored until a target
provider exposes or a smoke test observes the resolved model.
