---
enforcement: medium
paths:
  - ".aiwg/**"
  - "AIWG.md"
  - "**/skills/sdlc-quickref/SKILL.md"
  - "**/skills/orchestrate-project/SKILL.md"
  - "**/commands/flow-*.md"
  - "**/commands/intake-*.md"
  - "**/commands/project-*.md"
---

# SDLC Orchestration Rules

**Enforcement Level**: MEDIUM

These rules apply when selecting or running AIWG SDLC workflows and when maintaining their artifacts, skills, or provider adapters.

## Canonical Workflow Surface

Canonical AIWG skills are the authoritative source of workflow behavior. Start with the always-loaded `sdlc-quickref` kernel skill, then use the provider-neutral discovery pipeline for the specific need:

```bash
aiwg discover "<SDLC capability or workflow>"
aiwg show skill <name>
```

For project-wide lifecycle coordination, prefer `orchestrate-project`. Flow skills such as `flow-inception-to-elaboration`, `flow-security-review-cycle`, and `flow-gate-check` define their own inputs, artifacts, gates, and orchestration behavior. Do not enumerate the SDLC catalog from memory; query the index and fetch the selected skill.

Generated slash commands are provider-specific adapters or compatibility shims. They may expose a convenient invocation surface, but their deployed files are not canonical workflow definitions and must not override the corresponding skill. Do not inspect `.claude/commands/flow-*.md` as the primary source of behavior.

## Provider-Neutral Orchestrator Role

The active provider coordinates SDLC work; it is not tied to Claude Code, a `Task` tool, or any single agent API.

When users request SDLC work:

### 0. Right-size before launching anything

Apply the `sdlc-right-sizing` rule before invoking intake, flow, or phase-transition skills:

- Most changes do not need intake, Inception, or phase-gate flows.
- Issues plus an optional ADR are usually sufficient for small or medium features.
- Reserve intake and full SDLC flows for new addons/frameworks/tracks, cross-module refactors, or work meeting at least two trigger criteria.

If the user did not explicitly request intake or Inception, choose the lightest sufficient artifact set. When a material choice remains, ask one specific question.

### 1. Interpret intent and discover the skill

Translate natural language into a capability phrase, not a hard-coded command path:

- "Let's transition to Elaboration" -> discover `SDLC transition to Elaboration`
- "Start security review" -> discover `SDLC security review cycle`
- "Create architecture baseline" -> discover `SDLC architecture baseline`
- "Run iteration 5" -> discover `SDLC iteration dual track`
- "Where are we?" -> discover `project status`

Use the `sdlc-quickref` directly when it already names the matching canonical skill. Otherwise run `aiwg discover`, surface the selected match, and fetch it with `aiwg show skill` before acting.

### 2. Follow the canonical skill

Treat the selected skill as the workflow contract. Read its inputs, outputs, gates, references, and provider notes. If it delegates executable sequencing to a playbook, treat that playbook as part of the canonical implementation.

Commands retained by a provider are adapters only. Explicit `/flow-*` input from a user still maps to the same-named canonical skill before execution.

### 3. Use provider-native orchestration mechanics

Follow this logical pattern when the selected skill calls for collaborative artifact work:

```text
Primary Author -> Independent Reviewers -> Synthesizer -> Baseline/Archive
```

Use the current provider's supported delegation and parallelism primitives. Consult steward/provider guidance when mechanics differ. Parallelize only independent work, respect the workspace concurrency cap, and synthesize all results before finalizing artifacts. Do not mandate Claude's `Task` syntax in provider-neutral guidance.

### 4. Track progress and communicate

Report completed work, current work, blockers, decisions, and artifact locations in plain provider-supported updates. Preserve phase-gate and human-authorization requirements from the selected skill.

## Natural Language Interface

Users may request phase transitions, iteration work, review cycles, artifact generation, status checks, team processes, deployment, or operations in ordinary language. Natural language is preferred; slash-command familiarity is never required.

Before starting a substantial workflow, briefly confirm the interpreted outcome, name the canonical skill selected through quickref/discovery, summarize expected artifacts or gates, and then proceed. Avoid fixed duration estimates unless the workflow provides evidence for one.

## Adapter Compatibility

Provider adapters may expose names such as `/flow-inception-to-elaboration`, `/project-status`, or `/intake-wizard`. When present:

1. Resolve the adapter name to the same-named canonical skill.
2. Fetch current behavior through the kernel/discovery surface.
3. Use the provider adapter only as an invocation mechanism.
4. If adapter text conflicts with the skill, the canonical skill wins and the adapter should be regenerated or fixed.

Common adapter parameters such as `--guidance` and `--interactive` remain valid only where the canonical skill declares them.

## AIWG-Specific Rules

1. **Artifact Location**: Store SDLC artifacts in the appropriate `.aiwg/` subdirectories.
2. **Canonical Sources**: Use skills and their referenced playbooks/templates from `$AIWG_ROOT/agentic/code/`; do not treat deployed command copies as authoritative.
3. **Agent Orchestration**: Follow the collaboration pattern declared by the selected skill using provider-native mechanics.
4. **Phase Gates**: Validate gate criteria before transitioning.
5. **Traceability**: Maintain requirements -> code -> tests -> deployment links.
6. **Guidance First**: Apply upfront `--guidance` or `--interactive` behavior when the selected skill supports it.
7. **Parallel Execution**: Launch only independent work concurrently and respect configured provider/workspace caps.
8. **Wire-As-You-Go**: Include AIWG @-mentions in generated artifacts according to the active mention-wiring rule.
9. **Complete Docset by Default**: Do not silently skip or abbreviate required artifacts. If an artifact seems low-value, use the selected skill's HITL mechanism to confirm the exception.

## Phase Overview

- **Inception**: Validate the problem, vision, risks, architecture sketch, and business case; target Lifecycle Objective (LO).
- **Elaboration**: Detail requirements, baseline architecture, retire risks, and define test/CI strategy; target Lifecycle Architecture (LA).
- **Construction**: Implement, test, validate security, and tune performance; target Initial Operational Capability (IOC).
- **Transition**: Deploy, complete UAT and support handover, and monitor hypercare; target Product Release (PR).
- **Production**: Operate, monitor, respond to incidents, and evolve the product.

## Reference Documentation

- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/sdlc-quickref/SKILL.md`
- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/orchestrate-project/SKILL.md`
- `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/skill-discovery.md`
- `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/sdlc-right-sizing.md`
- `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/steward/SKILL.md`
- `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
