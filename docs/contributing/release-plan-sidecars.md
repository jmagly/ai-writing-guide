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

The shipped, schema-validated reference examples are:

- `agentic/code/frameworks/sdlc-complete/schemas/flows/examples/aiwg.release.config.yaml`
- `agentic/code/frameworks/sdlc-complete/schemas/flows/examples/aiwg-npm.release-plan.yaml`

AIWG keeps its attached operational copies at `.aiwg/release.config` and
`.aiwg/releases/aiwg-npm.yaml`. The public examples keep clean clones and CI
validating the exact configuration shape even when the project artifact corpus
is attached through `.aiwg-location`.
