# Claude Code Memory System Leverage Analysis

How AIWG can maximize the Claude Code memory hierarchy for production-grade reliability.

## Memory Feature → Unified Plan Mapping

| Memory Feature | Unified Plan Item(s) | Leverage Strategy |
|----------------|----------------------|-------------------|
| **Imports (`@path/to/file`)** | #3 External Prompt Registry | **NATIVE SUPPORT** - Import from `~/.local/share/ai-writing-guide/` |
| **Modular rules (`.claude/rules/`)** | #4 Agent Design Bible | Rules per topic, conditional loading |
| **Path-specific frontmatter** | #1 Decompose Helper, #10 Linter | Apply rules only when relevant files in scope |
| **User-level rules (`~/.claude/rules/`)** | #3 External Prompt Registry | User-specific prompt overrides |
| **Enterprise policy** | Org-wide standards | Company coding standards, security policies |
| **Recursive discovery** | Large repo support | Nested CLAUDE.md per subsystem |
| **CLAUDE.local.md** | Personal preferences | Developer-specific sandbox URLs, test data |

## Critical Insight: #3 External Prompt Registry is NATIVE

The consultant's #3 (External Prompt Registry) is essentially **already implemented** in Claude Code via the import system:

```markdown
# CLAUDE.md (in user project)

# AIWG Framework
@~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/prompts/orchestrator.md
@~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/prompts/phase-gates.md

# Project-specific overrides
@.aiwg/prompts/custom-voice.md
```

**Action**: Instead of building a separate `aiwg-prompts` repo with runtime hooks, we:

1. Organize AIWG prompts into importable chunks
2. Document the import pattern in CLAUDE.md
3. Create `aiwg deploy-prompts` to generate import stubs

## Revised Architecture Using Memory System

### Current AIWG Structure

```
~/.local/share/ai-writing-guide/
├── CLAUDE.md                          # Massive monolithic file
├── agentic/code/frameworks/
│   └── sdlc-complete/
│       ├── agents/                    # 53 agent definitions
│       ├── commands/                  # 48 commands
│       └── templates/                 # 100+ templates
└── docs/
```

### Proposed Memory-Optimized Structure

```
~/.local/share/ai-writing-guide/
├── prompts/                           # NEW: Importable prompt library
│   ├── core/
│   │   ├── orchestrator.md           # Core orchestration patterns
│   │   ├── multi-agent-pattern.md    # Primary→Reviewer→Synthesizer
│   │   └── phase-gates.md            # Gate criteria summaries
│   ├── sdlc/
│   │   ├── inception.md              # Inception phase guidance
│   │   ├── elaboration.md            # Elaboration phase guidance
│   │   ├── construction.md           # Construction phase guidance
│   │   └── transition.md             # Transition phase guidance
│   ├── agents/
│   │   ├── design-rules.md           # Agent Design Bible (condensed)
│   │   └── tool-guidelines.md        # When to use which tools
│   └── reliability/
│       ├── parallel-hints.md         # Parallel execution patterns
│       ├── decomposition.md          # Task decomposition templates
│       └── resilience.md             # Retry/fallback patterns
├── rules/                             # NEW: Deployable .claude/rules/ content
│   ├── agent-validation.md           # Linter rules for agents
│   ├── flow-execution.md             # Flow command patterns
│   └── artifact-standards.md         # .aiwg/ artifact standards
└── agentic/code/frameworks/          # Existing (unchanged)
```

### Project Integration via Imports

User's project `CLAUDE.md` becomes much leaner:

```markdown
# CLAUDE.md

## Project: My App

This is a Node.js application using Express and PostgreSQL.

## AIWG Framework Integration

See @~/.local/share/ai-writing-guide/prompts/core/orchestrator.md for workflow orchestration.
See @~/.local/share/ai-writing-guide/prompts/sdlc/construction.md for current phase guidance.

## Project-Specific Rules

- API endpoints in `src/api/`
- Tests in `test/`
- Use `npm run dev` for local development
```

### Conditional Rules via `.claude/rules/`

AIWG can deploy topic-specific rules:

**`.claude/rules/aiwg-agents.md`** (deployed by `aiwg -deploy-agents`):

```markdown
---
paths: .claude/agents/*.md
---

# Agent Definition Standards

@~/.local/share/ai-writing-guide/prompts/agents/design-rules.md

When creating or modifying agents:
- Single responsibility (one clear purpose)
- 0-1 tools per agent (prefer focused tooling)
- Explicit inputs/outputs in description
- Model tier appropriate to task complexity
```

**`.claude/rules/aiwg-flows.md`** (deployed by `aiwg -deploy-commands`):

