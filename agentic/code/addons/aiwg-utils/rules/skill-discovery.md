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

### Rule 0: Recognize Directive Boundaries Before Acting

The other rules in this file fire when a directive arrives. They only work if you *recognize* the arrival. Each user turn must be classified before you act on it:

- **Continuation** — extends or refines the work already in flight (e.g. "and also fix the test", "use Postgres instead", "what's the status?"). Stay in the existing context.
- **New directive** — introduces a fresh task, often with its own scope (e.g. "address-issues #1230 #1231", "now do a security review", "let's write the release notes"). Reset to discovery mode: identify the task, search for a relevant skill, then proceed.

Failing to draw this line is how agents miss obvious skill invocations. The most common failure modes:

| Symptom | Likely cause |
|---|---|
| User pastes a directive that names a skill (e.g. "address-issues …") and the agent reads it as commentary | Treated a new directive as continuation context |
| User clears the session with `/clear`, then sends a directive in the next turn — agent treats it as residual session state | Did not classify the post-clear input as a fresh directive |
| User issues a clear command and the agent does adjacent housekeeping instead of the named action | Did not identify the directive; defaulted to the previous flow |
| Agent has a relevant skill in the index but writes a workflow from scratch | Skipped the discovery query because the directive wasn't recognized as new |

#### When to apply

Run the classification at every turn boundary, not just session start. Specifically:

1. **Session start** — the first user message after the system prompt is always a new directive.
2. **After `/clear`** — the runtime erases conversation history; the next user message is a new directive even if the wording sounds like a continuation.
3. **At each user message** — re-classify. A user can pivot mid-session ("ok now switch to the deploy task"); you don't get to ride the previous task's framing forward.
4. **After tool output** — if the user follows tool output with a fresh imperative, that's a new directive.

#### Required action on a new directive

When the classification result is "new directive":

1. **Name the task** internally (one short phrase: "address three issues", "run security review", "compute test coverage").
2. **Search the artifact index** with that phrase via `aiwg discover` (see Rules 1–2). This is non-optional — the search runs even if you think you already know which skill to use, because the index is authoritative for what's deployed.
3. **Fetch the chosen skill** with `aiwg show <type> <name>` (Rule 5).
4. **Then act**, following the skill's instructions.

Skipping any of steps 1–3 is the failure mode this rule exists to prevent.

#### When classification is genuinely ambiguous

If the input could plausibly be either a continuation or a new directive — for example, the user says "and also" but introduces a new domain — ask one question rather than guessing. A single clarifying question is cheaper than executing the wrong task.

#### Recovery when this rule was violated

If you notice mid-session that you treated a new directive as continuation:

1. Stop the in-flight work
2. Acknowledge the misclassification explicitly to the user
3. Run `aiwg discover` against the actual directive
4. Resume from the correct skill

The user will accept "I missed that this was a new directive — let me restart from the right skill" far more readily than a stale completion of the wrong task.

### Rule 1: Query the Index Before Declining

Before saying "AIWG doesn't have a skill for that" or "no workflow exists for this," **you MUST query the artifact index**:

```bash
aiwg discover "<the user's need, paraphrased>"
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
Agent: *runs `aiwg discover "deploy production"`*
       *gets back flow-deploy-to-production at score 0.51*
       *uses that skill*
```

### Rule 1.5: Query Discover BEFORE Filesystem Search (the discover-first protocol)

For any user request mentioning **AIWG**, framework names (**sdlc, research, forensics, ops, security-engineering, knowledge-base, marketing, media-curator, knowledge-base**), or capability keywords (**skill, agent, rule, command, addon, workflow, flow, template**), `aiwg discover` MUST be the first information-gathering tool call.

Filesystem `Grep` / `Glob` / `Read` against any of the following directories is **FORBIDDEN** for AIWG-related lookups until `aiwg discover` has been consulted at least once in the current session:

- `.claude/` (Claude Code)
- `.codex/`, `~/.codex/` (OpenAI Codex)
- `.github/agents/`, `.github/skills/`, `.github/instructions/`, `.github/prompts/` (Copilot)
- `.cursor/` (Cursor)
- `.warp/`, `WARP.md` (Warp)
- `.windsurf/`, `AGENTS.md` (Windsurf)
- `.factory/` (Factory)
- `.opencode/` (OpenCode)
- `.hermes.md`, `~/.hermes/skills/` (Hermes)
- `~/.openclaw/` (OpenClaw)
- `agentic/code/` (AIWG framework source, when working inside the AIWG repo itself)

This rule exists because the failure mode it prevents is the most common one users report: an agent has fast filesystem tools and a literal-string hit on an AIWG keyword, so it short-circuits to grep and never realizes `aiwg discover` would have given a ranked, context-rich answer covering 10x more surface area.

**FORBIDDEN — filesystem-first for AIWG-keyword query**:

