# REF-910 AIWG Analysis: Compaction (Claude API Documentation)

**Source**: @~/dev/research-papers/documentation/references/REF-910-anthropic-2026-claude-compaction.md
**Paper**: Anthropic. (2026). *Compaction*. Claude API Documentation, Build with Claude.
**URL**: https://platform.claude.com/docs/en/build-with-claude/compaction
**Induction**: corpus induction #616
**AIWG Commissioning**: roctinam/aiwg#1348 (auto-compact-continue rule, v2026.5.6)
**AIWG Relevance**: **HIGH** — Defines the platform mechanism that makes auto-compact-continue's "trust the harness" stance safe.
**GRADE**: **LOW** — Vendor product documentation; authoritative for Claude-specific behavior; subject to silent change.

---

## Executive Summary

Anthropic's product documentation for the **compaction** mechanism: automatic summarization of conversation history when token usage approaches the context window limit. The mechanism transforms the context window from a hard ceiling into a soft buffer — sessions continue seamlessly when limits are reached, provided critical state lives in artifacts that survive the compaction step.

**What survives**: system-prompt scope (CLAUDE.md, AGENTS.md, AIWG.md), files on disk, git history, the summary itself, items explicitly preserved by `## Compact Instructions`.

**What does NOT survive**: raw tool outputs from earlier in the session, exploratory reasoning traces, earlier user turns the summarizer doesn't deem load-bearing.

Since Claude Code v2.0.64 compaction is instantaneous (no waiting). The `/compact` command also accepts a `focus` argument for user-directed preservation at known-good checkpoints.

---

## AIWG Concept Mapping

| REF-910 Mechanism | AIWG Implementation | Status |
|---|---|---|
| Auto-compact trigger at context threshold | Inherited from Claude Code platform | Platform-native |
| System-prompt-scope files survive compaction | CLAUDE.md, AGENTS.md, AIWG.md, `.codex/` rules, etc. | **Implemented** — all provider context files honor this |
| `## Compact Instructions` section in CLAUDE.md | Codified by auto-compact-continue Rule 5 with template | **Codified** — generation pipeline should add it |
| Files on disk survive compaction | `.aiwg/activity.log`, `.aiwg/working/`, memory dir | **Implemented** — primary durable substrate |
| Git history survives compaction | Listed in Rule 2's durable-substrate table | **Implemented** |
| `/compact focus on X` at checkpoint | Manual operator tool; AIWG progress-file write is the agent-side analog | **Documented** |
| Default summarization is task-continuity-oriented | Aligns with AIWG completion-criteria emphasis | **Reinforced** by `vague-discretion` rule |

### The gap REF-910 closed

Pre-induction, AIWG agents responded to context pressure by asking the user "should I keep working?" — treating context as a scope question. REF-910 documents that the platform handles context as an operational concern: auto-compact runs when needed and conversation continues. The right agent behavior is to *prepare* for compaction (load-bearing state on disk + Compact Instructions in system scope), not to interrupt the user.

---

## Direct Application: `auto-compact-continue` Rule

| REF-910 finding | Rule clause |
|---|---|
| Auto-compact runs automatically at threshold | Rule 4 ("Trust the Platform's Auto-Compact") |
| System-prompt-scope files survive | Rule 2 (substrate table — CLAUDE.md/AGENTS.md/AIWG.md row) |
| Files on disk survive | Rule 2 (activity log, working dir, memory rows) |
| Git history survives | Rule 2 (git history row) |
| Custom Compact Instructions can preserve task-specific state | Rule 5 ("Honor the Compact Instructions") + full template |
| Stopping to ask is the wrong response | Rule 1 ("Never Ask 'Should I Continue?' When Context Is the Reason") |
| `/compact focus on X` for known-good checkpoints | Rule 6 ("Aggressive, Not Passive, Compaction Discipline") — agent equivalent is checkpointing to progress file |

### The minimum-viable Compact Instructions block

