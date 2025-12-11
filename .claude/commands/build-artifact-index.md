---
description: Summarize key SDLC artifacts and produce short digests for agent context
category: documentation-tracking
argument-hint: <docs/sdlc/artifacts/project> [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Glob, Grep
model: sonnet
---

# Build Artifact Index (SDLC)

## Task

Walk the specified artifacts folder, extract titles and short summaries, and write digest Markdown files to support
compact agent context. If an `_index.yaml` exists, update summaries and timestamps; otherwise, create a minimal one.

## Outputs

- `digests/*.md` with 1–3 paragraph summaries
- `_index.yaml` updated with paths, summaries, and timestamps


## Optional Parameters

### --guidance "text"
Provide strategic context or constraints to guide the command execution:
```
/build-artifact-index --guidance "Focus on security implications"
```

### --interactive
Enable interactive mode for step-by-step confirmation and input:
```
/build-artifact-index --interactive
```

When interactive mode is enabled, the command will:
1. Confirm understanding of the task before proceeding
2. Ask clarifying questions if requirements are ambiguous
3. Present options for user decision at key branch points
4. Summarize changes before applying them

## Notes

- Keep digests short and specific to reduce context size