```
User: "tell me about AIWG's RLM agent"
Agent: *runs `grep -r "rlm" .factory/`*  ← FORBIDDEN as first move
       *hits rlm-agent.md by literal string match*
       *answers from that one file*
       Skipped: 8 other RLM-related skills, rules, and templates that
       `aiwg discover "rlm"` would have surfaced.
```

**REQUIRED — discover-first for AIWG-keyword query**:

```
User: "tell me about AIWG's RLM agent"
Agent: *runs `aiwg discover "rlm agent"`*
       *gets back rlm-agent (agent), rlm-context-management (rule),
        rlm-quickref (skill), and 6 others ranked by relevance*
       *picks the best match (or top-3) and uses `aiwg show <type> <name>`*
       *answers from the ranked set, not from whatever grep hit first*
```

#### When subagent delegation is available, prefer `aiwg-finder`

When the platform supports spawning subagents (Claude Code's Task tool, Hermes's `delegate_task`, etc.), dispatching to the `aiwg-finder` agent is preferred over self-service `aiwg discover` + `aiwg show` in the parent context. The finder agent:

- Runs the discover query in its own context (parent context stays clean).
- Returns the selected artifact body plus a one-paragraph capability summary.
- Costs ~200 parent tokens vs. ~3,000-8,000 for the full discover+show transcript inline.

Pattern (Claude Code, but symmetric on other subagent-capable platforms):

```
Task(subagent_type="aiwg-finder", prompt="find the skill or agent for: <user's intent>")
```

#### When you may skip the discover query (same as Rule 4 below — kept here for proximity)

You may skip the index query when:
- The user named a specific skill or command (`/flow-deploy-to-production`, `aiwg use sdlc`).
- The capability is clearly outside AIWG's scope (general programming, weather, translation).
- You've already queried for the same need within the current session.
- The kernel quickref directly lists the skill the user needs.

In every other case, **discover first**.

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
Agent: *runs `aiwg discover "create SAD"`*
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

### Rule 5: Discover → Show Is the Canonical Access Pattern

**Discovery alone isn't enough.** When `aiwg discover` returns a path, the next step to read the skill body is `aiwg show <type> <name>` — never `find`, `ls`, `Glob`, `Grep`, or `Read` on the discovered path.

The two-step pattern:

```bash
aiwg discover "deploy to production"        # → returns ranked candidates with paths
aiwg show skill flow-deploy-to-production   # → streams the SKILL.md body
```

`discover` is the lookup. `show` is the fetch. They are designed to compose. The agent should never need to navigate AIWG's storage layout — that's the whole point of having both commands.

**FORBIDDEN — filesystem-browsing after discover returned a path**:

```
Agent: *runs `aiwg discover "intake wizard"` → gets path/to/intake-wizard/SKILL.md*
Agent: *runs `find . -name "intake-wizard" -type d`*    ← antipattern
Agent: *runs `ls .claude/skills/`*                       ← antipattern
Agent: *Reads the path directly with the Read tool*      ← antipattern (skip the show command)
```

**REQUIRED**:

```
Agent: *runs `aiwg discover "intake wizard"` → gets path*
Agent: *runs `aiwg show skill intake-wizard`*           ← correct fetch
```

### Rule 6: Failure-Mode Guidance — When Skill Invocation Errors

If your platform's native Skill tool rejects a skill name (because it's not in the kernel listing — most AIWG skills aren't), **do NOT fall back to filesystem browsing**. The fallback hierarchy is:

1. **Primary**: `aiwg show <type> <name>` — fetches the body via the indexed location, regardless of where the file lives on disk
2. **Secondary**: `aiwg show skill <name> --json` — same fetch with explicit path + content envelope, useful when you need to forward to a sub-agent
3. **Last resort (only if `aiwg` CLI itself is unavailable)**: read directly from the AIWG install corpus at `$AIWG_ROOT/agentic/code/frameworks/<framework>/skills/<name>/SKILL.md` or `$AIWG_ROOT/agentic/code/addons/<addon>/skills/<name>/SKILL.md`. The corpus is the canonical source of truth and is always present at the install root. `aiwg discover --json` returns absolute paths anchored to `$AIWG_ROOT` for exactly this reason.

The corpus path is the authoritative source. **`find`, `ls`, and `Glob` against `<provider>/skills/` directories are never correct** — those reflect the kernel pivot's deploy state (only kernel skills mirror there), not the full surface.

**FORBIDDEN — natural-but-wrong fallback when Skill tool errors**:

```
Skill tool: aiwg:intake-wizard not found
Agent: *runs `find . -name "intake-wizard"`*           ← wrong
Agent: *runs `ls .claude/skills/`*                      ← wrong
Agent: *runs `grep -r "intake-wizard" agentic/`*        ← wrong
```

**REQUIRED**:

```
Skill tool: aiwg:intake-wizard not found
Agent: *runs `aiwg show skill intake-wizard`*          ← primary fallback
       (or `cat $AIWG_ROOT/agentic/code/.../intake-wizard/SKILL.md` only if `aiwg` is broken)
```

