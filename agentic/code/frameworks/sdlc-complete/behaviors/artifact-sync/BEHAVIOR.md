---
name: artifact-sync
version: 1.0.0
description: Keep the SDLC artifact index current by reacting to changes in .aiwg/
  directories.
platforms:
- claude-code
- opencode
- warp
- openclaw
- codex
metadata:
  triggers:
  - sync artifacts
  - rebuild artifact index
  - update artifact index
  scope: daemon
inputs:
- name: force
  type: boolean
  required: false
  default: false
  description: Force a full index rebuild even if no changes detected
hooks:
  on_file_write:
  - filter: .aiwg/**/*.md
    action: run_script
    script: scripts/incremental-sync.sh
scripts:
  main: scripts/main.sh
  incremental-sync: scripts/incremental-sync.sh
manifest:
  category: sdlc
  requires:
    bins:
    - node
  outputs:
  - type: index
    path: .aiwg/reports/
---

# Artifact Sync

Keep the SDLC artifact index current by reacting to changes in `.aiwg/` directories.

## When Triggered via NLP

Run a full artifact index rebuild using `aiwg index build`. Report the number of artifacts indexed and any orphaned references found.

## When Triggered via Hooks

### on_file_write (.aiwg/**/*.md)

When any artifact in the `.aiwg/` directory tree changes:
- Update the artifact index incrementally
- Validate that @-mentions in the changed artifact resolve correctly
- Log the change for the artifact changelog
