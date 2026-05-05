# SetupManifest Reference (`setup.aiwg.io/v1`)

## Overview

`setup.aiwg.io/v1` is a Kubernetes-style YAML language for declaring cross-platform,
script-first software installation. A SetupManifest declares a platform matrix,
user-facing parameters, prerequisite checks, OS-level configuration entries, ordered
installation steps, and named recovery procedures. Manifests are validated, executed,
and authored by the **agentic-installer** addon.

**Design philosophy**: scripts are the primary artifact. The `agentic` step type exists
only for exception handling and adaptive recovery — not as a substitute for scripting
known sequences. A well-written SetupManifest produces shell scripts that run
standalone without AI tooling.

The authoritative JSON Schema lives at
`agentic/code/addons/agentic-installer/schemas/v1/setup-manifest.schema.json`. This
document mirrors that schema; on conflict the schema wins.

## File Location and Discovery

By convention manifests live at `setup.manifest.yaml` in the project root. The
agentic-installer skills (`setup-generate`, `setup-validate`, `setup-run`) accept a
path argument; otherwise they look for `setup.manifest.yaml` relative to the working
directory.

## Top-Level Structure

```yaml
apiVersion: setup.aiwg.io/v1
kind: SetupManifest
metadata: { ... }
spec:
  platforms: [ ... ]
  params: [ ... ]
  prerequisites: [ ... ]
  os_config: [ ... ]
  steps: [ ... ]
  recovery: [ ... ]
  briefing: { ... }
```

| Field        | Type                       | Required | Description                         |
| ------------ | -------------------------- | -------- | ----------------------------------- |
| `apiVersion` | const `"setup.aiwg.io/v1"` | yes      | API version literal.                |
| `kind`       | const `"SetupManifest"`    | yes      | Resource kind literal.              |
| `metadata`   | object                     | yes      | Identity and audience info.         |
| `spec`       | object                     | yes      | Platform matrix and execution plan. |

`additionalProperties: false` at every object — unknown fields are rejected.

### `metadata`

| Field          | Type         | Required         | Description                   |
| -------------- | ------------ | ---------------- | ----------------------------- |
| `name`         | string       | yes              | Identifier for this manifest. |
| `description`  | string       | optional         | Free-form description.        |
| `version`      | string       | optional         | Manifest version.             |
| `install_type` | enum (below) | optional, `user` | Audience tag.                 |

`install_type` values: `user` (production deploy), `developer` (local dev environment),
`ci` (headless pipeline setup). Only `developer` manifests may use `os_config`.

### `spec`

| Field           | Type                        | Required | Description                                                                 |
| --------------- | --------------------------- | -------- | --------------------------------------------------------------------------- |
| `platforms`     | `Platform[]`                | yes (≥1) | Supported platform targets. Installer refuses to run on unlisted platforms. |
| `params`        | `Param[]`                   | optional | User-facing parameters resolved before any step executes.                   |
| `prerequisites` | `Prerequisite[]`            | optional | Prerequisite checks run before any step. Required ones abort if missing.    |
| `os_config`     | `OsConfigEntry[]`           | optional | OS-level configuration entries (developer manifests only).                  |
| `steps`         | `Step[]`                    | yes (≥1) | Ordered installation steps.                                                 |
| `recovery`      | `RecoveryProcedure[]`       | optional | Named recovery procedures referenced by steps via `on_fail`.                |
| `briefing`      | `{ success?, next_steps? }` | optional | Messages delivered on completion.                                           |

## Platform Matrix

```yaml
platforms:
  - os: linux
    distros: [ubuntu, debian, fedora]
    arch: [x86_64, arm64]
    shell: bash
```

| Field     | Type / values | Description                     |
| --------- | ------------- | ------------------------------- |
| `os`      | enum (below)  | OS family. Required.            |
| `distros` | string[]      | Optional distro filter (Linux). |
| `arch`    | string[]      | Optional architecture filter.   |
| `shell`   | enum (below)  | Shell context.                  |

- `os` values: `linux`, `macos`, `windows`, `docker`
- `distros` values: `ubuntu`, `debian`, `fedora`, `rhel`, `rocky`, `centos`, `arch`, `alpine`
- `arch` values: `x86_64`, `arm64`, `aarch64`
- `shell` values: `bash`, `zsh`, `sh`, `wsl2` (WSL2 bash on Windows), `native` (PowerShell/cmd)

## Params

