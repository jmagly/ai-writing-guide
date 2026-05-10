---
name: aiwg-language-map
namespace: aiwg
platforms: [all]
kernel: true
description: AIWG addons + extensions language map — categories, curated discover phrases, and per-bundle pointers covering everything beyond the framework quickrefs
---

# AIWG Language Map — Addons + Extensions

This is your always-loaded directory for the AIWG **addon and extension** surface. It's the orientation layer for the ~270 skills that live outside the 8 frameworks. Frameworks have their own per-framework quickrefs (`sdlc-quickref`, `forensics-quickref`, etc.); this map covers everything else: addons (utilities, loops, voice, testing, etc.) and ops extensions (sys/net/sec/dev/it/stream).

## How to use this map

1. Identify which **capability domain** below the user's need belongs to
2. Pick a **curated phrase** from that domain
3. Run `aiwg discover "<phrase>"` and surface the top match (or top-3) to the user
4. Fetch the body with `aiwg show skill <name>` — never `find` / `ls` / `Read` on storage paths

If a phrase doesn't fit the user's exact need, paraphrase. `aiwg discover` is forgiving with natural language.

**The discover→show pattern is mandatory.** See `aiwg-utils-quickref` for the canonical pipeline and `skill-discovery` HIGH rule for enforcement.

## Map layout

The map has two sections:

- **Addon capability domains** — user-need clusters (memory, loops, voice, etc.) routed to addons
- **Extension domains** — operational scopes (sys, net, sec, etc.) for `ops-complete`

Each entry is one line: a curated discover phrase plus the bundle that owns the result. Use the phrase as written — they've been chosen to surface the relevant skill in the top results.

---

## Addon capability domains

### Loops & iteration

When the user needs an iterative coding loop, recursive context decomposition, eval gates, or guided autonomous implementation.

| Need | Discover phrase | Bundle |
|---|---|---|
| Iterative AI coding loop with auto-recovery | `aiwg discover "iterative coding loop"` | agent-loop |
| Resume / abort / status of a running loop | `aiwg discover "ralph status"` | agent-loop |
| External crash-resilient loop variant | `aiwg discover "crash-resilient agent loop"` | agent-loop |
| Recursive decomposition of a huge corpus | `aiwg discover "recursive language model query"` | rlm |
| RLM batch processing with parallel sub-agents | `aiwg discover "rlm batch fan-out"` | rlm |
| Bounded autonomous issue-to-code | `aiwg discover "guided implementation"` | guided-implementation |
| Eval-driven generator/critic loop | `aiwg discover "eval loop"` | aiwg-evals |

### Memory & state

When the user needs persistent agent memory, semantic ingestion, or context curation.

| Need | Discover phrase | Bundle |
|---|---|---|
| Semantic memory ingestion or query | `aiwg discover "semantic memory ingest"` | semantic-memory |
| Lint or capture a memory entry | `aiwg discover "memory lint"` | semantic-memory |
| Filter context to remove distractors | `aiwg discover "filter distractors from context"` | context-curator |
| Project-local LLM-maintained wiki | `aiwg discover "llm wiki"` | llm-wiki |
| Auto-memory templates for new projects | `aiwg discover "auto memory seed"` | auto-memory |

### Voice & writing quality

When the user is producing or reviewing prose and needs voice consistency, AI-pattern detection, or related text quality work.

| Need | Discover phrase | Bundle |
|---|---|---|
| Apply a voice profile to existing content | `aiwg discover "apply voice profile"` | voice-framework |
| Create a new voice profile | `aiwg discover "create voice profile"` | voice-framework |
| Blend two voices | `aiwg discover "blend voice profiles"` | voice-framework |
| Analyze content's current voice | `aiwg discover "analyze voice"` | voice-framework |
| Detect AI-pattern artifacts in writing | `aiwg discover "ai pattern detection"` | writing-quality |
| Improve output diversity (verbalized sampling) | `aiwg discover "verbalized sampling diversity"` | verbalized-sampling |

### NLP & inference pipelines

When the user is building or optimizing LLM inference systems.

| Need | Discover phrase | Bundle |
|---|---|---|
| LLM inference pipeline architecture | `aiwg discover "llm inference pipeline architecture"` | nlp-prod |
| Cost analysis for LLM workloads | `aiwg discover "llm cost analysis"` | nlp-prod |
| Pipeline pattern selection | `aiwg discover "pipeline pattern selection"` | nlp-prod |

