# Skill Discovery Rules

**Enforcement Level**: HIGH
**Scope**: All AIWG-deployed agents on platforms with skill-listing budgets
**Addon**: aiwg-utils (core, universal)
**Issue**: #1215 (parent epic #1212)

## Overview

AIWG ships hundreds of skills, agents, commands, and rules across its installed frameworks. Agentic platforms (Claude Code, OpenClaw, Codex, Cursor, Factory, etc.) cap how many skills they will list in any given context — Claude Code at 25% of context window by default, OpenClaw at 150 hard, others on similar trajectories. To work within those caps, AIWG deploys two tiers:

- **Kernel skills** at the platform-native skills directory (`.claude/skills/`, `.factory/skills/`, etc.) — always loaded. ~10 today: one quickref per installed framework + a small core utility set.
- **Standard skills** at `<provider-dir>/.aiwg/skills/` — *not* listed by the platform. Reachable only through the AIWG artifact index.

This means **most AIWG skills are not in your context**. You see the kernel set; the rest exists but is invisible until you query for it.

## Problem Statement

Without explicit framing, an agent operating in this layout will:
- Look at its loaded skill set, see ~10 quickrefs, and conclude AIWG can't do something
- Decline a user request that *would* be served by a skill the agent doesn't see
- Re-derive a workflow from scratch when a curated skill already exists for it
- Enumerate from memory and miss the bulk of the available surface

The fix is a single discipline: **query the index before declining or improvising**.

## Mandatory Rules

### Rule 1: Query the Index Before Declining

Before saying "AIWG doesn't have a skill for that" or "no workflow exists for this," **you MUST query the artifact index**:

```bash
aiwg index discover "<the user's need, paraphrased>"
```

The index covers every deployed AIWG skill, agent, command, and rule — including the 90%+ that aren't loaded in your context. If `discover` returns ranked candidates, load and use the top match. If multiple are close, present the top-3 to the user.

**FORBIDDEN**:
```
User: "I need to deploy this to production"
Agent: "AIWG doesn't seem to have a deployment skill. Let me write a custom script..."
```

**REQUIRED**:
```
User: "I need to deploy this to production"
Agent: *runs `aiwg index discover "deploy production"`*
       *gets back flow-deploy-to-production at score 0.51*
       *uses that skill*
```

### Rule 2: Query the Index Before Improvising

Even when you can technically implement something from scratch, check first whether AIWG already has a curated skill for it. The curated skill encodes deliberate decisions (templates, gate criteria, multi-agent patterns, framework conventions) that an ad-hoc improvisation will miss.

**FORBIDDEN**:
```
Task: Generate a Software Architecture Document
Agent: *writes a SAD from scratch using its general training*
```

**REQUIRED**:
```
Task: Generate a Software Architecture Document
Agent: *runs `aiwg index discover "create SAD"`*
       *finds artifact-orchestration + the SDLC architecture-evolution flow*
       *invokes those, which apply the AIWG SAD template and multi-agent review pattern*
```

### Rule 3: Use the Quickrefs as a Filter, Not a Limit

The kernel quickrefs (`sdlc-quickref`, `forensics-quickref`, etc.) are *orientation* — they tell you what each framework is broadly for and list the high-traffic skills with one-liners. They are **not exhaustive**. When the user's need doesn't appear verbatim in a quickref, the right move is to query the index, not to assume the framework lacks a skill.

The quickrefs also explicitly say "don't enumerate from memory — query the index." Honor that.

### Rule 4: When to Skip the Query

You may proceed without querying the index when:

- The user named a specific skill or command (`/flow-deploy-to-production`, `aiwg use sdlc`)
- The capability is clearly outside AIWG's scope (e.g., "what's the weather", "translate to French", general programming questions unrelated to AIWG)
- You queried for the same need within the current session and the result is in working memory
- The kernel quickref directly lists the skill the user needs (in which case you've already done the lookup mentally)

### Rule 5: Surface the Top Match, Don't Hide the Search

When you query the index, mention to the user that you did. Naming the candidate skills (with a one-line capability summary) is more useful than silently picking one and proceeding. Examples:

```
"I'll use `flow-deploy-to-production` for this — it orchestrates production
deployment with strategy selection, validation, automated rollback, and
regression gates."
```

```
"The index returns three candidates for that need:
  - `intake-wizard`     — Generate or complete intake forms interactively
  - `intake-from-codebase` — Scan an existing codebase to scaffold intake
  - `intake-start`      — Validate intake forms and kick off Inception
Want me to use the wizard?"
```

This makes your reasoning auditable and gives the user a chance to redirect.

## Query Patterns

### By capability

```bash
aiwg index discover "create a security review"
aiwg index discover "audit the supply chain"
aiwg index discover "deploy to staging"
```

### By type filter

```bash
aiwg index discover "validate"        --type skill
aiwg index discover "review code"     --type agent
aiwg index discover "rule against X"  --type rule
```

### Token-tight output for in-context use

```bash
aiwg index discover "..." --json --limit 3
```

The JSON mode emits a stable schema (`path`, `type`, `score`, `triggers`, `capability`, `kernel`) that's compact enough to forward to a sub-agent or reason about programmatically.

## Detection Heuristics

You may be in violation of this rule if:

| Symptom | Likely Cause |
|---|---|
| You said "AIWG doesn't have a skill for that" without naming the search you ran | Skipped the index query |
| You wrote a custom workflow from scratch | Didn't check whether a curated skill exists |
| You enumerated skills from memory and missed obvious ones | Treated the kernel set as exhaustive |
| The user pointed at a skill you should have known about | Didn't query the index, or queried the wrong phrase |

## Recovery

If you catch yourself about to decline or improvise without having queried:

1. **STOP** before responding
2. **QUERY** the index with the user's need
3. **READ** the top results' capability descriptions
4. **CHOOSE** the best match (or report top-3 to the user) and proceed

It is always better to query late than not to query at all.

## Interaction with Existing Rules

This rule layers cleanly with the rest of aiwg-utils:

- **research-before-decision** — addresses *technical* research before acting. This rule extends the discipline to *AIWG itself*: research what AIWG can do before declining or improvising.
- **instruction-comprehension** — extracts the user's actual need. The phrase passed to `aiwg index discover` should reflect the parsed intent, not the user's verbatim words if those are ambiguous.
- **human-authorization** — never invoke a destructive skill (deploy, force-push, delete) without authorization, even when the index returns a match.
- **god-session** — the discover query is one focused step; if the result is a complex multi-skill flow, decompose normally rather than absorbing the whole flow into your current session.

## Platform Applicability

Universal. Every AIWG-supported provider has a skill-listing budget; the index-driven discovery model is the only sustainable approach across all of them. The `discover` subcommand works against the framework artifact index regardless of which provider deployed the skills.

## Checklist

Before declining a user request on the grounds that AIWG can't do it, verify:

- [ ] Did I run `aiwg index discover "<paraphrased need>"`?
- [ ] Did I check the right `--type` filter (skill, agent, command, rule)?
- [ ] Did I read the top result's `capability` description, not just its name?
- [ ] If multiple results were close, did I report them to the user?
- [ ] Have I confirmed the need is genuinely outside AIWG's scope?

If any answer is "no" — query before answering.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Companion rule on technical research
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Parse the user's need before querying
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md — Kernel utility quickref that surfaces this discipline
- Issue #1215 (this rule), parent epic #1212

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-09
