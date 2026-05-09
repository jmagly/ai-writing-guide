---
title: AIWG Index Subsystem Audit — Capability-Based Skill Discovery
phase: architecture
type: audit
created: 2026-05-09
issue: "1212"
status: draft
---

# AIWG Index Subsystem Audit (2026-05)

## Goal

Audit the existing `aiwg index` subsystem and adjacent surfaces to determine what would have to change to let a runtime agent ask "what skill helps me onboard a team member?" and get back a ranked, token-cheap list of candidates from the on-disk index — closing the gap created by deploying a kernel + leaving the long tail in the index.

This is an audit, not a design. Code references are file:line. Drift between code and docs is filed as observations.

---

## 1. What's There

### 1.1 The `aiwg index` subsystem (`src/artifacts/`)

| File | Lines | One-line summary | Key exports |
|------|-------|------------------|-------------|
| `cli.ts` | 555 | Subcommand router for `aiwg index {build,query,deps,stats,neighbors,set,watch,views,enrich,doctor}`. Parses `--graph`, dynamically imports submodules. | `main(args)` |
| `types.ts` | 611 | Data model: `MetadataEntry`, `ArtifactIndex`, `TagIndex`, `DependencyGraph`, `TypedEdge`, `GraphConfig`. Loads built-in + module + user graph configs. | `MetadataEntry`, `GRAPH_CONFIGS`, `loadUserGraphConfigs`, `loadModuleGraphConfigs`, `BUILTIN_GRAPH_CONFIGS`, `getGraphIndexDir` |
| `index-builder.ts` | 630 | Scans configured `scanDirs`, parses YAML frontmatter, computes SHA-256 checksums (truncated 16 hex), extracts `@-mention` deps, extracts citation-sidecar edges, applies metadata supplements, writes `metadata.json`/`tags.json`/`dependencies.json`/`stats.json`/`manifest.json` per-graph. Incremental via stat+checksum manifest. | `buildIndex(cwd, opts)`, `parseFrontmatter`, `extractMentions`, `buildFilenameMetadataEntry` |
| `query-engine.ts` | 178 | Keyword scoring engine with weighted matches: title 3x, tags 2x, summary 1x, path 0.5x, type 0.5x. Filters: `type`, `phase`, `tags`, `path` (minimatch), `updatedAfter`, `limit`. Default limit 20. | `queryIndex(cwd, params, opts)` |
| `embedding-index.ts` | 281 | **Optional** ANN layer. Embeds `title + summary` via `@xenova/transformers` (default Xenova/all-MiniLM-L6-v2), stores HNSW vectors at `embeddings/vectors.hnsw` plus `manifest.json`. Cosine similarity. Detects checksum drift for incremental re-embed. | `buildEmbeddingIndex`, `semanticQuery`, `semanticNeighbors`, `detectEmbeddingChanges`, `checkEmbeddingDeps` |
| `graph-backend.ts` | ~150 | Abstract `GraphBackend` interface — node/edge mutation, neighbor traversal (in/out/both, edge-type filter), set ops (intersection/union/difference), serialize↔`DependencyGraph`. | `GraphBackend` |
| `backends/json-backend.ts`, `graphology-backend.ts`, `sqlite-backend.ts` | — | Three implementations of `GraphBackend`. JSON is zero-dep default. graphology/sqlite are opt-in. | per-file `*Backend` classes |
| `graph-query.ts` | ~200 | `index neighbors` and `index set` implementations. Walks `dependencies.json` typed edges, applies edge-type/direction filters. | `showNeighbors`, `executeSetQuery` |
| `citation-parser.ts` | ~250 | Parses citation-sidecar markdown (REF-XXX / PROF-* IDs, outgoing+incoming tables) into `TypedEdge[]` for the index-builder. | `parseCitationSidecar`, `citationResultToEdges`, `buildRefToPathMap` |
| `hybrid-query.ts` | ~200 | **Independent** in-memory query engine over `.aiwg/`. Combines path glob + keyword + tags + references. Distinct from `query-engine.ts`. Tied to `address-parser.ts` (`@?"semantic"`, `@path:semantic` syntax). | `ArtifactIndex` (class), `SearchResult` |
| `address-parser.ts` | ~120 | Parses query addresses: `@path` (location), `@?"query"` (semantic), `@path:?"query"` (hybrid), `@type:tag1,tag2` (tags), `@phase:requirements` (phase). | `parseAddress`, `AddressType`, `HybridQuery` |
| `enrichment/store.ts`, `types.ts`, `cli.ts`, `prompt.ts` | ~400 total | Sidecar enrichment store at `.aiwg/index/semantic/<sanitized-id>.json`. Fields: `summary`, `declaredSymbols`, `citations`, `inferredTags`, `openQuestions`, `enrichedAt`, `enrichedBy`, `enrichedHash`. Producer = an LLM run via `aiwg index enrich`. **Not currently consumed by `query-engine.ts`.** | `SemanticFields`, `put`, `get`, `has` |
| `views/` (cli, definition, store, types) | ~500 total | Materialized RLM views: declarative YAML at `.aiwg/index/views/<name>.yaml` declaring `producer` (rlm-batch / rlm-query), `inputs` (glob/query/neighborsOf), `prompt`, `aggregate` strategy, refresh schedule. Build dispatches a plan; agent fills it; results cached. | `ViewDefinition`, `ViewBuildPlan`, `ViewResult` |
| `audit/` | — | `index doctor` — drift detection between disk and index. | — |
| `checksum-manifest.ts`, `index-reader.ts`, `dep-graph.ts`, `stats.ts`, `watcher.ts` | — | Plumbing: stat-based incremental detection (#794), graph-aware index file loaders, deps display, stats display, fs.watch-based auto-rebuild daemon. | — |

### 1.2 Adjacent skill registry (`src/skills/`)

| File | Summary |
|------|---------|
| `cli.ts` | `aiwg skills {run,search,info,list,install,publish}`. Handler in `src/cli/handlers/subcommands.ts:1023` (`skillsHandler`). |
| `registry.ts` | Aggregator over three `RegistryAdapter`s: `local`, `clawhub`, `openclaw`. |
| `types.ts` | `SkillResult` (name, description, source, package, platforms, installed) + `SkillDetails` (adds version, **triggers**, tools, path, scripts, inputRequirements, outputFormat, content). |
| `adapters/local.ts` | Walks `agentic/code/frameworks/*/skills/` and `agentic/code/addons/*/skills/`, reads `manifest.json` + `SKILL.md` frontmatter (name/description/platforms) and `## Triggers` markdown section. Caches in-memory per-process. |

**This is a parallel discovery surface.** It walks the framework source on every call, has its own search (substring on name/description/package), is not backed by the artifact index, and has no notion of ranking.

### 1.3 Deployment surface

| File | Relevant point |
|------|----------------|
| `tools/agents/providers/base.mjs:547` | `deployFiles(files, destDir, opts, transformFn)` — the universal copy-to-platform pipeline. Used by every provider's `deploy()`. Writes a sidecar manifest, handles cross-framework collisions, hash-based skip-on-match. |
| `tools/agents/providers/{claude,codex,copilot,...}.mjs` | Each exports `deploy(opts)`. Calls `deployFiles` for agents/skills/commands/rules. **No call to `buildIndex` or `aiwg index` anywhere.** |
| `src/cli/handlers/use.ts` (1685 lines) | `useHandler` — orchestrates `aiwg use <framework> [--provider P]`. Calls into `tools/agents/providers/*` via the smiths layer. Greps for `index` find only RULES-INDEX.md generation (line 477) and link-index references (1609). **No automatic index build hook.** |

### 1.4 Framing surface (rules)

- `agentic/code/frameworks/sdlc-complete/rules/artifact-discovery.md` — Tells SDLC agents to use `aiwg index query`, `aiwg index deps`, `aiwg index stats` with `--json`. Explicitly project-artifact oriented (use cases, ADRs, test plans). **No language about discovering skills/agents/commands by capability.**
- `agentic/code/addons/aiwg-utils/rules/post-commit-index-refresh.md` — Mandates incremental rebuild after commits. Detection: `.aiwg/index/`, `.aiwg/graphs/`, `agentic/code/`. Maps committed paths → graphs to rebuild. **Rule exists; it does not run because nobody invokes the rebuild from `aiwg use` or hooks.**
- `agentic/code/frameworks/sdlc-complete/rules/RULES-INDEX.md` — Aggregator only.

### 1.5 Configuration

- `.aiwg/aiwg.config` (this repo): JSON, framework-deployment registry — **not** graph-related.
- `.aiwg/config.yaml`: **does not exist** in this repo. The `loadUserGraphConfigs` path (`types.ts:540`) is a no-op here. The mechanism is plumbed but not used.
- Module manifests checked (`sdlc-complete`, `research-complete`, `forensics-complete`, `security-engineering`, `media-curator`, `llm-wiki`): none declare an `index.graphs` section. `loadModuleGraphConfigs` (`types.ts:459`) returns an empty list. The hook is plumbed but no module exercises it.

---

## 2. Data Model

### 2.1 Node model (per graph)

```
MetadataEntry {
  path:         string              ← primary key (relative to project root)
  type:         string              ← "use-case" | "adr" | "test-plan" | "nfr" | "threat-model"
                                       | "architecture" | "risk" | "deployment" | "document"
                                       | "paper" (filename-metadata strategy only)
                                       — derived from frontmatter.type OR filename heuristic
                                       (inferType, index-builder.ts:92).
                                       NO "skill" / "agent" / "command" / "rule" types.
  phase:        string              ← "requirements" | "architecture" | "testing" | "security"
                                       | "deployment" | "risks" | "planning" | "intake"
                                       | "reports" | "other"
                                       — from frontmatter.phase OR PHASE_DIRECTORIES path prefix.
  title:        string              ← frontmatter.title OR first H1 OR "Untitled"
  tags:         string[]            ← frontmatter.tags (array of strings)
  created:      ISO datetime
  updated:      ISO datetime        ← stat.mtime
  checksum:     16-hex SHA-256
  summary:      ≤500-char string    ← frontmatter.description OR first 5 non-heading lines
  dependencies: string[]            ← outbound @-mention paths
  dependents:   string[]            ← computed reverse links
  captures?:    Record<string,string>  ← only for filename-metadata strategy
}
```

### 2.2 Edge model

```
DependencyGraph {
  [path]: {
    upstream:   TypedEdge[]   ← { path, type }
    downstream: TypedEdge[]   ← { path, type }
  }
}
```

Edge `type` values currently emitted:
- `"depends-on"` — from `@-mention` extraction
- `"cites"` / `"cited-by"` — from `citation-sidecar` parser

There is no general `extends`, `implements`, `triggers`, `uses-tool`, `requires-skill`, etc. Edge vocabulary is research-corpus-shaped.

### 2.3 Graph types (`types.ts:347`)

| Graph | scanDirs | extensions | shared | defaultBuild |
|-------|----------|-----------|--------|--------------|
| `framework` | `agentic/code/{frameworks,addons,agents}`, `docs` | `.md .yaml .json` | true (XDG path) | **false** — explicit `--graph` only |
| `project` | `.aiwg` | `.md .yaml .json` | false | true |
| `codebase` | `src test tools` | `.ts .mts .js .mjs .json .yaml` | false | true |

### 2.4 ASCII data-flow diagram

```
                          ┌─────────────────────────────────────┐
                          │   Source files on disk              │
                          │   .aiwg/**, agentic/code/**, src/** │
                          └────────────────┬────────────────────┘
                                           │
                                           ▼
   GraphConfig (built-in / module / user) selects scanDirs + extensions
                                           │
                                           ▼
                          ┌─────────────────────────────────────┐
                          │  index-builder.ts                   │
                          │  - parseFrontmatter                 │
                          │  - extractMentions (@-paths)        │
                          │  - inferType / inferPhase           │
                          │  - extractSummary (≤500 chars)      │
                          │  - SHA-256 checksum                 │
                          │  - citation-sidecar edges           │
                          │  - metadataSupplements merge        │
                          └────────────────┬────────────────────┘
                                           │
            ┌──────────────────────────────┼─────────────────────────────────┐
            ▼                              ▼                                 ▼
   .aiwg/.index/<graph>/            .aiwg/index/semantic/                .aiwg/index/views/
   ├ metadata.json                  └ <id>.json (LLM-produced            └ <name>.yaml (decl)
   ├ tags.json                          enrichment, NOT QUERIED)         + results cache
   ├ dependencies.json                                                   (RLM-produced)
   ├ stats.json                     embeddings/                          (NOT in default flow)
   └ manifest.json (checksums)      ├ vectors.hnsw   (opt-in)
                                    └ manifest.json  (opt-in)

                                           ▲
                                           │
                          ┌─────────────────────────────────────┐
                          │  query-engine.ts (CLI: index query) │
                          │  Filter: type, phase, tags, path    │
                          │  Score: title 3x, tags 2x,          │
                          │         summary 1x, path 0.5x,      │
                          │         type 0.5x                   │
                          │  Substring keyword match only       │
                          └─────────────────────────────────────┘

   Parallel surface (NOT linked to artifact index):
     src/skills/registry.ts → adapters/local.ts
       Walks agentic/code on every call, parses SKILL.md frontmatter,
       extracts ## Triggers section, returns SkillResult.
       Substring search over name/description/package.
```

### 2.5 Trigger to indexability check

| Source field | Where it's read | Where it ends up in the index |
|---|---|---|
| SKILL.md `name`, `description` | `adapters/local.ts:163-176` (skill registry only) | **Nowhere in the artifact index.** Description does land in `summary` *if* the skill source is in a scanned graph dir, but only because the index reads frontmatter generically. |
| SKILL.md `## Triggers` markdown section | `adapters/local.ts:67-75` (`extractTriggers`) — skill registry only | **Not extracted by `index-builder.ts`.** Index sees the markdown body as part of `summary` truncation, but trigger phrases as a structured field do not exist in `MetadataEntry`. |
| SKILL.md `commandHint.allowedTools` / `model` / `category` | Skill registry parses some of this | Not in `MetadataEntry`. |
| Agent `.md` frontmatter (`name`, `description`, `model`, `tools`, `category`) | Indexed via generic `parseFrontmatter` if scanned | Lands in `summary`. `category` not surfaced as a top-level field. |

---

## 3. Gaps for the Capability-Discovery Use Case

The new ask is: agent has a phrase ("onboard a team member"), gets back ranked AIWG artifacts (skills/agents/commands/rules) from the on-disk index, in a token-cheap form, with a query path the agent can be reliably trained to invoke.

### Gap 1: Skill / agent / command / rule are not first-class artifact types

**Current state**: `inferType` (`index-builder.ts:92`) emits `use-case`, `adr`, `test-plan`, etc. — SDLC artifact types. A `SKILL.md` indexed under a scanned framework directory ends up with `type: "document"` and `phase: "other"`. A capability-driven agent looking for "skills that help with team onboarding" cannot filter by `type=skill` because that type does not exist.

**Implication**: To the artifact index, a skill is indistinguishable from any other markdown file.

### Gap 2: The `framework` graph is `defaultBuild: false` — and `aiwg use` doesn't build it anyway

**Current state**: `BUILTIN_GRAPH_CONFIGS.framework.defaultBuild = false` (`types.ts:353`). Even if it were `true`, `aiwg use` does not call `buildIndex`. There is no provider hook in `tools/agents/providers/*.mjs` and no call site in `use.ts`. The `framework` graph in this repo has *never been built* unless someone ran `aiwg index build --graph framework` by hand.

**Implication**: The agent has nothing to query. `aiwg index query --graph framework "onboard"` will fail with "No artifact index found for graph 'framework'."

### Gap 3: Capability metadata is not extracted

**Current state**: `index-builder.ts` parses YAML frontmatter generically and stuffs body content into `summary` (≤500 chars, first 5 non-heading lines). It does **not**:
- Extract the `## Triggers` markdown section into a structured field
- Promote `commandHint.argumentHint` to a structured field
- Pull `commandHint.allowedTools` / `commandHint.model` / `commandHint.category` to the top level
- Distinguish "what this skill *does*" (capability) from "what file this is" (structural metadata: path, mtime, checksum)

**Implication**: The discriminating signal — trigger phrases like "onboard new team member" — is buried in `summary` and competes with everything else.

### Gap 4: Query is substring-only, weighted toward title

**Current state**: `query-engine.ts:24` scores keyword matches against title/tags/summary/path/type. There is **no** BM25, TF-IDF, term frequency, or query-term tokenization. A query for "onboard a team member" matches an entry only if that exact substring (case-insensitive) appears in title/tag/summary/path. Stemming, multi-word handling, synonym expansion, plural/singular reconciliation, stopword removal — none.

**Implication**: A natural-language query like "I want to onboard a team member" will score 0 against a skill titled "Team Onboarding" because "onboard" is a different substring from "Onboarding" only after lowercasing succeeds, but "I want to onboard a team member" as one query returns 0 hits if the skill description says "Welcome a new engineer." Practitioner queries miss.

### Gap 5: Embeddings exist but are entirely opt-in and decoupled from query

**Current state**: `embedding-index.ts` is fully implemented. It can build `embeddings/vectors.hnsw` per graph and answer `semanticQuery(query, indexDir, topK)`. **It is not wired into `query-engine.ts`.** No CLI subcommand calls it. No graph config in this repo enables it. The function is reachable only by direct import.

**Implication**: The infrastructure for natural-language ranking already exists, but querying via the public CLI surface always falls back to the substring scorer.

### Gap 6: Hybrid (location + semantic) infrastructure exists in a parallel module

**Current state**: `address-parser.ts` and `hybrid-query.ts` define an `@?"semantic"` query syntax and a `HybridQuery` type. **This module has its own `ArtifactIndex` class that walks `.aiwg/` independently.** It is not the same index `aiwg index build` produces. There is a documented API (`@?"user authentication"` → semantic) but no CLI plumbing exposes it through `aiwg index query`.

**Implication**: Two query engines, two index representations, neither connected to the embedding store. Consolidation is needed before semantic ranking is available end-to-end.

### Gap 7: No agent-facing query surface that returns kernel-friendly output

**Current state**: `aiwg index query "X" --json` returns up to 20 entries with `{path, type, phase, title, score, summary}`. That's reasonable for SDLC artifacts but each entry is ~200-400 bytes of JSON. A skill query needs:
- A short capability summary (1-2 sentences) instead of an arbitrary 500-char head
- The triggers list (so the agent can self-validate "this skill is what I want")
- The invocation form (skill name, command name)
- Token-budgeted output (top 5 with strict per-entry size)

**Implication**: Even if ranking worked, the output shape is too verbose for the kernel-pivot model where the agent has spent budget on reading rules and now needs a tight answer.

### Gap 8: No MCP tool exposes the index to in-process agents

**Current state**: `aiwg-mcp-server` exists (CLI handler `mcpHandler`). I did not find a tool definition that wraps `index query` or `skills search` for in-conversation agents. Agents must shell out via Bash (`aiwg index query "..." --json`), which costs a tool turn and burns context formatting the result.

**Implication**: The "frame the agent to query before acting" pattern requires either a Bash recipe (works today, expensive) or an MCP tool (does not exist yet).

### Gap 9: No automatic build trigger after `aiwg use`

**Current state**: After `aiwg use sdlc`, the framework files exist on disk in `.claude/skills/` etc. **and** the source still lives in `agentic/code/frameworks/sdlc-complete/skills/`. Either could be indexed but neither is, automatically. The post-commit-index-refresh rule (mentioned above) tells agents to rebuild — but only after commits.

**Implication**: Even after an explicit `aiwg index build --graph framework`, the index reflects whatever happened to be on disk at that moment. There is no guarantee the kernel + index are in sync.

### Gap 10: Substring scorer doesn't prefer skills for capability queries

**Current state**: When the user asks "I want to deploy", the substring scorer will rank a use case titled "Deployment Use Case" higher than a skill titled "deploy-to-production" because the substring is a longer match in the use case title. The scorer has no notion of "for a capability query, prefer skill/command artifacts."

**Implication**: Without a `type` boost or per-type ranking knob, capability queries land on documentation rather than executable skills.

---

## 4. Smallest Change That Works

The minimal extension that lets an agent query for skills by capability today:

### 4.1 New artifact-type recognition

**Location**: `src/artifacts/index-builder.ts:92` (`inferType`)

Add filename + path heuristics so the existing index assigns:
- `type: "skill"` to any `**/skills/**/SKILL.md`
- `type: "agent"` to any `**/agents/**/*.md` with `name:` frontmatter
- `type: "command"` to `**/commands/**/*.md` and `**/prompts/**/*.md`
- `type: "rule"` to `**/rules/**/*.md`

Add corresponding entries to `PHASE_DIRECTORIES` (or a new `KIND_DIRECTORIES`) so `inferPhase` doesn't lump them all into `"other"`. Suggested: `phase: "framework-skills"`, `"framework-agents"`, etc.

This is a five-LOC change in `inferType` plus a small map.

### 4.2 Capability-section extraction

**Location**: `src/artifacts/index-builder.ts` (new helper `extractCapability`)

Extend `MetadataEntry` with two new optional fields (additive, no breaking change to existing graphs):

```ts
interface MetadataEntry {
  // ... existing fields
  triggers?: string[];      // ## Triggers list items, parsed from body
  capability?: string;      // commandHint.argumentHint, OR description, OR first sentence
}
```

Implementation:
- Reuse the regex from `src/skills/adapters/local.ts:67` (`extractTriggers`) — it already does the job. Move it to `index-builder.ts` as `extractTriggers(body)` and call from the per-file branch.
- Pull `data.commandHint?.argumentHint` and `data.description` directly from the parsed frontmatter into `capability`.

This stops the trigger phrases from being lost in summary truncation.

### 4.3 Boost capability fields in the keyword scorer

**Location**: `src/artifacts/query-engine.ts:24` (`scoreEntry`)

```ts
// New: triggers match (4x weight — strongest signal for capability queries)
for (const t of entry.triggers ?? []) {
  if (t.toLowerCase().includes(lower)) score += 0.4 * 4;
}
// New: type boost when query looks like a capability query
//      (heuristic: query starts with verb)
if (/^(deploy|onboard|review|fix|test|audit|generate|create|migrate|run|build)/.test(lower)) {
  if (entry.type === 'skill' || entry.type === 'command') score += 0.2;
}
```

Plus tokenize the query — split on whitespace, score each token, sum and clamp. Two LOC change.

### 4.4 Default-build the `framework` graph + auto-build on `aiwg use`

**Location**:
- `src/artifacts/types.ts:353` — flip `BUILTIN_GRAPH_CONFIGS.framework.defaultBuild` to `true` **and** rescope `scanDirs` to focus on the kernel-relevant subdirs (`agentic/code/frameworks/*/skills`, `*/agents`, `*/commands`, `*/rules` and same for `addons`). The current scan dirs include `docs/`, which is too broad.
- `src/cli/handlers/use.ts` — add a final post-deploy step (after the framework registry is updated, before returning success) that calls `buildIndex(cwd, { graph: 'framework', explicit: false })`. This needs to be best-effort: failures must warn but not abort the deploy (consistent with the `defaultBuild + !explicit` skip-gracefully path at `index-builder.ts:288`).

### 4.5 New CLI subcommand: `aiwg index discover`

**Location**: `src/artifacts/cli.ts` — new subcommand under the existing router.

This is the agent-facing surface. It wraps `queryIndex` with capability-friendly defaults:

```bash
aiwg index discover "onboard a team member"
# defaults: --type skill,command --limit 5 --json
# output: tight JSON, one line per result:
#   {"name":"team-onboarding","kind":"skill","triggers":[...],"path":"...","score":0.78}
```

Per-entry budget: ≤200 bytes. No `summary` field unless `--verbose`. The output shape is what the agent consumes, so it must be designed for in-context reading, not human reading. Reusing `queryIndex` with a thin wrapper that reshapes the result is ~30 LOC.

### 4.6 Framing rule: `skill-discovery.md`

**Location**: `agentic/code/addons/aiwg-utils/rules/skill-discovery.md` (new file)

Companion to `artifact-discovery.md` but kernel-pivot oriented. The shape:

```
Before invoking a skill from memory:
1. Run `aiwg index discover "<your task in plain language>"`
2. Pick the top result whose triggers match your task
3. If no result has score >= 0.4, ask the user to clarify or fall back to the
   kernel-installed skill set
```

Add to `RULES-INDEX.md` (both aiwg-utils and sdlc-complete) so it's discoverable.

### 4.7 Minimal change summary

| Change | File | LOC est. |
|---|---|---|
| New artifact types | `index-builder.ts:92` | ~30 |
| Capability extraction | `index-builder.ts` (new helper) + `types.ts` (interface) | ~50 |
| Scorer trigger boost + tokenization | `query-engine.ts:24` | ~25 |
| Framework graph defaults | `types.ts:347-369` | ~10 |
| `aiwg use` index hook | `cli/handlers/use.ts` (one new call site) | ~15 |
| `aiwg index discover` | `cli.ts` (new handler) | ~50 |
| `skill-discovery.md` rule | new file + RULES-INDEX update | ~120 |
| Tests | `test/unit/artifacts/*.test.ts` | ~150 |
| **Total** | | **~450 LOC** |

This unlocks the use case end-to-end with no new dependencies, no embedding cost, no MCP server work. The agent shells out via Bash (already supported by every provider) and gets ranked, token-cheap candidates.

---

## 5. Bigger Changes Worth Doing in a Follow-up Phase

### 5.1 Wire the embedding index into `query-engine.ts` (REF-089-aligned)

**What**: Make `embedding-index.ts` a real layer behind `aiwg index query`. Default off; enable per-graph via `embedding.enabled: true` in graph config. When enabled, hybrid-rank: BM25-style keyword score (the substring scorer's natural successor) + cosine similarity from the HNSW store, weighted (e.g., 0.6 keyword + 0.4 semantic). Pareto-optimal for natural-language queries.

**Where**: `query-engine.ts:127` (the score+rank loop). Call `semanticQuery(text, indexDir, topK*3)` first to get candidates, intersect with filtered candidates, then re-score.

**Why follow-up**: Adds two npm dependencies (`@xenova/transformers`, `hnswlib-node`), ~22 MB model download on first run, and introduces an init-cost the kernel-discovery flow hasn't been measured against yet. The smallest-change-that-works above (substring + boost) covers maybe 80% of cases without it.

### 5.2 MCP tool `index_discover`

**What**: Expose the `aiwg index discover` semantics as an MCP tool through `aiwg-mcp-server` so providers that support MCP (Claude Code, Cursor, Codex via mcp profile) can call it without spawning a child process. Saves a bash turn and lets the agent get a structured tool result back.

**Where**: Wherever the existing MCP tool definitions live (likely `src/mcp/` or `tools/mcp-server/`). Requires a thin shim.

**Why follow-up**: It's strictly an optimization on top of the CLI. The Bash path is functional today.

### 5.3 Consolidate `hybrid-query.ts` ↔ `query-engine.ts`

**What**: Two query engines is a maintenance hazard. `hybrid-query.ts` has the `address-parser.ts` syntax (`@?"semantic"`, `@path:tags`); `query-engine.ts` has the production CLI bindings. Either fold address-parser into `query-engine.ts` and let the CLI accept `@?"semantic"` syntax, or retire `hybrid-query.ts` if its only consumer is internal.

**Where**: `src/artifacts/`.

**Why follow-up**: It's tech-debt. It doesn't block the use case — the use case wants the CLI surface, and that's `query-engine.ts`.

### 5.4 First-class capability-graph

**What**: Today edges are `depends-on` and `cites`. A capability graph would add `triggers-on` (skill → trigger phrase node), `uses-tool` (skill → tool name), `requires-skill` (agent → skill it expects). With the edge vocabulary in place, the existing `aiwg index neighbors` and `aiwg index set` work directly: "what skills trigger on 'onboard'?" → set of skills. This is a more principled answer than ranked text search.

**Where**: New edge extractor under `src/artifacts/` paralleling `citation-parser.ts`. Plus a graph definition.

**Why follow-up**: The nodes-and-edges model is elegant but trigger phrases are unbounded vocabulary. You want both the structured graph (for exact-match capability lookup) and the text/embedding search (for natural-language fall-through). Build the cheap thing first.

### 5.5 Promote semantic enrichment into the query path

**What**: `enrichment/store.ts` already produces `inferredTags`, `declaredSymbols`, `summary`, `openQuestions` per-artifact via an LLM-driven pass. None of these are read by `query-engine.ts`. Wire them in: at query time, also score against `inferredTags` and the LLM-produced `summary` (which is generally better than the 500-char head of body). This replicates a lot of what embeddings give you, at LLM-pass cost amortized over many queries.

**Where**: `query-engine.ts` — at the candidate-load step, attempt to load the enrichment sidecar from `.aiwg/index/semantic/<sanitized-id>.json` and merge fields into the scorable surface.

**Why follow-up**: Enrichment is producer-driven and currently optional. Wiring it in unconditionally would surface entries that have it ranked higher than entries that don't, biasing results. Best done after enrichment runs as part of `aiwg index build`.

### 5.6 Concrete pointers for the bigger phase

| Extension | File / function pointer |
|---|---|
| Embedding into query | `query-engine.ts:queryIndex` calls `embedding-index.ts:semanticQuery` |
| MCP tool | wrap `cli.ts:handleQuery` in an MCP tool definition |
| Engine consolidation | merge `hybrid-query.ts:ArtifactIndex` into `query-engine.ts` |
| Capability graph | new `src/artifacts/capability-parser.ts`, mirroring `citation-parser.ts` |
| Enrichment in query | `query-engine.ts:scoreEntry` reads `enrichment/store.ts:get` per entry |

---

## 6. Drift / Observations Filed During Audit

1. **`post-commit-index-refresh.md` mandates rebuilds the system never triggers automatically.** The rule tells agents to run `aiwg index build` after a commit. There is no git hook, no `aiwg use` hook, no `aiwg refresh` hook calling it. Agents will obey only if they read the rule and shell out, which the framing in `artifact-discovery.md` does not actually demand. → recommend: either add a real hook, or downgrade the rule to "manual when working with project artifacts."

2. **`framework` graph is `defaultBuild: false` but the rules tell agents to query it.** `artifact-discovery.md` does not distinguish graphs but examples use `--graph framework`. Without manual `aiwg index build --graph framework` ever being run, `aiwg index query --graph framework` errors out. → either make `framework` `defaultBuild: true` or drop framework-graph examples from the rule until the auto-build hook lands.

3. **`aiwg skills search` exists but isn't visible from `aiwg index query`.** Two near-overlapping discovery surfaces (`skills` walks framework source live, `index query` reads built indices). A user asking "which command finds the right skill?" will get one or the other depending on which doc they read. Pick one canonical and document it; the other becomes an internal API.

4. **`embedding-index.ts` is feature-complete and unreachable through the CLI.** All scaffolding exists for `Xenova/all-MiniLM-L6-v2` semantic search, including HNSW persistence, incremental re-embed detection, and graph config schema (`embedding.enabled`). No CLI path exposes it. → either land the wiring or document the limitation in the embedding section of the README.

5. **`enrichment/store.ts` produces `inferredTags`, `summary`, etc. that nothing reads.** Pure write-only as of audit date. → wire into `query-engine.ts` or remove from default flow until ready.

6. **Module graph manifests are plumbed but no module declares one.** `loadModuleGraphConfigs` (`types.ts:459`) reads `manifest.json#index.graphs`. None of the six manifests checked declare it. The path is dead code until at least one module exercises it. → either land an example (e.g., `research-complete` declaring its citation-network graph through `index.graphs` rather than via README instructions to add to `.aiwg/config.yaml`) or remove the loader.

7. **`SKILL.md` files in deployed targets (e.g., `.claude/skills/`) live outside any default scan path.** The `framework` graph reads `agentic/code/frameworks/...`, the `project` graph reads `.aiwg`, and the `codebase` graph reads `src/test/tools`. Deployed kernel files in `.claude/skills/` are indexed by **none** of these. If the kernel pivot deploys ~30 skills locally and queries the index for the long-tail rest, the index must scan source (the picked direction), not deployed. This audit assumes that direction; the alternative (scan `.claude/skills/` etc.) would require a new graph type.

8. **`PHASE_DIRECTORIES` (`types.ts:194`) is SDLC-shaped only.** It maps `requirements`, `architecture`, etc. There is no mapping for `skills`, `agents`, `commands`, `rules`. Adding capability artifacts as first-class types should also extend this map, otherwise `byPhase` stats become a misleading "{requirements: 14, architecture: 8, other: 387}" because everything new lands in `other`.

---

## 7. Recommendation Summary

**Today (smallest change)**: Add four artifact types (skill/agent/command/rule) to `inferType`; extract `## Triggers` and `commandHint` capability metadata; boost trigger matches in the scorer; default-build the `framework` graph and trigger it from `aiwg use`; ship `aiwg index discover` as the agent-facing surface; add a `skill-discovery.md` rule. ~450 LOC of code + a new rule.

**Next phase**: Wire the existing embedding index and enrichment store into `query-engine.ts` for natural-language queries. Expose `index discover` as an MCP tool. Consolidate the parallel `hybrid-query.ts` engine.

**Don't do yet**: A capability graph with `triggers-on` edges is an attractive design but solves a problem the cheap text+embedding combination already covers for the kernel pivot.
