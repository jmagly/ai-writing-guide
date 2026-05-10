# AIWG Utilities Rules Index

Core meta-utility rules for agent coordination, context management, and platform interaction. Deployed automatically with all AIWG installations (`core: true, autoInstall: true`).

---

## AIWG Utilities Rules (19 rules — active with aiwg-utils addon)

### HIGH

#### no-time-estimates
**Summary**: Never produce wall-clock time estimates in AI-assisted work contexts. Human+AI development velocity is unknowable and varies non-linearly with operator skill, model quality, task decomposability, and centaur configuration. Instead, express effort in agent-oriented units: scope count (atomic deliverables), agent count and roles, parallelism map (parallel vs sequential batches), and pass estimate (iterations to quality gate). Prohibited phrases include "N days/hours/weeks," "expected duration," and "this should be quick."
**When to apply**: Planning, task decomposition, sprint estimation, phase planning, completion reports, responding to "how long will this take?" questions
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/no-time-estimates.md

#### god-session
**Summary**: A single agent that tries to do everything — research, implement, test, document, deploy — is a god session. God sessions are hard to debug, impossible to parallelize, and produce inconsistent results. Agent definitions must have a focused scope of ≤5–7 distinct responsibilities. When an agent discovers adjacent work mid-session, file issues rather than absorbing them.
**When to apply**: Agent definition creation, reviewing agent scope, mid-session scope creep detection, multi-domain task planning
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/god-session.md

#### vague-discretion
**Summary**: Loop termination conditions and quality gates must be concrete and measurable. Vague conditions — "good enough", "zero bugs", "comprehensive", "thorough" — cannot be evaluated consistently and cause infinite loops, premature exits, or wildly varying quality. Replace with specific thresholds, counts, or verifiable outcomes. Every loop must also have a `max-cycles` or `max-iterations` escape hatch.
**When to apply**: Writing skill loop conditions, Ralph completion criteria, phase gate criteria, quality rubrics, any "done when" specification
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md

#### subagent-scoping
**Summary**: Each subagent gets ONE focused task with minimal context. Decompose complex work into parallel subagents rather than overloading one. Prompt budget <20% of context window per subagent. No delegation chains deeper than 2 levels. Spawn many focused subagents over few overloaded ones. When `AIWG_CONTEXT_WINDOW` is set, concurrent parallel count must respect the budget limit.
**When to apply**: Task delegation, subagent spawning, parallel dispatch, orchestrator fan-out, context budget planning
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md

#### instruction-comprehension
**Summary**: Fully parse and confirm understanding of all user instructions before acting. Extract constraints (prohibitions first), then requirements, then preferences. Track multi-part requests to completion. Re-read original instructions on failure instead of guessing. Prevent instruction drift on long tasks by periodically re-checking against original requirements. Never override user preferences with "best practices."
**When to apply**: Every user request, multi-part tasks, specification compliance, instruction drift detection, correction handling
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md

#### research-before-decision
**Summary**: Research codebase, docs, and sources before making technical decisions. Prevents guessing APIs, blind retries, and missing context. Pattern: IDENTIFY > SEARCH > EXTRACT > REASON > ACT > VERIFY. When an action fails, research the root cause instead of retrying with variations (whack-a-mole detection). Read error messages completely — they frequently contain the answer. Check existing project patterns before creating new ones.
**When to apply**: Technical decision-making, API usage, configuration changes, dependency selection, error diagnosis, import resolution
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md

#### skill-discovery
**Summary**: Most AIWG skills are NOT loaded into your context — only the kernel set (framework quickrefs + core utilities). The bulk lives at `<provider-dir>/.aiwg/skills/` and is reachable only through the artifact index. The **discover-first protocol** (Rule 1.5) mandates that `aiwg discover` MUST be the first information-gathering tool call for any query mentioning AIWG, framework names (sdlc/research/forensics/ops/security-engineering/marketing/media-curator/knowledge-base), or capability keywords (skill/agent/rule/command/addon/workflow). Filesystem `Grep`/`Glob`/`Read` against `.claude/`, `.factory/`, `.codex/`, `.warp/`, `.cursor/`, `.windsurf/`, `.opencode/`, `~/.hermes/`, `~/.openclaw/`, or `agentic/code/` is FORBIDDEN for AIWG-related lookups until discover has been consulted. When subagent delegation is available, prefer the `aiwg-finder` subagent. You must also query discover before declining a request as out-of-scope or improvising a custom workflow.
**When to apply**: ANY query mentioning AIWG, a framework name, or a capability keyword (skill/agent/rule/command); before any filesystem search on provider artifact directories; before declining as out-of-scope; before improvising a custom workflow when an AIWG skill might exist
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/skill-discovery.md

