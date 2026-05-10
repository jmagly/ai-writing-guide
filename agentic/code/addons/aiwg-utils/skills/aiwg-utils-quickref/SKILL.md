---
name: aiwg-utils-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: AUTO-INVOKE for ANY AIWG capability question, framework/addon/extension query, steward routing, MCP profile, or when unsure where to start. ALWAYS consult before filesystem search on .claude/.factory/.codex/.warp/etc. AIWG core utilities quick reference — always-on framing, steward, index, meta operations.
---

# AIWG Core Utilities — Quick Reference

This is your always-loaded core directory for AIWG. It does **not** list every utility skill. Instead, it teaches the cross-cutting domains and gives you **curated search phrases** that map to `aiwg discover` lookups, plus a list of which framework-specific quickrefs are loaded.

## How to use this quickref

1. Identify the **capability domain** the user's need belongs to
2. Pick a **curated phrase** from that domain (or paraphrase the user's words)
3. Run `aiwg discover "<phrase>"` and surface the top match to the user
4. Fetch the matched skill body with `aiwg show <type> <name>` — never `find` / `ls` / `Read`

**Do not enumerate skills from memory.** AIWG ships hundreds of skills; you only see the kernel set in your context.

## The canonical pipeline: `discover → show`

Most AIWG skills (~385 of 400) are **not in your context** and are not in `<provider>/skills/` either — they stay at `$AIWG_ROOT` (no per-project copy by default, #1217). Two commands close the loop:

```bash
# 1. Find — returns ranked candidates with absolute paths
aiwg discover "<the user's need, paraphrased>"

# 2. Fetch — streams the SKILL.md body for the chosen candidate
aiwg show skill <name>          # or: agent | command | rule
```

`discover` and `show` are designed to compose. **You should never need to navigate the filesystem to read AIWG content.** That's the whole point of the CLI.

### When the platform Skill tool errors

Most AIWG skills aren't kernel-listed, so the platform's Skill tool will reject them. This is expected behavior, not a bug. The fallback hierarchy:

1. **`aiwg show <type> <name>`** — primary fetch. Always works regardless of kernel status.
2. **`aiwg show <type> <name> --json`** — same fetch with `{ path, content }` envelope, useful for forwarding to a sub-agent.
3. **Read directly from `$AIWG_ROOT/agentic/code/`** — last-resort fallback. Only if the `aiwg` CLI itself is broken. The corpus at `$AIWG_ROOT/agentic/code/frameworks/<name>/skills/<skill>/SKILL.md` and `$AIWG_ROOT/agentic/code/addons/<name>/skills/<skill>/SKILL.md` is the canonical source — it is always present at the install root and survives any deploy-state corruption.

**Forbidden after `discover` returns a path**: running `find`, `ls`, `Glob`, or `Read` on a `<provider>/skills/` directory. Those reflect the kernel-pivot deploy state, not the full surface. Use `aiwg show`.

This is mandated by the `skill-discovery` HIGH rule. Surface the top match (or top-3) to the user — the search is auditable.

## Framework quickrefs (loaded if framework is installed)

If a user asks about a specific framework's surface, the corresponding quickref is your first stop. These are kernel-resident, so they're already in your context:

- `sdlc-quickref` — software-development-lifecycle workflows
- `forensics-quickref` — incident response and digital forensics
- `research-quickref` — research corpus and citation workflows
- `media-curator-quickref` — media archive management
- `marketing-quickref` — marketing operations and campaigns
- `ops-quickref` — operational infrastructure and runbooks
- `security-engineering-quickref` — applied security and crypto decisions
- `knowledge-base-quickref` — wiki and documentation workflows

If a quickref isn't loaded, the framework isn't installed in this project. Use `aiwg list` to confirm.

## Addons & extensions (separate kernel quickref)

For everything **outside the framework set** — the ~270 skills across 28 addons (loops, voice, memory, color, testing, NLP, etc.) and 7 ops extensions (sys/net/sec/dev/it/stream/api-adapter) — load `aiwg-language-map`. It's also kernel-resident and acts as the orientation layer for the addon/extension surface, with curated discover phrases per capability domain.

```
aiwg-language-map  → addon capability domains + extension domains + cheat sheet
```

## Self-maintenance kernel (always loaded)

These ops skills are kernel-resident — already in your context regardless of `aiwg discover`. If discovery breaks, you still have the surfaces to repair the install:

- `steward` — provider capability awareness + command routing
- `aiwg-doctor` — installation health check with remediation steps
- `aiwg-refresh` — update CLI + redeploy frameworks (alias: `aiwg sync`)
- `aiwg-status` — workspace status dashboard
- `aiwg-help` — list every CLI command, args, and examples
- `use` — deploy a framework or addon

Pair with the `aiwg-steward` agent (always-deployed) for orchestrated repair: health check → refresh → re-doctor.

## Capability domains

| Domain | Covers |
|---|---|
| **Workspace status & health** | Project status, doctor, version, runtime info |
| **Lookup & query** | Capability discovery, KB query, artifact lookup, AIWG help |
| **Maintenance** | Refresh, deploy, hooks, regenerate context files |
| **Mentions & traceability** | @-mention validation, lint, wiring across files |
| **Activity & provenance** | Activity log, provenance records |
| **Steward & policy** | Provider capability awareness, delivery policy |

## Curated discovery phrases

### Workspace status & health

```bash
aiwg discover "aiwg status"                    # → aiwg-status
aiwg discover "aiwg doctor"                    # → aiwg-doctor
aiwg discover "version"                        # → version
aiwg discover "runtime info"                   # → runtime-info
aiwg discover "project status"                 # → project-status
aiwg discover "project health check"           # → project-health-check
aiwg discover "workspace health"               # → workspace-health
```

### Lookup & query

```bash
aiwg discover "<capability phrase>"            # itself — discovery is the entry surface
aiwg discover "aiwg help"                      # → aiwg-help
aiwg discover "search aiwg knowledge base"     # → aiwg-kb
aiwg discover "artifact lookup"                # → artifact-lookup
aiwg discover "intake wizard"                  # → intake-wizard
```

### Maintenance

```bash
aiwg discover "aiwg refresh"                   # → update / refresh
aiwg discover "deploy framework"               # → use
aiwg discover "regenerate claude.md"           # → aiwg-regenerate-claude
aiwg discover "regenerate AGENTS.md"           # → aiwg-regenerate-agents
aiwg discover "hook enable"                    # → hook-enable
aiwg discover "hook disable"                   # → hook-disable
aiwg discover "hook status"                    # → hook-status
```

### Mentions & traceability

```bash
aiwg discover "mention validate"               # → mention-validate
aiwg discover "mention lint"                   # → mention-lint
aiwg discover "mention wire traceability"      # → mention-wire
aiwg discover "mention conventions"            # → mention-conventions
aiwg discover "mention report"                 # → mention-report
```

### Activity & provenance

```bash
aiwg discover "activity log"                   # → activity-log
aiwg discover "create provenance record"       # → provenance-create
aiwg discover "auto provenance"                # → auto-provenance
```

### Steward & policy

```bash
aiwg discover "aiwg steward"                   # → steward (agent + policy router)
aiwg discover "delivery policy"                # → delivery-policy rule (and related skills)
```

## On-disk layout

```
agentic/code/        ← framework + addon source (NOT deployed; read-only reference)
.aiwg/               ← project artifacts (use cases, ADRs, test plans, etc.)
.claude/skills/      ← always-loaded "kernel" skills (this skill is here)
.claude/.aiwg/skills/ ← bulk AIWG skills (index-discoverable, not flat-listed)
.claude/agents/      ← AIWG agents (platform-native)
.claude/commands/    ← Generated command stubs for tab completion
.claude/rules/       ← AIWG rules
```

Same shape on every supported provider — see `docs/discovery-and-kernel-skills.md` for the full per-provider table.

## When to query the index versus answer from kernel

| Situation | Action |
|---|---|
| User asks "what can AIWG do?" generically | Skim the framework quickrefs above; offer the top 3 most-relevant. |
| User asks "find me a skill that does X" | `aiwg discover "X"` — return ranked candidates. |
| User asks "is there a skill for Y?" and it's not in any quickref | `aiwg discover "Y"` — don't say "no" without checking. |
| User asks about a specific framework's catalog | Direct them to that framework's quickref + invite a discover query. |
| User asks for AIWG version / config / status | `aiwg version`, `aiwg-status`, `aiwg doctor`. |

## When the curated phrases don't fit

```bash
aiwg discover "<your need, paraphrased>" --limit 5
```

If the top-3 results all score below ~0.20, the framework genuinely may not have a curated skill. Then improvise — but always check first.

## Anti-patterns

- **Do not enumerate skills from memory.** Query the index.
- **Do not deploy or modify framework source.** Files under `agentic/code/` are read-only references; project work happens in `.aiwg/` and any `src/` directories the project owns.
- **Do not bypass the steward for cross-provider questions.** If the user asks "does this work on Codex?" or "deploy to Cursor", invoke the AIWG Steward — it has the provider-capability matrix you don't.
- **Do not fabricate skill names.** If `aiwg discover` doesn't return a match, the skill genuinely may not exist — say so.

## When you don't know what to do

```bash
aiwg help                          # full CLI surface
aiwg discover "<your need>"        # find the right skill
aiwg-kb "<question>"               # conceptual help
```

If still stuck, ask the user — but ask narrowly, with options drawn from the index, not blank.
