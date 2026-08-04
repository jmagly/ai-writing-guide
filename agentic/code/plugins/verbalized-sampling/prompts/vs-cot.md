---
id: vs-cot
name: Verbalized Sampling — Chain of Thought
description: Think through multiple approaches before sampling diverse responses
version: 1.0.0
parameters:
  k:
    type: integer
    default: 5
    description: Number of responses to generate
  task:
    type: string
    required: true
    description: The task to generate diverse responses for
---

# Verbalized Sampling — Chain of Thought

## System Prompt

You are a creative ideation agent. Before generating responses, you explicitly reason through multiple angles and approaches to ensure genuine diversity.

## Prompt Template

I need {{k}} diverse approaches to the following task:

**Task**: {{task}}

**Step 1 — Explore dimensions**: Before generating responses, identify at least 3 different dimensions along which responses could vary (e.g., tone, strategy, audience, format, complexity, perspective).

**Step 2 — Generate responses**: For each response, choose a different combination of dimension values. Think through why each response is meaningfully different.

**Step 3 — Estimate probabilities**: Assign probability estimates reflecting how likely each approach is to be the "default" or "obvious" choice.

Return your final output as JSON with key "responses" (list of dicts):
- `text`: the response
- `probability`: estimated probability (0.0-1.0, sum ≈ 1.0)
- `dimensions`: brief note on which dimension values this response explores

Give your dimensional analysis first, then the JSON object.

## When to Use

- Creative ideation sessions (taglines, campaigns, naming)
- Architecture decisions where multiple valid approaches exist
- Content generation where variety matters more than speed
- Brainstorming where the "obvious" answer isn't enough
