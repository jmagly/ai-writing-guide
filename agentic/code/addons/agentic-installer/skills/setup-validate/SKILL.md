---
namespace: aiwg
name: setup-validate
platforms: [all]
description: "Validate a `setup.aiwg.io/v1` SetupManifest file against the schema and run cons"
---

# setup-validate

Validate a `setup.aiwg.io/v1` SetupManifest file against the schema and run consistency checks.

## Trigger Phrases

- "validate setup manifest"
- "check setup.manifest.yaml"
- "aiwg setup-validate [manifest]"
- "lint installer manifest"
- "verify my setup manifest"

## Parameters

### manifest (positional, optional)
Path to the `setup.manifest.yaml`. Default: `./setup.manifest.yaml`.

### --schema (optional)
Path to schema file. Default: auto-located from AIWG installation.

### --strict (optional)
Fail on warnings in addition to errors.

### --fix (optional)
Reserved for future safe autofixes. The current CLI validates and reports only.

## Validation Checks

### Schema Validation
- `apiVersion` must be `setup.aiwg.io/v1`
- `kind` must be `SetupManifest`
- Required fields present: `metadata.name`, `spec.platforms`, `spec.steps`
- All step types are one of: `script`, `detect`, `ask`, `verify`, `agentic`, `platform-route`, `chain`, `os-config`
- Param types are one of: `string`, `path`, `boolean`, `integer`, `choice`
- `metadata.install_type` must be one of: `user`, `developer`, `ci` (if present)
- `metadata.execution_mode` must be `deterministic` or `provider-orchestrated` (if present)

### Reference Checks
- Every `script:` path exists relative to the manifest directory
- Every `chain:` manifest path exists
- Every `platform-route` route value resolves to an existing script
- `depends_on` step IDs all exist in the manifest
- Recovery `triggers` list references valid step IDs
- `os-config` steps: `config_id` must reference a valid entry in `spec.os_config`

### Developer Manifest Checks (when `metadata.install_type: developer`)

These checks apply only to manifests with `install_type: developer`:

#### Errors
- `os-config` steps must reference a valid `config_id` in the `spec.os_config` block
- `interactive_required: true` params must not have a `default` value — a default defeats the purpose of requiring interactive input
- Each platform declared in `spec.platforms` must have at least one platform-specific step or `os_config` entry

#### Warnings (unless `--strict`, then errors)
- Developer manifest with no `os_config` block: warn unless `metadata.description` explicitly states why no OS configuration is needed
- `os_config` entries with `requires_relogin: true` but no corresponding `os-config` step — the entry is declared but never applied
- `os_config` entries with `interactive: true` but no user-facing explanation in `description`

### Consistency Checks (warnings unless --strict)
- Steps without `id` — suggest auto-generated IDs
- Sequential steps that logically depend on prior steps but have no `depends_on`
- Params declared but never referenced in scripts or `when` conditions
- Prerequisites with no `install_hint` (hard to debug without one)
- Verify expressions that look like they'd always pass (e.g., `true`)
- `interactive_required: true` params that also have `required: true` — the `required` flag is redundant when `interactive_required` is set

### Script Safety Checks
- Scripts that exist: read first 5 lines to confirm they source lib scripts
- Warn if a script template is used directly without customization (template placeholder text detected)

### Agentic Step Audit
- Warn on any `type: agentic` step in a deterministic manifest — print a reminder that agentic steps are exception handling only
- Do not warn merely because a provider-orchestrated manifest uses agentic steps
- Error if `type: agentic` step has no `instruction` field

## Output Format

```
Validating: setup.dev.manifest.yaml

  Schema:        ✓ Valid (setup.aiwg.io/v1 / SetupManifest)
  Install type:  developer
  Metadata:      ✓ name=myapp-dev version=1.0.0
  Platform:      ✓ linux (ubuntu, debian), macos
  Params:        ✓ 4 params (INSTALL_DIR required, LOCAL_DOMAIN interactive_required, SSH_EMAIL interactive_required, IDE interactive_required)
  Prerequisites: ✓ 2 checked (git >=2.30, docker)
  OS Config:     ✓ 3 entries (docker-group [linux, requires_relogin], inotify-watches [linux], xcode-cli-tools [macos, interactive])

  Steps (7):
    ✓ clone             script      installer/scripts/clone.sh [exists]
    ✓ setup-git-config  script      installer/scripts/dev/setup-git-config.sh [exists]
    ✓ setup-ssh-key     script      installer/scripts/dev/setup-ssh-key.sh [exists]
    ✓ apply-docker-group  os-config  config_id=docker-group [valid]
    ✓ apply-inotify     os-config   config_id=inotify-watches [valid]
    ✓ configure-dev     script      installer/scripts/dev/configure-dev.sh [exists]
    ✓ verify-dev        script      installer/scripts/dev/verify-dev.sh [exists]

  Recovery (1):
    ✓ full-reset  script [exists]

  Warnings (1):
    ⚠ xcode-cli-tools os_config entry declared but no os-config step applies it

Result: VALID (1 warning)
```

### Error Example

```
  Errors (2):
    ✗ Step 'apply-docker-group': config_id 'docker-group' not found in os_config block
    ✗ Param 'LOCAL_DOMAIN': interactive_required=true but has a default value — remove the default

Result: INVALID — fix errors before running
```

## Auto-fix (--fix)

`--fix` is reserved for future safe autofixes. The current agent-facing CLI
validates and reports only; it does not mutate manifests.

## References

- Schema: `agentic/code/addons/agentic-installer/schemas/v1/setup-manifest.schema.json`
- Run skill: `agentic/code/addons/agentic-installer/skills/setup-run/SKILL.md`
- Generate skill: `agentic/code/addons/agentic-installer/skills/setup-generate/SKILL.md`
