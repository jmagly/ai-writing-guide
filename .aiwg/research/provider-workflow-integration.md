# Provider `/workflow` Integration — Contract Verification (#1535)

**Status:** Phase-1 verification (in progress)
**Method:** introspection of installed released binaries + Claude Code tool surface (network/out-of-sandbox approved by operator)
**Date captured:** 2026-05-31

---

## TL;DR

- **Claude Code** ships a real dynamic multi-agent orchestration capability — the **Workflow tool** (script-based fan-out: `agent()`/`parallel()`/`pipeline()`, schemas, background runs, `/workflows` to monitor). This is functionally equivalent to AIWG's external/orchestration route. **CONFIRMED** (direct tool access in-session).
- **Codex** — the installed released binary **`codex-cli 0.135.0`** (native binary dated 2026-05-30) exposes **no `/workflow` slash command**. Its long-running-task / orchestration primitives are **`/goal`** ("set or view the goal for a long-running task" — already routed, #1451) and **`/plan`** ("switch to Plan mode"), plus `/agent`/`/subagents` (switch active agent thread) and `/review`. **No distinct `/workflow`.**

This contradicts the working premise that "Codex and Claude both ship `/workflow`." For Codex, the external-route analog is `/goal` (in-session, already routed) — there is no separate core `/workflow` to delegate to in 0.135.0.

## Evidence

### Codex (codex-cli 0.135.0 — installed release)

- Native binary: `~/.nvm/.../@openai/codex/node_modules/@openai/codex-linux-x64/vendor/x86_64-unknown-linux-musl/bin/codex` (223 MB, dated 2026-05-30).
- `strings` extraction of the embedded slash-command **description table** yields the full command surface. Relevant entries (verbatim):
  - `switch to Plan mode` → `/plan`
  - `set or view the goal for a long-running task` → `/goal`
  - `switch the active agent thread` → `/agent` / `/subagents`
  - `review my current changes and find issues` → `/review`
  - (plus `/init`, `/compact`, `/new`, `/resume`, `/fork`, `/mcp`, `/skills`, `/plugins`, `/hooks`, `/side`, etc.)
- **No `/workflow` entry** in the description table. All `workflow` substrings in the binary are skill-authoring guidance, the `WORKFLOW.md` project-doc fallback filename, memory templates, or image-gen prose — none are slash-command registrations.
- Corroborated by OSS source: `openai/codex@e93dc98` `codex-rs/tui/src/slash_command.rs` `SlashCommand` enum has `Goal`, `Plan`, `Agent`, `MultiAgents`, `Review` — no `Workflow` variant.

### Claude Code

- The **Workflow tool** is directly available in-session: script-based deterministic multi-agent orchestration (`agent`, `parallel`, `pipeline`, `phase`, structured-output schemas, background execution, resume), monitored via `/workflows`. This is Claude Code's dynamic-orchestration primitive and the closest analog to AIWG's external route.
- Contract shape (from the tool spec): a JS script with `export const meta`, hooks `agent()/parallel()/pipeline()/phase()/log()`, optional `schema` per agent, `budget`/`args` globals, concurrency cap, worktree isolation. In-session/background (notifies on completion); resumable via `resumeFromRunId`.

## Reconciliation with operator field report

**RESOLVED.** The operator confirmed `/workflow` runs in their Codex TUI and the `/` command exists (verified directly). The core binary has no such command. Both are true because **`/workflow` is plugin-provided**, not a core Codex feature:

- Core `codex-cli 0.135.0` binary: no `/workflow` (two independent `strings` scans — every "workflow" substring is system-prompt prose, skill-authoring guidance, image-gen text, or the `WORKFLOW.md` fallback; no command registration). OSS `slash_command.rs` `SlashCommand` enum: no `Workflow` variant.
- `~/.codex/prompts/`: no `workflow` prompt (only `aiwg-issue*`).
- `~/.codex/.tmp/plugins/plugins/`: a large installed plugin set. `temporal/.codex-plugin/plugin.json` and `superpowers/.codex-plugin/plugin.json` both list `"workflow"`; `vercel/skills/workflow/SKILL.md` ships a `workflow` skill. Codex renders plugin commands (and `~/.codex/prompts/` files) as `/` commands in the TUI.

**Conclusion: Codex's `/workflow` is environment-specific (plugin/skill-provided), NOT a universal core primitive.** AIWG cannot assume an arbitrary Codex user has it.

## Implications for the epic (#1534)

- **Codex design fork (operator decision):** (1) **stay AIWG-native** — Codex's universal long-running primitive is `/goal` (already routed, #1451), external route stays `ralph-external`; don't depend on a non-universal plugin. (2) **AIWG ships its own command** — deploy a `/workflow` (or `/flow` / `/mission`) prompt to `~/.codex/prompts/` that drives AIWG's external loop (mirrors how AIWG already ships `aiwg-issue*` prompts there). Recommendation: (1) by default + (2) as opt-in; never "delegate to Codex native /workflow" (it isn't native).
- **#1537 (routing ADR) / #1538 (impl):** Claude Code's Workflow tool is the only verified native orchestration primitive. Codex routing = `/goal` (done) + optional AIWG-provided command.
- **#1539 (flows → YAML) and #1536 (rename):** unaffected by this finding — they proceed regardless of provider `/workflow` existence.

## Open questions

- [ ] Operator: where did you invoke `/workflow` in Codex — core command, a plugin, or a skill? (Determines whether Codex routing is in scope at all.)
- [ ] If a newer Codex release adds a core `/workflow`, re-capture this table.
- [ ] Claude Code: is the Workflow tool the only orchestration surface, or is there also a user-facing `/workflow` slash command distinct from the tool + `/workflows` monitor?

## References

- #1535 (this), #1534 (epic), #1451/#1469 (`/goal` routing)
- Codex OSS: `openai/codex@e93dc98` `codex-rs/tui/src/slash_command.rs`
- Installed binary: `codex-cli 0.135.0`
