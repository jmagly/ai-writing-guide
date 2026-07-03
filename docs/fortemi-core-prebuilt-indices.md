# Fortemi Core Prebuilt Indices

AIWG release packages emit a prebuilt Fortemi Core v2 index for the `framework`
graph:

```text
prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json
prebuilt/fortemi-core/framework/manifest.json
```

The manifest records the graph, schema, generated timestamp, item count, privacy
classification, and SHA-256 checksum. The packaged export is a compact
metadata/capability projection: it is meant to keep framework discovery working
from the npm distro without shipping the full framework source body corpus.
`aiwg index discover ... --graph framework` first uses a
valid local cache under `.aiwg/.index/fortemi-core/`. If no compatible local
framework cache exists, it falls back to the packaged prebuilt framework index.

This is the supported Fortemi path for AIWG index/search packaging. The older
`fortemi` storage backend in `.aiwg/storage.config` remains an alpha MCP
persistence adapter and is deprecated for discovery/search routing.

Regenerate the release artifact before packing:

```bash
npm run release:fortemi-index
```

`npm pack` runs this automatically through `prepack`. Local rebuilds are still
required when querying project/codebase graphs, when source-body/fulltext
fidelity matters, or when the operator needs a private framework cache with
locally modified corpus content:

```bash
aiwg index build --graph framework --force
aiwg index sync --graph framework
```

Release-gate discovery expectations live in
`test/fixtures/artifacts/release-discovery-matrix.json`. When adding or
renaming capabilities, add a matrix case with the user-facing query phrase,
expected artifact path/type, and an acceptable rank window.

CI runs the same release gate through:

```bash
npm run ci:fortemi-index
```

That command validates the query matrix against local and Fortemi Core
backends, runs `npm pack` through `prepack`, verifies the prebuilt export and
manifest are included in the npm tarball, checks the manifest checksum/schema
and size ceiling, and confirms Fortemi-backed discovery can answer from the
packaged fallback with an empty local cache.

The npm tarball allowlist includes the top-level `prebuilt/` directory, and the
publish workflows run the Fortemi package verification before publishing. That
keeps the generated index, manifest checksum, and fallback query behavior part
of the distro package gate instead of a local-only smoke test.

The general install-size budget includes this intentional distro payload because
operators previously paid the same cost by building the framework index locally.
The Fortemi package gate still enforces a separate prebuilt export size ceiling
so unrelated corpus growth does not silently bloat releases.

Discovery tie-breaks are deterministic. Equal-score default framework results
prefer canonical `frameworks/`, `addons/`, and `extensions/` source paths over
`plugins/` mirror copies, then sort by artifact type, name/title, and path.
