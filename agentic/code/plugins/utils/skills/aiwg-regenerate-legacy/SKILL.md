---
namespace: aiwg
name: aiwg-regenerate-legacy
platforms: [all]
description: Regenerate provider startup context using the legacy inline compatibility branch
commandHint:
  argumentHint: "[--provider <name>] [--dry-run]"
  allowedTools: Bash, Read
  model: haiku
  category: maintenance
  modelRole: efficiency
  modelTier: economy
---

# Regenerate Legacy Inline Context

Use this branch only for compatibility with a provider or project that still requires AIWG context embedded directly in its startup file.

The deterministic command is `aiwg regenerate --full-inject [--provider <name>] [--dry-run]`.

The CLI writes managed inline markers, preserves operator prose, backs up changed existing files, and does not create `WORKSPACE.md`. Return to the canonical graph with [aiwg-regenerate-workspace](../aiwg-regenerate-workspace/SKILL.md).
