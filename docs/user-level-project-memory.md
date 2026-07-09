# User-Level Project Memory

AIWG can keep private project memory outside a repository under the operator's
AIWG home. This avoids git noise from personal agent memory while preserving the
same effective `.aiwg` layout used by project-local AIWG artifacts.

## Layout

User-level project memory is rooted at:

```text
~/.aiwg/projects/
  manifest.json
  index/
    manifest-index.json
  <project-id>/
    .aiwg/
      aiwg.config
      memory/
      index/
      artifacts/
```

`manifest.json` records each registered project's stable id, display name,
workspace roots, git remotes, metadata, and private `.aiwg` memory root. The
`index/manifest-index.json` sidecar maps project ids, workspace roots, and git
remotes to manifest entries so AIWG can resolve the active project without
scanning every memory directory.

## Commands

Register the current workspace:

```bash
aiwg memory project register
```

Inspect and resolve:

```bash
aiwg memory project list
aiwg memory project inspect
aiwg memory project inspect --remote git@git.integrolabs.net:roctinam/aiwg.git
aiwg memory project resolve
```

Maintain mappings:

```bash
aiwg memory project reindex
aiwg memory project relocate <project-id> ~/.aiwg/projects/<new-id>/.aiwg
aiwg memory project remove <project-id>
aiwg memory project remove <project-id> --delete-files
```

All commands accept `--json` for automation.

## Resolution Order

Memory storage resolves in this order:

1. Explicit `.aiwg/storage.config` memory root or backend.
2. Project-local `.aiwg/memory` when the active workspace has a `.aiwg`
   directory.
3. Registered user-level project memory under `~/.aiwg/projects/<id>/.aiwg`
   when the active workspace path or git remote matches the manifest.
4. Default project-local `.aiwg/memory`.

This keeps reviewed project-local AIWG artifacts authoritative. User-level
memory is best for private, per-operator context that should not be committed.
Use project-local `.aiwg` when the memory or artifact must be shared,
reviewed, or reproduced by collaborators.

## Repository Pollution

Private memory roots live outside the checkout, so registering a project does
not modify the target repository or require repository-specific `.gitignore`
rules. The memory contents still use the normal `.aiwg` subdirectories, which
lets existing storage commands and memory tools work with the relocated root.
