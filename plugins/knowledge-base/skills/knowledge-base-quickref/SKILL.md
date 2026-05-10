---
name: knowledge-base-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Knowledge-base framework quick reference — capability domains and curated discovery phrases for KB ingest/health, semantic-memory kernel skills, and llm-wiki profiles
---

# Knowledge Base Framework — Quick Reference

This is your always-loaded directory for the AIWG **knowledge-base** framework. It does **not** list every skill. Most heavy lifting comes from the **semantic-memory kernel** in `aiwg-utils` (`memory-ingest`, `memory-lint`, etc.) — this framework is a thin topology on top.

## Canonical access pattern: discover → show

When you find a candidate via `aiwg discover`, fetch its body with `aiwg show <type> <name>`. **Never** use `find`, `ls`, `Glob`, or direct `Read` on `<provider>/skills/` paths — those reflect the kernel-pivot deploy state, not the full surface.

```bash
aiwg discover "<phrase>"             # find — returns ranked candidates
aiwg show skill <name>               # fetch — streams the SKILL.md body
```

If your platform's Skill tool errors on a non-kernel skill (expected — most aren't kernel), the fallback is `aiwg show`, never filesystem browsing. Last-resort if `aiwg` itself is broken: read directly from `$AIWG_ROOT/agentic/code/...` (the canonical corpus, always present).

## How to use this quickref

1. Identify the **capability domain** the user's need belongs to
2. Pick a **curated phrase** from that domain
3. Run `aiwg discover "<phrase>"` and surface the top match to the user

**Do not enumerate skills from memory.** Discovery is the lookup surface.

## What this framework is for

A **thin topology** on top of AIWG's semantic-memory kernel — turning any project's `.aiwg/kb/` into a queryable knowledge base. Sources get ingested into structured pages (entities, concepts, summaries, syntheses) with cross-references, deduplication, and lint coverage. Pairs naturally with the `llm-wiki` addon for Obsidian-compatible profiles (book-companion / personal / research-deep-dive / business-team / generic).

## Capability domains

| Domain | Covers |
|---|---|
| **KB lifecycle** | Ingest sources, health-check the KB |
| **Semantic memory kernel** (in aiwg-utils) | Generic ingest/lint/log/query primitives any consumer can declare a topology against |
| **LLM-wiki profiles** | Topology profiles that shape how `kb-ingest` derives pages |
| **Cross-ref traversal** | Graph-native via `aiwg index neighbors --graph kb` |

## Curated discovery phrases

### KB lifecycle

```bash
aiwg discover "kb-ingest"                      # → kb-ingest (score 1.00)
aiwg discover "ingest source into knowledge base" # → kb-ingest
aiwg discover "kb-health"                      # → kb-health (score 1.00)
aiwg discover "knowledge base lint"            # → kb-health
```

### Semantic memory kernel (aiwg-utils)

```bash
aiwg discover "memory ingest"                  # → memory-ingest
aiwg discover "memory lint"                    # → memory-lint
aiwg discover "memory log append"              # → memory-log-append
aiwg discover "memory log render"              # → memory-log-render
aiwg discover "memory query capture"           # → memory-query-capture
```

### LLM-wiki profiles (in the llm-wiki addon)

```bash
aiwg discover "llm wiki profile"               # → llm-wiki addon entries
aiwg discover "book companion knowledge base"  # → llm-wiki book-companion profile
aiwg discover "research deep dive wiki"        # → llm-wiki research-deep-dive profile
```

### Cross-ref traversal (uses the artifact index, not a skill)

```bash
aiwg index neighbors --graph kb --node <slug>  # traverse the KB graph
```

## How knowledge-base composes with semantic-memory

```
kb-ingest  ─────┐                       ┌──── memory-ingest (kernel)
                ├── declares topology ──┤
kb-health  ─────┘                       └──── memory-lint   (kernel)
                                              memory-query-capture
                                              memory-log-append / render
```

Every KB entry is a semantic-memory entry with a KB-specific topology (page types, cross-ref style, derived-pages config). The kernel handles ingest mechanics; this framework declares *what shape* the KB takes.

## Page types

When ingesting via `kb-ingest`, the topology produces:

- **Entity pages** — people / orgs / products / works (one per noun)
- **Concept pages** — ideas / methods / principles
- **Source summaries** — per-source distillation (one per ingested URL/file)
- **Synthesis pages** — composite views across multiple sources

Cross-references between these are graph-native (visible to `aiwg index neighbors`).

## Profile selection (via `llm-wiki` addon)

| Profile | Use for |
|---|---|
| `book-companion` | Reading a book, building a structured companion |
| `personal` | Personal knowledge / journal-of-ideas |
| `research-deep-dive` | Academic research project (uses research-corpus conventions) |
| `business-team` | Team-shared business KB |
| `generic` | No profile chosen — vanilla semantic-memory shape |

Install via `aiwg use llm-wiki --profile <name>`. The profile shapes how `kb-ingest` derives pages.

## Artifact directory layout

```
.aiwg/kb/
├── entities/         # Entity pages (PROF-* compatible if research-corpus also installed)
├── concepts/         # Concept pages
├── summaries/        # Per-source distillation
├── syntheses/        # Composite views
└── log.jsonl         # Semantic-memory event log
```

## When the curated phrases don't fit

```bash
aiwg discover "<your need, paraphrased>" --limit 5
```

## Anti-pattern: don't enumerate

If a user asks "what KB skills are available?", **do not list from this skill**. Run:

```bash
aiwg discover --type skill --limit 20 "<their interest area>"
```
