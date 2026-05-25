# ADR: Route Native In-Session Agent Loops Through `/goal`

Date: 2026-05-24
Status: Accepted
Issues: #1451, #1469

## Context

AIWG has provider-neutral skills for iterative work (`agent-loop`, legacy `ralph`, `address-issues`). Codex and Claude Code provide a native in-session standing-goal primitive, `/goal`, that covers the same visible iterate-until-complete use case.

## Decision

For providers with native `/goal` (currently Codex and Claude Code), AIWG in-session loop skills delegate iteration to native `/goal`. The skill remains the source of routing, completion inference, threat checks, issue comments, and activity-log behavior. Other providers keep the existing AIWG in-session loop discipline.

The branch is internal and detected through provider/runtime information (`aiwg runtime-info` or an equivalent steward capability). AIWG will not create `*-codex` or `*-claude` clone skills.

## Completion Mapping

The AIWG completion criterion is appended to the native goal text as `completion: <criterion>`. If no criterion is supplied, `infer-completion-criteria` runs before the Codex branch.

## Fallback

If a host exposes `/goal` only as an operator-entered slash command and no programmatic goal tool is available, the skill must pause and print the exact `/goal "..."` command for the operator to run. It must not fall back to a duplicate AIWG emulation loop silently.

## Consequences

- Codex and Claude Code users get native goal persistence and cross-turn continuation.
- External Ralph remains AIWG-native because `/goal` is in-session, not detached.
- Issue-thread and activity-log evidence remains AIWG-owned and provider-stable.
