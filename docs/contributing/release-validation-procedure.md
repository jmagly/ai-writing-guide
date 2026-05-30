# Release Validation Procedure (Per Provider)

**Audience**: Maintainer driving release-readiness validation across all supported agentic stacks. Run this once per provider when validating a stable release (e.g. v2026.5.13).

**Assumption**: You hold a lowest-tier paid account on each provider. The in-session agent is expected to **report** outcomes accurately but is **not** expected to self-correct or debug. Your job is to capture verbatim what the session does, not to coach it into passing.

**Scope per session**: ~30 minutes. Each step has a Pass/Fail/Unsure verdict and an evidence slot. If a step Fails or is Unsure, **note it and continue** — don't block the rest of the run on one regression.

**Where to record**: The provider-specific child issue under the validation epic (e.g. `provider-validation(<name>): v2026.5.13 release validation`). Paste transcript excerpts directly in issue comments.

---

## 0. Pre-flight (Do once, on the host machine)

Run these checks **before** opening any provider session. They verify your local install is healthy and the version under test is what you expect.

```bash
# 0.1 — Confirm install is current
aiwg version
# Expected: 2026.5.13 (or whichever stable you're validating)

# 0.2 — Confirm install health
aiwg doctor
# Expected: all checks green; if any red, fix or note the failure before continuing.

# 0.3 — Pick a clean target project (fresh dir or empty repo)
mkdir -p /tmp/aiwg-rv-<provider-slug> && cd /tmp/aiwg-rv-<provider-slug>
# (Substitute <provider-slug>: claude, codex, copilot, etc.)
```

Record outcomes in the issue under **§ 0 Pre-flight**.

---

## 1. Deploy AIWG to the provider (Regression check #1)

```bash
# 1.1 — Deploy a small framework. Use sdlc-complete unless the provider's quickref calls for something else.
aiwg use sdlc --provider <provider-slug>

# 1.2 — Verify deploy completed without "migration: partial" (regression from #1516, fixed in v2026.5.13)
aiwg status --probe --json | jq '{workspace: .workspace, migration: .migration}'
```

**Pass criteria**:
- `aiwg use` exits 0.
- `migration.status` is `"completed"` (not `"partial"`) on a fresh workspace.
- `workspace.isFrameworkScoped` is `true`.

**Evidence to paste**: the output of step 1.2 verbatim.

---

## 2. Deploy AIWG hooks (Regression check #2 — Claude Code only)

This step only applies if the provider is Claude Code. Skip for all other providers.

If you're on a workstation that **had AIWG installed before May 10, 2026** (pre-`be3ee551`):

```bash
# 2.1 — Show the current SessionStart hook reference in settings.json
jq '.hooks.SessionStart' .claude/settings.json
# Expected: command ends in "aiwg-session.cjs". If it ends in ".js", the v2026.5.13 hook fix has not yet
# been applied to this settings.json.

# 2.2 — If you saw ".js" above, refresh to trigger the heal
aiwg refresh
# Re-run 2.1 — command should now end in ".cjs".
```

**Pass criteria**: `.cjs` path in the hook command after refresh. If the path was already `.cjs` (new install), step 2.2 was unnecessary — record that as Pass.

---

## 3. Open a fresh provider session

Open the provider's UI / CLI / IDE — whatever is the canonical entry point for that provider — in the project directory from step 0.3. Make sure the deployed AIWG files are visible to the agent (no startup error referring to a missing file).

**Pass criteria**: Session opens. Agent acknowledges. No error banners about missing skills, missing config, missing hooks, or `MODULE_NOT_FOUND`.

**Evidence**: Copy any startup banner or error verbatim.

If the session fails to open or shows hook errors: STOP this provider's pass and report the error in the issue. Don't attempt to fix.

---

## 4. Discovery hookup — does the agent know how to find AIWG things?

Type **exactly this** into the session, verbatim:

> Find an AIWG skill that handles intake forms.

Watch what the agent does. Record which of the following it uses (one or more):

| Hook | Looks like |
|---|---|
| **rule** | Mentions the discover-first rule, or runs `aiwg discover` directly. |
| **config / context file** | Cites `AGENTS.md`, `AIWG.md`, `WARP.md`, `.github/copilot-instructions.md`, or the provider's equivalent context file. |
| **quickref** | Uses a loaded AIWG quickref skill (mentions `sdlc-quickref`, `aiwg-utils-quickref`, etc.). |
| **discovery-agent** | Delegates to `aiwg-finder` or the provider's curator / subagent equivalent. |
| **none** | Improvises from training data; never cites AIWG-specific surface. |

**Pass**: at least one hook fires AND the agent surfaces a real intake-related skill (`intake-wizard`, `intake-start`, or `intake-from-codebase`).

**Fail**: agent declines, claims AIWG has no such skill, or invents a skill name not in the index.

