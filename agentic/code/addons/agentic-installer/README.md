# Agentic Installer

An AIWG addon that defines the `setup.aiwg.io/v1` SetupManifest language for cross-platform, script-first software installation workflows.

## Overview

The agentic-installer addon provides:

- **SetupManifest schema** — a YAML RFC language for describing multi-platform installation workflows
- **Script template library** — reusable bash and PowerShell templates for common installation tasks
- **Skills** — `setup-generate`, `setup-run`, `setup-validate`
- **Agent** — `installer-agent` for adaptive exception handling
- **Rules** — safety and authoring rules enforcing script-first design

## Design Philosophy

**Scripts are the primary artifact. Agentic steps are exception handling only.**

A well-written SetupManifest produces shell scripts that run standalone, without AI tooling. The `type: agentic` step exists only for recovery from unexpected environment states. If you can script it, script it.

## Quick Start

```yaml
# setup.manifest.yaml
apiVersion: setup.aiwg.io/v1
kind: SetupManifest
metadata:
  name: myapp
  version: 1.0.0

platform:
  os: [linux, macos]
  distros: [ubuntu, debian, fedora]
  arch: [x86_64, arm64]
  shell: [bash, zsh]

params:
  - name: INSTALL_DIR
    type: path
    required: true
    description: Installation directory

prerequisites:
  - detect: "command -v git"
    version_min: "2.30"
    install_hint: "Install git: https://git-scm.com"

steps:
  - id: clone
    type: script
    script: installer/scripts/clone.sh
    verify: "test -d ${INSTALL_DIR}/.git"

  - id: configure
    type: script
    script: installer/scripts/configure.sh
    depends_on: [clone]

  - id: verify
    type: script
    script: installer/scripts/verify.sh
    depends_on: [configure]

recovery_procedures:
  - id: full-reset
    description: Remove and re-clone
    triggers: [clone]
    script: installer/scripts/reset.sh
```

```bash
# Generate starter runtime assets
aiwg setup-generate --output setup.manifest.yaml

# Validate for agentic runtime consumption
aiwg setup-validate setup.manifest.yaml

# Dry run without executing steps
aiwg setup-run --manifest setup.manifest.yaml --dry-run

# Execute only after the automation has reviewed the plan and has authorization
aiwg setup-run --manifest setup.manifest.yaml --confirm
```

## Agentic Runtime Commands

These CLI entrypoints are for agents and automation. They are intentionally
machine-oriented surfaces that make setup assets discoverable, validateable, and
executable under explicit safety gates.

| Command | Backing skill | Description |
|---------|---------------|-------------|
| `setup-generate` | `setup-generate` | Generate starter manifest and script assets |
| `setup-validate` | `setup-validate` | Validate a manifest against schema and consistency checks |
| `setup-run` | `setup-run` | Validate, plan, and execute manifest steps with confirmation gates |

## Script Template Library

Located in `scripts/`:

```
lib/
  detect.sh      — OS/distro/arch detection, aiwg_has_cmd, aiwg_version_gte
  params.sh      — aiwg_require_param, aiwg_expand_path, aiwg_choice_param
  verify.sh      — aiwg_verify_cmd, aiwg_verify_path, aiwg_verify_cmd_version
  detect.ps1     — PowerShell equivalents of detect.sh helpers

templates/
  clone.sh                     — git clone (bash)
  clone.ps1                    — git clone (PowerShell)
  install-deps-ubuntu.sh       — apt-get package installation
  install-deps-fedora.sh       — dnf/yum package installation
  install-deps-macos.sh        — Homebrew package installation
  install-deps.ps1             — winget/choco package installation
  configure.sh                 — create config dir, copy defaults (bash)
  configure.ps1                — create config dir, copy defaults (PowerShell)
  verify.sh                    — post-install verification
  reset.sh                     — recovery: remove and re-clone
  hub-chain.sh                 — orchestrate sub-project installers
```

All templates source `lib/detect.sh`, `lib/params.sh`, and `lib/verify.sh`.

## Step Types

| Type | When to Use |
|------|-------------|
| `script` | Known, scriptable operation — use this first |
| `detect` | Check environment state (OS, version, existing installs) |
| `ask` | Collect user input when no reasonable default exists |
| `verify` | Post-installation validation |
| `agentic` | Exception handling, unexpected environments — last resort |
| `platform-route` | Branch to different scripts based on OS/distro |
| `chain` | Invoke another project's SetupManifest |

## Platform Support

| Platform | Shell | Supported |
|----------|-------|-----------|
| Linux (Ubuntu/Debian) | bash, zsh | ✓ |
| Linux (Fedora/RHEL) | bash, zsh | ✓ |
| Linux (Arch) | bash, zsh | ✓ |
| macOS | bash, zsh | ✓ |
| Windows (native) | PowerShell 5.1+ | ✓ |
| WSL2 | bash | ✓ |

## Rules

| Rule | Priority | Description |
|------|----------|-------------|
| `installer-safety` | HIGH | 7 mandatory safety behaviors |
| `installer-authoring` | HIGH | 5 authoring rules for manifests and scripts |

## Related Issues

- [#663](https://git.integrolabs.net/roctinam/aiwg/issues/663) — SetupManifest YAML RFC (`setup.aiwg.io/v1`)
- [#664](https://git.integrolabs.net/roctinam/aiwg/issues/664) — Script template library
- [#665](https://git.integrolabs.net/roctinam/aiwg/issues/665) — `setup-generate` skill
- [#666](https://git.integrolabs.net/roctinam/aiwg/issues/666) — `setup-run` skill
- [#667](https://git.integrolabs.net/roctinam/aiwg/issues/667) — `setup-validate` skill + `installer-agent`
