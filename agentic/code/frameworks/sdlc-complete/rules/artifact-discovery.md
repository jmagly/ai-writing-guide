---
enforcement: high
---

# Artifact Discovery Rules

**Enforcement Level**: HIGH
**Scope**: All SDLC agents that work with project artifacts
**Tier**: sdlc

## Overview

These rules define when and how agents should use the `aiwg index` CLI commands as self-service tools for artifact discovery. Agents can query, navigate, and understand project artifacts without relying on manual file searching.

## Problem Statement

Agents frequently spend excessive context window on blind `Glob` and `Grep` searches across `.aiwg/` directories. The artifact index provides structured, pre-computed metadata that agents should use instead.

## Mandatory Rules

### Rule 1: Use Index Before Starting Phase Work

**REQUIRED**: Before beginning work on any SDLC phase, query the index for existing artifacts.

```bash
# Find all requirements artifacts
aiwg index query --phase requirements --json

# Find artifacts related to a topic
aiwg index query "authentication" --json

# Find specific artifact types
aiwg index query --type use-case --json
```

**WHY**: Prevents duplicate work and ensures agents build on existing artifacts.

### Rule 2: Check Dependencies Before Modifying Artifacts

**REQUIRED**: Before modifying any artifact, check what depends on it.

```bash
# What depends on this requirement?
aiwg index deps .aiwg/requirements/UC-001.md --json

# What does this ADR depend on?
aiwg index deps .aiwg/architecture/adr-001.md --direction upstream --json
```

**WHY**: Prevents breaking downstream artifacts. If 5 test plans reference a use case, changing that use case requires updating those test plans.

### Rule 3: Always Use --json Flag

**REQUIRED**: Agents MUST use `--json` flag when invoking index commands.

```bash
# CORRECT - structured output for programmatic parsing
aiwg index query "auth" --json
aiwg index deps .aiwg/requirements/UC-001.md --json
aiwg index stats --json

# INCORRECT - human-readable output wastes tokens
aiwg index query "auth"
```

**WHY**: JSON output is compact and parseable. Human-readable table output wastes context window tokens.

### Rule 4: Rebuild Index After Creating Artifacts

**REQUIRED**: After creating or modifying `.aiwg/` artifacts, trigger an index rebuild.

```bash
aiwg index build
```

**WHEN**: After any of these operations:
- Creating new artifacts in `.aiwg/`
- Modifying artifact frontmatter (tags, type, phase)
- Adding/removing @-mention references
- Deleting artifacts

### Rule 5: Use Stats for Project Health Assessment

**REQUIRED**: When assessing project state, use `aiwg index stats --json` instead of manual file counting.

```bash
aiwg index stats --json
```

This provides: artifact counts by phase and type, tag distribution, dependency graph metrics, and index coverage — all in a single command.

## JSON Output Schemas

### Query Result

```json
{
  "query": { "text": "auth", "filters": {} },
  "results": [
    {
      "path": ".aiwg/requirements/UC-001.md",
      "type": "use-case",
      "phase": "requirements",
      "title": "User Authentication",
      "score": 0.9,
      "summary": "Users can authenticate via email/password or SSO."
    }
  ],
  "total": 1,
  "query_time_ms": 5
}
```

### Dependencies Result

```json
{
  "artifact": ".aiwg/requirements/UC-001.md",
  "direction": "both",
  "depth": 3,
  "upstream": [],
  "downstream": [".aiwg/architecture/adr-001.md", ".aiwg/testing/tp-001.md"],
  "upstreamCount": 0,
  "downstreamCount": 2
}
```

### Stats Result

```json
{
  "totalArtifacts": 25,
  "byPhase": { "requirements": 8, "architecture": 5, "testing": 7 },
  "byType": { "use-case": 8, "adr": 5, "test-plan": 7 },
  "graphMetrics": { "totalEdges": 42, "orphanedArtifacts": 3 },
  "coverage": { "indexed": 25, "totalFiles": 28, "percentage": 89 }
}
```

## When to Use Which Command

| Situation | Command |
|-----------|---------|
| Starting work on a phase | `aiwg index query --phase <phase> --json` |
| Looking for related artifacts | `aiwg index query "<topic>" --json` |
| Before modifying an artifact | `aiwg index deps <path> --json` |
| After creating/modifying artifacts | `aiwg index build` |
| Assessing project health | `aiwg index stats --json` |
| Finding artifacts by tag | `aiwg index query --tags <tag1>,<tag2> --json` |
| Finding artifacts by type | `aiwg index query --type <type> --json` |

## References

- @$AIWG_ROOT/src/artifacts/cli.ts — CLI router
- @$AIWG_ROOT/src/artifacts/query-engine.ts — Query implementation
- @$AIWG_ROOT/src/artifacts/dep-graph.ts — Dependency graph
- @$AIWG_ROOT/src/artifacts/stats.ts — Statistics
- @$AIWG_ROOT/src/artifacts/index-builder.ts — Index builder
