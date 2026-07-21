# ADR: Canonical Workspace Context Graph

## Status

Accepted — 2026-07-21, issue #1811.

## Context

Provider startup files had become competing stores for project policy. That
duplicated neutral instructions, obscured precedence, made regeneration risky,
and encouraged false claims that a Markdown link was a native include.

## Decision

`WORKSPACE.md` is the canonical provider-neutral project/operator context root.
Its AIWG-managed section defines ownership, precedence, and links; its marked
operator section is preserved byte-for-byte during regeneration. `AIWG.md`
remains generated framework/discovery context. Provider startup files are
compiled, minimal adapters that direct the provider to `WORKSPACE.md` first and
`AIWG.md` second.

Each `ProviderDefinition.context` records startup files, precedence, nested
semantics, size guidance, loading mode, support level, and dated verification.
Only documented `@` imports are called native. Explicit prose directions and
configuration registration are represented separately; unsupported loaders
produce an honest degraded result.

Existing layouts continue to work. Conversion is opt-in through
`aiwg workspace-context migrate`: audit/dry-run first, deterministic source
attribution, possible-secret and ambiguous-conflict gates, atomic writes,
transaction preimages, idempotence, and rollback. Nested provider files are
inventoried and preserve their native subtree scope rather than being flattened.

The shared implementation is used by new-project scaffolding, init, use,
regenerate, refresh (through use), provider hooks, doctor, and project indexing.
The project graph indexes `WORKSPACE.md` and its local linked files without
copying detailed policies into provider directories.

## Consequences

- Project-neutral edits have one durable home.
- Provider adapters stay small and replaceable.
- Provider-specific policy can remain in linked `.aiwg/context/providers/`
  files with source attribution.
- Operator-owned unmarked `WORKSPACE.md` is preserved until explicit adoption.
- Loader limitations are visible instead of emulated through misleading links.
