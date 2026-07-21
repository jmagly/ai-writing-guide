---
namespace: aiwg
name: aiwg-regenerate-workspace
platforms: [all]
kernel: true
description: Regenerate the canonical WORKSPACE.md-first context graph and provider adapters
commandHint:
  argumentHint: "[--provider <name>] [--dry-run] [--force]"
  allowedTools: Bash, Read
  model: haiku
  category: maintenance
  modelRole: efficiency
  modelTier: economy
---

# Regenerate Canonical Workspace Context

Use this default branch for `WORKSPACE.md` → `AIWG.md` → provider adapter setup. Established projects should run `aiwg workspace-context audit --json`, then migration dry-run/apply, then `aiwg regenerate --workspace` and `aiwg workspace-context doctor`.

Migration is transactional, keeps recoverable preimages, and refuses possible credential values or unresolved directive conflicts. Use [aiwg-regenerate-legacy](../aiwg-regenerate-legacy/SKILL.md) only for inline compatibility.
