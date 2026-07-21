# Context Regeneration Guide

`aiwg regenerate` refreshes project context files without redeploying frameworks,
agents, skills, rules, or commands. Use `aiwg refresh` when deployment content
also needs to change.

## Choose a branch

### Canonical refresh (default)

Use this for a fresh project or an already-migrated repository:

```bash
aiwg regenerate --workspace --provider <name> --dry-run
aiwg regenerate --workspace --provider <name>
```

It maintains the canonical load order:

1. `WORKSPACE.md` for provider-neutral project/operator context;
2. `AIWG.md` for generated framework discovery and routing;
3. the provider startup adapter that directs the runtime to those files.

Routine refresh only updates managed regions. An unmarked operator-owned
`WORKSPACE.md` is preserved unless the explicit migration branch adopts it.

### Existing-project extraction

Use this once when adopting an established repository:

```bash
aiwg regenerate --existing-project --provider <name> --dry-run
aiwg regenerate --existing-project --provider <name> --apply
aiwg workspace-context doctor
```

Preview is the default. It prints the exact snapshot and transaction targets
without writing. The deterministic extractor uses only bounded local evidence:

- package name, description, runtime, and standard scripts;
- the first usable README purpose paragraph;
- lockfiles, manifests, and toolchain configuration;
- test and architecture/topology paths;
- CI workflow filenames.

The snapshot is placed inside its own managed block in the protected
`WORKSPACE.md` operator region. Reruns replace only that block. Existing manual
context remains outside it.

Provider-only startup content moves to source-attributed files under
`.aiwg/context/providers/`. Generated AIWG bodies, legacy inline blocks, and
managed `AGENTS.override.md` spillover are excluded from project extraction.
Possible credentials and ambiguous directive conflicts stop the operation
before any write.

Apply records every changed preimage under `.aiwg/context-migrations/` and
prints an exact rollback command:

```bash
aiwg workspace-context rollback <transaction-id>
```

`--existing-project` does not accept `--force` or partial `--no-*-md` flags;
the adoption is intentionally one complete transaction. A repository with no
stable project signals is left unchanged and should use `--workspace`.

### Legacy full injection

Use only when compatibility requires an inline managed block in the provider
startup file:

```bash
aiwg regenerate --full-inject --provider <name> --dry-run
aiwg regenerate --full-inject --provider <name>
```

`--legacy` is an alias. This branch does not create `WORKSPACE.md`.

## Shared controls

- `--provider <name>` selects the target provider; otherwise runtime detection
  is used.
- `--dry-run` previews without writes.
- `--force` and the `--no-*-md` controls apply to canonical/legacy refreshes,
  not transactional existing-project adoption.
- Unknown flags, missing values, and conflicting branches return usage status.

The deployed `aiwg-regenerate` selector links to dedicated
`aiwg-regenerate-workspace`, `aiwg-regenerate-existing-project`, and
`aiwg-regenerate-legacy` skills. The CLI remains the deterministic writer.
