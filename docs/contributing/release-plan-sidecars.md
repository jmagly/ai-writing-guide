# Release Plan Sidecars

Release plan sidecars let one project carry multiple independent release and
publishing tracks without putting every variant into `.aiwg/release.config`.

## Location

Store plans beside the main AIWG project config:

```text
.aiwg/aiwg.config
.aiwg/release.config
.aiwg/releases/<plan-id>.json
.aiwg/releases/<plan-id>.yaml
.aiwg/releases/<plan-id>.yml
```

The schema is
`agentic/code/frameworks/sdlc-complete/schemas/flows/release-plan.schema.yaml`.

## Selection

`flow-release` discovers `.json`, `.yaml`, and `.yml` files under
`.aiwg/releases/`.

- Use `--plan <id>` when more than one plan exists.
- If exactly one sidecar exists, `flow-release` may select it automatically.
- If multiple plans exist and no plan is selected, the flow must stop and list
  available plan ids.
- If duplicate ids exist, the flow must stop and require unique ids.
- If a requested plan is missing, the flow must stop; it must not silently fall
  back to `.aiwg/release.config`.

Before taking release actions, agents must report the active plan id, sidecar
path, target, and effective delivery mode.

## Precedence

When a sidecar is active, its `delivery.mode` is authoritative for that release
track. It overrides broad project defaults from `.aiwg/aiwg.config`, such as
`direct`, `pr`, or `pr-required`, where they conflict.

This allows a repository to keep normal development in PR-required mode while a
release plan uses tag-only, dispatch-only, or another explicit publish path.

## Plan Contents

A sidecar can define:

- release identity: `id`, `name`, and `target`
- build commands
- validation gates
- publish targets and registries/remotes
- artifact, signing, SBOM, and provenance requirements
- changelog, docs, and release-note expectations
- post-release verification commands
- delivery override behavior

See `.aiwg/releases/aiwg-npm.yaml` for an AIWG package-release example covering
build commands, publish targets, signing/SBOM/provenance expectations, and
post-release verification.
