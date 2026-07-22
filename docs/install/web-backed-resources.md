# Web-Backed AIWG Resources

**Status**: Proposed / not yet implemented

AIWG is planning a web-backed resource mode where the npm package can install only the CLI tooling while frameworks, addons, skills, commands, rules, behaviors, docs, and prebuilt indices resolve through the CLI from either local resources or versioned release-host bundles.

The important operator-facing invariant is that agentic sessions keep using AIWG commands. They should not need to know whether resources came from the npm install path, a project-local override, a cache entry, or the configured release host.

The planned production host is `releases.aiwg.io`, not `aiwg.io/resources`. Keeping release files on a dedicated subdomain allows the public `aiwg.io` site to stay open while the release-artifact surface can later become private, entitlement-gated, paid, or served from different infrastructure.

## Relocating Project AIWG Artifacts

AIWG project artifacts do not have to live at `./.aiwg`. Maintainer checkouts can point AIWG at a renamed or external artifact directory:

```bash
export AIWG_ARTIFACTS_PATH=../aiwg-web-release-ops/corpus/.aiwg
aiwg config show --project
```

This is the local bridge for AIWG's own private SDLC corpus. See [Private AIWG Corpus](../development/private-aiwg-corpus.md) for maintainer setup.

## Planned Modes

| Mode | Behavior |
|---|---|
| `local` | Use installed/project-local resources only. This remains the default during rollout. |
| `web` | Resolve resources from versioned release-host bundles with cache and integrity checks. |
| `auto` | Prefer local resources when present; otherwise fall back to web-backed resources. |

## Planned Version Commands

```bash
aiwg versions list
aiwg versions show stable
aiwg versions resolve '^2026.7.0'
```

Selectors will support exact versions, SemVer ranges, dist-tags/channels, and digest pins.

## Planned Per-Call Overrides

```bash
aiwg discover "architecture evolution" --resource-source web --aiwg-version stable
aiwg show skill architecture-evolution --aiwg-version 2026.7.15
aiwg use sdlc --resource-source auto --aiwg-version '^2026.7.0'
aiwg use sdlc --offline
```

Per-call overrides do not change project defaults. Mutating commands record the exact resolved version and digest in the configured project artifact root, for example `.aiwg/resources.lock.json` in ordinary projects.

## Safety Model

- Web-backed resources are opt-in first.
- Every fetched manifest and bundle must verify against digest metadata before use.
- Offline mode uses only verified cached bytes.
- Default web mode is blocked until rollback/freeze/mix-and-match protection exists.

Architecture and planning details for AIWG maintainers now live in the private
`roctinam/aiwg-web-release-ops` corpus under `corpus/.aiwg/`.