Rule 5 ships a ready-to-use template. Key items preserved:
1. Completion criteria verbatim
2. Last successful step + verification command
3. Failed approaches (do not re-attempt)
4. References to `.aiwg/working/*-progress.md`, `.aiwg/activity.log`, in-flight commits
5. Pending authorization questions
6. Open scope boundaries

Items discarded: exploratory reasoning traces, superseded tool outputs, non-load-bearing prose.

---

## Quantitative Evidence

The Anthropic docs are operational, not empirical. No published metrics on compaction success rate, information-loss rates, or session-extension impact. The `/compact` command's existence and the `Compact Instructions` surface are documented but their effectiveness is not benchmarked in this source.

**Caveat from source** (REF-910 limitations): "The summary's quality depends on the model's judgment about what matters; on novel tasks this judgment can be wrong." AIWG's response: put load-bearing state on disk where summarization quality is irrelevant.

**System-prompt inflation caveat**: GitHub issue `anthropics/claude-code#45188` documents a regression where the system prompt grew ~70K tokens, making manual `/compact` necessary at much shorter intervals. This is a known failure mode — auto-compact budget is sensitive to other context costs (skill descriptions, tool definitions, large CLAUDE.md) the user doesn't directly control. AIWG's skill budget enforcement (visible in `aiwg doctor`) directly mitigates this.

---

## Limitations & Open Questions

- **Lossy by definition**: compaction is summarization; details not flagged for preservation can disappear without the agent noticing. AIWG's response: durable substrate on disk for anything load-bearing.
- **No fine-grained visibility**: users have no clear view of what was discarded vs preserved unless they explicitly inspect post-compact state. AIWG mitigates by writing progress files at checkpoints — the file is the post-compact ground truth.
- **REF-089 (RLM) caveat**: compaction is "rarely expressive enough" for tasks that need dense access to early-session detail; programmatic context access (the RLM pattern) is preferred for those. AIWG covers this case via the RLM addon and rlm-context-management rule — orthogonal to auto-compact-continue, not in conflict.
- **Vendor-controlled**: documentation is subject to silent change. AIWG cites with hedging and tracks Anthropic doc updates via the radar pattern in research-papers.

---

## Cross-References

- **REF-909** (Effective Harnesses for Long-Running Agents) — sibling: across-session continuity; REF-910 is within-session compaction. Both consumed by auto-compact-continue rule.
- **REF-122** (Verma — Focus Agent / Active Context Compression) — extends: agent-controlled compression layered on platform auto-compaction.
- **REF-128** (Zylos — Context Window Management Strategies) — confirms: 30-40% effective-capacity gap motivates exactly this kind of mechanism.
- **REF-130** (Anthropic — Effective Context Engineering for AI Agents) — sibling: broader principles; this doc is the operational mechanism.
- **REF-143** (ACON) — research-grade context compression; complement to vendor auto-compact.
- **REF-089** (Recursive Language Models) — counterpoint: RLM argues programmatic context access > summarization for information-dense tasks.

### AIWG artifacts consuming this REF

- @agentic/code/addons/aiwg-utils/rules/auto-compact-continue.md (primary)
- @.aiwg/research/findings/REF-909-effective-harnesses-long-running-agents.md (sibling)
- @docs/releases/v2026.5.6-announcement.md (release narrative)

---

## Implementation Status

| AIWG component | Status | Notes |
|---|---|---|
| Provider context files include load-bearing rules at system scope | Active | All 10 providers receive `auto-compact-continue` via rule deployment (cursor/factory/opencode/windsurf gap flagged 2026-05-15) |
| `## Compact Instructions` section in generated AIWG.md/CLAUDE.md | Pending pipeline integration | Template in Rule 5; should be added to `aiwg regenerate` output |
| Skill budget enforcement (mitigates system-prompt inflation) | Active | `aiwg doctor` Skill Budget check |
| `/compact focus on X` operator awareness | Documented in rule body | Operator tool, not an agent action |
| Progress files as agent-side checkpoint analog | Codified | Rule 3 template |

---

## Revision History

| Date | Change | Author |
|---|---|---|
| 2026-05-15 | Initial AIWG-side analysis | claude-opus-4-7 |
