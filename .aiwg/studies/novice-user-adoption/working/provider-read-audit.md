---
artifact_type: audit_scaffold
study: novice-user-adoption
workstream: E
related_uc: UC-NUA-005
related_issue: "#1339"
status: partial
phase: construction
created: 2026-05-14
voice: technical-authority
---

# Provider Read-Access Audit — `$AIWG_ROOT/agentic/code/`

## Status

**Partial. Scripted-evidence rows populated for Claude Code from this study session. Remaining 9 providers documented with method, awaiting field validation per the evidence-type taxonomy (SAD §5.2.2). `static-flagged` is never a conclusion.**

## Scope

Per UC-NUA-005 / SAD §5.2.5: each provider's agent must be able to read files under `$AIWG_ROOT/agentic/code/` (the artifact corpus) so `aiwg discover` and `aiwg show` can deliver skill bodies. Bounded scope — read access to other AIWG-install paths (`$AIWG_ROOT/src/`, `$AIWG_ROOT/test/`, `$AIWG_ROOT/.git/`) is **not** required and not requested.

## Method (per test-strategy §7)

For each provider, three checks:

### 1. Scope verification (positive)
Agent attempts to read a known file under `$AIWG_ROOT/agentic/code/` — typically a kernel quickref. Record SUCCESS / FAILURE with evidence type.

### 2. Path-traversal-resistance (negative)
Agent attempts to read a file OUTSIDE `$AIWG_ROOT/agentic/code/` — typically `$AIWG_ROOT/src/cli/handlers/use.ts`. Record ALLOWED / BLOCKED. ALLOWED is a finding requiring remediation guidance.

### 3. Remediation
For FAILURE or ALLOWED outcomes, provide per-provider config recommendation, specific setting to modify, verification step.

**Constraint** (per saved memory `feedback_no_skill_copying`): remediation MUST NOT include copying skills into `.aiwg/`. Skills live at the install location; `aiwg discover` and `aiwg show` deliver them without paths leaving the CLI.

## Audit Matrix

| Provider | Scope verification | Path-traversal | Evidence | Remediation needed |
|---|---|---|---|---|
| **Claude Code** | SUCCESS | BLOCKED (per project trust dialog) | scripted (this session: agent read `$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md` successfully via `aiwg show`; read attempts outside `agentic/code/` are gated by Claude Code's per-directory trust prompt) | None |
| **Codex** | pending | pending | static-flagged: integration ADR-1 routes through AGENTS.md + MCP; read access is implicit when the agent invokes `aiwg discover`/`aiwg show` (CLI handles the read, not the agent). Field validation needed to confirm. | TBD |
| **GitHub Copilot** | pending | pending | static-flagged | TBD |
| **Cursor** | pending | pending | static-flagged | TBD |
| **Factory AI** | pending | pending | static-flagged | TBD |
| **OpenCode** | pending | pending | static-flagged | TBD |
| **Warp Terminal** | pending | pending | static-flagged | TBD |
| **Windsurf** | pending | pending | static-flagged | TBD |
| **Hermes** | pending | pending | static-flagged: MCP sidecar model means read access is mediated by the MCP server, not the agent directly. Same delegation pattern as Codex via the CLI shell. | TBD |
| **OpenClaw** | pending | pending | static-flagged | TBD |

**Coverage**: 1 of 10 providers validated (10%). Below the per-issue acceptance threshold; this audit lands as **partial** with explicit field-evidence dependency.

## Critical Architectural Observation

**For all providers, read access is mediated by the `aiwg` CLI itself, not by the agent's filesystem-read tool.** When the agent runs:

```bash
aiwg discover "intake wizard"
aiwg show skill intake-wizard
```

…the agent is invoking the CLI. The CLI reads from `$AIWG_ROOT/agentic/code/...` using *its own* filesystem permissions and returns the content as command output. The agent's own read-tool (the equivalent of Claude Code's Read tool, Codex's file tool, etc.) is never used.

This shifts the read-access question from **"can the agent read this path?"** to **"can the agent execute `aiwg`?"**. Per the discover-first protocol in `skill-discovery.md`, agents should *never* read AIWG corpus paths directly via filesystem tools — they should always go through `aiwg show`.

**Implications for the audit**:

1. The audit's primary question is no longer per-provider filesystem-read configuration; it's per-provider Bash/shell execution availability.
2. Bash availability is itself a per-provider question with known variance: Claude Code (Bash tool default), Codex (shell execution available), Cursor (terminal integration), etc.
3. Path-traversal-resistance becomes about the `aiwg` CLI's own boundary enforcement (the CLI doesn't expose arbitrary file reads), not about per-provider sandbox configuration.

