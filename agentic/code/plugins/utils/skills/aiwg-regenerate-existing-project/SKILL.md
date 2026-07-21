---
namespace: aiwg
name: aiwg-regenerate-existing-project
platforms: [all]
kernel: true
description: Transactionally extract an established project's stable metadata and provider context into WORKSPACE.md
commandHint:
  argumentHint: "[--provider <name>] [--dry-run|--apply]"
  allowedTools: Bash, Read
  model: haiku
  category: maintenance
  modelRole: efficiency
  modelTier: economy
---

# Regenerate an Existing Project

Use this opt-in branch for established repositories. It deterministically
extracts stable project metadata into a replaceable block in `WORKSPACE.md`,
migrates provider-only roots to attributed linked files, and commits all context
outputs through one rollback-capable transaction.

```bash
aiwg regenerate --existing-project --provider <name> --dry-run
aiwg regenerate --existing-project --provider <name> --apply
aiwg workspace-context doctor
```

Preview is the default. The branch excludes generated AIWG/spillover content
and refuses possible credentials or unresolved directive conflicts. Apply
prints the exact rollback command. Use
[aiwg-regenerate-workspace](../aiwg-regenerate-workspace/SKILL.md) for fresh
projects and ordinary refreshes.