#### native-ux-tools
**Summary**: Agents MUST prefer platform-native interaction tools (e.g., AskUserQuestion in Claude Code) over plain text output for interactive questions. Check tool availability before asking, fall back to formatted markdown if unavailable. One question per interaction turn. Includes platform capability matrix for all 8 supported platforms.
**When to apply**: Interactive commands (--interactive flag), decision gates, user confirmations, intake wizards, any agent question
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/native-ux-tools.md

#### human-authorization
**Summary**: Agents must seek explicit human authorization before irreversible or high-stakes actions — especially when those actions are implied by findings rather than explicitly requested. A recommendation is not authorization to act. Covers: removal of artifacts, scope expansion beyond task, closing work items with implied resolution, acting on research findings. Pattern: discover → report → await authorization → act. Agents must proactively recognize scope boundaries; don't rely on system-level friction as the only gate.
**When to apply**: Any action not explicitly stated in the task, removal of files/artifacts/components, scope expansion, closing issues, acting on review findings or recommendations, changes to shared resources
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/human-authorization.md

#### delivery-policy
**Summary**: AIWG projects declare their git workflow in `.aiwg/aiwg.config` `delivery` block (`mode`: direct / feature-branch / pr-required, `default_branch`, `require_ci_green`, `force_push_policy`, `auto_close_issues`). Agents MUST read this before recommending or executing branch/PR/commit actions. `direct` = commit straight to main with `Closes #N`; `feature-branch` = branch only; `pr-required` = branch + PR + review. Use configured `remotes.{primary,issue_tracker,ci}` rather than guessing. Don't ask the user to pick a workflow when the config already answers it.
**When to apply**: Any branch creation, PR opening, push to default_branch, force-push, issue closure via commit message, interactive question about git workflow
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/delivery-policy.md

### MEDIUM

#### context-bloat
**Summary**: Sub-agents should receive only the context directly relevant to their task. Pass file paths (not file contents) when the agent will read files itself. Do not forward conversation history — sub-agents are clean-slate processes. Before dispatching, audit the prompt: if >50% is background rather than task-critical information, trim aggressively. Complements `subagent-scoping` with a cost-focused lens on information quantity.
**When to apply**: Sub-agent prompt construction, orchestrator fan-out, multi-agent chaining, cost optimization reviews
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-bloat.md

