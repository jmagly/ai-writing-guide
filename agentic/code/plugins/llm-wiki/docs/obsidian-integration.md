# Obsidian Integration

LLM Wiki uses `[[wikilink]]` cross-references natively, making the `.aiwg/wiki/` directory directly browsable in Obsidian.

## Vault Setup

Open `.aiwg/wiki/` as an Obsidian vault (or add it as a folder within an existing vault). All derived pages and cross-references will render immediately.

## Web Clipper for Raw Source Ingestion

The Obsidian Web Clipper browser extension can save web pages directly into `.aiwg/wiki/raw/`:

1. Install the Obsidian Web Clipper extension for your browser.
2. Configure the default save location to `.aiwg/wiki/raw/`.
3. Clip articles, blog posts, or documentation pages.
4. Ask the LLM to process new raw sources into wiki pages.

This creates a low-friction pipeline: clip from browser, derive wiki pages via LLM, browse the result in Obsidian.

## Attachment Folder Configuration

For sources with images, configure Obsidian to download attachments locally:

1. Open Settings > Files and Links.
2. Set "Default location for new attachments" to "In subfolder under current folder".
3. Set the subfolder name to `_assets`.

This keeps images co-located with wiki pages and avoids broken image links.

## Graph View

Obsidian's graph view visualizes the wiki topology:

- **Summaries** cluster around their raw sources.
- **Entity pages** form hubs with many inbound links.
- **Synthesis pages** bridge otherwise disconnected clusters.
- **Orphan pages** appear as isolated nodes — candidates for the orphan-detection lint rule.

Use graph filters to color-code by `type` frontmatter field (summary, entity, concept, synthesis).

## Dataview for Dynamic Tables

The Dataview community plugin queries page frontmatter to build dynamic tables:

```dataview
TABLE author, reading-status, rating
FROM ".aiwg/wiki"
WHERE type = "book-companion"
SORT rating DESC
```

```dataview
TABLE project, decision-status, date
FROM ".aiwg/wiki"
WHERE type = "business-team" AND category = "decision"
SORT date DESC
```

Dataview turns the wiki's structured frontmatter into queryable dashboards without manual maintenance.

## Marp for Slide Decks

Convert wiki pages into presentations using Marp:

1. Install the Marp plugin or use the Marp CLI.
2. Add `marp: true` to the frontmatter of a synthesis or summary page.
3. Use `---` horizontal rules as slide separators.
4. Export to PDF or HTML for sharing.

This is useful for turning research deep dives or meeting summaries into shareable decks.

## Recommended Hotkeys

| Action | Suggested Binding | Purpose |
|--------|------------------|---------|
| Quick Switcher | `Cmd/Ctrl+O` | Jump to any wiki page by name |
| Toggle Graph View | `Cmd/Ctrl+G` | Visualize wiki topology |
| Insert Wikilink | `[[` | Cross-reference another page |
| Open in New Pane | `Cmd/Ctrl+Click` | Side-by-side page comparison |
| Search Vault | `Cmd/Ctrl+Shift+F` | Full-text search across all pages |
| Toggle Dataview | — | Refresh dynamic tables |
