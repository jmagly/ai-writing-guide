---
namespace: aiwg
platforms: [all]
name: corpus-index-build
description: Render research-corpus markdown index views (by-topic, by-year, authors, citation-network, ...) from corpus state. As of #1490 these are rendered natively by `aiwg index build` — this skill points you at it.
commandHint:
  argumentHint: "[--graph <view>] [--all] [--force]"
  allowedTools: Read, Bash
  model: sonnet
  category: research-indexing
---

# Corpus Index Build

Render the human-readable markdown index views for a research corpus — by-topic,
by-year, authors, by-venue, by-method, by-model-size, training-pipeline,
citation-network, by-author, by-org, by-bridge, unprofiled-hubs.

> **As of #1490, `aiwg index build` renders these views natively.** The former
> standalone `build.py` has been retired; the JSON graph index and the markdown
> views are now produced by a single command, in one process, from one config
> (`.aiwg/aiwg.config`, #1491). There is no longer a "these are two different
> things" split to manage.

## How to build the views

```bash
aiwg index build            # JSON graphs + all configured markdown views
aiwg index build --all      # same (every configured view)
aiwg index build --graph by-topic     # a single view
aiwg index build --graph citation-network
aiwg index build --force    # re-render even when the source checksum is unchanged
```

Views render to the `output` path declared per manifest entry (default
`indices/<name>.md`). The command renders views only when the project has a
`documentation/references/` corpus — it is a no-op in ordinary SDLC projects.

## Triggers

- "build the research indices"
- "rebuild corpus graphs"
- "update the topic index"
- "render corpus markdown views"
- `/corpus-index-build`

In every case: run `aiwg index build` (optionally `--graph <view>` / `--force`).

## Configuration

Views are declared under `index.graphs.indices.manifest` in **`.aiwg/aiwg.config`**
(JSON, validated against `aiwg.config.v1.json`; the legacy `.aiwg/config.yaml`
still works as a deprecated fallback — see #1491). Each manifest entry's `name`
selects the renderer and optional `output` sets the path:

```json
{
  "index": {
    "graphs": {
      "indices": {
        "manifest": [
          { "name": "by-topic",         "output": "indices/by-topic.md" },
          { "name": "by-year",          "output": "indices/by-year.md" },
          { "name": "authors",          "output": "indices/authors.md" },
          { "name": "citation-network", "output": "indices/citation-network.md" }
        ]
      }
    }
  }
}
```

Supported renderer `name`s: `by-topic`, `by-year`, `authors`, `by-venue`,
`by-method`, `by-model-size`, `training-pipeline`, `citation-network`,
`by-author`, `by-org`, `by-bridge`, `unprofiled-hubs`. An unrecognized name
fails the build (non-zero exit). If the manifest is absent, a default set
renders (`by-topic`, `by-year`, `authors`, `by-venue`, `by-method`,
`training-pipeline`, `by-model-size`); `citation-network` is added when it is
present as an `index.graphs` key.

## What the views contain

- **by-topic / by-method / by-venue** — papers grouped by classified taxonomy
  (frontmatter `topics` override the classifier when present).
- **by-year** — chronological, newest first.
- **authors / by-author** — papers per normalized author; `by-author` is an
  enriched table linking `PROF-P-*` people profiles when they exist.
- **by-org / by-bridge** — affiliation rollups; `by-bridge` surfaces authors
  spanning ≥2 affiliations.
- **by-model-size** — grouped by extracted parameter count.
- **citation-network** — node/edge/density summary, top hubs, isolated nodes.
- **training-pipeline** — fixed reading-order stages with in-corpus markers.
- **unprofiled-hubs** — high in-degree REFs whose primary author lacks a profile.

Each view records a `Source-Checksum:` header; incremental builds skip a view
when its corpus checksum is unchanged (override with `--force`).

## References

- @$AIWG_ROOT/src/artifacts/corpus-views/ — native renderers (#1490)
- @$AIWG_ROOT/src/artifacts/cli.ts — `aiwg index build` entrypoint
- @$AIWG_ROOT/agentic/code/frameworks/research-complete/skills/citation-backfill/SKILL.md — prerequisite for `citation-network`
- @$AIWG_ROOT/docs/cli-reference.md — index command reference
