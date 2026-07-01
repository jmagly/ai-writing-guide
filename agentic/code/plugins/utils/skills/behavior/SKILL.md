---
namespace: aiwg
name: behavior
platforms: [all]
description: Manage AIWG behavior bundles that bind reactive directives and toolset configurations to specific agent types
---

# Behavior

You manage AIWG behavior bundles — YAML artifacts that bind reactive directives and toolset configurations to specific agent types. Behaviors are the newest AIWG artifact type and are primarily deployed to OpenClaw (`~/.openclaw/behaviors/`).

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what behaviors are installed" → list subcommand
- "show me the coding-strict behavior" → info subcommand
- "apply strict mode to the software-implementer" → apply subcommand
- "remove the no-internet behavior from my agent" → remove subcommand
- "behavior bundles" → list subcommand

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| List behaviors | "list behaviors" | Run `aiwg behavior list` |
| Show detail | "show behavior coding-strict" | Run `aiwg behavior info coding-strict` |
| Apply behavior | "apply coding-strict to software-implementer" | Run `aiwg behavior apply coding-strict --to software-implementer` |
| Remove behavior | "remove coding-strict from software-implementer" | Run `aiwg behavior remove coding-strict --from software-implementer` |
| Inspect source | "where are behaviors stored?" | Check `agentic/code/*/behaviors/` and `~/.openclaw/behaviors/` |

## Behavior

When triggered:

1. **Extract intent**:
   - Which subcommand: `list`, `info`, `apply`, or `remove`?
   - Is a behavior name mentioned?
   - Is an agent type mentioned (for `apply`/`remove`)?

2. **Run the appropriate command**:

   ```bash
   # List all available behaviors
   aiwg behavior list

   # Show details for a specific behavior
   aiwg behavior info <name>

   # Apply a behavior to an agent type
   aiwg behavior apply <name> --to <agent-type>

   # Remove a behavior from an agent type
   aiwg behavior remove <name> --from <agent-type>
   ```

3. **Understand behavior structure**: A behavior YAML bundle contains three sections:
   - `directives` — What the agent should always do or avoid in this operational context
   - `toolset` — Tool permissions and configuration overrides for this context
   - `inputs` — Variable parameters the behavior accepts at apply time

4. **Know the storage locations**:
   - **Source**: `agentic/code/*/behaviors/` (version-controlled, ships with framework)
   - **Deployed**: `~/.openclaw/behaviors/` (active, read by OpenClaw at runtime)
   - Deployment happens automatically during `aiwg use` for OpenClaw targets

5. **Report results** — For `list`, show name and description for each. For `info`, show the full bundle structure. For `apply`/`remove`, confirm the change.

## Examples

### Example 1: List available behaviors

**User**: "What behaviors are available?"

**Extraction**: List request, no filter

**Action**:
```bash
aiwg behavior list
```

**Response**: "3 behaviors available:
- `coding-strict` — Enforce code review, no direct pushes, require tests before merge
- `no-external-calls` — Block all outbound HTTP; toolset restricted to Read/Write/Edit/Bash(local)
- `audit-mode` — Read-only directives, all writes logged to `.aiwg/audit/`, no destructive operations"

---

### Example 2: Inspect a specific behavior

**User**: "Show me what coding-strict does"

**Extraction**: Info request for `coding-strict`

**Action**:
```bash
aiwg behavior info coding-strict
```

**Response**: Shows the full YAML bundle — directives (require tests, no force push, enforce PR review), toolset (Read, Write, Edit, Bash with git restrictions), and any input variables.

---

### Example 3: Apply a behavior

**User**: "Apply no-external-calls to the software-implementer agent"

**Extraction**: Apply `no-external-calls` to `software-implementer`

**Action**:
```bash
aiwg behavior apply no-external-calls --to software-implementer
```

**Response**: "Applied `no-external-calls` to `software-implementer`. Deployed to `~/.openclaw/behaviors/software-implementer/no-external-calls.yaml`. Outbound HTTP is now blocked for that agent type."

---

### Example 4: Remove a behavior

**User**: "Remove coding-strict from the test-engineer"

**Extraction**: Remove `coding-strict` from `test-engineer`

**Action**:
```bash
aiwg behavior remove coding-strict --from test-engineer
```

**Response**: "Removed `coding-strict` from `test-engineer`. The behavior file has been deleted from `~/.openclaw/behaviors/test-engineer/`."

## Clarification Prompts

If the user's intent is ambiguous:

- "Which behavior would you like to inspect? (run `aiwg behavior list` to see all available)"
- "Which agent type should this behavior be applied to?"
- "Did you mean to `apply` this behavior or just view it with `info`?"

## References

- @$AIWG_ROOT/src/cli/handlers/daemon.ts — Behavior command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/agent-deployment.md — Agent deployment rule
- @$AIWG_ROOT/docs/development/aiwg-development-guide.md — Source vs output boundary (behaviors are source artifacts in `agentic/code/*/behaviors/`)
