# Docs theme overrides (Pagenary)

AIWG's documentation site is built with the [Pagenary](https://www.npmjs.com/package/@pagenary/publisher)
static publisher, but AIWG **heavily re-skins** it into a terminal-console
aesthetic. These three files are the override surface:

| File | Replaces / augments | Purpose |
|------|---------------------|---------|
| `index.html` | Pagenary's root shell | Custom app shell, header/footer, brand mark |
| `styles.css` | Pagenary's stylesheet **entirely** | Full terminal theme; theme vars (`--ink`, `--surface`, `--grid-line`, `--accent`, `--muted`, `--font-mono`) |
| `terminal.js` | — (additive) | Wraps rendered sections in the `.log-entry` console pattern |

## Drift risk — read before upgrading Pagenary

Because `styles.css` **replaces** Pagenary's stylesheet rather than layering on
top of it, **any Pagenary UI component we don't explicitly re-style arrives
unstyled.** Unstyled components fall back to raw markup — e.g. an icon button
whose glyph is a bare text character, or a popover that renders inline in the
content flow instead of overlaying it.

When bumping `@pagenary/publisher`, audit the built site for new or renamed
components and re-adapt them here. Pagenary component classes are namespaced
`.doc-*` (e.g. `.doc-content`, `.doc-fortemi-*`, `.doc-summary`, `.doc-meta`).

### Components AIWG has re-styled

| Component | Classes | Notes |
|-----------|---------|-------|
| Fortemi page-metadata control | `.doc-fortemi-button`, `.doc-fortemi-tools`, `.doc-fortemi-panel`, `.doc-fortemi-chip`, `.doc-fortemi-row`, `.doc-fortemi-link` | Circular info icon (top-right of content) + anchored popover panel. **Only appears on sections that have Fortemi corpus metadata** — this is Pagenary behavior, not a bug, and is why the control is absent on some pages. See the "Fortemi" block in `styles.css`. |

If a Pagenary upgrade renames any `.doc-fortemi-*` class, the control reverts to
a bare inline "i" until re-adapted.

## Building / previewing locally

```bash
# Build the aiwg-docs tenant (registry at repo root: tenants.json → dist/aiwg-docs)
node node_modules/@pagenary/publisher/bin/pagenary.mjs build aiwg-docs --registry tenants.json

# Serve it (routes by /{tenant}/)
node node_modules/@pagenary/publisher/bin/pagenary.mjs serve --registry tenants.json
# → http://localhost:5173/aiwg-docs/
```
