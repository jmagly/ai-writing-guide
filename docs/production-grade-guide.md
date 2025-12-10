# Production-Grade AIWG Guide

This guide documents the production-grade improvements to AIWG based on academic research analysis.

## Research Foundation

AIWG production-grade features are grounded in peer-reviewed research:

- **REF-001**: Bandara et al. (2024) ["Production-Grade Agentic AI Workflows"](./references/REF-001-production-grade-agentic-workflows.md) (arxiv 2512.08769)
- **REF-002**: Roig (2025) ["How Do LLMs Fail In Agentic Scenarios?"](./references/REF-002-llm-failure-modes-agentic.md) (arxiv 2512.07497v2)

## Agent Design Bible

The [Agent Design Bible](./AGENT-DESIGN.md) defines 10 Golden Rules for building production-grade agents.

### Quick Reference

| Rule | Name | Key Principle |
|------|------|---------------|
| 1 | Single Responsibility | One agent, one job |
| 2 | Minimal Tools | 0-3 tools per agent |
| 3 | Explicit I/O | Clear inputs and outputs |
| 4 | Grounding First | Verify before acting |
| 5 | Escalate Uncertainty | Never guess silently |
| 6 | Scoped Context | Filter irrelevant data |
| 7 | Recovery-First | Design for failure |
| 8 | Model Tier | Match complexity to task |
| 9 | Parallel-Ready | Enable concurrent execution |
| 10 | Observable | Emit structured logs |

### Agent Linting

Validate agents against the 10 rules:

```bash
# Lint all framework agents
aiwg lint agents

# Lint specific directory with verbose output
aiwg lint agents .claude/agents/ --verbose

# CI-friendly JSON output
aiwg lint agents --json --strict
```

### Agent Scaffolding

Create new agents using validated templates:

```bash
# Simple agent (haiku, minimal tools)
aiwg add-agent code-analyzer --to my-addon --template simple

# Complex agent (sonnet, multiple tools)
aiwg add-agent architecture-reviewer --to my-addon --template complex

# Orchestrator (opus, coordinates other agents)
aiwg add-agent workflow-coordinator --to my-addon --template orchestrator
```

## LLM Failure Mode Mitigations

REF-002 identifies four failure archetypes. AIWG provides specific mitigations:

### Archetype 1: Premature Action Without Grounding

**Problem**: Agent guesses database schema instead of inspecting it.

**Mitigation**: Rule 4 (Grounding First)

```markdown
## Grounding Protocol

Before external operations:
1. List available resources (files, tables, APIs)
2. Verify target exists
3. Inspect structure before manipulation
4. NEVER assume schema from similar names
```

### Archetype 2: Over-Helpfulness Under Uncertainty

**Problem**: Agent substitutes similar entity when target not found.

**Mitigation**: Rule 5 (Escalate Uncertainty)

```markdown
## Uncertainty Protocol

When input cannot be resolved:
1. List candidates with confidence scores
2. Explain why no exact match
3. Ask user to select or provide more context
4. NEVER silently substitute
```

### Archetype 3: Distractor-Induced Context Pollution

**Problem**: Irrelevant data in context causes errors ("Chekhov's gun" effect).

**Mitigation**: Context Curator Addon

```bash
# Deploy context curator
aiwg use sdlc  # Includes context-curator addon
```

The Context Curator agent scores context as:
- **RELEVANT**: Directly needed for current task
- **PERIPHERAL**: May be useful, keep accessible
- **DISTRACTOR**: Remove from active context

### Archetype 4: Fragile Execution Under Load

**Problem**: Agent enters loops, loses coherence, or makes malformed tool calls.

**Mitigation**: Resilience Protocol

```markdown
## PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE

1. **PAUSE**: Stop, preserve state
2. **DIAGNOSE**: Classify error type
3. **ADAPT**: Choose different approach
4. **RETRY**: Max 3 adapted attempts
5. **ESCALATE**: Structured report to user
```

