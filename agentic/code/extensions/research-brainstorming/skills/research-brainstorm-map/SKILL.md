---
name: research-brainstorm-map
description: Render idea, question, and hypothesis maps from KB graph neighbors and brainstorming notes.
---

# Research Brainstorm Map

Use when the user wants a visual or structured map of the brainstorming
neighborhood around a research topic.

## Procedure

1. Query KB neighbors with:

   ```bash
   aiwg index neighbors --graph kb --node <slug>
   ```

2. Group returned nodes by concept, entity, source summary, synthesis, and
   brainstorm note.
3. Build one or more maps:
   - idea map
   - question tree
   - competing-hypothesis table
   - exploration plan
4. Mark each node or claim as `user-idea`, `model-suggestion`, or
   `citation-backed` when that information is known.

## Output

Use Markdown by default. If the user asks for a renderable graph, output Mermaid
or DOT with source labels in node text.