```markdown
---
paths: .claude/commands/flow-*.md
---

# Flow Command Standards

@~/.local/share/ai-writing-guide/prompts/core/multi-agent-pattern.md

When executing flows:
- Think parallel first (independent subtasks)
- Use Task tool for multi-agent coordination
- Archive to .aiwg/ when complete
```

## Unified Plan Items: Revised with Memory System

### #3 External Prompt Registry → **SIMPLIFIED**

**Before**: Separate `aiwg-prompts` repo with submodule, runtime hooks

**After**: Importable prompt library in existing AIWG install

| Deliverable | Implementation |
|-------------|----------------|
| Folder structure standard | `~/.local/share/ai-writing-guide/prompts/{core,sdlc,agents,reliability}/` |
| Load-at-runtime hook | **Native via @imports** (no code needed) |
| Versioning & rollback | Standard git (already have) |

**New Success Metric**: All new projects use ≤500 line CLAUDE.md with imports

### #4 Agent Design Bible → **LEVERAGE .claude/rules/**

**Before**: Single `docs/AGENT-DESIGN.md` document

**After**: Modular rules deployed to projects

| Deliverable | Implementation |
|-------------|----------------|
| 10 golden rules | `prompts/agents/design-rules.md` (importable) |
| Cookiecutter generator | `/agent-new` command (unchanged) |
| Automated checklist | `.claude/rules/aiwg-agents.md` with path filter |

**New Success Metric**: Rules auto-apply when Claude works on `.claude/agents/`

### #1 Decompose Helper → **CONDITIONAL RULES**

**Before**: New extension with command and templates

**After**: Importable decomposition prompts + conditional rules

| Deliverable | Implementation |
|-------------|----------------|
| `/task-decompose` command | Keep (triggers decomposition flow) |
| 5 prompt templates | `prompts/reliability/decomposition.md` (atomic→epic) |
| Auto-apply context | `.claude/rules/task-decomposition.md` |

**Path-specific rule**:

```markdown
---
paths: .aiwg/intake/*.md, .aiwg/requirements/*.md
---

# Task Decomposition Guidance

@~/.local/share/ai-writing-guide/prompts/reliability/decomposition.md

When processing intake or requirements, decompose into ≤7 subtasks.
```

### #2 Parallel-Hint System → **MODULAR RULE**

**Before**: Auto-injection into orchestrator templates

**After**: Rule deployed to `.claude/rules/`

| Deliverable | Implementation |
|-------------|----------------|
| Auto-inject block | `.claude/rules/parallel-execution.md` |
| `/multi-run` wrapper | Keep (convenience command) |
| Dry-run preview | Keep (in wrapper) |

**Rule content**:

```markdown
# Parallel Execution Patterns

@~/.local/share/ai-writing-guide/prompts/reliability/parallel-hints.md

CRITICAL: Before executing multi-step workflows:
1. Identify independent subtasks
2. Launch parallel agents in SINGLE message with multiple Task calls
3. Only sequence when dependencies exist
```

### #10 Responsibility Linter → **PATH-FILTERED RULES**

**Before**: `aiwg lint agents` CLI tool

**After**: Lint rules + CLI tool (belt and suspenders)

| Deliverable | Implementation |
|-------------|----------------|
| `aiwg lint agents` | Keep (CI integration) |
| Runtime guidance | `.claude/rules/aiwg-agents.md` with path filter |

When Claude edits agents, the design rules are **automatically in context**.

### #6 Trace Collector → **MINIMAL CHANGE**

The memory system doesn't directly help here. Keep as planned:

- JSON Lines log format
- `/trace-start` command
- Replay viewer CLI

**But**: Add observability prompts to import library for awareness.

### #5 API Adapter → **NO CHANGE**

Memory system is Claude Code specific. API adapter remains for external triggers.

### #8 Consortium Lite → **PROMPT LIBRARY**

Multi-model consensus patterns can be documented in importable prompts:

```markdown
# prompts/reliability/consortium-pattern.md

## Multi-Model Validation Pattern

For critical outputs (architecture decisions, security reviews):
1. Generate initial output
2. Request validation from different model tier
3. Reconcile differences via reasoning
4. Document consensus or escalate divergence
```

## Implementation Priority Adjustment

### Now "Free" (Memory System Provides)

| Item | Was | Now |
|------|-----|-----|
| #3 External Prompt Registry | P2 (Week 6-8) | **P0** (Just reorganize files) |
| Path-filtered rule loading | Not planned | **Native** |
| Conditional context | Not planned | **Native** |

### Simplified by Memory System

