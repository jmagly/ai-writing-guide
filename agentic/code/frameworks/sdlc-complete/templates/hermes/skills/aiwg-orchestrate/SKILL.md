---
namespace: aiwg
platforms: [all]
name: aiwg-orchestrate
description: Route structured artifact work to AIWG workflows via MCP with zero parent context cost
version: 1.1.0
author: aiwg
license: MIT
metadata:
  hermes:
    tags: [aiwg, sdlc, artifacts, delegation, mcp]
---

## When to Use

Use when the user asks for:
- A requirements document, architecture decision record, test plan, or risk register
- A multi-step workflow with persistent output in `.aiwg/`
- Template-driven structured documents
- Recovery-oriented staged execution with checkpoints

Do NOT use for one-off questions, short tasks, or conversational replies.

## Procedure

1. Confirm the task needs a persistent AIWG artifact
2. Identify the workflow through `discover` / `flow-list`; execute through `command-run` or the opt-in Flow tools
3. Use `delegate_task` to isolate the AIWG interaction:

```
delegate_task(
    goal="Run AIWG workflow: [workflow-name] for [description]. Save artifact to .aiwg/[category]/[filename].md",
    context="Project: [project name]. Key constraint: [if any]."
)
```

Note: Child agents automatically exclude context files (AGENTS.md, SOUL.md) and memory
(MEMORY.md, USER.md) — this is hardcoded behavior, not configurable per-call.
The delegation model is set globally in `~/.hermes/config.yaml` under `delegation.model`.

4. When the child returns, extract: artifact path + one-sentence summary
5. Store in MEMORY.md: `[date] Created [type] at [path]: [summary]`
6. Report the result to the user with the artifact path

## Context Cost

| Approach | Parent context cost |
|---|---|
| Direct MCP calls | 3,000-8,000 tokens per workflow |
| This skill (delegate_task) | ~150-250 tokens per workflow |

Over a session with 5 workflows: 1,250 tokens vs. 40,000 tokens.

## Memory Rule

Store in MEMORY.md:
```
[YYYY-MM-DD] Created [artifact-type] at [path]: [one-sentence summary]
```

Never store artifact body content in memory. The artifact lives in `.aiwg/` — use `artifact-read` to access it.

## Pitfalls

- Do NOT load artifact content into parent context after delegation — defeats the purpose
- Do NOT skip delegation for "quick" AIWG calls — even small tool results accumulate
- Context isolation is automatic in delegate_task — child agents never see AGENTS.md or memory files

## Verification

After delegation returns:
1. Confirm the artifact path exists under `.aiwg/`
2. Confirm the summary accurately describes the artifact
3. If the user asks to see the artifact, use `artifact-read` (not memory recall)

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — SDLC framework context and workflow catalog
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-bloat.md — Minimizing context cost via delegation
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md — Focused subagent delegation patterns
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/implicit-dependencies.md — Passing required context to delegated agents
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG workflow commands
