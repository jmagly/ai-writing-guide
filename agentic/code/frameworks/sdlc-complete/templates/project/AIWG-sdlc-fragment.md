<!-- AIWG Fragment: sdlc-complete -->
<!-- Assembled from aiwg-sections/ — do not edit manually -->
<!-- Source: agentic/code/frameworks/sdlc-complete/templates/aiwg-sections/ -->

## AIWG SDLC Framework

This project uses the **AIWG SDLC framework** for software development lifecycle management.

### What is AIWG?

AIWG is a comprehensive SDLC framework providing:

- **{{AGENTS_COUNT}} specialized agents** covering all lifecycle phases (Inception → Elaboration → Construction → Transition → Production)
- **{{SKILLS_COUNT}} skills** for project management, security, testing, deployment, and traceability
- **100+ templates** for requirements, architecture, testing, security, deployment artifacts
- **Phase-based workflows** with gate criteria and milestone tracking
- **Multi-agent orchestration** patterns for collaborative artifact generation

### Installation and Access

**AIWG Installation Path**: `{AIWG_ROOT}`

**Provider Access**: Supported providers load AIWG context through their generated bootstrap and use the kernel/discovery surface to fetch canonical skills on demand.

**Verify Installation**:

```bash
# Check AIWG is accessible
ls {AIWG_ROOT}/agentic/code/frameworks/sdlc-complete/

# Available resources:
# - agents/     → {{AGENTS_COUNT}} agents
# - skills/     → {{SKILLS_COUNT}} skills
# - templates/  → 100+ artifact templates
# - flows/      → Phase workflow documentation
```

### Project Artifacts Directory: .aiwg/

All SDLC artifacts (requirements, architecture, testing, etc.) are stored in **`.aiwg/`**:

```text
.aiwg/
├── intake/              # Project intake forms
├── requirements/        # User stories, use cases, NFRs
├── architecture/        # SAD, ADRs, diagrams
├── planning/            # Phase and iteration plans
├── risks/               # Risk register and mitigation
├── testing/             # Test strategy, plans, results
├── security/            # Threat models, security artifacts
├── quality/             # Code reviews, retrospectives
├── deployment/          # Deployment plans, runbooks
├── team/                # Team profile, agent assignments
├── working/             # Temporary scratch (safe to delete)
└── reports/             # Generated reports and indices
```

## Provider-Neutral SDLC Orchestrator Role

The active provider coordinates SDLC workflows through canonical skills. Skills and their referenced playbooks/templates are authoritative; generated commands are provider adapters or compatibility shims.

### Your Orchestration Responsibilities

When users request SDLC work in natural language or through an adapter command:

1. Apply the `sdlc-right-sizing` rule and choose the lightest sufficient workflow.
2. Consult the always-loaded `sdlc-quickref` kernel skill.
3. If the quickref does not already identify the capability, run:

   ```bash
   aiwg discover "<SDLC capability or workflow>"
   aiwg show skill <name>
   ```

4. Follow the selected skill's inputs, outputs, gates, references, and executable playbook where present.
5. Use current-provider delegation mechanics for independent work and synthesize results before baselining artifacts.

Do not treat `.claude/commands/flow-*.md` or any other deployed provider command directory as the canonical workflow source. An explicit `/flow-*` request maps to the same-named canonical skill before execution.

### Natural Language Discovery Examples

| User says | Discovery phrase |
|---|---|
| "Let's transition to Elaboration" | `SDLC transition to Elaboration` |
| "Start security review" | `SDLC security review cycle` |
| "Create architecture baseline" | `SDLC architecture baseline` |
| "Run iteration 5" | `SDLC iteration dual track` |
| "Where are we?" | `project status` |

Do not enumerate workflow names from memory. Surface the discovered skill and fetch it with `aiwg show skill` before acting.

### Multi-Agent Workflow Pattern

When the canonical skill calls for collaborative artifact generation, use this logical pattern:

```text
Primary Author → Independent Reviewers → Synthesizer → Baseline/Archive
```

Use the current provider's native agent/delegation primitives, respect configured parallelism limits, and consult steward guidance when provider mechanics differ. Claude `Task` calls are one possible provider implementation, not a provider-neutral requirement.

