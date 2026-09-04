# aiwg-utils Overview

aiwg-utils is the core utility addon bundled with every AIWG installation. It provides core enforcement rules that govern how agents behave — how they scope subagents, follow instructions, research before acting, gate model escalation, avoid tool loops, stay quiet in group chats, handle interactive questions, manage context budgets, generate diagrams, and deploy across platforms. These rules are not optional; they are the behavioral foundation on which all other AIWG components operate.

## What's Included

Beyond the rules, aiwg-utils also provides:

- **5 agents**: `context-regenerator`, `aiwg-developer`, `consortium-coordinator`, `self-debug`, `aiwg-steward`
- **9 skills**: `project-awareness`, `schedule`, `soul-create`, `soul-validate`, `soul-enhance`, `soul-apply`, `soul-blend`, `aiwg-sync`, `aiwg-guide`
- **Provider regeneration commands**: provider-native `aiwg-regenerate` prompts or skills across all 12 named integrations, adapted to each provider's command surface
- **Workspace commands**: `workspace-realign`, `workspace-prune-working`, `workspace-reset`
- **@-mention tooling**: `mention-wire`, `mention-validate`, `mention-report`, `mention-lint`
- **Hook management**: `hook-enable`, `hook-disable`, `hook-status`, `hook-regenerate`
- **Importable prompts**: Core orchestration patterns, multi-agent patterns, reliability prompts
- **Supply-chain evidence**: External npm dependency audit reports under `docs/security/supply-chain/external-npm/`

## Core Rules

### HIGH Priority

#### subagent-scoping

Each subagent gets one focused task with minimal context. The rule enforces: prompt budget under 20% of context window per subagent, no delegation chains deeper than 2 levels, parallel subagents over overloaded serial ones. When `AIWG_CONTEXT_WINDOW` is set, concurrent parallel count must respect the budget.

Apply when: delegating tasks, spawning subagents, orchestrator fan-out.

#### instruction-comprehension

Fully parse all user instructions before acting. Extract prohibitions first, then requirements, then preferences. Track multi-part requests to completion. On failure, re-read the original instructions rather than guessing. Prevent instruction drift on long tasks by periodically rechecking against the original.

The rule has one absolute prohibition: never override user preferences with "best practices."

Apply when: every user request, multi-part tasks, specification compliance.

#### research-before-decision

Research the codebase, docs, and existing patterns before making technical decisions. The pattern is: IDENTIFY → SEARCH → EXTRACT → REASON → ACT → VERIFY. When an action fails, diagnose the root cause instead of retrying with variations (the rule calls this "whack-a-mole detection").

Apply when: API usage, configuration changes, dependency selection, error diagnosis, import resolution.

#### escalation-discipline

Summarize before moving above the declared default model tier, confirm Tier 3 explicitly, and never auto-escalate unattended bots to premium tiers. Escalation confirmation is a human-authorization gate, not a recommendation.

Apply when: model-tier routing, budget-sensitive agents, unattended bots, requests for deep/debug/thorough work, high-impact work.

#### tool-quota

Track per-session tool calls, honor `tool_quota` and `loop_detection` declarations, and stop repeating similar failed calls without measurable progress. Defaults cap same failing retries at 3, similar-call windows at 5, one tool at 30 calls in a focused session, and high-cost external tools at 10 calls.

Apply when: unattended bots, tool-heavy sessions, shell retry loops, external fetch loops, agent definitions with `tool_quota`.

#### quiet-mode

Group-chat bots respond only when mentioned, replied to, or invoked by direct command. Multi-bot rooms require yielding to the addressed bot. Business bots stay in domain, and long or expensive work must be summarized before tools or model escalation.

Apply when: Telegram/group-chat bots, multi-bot rooms, direct-message business bots, ambient room listeners.

#### native-ux-tools

Use provider-native interaction tools (e.g., Claude Code's AskUserQuestion) for interactive questions rather than plain text. One question per interaction turn. The capability matrix covers all 13 named provider integrations and falls back to formatted markdown if native tools are unavailable.

Apply when: interactive commands (`--interactive` flag), decision gates, intake wizards.

### MEDIUM Priority

#### context-budget

When `AIWG_CONTEXT_WINDOW` is set, respect the declared budget for parallel subagent spawning. Opt-in directive. Max parallel count scales from 1 (32k context) to 20 (512k+ context) using the formula: `max(1, floor(context_window / 50000))`. Includes compaction guidance and per-subagent output size targets per tier.

Apply when: parallel subagent spawning on constrained systems, agent loop batching.

#### diagram-generation

Diagram generation is a standard output alongside every major documentation artifact. Defines required diagram types per artifact: C4 for SAD, ER for data models, sequence for APIs, DFD for threat models. MermaidJS is the default; PlantUML for C4 and formal UML. Source must be committed alongside rendered output. Maximum 15 nodes per diagram; split into sub-diagrams if more complex.

Apply when: architecture documentation, threat modeling, API design, deployment planning.

#### agent-deployment

Rules for agent definition authoring and multi-provider deployment. Covers: agent metadata structure (YAML frontmatter with `name`, `model`, `tools`, `category`), tool selection guidelines per task type, model override configuration, and parallel execution patterns with agent isolation.

Apply when: creating agent definitions, deploying to multiple providers, selecting tools for agents.

## Rule Index

The rules index is consolidated at deployment time:

```
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/RULES-INDEX.md
```

Full rule files:
```
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/subagent-scoping.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/escalation-discipline.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/tool-quota.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/quiet-mode.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/native-ux-tools.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/context-budget.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/diagram-generation.md
@$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/agent-deployment.md
```

## References

- `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/docs/rules-reference.md` — Per-rule details and examples
- `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/docs/security/supply-chain/external-npm/README.md` — External npm dependency audit index and report templates
- `@$AIWG_ROOT/agentic/code/addons/aiwg-utils/manifest.json` — Full component listing
