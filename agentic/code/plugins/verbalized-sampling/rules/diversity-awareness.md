---
enforcement: medium
id: diversity-awareness
name: Diversity Awareness
severity: MEDIUM
tier: addon
description: Detect when Verbalized Sampling should be suggested or auto-applied to improve output diversity
---

# Diversity Awareness Rule

**Enforcement Level**: MEDIUM
## Purpose

Ensure agents consider output diversity when generating content, and suggest VS techniques when appropriate.

## When to Apply

This rule activates when:
1. The user requests multiple alternatives, options, or variations
2. The task involves creative generation (naming, taglines, copy, brainstorming)
3. The user expresses dissatisfaction with sameness ("these all sound the same", "need more variety")
4. Synthetic data generation is requested
5. A/B test content is being created

## Behavior

### Detection

Watch for signals indicating diversity is valuable:
- Explicit: "give me options", "alternatives", "different approaches", "brainstorm"
- Implicit: tasks where a single answer is insufficient (naming, creative, exploration)
- Reactive: user feedback about lack of variety

### Response

When diversity signals are detected:

1. **If VS addon is installed and autoApply is true**: Automatically apply the appropriate VS variant
2. **If VS addon is installed and autoApply is false**: Suggest using VS with a recommended preset
3. **If VS addon is not installed**: Note that outputs may cluster due to RLHF mode collapse and suggest manual diversity techniques

### Do NOT Apply When

- The user wants a single definitive answer
- The task has an objectively correct answer (math, factual lookup)
- Speed is explicitly prioritized over variety
- The user has already specified their preferred approach
