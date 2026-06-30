---
enforcement: high
---

# Subagent Scoping Rules

**Enforcement Level**: HIGH
**Scope**: All tool-using agents across all platforms
**Addon**: aiwg-utils (core, universal)
**Issue**: #314

## Overview

Prevent context overload when delegating to subagents by enforcing focused, single-purpose invocations with minimal context and explicit output boundaries. Overloading causes context overflow/truncation, degraded output, premature termination, and expensive re-runs.

**Core distinction**: These rules limit what goes INTO each subagent — NOT how many subagents an orchestrator spawns. Spawning 50 focused subagents (one per atomic subtask) is correct; giving one subagent 20 tasks is wrong. The anti-pattern is overload per subagent, never count.

## Mandatory Rules

### Rule 1: Single Responsibility Per Subagent
Each invocation MUST have ONE clear objective. **FORBIDDEN**: one subagent for "review security, improve perf, update docs, write tests." **REQUIRED**: decompose into 4 focused subagents, each with one responsibility.

### Rule 2: Context Minimization
Include only context directly relevant to the task. **FORBIDDEN**: dumping full 50-message history + all 15 module files for a task that only needs one function. **REQUIRED**: pass just the target function, the relevant test section, and the acceptance criteria.

### Rule 3: Task Decomposition Before Delegation
Decompose complex tasks into atomic units before spawning. **FORBIDDEN**: "Implement the entire user registration flow." **REQUIRED**: split into atomic subagents (validate input, duplicate check, hash password, DB insert, send email, build response) — each succeeds/fails independently.

### Rule 4: Parallel Over Sequential Overload
When N related tasks exist, spawn N separate subagents in parallel. **FORBIDDEN**: one subagent "write tests for login, logout, refreshToken, validateSession." **REQUIRED**: 4 parallel test-writing subagents, one per function. If decomposition produces 20 atomic tasks, spawn 20 subagents — the limit is per-subagent input, not count.

### Rule 5: Output Scoping
State exactly what format and scope to return. **FORBIDDEN**: "Analyze the auth system and provide recommendations" (output unspecified). **REQUIRED**: "Identify the top 3 security risks — list of exactly 3, each with name + severity + 1-sentence description, ≤300 words."

### Rule 6: No Deep Recursive Delegation Chains
Subagents must not spawn their own subagents more than 1 level deep. **FORBIDDEN**: `Agent → A → B → C → D` (4 levels). **REQUIRED**: `Agent → A, B, C, D` (1 level, direct subagents only). **Acceptable exception**: 2 levels max (`Agent → A → A.1, A.2`). If deeper decomposition is needed, the parent handles it.

**RLM Mode Exception** (overrides the depth-2 limit): For tasks requiring recursive decomposition beyond 2 levels — data exceeding the context window, the same operation across many files needing >2 levels, recursive synthesis across 3+ levels (corpus → files → sections → paragraphs), or cross-cutting analysis spanning whole codebases/corpora — use **RLM mode** (`/rlm-mode`, `/rlm-query`, `/rlm-batch`) instead of manual chains. See `@$AIWG_ROOT/agentic/code/addons/rlm/README.md`. Research: REF-089 (Zhang et al., 2026) shows RLM's recursive environment interaction is lossless and ~3x cheaper than summarization because the agent selectively accesses only relevant context.

### Rule 7: Context Budget Estimation
Before delegating, estimate whether the task fits comfortably. Use `AIWG_CONTEXT_WINDOW` (if set in the project context file) as available context; otherwise the platform default. See `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md` for the full system.

**Formula**: `Total Estimated = (2k system + X context + Y task + Z output) * 1.2` (20% reasoning buffer). If `Total Estimated > 50%` of available context → decompose further.

**Parallel limits** (when `AIWG_CONTEXT_WINDOW` is set):

| Context Window | Max Parallel Subagents |
|----------------|----------------------|
| ≤64k | 1-2 |
| 65k-128k | 2-4 |
| 129k-256k | 4-8 |
| 257k-512k | 8-12 |
| >512k | 12-20 |
| Unset | No limit (platform decides) |

