# Scheduled docs

Future docs posts live here until the release workflow promotes them into the live docs tree. This keeps draft or queued material out of normal docsite builds.

- Blog posts: `scheduled-docs/blog/*.md`
- Required frontmatter: `publish_at` as an ISO-8601 timestamp when ready to release
- Blank, missing, or invalid `publish_at` values are ignored
- Promotion script: `tools/docs/promote-scheduled-posts.mjs`
- Release workflow: `.gitea/workflows/scheduled-docs-release.yml`

When a post is due, the workflow moves it to `docs/blog/`, updates the blog manifests, validates the docsite build, commits the promotion, and pushes to `main`.
