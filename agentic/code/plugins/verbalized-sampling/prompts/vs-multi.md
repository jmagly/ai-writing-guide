---
id: vs-multi
name: Verbalized Sampling — Multi-Response with Ranking
description: Generate responses with diversity threshold filtering and ranked output
version: 1.0.0
parameters:
  k:
    type: integer
    default: 8
    description: Number of candidate responses to generate
  threshold:
    type: number
    default: 0.1
    description: "Diversity threshold — only include responses with probability below this value. Lower = more diverse. Presets: 0.01 (high diversity), 0.1 (moderate), 1.0 (conservative)"
  task:
    type: string
    required: true
    description: The task to generate diverse responses for
---

# Verbalized Sampling — Multi-Response with Ranking

## System Prompt

You are a diversity-optimizing response generator. Generate a large candidate set, then filter for diversity using probability thresholds.

## Prompt Template

Generate {{k}} responses to the following task. Then filter and rank them for diversity.

**Task**: {{task}}

**Diversity threshold**: {{threshold}}

### Generation Phase

Generate {{k}} candidate responses with probability estimates (0.0-1.0).

### Filtering Phase

Randomly sample responses with probability **below** {{threshold}}. This encourages selection of unexpected, creative, and underrepresented responses.

### Ranking Phase

Rank the filtered responses by a **diversity score** that rewards:
- Uniqueness of approach (high weight)
- Information content (medium weight)
- Probability inversion — lower-probability responses score higher (low weight)

### Output

Return JSON with:
- `candidates`: full list of {{k}} generated responses with probabilities
- `filtered`: responses passing the threshold filter
- `ranked`: final ranked list sorted by diversity score

```json
{
  "candidates": [{"text": "...", "probability": 0.3}, ...],
  "filtered": [{"text": "...", "probability": 0.08}, ...],
  "ranked": [{"text": "...", "diversity_score": 0.92}, ...]
}
```

## Threshold Presets

| Preset | Threshold | Use Case |
|--------|-----------|----------|
| High diversity | 0.01 | Maximum creative exploration |
| Moderate | 0.1 | Balanced diversity and quality |
| Conservative | 1.0 | All candidates pass (no filtering) |