Formula: `max_parallel = max(1, floor(context_window / 50000))` capped at 20.

### Rule 8: Respect Provider Parallelism Cap
Beyond the context-window cap, `.aiwg/aiwg.config` may declare a **provider-scoped parallelism cap** under the `parallelism` block. Provider rate limits (Anthropic per-key TPM/RPM in particular) — not just window size — bound safe concurrency: a small-plan Claude key with `AIWG_CONTEXT_WINDOW=512000` may still throttle at ~3 concurrent agents.

**REQUIRED**: Before spawning parallel subagents, read `.aiwg/aiwg.config` (resolve via `resolveParallelism()`) and take the **minimum** of all applicable caps:

```
effective_parallel = min(
  parallelism.max_parallel_subagents,    // provider rate-limit cap (#1359)
  context_budget_cap,                    // from AIWG_CONTEXT_WINDOW, if set
  rlm_hard_cap_of_7,                     // RLM Rule 8 (RLM dispatches only)
  natural_task_decomposition             // no point spawning 4 for 2 subtasks
)
```

**Defaults by provider** (auto-written by `aiwg new` / `aiwg use` / `aiwg refresh`):

| Provider | `max_parallel_subagents` | `max_parallel_ralph_loops` | `max_parallel_mc_missions` |
|----------|--------------------------|----------------------------|----------------------------|
| `claude` | 4 | 2 | 4 |
| `codex` / `copilot` / `cursor` / `factory` / `opencode` / `warp` / `windsurf` / `openclaw` / `hermes` | 10 | 3 | 6 |
| unknown | 4 | 2 | 4 |

Override for higher-tier plans: `aiwg config set --project parallelism.max_parallel_subagents 10` (reset with `aiwg config reset --project parallelism`). Composes with `context-budget.md` and `rlm-context-management.md` Rule 8 — the smallest cap wins.

## Detection Patterns

**Overloaded subagent**: truncated output; addresses only 2 of 5 tasks; quality degrades near end; "context too long" error; superficial analysis; re-runs produce different subsets. **Warning signs before delegating**: >3 task verbs; >5 context files; expected output >2000 words / >500 LOC; task contains "and"; "this will take hours" → decompose or minimize first.

## Orchestrator Fan-Out

Spawn many subagents when subtasks are independent (large multi-component feature 10-20+; one per file/function/service/endpoint/doc-section). The decision per subtask: atomic? context minimal (<20% of window)? output scoped? — if yes to all, spawn one subagent per subtask and execute in parallel (in sequential waves if `AIWG_CONTEXT_WINDOW` budget requires), then aggregate. Spawning 50 focused subagents beats 5 overloaded ones.

## Integration with Other Rules

- `instruction-comprehension` — understand the full request before splitting it.
- `research-before-decision` — know what's needed before delegating.
- `anti-laziness` — complete the work by delegating appropriately, not by overloading.

## Platform Applicability

Universal across all AI coding platforms (Claude Code, Codex, Copilot, Cursor, Warp, Factory, OpenCode, Windsurf) and any agent that delegates work.

## Checklist

Before spawning a subagent:
- [ ] Exactly ONE clear objective
- [ ] Context is only what's directly relevant (<20% of window)
- [ ] Output format/scope explicit
- [ ] Task is atomic
- [ ] Similar tasks → separate subagents, not bundled
- [ ] Delegation depth ≤ 2 levels
- [ ] Budget estimated <50% of window; if `AIWG_CONTEXT_WINDOW` set, parallel count within budget AND provider cap (Rule 8)

Before giving one subagent multiple tasks: **STOP** — can these be separate subagents? Document why only if truly inseparable.
Before limiting subagent count: **STOP** — the rules limit per-subagent input, not count; if each is atomic, many subagents is correct.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md — Context budget config and parallel limits
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Understanding requests
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Informed delegation
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md — Complete work without shortcuts
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/tao-loop.md — TAO loop standardization
- @$AIWG_ROOT/agentic/code/addons/rlm/README.md — RLM mode (overrides depth-2 limit)
- `.aiwg/research/findings/REF-089-recursive-language-models.md` — RLM depth trade-offs

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-03-27
