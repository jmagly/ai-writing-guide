# Blog Draft QA - 2026-06-22

**Issues**: #1582, #1583
**Status**: Approval hold
**Scope**: Draft QA only. No promotion to `docs/blog/` and no docsite publication changes.

## Assets Checked

| Issue | Draft | Hero asset | Result |
|---|---|---|---|
| #1582 | `.aiwg/marketing/social/blog-drafts/2026-6-declarative-yaml-flows-cross-stack-missions.md` | `.aiwg/marketing/social/blog-drafts/assets/2026-6-declarative-yaml-flows-cross-stack-missions.png` | Approval-ready draft, held |
| #1583 | `.aiwg/marketing/social/blog-drafts/2026-6-research-corpus-learned-to-think.md` | `.aiwg/marketing/social/blog-drafts/assets/2026-6-research-corpus-learned-to-think.png` | Approval-ready draft, held |

## QA Summary

| Check | #1582 | #1583 | Notes |
|---|---:|---:|---|
| Frontmatter present | Pass | Pass | Title, slug, date, summary, hero, reading time, status, canonical, pillar, audience, refs, and tags present. |
| Pillar matches issue | Pass | Pass | Both use `pillar: "2 how/why"`. |
| Tools & transparency section | Pass | Pass | Both include a final disclosure section with tools, generation, fact-check, imagery, and human pass notes. |
| Hero asset present | Pass | Pass | Both PNG assets exist at 1672x941. |
| Publication hold preserved | Pass | Pass | Drafts remain outside `docs/blog/`; search found no published docsite copy for either slug. |
| Metadata state | Pass | Pass | Draft frontmatter now uses `status: "review"` while held outside the publish tree. |

## Approval Workflow State

Per the tracker comments on #1582 and #1583, both posts are waiting on human editorial approval before promotion into `docs/blog/`. The next publish step is intentionally gated:

1. Human approves the draft content and hero assets.
2. Promote the Markdown files to `docs/blog/`.
3. Promote hero assets to `docs/.public/blog/`.
4. Restore any required docsite manifest/nav entries.
5. Run strict docsite validation/link checks.
6. Close the corresponding issue after publication evidence exists.

## Recommendation

Keep both issues open until editorial approval is recorded. No technical blocker remains in the drafts themselves; the remaining blocker is publication authorization.