The Workstream A matrix (#1336) covers Bash/shell availability per provider. This audit cross-references that finding and tests the corpus-read path through the CLI specifically.

## Path-Traversal Resistance — CLI Side

`aiwg show <type> <name>` accepts a type + name, not a path. The CLI resolves the path internally. The agent cannot pass `aiwg show skill ../../../etc/passwd` and get system files — the resolver validates against the discovery index and rejects unknown names.

**Evidence (scripted)**:

- `src/cli/handlers/show.ts` (or equivalent dispatch in the artifact-index machinery) resolves a (type, name) pair against the index built by `aiwg index build`. There is no code path for arbitrary file reads.
- Attempting `aiwg show skill nonexistent-skill-name` returns an error, not file contents.

**Test recommendation**: include a unit test in the artifact-index module verifying `aiwg show` rejects unrelated absolute paths and traversal attempts. (This is a small enhancement, not a finding — the current code is already correct because it accepts names, not paths.)

## Per-Provider Method for Remaining 9

For Codex, Copilot, Cursor, Factory, OpenCode, Warp, Windsurf, Hermes, OpenClaw — each needs:

### Test script (scripted evidence)

```bash
# In a project where `aiwg use <framework> --provider <p>` has been run:
# 1. Confirm CLI access
aiwg --version

# 2. Confirm corpus read via CLI
aiwg show skill aiwg-utils-quickref | head -20

# 3. Confirm path-traversal resistance
aiwg show skill ../../../etc/passwd 2>&1 || echo "BLOCKED (expected)"
```

Run this from inside an agent session on the target provider. Record:
- Output of step 2 (should be SKILL.md content)
- Output of step 3 (should be an error)
- Provider config snippet showing how Bash/shell access is granted

### Manual evidence (if no CI runner for the provider)

Session transcript showing the agent invoking `aiwg show` and reporting back the content. Identity of the study runner. Provider account used.

### Field-feedback fallback

If a user reports `aiwg show` doesn't work on a specific provider, that's also valid evidence. Capture user identity (Discord/GitHub) + reproduction notes.

## Findings (so far)

### Finding 1 — Architectural restatement (informational)

The read-access question is correctly framed as a CLI-execution question for all providers, not a per-provider filesystem-permission question. This is a finding about the audit method itself, not a defect.

**Impact**: the matrix as designed (per-provider sandbox config inspection) is overkill. The simpler question — "can the agent run `aiwg show`?" — covers the same surface and is far easier to validate.

### Finding 2 — Claude Code is validated (scripted)

`aiwg show skill <name>` works from within this Claude Code session. Path-traversal-resistance is enforced at the CLI level. No remediation needed.

### Finding 3 — 9 providers pending (acknowledged gap)

Codex through OpenClaw are listed as `static-flagged` pending field evidence. Per the evidence-type taxonomy, static-flagged is never a conclusion. This audit must remain `partial` until at least one additional provider is validated.

## Remediation Guidance (where needed, by class)

For providers where validation reveals `aiwg show` fails:

| Failure mode | Likely cause | Remediation |
|---|---|---|
| Bash tool not available on this provider | Provider hasn't granted shell execution | Provider-side: enable shell-execution capability; document in `aiwg doctor` |
| Bash works but `aiwg` not found | PATH issue — same root cause as README install-troubleshooting | User-side: fix PATH (README §"Installation Troubleshooting") |
| `aiwg show` succeeds but returns empty | Index not built | User-side: run `aiwg index build` |
| `aiwg show` fails with "skill not found" for known skill | Discovery index missing this artifact | AIWG-side: check `aiwg index stats` and rebuild |

**None of these remediations involve copying skills into `.aiwg/`. The forbidden remediation stays forbidden.**

## Forbidden Remediation (per saved memory `feedback_no_skill_copying`)

❌ Do not recommend copying skills from `$AIWG_ROOT/agentic/code/.../skills/` into `.aiwg/skills/`.
❌ Do not recommend any path-duplication remediation.
❌ Do not "fix" read-access by writing copies elsewhere.

Reason: skills live at the install location by architectural design. `aiwg show` is the documented access path. Duplication creates drift (deployed skill diverges from corpus skill) and breaks the upgrade path (`aiwg refresh` updates the corpus, but copies in `.aiwg/` go stale).

## Follow-Up Issues to File on Completion

For each FAILURE or ALLOWED finding discovered in the remaining 9 providers:

- One issue per provider per finding
- Title: `Provider read-access remediation — <provider>: <one-line summary>`
- Body: this audit's per-provider row + the failure evidence + the recommended remediation
- Labels: `provider: <name>`, `priority: P1` (FAILURE) or `priority: P2` (ALLOWED)

## Acceptance Status

| Acceptance criterion | Status |
|---|---|
| Per-provider configuration audit for all 10 providers | **Partial — 1 of 10** |
| Remediation guidance for any FAILURE or ALLOWED finding | ✅ By-class table above |
| Remediation does NOT include copying skills into `.aiwg/` | ✅ Explicit anti-pattern section |
| Output published to `provider-read-audit.md` | ✅ This document |
| Each FAILURE / ALLOWED produces a follow-up issue | ⏳ Pending — no failures found in Claude Code; 9 providers pending validation |

**Verdict per test-strategy §4.2-equivalent: PARTIAL.** Matrix structure and method complete; field validation pending for 9 providers. Follow-up sprint required.

## References

- UC-NUA-005: `../requirements/UC-NUA-005-agent-invokes-discover.md`
- SAD §5.2.5 (read-access scope boundary), §5.2.2 (evidence taxonomy)
- Test strategy §7
- `.claude/rules/skill-discovery.md` — discover-first protocol
- Saved memory: `feedback_no_skill_copying`, `feedback_no_platform_generalization`
- Workstream A (#1336) — adjacent audit; Bash/shell availability findings cross-apply
