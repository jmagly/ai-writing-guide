---
namespace: aiwg
name: setup-run
platforms: [all]
description: "Execute a `setup.aiwg.io/v1` SetupManifest, performing cross-platform installati"
---

# setup-run

Execute a `setup.aiwg.io/v1` SetupManifest, performing cross-platform installation step by step.

## Trigger Phrases

- "run the setup manifest"
- "install using setup.manifest.yaml"
- "execute installer for [project]"
- "aiwg setup-run [manifest]"
- "run setup for [project]"
- "run dev setup for [project]"

## Parameters

### manifest (positional, optional)
Path to the `setup.manifest.yaml`. Default: `./setup.manifest.yaml`.

### --dry-run (optional)
Print what would be executed without running any scripts.

### --platform (optional)
Override platform detection: `linux`, `macos`, `windows`, `wsl2`.

### --distro (optional)
Override distro detection: `ubuntu`, `debian`, `fedora`, `arch`, etc.

### --params-file (optional)
Path to a YAML file with pre-set param values (avoids interactive prompts).

### --step (optional)
Run only a specific step by `id`. Useful for resuming after failure.

### --skip (optional)
Comma-separated step IDs to skip.

### --type (optional)
Filter which manifest to run by install type: `user`, `developer`, or `ci`.

When `--type developer` is specified and no manifest path is given, the skill looks for `installer/setup.dev.manifest.yaml` before falling back to `setup.manifest.yaml`.
When `--type user` is specified, the skill looks for `installer/setup.user.manifest.yaml`.

## Execution Flow

### Phase 1: Load and Validate

1. Read the manifest file
2. Validate against `setup.aiwg.io/v1` schema (run setup-validate internally)
3. If invalid, report errors and stop — do not attempt partial execution

### Phase 2: Platform Detection

1. Detect OS: `uname -s` (Linux/Darwin) or `$PSVersionTable` (Windows)
2. Detect distro: `/etc/os-release` → `ID` field
3. Detect arch: `uname -m`
4. Detect shell: `$SHELL` or `$0`
5. Match against manifest `platform` block — if no match, warn and ask to proceed or abort

### Phase 3: Param Collection

For each param in manifest `params`:
1. Check if already set in environment or `--params-file`
2. If `required: true` and no value: prompt interactively
3. If `interactive_required: true`: always prompt interactively, even if a default exists — do not use the default without asking
4. If `choices` list present: validate input against choices
5. Expand `~` and `$HOME` in `type: path` params

### Phase 4: Prerequisite Check

For each prerequisite:
1. Run `detect` command
2. If `version_min` set: compare version output against minimum
3. On failure: print `install_hint` and stop with non-zero exit

### Phase 5: OS Config Summary (developer manifests only)

When `metadata.install_type` is `developer` and the manifest has an `os_config` block:

1. Run each `os_config` entry's `check` command
2. Collect entries where `check` returns non-zero (needs configuration)
3. Print a summary of OS mutations that will be made:
   ```
   [setup] OS Configuration Required

   The following OS-level changes will be made:
     • docker-group: Add user 'alice' to docker group (requires re-login)
     • inotify-watches: Set fs.inotify.max_user_watches=524288

   These changes require elevated privileges (sudo).
   ```
4. Ask for explicit user confirmation before proceeding with any `os-config` steps:
   ```
   Proceed with OS configuration? [y/N]:
   ```
5. If denied, skip all `os-config` steps and warn that the environment may be incomplete.

Never apply OS mutations without this explicit confirmation. This is a separate gate from the normal params phase.

### Phase 6: Step Execution

Execute steps in dependency order:

```
For each step (respecting depends_on order):
  1. Evaluate `when` condition — skip step if false
  2. Skip steps not applicable to current platform
  3. Dispatch by step type:
     - script:         run the script with params as env vars
     - detect:         run detect command, set env var with result
     - ask:            prompt user, set param
     - verify:         run verify expression; fail if false
     - agentic:        delegate to installer-agent with instruction
     - platform-route: resolve platform → script path, run script
     - chain:          run aiwg setup-run on sub-manifest
     - os-config:      run the referenced os_config entry (see below)
  4. Run `verify` expression if present
  5. On failure:
     a. Check recovery_procedures for a matching trigger
     b. If found: show recovery plan and ask user to confirm before running
     c. If not found or recovery fails: report step ID + error, stop
```

#### os-config Step Execution

When executing an `os-config` step:

1. Look up the `config_id` in the manifest's `os_config` block
2. Run the `check` command — if exit 0, print "already configured" and skip
3. If the entry has `interactive: true`:
   - Print an explanation of what the `apply` command will do
   - Warn: "This step will trigger an interactive dialog or GUI prompt."
   - Ask for user acknowledgment before running:
     ```
     [setup] Interactive step: xcode-cli-tools
     This will trigger the Xcode Command Line Tools installation dialog.
     Acknowledge and continue? [y/N]:
     ```
4. Run the `apply` command
5. If the entry has `requires_relogin: true`:
   - After the step completes, pause and print:
     ```
     [setup] NOTICE: docker-group requires re-login to take effect.
     Log out and back in, then re-run setup-run with --step <next-step-id>
     to continue from where you left off.

     Continue (if you have already re-logged in)? [y/N]:
     ```

### Phase 7: Completion Report

```
[setup] Installation complete

  Steps run:    4/4
  Steps skipped: 0
  Duration:     45s

  Installed to: /opt/myapp
  Config dir:   ~/.config/myapp

Run `myapp --version` to verify.
```

For developer installs, also report:
```
[setup] Developer environment ready

  OS config applied: docker-group, inotify-watches
  Re-login required: docker-group (log out and back in)
  Dev server:   http://myapp.local:3000
```

## Dry Run Output

```
[setup:dry-run] Would execute: setup.manifest.yaml
  Platform: linux/ubuntu/x86_64
  Install type: developer

  OS Config (2 entries, 1 needs configuration):
    ✓ docker-group: already configured
    ✗ inotify-watches: needs configuration (current: 8192, required: 524288)

  Step 1: clone (script)
    script: installer/scripts/clone.sh
    env:    INSTALL_DIR=/opt/myapp BRANCH=main
    verify: test -d ${INSTALL_DIR}/.git

  Step 2: apply-inotify (os-config)
    config_id: inotify-watches
    platform:  linux

  Step 3: configure-dev (script)
    script: installer/scripts/dev/configure-dev.sh

  Step 4: verify-dev (script)
    script: installer/scripts/dev/verify-dev.sh
```

## Recovery Handling

When a step fails and a recovery procedure matches:

```
[setup] Step 'clone' failed:
  Error: destination path already exists and is not empty

Recovery procedure 'full-reset' is available:
  This will: remove /opt/myapp and re-clone from git

Proceed with recovery? [y/N]: _
```

Never run destructive recovery steps without explicit user confirmation.

## Agentic Steps

When a step has `type: agentic`, the skill delegates to `installer-agent` with the step's `instruction` field as context, plus:
- The full manifest (for environment context)
- The current param values
- The failure output from any preceding script attempt

The installer-agent must explain what it detects and what it will do before making changes.

## References

- Schema: `agentic/code/addons/agentic-installer/schemas/v1/setup-manifest.schema.json`
- Agent: `agentic/code/addons/agentic-installer/agents/installer-agent.md`
- Script lib: `agentic/code/addons/agentic-installer/scripts/lib/`
- Generate skill: `agentic/code/addons/agentic-installer/skills/setup-generate/SKILL.md`
