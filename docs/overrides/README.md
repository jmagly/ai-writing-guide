# AIWG open-kit docs theme

AIWG documentation is published with
[Pagenary](https://www.npmjs.com/package/@pagenary/publisher). This directory
adds the AIWG open-kit visual identity without replacing Pagenary's component
stylesheet.

| File | Role |
| --- | --- |
| `index.html` | Accessible application shell and AIWG site navigation |
| `open-kit.css` | Additive design-token and component overrides loaded after Pagenary's `styles.css` |
| `code-copy.js` | Progressive copy controls for standalone SEO snapshots that do not load Pagenary's application runtime |

The previous terminal-console theme is preserved as `aiwg-terminal` in the
[Pagenary Styles catalog](https://github.com/jmagly/pagenary-styles). Its
manifest records the originating commit and SHA-256 hashes for every archived
file.

## Upgrade contract

Pagenary owns `styles.css`, `app.js`, and all `.doc-*`, `.pe-*`, navigation,
search, sharing, and export behavior. AIWG only supplies the shell and an
additive stylesheet. New Pagenary components therefore inherit usable base
styles even before an AIWG-specific treatment is added.

`tools/docs/write-blog-static-pages.mjs` also links `open-kit.css` and the
standalone `code-copy.js` enhancement from every SEO snapshot after Pagenary
builds it. Keep that post-build step in both validation and deployment
workflows so direct and crawler-discovered routes receive the same visual
system and copy affordance. The underlying code stays selectable when
JavaScript is unavailable.

When upgrading Pagenary:

1. Build the `aiwg-docs` tenant.
2. Verify the shell IDs consumed by `app.js`: `app`, `nav`, `year`,
   `mobileMenuToggle`, `commandToggle`, `commandPalette`, `commandInput`,
   `commandList`, `shareBtn`, and `exportBtn`.
3. Check keyboard search, mobile navigation, sharing, export, code copy,
   Fortemi metadata, docs maps, and blog pages.
4. Run `test/contract/docsite-theme.test.mjs` and the docsite build workflow.

## Build locally

```bash
node tools/docs/build-public-source.mjs
npx pagenary build:tenants aiwg-docs
node tools/docs/write-blog-static-pages.mjs dist/aiwg-docs
```
