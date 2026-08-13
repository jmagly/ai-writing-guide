# Best-Practices Audit: AIWG Agentic Install Flow

**Generated**: 2026-08-13
**Focus**: installation safety, onboarding, cross-platform recovery, documentation
**Depth**: standard
**Cite threshold**: 2

## Executive Summary

The one-paste provider flow is the shortest path to a verified AIWG project and
is now the primary route on AIWG.io and the public getting-started docs. The
audit found one contract-level ambiguity: AIWG's conversational public manifest
used reasoning steps as its primary workflow, while generic SetupManifest rules
and `setup-run` assumed deterministic, script-first execution. The new explicit
execution mode resolves that mismatch and makes unsupported CLI execution fail
before mutation with a useful handoff.

## Findings

### 1. Distinguish conversational orchestration from deterministic execution

- **Current state in project**: `setup.aiwg.yaml` now declares
  `provider-orchestrated`; the schema, validator, runner, installer agent,
  steward, and reference docs share that distinction.
- **Current industry practice**: installation automation should expose a
  predictable execution contract and stop before mutation when prerequisites or
  runtime assumptions are unmet.
- **Alignment**: ALIGNED
- **Confidence**: high
- **Evidence**:
  - [S1] npm documents global installation as a specific CLI operation and
    directs permission failures to explicit remediation rather than implicit
    privilege escalation.
  - [S2] Microsoft separates Windows and WSL execution environments and
    recommends verifying the selected Node/npm environment before use.
- **Recommendation**: keep `provider-orchestrated` exceptional and explicit;
  retain script-first behavior as the default for generated application
  manifests.

### 2. Keep version-manager and no-`sudo` guidance

- **Current state in project**: the public manifest detects existing managers,
  avoids stacking them, rejects blind `sudo` repair, and prefers a current LTS
  line for new installs.
- **Current industry practice**: npm recommends a Node version manager for
  global-install permission problems; Microsoft similarly recommends NVM for
  WSL and notes that it avoids `sudo` for global npm packages.
- **Alignment**: ALIGNED
- **Confidence**: high
- **Evidence**:
  - [S1] npm, “Resolving EACCES permissions errors when installing packages globally.”
  - [S2] Microsoft Learn, “Set up Node.js on WSL 2.”
- **Recommendation**: keep the current safeguards and periodically refresh the
  preferred active LTS wording without hard-coding a short-lived release line.

### 3. Separate interactive onboarding from CI and restricted environments

- **Current state in project**: the public manifest now routes CI, cloud-init,
  containers, SSH-only, offline, proxy-restricted, and read-only cases to the
  non-interactive/manual documentation rather than improvising an interactive
  repair.
- **Current industry practice**: supported runtime versions and reproducible
  package invocation should be chosen explicitly; `npx` is an available
  alternative when a persistent global install is inappropriate.
- **Alignment**: ALIGNED
- **Confidence**: moderate
- **Evidence**:
  - [S1] Node.js publishes lifecycle status and recommends supported LTS lines
    for production use.
  - [S2] npm documents `npx` as an alternative to global installation.
- **Recommendation**: add dedicated automated scenario fixtures over time for
  native Windows, WSL, offline/proxy failure, multiple providers, monorepos,
  development links, and read-only workspaces.

## Dissenting Views / Open Debates

A mutable `main`-branch manifest URL gives users the freshest repair logic but
does not provide release-level immutability. A version-pinned URL would improve
reproducibility while making onboarding copy stale unless release automation
updates it. This audit leaves the existing canonical URL unchanged and treats
signed/versioned delivery as a follow-up design decision.

## Sources

- [S1] npm Docs, [Resolving EACCES permissions errors when installing packages globally](https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally/), retrieved 2026-08-13.
- [S2] Microsoft Learn, [Set up Node.js on WSL 2](https://learn.microsoft.com/windows/dev-environment/javascript/nodejs-on-wsl), retrieved 2026-08-13.
- [S3] Node.js, [Node.js Releases](https://nodejs.org/en/about/previous-releases), retrieved 2026-08-13.
- [S4] npm Docs, [Downloading and installing packages globally](https://docs.npmjs.com/downloading-and-installing-packages-globally/), retrieved 2026-08-13.

## Methodology Notes

- Sources were restricted to authoritative vendor/project documentation.
- Findings below the two-source threshold were not reported as established
  external consensus.
- Repository behavior was verified with strict manifest validation, unit and
  integration tests, TypeScript checking, schema linting, documentation audience
  checks, generated-plugin packaging, and the AIWG.io production build/tests.
