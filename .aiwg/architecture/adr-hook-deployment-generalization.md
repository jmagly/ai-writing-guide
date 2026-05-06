# ADR: Hook Deployment Generalization (Cross-Provider)

## Status

**ACCEPTED** — operator signoff 2026-05-06; required by parity epic [#1089](../../../../issues/1089); unblocks [#1109](../../../../issues/1109) (PUW-008 OpenClaw behaviors), [#1110](../../../../issues/1110) (PUW-009 OpenClaw hooks), [#1111](../../../../issues/1111) (PUW-010 Claude-code hooks), and PUW-018 (cross-provider hook bridge).

> **Glossary**: PUW = Parity Update Work item, the unit of work in the parity epic [#1089](../../../../issues/1089).

> **Companion ADRs**: pairs with [`adr-behaviors-deployable-artifact.md`](./adr-behaviors-deployable-artifact.md) and [`adr-behaviors-format.md`](./adr-behaviors-format.md). This ADR supersedes the deployment-target portions of those (the source-format and authoring portions stand).

## Date

2026-05-06

## Context

### Trigger

AIWG ships hook patterns (PreToolUse artifact guards, Bash security guards, citation guards, quality gates) intended to enforce safety-critical rules at runtime — not via instructional prompting but via the host platform's actual hook system. The current state across the 10 supported providers is fragmented:

- **Claude Code**: has a complete hook system (`.claude/settings.json` `hooks:` key, JSON schema for events, env-var contract, exit-code semantics). AIWG's `aiwg-hooks` addon ships hook patterns but is `autoInstall: false` — the hooks never get wired.
- **OpenClaw**: deploys behaviors to `~/.openclaw/behaviors/`, but OpenClaw source has no loader for that path. The actual injection path is `~/.openclaw/hooks/<name>/HOOK.md` + a JS handler. AIWG has no behavior→hook translator.
- **Codex / Copilot / Factory / Hermes**: each has a hook surface (TOML hook config, GitHub-Actions-like JSON, `$FACTORY_PROJECT_DIR` shell hooks, Python plugin or shell config), but env-var contracts and stdin schemas differ.
- **Cursor / Warp / Windsurf / OpenCode**: no native hook system; AIWG can't enforce hooks here.

PUW-008/009/010/018 each touch this surface; without an abstraction they would each invent provider-specific glue. This ADR defines that abstraction.

### Why this is non-obvious

Hook systems look superficially similar across providers (event → command → exit code → action) but diverge on details that matter for portability:

- **Env-var contract**: Claude exposes `$CLAUDE_PROJECT_DIR`; Factory uses `$FACTORY_PROJECT_DIR`. A hook script that hard-codes one breaks on the other.
- **Stdin schema**: Claude passes a JSON object on stdin; Codex passes individual env vars; Copilot passes a JSON-formatted block. Hook scripts that read stdin as if it were JSON crash on Codex.
- **Exit-code semantics**: Claude treats exit 0 as "allow" and any non-zero as "block"; Codex treats exit 1 specifically as "block" and other non-zero codes as "warn-and-continue". A hook designed for Claude blocks too aggressively on Codex.
- **Backup/rollback for invasive merges**: Claude Code's `settings.json` is operator-managed. Auto-merging AIWG hooks into it must preserve operator hooks and provide a rollback path.
- **Behavior emulation vs native hooks**: OpenClaw has both behaviors (emulated, not loaded by core) and hooks (native, loaded). The translator must preserve behavior semantics while emitting native hook artifacts.

### Codebase references

- `agentic/code/addons/aiwg-hooks/manifest.json` — the addon with `autoInstall: false` today
- `agentic/code/addons/aiwg-hooks/hooks/*.md` — hook pattern source
- `tools/agents/providers/copilot.mjs`, `factory.mjs`, `codex.mjs` — per-provider deployers (no hook deployment today)
- `tools/agents/providers/openclaw.mjs` — currently deploys behaviors to dead `~/.openclaw/behaviors/` path
- `.aiwg/research/parity/openclaw/assessment.md §3` — OpenClaw hook discovery + behavior gap
- `.aiwg/research/parity/claude-code/assessment.md §6 gap A` — Claude Code hook auto-install gap
- `.aiwg/architecture/adr-behaviors-deployable-artifact.md` — prior ADR; this one supersedes its deployment-target guidance

### Scope boundary

This ADR defines:
- The cross-provider hook abstraction interface (event names, env-var contract, stdin schema)
- The per-provider translator contract (how AIWG hook source becomes native hook artifacts)
- Backup/rollback policy for invasive merges (Claude `settings.json`, OpenClaw `~/.openclaw/`)
- The dry-run validation gate (what each provider's hook loader does on a sample hook before real deploy)
- The `autoInstall` policy for hook addons (Claude flips to `true`; OpenClaw + Codex stage behind opt-in)

It does NOT:
- Define new hook event types — uses the existing AIWG hook event taxonomy
- Replace the source-format ADRs (`adr-behaviors-deployable-artifact.md` source format stands)
- Implement specific hook content — that's per-PUW work

## Decision

### 1. Cross-provider hook abstraction

***Hooks are authored once in AIWG source format; per-provider translators emit native artifacts.*** The abstraction has three layers:

```
AIWG Hook Source (one .md file per hook, frontmatter declares events)
        │
        ▼
Per-Provider Translator (claude.mjs, openclaw.mjs, codex.mjs, ...)
        │
        ▼
Native Hook Artifact (.claude/settings.json fragment, ~/.openclaw/hooks/<name>/HOOK.md, etc.)
```

Source frontmatter declares:
- `events:` — list of hook events (PreToolUse, PostToolUse, UserPromptSubmit, etc.)
- `command:` — shell command or script reference
- `args:` — argument template (with placeholder substitution)
- `safety_critical:` — boolean (per `adr-override-shadow-policy.md`)
- `degrade_on:` — list of providers where the hook should not deploy (rather than degrading silently)

### 2. Env-var contract (translator-mediated)

Translators substitute provider-native env vars at emit time. Source uses canonical AIWG names:

| AIWG canonical | Claude Code | Factory | Codex | Copilot |
|---|---|---|---|---|
| `$AIWG_PROJECT_DIR` | `$CLAUDE_PROJECT_DIR` | `$FACTORY_PROJECT_DIR` | `$CODEX_WORKSPACE` | `$GITHUB_WORKSPACE` |
| `$AIWG_TOOL_NAME` | `$CLAUDE_TOOL_NAME` | (read from stdin JSON) | (read from env `CODEX_TOOL`) | (parse stdin JSON) |
| `$AIWG_HOOK_EVENT` | (implicit per matcher) | (CLI arg) | (TOML section) | (workflow trigger) |

Hook authors write `$AIWG_PROJECT_DIR` once; translators substitute per provider. Authors who need a provider-specific env var (rare) can use `$NATIVE_<provider>_<var>` which translators emit verbatim.

### 3. Stdin schema (translator-mediated)

Native hook stdin schemas differ. Translators wrap the hook command with a small shim that normalizes stdin to a stable AIWG JSON schema:

```json
{
  "event": "PreToolUse",
  "tool": "Bash",
  "args": ["-c", "rm -rf /"],
  "project_dir": "/path/to/project",
  "session_id": "abc123"
}
```

The shim reads the provider-native stdin, transforms to this schema, and pipes to the actual hook command. Authors write hooks that read this canonical JSON.

### 4. Exit-code semantics

Translators normalize exit codes to a 3-tier outcome:

| AIWG canonical exit | Meaning | Claude Code mapping | Codex mapping | Copilot mapping |
|---|---|---|---|---|
| `0` | allow | `0` | `0` | `0` |
| `1` | block | `1` | `1` (explicit block) | `1` |
| `2` | warn-and-continue | `0` + stderr message | `2` | `0` + stderr message |

Hook authors return canonical codes; translators map per provider. A hook that returns `2` ("warn") on Claude Code surfaces as a stderr message and exit 0 (allow); on Codex it surfaces as the native warn semantic.

### 5. Backup-and-rollback policy

For invasive merges into operator-managed configuration files (Claude Code `settings.json`, OpenClaw `~/.openclaw/config.toml`):

- Before any merge, the deployer copies the original to `<file>.bak.<RFC3339-timestamp>`
- The merge preserves all operator-authored entries; only AIWG-tagged entries are added/updated. Tagging is a `_aiwg_managed: true` field per hook entry.
- `aiwg refresh --restore-hooks` reads the most recent `.bak.<timestamp>` and restores it after confirming with the operator (via `AskUserQuestion` per the `native-ux-tools` rule).
- `aiwg remove --addon aiwg-hooks` reverts AIWG-tagged entries from the live config and leaves the rest untouched.

### 6. Dry-run validation gate (load-bearing)

***Translators MUST run a dry-run validation against the provider's native hook loader before live deploy.*** The gate prevents shipping hooks that the loader silently rejects:

- **Claude Code**: validate JSON shape against `.claude/settings.json` schema; reject on schema mismatch
- **OpenClaw**: pipe sample HOOK.md through OpenClaw's hook parser in dry-run mode; require non-zero exit only on parser-fatal errors
- **Codex**: TOML schema validation against `~/.codex/config.toml` shape
- **Copilot**: JSON schema validation against the workflow file format

If dry-run fails, deploy halts with a diagnostic; operator can re-run with `--force` to skip the gate (with prominent warning).

### 7. autoInstall policy per provider

Different providers have different invasive-merge profiles, so `autoInstall` defaults differ:

| Provider | autoInstall default | Reasoning |
|---|---|---|
| Claude Code | `true` (PUW-010) | Operator-managed `settings.json`; backup-and-rollback (§5) makes auto-merge safe |
| OpenClaw | `false` | Home-dir deploy with new HOOK.md format; dry-run gate must clear before flipping default |
| Codex | `false` | TOML hook system is rarely used; operators rarely expect AIWG to write `~/.codex/config.toml` |
| Copilot | `false` | Workflow files are user-territory; auto-injection feels invasive |
| Factory | `false` | `$FACTORY_PROJECT_DIR` hooks need per-droid wiring; defer until Factory droid spec stabilizes |
| Hermes | `false` | Python plugin or shell config; hooks ship as documentation until Hermes hook surface stabilizes |

Operators flip individual provider defaults via `aiwg use <addon> --provider <p>` (explicit consent).

## Consequences

### Positive

- AIWG hook authors write once, translators emit native artifacts.
- Operator-managed config files (settings.json, config.toml) keep operator entries intact across AIWG upgrades.
- Dry-run gate catches loader-incompatibility before live deploy.
- Per-provider `autoInstall` policy lets the rollout be safe-by-default while still flipping `true` for the well-understood Claude Code surface.

### Negative

- New translator code per provider — substantial implementation work (especially OpenClaw's behavior→hook translator with `handler.ts` emit).
- Stdin/env shim adds runtime overhead per hook invocation. Mitigation: shim is a small bash script, runtime cost is sub-millisecond.
- `_aiwg_managed: true` tagging requires operators to learn the convention to avoid accidentally tagging their own entries.

### Neutral

- Source format unchanged — `adr-behaviors-deployable-artifact.md` and `adr-behaviors-format.md` remain authoritative for hook authoring.
- Cursor / Warp / Windsurf / OpenCode unaffected (no native hook system to integrate with).

### Risks

- **R1 — Loader divergence from documentation.** Cursor and Hermes hook surfaces are partially documented; the dry-run gate is documentation-based. Real loader behavior could differ. **Mitigation**: per-provider golden-file tests in CI (sample hook → translator → assert native artifact format).
- **R2 — Backup-restore race.** If `aiwg refresh` is interrupted between writing the live config and the backup, recovery is manual. **Mitigation**: write `.bak` first, then atomic-rename live config; on partial failure operator can manually `mv <file>.bak.<ts> <file>`.
- **R3 — `_aiwg_managed: true` flag could be spoofed.** Operator manually edits a hook entry to add the flag, then AIWG removes it on `remove --addon aiwg-hooks`. **Mitigation**: pair the flag with a content hash so AIWG removal verifies the entry matches what AIWG originally wrote; mismatch warns instead of removing.

## Alternatives Considered

### A1 — Per-provider hook source

**Rejected.** Authors write once, deploy everywhere. Per-provider source quintuples maintenance.

### A2 — No translation (provider-native source only)

**Rejected.** Forces AIWG to ship N copies of every hook (one per provider), each in its native format. Ungainly and breaks when adding new providers.

### A3 — Skip the dry-run gate

**Rejected.** Loader divergence is the primary failure mode; the gate is the only thing that catches it before users hit the broken hook.

## Validation

- [ ] Architecture review (architecture-designer agent — conducted as part of parity-plan signoff per `parity-update-plan.md:166`)
- [x] Operator signoff
- [ ] Per-provider golden-file tests in CI (Claude, OpenClaw, Codex, Copilot translators)
- [ ] Backup-restore integration test (settings.json round-trip)
- [ ] Live-loader dry-run integration test (Claude Code at minimum; others as their gates land)

## Implementation tracking

Once accepted, this ADR is consumed by:
- PUW-008 (#1109) — OpenClaw behavior→HOOK.md translator
- PUW-009 (#1110) — OpenClaw hook bundle deploy (29-event surface)
- PUW-010 (#1111) — Claude Code `aiwg-hooks` `autoInstall: true` flip + settings.json merge
- PUW-018 — Cross-provider hook bridge (Codex TOML, Copilot JSON, Factory shell, Hermes Python)

## References

- `.aiwg/architecture/adr-behaviors-deployable-artifact.md` — superseded for deployment-target guidance
- `.aiwg/architecture/adr-behaviors-format.md` — superseded for deployment-target guidance
- `.aiwg/architecture/adr-override-shadow-policy.md` — `safety_critical: true` flag interaction
- `.aiwg/research/parity/openclaw/assessment.md §3` — OpenClaw hook discovery
- `.aiwg/research/parity/claude-code/assessment.md §6 gap A` — Claude Code auto-install gap
- `.aiwg/planning/parity-update-plan.md:166` — explicit ADR-3 prerequisite
