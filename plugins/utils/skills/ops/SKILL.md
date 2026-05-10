---
namespace: aiwg
name: ops
platforms: [all]
description: Manage the AIWG ops ecosystem of sysops, devops, and itops workspaces and frameworks

---

# Ops

You manage the AIWG ops ecosystem — multi-repo operational frameworks for infrastructure, IT, and DevOps workflows. Ops workspaces map to repository archetypes: `sysops` (machine-specific, per-host), `devops` (cross-cutting infrastructure), and `itops` (IT operations and service management).

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "set up this repo as a sysops workspace" → init with sysops workspace type
- "what ops frameworks are running" → status subcommand
- "i need devops framework in here" → use with `dev-extension`
- "list ops frameworks" → list subcommand
- "push ops artifacts" → push subcommand
- "initialize for infrastructure work" → init with devops workspace type

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Initialize workspace | "init this as a sysops workspace" | Run `aiwg ops init --workspace sysops` |
| Check status | "show ops workspace status" | Run `aiwg ops status` |
| Deploy framework | "use ops-complete framework" | Run `aiwg ops use ops-complete` |
| List installed | "what ops frameworks are deployed?" | Run `aiwg ops list` |
| Push artifacts | "push ops to registry" | Run `aiwg ops push` |
| Default init | "initialize ops" | Run `aiwg ops init` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which subcommand: `init`, `status`, `use`, `list`, or `push`?
   - For `init`: which workspace type (`sysops`, `devops`, `itops`)? Default if unspecified.
   - For `use`: which framework name?

2. **Understand the workspace types**:

   | Workspace | Maps To | Scope | Examples |
   |-----------|---------|-------|---------|
   | `sysops` | `jmagly/sysops` | Per-host | Machine standup, hardware docs, per-machine troubleshooting |
   | `devops` | `jmagly/devops` | Cross-cutting | CI/CD pipelines, fleet-wide tooling, secrets management |
   | `itops` | IT operations repos | Service management | Helpdesk, asset tracking, change management |

3. **Understand the available ops frameworks**:

   | Framework | Purpose |
   |-----------|---------|
   | `ops-complete` | Full ops suite — all subcommands, templates, and agents |
   | `sys-extension` | Adds sysops-specific agents and runbook templates |
   | `dev-extension` | Adds devops-specific pipelines and infrastructure templates |
   | `it-extension` | Adds IT service management workflows |

4. **Run the appropriate command**:

   ```bash
   # Initialize a workspace (prompts for type if not specified)
   aiwg ops init
   aiwg ops init --workspace sysops
   aiwg ops init --workspace devops
   aiwg ops init --workspace itops

   # Show status of all registered ops workspaces
   aiwg ops status

   # Deploy an ops framework to the current workspace
   aiwg ops use ops-complete
   aiwg ops use sys-extension
   aiwg ops use dev-extension
   aiwg ops use it-extension

   # List frameworks deployed in the current workspace
   aiwg ops list

   # Push ops artifacts to remote registry
   aiwg ops push
   ```

5. **Report results** — For `init`, confirm workspace type and path. For `status`, show each registered workspace with its type and framework list. For `use`/`list`, show what is deployed. For `push`, confirm artifacts pushed and destination.

## Examples

### Example 1: Initialize a sysops workspace

**User**: "Set this repo up as a sysops workspace"

**Extraction**: Init with `sysops` workspace type

**Action**:
```bash
aiwg ops init --workspace sysops
```

**Response**: "Initialized `sysops` workspace in current directory. Ops registry updated. Use `aiwg ops use sys-extension` to deploy sysops-specific agents and runbook templates."

---

### Example 2: Initialize a devops workspace

**User**: "I'm setting up our infrastructure repo — initialize it for devops"

**Extraction**: Init with `devops` workspace type

**Action**:
```bash
aiwg ops init --workspace devops
```

**Response**: "Initialized `devops` workspace. This workspace is configured for cross-cutting infrastructure: CI/CD pipelines, fleet automation, secrets management. Deploy `dev-extension` to get devops-specific agents."

---

### Example 3: Check workspace status

**User**: "What ops workspaces do we have and what's deployed?"

**Extraction**: Status check

**Action**:
```bash
aiwg ops status
```

**Response**: Shows registered workspaces, e.g.:
```
sysops    /mnt/dev-inbox/jmagly/sysops    sys-extension
devops    /mnt/dev-inbox/jmagly/devops    dev-extension, ops-complete
```

---

### Example 4: Deploy the full ops suite

**User**: "Deploy the complete ops framework to this workspace"

**Extraction**: Use `ops-complete`

**Action**:
```bash
aiwg ops use ops-complete
```

**Response**: "Deployed `ops-complete` to current workspace. All ops agents, runbook templates, and subcommands are now available. Run `aiwg ops list` to see what was installed."

---

### Example 5: List deployed frameworks

**User**: "What ops frameworks are running in this workspace?"

**Extraction**: List deployed

**Action**:
```bash
aiwg ops list
```

**Response**: Lists installed ops frameworks with version and deploy date, e.g.:
```
ops-complete    v2026.3.15    deployed 2026-04-01
dev-extension   v2026.3.15    deployed 2026-04-01
```

---

### Example 6: Push artifacts

**User**: "Push our ops artifacts to the registry"

**Extraction**: Push request

**Action**:
```bash
aiwg ops push
```

**Response**: "Pushed ops artifacts to remote registry. 4 runbooks, 2 agent definitions, and 1 framework config synced."

## Clarification Prompts

If the user's intent is ambiguous:

- "Which workspace type should I initialize? Options: `sysops` (machine-specific), `devops` (cross-cutting), `itops` (service management)"
- "Which ops framework should I deploy? Available: `ops-complete`, `sys-extension`, `dev-extension`, `it-extension`"
- "Are you initializing a new workspace or checking the status of existing ones?"

## References

- @$AIWG_ROOT/src/cli/handlers/subcommands.ts — Ops command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/README.md — Framework deployment patterns
