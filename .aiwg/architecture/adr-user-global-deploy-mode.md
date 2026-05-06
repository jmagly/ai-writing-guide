# ADR: User-Global Deploy Mode (`--scope user`)

## Status

**ACCEPTED** — operator signoff 2026-05-05; required by parity epic [#1089](../../../../issues/1089); unblocks the user-scope half of [#1102](../../../../issues/1102) (PUW-001) and PUW-027 (Claude Code, Copilot, Warp, Windsurf user-global).

> **Glossary**: PUW = Parity Update Work item, the unit of work in the parity epic [#1089](../../../../issues/1089).
>
> **`~/.agents/skills/`** is a provider-neutral path that multiple platform runtimes scan by convention (Codex, Copilot, Warp, OpenCode walk-up, Factory), independent of any single provider's install directory. Writing once to this path covers five providers' user-scope skill discovery.

> **Companion ADRs**: This ADR pairs with [`adr-agents-md-aggregation.md`](./adr-agents-md-aggregation.md) (cross-cut at §8) and [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md) (safety-critical handling at §3 and §5).

> **Always-deploy invariant**: User-scope deployments follow the same "always-deploy + adapt" principle defined in [ADR-1 §0.6](./adr-agents-md-aggregation.md). The user-scope path map in §2 below is *additive* — adding `~/.agents/skills/` alongside `~/.codex/skills/`, not replacing it. No user-scope writers are removed by this ADR or the PUWs that consume it.

## Date

2026-05-05

## Context

### Trigger

`aiwg use <framework>` deploys artifacts only to the current project (`.<provider>/...` paths). For workflows where an operator wants the same SDLC framework or set of skills available across every project on their machine — most commonly: a freelancer who hops between client repos, an SRE who sshs into many hosts, or a tinkerer iterating on a personal corpus — the only current options are running `aiwg use` in every project (high friction, drifts), or symlinking by hand (fragile, breaks `aiwg doctor`).

Several providers have well-defined user-global directories that their loaders scan first or as a fallback:

- **Claude Code**: `~/.claude/{agents,commands,skills,rules}/` — loaded before project paths
- **Codex**: `~/.codex/prompts/`, `~/.codex/skills/` (deprecated), and `~/.agents/skills/` (canonical user-scope target per `loader.rs:355`)
- **Copilot**: `~/.config/github-copilot/instructions/` (and the `~/.github/` family in newer betas)
- **Warp**: `~/.warp/` (per Warp's own settings docs)
- **Windsurf**: `~/.windsurf/` (per Windsurf's docs)

PUW-001 (#1102) needs user-scope semantics for the `~/.codex/skills/` → `~/.agents/skills/` migration. PUW-027 needs them for four other providers. Both are blocked on this ADR.

### Codebase references

- `src/cli/handlers/use.ts:161-232` — `PROVIDER_PATHS` map (project-scope only today)
- `src/smiths/platform-paths.ts:82,84` — Hermes and OpenClaw already use `os.homedir()` + provider dir for skills; user-scope precedent exists in code but is not exposed as a flag
- `src/smiths/skillsmith/platform-resolver.ts:35` — `~/.codex/skills` user-scope writer
- `src/cli/handlers/use.ts:181` — Codex behavior emulation co-located with rules dir (must be considered for user-scope)
- `.aiwg/research/parity/capability-matrix.md` — gaps #1, #28, #31, #40, #42

### Scope boundary

This ADR defines:
- The `--scope user` flag and its semantics on `aiwg use`, `aiwg remove`, and `aiwg refresh`
- The user-global path map per provider (the analog of the project `PROVIDER_PATHS` map)
- Conflict semantics when project and user scope both have the same artifact id
- `aiwg.config` storage location and shape for user-scope deployments
- Rollback and `aiwg doctor` integration

It does NOT:
- Define cross-provider hook bridge (PUW-018) — that is its own ADR (the hook deployment generalization called out in parity-update-plan.md:166)
- Change project-scope semantics — `--scope project` is the default and unchanged
- Define a `--scope shared` (multi-host, network-mounted) tier — explicit non-goal for this ADR

## Decision

### 1. The `--scope` flag

`aiwg use`, `aiwg remove`, `aiwg refresh`, and `aiwg list` accept `--scope <project|user>`. Default is `project`. Examples:

```bash
aiwg use sdlc                          # project scope (default; same as today)
aiwg use sdlc --scope user             # user-global deploy
aiwg use sdlc --scope user --provider codex   # codex user-global only
aiwg list --scope user                 # show user-scope deployments
aiwg remove sdlc --scope user          # remove user-scope deployment
```

`--scope user` is mutually exclusive with `--scope project`. Operators who want both run two commands. There is no `--scope all` (deliberate — the explicit two-command form is auditable).

### 2. User-global path map

Each provider gets a user-global path map alongside its project-scope map. Paths are absolute (rooted in `os.homedir()`). The `.agents/skills/` family is preferred for skills wherever a provider's loader scans it, since it is the cross-agent canonical user-scope target.

| Provider | Agents | Commands | Skills | Rules | Behaviors |
|---|---|---|---|---|---|
| Claude Code | `~/.claude/agents/` | `~/.claude/commands/` | `~/.claude/skills/` + `~/.agents/skills/` | `~/.claude/rules/` | `~/.claude/hooks/` |
| Codex | n/a (AGENTS.md only) | `~/.codex/prompts/` | `~/.agents/skills/` | n/a (AGENTS.md only) | n/a (TOML hooks; future ADR) |
| Copilot | `~/.config/github-copilot/agents/` | `~/.config/github-copilot/prompts/` | `~/.agents/skills/` | `~/.config/github-copilot/instructions/` | n/a |
| Cursor | `~/.cursor/agents/` | `~/.cursor/commands/` | `~/.cursor/skills/` | `~/.cursor/rules/` | `~/.cursor/rules/` (emulated) |
| OpenCode | `~/.opencode/agent/` | (derives from skills) | `~/.opencode/skill/` + `~/.agents/skills/` | n/a (AGENTS.md only) | n/a |
| Warp | `~/.warp/agents/` | `~/.warp/commands/` | `~/.warp/skills/` + `~/.agents/skills/` | `~/.warp/rules/` | (aggregated into `~/WARP.md`; Warp scans this as a user-scope session-bootstrap file) |
| Windsurf | `~/.windsurf/agents/` | `~/.windsurf/workflows/` | `~/.windsurf/skills/` | `~/.windsurf/rules/` | n/a |
| Hermes | n/a (AGENTS.md only) | n/a (MCP) | `~/.hermes/skills/` (already user-scope today) | n/a | n/a |
| OpenClaw | `~/.openclaw/agents/` (already user-scope today) | `~/.openclaw/commands/` | `~/.openclaw/skills/` | `~/.openclaw/rules/` | `~/.openclaw/behaviors/` |
| Factory | `~/.factory/droids/` | `~/.factory/commands/` | `~/.agents/skills/` | n/a (AGENTS.md only) | n/a |

`.agents/skills/` and `~/.agents/skills/` appear in multiple cells deliberately: those are providers whose Rust/Python loaders scan a cross-agent neutral path. Writing once to `~/.agents/skills/` covers Codex, Copilot user-scope, Warp user-scope, OpenCode walk-up, and Factory user-scope simultaneously.

### 3. Conflict semantics: project wins on read; AIWG protects write-time

For all seven providers verified in the parity matrix, **project-scope paths are scanned first** by the provider's own loader, so project artifacts shadow user artifacts at runtime. AIWG's responsibility on the read side is to write truthfully into both scopes when both are deployed and let the loader resolve.

**Write-time protection (load-bearing):** AIWG does protect against silent write-time shadowing because that is where data loss happens, not at read time. On `aiwg use --scope user`, if a project-scope artifact with the same id already exists with **hash-diverged content**, the user-scope deploy emits a warning and refuses to write the user copy without `--force`. This matches the project-scope hash-check posture in §5 and prevents the operator from creating a stale-user-scope/fresh-project-scope split they cannot detect.

**Safety-critical scope-shadow restriction (security):** A user-scope artifact MUST NOT shadow an upstream `safety-critical: true` artifact (per [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md) §2). This is a deploy-time hard error. Until a future `--allow-unsafe-shadow` flag lands (out of scope for this ADR; tracked under the override-shadow-policy ADR §5 follow-ups), user-scope shadow of any safety-critical upstream artifact is forbidden.

`aiwg doctor` reports both conflict types so operators see what is happening:

```
warn: artifact 'human-authorization' deployed to both project (.claude/rules/) and user (~/.claude/rules/). Provider will load project copy.
error: user-scope artifact 'human-authorization' attempts to shadow safety-critical upstream rule. Refused; --allow-unsafe-shadow flag does not exist yet.
```

### 4. State storage

User-scope deployment metadata lives in `~/.aiwg/aiwg.config` (alongside the project-scope `.aiwg/aiwg.config`). The two files share the schema; they differ only in scope they describe. `aiwg list` consults both when `--scope` is unspecified and merges output with a scope column.

`~/.aiwg/aiwg.config` is auto-created on the first `aiwg use --scope user` command. On removal of the last user-scope framework, the file is left in place (with `installed: {}`) so the operator's preferences (provider list, MCP profile choices) persist. Hard-delete on `aiwg uninstall --scope user --purge`.

**Atomic write requirement (security):** all writes to `~/.aiwg/aiwg.config` go through tmpfile + rename (never an in-place write). On EACCES or any other write failure, the rename is aborted and no partial state is persisted. The graceful degradation to `--scope project` from §Risks/R3 must check this — if config write fails partway, operator state is unchanged from before the command ran.

### 5. Removal semantics

`aiwg remove sdlc --scope user` mirrors project-scope removal:
- Walks the user-scope path map for that framework
- Reverts files AIWG wrote (hash check; refuses if file diverged from the manifest hash)
- **Cross-provider reference count (load-bearing for `~/.agents/skills/`):** before unlinking any file from `~/.agents/skills/`, the remover decrements a per-provider reference count maintained in `~/.aiwg/aiwg.config:user_scope_refs`. The file is unlinked only when the count reaches zero. This prevents `aiwg remove sdlc --scope user --provider codex` from silently breaking Copilot, Warp, OpenCode, or Factory user-scope deploys that share the same `~/.agents/skills/` target.
- Updates `~/.aiwg/aiwg.config`
- Activity log entry: `## [YYYY-MM-DD HH:MM] remove-user | sdlc | <count> files reverted`

`--force` overrides the hash check (matching project-scope behavior).

**Safety-critical removal protection (security):** `aiwg remove --scope user` MUST refuse (not just warn) removal of any artifact carrying `safety-critical: true` when at least one project in `~/.aiwg/aiwg.config:projects[]` is known to depend on the user-scope deploy. `--force` is required to override, and the removal emits a multi-line warning matching the format defined in [`adr-override-shadow-policy.md`](./adr-override-shadow-policy.md) §4 case 3. Silent removal of a safety-critical user-scope rule weakens every dependent project simultaneously; this is exactly the denial-of-context surface the safety-critical denylist exists to prevent.

### 6. Refresh and update behavior

`aiwg refresh --scope user` re-deploys all user-scope frameworks at the latest installed CLI version. `aiwg refresh` (no scope) refreshes the current project. `aiwg refresh --scope all` refreshes both (the only spot in the CLI where `all` is a valid scope value, because the operation is purely re-emit and idempotent).

### 7. `aiwg doctor` integration

`aiwg doctor` runs in project scope by default. `aiwg doctor --scope user` checks user-scope state. `aiwg doctor --scope all` checks both and reports per-scope counts plus the project/user shadow warnings from §3.

### 8. AGENTS.md interaction (cross-reference to ADR-1)

User-scope deployments do **not** generate `~/AGENTS.md`. AGENTS.md is a project-scope concept. However, a project AGENTS.md `## Skills` section can cite user-scope paths directly — for example, a Codex skill at `~/.agents/skills/foo/` is visible to the Codex loader (`loader.rs:355` confirms scan) and can be cited from a project AGENTS.md as `~/.agents/skills/foo/SKILL.md`.

**Per-provider verification (architecture review):** the user-scope-path-citation pattern is verified for the providers whose loaders we have ground-truth source for: Codex, Hermes, OpenClaw. For Cursor, Windsurf, Warp, and Factory, the provider's loader behavior with absolute home paths inside an AGENTS.md link is **not verified**; the link-index emitter MUST mark such entries with `<!-- user-scope; loader may not auto-resolve -->` so the model and operator both see the caveat. Verification of these four providers is a follow-up; until it lands, the entries are documentation-quality, not loader-resolution-quality.

**Default safety (R2 mitigation):** committing a project AGENTS.md that cites user-scope paths leaks across machines and CI. The link emitter omits user-scope citations by default. Operators opt in explicitly with the per-invocation flag `--allow-user-scope-references` on `aiwg use`. The flag is **not persisted** to `aiwg.config`; each invocation that wants user-scope links must pass it. When the repo has a CI configuration detected at `aiwg use` time and the operator passes `--allow-user-scope-references`, the emitter rejects the combination — those paths cannot resolve on CI runners and almost certainly indicate accidental leak.

This is the chosen cross-cut between this ADR and [`adr-agents-md-aggregation.md`](./adr-agents-md-aggregation.md): AGENTS.md is project-only; the link index can point to user-scope paths only with explicit operator opt-in and only on providers whose loaders we have verified.

## Consequences

### Positive

- Unblocks PUW-001 user-scope migration (`~/.codex/skills/` → `~/.agents/skills/`).
- Unblocks PUW-027 across Claude Code, Copilot, Warp, Windsurf.
- Hermes and OpenClaw already deploy user-scope; this ADR formalizes the pattern they pioneered rather than inventing a new one.
- `~/.agents/skills/` becomes a cross-provider canonical path with 5 providers writing to it once — operators get skill availability across all of them with a single deploy.
- Operators who switch projects keep their personal AIWG corpus available without re-deploying.

### Negative

- New CLI surface (`--scope` flag on 4+ commands) adds documentation and test load.
- `~/.aiwg/aiwg.config` is a new persistent state file; backup and migration tooling must be aware of it.
- Users with mixed scope deployments may be confused about which artifact a provider actually loaded — mitigated by `aiwg doctor` shadow warnings (§3) and explicit operator action via `--scope`.

### Neutral

- Hermes and OpenClaw paths in §2 are unchanged from today — those providers already deploy user-scope. The flag formalizes the path map but does not add new directories for them.

### Risks

- **R1 — Operator removes user-scope while project depends on it**: a project's AGENTS.md links to a `~/.agents/skills/` path that the operator just removed. **Mitigation**: `aiwg remove --scope user` runs a project-scope dependency check across all known projects in `~/.aiwg/aiwg.config:projects[]` and warns. Operator can override with `--force`.
- **R2 — Cross-machine assumption**: an operator commits a project AGENTS.md citing `~/.agents/skills/foo/` and pushes to a teammate without that user-scope deploy. **Mitigation**: AGENTS.md generator (per ADR-1) emits user-scope links only when the operator passes `--allow-user-scope-references` on `aiwg use`. Default behavior keeps AGENTS.md fully project-scoped, which is the safer default for shared repos.
- **R3 — Permission errors on shared user accounts**: `~/.aiwg/` may be read-only for `nobody`-style daemon users running `aiwg use`. **Mitigation**: detect EACCES on first user-scope write and emit a clear error with `--scope project` as the recommended alternative.

## Alternatives Considered

### A1 — Symlink-based user-global

**Rejected.** Operators today symlink `~/.claude/agents/` to a personal git-tracked dir. This works ad hoc but breaks `aiwg doctor` integrity checks (symlinks point to files outside AIWG's manifest hash domain) and provides no atomic removal semantics. Worse, symlinks are platform-dependent on Windows.

### A2 — `aiwg use --global`

**Rejected** as flag naming. `--global` is overloaded in the npm/cargo/pip ecosystem with subtly different meanings (npm `-g` installs binaries, pip `--user` installs packages to user-site). `--scope user` is unambiguous and mirrors `npm config --scope` semantics, which is the closest prior art.

### A3 — Single combined scope ("just deploy everywhere")

**Rejected.** Conflates project and user concerns; makes `aiwg remove` ambiguous; prevents operators from having different framework versions in different projects.

### A4 — User-scope as a separate `aiwg-user` command

**Rejected.** Adds a parallel CLI surface; operators have to learn two command sets. `--scope` flag re-uses the existing `aiwg use|remove|list|refresh|doctor` mental model.

## Validation

- [ ] Architecture review (architecture-designer agent)
- [ ] Security review (security-architect agent — focus on R1, R3, and the cross-machine path-leak in R2)
- [ ] Tech writing review (technical-writer agent — `--scope` flag documentation in `docs/cli-reference.md`)
- [ ] Operator signoff
- [ ] Smoke test: `aiwg use sdlc --scope user` on a clean user account; verify all 5 cross-agent providers see skills at `~/.agents/skills/`
- [ ] Smoke test: project + user scope coexistence; verify `aiwg doctor --scope all` reports shadows correctly
- [ ] Smoke test: `aiwg remove sdlc --scope user` reverts all 5 paths atomically; rollback works on EACCES mid-operation

## Implementation tracking

Once accepted, this ADR is consumed by:
- PUW-001 user-scope half (#1102) — `~/.codex/skills/` → `~/.agents/skills/` migration
- PUW-027 — Claude Code, Copilot, Warp, Windsurf user-global deploys
- (Future) PUW for Hermes user-scope formalization (currently de facto user-scope without a flag)

## References

- `.aiwg/architecture/adr-universal-provider-deployment.md` — prior ADR; this one extends its scope to include user-global paths
- `.aiwg/architecture/adr-agents-md-aggregation.md` — ADR-1; §8 cross-cut is defined here
- `.aiwg/research/parity/capability-matrix.md` — gaps #1, #28, #31, #40, #42
- `.aiwg/planning/parity-update-plan.md:166` — explicit ADR-4 prerequisite
- `loader.rs:355` (codex-rs) — Codex user-scope skills path = `~/.agents/skills/` (cited in PUW-001)