### Documentation intelligence

When the user is scraping, extracting, or analyzing documentation as a corpus.

| Need | Discover phrase | Bundle |
|---|---|---|
| Coordinate doc analysis (master orchestrator) | `aiwg discover "doc intelligence orchestrator"` | doc-intelligence |
| Scrape and extract documentation | `aiwg discover "doc scrape extract"` | doc-intelligence |
| OpenProse program operations (read/parse/run) | `aiwg discover "prose program execute"` | prose-integration |

### Testing & quality

When the user needs test enforcement, UAT, or quality automation.

| Need | Discover phrase | Bundle |
|---|---|---|
| TDD enforcement / test gates | `aiwg discover "tdd enforce"` | testing-quality |
| Mutation testing | `aiwg discover "mutation analyze"` | testing-quality |
| UAT plan generation via MCP | `aiwg discover "uat plan generation"` | uat-mcp |
| UAT execution via MCP | `aiwg discover "uat execute mcp"` | uat-mcp |

### Skill / extension authoring

When the user is building new AIWG content (skills, addons, framework changes).

| Need | Discover phrase | Bundle |
|---|---|---|
| End-to-end skill creation orchestrator | `aiwg discover "skill architect orchestrator"` | skill-factory |
| Build, enhance, validate a skill | `aiwg discover "skill builder enhancer"` | skill-factory |
| AIWG framework development tooling | `aiwg discover "aiwg framework development"` | aiwg-dev |
| Validate framework manifests | `aiwg discover "validate framework manifest"` | aiwg-dev |

### Color & UX

When the user needs color theory or palette tooling.

| Need | Discover phrase | Bundle |
|---|---|---|
| Generate or review a color palette | `aiwg discover "color palette generate"` | color-palette |
| Color theory fundamentals reference | `aiwg discover "color theory"` | color-palette |
| Accessibility / contrast review | `aiwg discover "color accessibility contrast"` | color-palette |

### Daemon & background work

When the user needs persistent sessions or background orchestration.

| Need | Discover phrase | Bundle |
|---|---|---|
| Concierge / persistent daemon session | `aiwg discover "daemon concierge session"` | daemon |
| Mission Control (background mission orchestrator) | `aiwg discover "mission control orchestrate"` | daemon |
| Star-prompt for repo recommendations | `aiwg discover "star prompt"` | star-prompt |

### Setup & installer

When the user is bootstrapping a project or installing AIWG itself.

| Need | Discover phrase | Bundle |
|---|---|---|
| Generate a reproducible installer manifest | `aiwg discover "setup manifest generate"` | agentic-installer |
| Validate / run a setup manifest | `aiwg discover "setup manifest validate run"` | agentic-installer |

### Hooks & integration

When the user needs platform-level lifecycle hooks or external bridges.

| Need | Discover phrase | Bundle |
|---|---|---|
| Trace / permission / session hooks for Claude Code | `aiwg discover "claude hooks trace permissions"` | aiwg-hooks |
| HITL gate definitions for agent ops | `aiwg discover "human in the loop gate"` | agent-persistence |
| Bridge Claude to Factory Droid (MCP) | `aiwg discover "factory droid bridge"` | droid-bridge |

### Core meta-utilities

For everything else AIWG-internal — context regeneration, workspace management, index/query, validation, and project-status surfaces — see `aiwg-utils-quickref`. It's already loaded; this map points back at it.

---

## Extension domains (ops-complete)

Operational extensions live under `agentic/code/extensions/<domain>/` and extend `ops-complete`. They carry both skills AND rules. The framework-level `ops-quickref` lists the high-level extension model; this section gives you direct discover phrases.

### sys — per-host operations

Hardware, OS, boot chains, fleet host documentation, immutable bases, hardware safety procedures.

```bash
aiwg discover "host profiling sys"             # → sys-host-profile
aiwg discover "system spec audit"              # → system-spec audit skills
aiwg discover "luks tpm dual phase"            # → sec-luks-dual-phase rule (sys+sec border)
```

### net — network operations

VLANs, DNS, firewalls, Cloudflare tunnels, UniFi config, network state authority, cert expiry gates, tunnel safety.

```bash
aiwg discover "vlan audit"                     # → net-vlan-audit
aiwg discover "dns check"                      # → net-dns-check
aiwg discover "firewall change blast radius"   # → net-change-blast-radius rule
aiwg discover "tunnel safety review"           # → net-tunnel-safety rule
```

