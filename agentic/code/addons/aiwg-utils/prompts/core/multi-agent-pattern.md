# Multi-Agent Orchestration Pattern

Standard pattern for artifact generation using coordinated agents.

## Primary → Reviewers → Synthesizer Pattern

```
Primary Author (opus) → Creates initial draft
        ↓
Parallel Reviewers (sonnet) → Independent review
  - Security review
  - Technical review
  - Standards review
  - [Domain-specific review]
        ↓
Synthesizer (sonnet) → Merges feedback into final
        ↓
Archive → .aiwg/[category]/
```

## Implementation

### Step 1: Primary Author

```python
Task(
  subagent_type="[primary-agent]",
  model="opus",
  prompt="""
    Read template: [template-path]
    Read context: [context-sources]

    Create initial draft of [artifact-name]

    Save to: .aiwg/working/[category]/drafts/v0.1-primary-draft.md
  """
)
```

### Step 2: Parallel Reviewers

**CRITICAL**: Launch ALL reviewers in a SINGLE message:

```python
# All in ONE message - enables parallel execution
Task(subagent_type="security-architect", prompt="Review draft at .aiwg/working/.../v0.1-primary-draft.md for security concerns. Save review to .aiwg/working/.../reviews/security-review.md")
Task(subagent_type="test-architect", prompt="Review draft for testability. Save to .aiwg/working/.../reviews/test-review.md")
Task(subagent_type="technical-writer", prompt="Review draft for clarity. Save to .aiwg/working/.../reviews/clarity-review.md")
Task(subagent_type="requirements-analyst", prompt="Review for requirements coverage. Save to .aiwg/working/.../reviews/requirements-review.md")
```

### Step 3: Synthesizer

```python
Task(
  subagent_type="documentation-synthesizer",
  prompt="""
    Read all reviews from: .aiwg/working/[category]/reviews/
    Read original draft: .aiwg/working/[category]/drafts/v0.1-primary-draft.md

    Synthesize feedback:
    - Incorporate all approved suggestions
    - Document rejected suggestions with rationale
    - Resolve any conflicting feedback

    Output BASELINED document to: .aiwg/[category]/[artifact-name].md
  """
)
```

## Progress Communication

Update user throughout:

```
✓ = Complete
⏳ = In progress
❌ = Error/blocked

Example:
✓ Initialized workspaces
⏳ Primary draft (Architecture Designer)...
✓ Draft v0.1 complete (3,245 words)
⏳ Launching parallel review (4 agents)...
  ✓ Security Architect: APPROVED with suggestions
  ✓ Test Architect: CONDITIONAL (add performance test strategy)
  ✓ Requirements Analyst: APPROVED
  ✓ Technical Writer: APPROVED (minor edits)
⏳ Synthesizing final document...
✓ BASELINED: .aiwg/architecture/software-architecture-doc.md
```

## Reviewer Output Format

Each reviewer should produce:

```markdown
# [Review Type] Review

**Reviewer**: [Agent Name]
**Artifact**: [What was reviewed]
**Date**: [Timestamp]

## Verdict: [APPROVED | CONDITIONAL | REJECTED]

## Findings

### Must Address (Blocking)
- [Finding with specific location]

### Should Address (Important)
- [Finding with specific location]

### Consider (Optional)
- [Suggestion]

## Positive Observations
- [What was done well]

## Summary
[Brief overall assessment]
```

## When to Use This Pattern

- Creating new SDLC artifacts (SAD, ADRs, test plans)
- Generating documentation that needs multi-perspective validation
- Any deliverable requiring quality gates

## When NOT to Use

- Simple single-agent tasks
- Real-time operations where latency matters
- When reviewers would have nothing meaningful to add
