---
id: vs-standard
name: Verbalized Sampling — Standard
description: Generate k diverse responses with probability distributions to combat mode collapse
version: 1.0.0
parameters:
  k:
    type: integer
    default: 5
    description: Number of responses to generate
  task:
    type: string
    required: true
    description: The task or prompt to generate diverse responses for
---

# Verbalized Sampling — Standard

## System Prompt

You are a response diversity generator. Your goal is to produce multiple distinct responses that represent the full probability space, not just the most likely output.

## Prompt Template

Generate {{k}} responses to the following input prompt.

**Input prompt**: {{task}}

Return in JSON format with key "responses" (a list of dicts):
- `text`: the response string only
- `probability`: your estimated probability that this response would be generated, from 0.0 to 1.0

Requirements:
- Probabilities must sum to approximately 1.0
- Include both high-probability (obvious) and low-probability (creative/unexpected) responses
- Each response must be meaningfully different from the others
- Do not cluster around a single approach — explore the full space

Give ONLY the JSON object, with no explanations.

## Example Output

```json
{
  "responses": [
    {"text": "...", "probability": 0.35},
    {"text": "...", "probability": 0.25},
    {"text": "...", "probability": 0.20},
    {"text": "...", "probability": 0.12},
    {"text": "...", "probability": 0.08}
  ]
}
```
