## Discover-First Protocol (CRITICAL)

Before declining a user request as "outside AIWG's scope" or improvising a workflow from training data, you MUST consult AIWG's artifact index.

AIWG ships ~400 skills, ~190 agents, ~70 commands, and ~60 rules across its installed frameworks. Most are NOT loaded into your context — they live at the install location and reach you via two CLI commands:

```bash
aiwg discover "<paraphrased user need>"
aiwg show <type> <name>          # e.g. aiwg show skill flow-deploy-to-production
```

### When to run discover

You MUST run `aiwg discover` when any of the following is true:

- You are about to tell the user "AIWG doesn't have a way to do that"
- You are about to write a custom workflow / script / procedure from scratch
- The user's request mentions AIWG, a framework name (sdlc, research, forensics, ops, security-engineering, marketing, media-curator, knowledge-base), or capability keywords (skill, agent, command, rule, workflow, flow, template, addon)
- You are uncertain whether a curated AIWG artifact already addresses the request

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