### Progress and Gates

Communicate completed work, current work, blockers, decisions, gates, and artifact locations. Preserve human-authorization and phase-gate requirements from the canonical skill. For substantial workflows, briefly confirm the interpreted outcome and selected skill before beginning.

### Adapter Compatibility

Provider adapters may expose familiar names such as `/flow-inception-to-elaboration`, `/project-status`, or `/intake-wizard`. These are convenience invocation surfaces only:

- Resolve the adapter to the same-named canonical skill.
- Fetch current behavior through `sdlc-quickref` or `aiwg discover` → `aiwg show skill`.
- If adapter text conflicts with the skill, the skill wins and the adapter should be regenerated or repaired.
- Apply `--guidance` and `--interactive` only where the canonical skill declares them.

## Discover-First Protocol (CRITICAL)

### Classify each turn FIRST: new directive vs continuation

Before responding to any user message, classify it:

- **New directive** — a fresh task, often pasted as data: an `address-issues` tracker table, an issue list, a command name, a flow name, "now do X". This is the common first-turn case.
- **Continuation** — extends work already in flight.

When a message **names or references an AIWG command/capability** — even if it looks like informational content (a tracker table, an issue list, a flow name) — treat it as a **new directive** and ACT: run `aiwg discover`, fetch with `aiwg show`, and invoke the capability. Do **NOT** ask "what would you like me to do with these?" when the action is implied by the content. A pasted `address-issues #1234 #1235` table means *run the address-issues workflow on those issues* — discover it and do it, don't ask.

Ask a clarifying question only when the directive is genuinely ambiguous (could be two different tasks) — never as a reflex to avoid acting.

### Before declining or improvising

Beyond the new-directive case, you MUST also consult AIWG's artifact index before declining a request as "outside AIWG's scope" or improvising a workflow from training data.

AIWG ships ~400 skills, ~190 agents, ~70 commands, and ~60 rules across its installed frameworks. Most are NOT loaded into your context — they live at the install location and reach you via two CLI commands:

```bash
aiwg discover "<paraphrased user need>"
aiwg show <type> <name>          # e.g. aiwg show skill flow-deploy-to-production
```

### When to run discover

You MUST run `aiwg discover` when any of the following is true:

- A new directive **names or references an AIWG command/capability** (e.g. an `address-issues` tracker, an `issue-audit` request, a `flow-*` name) — discover it and act, even when it arrives as a pasted table or list
- You are about to tell the user "AIWG doesn't have a way to do that"
- You are about to write a custom workflow / script / procedure from scratch
- The user's request mentions AIWG, a framework name (sdlc, research, forensics, ops, security-engineering, marketing, media-curator, knowledge-base), or capability keywords (skill, agent, command, rule, workflow, flow, template, addon)
- You are uncertain whether a curated AIWG artifact already addresses the request

**Deployed commands are discoverable.** Commands AIWG deploys to your provider's command directory (`.opencode/command/*.md`, `.claude/commands/*.md`, `~/.codex/prompts/*.md`, …) are indexed: `aiwg discover "<name>"` returns them and `aiwg show command <name>` fetches the body. If a deployed command isn't surfacing, the framework capability index may be unbuilt — `aiwg discover` rebuilds it from `$AIWG_ROOT` automatically (a stale "no matches" is a bug, not a signal that the command is absent).

You MAY skip discover only when:

- The user named a specific skill/command (e.g. `/flow-deploy-to-production`)
- The capability is clearly outside AIWG's scope (weather, translation, unrelated programming)
- You already ran `aiwg discover` for the same need this session
- A loaded quickref directly names the skill the user needs

### Discover-first, NOT filesystem-first

When the user's request mentions an AIWG keyword, `aiwg discover` is your FIRST tool call — not `Grep` / `Glob` / `Read` against provider directories like `.claude/`, `.codex/`, `.factory/`, `.warp/`, `.windsurf/`, `~/.openclaw/`, or `~/.hermes/`.

Filesystem search against those paths is FORBIDDEN as a first move for AIWG-internal lookups. The reason: the discover index covers 10x the surface area that any single provider directory holds, and gives you ranked results with capability summaries. Grep gives you a literal-string hit and stops.