#### parallel-then-synthesize
**Summary**: Spawning parallel agents for *related* analytical work that feeds one conclusion often produces lower quality than a single focused agent — coordination overhead and context fragmentation outweigh parallelism benefits. Parallelism is correct when tasks are genuinely independent (each agent's output stands alone). It is counterproductive when the synthesis step requires choosing between conflicting assessments rather than combining complementary outputs.
**When to apply**: Designing parallel dispatch patterns, analytical workflows, deciding when to parallelize vs. single-agent, RLM divide-conquer design
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/parallel-then-synthesize.md

#### implicit-dependencies
**Summary**: Sub-agents must receive all required context explicitly — they have no access to the parent session's conversation, prior agent outputs, or any context not in their prompt. Never assume a sub-agent will "remember" what was discussed earlier. Pass prior outputs explicitly when chaining agents. The inverse of context-bloat: this rule prevents giving too little context.
**When to apply**: Sub-agent prompt construction, agent chaining, orchestrator fan-out, any time prior session knowledge needs to carry forward
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/implicit-dependencies.md

#### context-budget
**Summary**: When `AIWG_CONTEXT_WINDOW` is set in project context, agents must respect the declared context budget for parallel subagent spawning. Opt-in directive with lookup tables: max parallel count scales from 1 (32k) to 20 (512k+). Formula: `max(1, floor(context_window / 50000))`. Includes compaction guidance per tier (aggressive, moderate, standard, relaxed) and per-subagent output size targets.
**When to apply**: Parallel subagent spawning, task scheduling, agent loop batching, orchestrator fan-out on constrained systems
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md

#### diagram-generation
**Summary**: Diagram generation is a standard output alongside every major documentation artifact. Defines required diagram types per artifact (C4 for SAD, ER for data models, sequence for APIs, DFD for threat models). MermaidJS is default; PlantUML for C4/formal UML. Source must be committed alongside rendered output. Max 15 nodes per diagram; split into sub-diagrams if more complex.
**When to apply**: Architecture documentation, threat modeling, API design, deployment planning, any artifact with visual communication needs
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/diagram-generation.md

#### agent-deployment
**Summary**: Rules for working with agent definitions and multi-provider deployment. Covers the agent ecosystem (general-purpose, SDLC, marketing), deployment commands for all 8 platforms, model override configuration, agent metadata structure (YAML frontmatter with name, model, tools, category), tool selection guidelines per task type, and parallel execution patterns with agent isolation.
**When to apply**: Agent definition creation, multi-provider deployment, tool selection for agents, parallel agent execution
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/agent-deployment.md

#### activity-log
**Summary**: Agents must append a single-line entry to `.aiwg/activity.log` after completing any create, update, delete, ingest, deploy, archive, promote, lint, or actioned query operation on AIWG artifacts. Format: `## [YYYY-MM-DD HH:MM] <operation> | <summary>`. Entries are appended only after successful operations; log write failures are non-blocking. Produces a unified cross-framework timeline queryable via `aiwg activity-log`.
**When to apply**: Any agent that writes, removes, or promotes artifacts in `.aiwg/`; post-deploy steps; lint/validation passes; archive operations
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/activity-log.md

#### debug-source-not-output
**Summary**: When debugging in multi-project or monorepo contexts, agents must navigate to the originating source code rather than analyze build artifacts (minified JS, compiled bundles, vendored output). The source project is the right place to investigate; output is downstream of the bug. Detect output paths (`dist/`, `build/`, `node_modules/`, `*.min.*`) and map back to the source project before reasoning.
**When to apply**: Debugging in monorepos, investigating issues in installed npm/cargo packages, tracing errors that surface in compiled artifacts
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/debug-source-not-output.md

#### post-commit-index-refresh
**Summary**: After a successful git commit, check whether artifact indices are configured (`.aiwg/index/`) and rebuild any indices whose source paths were touched by the commit. Stale indices cause `aiwg index query` to return outdated results, mislead downstream agents, and silently corrupt traceability chains.
**When to apply**: Any post-commit step in AIWG-managed projects; agent loops that touch artifact source paths and need fresh index reads downstream
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/post-commit-index-refresh.md

#### soul-enforcement
**Summary**: When `SOUL.md` is present at project root, agents must read it fully and internalize the identity, worldview, and voice it defines before generating any content. The soul takes priority over generic persona defaults — it is not a style guide, it is who the agent is for the duration of the session.
**When to apply**: Any content-generation task in a project with a SOUL.md file; voice/persona handoffs; multi-agent collaborations where consistent identity matters
**Full rule**: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/soul-enforcement.md

---

## Quick Reference by Context

| Task Type | Relevant Rules |
|-----------|---------------|
| **Delegating to subagents** | subagent-scoping, context-budget, instruction-comprehension |
| **Sub-agent prompt construction** | context-bloat, implicit-dependencies, subagent-scoping |
| **Interactive commands** | native-ux-tools, instruction-comprehension |
| **Agent deployment** | agent-deployment |
| **Agent definition scope** | god-session, subagent-scoping |
| **Documentation** | diagram-generation |
| **Research/decisions** | research-before-decision |
| **Skill / capability lookup** | skill-discovery, research-before-decision |
| **Error diagnosis** | research-before-decision, instruction-comprehension |
| **Constrained systems** | context-budget, subagent-scoping |
| **Authorization gates** | human-authorization, native-ux-tools |
| **Scope management** | human-authorization, instruction-comprehension, god-session |
| **Loop/gate conditions** | vague-discretion |
| **Parallel dispatch design** | parallel-then-synthesize, subagent-scoping, context-budget |
| **Activity tracking** | activity-log |
| **Git workflow / branching / PRs** | delivery-policy, human-authorization |
| **Estimation and planning** | no-time-estimates, vague-discretion, subagent-scoping |
| **Debugging in monorepos / output trees** | debug-source-not-output |
| **Post-commit hygiene** | post-commit-index-refresh, activity-log |
| **Identity / voice / persona** | soul-enforcement |

---

*Generated from aiwg-utils manifest.json — 20 rules*
*Full rule files: @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/*
