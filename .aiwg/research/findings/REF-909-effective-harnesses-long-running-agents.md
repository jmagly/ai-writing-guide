# REF-909 AIWG Analysis: Effective Harnesses for Long-Running Agents

**Source**: @~/dev/research-papers/documentation/references/REF-909-anthropic-2025-effective-harnesses-long-running-agents.md
**Paper**: Anthropic Applied AI Team. (2025, Nov). *Effective Harnesses for Long-Running Agents*. Anthropic Engineering Blog.
**URL**: https://www.anthropic.com/engineering/effective-harnesses-for-long-running-agents
**Companion code**: https://github.com/anthropics/cwc-long-running-agents
**Induction**: corpus induction #615
**AIWG Commissioning**: roctinam/aiwg#1348 (auto-compact-continue rule, v2026.5.6)
**AIWG Relevance**: **HIGH** — Authoritative source for the `auto-compact-continue` HIGH rule and the progress-file pattern.
**GRADE**: **LOW** — Vendor engineering post; no released eval suite; reflects production practice.

---

## Executive Summary

Anthropic's post argues that **long-running agent reliability is a harness-design problem, not a model-capability problem**. Even with a perfect model, finite context windows force work across discrete sessions; each new session begins with no memory of prior ones. The post prescribes a two-agent pattern — **initializer-agent** runs once to set up env + scaffolding, **coding-agent** runs each subsequent session and reconstructs state from durable artifacts (`init.sh`, `claude-progress.txt`, git history).

The load-bearing artifact is the progress file. It records current status, completed tasks with git refs, and — most importantly — **failed approaches and why**. Without this section, successive sessions re-attempt known dead ends. With it, fresh-context agents resume from where the prior session stopped.

---

## AIWG Concept Mapping

| REF-909 Concept | AIWG Equivalent | Status |
|---|---|---|
| Initializer-agent (one-time setup) | `aiwg use`, `aiwg new`, intake skills | **Implemented** — bootstrap is already a one-time op |
| Coding-agent (per-session worker) | Standard agentic-session loop | **Implemented** — sessions are inherently bounded |
| `claude-progress.txt` | `.aiwg/activity.log` + `.aiwg/working/<task>-progress.md` | **Implemented** (activity log) + **codified** (progress file by auto-compact-continue Rule 3) |
| Git as durable substrate | delivery-policy + post-commit hooks | **Implemented** |
| "Failed approaches and why" section | Reflection memory + progress file template (Rule 3) | **Codified** in the rule template |
| Smoke test on session start | Read progress file → activity log → git status (Rule 8) | **Codified** as session-resume protocol |
| Supervisor reviewing final state (vs. self-report) | UAT + verifier agent + ralph completion verification | **Implemented** for agent loops |

### The gap REF-909 closed

AIWG had every constitutive substrate (activity log, memory, working directory, git discipline) **before** this induction. What was missing was the explicit rule that *the answer to "should I keep working?" is always YES, recover via the harness instead of asking the user*. REF-909 supplies the framing; the rule supplies the AIWG-flavored enforcement.

---

## Direct Application: `auto-compact-continue` Rule

Each REF-909 prescription maps to a specific rule clause:

| REF-909 prescription | Rule clause |
|---|---|
| Externalize state to disk; trust the harness | Rule 2 ("Use the Harness, Don't Ask the Human") |
| Progress file with status / completed / failed approaches / state refs | Rule 3 ("Write a Progress File for Multi-Phase Work") — full template included |
| Initializer-agent / coding-agent split → bridge file is the progress file | Rule 8 ("Recovery After Compaction") — reads progress file first |
| Failed approaches prevent re-attempting dead ends | Rule 8 step 5 ("Skip the failed approaches set. Do not re-try them.") |
| Commit descriptively; git history is load-bearing | Listed in Rule 2's durable-substrate table |
| Don't trust self-report; supervisor reviews final state | Reinforced by `vague-discretion` rule's measurable completion requirement |

### Behavioral pattern stated plainly

REF-909's central operational claim: *the harness encodes established software-engineering practices (git discipline, progress notes, smoke tests, clean states) — the agent inherits reliability properties from the conventions, not from the model.* AIWG had the conventions; the rule made them mandatory.

---

## Quantitative Evidence

The Anthropic post is qualitative — no released benchmark suite, no released metrics. The authors describe the pattern as enabling Claude Agent SDK to "operate effectively across many context windows" but do not quantify success rate, token cost, or completion-time improvements.

**Implication for AIWG**: AIWG cites this as practitioner-grade prescriptive guidance, not empirically validated. The rule's hedging in `## References` (REF-909 listed as Anthropic engineering post, not as research) reflects this honestly.

---

## Limitations & Open Questions

- **Vendor framing**: post is written to support Claude Agent SDK adoption; the underlying principles are vendor-neutral but the implementation guidance is Claude-shaped. AIWG generalizes via per-provider AGENTS.md/CLAUDE.md/etc. equivalents.
- **Single-agent vs multi-agent**: authors note open question whether one general coding-agent beats a multi-agent (test/QA/cleanup) split. AIWG already commits to multi-agent (SDLC agents, ralph + verifier), so this question maps to "are we right?" rather than "should we change?"
- **Small-task overhead**: progress-file pattern adds tokens to every session opening; on small tasks the overhead dominates the benefit. AIWG's Rule 3 hedges by scoping to "multi-phase work expected to span >20 tool calls or one compaction window."
- **No released eval**: no benchmark to validate the rule's effectiveness in AIWG specifically; we adopt on the basis of mechanism (durable substrate + replay-from-checkpoint is structurally sound) rather than measured outcome.

---

## Cross-References

- **REF-910** (Anthropic — Compaction) — sibling: within-session compaction; this is across-session continuity. Both consumed by auto-compact-continue rule.
- **REF-122** (Verma — Focus Agent / Active Context Compression) — complement: aggressive in-session compaction layered with cross-session progress files.
- **REF-128** (Zylos — Context Window Management) — context: 30-40% effective-capacity gap motivates exactly this kind of harness.
- **REF-127** (Long-Running Agents — Zylos) — extends: industry survey of degradation curves; this post is the prescriptive architecture.
- **REF-089** (Recursive Language Models — Zhang et al.) — orthogonal: RLM treats context as external environment within a session; REF-909 treats artifacts as external environment across sessions.

### AIWG artifacts consuming this REF

- @agentic/code/addons/aiwg-utils/rules/auto-compact-continue.md (primary)
- @.aiwg/research/findings/REF-910-claude-compaction.md (sibling analysis)
- @docs/releases/v2026.5.6-announcement.md (release narrative)

---

## Implementation Status

| AIWG component | Status | Notes |
|---|---|---|
| `auto-compact-continue` rule | Active | Deployed to .claude, .codex, .github/instructions; gap on cursor/factory/opencode/windsurf flagged 2026-05-15 |
| Progress file template (Rule 3) | Codified | Full template in rule body |
| Activity log (`.aiwg/activity.log`) | Active | activity-log rule + skill |
| Memory system (`~/.claude/projects/.../memory/`) | Active | auto memory pipeline |
| `## Compact Instructions` in generated context | Codified | Rule 5 specifies the section; AIWG.md/AGENTS.md generation pipelines should include it |
| Per-task progress files in `.aiwg/working/<task>-progress.md` | Documented | Created on-demand by long-task agents per Rule 3 |

---

## Revision History

| Date | Change | Author |
|---|---|---|
| 2026-05-15 | Initial AIWG-side analysis | claude-opus-4-7 |
