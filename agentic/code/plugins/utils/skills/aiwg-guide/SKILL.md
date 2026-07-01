---
namespace: aiwg
name: aiwg-guide
description: Contextual AIWG help — explains current version features, answers how-to questions, routes live queries to the steward
platforms: [claude-code, codex, opencode, warp, cursor, windsurf, copilot, factory, openclaw, hermes]

---

# aiwg-guide

You provide contextual AIWG help. Default mode reads the release announcement for the currently installed version and explains what's new in plain language. Given a topic or question, you answer from prioritized documentation sources. You route live-state queries to the steward.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "what's new" / "what changed" → default what's-new mode
- "how do I [action]" → contextual help from docs
- "explain [feature]" → feature explanation from docs
- "what is [aiwg-concept]" → concept lookup from docs
- "help with aiwg" → general help
- "aiwg guide" → explicit invocation
- "what does [command] do" → CLI reference lookup
- "what providers support [feature]" → capability matrix lookup via steward

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| No arguments | "aiwg guide" | Default: read release announcement for installed version |
| What's new | "what's new in AIWG" | Read `docs/releases/v{version}-announcement.md` |
| How-to | "how do I deploy to copilot" | Search docs in priority order |
| What-is | "what is a soul file" | Concept lookup from extension/addon docs |
| Command help | "what does aiwg refresh do" | Search `docs/cli-reference.md` |
| Provider query | "does cursor support MCP" | Read capability matrix |
| Status query | "is AIWG healthy" | Steward handoff → `aiwg doctor` |
| Version query | "what version of AIWG" | Steward handoff → `aiwg version` |

## Behavior

When triggered:

1. **Classify the request** into one of three modes:
   - **Default (what's new)**: No arguments, or "what's new" / "what changed"
   - **Contextual help**: A topic or question about AIWG features
   - **Steward handoff**: A question requiring live system state

2. **Default mode** (no arguments or "what's new"):

   a. Read the installed version:
   ```bash
   aiwg version
   ```

   b. Locate the release announcement:
   ```bash
   # Primary: exact version match
   docs/releases/v{version}-announcement.md

   # Fallback: latest announcement in docs/releases/
   ls -t docs/releases/v*-announcement.md | head -1
   ```

   c. Read and summarize in conversational tone — lead with the most impactful changes, group by theme, mention specific commands the user can try. Offer to go deeper on any feature.

   d. If no announcement file exists, fall back to `CHANGELOG.md` for the version section, then `docs/cli-reference.md`. Note the fallback: "No release announcement found for v{version}. Here's what I can tell from the changelog..."

3. **Contextual help mode** (topic or question given):

   Search documentation sources in this priority order:

   | Priority | Source | Best For |
   |----------|--------|----------|
   | 1 | `docs/releases/v{version}-announcement.md` | What's new, recent changes |
   | 2 | `docs/cli-reference.md` | Command usage, syntax, examples |
   | 3 | `docs/extensions/` | Extension system, creating extensions |
   | 4 | Framework READMEs (`agentic/code/frameworks/*/README.md`) | Framework capabilities, setup |
   | 5 | `agentic/code/providers/capability-matrix.yaml` | Provider features, platform support |
   | 6 | `CLAUDE.md` and `AIWG.md` | Quick-start, overview, project structure |
   | 7 | Addon READMEs (`agentic/code/addons/*/README.md`) | Addon features, voice profiles |

   Strategy: keyword-grep across sources, extract the relevant section (not the whole file), synthesize from multiple sources if needed, cite where the information came from.

4. **Steward handoff** (live system state needed):

   Some questions require live state rather than docs. Detect and delegate:

   | Question Type | Detection Pattern | Handler |
   |--------------|-------------------|---------|
   | Installation status | "what's installed", "what frameworks" | `aiwg list` |
   | Health check | "is everything healthy", "any issues" | `aiwg doctor` |
   | Version info | "what version am I on" | `aiwg version` |
   | Deployment state | "what's deployed to [provider]" | `aiwg status` |

   Run the CLI command via Bash, weave the output into a natural language response, and note the information comes from live system state. The handoff is transparent to the user.

5. **If the user's intent is ambiguous**, ask a clarifying question:
   - "Are you asking about [feature] in general, or how it's configured in your project?"
   - "Would you like the documentation explanation, or should I check your live installation?"

## Examples

### Example 1: Default mode — what's new

**User**: "what's new"

**Extraction**: No specific topic — default what's-new mode

**Action**:
```bash
aiwg version
# → 2026.3.3
cat docs/releases/v2026.3.3-announcement.md
```

**Response**: "Version 2026.3.3 brings three things worth knowing about: skills-first deployment, a revised config system, and improvements to the ops subsystem. The biggest change is skills-first — skills are now the primary artifact type across all providers, which means `aiwg use sdlc` now deploys skills before commands. Want me to walk through any of these in detail?"

### Example 2: Contextual help — how-to question

**User**: "how do I schedule a task"

**Extraction**: Topic = "schedule a task", contextual help mode

**Action**:
```bash
grep -n "schedule" docs/cli-reference.md
# Read the schedule command section
```

**Response**: "You can schedule recurring tasks with the `/schedule` skill or `aiwg ralph-external` for one-off loops. The schedule skill supports cron expressions — see `docs/cli-reference.md` for full syntax."

### Example 3: Provider query

**User**: "what providers support agent teams"

**Extraction**: Topic = "agent teams" + "providers", capability matrix lookup

**Action**:
```bash
cat agentic/code/providers/capability-matrix.yaml
# Filter for agent_teams feature
```

**Response**: "Agent teams are natively supported by Claude Code and Codex. Other providers emulate them through AIWG's multi-agent orchestration. See the capability matrix for the full breakdown."

### Example 4: Steward handoff — health check

**User**: "is AIWG healthy"

**Extraction**: Live system state needed — steward handoff

**Action**:
```bash
aiwg doctor
```

**Response**: "I just ran `aiwg doctor`. All checks pass: CLI version 2026.3.3, 3 frameworks deployed (sdlc, marketing, media-curator), node_modules installed, no stale deployments detected."

## References

- @$AIWG_ROOT/docs/releases/ — Release announcements (primary data source for default mode)
- @$AIWG_ROOT/docs/cli-reference.md — Command reference
- @$AIWG_ROOT/docs/extensions/overview.md — Extension system
- @$AIWG_ROOT/agentic/code/providers/capability-matrix.yaml — Provider features
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/agents/aiwg-steward.md — Steward agent (handoff target)
