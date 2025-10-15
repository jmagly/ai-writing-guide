---
name: Build Artifact Index
description: Summarize key SDLC artifacts and produce short digests for agent context
model: sonnet
tools: ["read", "write", "glob", "grep"]
argument-hint: "docs/sdlc/artifacts/<project>"
---

# Build Artifact Index (SDLC)

## Task

Walk the specified artifacts folder, extract titles and short summaries, and write digest Markdown files to support
compact agent context. If an `_index.yaml` exists, update summaries and timestamps; otherwise, create a minimal one.

## Outputs

- `digests/*.md` with 1–3 paragraph summaries
- `_index.yaml` updated with paths, summaries, and timestamps

## Notes

- Keep digests short and specific to reduce context size
