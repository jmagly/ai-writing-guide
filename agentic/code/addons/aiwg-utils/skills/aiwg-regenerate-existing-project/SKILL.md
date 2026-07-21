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

Use this opt-in branch when adopting the canonical context graph in an
established repository. It extracts bounded, deterministic facts from package
metadata, README purpose, stack/tooling files, standard commands, test and
architecture paths, and CI workflow names. The generated snapshot lives in its
own replaceable block inside the protected `WORKSPACE.md` operator region.

```bash
aiwg regenerate --existing-project --provider <name> --dry-run
aiwg regenerate --existing-project --provider <name> --apply
aiwg workspace-context doctor
```

Preview is the default when neither `--dry-run` nor `--apply` is supplied. The
transaction migrates provider-only roots to attributed files under
`.aiwg/context/providers/`, preserves manual context outside managed blocks,
excludes generated AIWG and spillover content, and refuses possible credential
values or unresolved directive conflicts. Apply prints a transaction id and an
exact `aiwg workspace-context rollback <id>` command.

Use [aiwg-regenerate-workspace](../aiwg-regenerate-workspace/SKILL.md) for fresh
projects or ordinary refreshes, and
[aiwg-regenerate-legacy](../aiwg-regenerate-legacy/SKILL.md) only for inline
compatibility.
