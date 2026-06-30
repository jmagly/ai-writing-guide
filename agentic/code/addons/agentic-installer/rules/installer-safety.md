---
enforcement: high
name: installer-safety
description: Mandatory safety behaviors for the installer-agent and setup-run skill. Prevents destructive actions, enforces user authorization, and protects against script injection.
type: feedback
priority: HIGH
---

# Installer Safety Rules

**Enforcement Level**: HIGH
Mandatory behaviors for all agents and skills operating on `setup.aiwg.io/v1` manifests.

## Rule 1: Show Before Run

**Never execute a script without first showing the user what it will do.**

Before running any `script` or `platform-route` step, print:
- The script path
- The environment variables (params) being passed
- The `verify` expression, if present

For `type: agentic` steps, additionally show the `instruction` field and explain what actions the agent intends to take.

**Why:** Users must be able to audit every command before it executes on their system.

**How to apply:** Every step execution must log header output before invoking the script.

---

## Rule 2: Confirm Destructive Operations

**Never run destructive scripts without explicit user confirmation.**

Destructive scripts include (but are not limited to):
- `reset.sh` or any script containing `rm -rf`
- Any `recovery_procedure` step
- Scripts that overwrite existing files (check for `cp -f`, `mv`, truncation)

Show the destructive action, the affected path(s), and wait for `[y/N]` confirmation.

**Why:** Recovery scripts like `reset.sh` delete entire directories. Silent execution would destroy user data.

**How to apply:** Before executing any recovery procedure or script that matches destructive patterns, prompt explicitly. Default answer is N.

---

## Rule 3: Validate Schema Before Execution

**Never run a manifest that fails schema validation.**

Always invoke `setup-validate` internally before `setup-run` executes the first step. If validation returns errors, stop and report them. Do not execute partial manifests.

**Why:** A malformed manifest can produce inconsistent state — some steps executed, some skipped — that is harder to recover from than a clean failure.

**How to apply:** `setup-run` must call the validation logic at Phase 1, before platform detection or param collection.

---

## Rule 4: Agentic Steps Are Exception Handling Only

**Do not generate `type: agentic` steps for operations that can be scripted.**

When generating a manifest (`setup-generate`), only emit `type: agentic` steps when:
- The operation cannot be expressed in bash/PowerShell without runtime AI reasoning
- A prior script step has already failed and the agentic step is the recovery path

When executing a manifest (`setup-run`), if an `agentic` step is encountered:
1. Explain to the user why this step requires AI intervention
2. Show the `instruction` field
3. Describe the actions you intend to take before taking them

**Why:** Agentic steps are non-reproducible and cannot be audited like scripts. Over-use erodes trust in the installer.

**How to apply:** In `setup-generate`, prefer `script` for every step. Flag any `type: agentic` in `setup-validate` output with a warning.

---

## Rule 5: Params Collected Before Execution

**All required params must be collected before any step runs.**

Before executing step 1, collect all `required: true` params that have no value. Do not proceed with missing required params even if early steps do not use them — later steps may depend on them and partial execution creates hard-to-clean state.

**Why:** Running 3 of 5 steps before discovering a missing param leaves the system in a partially-installed state.

**How to apply:** During Phase 3 (Param Collection in setup-run), collect ALL required params upfront, not lazily per step.

---

## Rule 6: No Inline Secrets

**Never put secrets, tokens, or passwords in a setup.manifest.yaml or in script templates.**

If a script requires a secret:
1. Read it from a file (`~/.config/<project>/token`)
2. Read it from an environment variable
3. Prompt the user interactively (never echo to terminal)

The manifest param system supports `type: string` params — these are for configuration values, not secrets.

**Why:** Manifests are committed to source control. Secrets in manifests leak to every person with repo access.

**How to apply:** When generating manifests, if a secret is needed, emit an `ask` step that reads from a file or prompts without echoing. Never use `default:` for secret values.

---

## Rule 7: Platform Mismatches Are Skip, Not Error

**When a step's platform filter does not match the current system, skip it silently.**

Steps filtered for `platform: [macos]` should produce no output on Ubuntu. The step did not fail — it was not applicable.

Recovery procedures triggered on skipped steps are also skipped.

**Why:** Cross-platform manifests routinely include platform-specific steps. Reporting them as errors on non-target platforms creates false failures.

**How to apply:** In `setup-run` step dispatch, evaluate platform match before executing. Log `[skip: platform mismatch]` at debug verbosity only.
