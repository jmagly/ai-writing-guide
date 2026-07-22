# ADR: Web-Backed AIWG Resource Addressing

**Status**: Proposed
**Date**: 2026-07-21
**Related**: #1847, #1848, `.aiwg/requirements/web-backed-resource-distribution.md`

## Context

AIWG has moved toward normalized metadata, indexed artifacts, and CLI-mediated resource access. That makes it possible to decouple operator installs from the full bundled resource corpus: the npm package can carry the CLI runtime, while frameworks, addons, skills, commands, rules, behaviors, docs, and prebuilt indices can resolve from local or web-backed resource bundles.

The design goal is that agentic sessions should not need to know whether a resource came from the local npm package, a local project override, a global cache, or the dedicated release host. Provider-facing bootstrap text should keep calling AIWG through the CLI/resource abstraction, not through absolute install paths.

## Decision

Introduce a CLI-owned AIWG resource resolver with two address layers:

1. **Logical resource identifiers** for AIWG internals and provider adapters:
   - `aiwg://frameworks/<name>/...`
   - `aiwg://addons/<name>/...`
   - `aiwg://extensions/<name>/...`
   - `aiwg://plugins/<name>/...`
   - `aiwg://core/<kind>/...`
2. **Physical resource locations** selected by resolver policy:
   - Local package path under the installed AIWG root.
   - Project-local path under `.aiwg/{frameworks,addons,extensions,plugins}/...`.
   - Cached web bundle path under the AIWG user cache.
   - Published immutable URL: `https://releases.aiwg.io/resources/<version>/<bundle>/<path>`.

All code paths that fetch AIWG-authored resources must route through the resolver. Direct references to an npm global install path become implementation details that only the resolver may use.

Configuration uses three source modes:

| Mode | Behavior |
|---|---|
| `local` | Resolve only from project-local and installed package resources. |
| `web` | Resolve from `releases.aiwg.io`, using cache and integrity verification. |
| `auto` | Prefer local when present; otherwise resolve from web according to version policy. |

Initial rollout is opt-in: existing installs keep `local` behavior unless an operator passes a flag or sets project/user config.

## Consequences

### Positive

- The npm package can become smaller without removing AIWG capabilities.
- Agent/provider sessions keep the same CLI-mediated workflow.
- Project-local resources remain first-class and can shadow upstream through existing config policy.
- Web-backed resources can be cached once and reused across projects.

### Negative

- Resolver behavior becomes a critical path for most AIWG commands.
- Network and cache failure modes must be explicit and testable.
- Documentation must stop teaching direct filesystem assumptions for AIWG-owned resources.

### Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Hidden dependency on absolute install paths | Add tests that run discovery/show/use against a web-only fixture with no bundled corpus. |
| Provider adapters bypass resolver | Add lint/static checks for direct `agentic/code/...` path reads outside resolver-owned modules. |
| Web mode breaks offline workflows | `--offline` and lockfile/cache tests must pass before web mode leaves experimental status. |

## Alternatives Considered

- **Keep full npm package only**: simplest, but preserves large installs and makes version-specific resource selection coarse.
- **Install resources as separate npm packages**: fits npm tooling but spreads AIWG's resource graph across package boundaries and does not help non-npm web consumption.
- **Use raw HTTPS paths directly in provider files**: rejected because provider sessions would have to understand transport/version/cache concerns.

## Implementation Notes

- Add a resolver module before adding per-command flags so command handlers share one behavior.
- Treat project-local resources as higher precedence than web resources unless the operator explicitly pins a web source for the call.
- Provider deployment must emit logical references or CLI calls where possible, not physical cache paths.
- Treat the release host as configurable, with `releases.aiwg.io` as the planned default. Do not bake public `aiwg.io/resources` paths into provider artifacts.

## References

- `.aiwg/architecture/adr-unified-registry-shape.md`
- `.aiwg/architecture/adr-fortemi-core-indexing-substrate.md`
- `docs/providers/marketplace-consumer.md`
- `https://docs.npmjs.com/cli/v7/commands/npm-publish/`
- `https://specs.opencontainers.org/distribution-spec/`
