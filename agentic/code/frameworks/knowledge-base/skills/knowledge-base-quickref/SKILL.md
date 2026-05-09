---
name: knowledge-base-quickref
namespace: aiwg
platforms: [all]
kernel: true
description: Knowledge-base framework quick reference — semantic-memory-backed wiki/KB ingestion and health, plus llm-wiki addon profiles
---

# Knowledge Base Framework — Quick Reference

You are operating in a project that has the AIWG **knowledge-base** framework installed. This skill is your always-loaded directory for KB / wiki workflows. The full surface is reachable through the AIWG artifact index.

## What this framework is for

A **thin topology** on top of AIWG's semantic-memory kernel — turning any project's `.aiwg/kb/` into a queryable knowledge base. Sources get ingested into structured pages (entities, concepts, summaries, syntheses) with cross-references, deduplication, and lint coverage. Pairs naturally with the `llm-wiki` addon for Obsidian-compatible profiles (book-companion / personal / research-deep-dive / business-team / generic).

## When to reach for which skill

| Need | Skill |
|---|---|
| Ingest a source (URL / file / note) into the KB | `kb-ingest` |
| Health-check the KB (orphan pages, broken refs) | `kb-health` |

This framework ships **2 skills** — both load-bearing for the KB lifecycle. Most of the heavy lifting comes from the **semantic-memory kernel** (`memory-ingest`, `memory-lint`, `memory-query-capture`, `memory-log-append`, `memory-log-render`) which is in the always-on aiwg-utils kernel set, not this framework.

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

## Profiles via the `llm-wiki` addon

Reach for `llm-wiki` to pick a topology profile:

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

## Finding the right skill when this quickref doesn't list it

```bash
aiwg index discover "<phrase>"
```

The KB framework is small (2 skills) but the kernel semantic-memory skills sit alongside it (5 skills). For ingest-related asks, the right entry is usually `kb-ingest` (KB-shaped) or `memory-ingest` (kernel-direct, any consumer's semantic memory).

## Common multi-skill flows

- **Ingest a URL**: `kb-ingest <url>` → derives entity/concept/summary pages → `memory-log-append` records event
- **Quarterly health check**: `kb-health` → fixes orphans, broken cross-refs, stale claims → regenerates index
- **Cross-corpus query**: use `aiwg index neighbors --graph kb --node <slug>` to traverse the KB graph

## Don't list from this skill — query the index

If a user asks "what KB skills are available?", **do not enumerate from memory**. Run `aiwg index discover --type skill --graph framework "knowledge"` and remind the user that the kernel semantic-memory skills (`memory-*`) are loaded independently.
