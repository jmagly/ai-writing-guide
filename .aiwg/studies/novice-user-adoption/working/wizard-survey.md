---
artifact_type: pattern_survey
study: novice-user-adoption
workstream: C
related_uc: UC-NUA-003
related_issue: "#1337"
status: draft
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Onboarding-Wizard Pattern Survey

## Purpose

Pre-design survey of existing onboarding wizards in agentic / dev tools, used as input to the `aiwg wizard` design doc. Identifies common patterns, anti-patterns, and AIWG-specific gaps that prior art doesn't address.

## Scope

Four tools, chosen for their relevance to AIWG's audience and their willingness to ship an explicit wizard (rather than "just configure files"):

1. **Cursor** — editor with first-run setup
2. **Continue** — IDE extension with `init` wizard
3. **Claude Desktop / Claude Code** — first-run experience
4. **OpenAI Codex CLI** — `codex` setup flow

Each tool surveyed by reading its public docs / GitHub README / first-run output. Survey is **observational, not authoritative** — Cursor and Continue UX evolves quickly; treat findings as 2026-Q2 snapshots.

## Tool 1 — Cursor (editor, first-run setup)

### Flow

1. Launch Cursor → sign-in screen (account creation or existing).
2. Provider selection: which AI provider should power Tab and Cmd-K? (Default: Cursor's hosted; alternatives: Anthropic, OpenAI, Azure with API key).
3. Editor preferences: keybindings (VS Code / JetBrains / Vim).
4. Project pick: open existing folder OR clone a starter repo.
5. First-tab demo: a sample completion in a scratch file to demonstrate Tab acceptance.

### Patterns Worth Adopting

- **Provider selection up front.** AIWG should ask which provider the user primarily targets (Claude Code, Codex, etc.) and tune downstream questions accordingly.
- **Sample demo.** Cursor's "try a completion now" is excellent — it confirms the tool is working before the user wanders off. AIWG's analog: a test prompt the user can paste into their agent to verify AIWG is engaged.

### Patterns to Avoid

- **Account-required gating.** Cursor refuses to proceed until sign-in. AIWG has no account; the wizard must never hint at one.

## Tool 2 — Continue (IDE extension, `init` wizard)

### Flow

1. Install extension → notification "Run Continue setup."
2. Pick model provider (LLM API or local).
3. Paste API key OR pick local model.
4. Continue writes `~/.continue/config.json` and reloads.
5. Documentation link opens in a side panel.

### Patterns Worth Adopting

- **Config-file artifact at the end.** The user can see what the wizard wrote and adjust later. AIWG's analog: the wizard writes to `.aiwg/aiwg.config` (already standard) and surfaces the file path at exit.
- **Docs-side-panel handoff.** After setup, point at a real document the user can read for the next ten minutes. AIWG should point at `docs/cli-reference.md` and the relevant framework quickref.

### Patterns to Avoid

- **Single-shot exit.** Continue's wizard runs once and is hard to re-invoke. AIWG should make `aiwg wizard` idempotent — re-running it should re-validate config, not blow it away.

## Tool 3 — Claude Desktop / Claude Code (first-run)

### Flow (Claude Code, the closer analog)

1. Run `claude` in a terminal.
2. If first time: prompt for account login (browser flow).
3. After login, drop into an interactive session in `cwd`.
4. No explicit setup wizard — discovery is via `/help`.

### Patterns Worth Adopting

- **`/help` as discovery surface.** No upfront wizard means the friction is moved to discovery time. AIWG already has `aiwg help` and the discovery skills; the wizard should complement, not replace.

### Patterns to Avoid

- **No setup wizard at all.** Claude Code's "drop into a session and figure it out" is fine for power users; novices stall. This is exactly the gap AIWG's wizard fills.

## Tool 4 — OpenAI Codex CLI (`codex` setup)

### Flow

1. `npm i -g @openai/codex` (or platform equivalent).
2. First run prompts for API key.
3. Key stored in `~/.codex/auth.json`.
4. CLI drops into REPL.
5. No project-scope vs user-scope distinction surfaced.

### Patterns Worth Adopting

- **Minimal first-run.** Codex asks one question (API key) and gets out of the way. AIWG's wizard should similarly minimize required choices — three to four questions max for the happy path.

### Patterns to Avoid

- **No project-context awareness.** Codex doesn't know whether the user is in a project or `$HOME`. AIWG should specifically address this (it's literally the Workstream B warning's territory).

## Cross-Tool Patterns

### Common patterns across all four

| Pattern | Adoption recommendation for AIWG |
|---|---|
| Provider selection up front | ✅ Adopt — AIWG has 10 providers, this is essential |
| Config file written, path surfaced | ✅ Adopt — write to `.aiwg/aiwg.config`, name the path |
| Working-demo handoff | ✅ Adopt — give the user a test prompt to paste in their agent |
| Docs link at exit | ✅ Adopt — point at cli-reference + framework quickref |
| Account-required gating | ❌ Reject — AIWG has no account |
| Single-shot non-idempotent flow | ❌ Reject — `aiwg wizard` must be re-runnable |

### Patterns NONE of the four addressed (AIWG-specific gaps)

1. **Multi-provider deployment.** Three of the four assume one provider. AIWG users routinely deploy to two or three. The wizard needs to handle "use Claude Code primarily, also have Copilot for code review" cleanly.
2. **Project-vs-global scope decision.** None of the four surface this; AIWG must (Workstream D + B integration).
3. **Framework taxonomy as a first-class concept.** Cursor doesn't have "frameworks"; AIWG has 10. Novices need a guided pick from a finite list with one-sentence descriptions.
4. **Discovery verification.** None of the four verify that the agent actually loaded the configured tooling. AIWG's wizard needs the "ask your agent X, confirm it does Y" step.
5. **CW-driven iteration.** None of the four publish a Cognitive Walkthrough; AIWG's study explicitly requires one (NFR-USE-02).

## Implications for the AIWG Wizard Design

1. **Four-question happy path** — provider, framework, project root, deploy. Anything more loses novices.
2. **Multi-provider as an explicit branch** — don't force a single choice, but don't make the secondary-provider question mandatory either.
3. **Project root detection is the third question, not a precondition** — building on Workstream B's project-isolation detection.
4. **Verification step is non-optional** — adopt Cursor's "try this now" model; the wizard does not declare success until the agent demonstrates AIWG behavior.
5. **Idempotency** — re-running `aiwg wizard` should detect existing `.aiwg/aiwg.config` and offer "adjust" or "redeploy", not overwrite.
6. **Opt-in only** — `aiwg use` does not call the wizard; the wizard exists for users who want guidance, not as a default detour.

## References

- UC-NUA-003: `../requirements/UC-NUA-003-onboards-via-wizard.md`
- ADR-NUA-003: `../architecture/adr-wizard-invocation.md`
- SAD §4.1.1
- Sources (informal, 2026-Q2 snapshots): Cursor public docs, Continue GitHub README, Anthropic Claude Code docs, OpenAI Codex CLI README
