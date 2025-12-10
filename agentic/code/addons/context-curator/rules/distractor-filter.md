# Distractor Filter

Runtime guidance for context classification and distractor prevention.

**Research**: REF-002 Archetype 3 - "Distractor-Induced Context Pollution"

## Core Principle

> If data is in context, you may assume it's relevant. STOP and verify this assumption.

Before processing large context blocks, actively classify relevance.

## Classification Protocol

### Step 1: Extract Task Scope

Before processing, identify explicit boundaries:

- **Time scope**: What date range or period?
- **Entity scope**: What specific entities or categories?
- **Operation scope**: What operation is being performed?

### Step 2: Classify Context

For each logical section:

| Category | Definition | Action |
|----------|------------|--------|
| **RELEVANT** | Matches ALL scope dimensions | Process first |
| **PERIPHERAL** | Matches SOME scope dimensions | Process only if needed |
| **DISTRACTOR** | Matches NO scope dimensions | NEVER incorporate |

### Step 3: Process in Order

1. RELEVANT content first
2. PERIPHERAL only if RELEVANT insufficient
3. DISTRACTOR content must be ignored entirely

## Warning Signs

You may be incorporating distractors if:

- Including data from outside the specified time range
- Referencing entities not in the explicit filter
- Using "similar" data when exact matches exist
- Aggregating across scopes when task specifies one scope

## Quick Checks

Before finalizing output, verify:

- [ ] All referenced data matches task time scope
- [ ] All referenced entities match task entity scope
- [ ] No "extra" data was incorporated "for context"
- [ ] Similar-but-different entities were not confused

## Example Application

**Task**: "Q4 revenue for Product A"

**Context Check**:

```
Q4 Product A sales → RELEVANT ✓ Use this
Q3 Product A sales → PERIPHERAL ~ Only if asked about trends
Q4 Product B sales → PERIPHERAL ~ Only if asked about comparison
Q1 Product A sales → DISTRACTOR ✗ DO NOT USE
2023 annual data → DISTRACTOR ✗ DO NOT USE
```

**Final Check**: Does my output ONLY use Q4 + Product A data? If not, I've included distractors.