### Rule 7: Surface the Top Match, Don't Hide the Search

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
aiwg discover "create a security review"
aiwg discover "audit the supply chain"
aiwg discover "deploy to staging"
```

### By type filter

```bash
aiwg discover "validate"        --type skill
aiwg discover "review code"     --type agent
aiwg discover "rule against X"  --type rule
```

### Token-tight output for in-context use

```bash
aiwg discover "..." --json --limit 3
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
| You ran `find` / `ls` / `Glob` against a `<provider>/skills/` directory | Filesystem-browsing antipattern after the kernel pivot — use `aiwg show` |
| You read a SKILL.md path directly with the Read tool after `discover` returned the path | Skipped the `show` step; closes the loop incorrectly |
| The platform Skill tool errored and your next action wasn't `aiwg show` | Failure-mode guidance violated |

## Recovery

### Path A — never queried in the first place

If you catch yourself about to decline or improvise without having queried:

1. **STOP** before responding
2. **QUERY** the index: `aiwg discover "<the user's need>"`
3. **READ** the top results' capability descriptions
4. **FETCH** the chosen skill's body: `aiwg show <type> <name>`
5. **APPLY** the skill

### Path B — discover succeeded but you went to the filesystem

If you queried, got a path, then started running `find` / `ls` / `Read` on the path:

1. **STOP** the filesystem operation
2. **FETCH** the body via `aiwg show <type> <name>` instead
3. The path returned by `discover` is anchored to `$AIWG_ROOT`; you don't need to find the file — just call `show`

### Path C — the platform Skill tool errored on a non-kernel skill

This is expected. Most AIWG skills aren't in the kernel listing. The platform's Skill tool can only invoke kernel-listed skills directly.

1. Take the skill name (and its type, from `discover`)
2. Run `aiwg show <type> <name>` — that returns the body
3. Apply the skill's instructions yourself (the body is a system-prompt-style instruction set; follow it)

### Path D — `aiwg` CLI itself is broken

Only as a last resort:

1. Read the corpus directly at `$AIWG_ROOT/agentic/code/frameworks/<framework>/skills/<name>/SKILL.md` or `$AIWG_ROOT/agentic/code/addons/<addon>/skills/<name>/SKILL.md`
2. After resolving, fix the CLI: run `aiwg-doctor` (always-loaded kernel skill) to diagnose, then `aiwg-refresh` to repair
3. The 6 self-maintenance kernel skills (`steward`, `aiwg-doctor`, `aiwg-refresh`, `aiwg-status`, `aiwg-help`, `use`) exist precisely for this case — they're always loaded so they're available even when discovery is broken

It is always better to query late than not to query at all.

## Interaction with Existing Rules

This rule layers cleanly with the rest of aiwg-utils:

- **research-before-decision** — addresses *technical* research before acting. This rule extends the discipline to *AIWG itself*: research what AIWG can do before declining or improvising. **For AIWG-internal content, "research" specifically means `aiwg discover` + `aiwg show`, NOT `Read` / `Glob` / `Grep` against AIWG storage paths.** The filesystem is the wrong tool for AIWG-internal lookups; the CLI is the right one.
- **instruction-comprehension** — extracts the user's actual need. The phrase passed to `aiwg discover` should reflect the parsed intent, not the user's verbatim words if those are ambiguous.
- **human-authorization** — never invoke a destructive skill (deploy, force-push, delete) without authorization, even when the index returns a match.
- **god-session** — the discover query is one focused step; if the result is a complex multi-skill flow, decompose normally rather than absorbing the whole flow into your current session.

## Platform Applicability

Universal. Every AIWG-supported provider has a skill-listing budget; the index-driven discovery model is the only sustainable approach across all of them. The `discover` subcommand works against the framework artifact index regardless of which provider deployed the skills.

## Checklist

Before declining a user request on the grounds that AIWG can't do it, verify:

- [ ] Did I run `aiwg discover "<paraphrased need>"`?
- [ ] Did I check the right `--type` filter (skill, agent, command, rule)?
- [ ] Did I read the top result's `capability` description, not just its name?
- [ ] If multiple results were close, did I report them to the user?
- [ ] Have I confirmed the need is genuinely outside AIWG's scope?

If any answer is "no" — query before answering.

After `aiwg discover` returns a match, before reading anything from disk, verify:

- [ ] Did I use `aiwg show <type> <name>` to fetch the body?
- [ ] If the platform Skill tool errored, did I fall back to `aiwg show` (not `find` / `ls` / `Read`)?
- [ ] If `aiwg show` is somehow unavailable, am I reading from `$AIWG_ROOT/agentic/code/...` (the canonical corpus), not from a `<provider>/skills/` deploy mirror?

If any answer is "no" — you're navigating the filesystem when you should be using the CLI. Stop and run `aiwg show`.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Companion rule on technical research
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Parse the user's need before querying
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md — Kernel utility quickref that surfaces this discipline
- Issue #1215 (this rule), parent epic #1212

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-09
