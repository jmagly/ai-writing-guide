---
namespace: aiwg
name: aiwg-regenerate-workspace
platforms: [all]
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

Use this default branch for new and migrated projects. It maintains the precedence chain:

1. `WORKSPACE.md` — provider-neutral project and operator context.
2. `AIWG.md` — generated framework discovery and routing context.
3. Provider startup adapters — minimal pointers that load or direct readers to those files in order.

For an established project, audit before adopting the graph:

```bash
aiwg workspace-context audit --json
aiwg workspace-context migrate --dry-run --json
aiwg workspace-context migrate --apply
aiwg regenerate --workspace
aiwg workspace-context doctor
```

Migration is transactional and records recoverable preimages under `.aiwg/context-migrations/`. It refuses possible credential values and unresolved directive conflicts. Use [aiwg-regenerate-legacy](../aiwg-regenerate-legacy/SKILL.md) only when compatibility requires inline context.
