# WORKSPACE.md
<!-- aiwg-managed -->
<!-- Generated structure by AIWG; operator content is protected by markers. -->

<!-- AIWG:workspace-context:start -->

## AIWG Context Graph

This file is the canonical provider-neutral home for project and operator context.
Provider startup files are generated adapters: they direct the harness here first,
then to AIWG.md for framework discovery and routing.

### Precedence

1. Provider, system, and organization instructions retain their native authority.
2. Root WORKSPACE.md supplies shared project/operator context.
3. AIWG.md supplies generated framework/discovery context.
4. Narrower linked files and provider-native subtree instructions govern their declared scope.

### Ownership

- Edit project-neutral notes only inside the protected Project Context section below.
- Keep detailed policies, runbooks, hooks, and quickrefs in linked files.
- Keep provider-only directives in `.aiwg/context/providers/`.
- Never store secrets, tokens, credentials, or machine-local sensitive values here.

### Linked Context

- [AIWG framework context](./AIWG.md)
- [AIWG project configuration](.aiwg/aiwg.config)
- [Project-local quickref](.aiwg/quickref.json) (when configured)

<!-- AIWG:workspace-context:end -->

<!-- AIWG:workspace-operator:start -->

<!-- AIWG:project-extraction:start -->

## Existing Project Snapshot

<!-- Generated from stable project metadata. Edit the linked sources, not this block. -->

### Package (source: [`package.json`](./package.json))

- Name: `aiwg`
- Description: Deployment tool and support utility for AI context. Copies agents, skills, commands, rules, and behaviors into the paths each AI platform reads (Claude Code, Codex, Copilot, Cursor, Warp, OpenClaw, and 6 more) so one source of truth works across 10 platforms. Optional utilities for persistent artifact memory, background orchestration, autonomous loops, and…
- Runtime: `node >=20.0.0`

### Common Commands (source: [`package.json`](./package.json))

- `npm run build`
- `npm run test`
- `npm run typecheck`

### Purpose (source: [`README.md`](./README.md))

Multi-agent AI framework for Claude Code, Copilot, Cursor, Warp, and 6 more platforms

### Stack and Tooling

- [`package-lock.json`](./package-lock.json)
- [`tsconfig.json`](./tsconfig.json)

### Architecture and Topology

- [`docs/architecture`](./docs/architecture)
- [`src`](./src)
- [`apps`](./apps)
- [`packages`](./packages)

### Testing

- [`test`](./test)

### Continuous Integration

- [`.gitea/workflows/build-plugins.yml`](./.gitea/workflows/build-plugins.yml)
- [`.gitea/workflows/ci.yml`](./.gitea/workflows/ci.yml)
- [`.gitea/workflows/conformance.yml`](./.gitea/workflows/conformance.yml)
- [`.gitea/workflows/docsite-build.yml`](./.gitea/workflows/docsite-build.yml)
- [`.gitea/workflows/docsite-deploy.yml`](./.gitea/workflows/docsite-deploy.yml)
- [`.gitea/workflows/fortemi-shard-conformance.yml`](./.gitea/workflows/fortemi-shard-conformance.yml)
- [`.gitea/workflows/gitea-release.yml`](./.gitea/workflows/gitea-release.yml)
- [`.gitea/workflows/github-mirror.yml`](./.gitea/workflows/github-mirror.yml)
- [`.gitea/workflows/hermes-citations.yml`](./.gitea/workflows/hermes-citations.yml)
- [`.gitea/workflows/metadata-validation.yml`](./.gitea/workflows/metadata-validation.yml)
- [`.gitea/workflows/notify-site.yml`](./.gitea/workflows/notify-site.yml)
- [`.gitea/workflows/npm-publish.yml`](./.gitea/workflows/npm-publish.yml)
- [`.gitea/workflows/scheduled-docs-release.yml`](./.gitea/workflows/scheduled-docs-release.yml)
- [`.gitea/workflows/skill-lint-pr.yml`](./.gitea/workflows/skill-lint-pr.yml)
- [`.gitea/workflows/storage-server-conformance.yml`](./.gitea/workflows/storage-server-conformance.yml)
- [`.gitea/workflows/upload-release-sigs.yml`](./.gitea/workflows/upload-release-sigs.yml)
- [`.github/workflows/npm-publish.yml`](./.github/workflows/npm-publish.yml)
- [`.github/workflows/socket-post-publish.yml`](./.github/workflows/socket-post-publish.yml)

<!-- AIWG:project-extraction:end -->

<!-- AIWG:workspace-operator:end -->
