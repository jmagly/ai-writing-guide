---
title: Project-Local Customization
description: Author project-specific extensions, addons, frameworks, and plugins under .aiwg/ that deploy alongside upstream.
---

# Project-Local Customization

> **Status**: Shipped in 2026.5.x. The `.aiwg/{extensions,addons,frameworks,plugins}/<name>/` layout
> superseded the original single-directory `.aiwg/.project/` proposal (#750 → epic [#1033](https://git.integrolabs.net/roctinam/aiwg/issues/1033)).

## Canonical docs

The authoritative documentation now lives under `docs/customization/`:

| Doc | What it covers |
|-----|----------------|
| [Quickstart](../customization/project-local-quickstart.md) | Author your first project-local bundle in 5 minutes |
| [Lifecycle reference](../customization/project-local-lifecycle.md) | Discovery, deploy, conflict resolution, doctor, remove, promote, activity log |
| [Type disambiguation](../customization/extensions-vs-addons-vs-frameworks-vs-plugins.md) | Which bundle type to author |
| [Customization README](../customization/README.md) | Path A (project-local) / Path B (fork) / Path C (corpus) |
| [Troubleshooting](../customization/project-local-troubleshooting.md) | Common failures and fixes |
| [From-fork migration](../customization/from-fork-to-project-local.md) | Move existing fork-based customizations to project-local |

## Quick orientation

```bash
aiwg new-bundle <name>        # scaffold .aiwg/extensions/<name>/
aiwg use <name>               # deploy
aiwg doctor --project-local   # health check
aiwg remove <name>            # revert deployed files (source preserved)
aiwg promote <name>           # graduate to upstream or corpus
aiwg activity-log show        # audit trail
```

The load-bearing invariant: a project-local bundle is **byte-identical**
in shape to its upstream form, so `aiwg promote` is a hash-verified copy
with zero rewrite ([ADR #1038](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)).
