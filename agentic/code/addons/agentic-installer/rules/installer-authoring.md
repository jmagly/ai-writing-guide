---
enforcement: high
name: installer-authoring
description: Authoring rules for setup.aiwg.io/v1 SetupManifest files and script templates. Enforces script-first design, template reuse, and consistent manifest structure.
type: feedback
priority: HIGH
---

# Installer Authoring Rules

**Enforcement Level**: HIGH
Rules for writing `setup.aiwg.io/v1` SetupManifest files and their accompanying scripts.

## Rule 1: Script-First Design

**Every deterministic installation step that can be expressed in shell must be a `script` step.**

This rule applies when `metadata.execution_mode` is omitted or set to
`deterministic`. A `provider-orchestrated` manifest is a separate, explicit
contract for adaptive inspection and repair. Use that mode only when the
workflow genuinely depends on provider reasoning, approvals, and preservation
of heterogeneous existing state; never use it to disguise routine commands.

The decision tree:

1. Can I write a bash/PowerShell script that reliably performs this operation? → `type: script`
2. Do I need to branch based on detected platform state at runtime? → `type: platform-route`
3. Does the user need to provide input that cannot have a default? → `type: ask`
4. Is this a post-operation check? → `type: verify`
5. Has a script step failed and I need adaptive recovery? → `type: agentic` (exception only)

**Why:** Scripts are auditable, reproducible, and runnable without an AI agent. Manifests with primarily agentic steps cannot be executed in CI or by users who don't have AI tooling.

**How to apply:** When reviewing a generated manifest, every `type: agentic` step should raise the question: "Can this be scripted?"

---

## Rule 2: Always Source Lib Scripts

**All bash script templates must source the lib scripts at top.**

Required pattern:
```bash
#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/../lib/detect.sh"
source "$(dirname "$0")/../lib/params.sh"
source "$(dirname "$0")/../lib/verify.sh"
```

PowerShell templates must dot-source `detect.ps1`:
```powershell
. "$PSScriptRoot\..\lib\detect.ps1"
```

**Why:** Lib scripts provide safe, tested implementations of OS detection, param validation, and verification. Reinventing these in individual templates introduces inconsistency and bugs.

**How to apply:** When generating new script templates, always include the lib source lines. Flag any template missing them.

---

## Rule 3: Manifests Describe, Scripts Act

**The manifest is a declarative description. Scripts are the imperative implementation.**

The manifest should read like documentation:
- `steps[].id` — human-readable verb phrase (`clone`, `install-deps`, `configure-database`)
- `steps[].verify` — expresses the expected post-condition, not how to achieve it
- `params[].description` — explains what the param controls

Scripts contain the implementation details. The manifest should be understandable to someone who has never seen the scripts.

**Why:** Manifests are shared across teams and shown to users during `--dry-run`. They must be readable without reading the scripts.

**How to apply:** Keep manifest YAML concise. Push complexity into scripts.

---

## Rule 4: One Manifest Per Logical Installation Unit

**Each distinct software component or sub-project gets its own manifest.**

Do not combine unrelated software into one manifest. For hub repos with multiple sub-projects, use `type: chain` steps to invoke sub-manifests, coordinated by a hub manifest.

Correct:
```yaml
steps:
  - id: install-backend
    type: chain
    manifest: backend/setup.manifest.yaml
  - id: install-frontend
    type: chain
    manifest: frontend/setup.manifest.yaml
```

Incorrect: a single manifest with 20 steps spanning backend, frontend, database, and monitoring.

**Why:** Single-responsibility manifests are easier to test, reuse, and maintain independently.

**How to apply:** When a manifest exceeds ~10 steps, evaluate whether it should be decomposed into chained sub-manifests.

---

## Rule 5: Every Manifest Needs a Recovery Procedure

**All manifests must include at least one `recovery_procedure` entry.**

The minimum recovery procedure:
```yaml
recovery_procedures:
  - id: full-reset
    description: Remove and re-clone the installation
    triggers: [clone]
    script: installer/scripts/reset.sh
```

More specific recovery procedures may be added for partial failures. The `full-reset` procedure using `reset.sh` is always the last resort fallback.

**Why:** Users will encounter failures. Without recovery procedures, a failed installation leaves the system in an unknown state with no documented recovery path.

**How to apply:** `setup-generate` must always include at least the `full-reset` procedure. `setup-validate` should warn if no recovery procedures are present.
