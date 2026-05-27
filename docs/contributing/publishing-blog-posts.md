# Publishing Blog Posts

`docs/blog/` in the `aiwg` repo is the **single source of truth** for AIWG blog content. You write a post once as markdown here; it builds to docs.aiwg.io, and aiwg.io sources the list from there. One place to write, one merge to publish — no hand-authored HTML on the website.

This page is the contract. The downstream consumer (aiwg.io) and the eventual pagenary auto-manifest are built against the conventions defined here.

## The model

```
docs/blog/<slug>.md (+ images)   ← authoritative content (this repo)
   │ pagenary build (.gitea/workflows/docsite-build.yml → docsite-deploy.yml)
   ▼
docs.aiwg.io/blog/<slug>          ← rendered post
docs.aiwg.io/blog/index.json      ← manifest (hand-maintained today; pagenary auto-gen tracked in pagenary#18)
   │ fetched at build by aiwg.io's vite-plugin-blog (aiwg.io#60)
   ▼
aiwg.io/blog                      ← public list, links to / mirrors docs.aiwg.io
```

The rule: **content is single-sourced in this repo**. The website never hand-authors a post; it reads the manifest and renders or links out.

## Where posts live

| Item | Location |
|------|----------|
| Post markdown | `docs/blog/<slug>.md` |
| Post images | `docs/blog/images/<file>.png` (co-located; referenced relatively from the post) |
| Manifest | `docs/blog/index.json` (hand-maintained; see [Manifest](#manifest)) |
| Section nav | `docs/blog/_manifest.json` + an entry in the top-level `docs/_manifest.json` `order` |

The `<slug>` is the URL slug and the markdown filename stem. Use the date-prefixed kebab form, e.g. `2026-5-how-aiwg-builds-your-system-prompt`. The slug must match the `slug:` frontmatter field exactly.

## Frontmatter spec

Every post opens with YAML frontmatter. The eight **required** fields are the manifest contract; optional fields carry extra provenance and are ignored by consumers that don't use them.

```yaml
---
title: "How AIWG builds your customized system prompt (and command set)"
slug: "2026-5-how-aiwg-builds-your-system-prompt"
date: "2026-05-26"
summary: "One or two sentences. Lead with the answer. This is what shows in the blog list and social cards."
hero: "./images/system-prompt.png"
reading_time: 5
status: "published"
canonical: "https://aiwg.io/blog/2026-5-how-aiwg-builds-your-system-prompt"
# --- optional (provenance / categorization) ---
pillar: "2 how/why"
audience: "developers customizing AI coding assistants across more than one tool"
aiwg_refs: ["aiwg use", "aiwg regenerate", "path-scoped rules"]
hashtags: ["AICoding", "DeveloperTools", "OpenSource"]
---
```

| Field | Required | Meaning |
|-------|----------|---------|
| `title` | yes | Post title. Also used as the rendered page `<h1>` (repeat it as a leading `# Title` in the body so pagenary derives the page title). |
| `slug` | yes | URL slug; must equal the filename stem. |
| `date` | yes | Publish date, `YYYY-MM-DD`. Drives manifest sort order (newest first). |
| `summary` | yes | 1–2 sentences for the list view, social cards, and SEO description. |
| `hero` | yes | Relative path to the hero image (`./images/<file>.png`). See [Images](#images). |
| `reading_time` | yes | Estimated minutes (integer). |
| `status` | yes | Lifecycle state — see [Status lifecycle](#status-lifecycle). Only `published` posts go in the manifest. |
| `canonical` | yes | The canonical URL for the post. Points to the public site (`https://aiwg.io/blog/<slug>`). |
| `pillar`, `audience`, `aiwg_refs`, `hashtags` | no | Categorization and provenance. Not part of the manifest contract. |

**Do not add an `authoring:` field or any AI-tool credit.** The repo-wide `no-attribution` rule applies to blog posts: tools don't sign their output.

> **Current pagenary limitation (verified against `@pagenary/publisher` 2026.5.1):** the docs build does not yet strip YAML frontmatter, so it renders as visible text at the top of the page (the same behavior as existing frontmatter-bearing docs pages such as `docs/project-local/overview.md`). Frontmatter is still required here — it is the convention and the input pagenary#18 will read to auto-emit the manifest. Clean rendering arrives with frontmatter-aware collection support (pagenary#18). Always repeat the title as a leading `# Title` so the page has a heading regardless.

## Images

Co-locate post images under `docs/blog/images/` and reference them with a relative path from the post (`![alt](./images/<file>.png)`). Embed the hero near the top of the body — the `hero:` frontmatter field is the machine-readable pointer, the inline `![…]` is what renders in the post body.

Keep heroes 16:9 and reasonably sized. Provide descriptive alt text (it is read by screen readers and used as a fallback).

> **Current pagenary limitation (verified against `@pagenary/publisher` 2026.5.1):** the docs build does **not** copy markdown-referenced co-located images into the output — only `docs/.public/` assets are copied. Post images (including the hero) therefore won't render on docs.aiwg.io until image passthrough lands (part of the collection work in pagenary#18). The source image still lives correctly in-repo and the manifest still points at the intended served URL; the rendered hero is provisional until then.

## Manifest

`docs/blog/index.json` is a **bare JSON array of published posts, sorted by `date` descending**. It is the stable, machine-readable endpoint aiwg.io consumes (`docs.aiwg.io/blog/index.json`). Each entry:

```json
[
  {
    "slug": "2026-5-how-aiwg-builds-your-system-prompt",
    "title": "How AIWG builds your customized system prompt (and command set)",
    "date": "2026-05-26",
    "summary": "AIWG doesn't ship one static system prompt. …",
    "hero": "https://docs.aiwg.io/blog/images/system-prompt.png",
    "reading_time": 5,
    "canonical": "https://aiwg.io/blog/2026-5-how-aiwg-builds-your-system-prompt",
    "path": "/blog/2026-5-how-aiwg-builds-your-system-prompt"
  }
]
```

| Manifest field | Source |
|----------------|--------|
| `slug`, `title`, `date`, `summary`, `reading_time`, `canonical` | Copied verbatim from the post frontmatter. |
| `hero` | **Absolute** docs.aiwg.io URL (the consumer fetches the manifest from another origin and needs a fully-qualified image URL — not the post-relative `./images/…`). |
| `path` | The rendered post path on docs.aiwg.io: `/blog/<slug>`. |

Rules for the manifest:

- **Only `status: published` posts appear.** Drafts and queued posts stay out of it (see the [roadmap](#companion-roadmap)).
- **Sort newest-first** by `date`.
- Hand-maintain it for now. pagenary collection support (auto-emit from frontmatter) is tracked in **pagenary#18**; when it lands, this file becomes generated and the hand-maintained copy retires.

> **Open dependency (pagenary#18), verified against `@pagenary/publisher` 2026.5.1:** the docs build does **not** currently pass static `.json` through to the output, so `docs.aiwg.io/blog/index.json` is **not yet served** — the hand-maintained file is committed and correct in-repo, but the served endpoint awaits pagenary collection/passthrough support (pagenary#18). aiwg.io's consumption (aiwg.io#60) is blocked on that endpoint going live. Treat the served `index.json` URL as provisional until pagenary#18 lands.

## Status lifecycle

`idea` → `outlined` → `drafted` → `reviewed` → `published`

A post should be `reviewed` (fact-checked, AI-pattern clean) before it becomes `published`. Only `published` enters `index.json`. You can commit a `drafted`/`reviewed` post to `docs/blog/` to build-check it without listing it publicly — just keep it out of the manifest.

## Adding a post

1. **Draft** the post (or migrate a reviewed draft). Write `docs/blog/<slug>.md` with the frontmatter above and a leading `# Title`.
2. **Add images** under `docs/blog/images/` and embed the hero near the top.
3. **Register nav**: add `<slug>` to `docs/blog/_manifest.json` `order`, and add `blog/<slug>` to the top-level `docs/_manifest.json` `order`.
4. **Update the manifest**: add the post's entry to `docs/blog/index.json` (newest-first) once `status: published`.
5. **Build-check locally** if you have the publisher:
   ```bash
   npm ci
   npx pagenary build:tenants aiwg-docs   # mirrors .gitea/workflows/docsite-build.yml
   ```
6. **Commit and merge.** This repo's delivery mode is `direct` (see `.aiwg/aiwg.config`): commit to `main` with a `Closes #<issue>` line; no PR. The `Docsite Build` workflow validates any `docs/**` change, and `docsite-deploy` publishes to docs.aiwg.io on push to `main`. aiwg.io picks up the new manifest entry on its next build.

## Publish flow at a glance

```
write docs/blog/<slug>.md  →  commit to main  →  Docsite Build (validate)  →  docsite-deploy (publish docs.aiwg.io)
                                                                                        │
                                                          aiwg.io vite-plugin-blog fetches index.json → aiwg.io/blog
```

## Companion roadmap

The first post (A9) is live. Four companion how-tos are reviewed and queued in `roctinam/social-orchestration` (`aiwg/articles/_work/C1–C4`), to be migrated as their own posts:

| ID | Working title | Target slug | Source draft |
|----|---------------|-------------|--------------|
| A10 | Build a custom agent in AIWG (with the smiths) | `2026-5-build-a-custom-agent-in-aiwg` | `_work/C1-build-a-custom-agent.md` |
| A11 | Scope rules to where they matter: `paths:` frontmatter | `2026-5-scope-rules-with-paths-frontmatter` | `_work/C2-scope-rules-with-paths.md` |
| A12 | Find anything in AIWG: discover then show | `2026-5-find-anything-discover-show` | `_work/C3-find-anything-discover-show.md` |
| A13 | One source, ten targets: deploy AIWG across your tools | `2026-5-one-source-ten-targets` | `_work/C4-one-source-ten-targets.md` |

Each follows this same process: migrate the markdown, copy/produce a hero, add nav entries, and append to `index.json` when published.

## Related

- `roctinam/aiwg.io#60` — website sources the blog from docs.aiwg.io (consumes `index.json`).
- `roctinam/pagenary#18` — collection manifest + feed support (retires the hand-maintained `index.json`).
- `roctinam/social-orchestration` — upstream article drafting and validation (`aiwg/articles/`).