| Item | Original Effort | Revised Effort |
|------|-----------------|----------------|
| #4 Agent Design Bible | 3-5 days | 1-2 days (prompts + rules) |
| #2 Parallel-Hints | 2-3 days | 0.5 days (single rule file) |
| #1 Decompose Helper | 3-5 days | 2-3 days (command + prompts) |
| #10 Linter | 3-5 days | 2-3 days (rules provide runtime) |

### Unchanged (Memory System Doesn't Help)

| Item | Reason |
|------|--------|
| #5 API Adapter | External system integration |
| #6 Trace Collector | Runtime instrumentation |
| #7 Evals Framework | Separate infrastructure |
| #8 Consortium Lite | Multi-model orchestration |
| #9 Deploy Generators | Container/K8s tooling |
| #11 Resilience | Runtime patterns |

## Revised Delivery Plan

### Phase 0: Foundation + Memory Architecture (Week 1)

**Squad 1: Prompt Library Reorganization**

- Create `~/.local/share/ai-writing-guide/prompts/` structure
- Extract core patterns from CLAUDE.md into importable chunks
- Document import patterns in USAGE_GUIDE.md

**Squad 2: Rules Deployment**

- Create `.claude/rules/` templates in AIWG
- Add `aiwg deploy-rules` command
- Update `aiwg -deploy-agents` to include agent rules

**Squad 3: Agent Design Bible**

- Write `prompts/agents/design-rules.md` (10 golden rules)
- Create path-filtered `.claude/rules/aiwg-agents.md`
- Update `/agent-new` to reference design rules

### Phase 1: Core Patterns (Week 2-3)

**Squad 4: Decompose + Parallel**

- Write `prompts/reliability/decomposition.md`
- Write `prompts/reliability/parallel-hints.md`
- Create `/task-decompose` command
- Deploy rules for intake/requirements paths

**Squad 5: Linter**

- Build `aiwg lint agents` CLI
- Rules provide runtime coverage (already deployed in Phase 0)
- CI integration

**Squad 6: Trace Collector**

- JSON Lines format
- `/trace-start` command
- Add `prompts/reliability/observability.md` for awareness

### Phase 2: Production Enablers (Week 4-5)

- #5 API Adapter
- #9 Deploy Generators
- Observability integration

### Phase 3: Advanced Patterns (Week 6-8)

- #8 Consortium Lite
- #7 Evals Framework
- #11 Resilience

## New CLI Commands

```bash
# Deploy prompts import stubs to project CLAUDE.md
aiwg deploy-prompts [--mode minimal|standard|full]

# Deploy .claude/rules/ to project
aiwg deploy-rules [--mode sdlc|marketing|both]

# Show current memory configuration
aiwg memory-status

# Validate project memory structure
aiwg validate-memory
```

## Example: Full Project Setup

```bash
# Initialize project with AIWG
aiwg -new

# Deploy agents and rules
aiwg -deploy-agents --mode sdlc
aiwg deploy-rules --mode sdlc

# Result:
my-project/
├── CLAUDE.md                    # Lean, uses imports
├── .claude/
│   ├── agents/                  # Deployed SDLC agents
│   ├── commands/                # Deployed flow commands
│   └── rules/
│       ├── aiwg-agents.md      # Agent design rules (path-filtered)
│       ├── aiwg-flows.md       # Flow execution rules (path-filtered)
│       ├── parallel-execution.md  # Parallel hints (global)
│       └── decomposition.md    # Task decomposition (path-filtered)
├── .aiwg/                       # Artifact storage
└── src/                         # User code
```

## Success Metrics (Revised)

| Metric | Target | Measurement |
|--------|--------|-------------|
| CLAUDE.md size | ≤500 lines | Line count after imports |
| Import coverage | 100% of orchestration docs | Audit import statements |
| Rule deployment | All projects have rules | `aiwg validate-memory` |
| Path filtering | ≥5 path-filtered rules | Rule frontmatter audit |
| Agent lint pass | 100% in CI | GitHub Actions |
| Parallel utilization | >60% on ≥4 subtasks | Trace analysis |
| Trace generation | <3 seconds | Benchmark |

## Open Questions

1. **Import depth limit**: Claude Code limits to 5 hops. Is this enough for AIWG prompt hierarchy?
   - Likely yes: `CLAUDE.md` → `prompts/core/orchestrator.md` → (no further nesting)

2. **Rule priority**: Project rules override user rules. Does this affect AIWG patterns?
   - Action: User customizations in `~/.claude/rules/aiwg-overrides.md`

3. **Enterprise policy**: Should AIWG provide enterprise CLAUDE.md templates?
   - Action: Add `templates/enterprise/CLAUDE.md` for IT deployment

4. **Version sync**: How do prompt library updates propagate?
   - Action: `aiwg -update` already pulls latest; imports get new content automatically

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial memory system leverage analysis |
