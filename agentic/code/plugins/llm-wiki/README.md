# LLM Wiki

An LLM-maintained markdown wiki that compounds as sources are ingested. Thin topology declaration on the semantic memory kernel — ships schema profiles and page templates, no custom mechanics.

## What It Is

LLM Wiki provides the directory layout, page templates, and lint rules for building a persistent knowledge base maintained by an LLM. You drop raw sources in, the LLM derives wiki pages (summaries, entities, concepts, synthesis), and cross-references accumulate over time via `[[wikilink]]` links.

No custom agents, no special commands. The value is the schema topology and five domain-specific page templates for use cases not covered by pre-packaged frameworks.

## Installation

```bash
aiwg use llm-wiki
```

Requires the `semantic-memory` dependency.

## Quick Start

1. **Ingest a source** — drop a file into `.aiwg/wiki/raw/`:
   ```bash
   cp my-notes.md .aiwg/wiki/raw/
   ```

2. **Derive pages** — ask the LLM to process raw sources into wiki pages:
   ```
   "Process raw sources into wiki pages"
   ```

3. **Query** — ask questions against the wiki:
   ```
   "What do we know about X?"
   ```

4. **Capture synthesis** — create cross-cutting synthesis pages:
   ```
   "Synthesize everything we know about X and Y"
   ```

5. **Lint** — validate wiki integrity:
   ```
   "Lint the wiki for broken links and orphans"
   ```

## Topology Profiles

Each profile ships a page template tuned for its domain:

| Profile | Template | Use Case |
|---------|----------|----------|
| `book-companion` | `templates/book-companion.md` | Characters, themes, plot threads, quotes |
| `personal` | `templates/personal.md` | Goals, projects, journal entries, insights |
| `research-deep-dive` | `templates/research-deep-dive.md` | Evolving thesis, key sources, open questions |
| `business-team` | `templates/business-team.md` | Meeting notes, decisions, action items |
| `generic` | `templates/generic.md` | Minimal default for any domain |

Set the active profile in `.aiwg/aiwg.config`:
```json
{ "llm-wiki": { "topologyProfile": "book-companion" } }
```

## Directory Layout

```
.aiwg/wiki/
├── raw/           # Ingested source material
├── summaries/     # Summary pages derived from sources
├── entities/      # Entity pages (people, places, concepts)
├── concepts/      # Concept pages (themes, patterns, ideas)
├── synthesis/     # Cross-cutting synthesis pages
├── index.md       # Auto-generated wiki index
└── .log.jsonl     # Ingestion and derivation log
```

## Cross-References

All cross-references use Obsidian-native `[[wikilink]]` syntax, not `@-mention`. This makes the wiki directly browsable in Obsidian, Logseq, or any wikilink-aware editor.

## Further Reading

- [Getting Started](docs/getting-started.md)
- [Obsidian Integration](docs/obsidian-integration.md)
- [Page Schema](schemas/page-schema.md)
