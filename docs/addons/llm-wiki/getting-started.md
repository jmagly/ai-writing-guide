# Getting Started with LLM Wiki

## Install

```bash
aiwg use llm-wiki
```

This creates the `.aiwg/wiki/` directory structure and registers the addon.

## 1. Choose a Topology Profile

Set the profile that matches your use case in `.aiwg/aiwg.config`:

```json
{ "llm-wiki": { "topologyProfile": "personal" } }
```

Available profiles: `book-companion`, `personal`, `research-deep-dive`, `business-team`, `generic`.

## 2. Ingest Raw Sources

Drop files into `.aiwg/wiki/raw/`:

```bash
cp my-article.md .aiwg/wiki/raw/
cp meeting-transcript.txt .aiwg/wiki/raw/
```

Then ask the LLM to process them:

```
"Process new raw sources into wiki pages"
```

The LLM reads each raw source, extracts entities and concepts, and creates derived pages in the appropriate subdirectories using the active template.

## 3. Browse and Query

Ask questions against the accumulated wiki:

```
"What do we know about distributed consensus?"
"Summarize all decisions from last week"
"Which entities appear in multiple sources?"
```

## 4. Create Synthesis Pages

When you have enough material, ask for cross-cutting synthesis:

```
"Synthesize the relationship between X and Y across all sources"
```

Synthesis pages live in `.aiwg/wiki/synthesis/` and link back to their constituent pages.

## 5. Lint the Wiki

Validate wiki integrity periodically:

```
"Lint the wiki"
```

This runs four checks: broken `[[wikilinks]]`, incorrect `@-mention` usage, orphaned pages, and contradictions between pages.

## Directory Structure After Use

```
.aiwg/wiki/
├── raw/           # Your ingested source files
├── summaries/     # Source summaries
├── entities/      # People, places, things
├── concepts/      # Themes, patterns, ideas
├── synthesis/     # Cross-cutting analysis
├── index.md       # Auto-maintained wiki index
└── .log.jsonl     # Ingestion/derivation audit trail
```

## Next Steps

- Open `.aiwg/wiki/` in Obsidian for graph visualization — see [Obsidian Integration](obsidian-integration.md)
- Review the [Page Schema](../schemas/page-schema.md) for frontmatter requirements
