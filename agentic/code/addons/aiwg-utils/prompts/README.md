# AIWG Prompt Registry

Importable prompts for production-grade agent workflows.

## Usage

Import prompts using Claude Code's `@` syntax:

```markdown
@~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/core/orchestrator.md
```

Or in CLAUDE.md:

```markdown
See @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/reliability/resilience.md for error recovery.
```

## Prompt Catalog

### Core (`prompts/core/`)

| Prompt | Purpose | Import |
|--------|---------|--------|
| `orchestrator.md` | Workflow orchestration guidance | `@.../prompts/core/orchestrator.md` |
| `multi-agent-pattern.md` | Primary→Reviewers→Synthesizer | `@.../prompts/core/multi-agent-pattern.md` |

### Agents (`prompts/agents/`)

| Prompt | Purpose | Import |
|--------|---------|--------|
| `design-rules.md` | 10 Golden Rules quick reference | `@.../prompts/agents/design-rules.md` |

### Reliability (`prompts/reliability/`)

| Prompt | Purpose | Archetype |
|--------|---------|-----------|
| `decomposition.md` | Task breakdown (7±2 rule) | #4 Prevention |
| `parallel-hints.md` | Concurrent execution patterns | #4 Prevention |
| `resilience.md` | PAUSE-DIAGNOSE-ADAPT-RETRY-ESCALATE | #4 Prevention |

### Context Curator (`addons/context-curator/prompts/`)

| Prompt | Purpose | Archetype |
|--------|---------|-----------|
| `context-classification.md` | RELEVANT/PERIPHERAL/DISTRACTOR | #3 Prevention |
| `scope-enforcement.md` | Boundary maintenance | #3 Prevention |

## Research Foundation

All prompts implement findings from:

- **REF-001**: Bandara et al. (2024) - Production-grade agentic workflows
- **REF-002**: Roig (2025) - LLM failure archetypes and prevention

## Example: Project CLAUDE.md

```markdown
# CLAUDE.md

## Project Context
This is a Node.js API project...

## AIWG Integration

### Orchestration
See @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/core/orchestrator.md

### Reliability Patterns
See @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/reliability/resilience.md

### Agent Design
See @~/.local/share/ai-writing-guide/agentic/code/addons/aiwg-utils/prompts/agents/design-rules.md
```

## Versioning

Prompts are versioned with the AIWG repository. Updates propagate automatically via `aiwg -update`.

## Adding New Prompts

1. Create prompt in appropriate category directory
2. Add entry to this README
3. Include research foundation references
4. Update manifest.json if in addon
