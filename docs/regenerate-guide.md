# Refresh Project Context

Project context sometimes needs to be refreshed after installation, a provider
change, or an AIWG update. This is normally an agent-owned maintenance task.

Ask your agent:

```text
Refresh AIWG's context for this project. Inspect the current workspace and
provider files, choose the safest supported migration path, preview material
changes, preserve operator-authored instructions, and verify the result.
```

For an established project, add:

```text
Treat this as an existing project. Extract stable project context without
overwriting local conventions, show me the proposed context changes, and wait
for approval before applying them.
```

If the agent cannot complete the operation, start with the direct-user
diagnostics in [Install and Repair Commands](cli/install-and-repair.md).
Agents and advanced operators can consult the
[context-regeneration CLI contract](https://github.com/jmagly/aiwg/blob/main/docs/cli/regenerate.md) for exact flags,
transaction behavior, and rollback details.
