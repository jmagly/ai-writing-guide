## Discover-First Protocol (CRITICAL)

### Classify each turn FIRST: new directive vs continuation

Before responding to any user message, classify it:

- **New directive** — a fresh task, often pasted as data: an `address-issues` tracker table, an issue list, a command name, a flow name, "now do X". This is the common first-turn case.
- **Continuation** — extends work already in flight.

When a message **names or references an AIWG command/capability** — even if it looks like informational content (a tracker table, an issue list, a flow name) — treat it as a **new directive** and ACT: run `aiwg discover`, fetch with `aiwg show`, and invoke the capability. Do **NOT** ask "what would you like me to do with these?" when the action is implied by the content. A pasted `address-issues #1234 #1235` table means *run the address-issues workflow on those issues* — discover it and do it, don't ask.

Ask a clarifying question only when the directive is genuinely ambiguous (could be two different tasks) — never as a reflex to avoid acting.

### Before declining or improvising

Beyond the new-directive case, you MUST also consult AIWG's artifact index before declining a request as "outside AIWG's scope" or improvising a workflow from training data.

AIWG ships ~400 skills, ~190 agents, ~70 commands, and ~60 rules across its installed frameworks. Most are NOT loaded into your context — they live at the install location and reach you via two CLI commands:

```bash
aiwg discover "<paraphrased user need>"
aiwg show <type> <name>          # e.g. aiwg show skill flow-deploy-to-production
```

### When to run discover

You MUST run `aiwg discover` when any of the following is true:

- A new directive **names or references an AIWG command/capability** (e.g. an `address-issues` tracker, an `issue-audit` request, a `flow-*` name) — discover it and act, even when it arrives as a pasted table or list
- You are about to tell the user "AIWG doesn't have a way to do that"
- You are about to write a custom workflow / script / procedure from scratch
- The user's request mentions AIWG, a framework name (sdlc, research, forensics, ops, security-engineering, marketing, media-curator, knowledge-base), or capability keywords (skill, agent, command, rule, workflow, flow, template, addon)
- You are uncertain whether a curated AIWG artifact already addresses the request

**Deployed commands are discoverable.** Commands AIWG deploys to your provider's command directory (`.opencode/command/*.md`, `.claude/commands/*.md`, `~/.codex/prompts/*.md`, …) are indexed: `aiwg discover "<name>"` returns them and `aiwg show command <name>` fetches the body. If a deployed command isn't surfacing, the framework capability index may be unbuilt — `aiwg discover` rebuilds it from `$AIWG_ROOT` automatically (a stale "no matches" is a bug, not a signal that the command is absent).

### If discovery or deployed files look stale

Treat stale discovery results, missing managed provider files, duplicate
provider files, or broken bootstrap context as an AIWG setup issue. Route through
the steward first:

```bash
aiwg discover "steward repair AIWG setup" --type skill
aiwg show skill steward
aiwg status --probe --json
aiwg doctor
aiwg refresh --dry-run
```

Then apply the narrowest repair: `aiwg refresh`, `aiwg use all --provider
<provider>`, `aiwg regenerate`, or an index rebuild/sync followed by the
original `aiwg discover "<need>"` query. Reload the provider session after
provider-facing files change.

You MAY skip discover only when:

- The user named a specific skill/command (e.g. `/flow-deploy-to-production`)
- The capability is clearly outside AIWG's scope (weather, translation, unrelated programming)
- You already ran `aiwg discover` for the same need this session
- A loaded quickref directly names the skill the user needs

### Discover-first, NOT filesystem-first

When the user's request mentions an AIWG keyword, `aiwg discover` is your FIRST tool call — not `Grep` / `Glob` / `Read` against provider directories like `.claude/`, `.codex/`, `.factory/`, `.warp/`, `.windsurf/`, `~/.openclaw/`, or `~/.hermes/`.

Filesystem search against those paths is FORBIDDEN as a first move for AIWG-internal lookups. The reason: the discover index covers 10x the surface area that any single provider directory holds, and gives you ranked results with capability summaries. Grep gives you a literal-string hit and stops.

### After discover returns a match

Use `aiwg show <type> <name>` to fetch the body — never `Read` on the returned path, never `find` / `ls` against the corpus directory. The CLI handles the read; you handle the application.

### Why this matters

Most AIWG skills are not in your context by design — that's how the kernel-skill model keeps your context lean while making the full corpus reachable. Enumerating from memory will miss obvious matches. The cost of running `aiwg discover` is one CLI invocation; the cost of skipping it is recommending a workflow AIWG already has, or declining a request AIWG can already serve.

The full discover-first rule (with detection heuristics, recovery procedure, and integration with other rules) is deployed at the framework's rules path as `skill-discovery.md`. Read it once at session start if you have not already.
