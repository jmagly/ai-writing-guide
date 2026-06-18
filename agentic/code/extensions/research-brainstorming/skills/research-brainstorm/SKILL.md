---
name: research-brainstorm
namespace: research
platforms: [all]
description: Capture and expand free-form research thoughts into wiki memory without requiring REF-* structure.
---

# Research Brainstorm

Use when the user wants to capture loose research ideas, hypotheses, questions,
claims, outlines, or fragments before they are ready for structured research
induction.

## Inputs

- Free-form seed prompt or pasted notes.
- Optional topic slug.
- Optional existing wiki links or source summaries.

## Procedure

1. Keep the note in brainstorming mode. Do not require `REF-*`, GRADE, or
   citation formatting.
2. Separate content into source labels:
   - `user-idea` for operator-provided material.
   - `model-suggestion` for generated expansions.
   - `citation-backed` only when an existing source summary, `REF-*`, or
     research-query result supports the statement.
3. Write a wiki note shaped like
   `agentic/code/extensions/research-brainstorming/templates/brainstorm-note.md`
   under `.aiwg/kb/brainstorming/<slug>.md`.
4. Append a semantic-memory event with `memory-log-append` when available, or
   use `aiwg kb put brainstorming/<slug>.md` for storage.
5. Link obvious concepts, entities, source summaries, syntheses, and prior
   brainstorms with wiki links.

## Output

Return the note path, source-label summary, open questions, and promotion
candidates. Do not present speculative suggestions as facts.

## Composition

This skill composes with `kb-ingest`, `memory-ingest`, `memory-log-append`,
`memory-lint`, `research-query`, and `induct-research`; it does not duplicate
those tools.
