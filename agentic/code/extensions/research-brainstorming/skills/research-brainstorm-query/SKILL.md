---
name: research-brainstorm-query
description: Retrieve adjacent wiki/research context and produce exploratory synthesis for a brainstorm topic.
---

# Research Brainstorm Query

Use when the user wants neighboring concepts, entities, syntheses, source
summaries, prior brainstorming notes, or speculative synthesis around a loose
research topic.

## Procedure

1. Identify the seed node or topic slug.
2. Query KB graph neighbors:

   ```bash
   aiwg index neighbors --graph kb --node <slug>
   ```

3. Read relevant wiki pages through `aiwg kb get` or the configured KB storage
   adapter.
4. For factual claims, call the existing research path (`research-query`) and
   label any grounded findings as `citation-backed`.
5. Produce exploratory output such as:
   - idea map
   - question tree
   - synthesis sketch
   - competing hypotheses
   - exploration plan

## Output Rules

- Keep `model-suggestion` items distinct from `citation-backed` facts.
- Include wiki links or node IDs for retrieved neighbors.
- Include acquisition or promotion candidates when a question becomes concrete.
