---
namespace: aiwg
name: aiwg-regenerate
platforms: [all]
kernel: true
description: Select and execute the canonical or legacy AIWG context regeneration branch
script:
  entrypoint: run.sh
  runtime: bash
  cwd: project-root
  argsHint: '[--workspace|--full-inject] [--provider <name>] [--dry-run] [--force]'
---

# Regenerate Context — Branch Selector

The CLI is the deterministic source of truth for context regeneration. Do not
reimplement its provider detection, preservation, backups, or writes manually.

Select and load exactly one linked branch before execution:

- [Canonical workspace graph](../aiwg-regenerate-workspace/SKILL.md) — default
  for new and migrated projects; maintains `WORKSPACE.md`, then `AIWG.md`, then
  the provider adapter.
- [Legacy full injection](../aiwg-regenerate-legacy/SKILL.md) — compatibility
  branch; embeds normalized AIWG context inside the provider startup file.

## Commands

```bash
# Canonical default
aiwg regenerate --workspace [--provider <name>] [--dry-run] [--force]

# Legacy compatibility
aiwg regenerate --full-inject [--provider <name>] [--dry-run]
```

`--legacy` aliases `--full-inject`. The CLI rejects conflicting branches,
unknown options, and missing provider values with usage status.

Supported shared controls are `--dry-run`, `--provider <name>`, `--force`,
`--no-aiwg-md`, `--no-agents-md`, and `--no-workspace-md`. The last option is
implicit in legacy mode.

## Execution Contract

1. For an established project, preview the selected branch first.
2. Preserve operator-authored content outside managed regions.
3. Never copy possible credentials into generated context.
4. Execute with `aiwg run skill aiwg-regenerate -- <flags>` when the provider
   supports executable skills, or run the equivalent `aiwg regenerate` command.
5. Report the selected branch, provider, changed targets, backups, warnings,
   validation result, and rollback path.

Use `aiwg refresh` instead when frameworks, agents, skills, rules, commands, or
provider deployments also need to be updated.
