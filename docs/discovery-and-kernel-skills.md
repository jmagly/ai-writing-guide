# Discovery and Kernel Skills — Best Practices

> **Version**: 2026.5.0+
> **Status**: Active — landed across all 10 supported providers
> **Reference**: epic [#1212](https://git.integrolabs.net/roctinam/aiwg/issues/1212), [`skill-discovery`](../agentic/code/addons/aiwg-utils/rules/skill-discovery.md) rule (HIGH)

## What changed and why

AIWG ships hundreds of skills across its installed frameworks. Agentic platforms (Claude Code, OpenClaw, Cursor, Codex, Factory, etc.) cap how many skills they will list in any given context — Claude Code at 25% of context window by default, OpenClaw at 150 hard, others on similar trajectories. The historical "deploy everything to the platform-native skills directory" pattern doesn't scale through these caps.

Starting in 2026.5.0, AIWG splits its skill surface into two tiers per provider:

- **Kernel skills** — always-loaded, deployed to the platform-native skills directory (`.claude/skills/`, `.factory/skills/`, etc.). Today: one `<framework>-quickref` per installed framework + `aiwg-utils-quickref`. ~9 skills total.
- **Standard skills** — sequestered under `<provider-dir>/.aiwg/skills/`. Hidden from the platform's flat skill listing. Reachable through `aiwg discover`.

This document is the operator's guide to using the new model effectively.

## TL;DR

```bash
aiwg discover "<the user's need, paraphrased>" --limit 3
```

Run that first. Surface the top match (or top-3) to the user. Skip discovery only when the user named a specific skill, when the capability is clearly outside AIWG's scope, or when you ran the same query in this session.

## The rule that enforces this: `skill-discovery` (HIGH)

The aiwg-utils addon ships a HIGH-enforcement rule named `skill-discovery` that mandates the discovery query before declining a user request as "AIWG can't do that" or improvising a custom workflow when an AIWG skill might already exist. Full text: `agentic/code/addons/aiwg-utils/rules/skill-discovery.md`.

The rule lives next to `research-before-decision` (technical research) and `instruction-comprehension` (parsing the actual need). The three layer cleanly:

1. **`instruction-comprehension`** — parse what the user actually wants
2. **`skill-discovery`** — query the index for what AIWG already provides
3. **`research-before-decision`** — research the technical implementation if no skill matches

## Lead with discovery, not memory

Your kernel set is ~9 skills. AIWG's installed surface today is ~400. The math forces a discipline: query before answering.

### When to query

Always query when:
- The user describes a capability ("I want to...", "help me...", "can you...")
- Your kernel quickrefs don't list a direct match
- A previous attempt failed and you don't know which skill should handle it

### When to skip the query

Skip when:
- The user named a specific skill or command (`/flow-deploy-to-production`, `aiwg use sdlc`)
- The capability is clearly outside AIWG's scope (general programming questions unrelated to AIWG, weather queries, etc.)
- You queried for the same need within the current session and the result is in working memory
- The kernel quickref directly lists the skill — you've already done the lookup mentally

## Patterns that work

### 1. Capability lookup with the user's own words

```bash
aiwg discover "deploy to production"
aiwg discover "audit our security"
aiwg discover "create an architecture decision record"
aiwg discover "scan this codebase to bootstrap an SDLC project"
```

Don't translate to AIWG vocabulary first — discovery is tuned for natural-language phrasing. The scorer looks at trigger phrases (declared in each skill's `## Triggers` section), capability descriptions, titles, tags, summary, and path, weighted in that order.

### 2. Type-narrowing for tighter results

```bash
aiwg discover "review code"          --type agent     # who handles code review
aiwg discover "deploy to production" --type skill     # the workflow
aiwg discover "no unauthenticated"   --type rule      # which rule enforces it
```

The default `--type` is `skill,agent,command,rule`. Narrowing helps when you specifically want one kind.

### 3. JSON for sub-agent consumption

```bash
aiwg discover "deploy production" --json --limit 3
```

JSON output emits a stable schema:

```json
{
  "query": { "phrase": "deploy production", "types": ["skill","agent","command","rule"], "limit": 3 },
  "results": [
    {
      "path": "agentic/code/frameworks/sdlc-complete/skills/flow-deploy-to-production/SKILL.md",
      "type": "skill",
      "title": "flow-deploy-to-production",
      "score": 0.51,
      "triggers": ["deploy to production", "ship it"],
      "capability": "Orchestrate production deployment with strategy selection...",
      "kernel": false
    }
  ],
  "total": 1,
  "query_time_ms": 16
}
```

Compact enough to forward to a subagent without context-bloat.

### 4. Surface candidates to the user

When the top match is clear, name it:

> "I'll use `flow-deploy-to-production` for this — it orchestrates production deployment with strategy selection, validation, automated rollback, and regression gates."

When several are close, present them:

> "The index returns three candidates for that need:
> - `intake-wizard` — Generate or complete intake forms interactively
> - `intake-from-codebase` — Scan an existing codebase to scaffold intake
> - `intake-start` — Validate intake forms and kick off Inception
>
> Want me to use the wizard?"

