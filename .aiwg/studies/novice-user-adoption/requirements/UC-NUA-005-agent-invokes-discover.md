---
artifact_type: use_case
id: UC-NUA-005
study: novice-user-adoption
workstream: A, E
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-005: Agent invokes AIWG discover during a user session

## Reasoning

1. **Problem analysis** — When a user asks an AI session a question AIWG can help with, the agent should query `aiwg discover` and route through the capability index. On Claude Code and Codex this works in the field; on the other eight providers the behavior is reported-but-not-validated. The four discovery hooks (rule, AIWG.md, quickref, discovery-agent) reach the agent through different mechanisms on each platform.
2. **Constraint identification** — Cannot make platform-wide statements without field evidence. Static analysis of file scanning produces over-confident conclusions. Per-platform validation is mandatory.
3. **Alternative consideration** — Options for validating: (a) static audit only — rejected, see saved memory rule; (b) scripted task per platform — preferred; (c) user telemetry — useful but lower-priority; (d) manual exploration on each platform — fallback when scripting impractical.
4. **Decision rationale** — Combination of (b) and (d): scripted where feasible, manual exploration where not. Result is a field-validated matrix per Workstream A.
5. **Risk assessment** — R-001 (validation infeasibility) and R-006 (static audit recurrence) both apply. Mitigations: prioritize platforms by user volume; require evidence-type documentation per platform.

## Primary Actor

Agent (the LLM running in a user session on any of the 10 providers)

## Secondary Actor

End User (asking the question; benefits from the agent invoking discover)

## Goal

The agent reliably invokes `aiwg discover` when an AIWG-relevant question is asked, regardless of which of the 10 providers is hosting the session.

## Preconditions

- AIWG is correctly deployed to the platform-native paths for the user's provider
- The provider's session config grants the agent read access to `$AIWG_ROOT` (Workstream E)
- The four discovery hooks are deployed (rule file, AIWG.md / equivalent, quickref skill, discovery-agent)

## Main Success Scenario

1. User asks a question the AIWG capability index can answer better than the model alone (e.g., "help me set up testing for this project")
2. The agent classifies the question as AIWG-relevant via at least one of the four hooks
3. The agent invokes `aiwg discover "<paraphrased need>"` via shell / tool call
4. `discover` returns ranked candidates; agent reads the top result with `aiwg show`
5. Agent applies the skill, returning AIWG-quality output to the user

## Alternative Flows

**A1 — Rule hook fires** (Claude Code, Cursor: rule file auto-loaded)

**A2 — AIWG.md / context-file hook fires** (Codex, Warp, Windsurf: primary context file references discover)

**A3 — Quickref hook fires** (any provider with kernel skills loaded: quickref skill names discover as the entry point)

**A4 — Discovery-agent hook fires** (any provider with subagent dispatch: agent calls `aiwg-finder` subagent which queries discover internally)

**A5 — No hook fires; agent answers from training** (FAILURE MODE — to be detected and corrected by Workstream A)

## Postconditions

- A per-platform evidence matrix documents which hooks fire reliably on which providers
- Hookup gaps are identified with specific evidence type
- Workstream A produces follow-up work for any platform where no hook reliably fires

## Acceptance Criteria

- [ ] Per-platform matrix produced for all 10 providers with documented evidence type per cell
- [ ] At least 8 of 10 platforms confirmed with field evidence (not static analysis)
- [ ] For each "no reliable hook" finding, a follow-up issue is filed with proposed remediation
- [ ] Discovery-agent hook (`aiwg-finder`) is specifically audited for invocation rate
- [ ] Provider read-access to `$AIWG_ROOT` is verified per provider (Workstream E)

## References

- Workstreams A, E
- Parent: UC-NUA-001
- Saved memory: `feedback_discovery_multi_hook`, `feedback_no_platform_generalization`, `feedback_no_skill_copying`
- Research: existing corpus REF-877/878/879 (tool-routing precision)
