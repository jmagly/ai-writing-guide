# ADR: AIWG Resource Version Resolution and Per-Call Overrides

**Status**: Proposed
**Date**: 2026-07-21
**Related**: #1847, #1849, `.aiwg/architecture/adr-web-backed-resource-addressing.md`

## Context

Web-backed resources are useful only if operators can reason about which resource version a command used. AIWG currently exposes package version/channel behavior, but resources are largely tied to the installed package path. Web publication creates a new axis: an operator may want the stable default for most work, a previous version for one migration call, or a canary bundle for a single test.

The closest familiar model is npm: exact versions, semantic-version ranges, and dist-tags/channels. npm also distinguishes mutable tags from immutable published versions, and published package version tuples are immutable once accepted by the registry.

## Decision

AIWG resource resolution supports four selector forms:

| Selector | Example | Meaning |
|---|---|---|
| Exact version | `2026.7.15` | Resolve only that immutable AIWG resource release. |
| SemVer range | `^2026.7.0` | Resolve the highest allowed release according to SemVer precedence. |
| Dist-tag/channel | `stable`, `latest`, `canary`, `main` | Resolve through a signed channel manifest. |
| Digest pin | `sha256:<digest>` | Resolve only a manifest or bundle matching the digest. |

The CLI exposes:

```bash
aiwg versions list
aiwg versions show <version|tag>
aiwg versions resolve <version|range|tag|digest>

aiwg discover "architecture evolution" --aiwg-version stable
aiwg show skill architecture-evolution --resource-source web --aiwg-version 2026.7.15
aiwg use sdlc --resource-source auto --aiwg-version ^2026.7.0
aiwg run skill issue-create --aiwg-version canary -- "<args>"
```

Resolution precedence is:

1. Per-call flags: `--aiwg-version`, `--resource-source`, `--offline`.
2. Environment overrides for non-interactive automation: `AIWG_RESOURCE_VERSION`, `AIWG_RESOURCE_SOURCE`, `AIWG_OFFLINE`.
3. Project config in `.aiwg/aiwg.config`.
4. User config under AIWG's user config directory.
5. CLI default: installed local resources; if explicitly in web mode, `stable`.

Per-call flags never mutate project defaults. If a command resolves a mutable tag or range, the resolved immutable version and digest are written to command telemetry and, when deployment changes project state, to the project resource lock.

## Channel Policy

- `stable`: latest release promoted for normal operator use.
- `latest`: alias of `stable` for npm familiarity.
- `canary`: latest signed pre-release or release-candidate bundle.
- `main`: latest signed main-branch bundle, only used when explicitly selected.

Tags must not be valid SemVer strings or begin with `v` plus digits. This mirrors npm's namespace caveat and prevents ambiguous selectors.

## Consequences

### Positive

- Operators can test or pin resource versions without reinstalling AIWG.
- Automation can reproduce a prior resource graph by exact version or digest.
- Channel updates stay convenient while lockfiles preserve resolved state.

### Negative

- Mutable tags require signed channel manifests and cache invalidation rules.
- Existing handlers need consistent flag plumbing or shared context parsing.
- Operators may confuse CLI binary version with resource bundle version; docs and command output must show both.

## Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Tag moves cause non-reproducible behavior | Record resolved version and digest for every mutating command. |
| Range resolution changes after a new release | Mutating commands update lockfile with exact result. |
| Canaries leak into production config | Require explicit `canary`/`main` selector; never select them through default `stable`. |

## References

- `https://semver.org/`
- `https://docs.npmjs.com/adding-dist-tags-to-packages/`
- `https://docs.npmjs.com/cli/v8/commands/npm-dist-tag/`
- `https://docs.npmjs.com/cli/v7/commands/npm-publish/`