User-facing parameters resolved before any step runs. Names use UPPER_SNAKE_CASE;
values are passed to scripts as env vars.

| Field                  | Type                  | Description                                                                                                                                                          |
| ---------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `name`                 | string                | Env-var-style name (UPPER_SNAKE_CASE). Required.                                                                                                                     |
| `type`                 | enum (below)          | Value type. Required.                                                                                                                                                |
| `default`              | any                   | Default if not provided by user.                                                                                                                                     |
| `required`             | bool, default `false` | Whether the param must be supplied.                                                                                                                                  |
| `description`          | string                | Human-readable explanation.                                                                                                                                          |
| `choices`              | string[]              | Valid values when `type: choice`.                                                                                                                                    |
| `interactive_required` | bool, default `false` | Force interactive prompt; cannot be pre-filled by default. Use when a wrong default would cause OS configuration changes (SSH key email, GPG key ID, preferred IDE). |

`type` values: `string`, `path` (expanded — `~` → home), `bool`, `int`, `choice`.

## Prerequisites

```yaml
prerequisites:
  - name: git
    detect: "command -v git"
    version_min: "2.30"
    install_hint: "Install git: https://git-scm.com"
```

| Field          | Type                 | Description                                                    |
| -------------- | -------------------- | -------------------------------------------------------------- |
| `name`         | string               | Required.                                                      |
| `detect`       | string               | Shell command. Exit 0 = present, non-zero = missing. Required. |
| `version_min`  | string               | Minimum version parsed from `detect` stdout.                   |
| `required`     | bool, default `true` | Required prerequisites abort install if missing.               |
| `install_hint` | string               | Shown when missing.                                            |

## OS Config Entries (Developer Manifests Only)

`os_config` declares OS mutations (kernel params, group membership, file permissions,
shell profile changes) as check/apply pairs. Reachable only via `type: os-config`
steps that reference an entry by `config_id`.

| Field              | Type                  | Description                                                                                        |
| ------------------ | --------------------- | -------------------------------------------------------------------------------------------------- |
| `id`               | string                | Unique identifier referenced by `config_id`. Required.                                             |
| `description`      | string                | What this entry does. Required.                                                                    |
| `check`            | string                | Shell command. Exit 0 = already configured (skip apply), non-zero = needs configuration. Required. |
| `apply`            | string                | Shell command or multi-line script to apply the configuration. Required.                           |
| `requires_relogin` | bool, default `false` | Installer warns the user that logout/login or new shell is required.                               |
| `interactive`      | bool, default `false` | Apply triggers a GUI dialog or interactive prompt; installer must pause and inform the user.       |
| `platforms`        | string[]              | Optional platform filter. Values: `linux`, `macos`, `windows`.                                     |

## Steps

Ordered installation steps. Each step has a `type` that selects one of seven execution
modes.

### Step types

| Type             | When to use                                                               |
| ---------------- | ------------------------------------------------------------------------- |
| `script`         | Known operation — use this first. Run a script file with declared params. |
| `detect`         | Check environment state.                                                  |
| `ask`            | Collect user input mid-install.                                           |
| `verify`         | Post-operation validation (run `commands`).                               |
| `agentic`        | Exception handling only — adaptive recovery via free-form `instruction`.  |
| `platform-route` | Branch by OS/distro using `routes`.                                       |
| `chain`          | Invoke a sub-project SetupManifest.                                       |
| `os-config`      | Apply a single `os_config` entry by ID (developer manifests only).        |

### Common step fields

| Field        | Type               | Description                                                                            |
| ------------ | ------------------ | -------------------------------------------------------------------------------------- |
| `id`         | string             | Unique step identifier. Referenced by `depends_on` and `on_fail`. Required.            |
| `type`       | enum (above)       | Execution mode. Required.                                                              |
| `platform`   | string or string[] | Platform filter. Omit to run on all declared platforms.                                |
| `depends_on` | string[]           | Step IDs that must complete successfully before this step runs.                        |
| `when`       | string             | Condition expression; step skipped if false. References params by name.                |
| `on_fail`    | string             | Recovery procedure ID to invoke on failure. The literal `recover` invokes the default. |

### Type-specific fields