Loop detection triggers when:
- Same tool called 3+ times consecutively
- Same error occurs 2+ times
- Identical outputs from different attempts

## @-Mention Traceability

Claude Code 2.0.43 fixed @-mention loading for nested files. AIWG leverages this for live traceability.

### Conventions

```
# Requirements
@.aiwg/requirements/UC-{NNN}-{slug}.md        # Use cases
@.aiwg/requirements/NFR-{CAT}-{NNN}.md        # Non-functional

# Architecture
@.aiwg/architecture/adrs/ADR-{NNN}-{slug}.md  # Decisions

# Security
@.aiwg/security/TM-{NNN}.md                   # Threats
@.aiwg/security/controls/{id}.md              # Controls

# Code
@src/{path}                                    # Source
@test/{path}                                   # Tests
```

### Code Integration

Add @-mentions to file headers:

```typescript
/**
 * @file Authentication Service
 * @implements @.aiwg/requirements/UC-003-user-auth.md
 * @architecture @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md
 * @security @.aiwg/security/controls/authn-001.md
 * @tests @test/integration/auth.test.ts
 */
```

### Wiring Utilities

```bash
# Analyze codebase and suggest @-mentions
aiwg wire-mentions --dry-run

# Apply high-confidence suggestions
aiwg wire-mentions --auto

# Validate all @-mentions resolve
aiwg validate-mentions --strict

# Lint for style consistency
aiwg mention-lint --fix
```

## Hooks

AIWG hooks integrate with Claude Code 2.0.43+ lifecycle events.

### Trace Hook

Captures agent execution history for debugging and recovery.

```javascript
// .claude/hooks/aiwg-trace.js
// Automatically logs:
// - SubagentStart: agent_id, type, timestamp
// - SubagentStop: agent_id, transcript_path, duration
```

View traces:

```bash
# Tree view
node ~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-hooks/scripts/trace-viewer.mjs tree

# Timeline view
node ~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-hooks/scripts/trace-viewer.mjs timeline
```

### Permission Hook

Auto-approve trusted operations to reduce prompts:

```javascript
// .claude/hooks/aiwg-permissions.js
// Auto-approves:
// - Write to .aiwg/**
// - Read from ai-writing-guide/**
// - Git operations on AIWG branches
```

### Session Hook

Manage named sessions for workflow persistence:

```bash
# Generate session name
node aiwg-session.js suggest inception-to-elaboration
# Output: aiwg-inception-to-elaboration-2025-01-15-1030

# Record session
node aiwg-session.js record aiwg-my-session --workflow security-review

# List recent sessions
node aiwg-session.js list
```

## Prompt Registry

Import prompts directly into CLAUDE.md using @-imports.

### Available Prompts

| Path | Purpose |
|------|---------|
| `prompts/core/orchestrator.md` | Claude orchestrator guidance |
| `prompts/core/multi-agent-pattern.md` | Primary→Reviewers→Synthesizer |
| `prompts/core/consortium-pattern.md` | Multi-expert coordination |
| `prompts/agents/design-rules.md` | Condensed 10 Golden Rules |
| `prompts/reliability/decomposition.md` | Task decomposition templates |
| `prompts/reliability/parallel-hints.md` | Parallel execution patterns |
| `prompts/reliability/resilience.md` | Recovery protocol |

### Usage

In your project's CLAUDE.md:

```markdown
## Orchestration Guidelines

@~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/core/orchestrator.md

## Multi-Agent Pattern

@~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/core/multi-agent-pattern.md
```

## Deploy Generators

Generate production-ready deployment configurations.

```bash
# Docker (multi-stage, non-root, health checks)
/deploy-gen docker --app-name myapp --port 3000

# Kubernetes (SecurityContext, probes, resources)
/deploy-gen k8s --app-name myapp --port 3000

# Docker Compose
/deploy-gen compose --app-name myapp --port 3000
```

