# Requirements: Web-Backed AIWG Resource Distribution

**Status**: Draft
**Date**: 2026-07-21
**Phase**: Elaboration
**Related epic**: #1847

## Goal

Allow operators to install a lightweight AIWG CLI while resolving AIWG resource bundles from local paths or versioned `aiwg.io` web resources through the same CLI abstraction.

## Functional Requirements

| ID | Requirement |
|---|---|
| WBR-FR-001 | The CLI resolves AIWG resources through a single resolver abstraction. |
| WBR-FR-002 | The resolver supports `local`, `web`, and `auto` source modes. |
| WBR-FR-003 | Operators can select an exact version, SemVer range, dist-tag/channel, or digest pin. |
| WBR-FR-004 | Any resource-bearing command can accept a per-call version override without mutating project defaults. |
| WBR-FR-005 | Mutating commands record the resolved immutable version and digest in `.aiwg/resources.lock.json`. |
| WBR-FR-006 | `aiwg versions list/show/resolve` exposes available web resource versions and channels. |
| WBR-FR-007 | Web-backed resources are cached and reused across projects. |
| WBR-FR-008 | `--offline` uses only verified cached resources and never fetches from the network. |
| WBR-FR-009 | Existing local installs continue to behave as they do today unless the operator opts into web mode. |
| WBR-FR-010 | Provider-facing bootstrap artifacts must not depend on absolute npm install paths for AIWG-owned resources. |

## Non-Functional Requirements

| ID | Requirement |
|---|---|
| WBR-NFR-001 | Digest mismatch, malformed manifest, or incompatible CLI/resource schema fails closed. |
| WBR-NFR-002 | Cold web resolution failure reports a clear remediation path: retry, use local, or warm cache. |
| WBR-NFR-003 | Warm-cache offline discovery/show/use tests must pass without network access. |
| WBR-NFR-004 | Web mode must preserve local-mode command output semantics unless a command explicitly reports source/version metadata. |
| WBR-NFR-005 | Default web mode is blocked until rollback/freeze/mix-and-match protection exists. |
| WBR-NFR-006 | Published immutable release bundles remain available after channel movement. |

## User Stories

- As an operator, I can install the AIWG CLI without pulling the full resource corpus into the npm package.
- As an agentic session, I can call `aiwg discover`, `aiwg show`, and `aiwg use` without knowing whether resources are local or web-backed.
- As a release tester, I can run one command against `canary` or an exact historical resource version without changing project config.
- As an offline operator, I can run against a previously locked and cached resource graph.
- As a maintainer, I can publish a release once and then move `stable` or `canary` channel manifests without rewriting immutable release artifacts.

## Public CLI Contract

```bash
aiwg versions list [--json]
aiwg versions show <version|tag> [--json]
aiwg versions resolve <version|range|tag|digest> [--json]

aiwg <command> ... --resource-source local|web|auto
aiwg <command> ... --aiwg-version <version|range|tag|digest>
aiwg <command> ... --offline
```

Environment variables for automation:

```bash
AIWG_RESOURCE_SOURCE=local|web|auto
AIWG_RESOURCE_VERSION=<version|range|tag|digest>
AIWG_OFFLINE=1
```

## Acceptance Criteria

- [ ] Resolver module centralizes local/web/cache resource lookup.
- [ ] `aiwg versions` returns available versions, channel mappings, and compatibility metadata.
- [ ] Per-call flags override config and do not persist unless a mutating command writes the lockfile.
- [ ] `.aiwg/resources.lock.json` records source, selector, resolved version, manifest URL, and digests.
- [ ] Web resource fetches verify digests before use.
- [ ] Local-vs-web parity tests cover discovery, show, use, regenerate, and provider deployment.
- [ ] `aiwg doctor` reports resource source mode, selected version, cache status, and lock drift.
- [ ] Documentation distinguishes CLI binary version from resource bundle version.
