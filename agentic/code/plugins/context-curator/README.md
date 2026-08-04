# Context Curator Addon

Context curation and distractor filtering for production-grade agent reliability.

## Research Foundation

**REF-002**: Roig (2025) "How Do LLMs Fail In Agentic Scenarios?"

**Archetype 3: Distractor-Induced Context Pollution**

> "Irrelevant but superficially relevant information derails reasoning. The 'Chekhov's gun' effect—if data is present, models assume it must be relevant."

### Empirical Finding

Across all model tiers (32B to 671B parameters), agents failed when:

- Task requested Q4 data, but context included Q1-Q3
- Entity filter specified, but similar entities remained in context
- Scope was time-bounded, but historical data was included

Even DeepSeek V3.1 (92% success rate overall) showed degraded performance on distractor-heavy tasks.

## Components

### Agent: context-curator

Pre-filters context before task execution, scoring relevance and marking distractors.

```bash
# Deploy
aiwg use context-curator

# Usage
Task(subagent_type="context-curator", prompt="
  Task: Calculate Q4 revenue for Product A
  Context: [large dataset with Q1-Q4 data]
")
```

### Rules

Deployable `.claude/rules/` files for runtime guidance:

- **distractor-filter.md**: Context classification protocol
- **scoped-reasoning.md**: Scope enforcement patterns

### Prompts

Importable prompt templates:

- **context-classification.md**: RELEVANT/PERIPHERAL/DISTRACTOR scoring
- **scope-enforcement.md**: Boundary validation patterns

## Usage

### Installation

```bash
# Add to project
aiwg use context-curator

# Or include with other frameworks
aiwg use sdlc --with context-curator
```

### Agent Usage

```python
# Pre-filter context before complex task
Task(
  subagent_type="context-curator",
  prompt="""
    Task Scope:
    - Time range: Q4 2024
    - Entity filter: Product A only
    - Operation: Revenue aggregation

    Context to classify:
    [paste or reference context]

    Output: Relevance-scored sections with RELEVANT/PERIPHERAL/DISTRACTOR labels
  """
)
```

### Rule Deployment

Rules are automatically deployed to `.claude/rules/` and apply globally:

```
.claude/rules/
├── distractor-filter.md     # Context classification
└── scoped-reasoning.md      # Scope enforcement
```

## Context Classification Protocol

### Categories

| Category | Definition | Action |
|----------|------------|--------|
| **RELEVANT** | Directly supports the task | Process first |
| **PERIPHERAL** | May be useful for edge cases | Process if needed |
| **DISTRACTOR** | Similar but out of scope | Never incorporate |

### Classification Criteria

**RELEVANT** when:

- Matches explicit time range in task
- Matches explicit entity filter in task
- Required for the specified operation

**PERIPHERAL** when:

- Same entity, different time period
- Same time period, different entity
- Reference material for context

**DISTRACTOR** when:

- Different entity AND different time period
- Contradicts task scope
- Historical data when current requested
- Future projections when historical requested

### Example

```markdown
Task: "Calculate Q4 2024 revenue for Product A"

Context Classification:
- ✓ RELEVANT: Q4 2024 Product A sales records
- ~ PERIPHERAL: Q4 2024 Product B sales (same period)
- ~ PERIPHERAL: Q3 2024 Product A sales (same product)
- ✗ DISTRACTOR: Q1-Q2 2024 Product B sales (wrong both)
- ✗ DISTRACTOR: 2023 annual summary (wrong year)
```

## Integration with Agent Design Bible

This addon implements **Rule 6: Scoped Context** from the Agent Design Bible:

> "Only process information relevant to the current task."

The distractor filter rules automatically apply when Claude works with any context, providing a "belt and suspenders" approach:

1. **Rules**: Runtime guidance (always active)
2. **Agent**: Explicit pre-filtering for large contexts

## Success Metrics

From the Unified Production Plan:

| Metric | Target | Measurement |
|--------|--------|-------------|
| Distractor error reduction | ≥50% | KAMI-style benchmark |
| Context classification accuracy | >90% | Manual audit |
| False positive rate | <5% | Relevant marked as distractor |

## References

- [REF-002: Roig (2025)](~/.local/share/ai-writing-guide/docs/references/REF-002-llm-failure-modes-agentic.md)
- [Agent Design Bible - Rule 6](~/.local/share/ai-writing-guide/docs/AGENT-DESIGN.md#rule-6-scoped-context)
- [Gap Analysis](~/.local/share/ai-writing-guide/.aiwg/planning/roig-2025-gap-analysis.md)
