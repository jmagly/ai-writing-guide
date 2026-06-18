# Implementation Plan — #1623 Steward & Feature-Domain Discoverability

**Issue:** #1623
**ADR:** `.aiwg/architecture/adr-steward-feature-discoverability.md`
**Spike:** `.aiwg/research/reports/issue-1623-steward-discoverability-research-brief.md`
**Delivery mode:** direct (per `.aiwg/aiwg.config`) — commit to main, `Closes #1623`, CI green required.

Effort is expressed in scope units + passes (no wall-clock estimates per `no-time-estimates`).

## Confirmed decisions (from interactive planning)

- Domains: **expansion** (extension/addon/framework authoring), **persona** (SOUL + persona agents,
  author **and** select), **project** (`aiwg new` + project-local bundles).
- **Index does the heavy lifting; quickrefs are thin anchors.** Dedicated `steward-quickref` kernel
  skill = guidance/anchoring phrases only.
- Four fused facets: **feature-domain, persona/identity, authoring-surface, provider-capability.**
- Ship facet-enrichment now; specify multi-vector fan-out, ship single-pass fused query.
- Proactive signifier behavior in the steward.
- Trigger/description engineering + **lint guard** against empty `triggers`.
- Full fix in #1623; artifacts = ADR + this plan + issue update.
- **New requirement:** durable **project-index registry + refresh rails** (track/remember/rebuild
  all indices) — see Workstream F; recommend a companion issue.

## Scope units (7)

| # | Scope unit | Verifiable outcome |
|---|---|---|
| U1 | Trigger/description enrichment on persona agents + authoring skills | `aiwg discover "persona"` / `"create persona"` ranks `soul-create` + a persona agent in top-3 |
| U2 | Metadata-completeness lint (no empty `triggers`) | `aiwg validate-metadata` / `skill-lint` fails on an empty-`triggers` fixture |
| U3 | Four discover facets + curated feature→capability map, fused single-pass | `aiwg discover` returns expansion/persona/project canonical phrases in top-3; existing queries don't regress |
| U4 | `steward-quickref` kernel skill (thin anchors) + steward proactive-signifier + re-query behavior | Steward, asked about any domain, locates + explains it; volunteers the affordance in context; doctor kernel-count check passes |
| U5 | Fix `findCorpusArtifact` to include `agentic/code/agents` (`query-engine.ts:786`) | `aiwg show agent aiwg-writer` resolves in an un-indexed workspace (test) |
| U6 | Project-index registry + uniform refresh rails (Workstream F) | `aiwg index status` lists all durable indices + staleness; `aiwg index build` rebuilds all registered |
| U7 | Persona selection-UX follow-up spike (deferred — separate issue) | Issue filed; not built here |

## Workstreams & parallelism

```
Parallel batch 1 (independent):
  W-A  U1 trigger/description data        (agent metadata)
  W-B  U2 lint guard                      (src/cli/handlers/skill-lint.ts, agent-validator.ts)
  W-E  U5 show-fallback bug fix           (src/artifacts/query-engine.ts:786 + test)

Sequential gate: U1 lands first (data exists to rank), then:
  W-C  U3 facets + feature→capability map + fused query   (src/artifacts/: query-engine, hybrid-query, fulltext, types, index-builder; reuse browser-export facets)
       └─ gate: discover acceptance test (top-3 for canonical phrases) green
  W-D  U4 steward-quickref + steward behavior              (new kernel skill; aiwg-steward.md; aiwg-utils-quickref + language-map anchor lines)

Parallel/independent track:
  W-F  U6 index registry + refresh rails   (recommend companion issue; #1623 registers its facets minimally)

Deferred:
  W-G  U7 persona-selection-UX spike       (follow-up issue)
```

Suggested agents (3–5): **Software Implementer** (W-C, W-E), **AgentSmith/SkillSmith** (W-D quickref + steward), **Test Engineer** (acceptance + lint fixtures), **Context Librarian** (W-A enrichment, W-F registry). Respect `parallelism.max_parallel_subagents=4`.

## Workstream F — Harden the existing project-index registry (not greenfield)

**Existing support (the thing to fix, not replace):** durable project indices *can already* be
registered today via the **`index.graphs` block in `.aiwg/aiwg.config`** (canonical, #1491; deprecated
`.aiwg/config.yaml` fallback), plus **module-declared graphs** (`loadModuleGraphConfigs` — frameworks/
addons declare graphs). These compose into `GRAPH_CONFIGS` (`src/artifacts/types.ts:472`). Each index
dir already has a `checksum-manifest.json` for incremental rebuild, and `post-commit-index-refresh`
exists. **The registry is real but weak and unreliable** — confirmed weaknesses:

| Weakness | Evidence | Why it bites |
|---|---|---|
| Mechanism is itself undiscoverable | `index.graphs` buried in `aiwg.config`; #1491 YAML→JSON migration churn | Operators don't know they can register durable indices (meta-irony of #1623) |
| **Silent config-load failures** | `loadUserGraphConfigs` swallows errors in `try{}catch{}` "best-effort" (`types.ts:632+`) | A misconfigured graph silently never loads → "not found to be working properly" |
| No reliable status/freshness/drift surface | `aiwg index stats` is per-graph; no "list all registered + last-built + stale + drift" | Can't tell at a glance which durable indices exist or are stale |
| Refresh-all reliability | post-commit refresh exists but no `--all` over the registry + no doctor staleness gate | Indices drift; rebuilds are ad-hoc |

**Hardening tasks (design — recommend companion issue):**
- **Surface the registry:** `aiwg index list` / `aiwg index status` enumerating builtin + module +
  `index.graphs` entries, with `location`, last-built, staleness, and **drift** (registered-but-missing
  / on-disk-but-unregistered). Extends `stats.ts`, reuses `checksum-manifest`.
- **Stop silent swallowing:** `loadUserGraphConfigs` should report malformed/unresolvable graph
  configs (warn or `aiwg doctor` finding) instead of best-effort dropping them.
- **`aiwg index build --all`** over the registry (incremental via existing manifests).
- **Wire the registry into `post-commit-index-refresh`** so touched-source graphs refresh reliably.
- **`aiwg doctor` staleness/drift check** for durable indices.
- **Flexibility preserved:** ad-hoc indices anywhere still allowed; the rails apply to registered
  (durable) graphs. Optionally add a `durable: true` marker on `index.graphs` entries to opt into
  doctor/refresh enforcement.

**Recommendation:** file as a **companion issue** ("harden index-graph registry: discoverability,
non-silent load, status/drift, refresh-all, doctor gate"). #1623 consumes it via the **existing
mechanism** — its four facets register as `index.graphs` (or framework module-declared) graphs, so
they're tracked from day one even before the hardening lands.

## Quality gate (definition of done for #1623)

```
npx tsc --noEmit && npm test           # green, no skipped
aiwg validate-metadata                 # passes; empty-triggers fixture fails as expected
aiwg discover "persona" | "create an expansion" | "scaffold a project"   # target in top-3
aiwg show agent aiwg-writer            # resolves in un-indexed workspace
aiwg doctor                            # kernel counts OK; no stale durable-index warnings
# Manual: steward, asked about each domain, locates + explains + volunteers affordance
```

Estimated passes: 3–5 (1 implement, 1–2 fix ranking/regressions, 1–2 edge cases on facet fusion).

## Follow-ups to file

1. **Companion:** project-index registry + refresh rails (Workstream F).
2. **Spike:** persona selection-UX (catalog-pick at runtime — research gap).
