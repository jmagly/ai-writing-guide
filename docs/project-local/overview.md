---
title: Project-Local Customization
description: Author project-specific extensions, addons, and frameworks under .aiwg/ that deploy alongside upstream.
---

# Project-Local Customization

Project-local customization lets a team add its own AIWG rules, skills, agents,
frameworks, and provider selectors inside the project repo. Use it when one
project needs local workflow guidance without forking AIWG or publishing a
shared package.

> **Status**: Shipped in 2026.5.x. The `.aiwg/{extensions,addons,frameworks}/<name>/` content layout
> superseded the original single-directory `.aiwg/.project/` proposal (#750 → epic [#1033](https://git.integrolabs.net/roctinam/aiwg/issues/1033)).
> `.aiwg/plugins/<name>/` remains supported for marketplace delivery wrappers.

## Canonical docs

The authoritative documentation now lives under `docs/customization/`:

| Doc | What it covers |
|-----|----------------|
| [Quickstart](../customization/project-local-quickstart.md) | Author your first project-local bundle |
| [Lifecycle reference](../customization/project-local-lifecycle.md) | Discovery, deploy, conflict resolution, doctor, remove, promote, activity log |
| [Project quickrefs](../customization/project-quickrefs.md) | Always-visible project orientation, precedence, generation, and provider deployment |
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
aiwg quickref generate --project --dry-run  # preview project orientation
aiwg quickref deploy --project              # deploy to provider kernel surfaces
```

The load-bearing invariant: a project-local bundle uses the same layout as its
upstream form, so `aiwg promote` can perform a hash-verified copy without a
format migration ([ADR #1038](https://github.com/jmagly/aiwg/blob/main/.aiwg/architecture/adr-identical-form-portability.md)).
