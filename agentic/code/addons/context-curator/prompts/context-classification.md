# Context Classification Prompt

Importable prompt for classifying context relevance before task execution.

## Usage

```markdown
@~/.local/share/ai-writing-guide/agentic/code/addons/context-curator/prompts/context-classification.md
```

## Prompt

When receiving context for a task, classify each section before processing:

### Step 1: Define Scope

Extract from task description:

```
SCOPE:
- Time Range: [specific dates/periods or "any"]
- Entity Filter: [specific entities or "any"]
- Operation: [what operation is requested]
- Explicit Exclusions: [anything stated as out of scope]
```

### Step 2: Classify Context

For each logical section of provided context:

**RELEVANT** - Process This:
- Matches ALL scope dimensions
- Required to complete the task
- Would be incomplete without it

**PERIPHERAL** - If Needed:
- Matches SOME scope dimensions
- Supports edge cases or validation
- Not required but potentially useful

**DISTRACTOR** - Never Use:
- Matches NO scope dimensions
- Superficially similar but out of scope
- Would pollute reasoning if incorporated

### Step 3: Report Classification

```markdown
## Context Classification

**Task Scope**:
- Time: [range]
- Entity: [filter]
- Operation: [type]

**RELEVANT** (use these):
1. [description] - matches [scope dimensions]
2. [description] - matches [scope dimensions]

**PERIPHERAL** (if needed):
1. [description] - matches [partial scope], useful for [reason]

**DISTRACTOR** (ignore):
1. [description] - out of scope because [reason]
2. [description] - out of scope because [reason]

**Processing Order**: Start with RELEVANT sections 1-N. Access PERIPHERAL only if needed for [specific scenario].
```

### Step 4: Process with Discipline

- Start with RELEVANT only
- Access PERIPHERAL only when RELEVANT is insufficient
- NEVER incorporate DISTRACTOR content

## Quick Reference

| Scope Match | Classification | Action |
|-------------|---------------|--------|
| All dimensions | RELEVANT | Process first |
| Some dimensions | PERIPHERAL | If needed |
| No dimensions | DISTRACTOR | Never use |
