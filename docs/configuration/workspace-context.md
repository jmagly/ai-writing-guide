# Workspace context

AIWG uses `WORKSPACE.md` as the canonical, provider-neutral project context.
Put concise project conventions and links in its marked **Project Context**
section. Keep detailed policies, runbooks, hooks, and quickrefs in linked files.
Do not place credential values in context files.

The load order is:

1. provider/system/organization instructions;
2. root `WORKSPACE.md`;
3. generated `AIWG.md` discovery and routing;
4. linked or provider-native subtree files within their declared scope.

`aiwg init`, `aiwg new`, `aiwg use`, `aiwg refresh`, and `aiwg regenerate`
maintain the graph through one implementation. `aiwg doctor` reports missing
links, loops, duplicate or conflicting directives, possible credentials,
registration errors, and managed-bootstrap drift.

## Existing projects

Legacy `CLAUDE.md`, `AGENTS.md`, `AGENTS.override.md`, `WARP.md`, `.hermes.md`, and Copilot layouts
remain supported. Migration is explicit:

```sh
aiwg workspace-context audit
aiwg workspace-context migrate --dry-run
aiwg workspace-context migrate --apply
aiwg workspace-context rollback [transaction-id]
```

The linked regenerate branch combines that adoption with deterministic project
extraction and generated context in one transaction:

```sh
aiwg regenerate --existing-project --dry-run
aiwg regenerate --existing-project --apply
aiwg workspace-context doctor
```

It extracts only stable local evidence (package metadata, README purpose,
toolchain files, standard commands, test/architecture paths, and CI workflow
names) into a replaceable managed block inside the protected operator region.
Manual content around that block is preserved.

Audit reports exact duplicates separately from ambiguous positive/negative
conflicts and identifies root versus nested scope. Apply refuses possible
credential values and unresolved conflicts by default. Provider-only material
moves to `.aiwg/context/providers/` with source path and checksum attribution.
Transactions and recoverable preimages live under
`.aiwg/context-migrations/`. Reapplying a completed migration is a no-op.

## Provider loading contract

| Surface | Mechanism | Result |
|---|---|---|
| Claude Code | native `@WORKSPACE.md`, then `@AIWG.md` | supported |
| Codex | `AGENTS.md` explicit read directive; native root-to-CWD hierarchy remains | supported |
| GitHub Copilot CLI | native `@` imports in repository instructions | supported |
| Cursor | explicit directive in `AGENTS.md`; provider rules retain native scope | supported |
| Factory | explicit directive in hierarchical `AGENTS.md` | supported |
| OpenCode | `opencode.json` `instructions` registration | supported |
| Warp | explicit directive in `WARP.md`/`AGENTS.md`; nested rules retained | supported |
| Windsurf / Devin surfaces | explicit `AGENTS.md` direction; native `.windsurf`/`.devin` rules retained | degraded pending a verified include primitive |
| Hermes | `.hermes.md`/`AGENTS.md` direction plus on-demand AIWG MCP reading | degraded |
| OpenHuman | host-dependent `AGENTS.md` direction | degraded |
| OpenClaw | no verified project-local startup loader | degraded, no automatic claim |

The authoritative dated details and source URLs live in the provider definition
registry. A plain Markdown link is never presented as automatic loading.