### After discover returns a match

Use `aiwg show <type> <name>` to fetch the body — never `Read` on the returned path, never `find` / `ls` against the corpus directory. The CLI handles the read; you handle the application.

### Why this matters

Most AIWG skills are not in your context by design — that's how the kernel-skill model keeps your context lean while making the full corpus reachable. Enumerating from memory will miss obvious matches. The cost of running `aiwg discover` is one CLI invocation; the cost of skipping it is recommending a workflow AIWG already has, or declining a request AIWG can already serve.

The full discover-first rule (with detection heuristics, recovery procedure, and integration with other rules) is deployed at the framework's rules path as `skill-discovery.md`. Read it once at session start if you have not already.

## AIWG-Specific Rules

1. **Artifact Location**: All SDLC artifacts MUST be created in `.aiwg/` subdirectories (not project root)
2. **Template Usage**: Always use AIWG templates from `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
3. **Canonical Workflow Source**: Follow the selected skill and any referenced playbook; commands are provider adapters, not authoritative definitions
4. **Phase Gates**: Validate gate criteria before transitioning phases (use `flow-gate-check`)
5. **Traceability**: Maintain traceability from requirements → code → tests → deployment
6. **Guidance First**: Use `--guidance` or `--interactive` to express direction upfront (vs redirecting post-generation)
7. **Parallel Execution**: Run independent work concurrently with provider-native delegation while respecting configured parallelism caps

## Reference Documentation

- **Orchestrator Architecture**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
- **Multi-Agent Pattern**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`
- **Natural Language Translations**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/simple-language-translations.md`
- **SDLC Kernel Quickref**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/sdlc-quickref/SKILL.md`
- **Canonical Orchestrator Skill**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/orchestrate-project/SKILL.md`
- **Canonical Flow Skills**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/flow-*/SKILL.md`
- **Discovery Rule**: `$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/skill-discovery.md`
- **SDLC Framework**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md`
- **Template Library**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/`

## AIWG Self-Maintenance

AIWG maintains itself using its own CLI. Agents should use CLI commands — not manual file operations — for all installation and deployment tasks.

### When to Self-Maintain

| Trigger | Action |
|---------|--------|
| Start of long orchestration session | `aiwg refresh --dry-run` → refresh if needed |
| User asks "is AIWG up to date?" | `aiwg refresh --dry-run` → report + offer refresh |
| `aiwg doctor` shows errors | `aiwg refresh` or invoke AIWG Steward |
| Deploying to a new provider | `aiwg use <framework> --provider <p>` |
| User adds/removes a framework | `aiwg use` / `aiwg remove` |
| Long parallel orchestration needed | `aiwg mc start` + `aiwg mc dispatch` |

> `aiwg sync` is the deprecated alias for `aiwg refresh`. It still works but emits a warning; scheduled for removal after the 2026.5.x stable line.

### Self-Maintenance Agent

For complex maintenance tasks, delegate to the **AIWG Steward** agent:
- Health check + repair: `@aiwg-steward: run full health check`
- Version sync: `@aiwg-steward: ensure latest version deployed`
- Provider migration: `@aiwg-steward: deploy all frameworks to copilot`

### Background Orchestration (Mission Control)

For multi-task orchestrations exceeding a single session:
- Start a session: `aiwg mc start --name "Sprint 4"`
- Dispatch tasks: `aiwg mc dispatch <id> "<task>" --completion "<criteria>"`
- Monitor: `aiwg mc watch` or `aiwg mc status`
- Finish: `aiwg mc stop <id>`

LFD controls apply to long-running Mission Control work: every dispatched
mission needs a measurable verifier, declared iteration/time/token/tool/spend
limits where observable, hypothesis-before-change retry notes, structural
variation after flat cycles, and a budget-exhausted best-output report instead
of random-walk continuation. Eval/holdout missions expose only aggregate
score/probe/status or VOID to workers; private answers and lint details stay
out of optimizer-readable output.

### Orchestrator Pre-Flight (Long Sessions)