Generated configurations include:
- Multi-stage builds (deps → builder → runner)
- Non-root user execution
- Health check endpoints
- Resource limits
- Security contexts
- Anti-affinity rules (K8s)

## Evals Framework

Automated testing for agent behavior against failure archetypes.

### Running Evals

```bash
# Test agent against grounding scenario
/eval-agent my-agent --category archetype --scenario grounding-test

# Test agent against distractor scenario
/eval-agent my-agent --category archetype --scenario distractor-test

# Test recovery behavior
/eval-agent my-agent --category archetype --scenario recovery-test
```

### Scenario Types

| Scenario | Tests | Pass Criteria |
|----------|-------|---------------|
| grounding-test | Archetype 1 | Agent inspects before acting |
| distractor-test | Archetype 3 | Agent ignores irrelevant data |
| recovery-test | Archetype 4 | Agent recovers from errors |

### Creating Custom Scenarios

```yaml
# .aiwg/evals/my-scenario.yaml
name: custom-validation
category: archetype
description: Test custom validation behavior

setup:
  files:
    - path: target.md
      content: |
        # Target Document
        This is the correct target.

validation:
  type: output_contains
  expected: "target.md"
  pass_threshold: 1.0
```

## Agent Personas

Pre-configured agents for common workflows.

### Available Personas

| Persona | Focus | Model | Permissions |
|---------|-------|-------|-------------|
| `aiwg-orchestrator` | Full SDLC orchestration | opus | full |
| `aiwg-reviewer` | Code review | sonnet | write-artifacts |
| `aiwg-security` | Security audit | sonnet | read-only |
| `aiwg-writer` | Documentation | sonnet | write-artifacts |

### Usage

```bash
# Launch with persona
claude --agent aiwg-orchestrator

# Or via AIWG CLI
aiwg --persona orchestrator
```

## Multi-Agent Patterns

### Primary → Reviewers → Synthesizer

Standard pattern for document generation with review:

```
Primary Author (opus) → Creates draft
        ↓
Parallel Reviewers (sonnet) → Independent reviews
        ↓
Synthesizer (sonnet) → Merges feedback
        ↓
Archive → .aiwg/[category]/
```

**Key**: Launch reviewers in SINGLE message for true parallelism.

### Consortium Pattern

Multi-expert coordination with trade-off documentation:

```
Coordinator (opus)
    ↓
Parallel Experts (sonnet) → Independent analysis
    ↓
Trade-off Matrix → Document disagreements
    ↓
Synthesis → Majority + dissent record
```

## Metrics & Targets

Based on REF-002 benchmarks:

| Metric | Target | Source |
|--------|--------|--------|
| Grounding compliance | >90% | Archetype 1 |
| Entity substitution rate | <5% | Archetype 2 |
| Distractor error reduction | ≥50% | Archetype 3 |
| Recovery success rate | ≥80% | Archetype 4 |
| Parallel utilization | >60% | REF-001 BP-9 |

## Quick Start

### New Project

```bash
# Create project with SDLC framework
aiwg -new my-project
cd my-project

# Verify agent linting passes
aiwg lint agents

# Wire @-mentions
aiwg wire-mentions --dry-run
```

### Existing Project

```bash
# Deploy SDLC framework
aiwg use sdlc

# Setup hooks
cp ~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-hooks/hooks/*.js .claude/hooks/

# Generate intake from codebase
/intake-from-codebase .

# Wire @-mentions
aiwg wire-mentions --interactive
```

## References

- [Agent Design Bible](./AGENT-DESIGN.md) - 10 Golden Rules
- [REF-001](./references/REF-001-production-grade-agentic-workflows.md) - Production-Grade Research
- [REF-002](./references/REF-002-llm-failure-modes-agentic.md) - LLM Failure Modes
- [SDLC Framework](../agentic/code/frameworks/sdlc-complete/README.md) - Complete lifecycle
