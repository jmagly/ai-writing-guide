# Security Addon — Deprecated / Transitional

**Status**: Reference-only, not deployable. Slated for migration into [`frameworks/security-engineering/`](../../frameworks/security-engineering/).

## What lived here

- `secure-token-load.md` — token loading patterns (env vars, scoped heredoc, no-CLI-args invariant)
- `README.md` — index of related security documentation across the repo

## Why it has no manifest

This directory ships only reference documentation. It declares no agents, skills, commands, or rules — there is nothing for `aiwg use security` to deploy. Rather than register an empty addon, it is preserved as a `WIP/` documentation source pending migration.

## Forward path

The canonical home for applied-security artifacts is now [`agentic/code/frameworks/security-engineering/`](../../frameworks/security-engineering/). When time permits:

1. Move `secure-token-load.md` content into `security-engineering/skills/secret-handling-runtime/` (or a new sibling skill) so it's a deployable artifact rather than a loose markdown file.
2. Update cross-references in `frameworks/sdlc-complete/docs/token-security.md` and the global token-security rule to point at the new location.
3. Delete this directory.

Tracked at: [#1088](https://git.integrolabs.net/roctinam/aiwg/issues/1088)

## Why not just delete now

The content is still referenced from CLAUDE.md and other docs. A migration that preserves the URLs is preferred over a delete-and-replace. Marking WIP keeps the directory discoverable and explains its state to anyone who finds it.

## Related

- Doc-sync errata pass (2026-05-04) — already removed the README addon-table row that advertised this as a deployable addon.
- [`frameworks/security-engineering/README.md`](../../frameworks/security-engineering/README.md) — canonical destination.