Before starting any orchestration session > 30 minutes:
1. `aiwg refresh --dry-run` — check currency
2. `aiwg doctor` — baseline health
3. If issues found: invoke AIWG Steward or run `aiwg refresh`
4. Confirm provider: `aiwg runtime-info`

## Phase Overview

**Inception** (4-6 weeks):

- Validate problem, vision, risks
- Architecture sketch, ADRs
- Security screening, data classification
- Business case, funding approval
- **Milestone**: Lifecycle Objective (LO)

**Elaboration** (4-8 weeks):

- Detailed requirements (use cases, NFRs)
- Architecture baseline (SAD, component design)
- Risk retirement (PoCs, spikes)
- Test strategy, CI/CD setup
- **Milestone**: Lifecycle Architecture (LA)

**Construction** (8-16 weeks):

- Feature implementation
- Automated testing (unit, integration, E2E)
- Security validation (SAST, DAST)
- Performance optimization
- **Milestone**: Initial Operational Capability (IOC)

**Transition** (2-4 weeks):

- Production deployment
- User acceptance testing
- Support handover, runbooks
- Hypercare monitoring (2-4 weeks)
- **Milestone**: Product Release (PR)

**Production** (ongoing):

- Operational monitoring
- Incident response
- Feature iteration
- Continuous improvement

## Quick Start

1. **Find the right workflow**:

   ```bash
   aiwg discover "create or complete project intake"
   aiwg show skill intake-wizard
   ```

2. **Start the selected lifecycle work**:

   ```bash
   aiwg discover "SDLC concept to inception"
   aiwg show skill flow-concept-to-inception
   ```

   Follow the fetched skill with the project's `.aiwg/intake/` artifacts. If the provider exposes a slash-command adapter, it may invoke the same skill but is not the source of workflow behavior.

3. **Check project progress**:

   ```bash
   aiwg discover "project status"
   aiwg show skill project-status
   ```

4. **Progress through phases**:

   Discover and fetch the relevant gate and transition skills, then follow their declared criteria. For example, search for `SDLC Inception gate` and `SDLC transition to Elaboration` rather than assuming provider-specific command paths.

## Common Patterns

**Risk Management** (run weekly or when risks identified):

```bash
# Natural language
User: "Update risks with focus on technical debt"

# Or explicit command
/flow-risk-management-cycle --guidance "Focus on technical debt"
```

**Architecture Evolution** (when architecture changes needed):

```bash
# Natural language
User: "Evolve architecture for database migration"

# Or explicit command
/flow-architecture-evolution database-migration --interactive
```

**Security Review** (before each phase gate):

```bash
# Natural language
User: "Run security review for SOC2 audit prep"

# Or explicit command
/flow-security-review-cycle --guidance "SOC2 audit prep, focus on access controls"
```

**Test Execution** (run continuously in Construction):

```bash
# Natural language
User: "Execute integration tests with 5 minute timeout"

# Or explicit command
/flow-test-strategy-execution integration --guidance "Focus on API endpoints, <5min execution time target"
```

## Troubleshooting

**Template Not Found**:

```bash
# Verify AIWG installation
ls $AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/

# Set environment variable if installed elsewhere
export AIWG_ROOT=/custom/path/to/ai-writing-guide
```

**Agent Access Denied**:

- Check `.claude/settings.local.json` has read access to AIWG installation path
- Verify path uses absolute path (not `~` shorthand for user home)

**Command Not Found**:

```bash
# Deploy the framework and provider adapters to the project
aiwg use sdlc

# Verify canonical discovery
aiwg discover "SDLC project orchestration"
aiwg show skill orchestrate-project
```

**Disable AIWG context**:

```bash
# Temporarily remove AIWG from context (does not uninstall)
aiwg hook-disable

# Re-enable
aiwg hook-enable
```

## Resources

- **AIWG Repository**: https://github.com/jmagly/aiwg
- **Framework Documentation**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md`
- **Phase Workflows**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/flows/`
- **Template Library**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/`
- **Agent Catalog**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/`

## Support

- **Issues**: https://github.com/jmagly/aiwg/issues
- **Discussions**: https://github.com/jmagly/aiwg/discussions
- **Documentation**: https://github.com/jmagly/aiwg/blob/main/README.md
