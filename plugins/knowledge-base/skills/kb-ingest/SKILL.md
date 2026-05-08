---
namespace: aiwg
platforms: [all]
name: kb-ingest
description: Ingest a source (URL, file, or freeform note) into the knowledge base. Creates a source summary and updates or creates relevant entity and concept pages.
commandHint:
  argumentHint: "<source> [--topic <tag>] [--kb <path>] [--dry-run]"
  allowedTools: Read, Write, Glob, Grep, Bash, WebFetch, WebSearch
  model: sonnet
  category: knowledge-base
---

# KB Ingest

Ingest any source — a URL, local file, or freeform note — into the knowledge base. Produces a source summary, then creates or updates entity and concept pages with new information.

## Triggers

- "ingest this article" → fetch URL and ingest
- "add to KB: ..." → treat the text as a freeform note
- "summarize this book and add it to my KB" → ingest file or freeform content
- `/kb-ingest <source>` → direct invocation

## Parameters

### `<source>` (required)

| Format | Behavior |
|--------|----------|
| `https://...` | Fetch with WebFetch, extract content |
| File path | Read the file directly |
| Quoted text | Treat as freeform note or paste |

### `--topic <tag>` (optional)
Tag this source with a topic hint (e.g., `--topic "machine-learning"`). Influences which entity/concept pages to touch.

### `--kb <path>` (optional)
Root of the knowledge base. **Default**: resolved by `aiwg kb path` (#965), which reads `resolveStorage('kb')` and honors any `roots.kb` override in `.aiwg/storage.config`. On the default `fs` backend this is `.aiwg/kb/`. To redirect the KB to an Obsidian vault or other backend without changing this skill, configure `.aiwg/storage.config` (#934).

When this skill needs to resolve the root from inside a Bash step:

```bash
KB_ROOT=$(aiwg kb path)
# write a page through the adapter (preferred — honors all backends):
echo "# Foo" | aiwg kb put entities/foo.md
# or write directly to the resolved fs path (fs backend only):
echo "# Foo" > "$KB_ROOT/entities/foo.md"
```

### `--dry-run` (optional)
Show what would be created or updated without writing files.

---

## Execution Flow

### Phase 1: Acquire Content

1. Resolve the source type (URL, file, freeform text).
2. For URLs: fetch with WebFetch. Extract title, author, date, and body text.
3. For files: read directly. Infer type from extension or content.
4. For freeform text: treat as a note; title defaults to first sentence (truncated to 60 chars).

### Phase 2: Summarize

Using the source-summary template at `$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/source-summary.md`:

- Extract 3–7 key takeaways
- Identify notable quotes (verbatim, with location if available)
- Write a 2–5 sentence summary
- Note strengths and weaknesses

Determine the slug: lowercase title, spaces to hyphens, strip punctuation.
Save to: `<kb>/sources/<slug>.md`

### Phase 3: Identify Entities and Concepts

Scan the source content for:
- Named entities (people, tools, companies, places, products)
- Concepts, techniques, patterns, or frameworks mentioned

For each identified item:
1. Check whether a page already exists in `<kb>/entities/` or `<kb>/concepts/`.
2. If it exists: read the current page, add new facts or sources if not already present.
3. If it does not exist: create a new page from the appropriate template.

Use the entity-page template for discrete things.
Use the concept-page template for ideas and techniques.

### Phase 4: Cross-Link

In the new source summary, populate the **Connections** section with `[[wiki-links]]` to pages touched.
In each touched entity/concept page, add the source to the **Sources** table.

### Phase 5: Report

```
KB Ingest complete

Source summary: .aiwg/kb/sources/article-slug.md
Pages created:
  + .aiwg/kb/entities/person-name.md
  + .aiwg/kb/concepts/technique-name.md
Pages updated:
  ~ .aiwg/kb/entities/existing-entity.md  (added source)

Next steps:
  - Review created pages and fill placeholder sections
  - Run /kb-health to check for orphan pages
```

---

## Scope Limits

- Create or update at most 5 entity/concept pages per ingest run. If more are identified, list them in the report as "candidates for future pages" rather than creating stubs automatically.
- Do not fetch URLs found within the source content. Ingest one source at a time.
- Do not remove or overwrite existing content in updated pages — only append to Sources tables and add missing facts clearly marked with the source.

## References

- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/source-summary.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/entity-page.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/templates/concept-page.md
- @$AIWG_ROOT/agentic/code/frameworks/knowledge-base/skills/kb-health/SKILL.md