| Type             | Required fields                              | Optional fields                          |
| ---------------- | -------------------------------------------- | ---------------------------------------- |
| `script`         | `script` (path relative to manifest)         | `params`, `verify`                       |
| `verify`         | `commands` (string[])                        | —                                        |
| `ask`            | `message`                                    | `on_deny` (`abort` or `skip`)            |
| `agentic`        | `instruction`                                | —                                        |
| `os-config`      | `config_id`                                  | —                                        |
| `platform-route` | `routes[]` (each `{platform, steps[]}`)      | —                                        |
| `chain`          | `manifest` (path or URL to chained manifest) | —                                        |
| `detect`         | —                                            | typically uses `verify`/`commands` shape |

For `script` steps: `params` lists param names passed to the script as env vars;
`verify` is one or more post-step commands (exit 0 = success).

## Recovery Procedures

Named groups of steps invoked when a step's `on_fail` matches.

```yaml
recovery:
  - id: full-reset
    steps:
      - id: reset
        type: script
        script: scripts/reset.sh
```

| Field   | Type     | Description                                            |
| ------- | -------- | ------------------------------------------------------ |
| `id`    | string   | Required. Procedure ID referenced by `step.on_fail`.   |
| `steps` | `Step[]` | Required. Recovery steps (same shape as `spec.steps`). |

## Briefing

```yaml
briefing:
  success: "Install complete. Run aiwg help to get started."
  next_steps:
    - "Run aiwg use sdlc to deploy the SDLC framework"
    - "Open ./README.md for project orientation"
```

## Worked Example

```yaml
apiVersion: setup.aiwg.io/v1
kind: SetupManifest
metadata:
  name: myapp
  version: 1.0.0
  install_type: user
spec:
  platforms:
    - os: linux
      distros: [ubuntu, debian, fedora]
      arch: [x86_64, arm64]
      shell: bash
    - os: macos
      arch: [arm64]
      shell: zsh
  params:
    - name: INSTALL_DIR
      type: path
      required: true
      description: "Where to clone the project"
  prerequisites:
    - name: git
      detect: "command -v git"
      version_min: "2.30"
      install_hint: "Install git: https://git-scm.com"
  steps:
    - id: clone
      type: script
      script: scripts/clone.sh
      params: [INSTALL_DIR]
      verify: "test -d ${INSTALL_DIR}/.git"
      on_fail: full-reset
    - id: configure
      type: script
      script: scripts/configure.sh
      depends_on: [clone]
  recovery:
    - id: full-reset
      steps:
        - id: reset
          type: script
          script: scripts/reset.sh
  briefing:
    success: "Install complete."
    next_steps:
      - "cd ${INSTALL_DIR} && ./bin/myapp --help"
```

## Tooling

The agentic-installer addon ships three skills and one agent:

- **`setup-generate`** — discover project artifacts, assemble manifest + script stubs.
- **`setup-validate`** — schema + reference checks + agentic-step audit + `--fix`.
- **`setup-run`** — six-phase execution with platform detection, dry-run, and recovery
  confirmation gate.
- **`installer-agent`** — specialized persona for manifest generation, validation, and
  execution.

```bash
# Generate from a project
aiwg setup-generate

# Validate
aiwg setup-validate setup.manifest.yaml

# Dry run
aiwg setup-run --dry-run

# Execute
aiwg setup-run
```

Two HIGH-severity rules govern manifest authoring and execution:

- **`installer-safety`** — show before run, confirm destructive ops, validate before
  execute, agentic-steps-as-exceptions, params-before-steps, no inline secrets,
  platform mismatch = skip.
- **`installer-authoring`** — script-first, always source libs, manifests describe
  while scripts act, one manifest per unit, every manifest needs recovery.

## Cross-References

- **Schema (authoritative)**:
  `agentic/code/addons/agentic-installer/schemas/v1/setup-manifest.schema.json`
- **Addon source**: `agentic/code/addons/agentic-installer/`
- **Script templates**: `agentic/code/addons/agentic-installer/scripts/templates/`
  (clone, install-deps for ubuntu/fedora/macos/windows, configure, verify, reset,
  hub-chain)
- **Library helpers** (sourced by templates):
  `agentic/code/addons/agentic-installer/scripts/lib/{detect,params,verify}.sh`,
  `detect.ps1`
- **Authoring rules**:
  `agentic/code/addons/agentic-installer/rules/installer-authoring.md`,
  `installer-safety.md`
- **Release announcement** (introduces the language):
  `docs/releases/v2026.4.0-announcement.md` (#663–#667)
- **Project-level config** (separate concern): see [`aiwg-config.md`](./aiwg-config.md)
