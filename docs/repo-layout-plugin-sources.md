# Plugin Source Layout

AIWG keeps one repository source home for marketplace plugin bundles:

```text
agentic/code/plugins/<name>/
```

This path contains the checked-in plugin bundle shape used by Claude Code,
Codex, Factory, Cursor, and other provider marketplace formats. Top-level
`plugins/` is not a canonical source path and should not be recreated by
packaging, CI, tests, or documentation.

For the broader root `templates/`, `schemas/`, and `config/` source taxonomy,
see [Repository Source Taxonomy](repo-layout-source-taxonomy.md).

## Directory Inventory

| Path | Classification | Boundary |
| --- | --- | --- |
| `agentic/code/frameworks/` | Canonical framework source | Framework definitions and deployable artifacts. Plugin bundles copy from here. |
| `agentic/code/addons/` | Canonical addon source | Addon definitions and deployable artifacts. Plugin bundles copy from here. |
| `agentic/code/extensions/` | Canonical extension source | Provider-neutral extension bundles. |
| `agentic/code/plugins/` | Canonical plugin bundle source | Marketplace-ready plugin directories and provider plugin manifests. |
| `.agents/plugins/marketplace.json` | Provider output | Codex project marketplace, generated from `agentic/code/plugins/` paths. |
| `.claude-plugin/marketplace.json` | Provider output | Claude Code marketplace metadata at the repository root. |
| `.aiwg/{extensions,addons,frameworks,plugins}/<name>/` | Project-local state/source | Operator-authored project-local bundles. This compatibility path is preserved. |
| `.aiwg/frameworks/` and other `.aiwg/` domain folders | Project-local state, docs, reports, or working artifacts | Not upstream canonical source. See `.aiwg/` taxonomy work for broader cleanup. |
| `src/plugin/` | Implementation code | Plugin installation, validation, registry, and workspace operations. |
| `tools/plugin/` | Tooling | Packaging commands that emit or refresh `agentic/code/plugins/`. |
| `test/unit/plugin/` | Tests | Unit coverage for plugin implementation code. |

## Packaging Contract

`npm run package-plugins` and `npm run package-plugins:clean` run
`tools/plugin/package-plugins.mjs`. The script writes plugin bundles to
`agentic/code/plugins/` and writes Codex marketplace entries with
`./agentic/code/plugins/<name>` source paths.

CI workflows that validate plugin manifests must iterate
`agentic/code/plugins/*/`, not top-level `plugins/*/`.

## Compatibility

Project-local plugin bundles under `.aiwg/plugins/<name>/` remain supported.
That path is user/project source, not AIWG upstream source. It is discovered
with the rest of `.aiwg/{extensions,addons,frameworks,plugins}/` and deploys
through the project-local pipeline.