This keeps your reasoning auditable and gives the user a chance to redirect.

## Anti-patterns

### "AIWG can't do that"

Without having queried first, this answer is likely wrong. The kernel set is intentionally tiny — most of AIWG's surface is invisible from a flat directory scan.

> ❌ "AIWG doesn't seem to have a deployment skill. Let me write a custom script..."
>
> ✅ *runs `aiwg discover "deploy production"`* → finds `flow-deploy-to-production`

### Enumerating from memory

The kernel quickrefs (`sdlc-quickref`, `forensics-quickref`, etc.) are pointer-heavy by design. Each one lists ~15–25 high-traffic skills. The framework's actual skill count is often 2–3× that. Enumerating from a quickref is enumerating from a curated subset — not the full surface.

> ❌ "The SDLC framework has these skills: [lists from sdlc-quickref's table]. Anything not in this list, AIWG can't do."
>
> ✅ "The SDLC framework's high-traffic skills are listed in `sdlc-quickref` — for `<specific need>`, let me check the index."

### Improvising when a curated skill exists

The curated skill encodes deliberate decisions — templates, gate criteria, multi-agent patterns, framework conventions. An ad-hoc improvisation will miss those.

> ❌ User asks for a Software Architecture Document → agent writes one from scratch
>
> ✅ User asks for a SAD → agent runs `aiwg discover "create SAD"` → finds `artifact-orchestration` + the SDLC architecture-evolution flow → invokes those, which apply the AIWG SAD template and multi-agent review pattern

### Skipping the query because "it's obvious"

If it's truly obvious from the kernel quickref, fine. If you're going from memory of skills you saw months ago, query — your memory is stale, the index is fresh.

## Mental model: index as runtime discovery, kernel as orientation

Think of the kernel set the way you think of a Linux kernel: it's the always-resident core that knows how to load everything else on demand. The kernel quickrefs orient you to each framework's purpose and most-reached-for skills. The index is the lookup table for everything past that point.

`aiwg use` rebuilds the framework artifact index post-deploy as a best-effort step, so discovery queries always see the current installed surface — you don't need to manually `aiwg index build` between deploys.

## Per-provider deployment paths

The kernel + standard split applies uniformly across all 10 supported providers. Files marked `kernel: true` route to the platform-native dir; everything else routes to the `.aiwg/` namespace.

| Provider | Kernel skills | Standard skills |
|---|---|---|
| Claude Code | `.claude/skills/` | `.claude/.aiwg/skills/` |
| Cursor | `.cursor/skills/` | `.cursor/.aiwg/skills/` |
| Factory AI | `.factory/skills/` | `.factory/.aiwg/skills/` |
| GitHub Copilot | `.github/skills/` | `.github/.aiwg/skills/` |
| OpenCode | `.opencode/skill/` | `.opencode/.aiwg/skill/` |
| Warp | `.warp/skills/` | `.warp/.aiwg/skills/` |
| Windsurf | `.windsurf/skills/` | `.windsurf/.aiwg/skills/` |
| OpenClaw | `~/.openclaw/skills/aiwg/` | `~/.openclaw/.aiwg/skills/` |
| Hermes | `~/.hermes/skills/` | `~/.hermes/.aiwg/skills/` |
| Codex | `.codex/skills/` | `.codex/.aiwg/skills/` |

## Recovery when you catch yourself improvising

If you notice you're about to decline or write a custom workflow without having queried:

1. **Stop** before responding
2. **Query** the index with the user's need
3. **Read** the top results' capability descriptions
4. **Choose** the best match (or report top-3) and proceed

It is always better to query late than not to query at all.

## Adding a kernel skill

When authoring a new skill that should be always-loaded (rare — the kernel set should stay small), opt in via SKILL.md frontmatter:

```yaml
---
name: my-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: ...
---
```

Then deploy with `aiwg use <framework>`. The provider's `deploySkills` partitions by `kernel: true` and routes to the platform-native dir.

The bar for kernel-tier skills is high: it should be content that *every session must see immediately*, not content that the agent could find via discovery. Today's kernel set is exactly framework directories — adding more dilutes the orientation function.

## Backward compatibility

`aiwg index discover` still works (same dispatch path). The top-level `aiwg discover` is the canonical surface; the index-namespaced form is preserved so older skill bodies and external references don't break.

## References

- CLI reference [Discovery section](cli-reference.md#discovery) — full command reference
- [`skill-discovery`](../agentic/code/addons/aiwg-utils/rules/skill-discovery.md) — HIGH-enforcement framing rule
- Epic [#1212](https://git.integrolabs.net/roctinam/aiwg/issues/1212) — index-driven skill discovery
- [`aiwg-utils-quickref`](../agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md) — kernel utility quickref that surfaces this discipline
- [Architecture audit](../.aiwg/architecture/audit-index-subsystem-2026-05.md) — index subsystem audit that produced the 450-LOC implementation path
- [Provider landscape research](../.aiwg/research/findings/skill-budget-landscape-2026-05.md) — survey of skill-budget caps across the 10 supported providers