### sec — security operations

PKI, LUKS, TPM2, YubiKey, SSH CA, access auditing, cert expiry gates, key material handling.

```bash
aiwg discover "cert expiry scan"               # → sec-cert-scan
aiwg discover "access audit snapshot"          # → sec-access-snapshot
aiwg discover "ssh key audit"                  # → sec-ssh-key-audit
aiwg discover "key material handling"          # → sec-key-material-handling rule
```

### dev — CI/CD and build automation

Pipeline safety, idempotent builds, secret hygiene, self-contained CI builders.

```bash
aiwg discover "pipeline safety ci"             # → dev-pipeline-safety rule
aiwg discover "idempotent build"               # → dev-idempotent-builds rule
aiwg discover "ci secret hygiene"              # → dev-secret-hygiene rule
aiwg discover "self contained ci builder"      # → dev-ci-self-contained rule
```

### it — IT ops, CMDB, asset management

Asset registry, service deployments, disaster recovery, change control, asset authority, DR validation.

```bash
aiwg discover "cmdb asset audit"               # → it-asset-audit
aiwg discover "service health check"           # → it-service-health rule
aiwg discover "dr validation"                  # → it-dr-validation rule
aiwg discover "change control workflow"        # → it-change-control rule
```

### stream — streaming media operations

Transcoders, restreaming, platform integrations, stream pipeline gates.

```bash
aiwg discover "stream pipeline deploy"         # → stream-deploy
aiwg discover "stream pipeline gate"           # → stream-pipeline-gates rule
aiwg discover "stream credential safety"       # → stream-safety rule
```

### api-adapter — external API integrations

Reserved for external API adapter scaffolding. Currently a placeholder bundle with no skills or rules; will populate as adapters land.

```bash
aiwg discover "api adapter"                    # may return zero results until populated
```

---

## Categories at a glance (cheat sheet)

When you don't know which domain a need falls into:

| If the user mentions... | Look in... |
|---|---|
| "loop", "iterate", "ralph", "recursive", "decompose huge file" | Loops & iteration |
| "remember", "memory", "context", "wiki", "ingest" | Memory & state |
| "voice", "writing style", "AI pattern", "diversity", "samples" | Voice & writing quality |
| "inference", "pipeline cost", "model selection" | NLP & inference pipelines |
| "documentation scrape", "extract from PDF", "Prose program" | Documentation intelligence |
| "test enforcement", "TDD", "UAT", "MCP test" | Testing & quality |
| "build a skill", "scaffold addon", "framework dev" | Skill / extension authoring |
| "color", "palette", "contrast", "WCAG" | Color & UX |
| "daemon", "background mission", "mission control" | Daemon & background work |
| "installer", "setup manifest", "bootstrap" | Setup & installer |
| "hooks", "permissions", "session", "droid", "HITL" | Hooks & integration |
| "host", "BIOS", "boot chain", "OS install" | Extensions / sys |
| "VLAN", "DNS", "firewall", "tunnel" | Extensions / net |
| "cert", "LUKS", "YubiKey", "PKI", "access audit" | Extensions / sec |
| "CI", "pipeline", "build", "secret in workflow" | Extensions / dev |
| "CMDB", "asset", "DR", "service deploy", "change control" | Extensions / it |
| "transcoder", "restream", "live broadcast" | Extensions / stream |

---

## When this map doesn't have a phrase that fits

**Don't enumerate from memory.** Run `aiwg discover` with the user's natural-language phrasing — the index is forgiving. If you get zero results, try:

1. A broader phrase (e.g., drop a noun)
2. A different vocabulary (e.g., "deploy" vs "publish" vs "release")
3. `aiwg index stats --graph framework` to confirm the index is built and populated
4. Check whether the bundle is even installed via `aiwg list`

If after that the capability genuinely doesn't exist, you can tell the user honestly — but only after the search ran and came up empty. The `skill-discovery` HIGH rule mandates the search before declining.

## See also

- `aiwg-utils-quickref` — core meta-utility surface and the canonical discover→show pipeline
- Per-framework quickrefs: `sdlc-quickref`, `forensics-quickref`, `research-quickref`, `media-curator-quickref`, `marketing-quickref`, `ops-quickref`, `security-engineering-quickref`, `knowledge-base-quickref`
- `skill-discovery` HIGH rule — discovery is mandatory before declining or improvising