**Evidence**: paste the agent's reply verbatim (truncate to ~20 lines if very long).

---

## 5. Skill body fetch — can the agent read a deployed skill?

Type **exactly this** into the session:

> Read the AIWG quickref for AIWG utility discovery and summarize the fallback when a skill is not loaded.

Record the read-access behavior:

| Path | Looks like |
|---|---|
| **`aiwg show`** | Agent runs `aiwg show skill aiwg-utils-quickref` (or equivalent) and quotes the content. |
| **Direct file read** | Agent reads a `.md` file via its native Read tool. Acceptable for providers where `aiwg show` isn't reachable. |
| **MCP `rule-show` / `skill-show`** | Hermes only — agent uses MCP tool. |
| **Failure** | Agent guesses, declines, or references a non-existent path. |

**Pass criteria**: any of the first three (real content surfaces). **Fail**: guesswork or refusal.

**Evidence**: paste the agent's summary verbatim, especially the fallback description.

---

## 6. Skill invocation — does a representative skill actually run?

Type **exactly this**:

> Run aiwg discover for "deploy production" and tell me the top three results.

**Pass criteria**: agent either runs the `aiwg discover` command (CLI dispatch) or reports the top results via the index. The expected #1 result is `flow-deploy-to-production` (score ~0.51).

**Fail**: agent invents results, declines without trying, or surfaces names not in the deployed corpus.

**Evidence**: paste the discover output verbatim.

---

## 7. Provider-specific regression spot check

| Provider | Spot check |
|---|---|
| Claude Code | Confirm SessionStart hook did not crash (no "Failed with non-blocking status code" banner). |
| Codex | Confirm `~/.codex/skills/` and `~/.codex/prompts/` contain the deployed files. |
| Copilot | Confirm `.github/agents/`, `.github/prompts/`, `.github/instructions/` populated. |
| Cursor | Confirm `.cursor/agents/`, `.cursor/commands/`, `.cursor/skills/`, `.cursor/rules/` populated. |
| Warp | Confirm `WARP.md` regenerated; spot-check it lists deployed AIWG content. |
| Factory | Confirm `.factory/droids/`, `.factory/commands/`, `.factory/skills/` populated. |
| OpenCode | Confirm `.opencode/agent/`, `.opencode/command/`, `.opencode/skill/` populated. |
| Windsurf | Confirm `AGENTS.md` regenerated; confirm `.windsurf/rules/` populated. |
| OpenClaw | Confirm `~/.openclaw/{agents,commands,skills,rules,behaviors}/` populated. |
| Hermes | Confirm `AGENTS.md` regenerated; MCP server reachable; `mcp_aiwg_command_run` tool listed. |
| Omnius | Confirm `aiwg discover` is reachable inside an Omnius session and returns ranked results. |

Run the appropriate `ls` / inspection commands. Paste the directory listing.

**Pass**: deployed paths populated as expected. **Fail**: empty or missing paths.

---

## 8. Final verdict per provider

In the issue, at the top of your last comment, state one of:

```
VERDICT: PASS — all 7 checks green.
VERDICT: PASS WITH NOTES — N failures captured below, none release-blocking.
VERDICT: FAIL — release-blocking issue; details below.
```

Then list each step's outcome:

```
0. Pre-flight: PASS / FAIL / UNSURE
1. Deploy: PASS / FAIL / UNSURE
2. Hook heal (Claude Code only): PASS / FAIL / UNSURE / N/A
3. Session opens: PASS / FAIL / UNSURE
4. Discovery hookup: PASS / FAIL / UNSURE
5. Skill body fetch: PASS / FAIL / UNSURE
6. Skill invocation: PASS / FAIL / UNSURE
7. Provider regression spot check: PASS / FAIL / UNSURE
```

For every Fail or Unsure: a one-line note in the comment, AND a follow-up issue with the provider name in the title (so the matrix epic links to it).

---

## What a release-blocking failure looks like

These warrant immediate operator notice; everything else is captured as a known issue and rolled forward:

- `aiwg use` exits non-zero on a clean target.
- `aiwg status --probe` reports `migration: partial` on a fresh deploy (regression of #1516).
- Claude Code session shows `SessionStart:startup hook error → MODULE_NOT_FOUND` (regression of v2026.5.13 hook fix).
- Provider session refuses to open citing a missing AIWG file.
- Discovery hookup returns invented (hallucinated) skill names instead of real ones.

Other failures (one provider's discover doesn't fire, one provider's `aiwg show` isn't reachable, etc.) are captured as the per-provider follow-ups they always have been.

---

## When all child issues have a verdict

Close the epic with a summary comment of the form:

```
| Provider | Verdict | Notes |
|---|---|---|
| Claude Code | PASS | — |
| Codex | PASS WITH NOTES | discovery uses prompt-file path, not aiwg show |
…
```

This is the artifact future releases will reference when deciding "did we ship a regression on provider X."
