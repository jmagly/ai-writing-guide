---
namespace: aiwg
platforms: [all]
name: generated-docs-audit
description: Audit generated HTML, Markdown, crawler controls, model-readable docs, structured data, API specs, and URL-class drift from one local source graph.
triggers:
  - audit generated docs discoverability
  - check llms txt sitemap drift
  - generated docs crawl index matrix
commandHint:
  argumentHint: "--root <generated-site> [--graph <source-graph>] [--json] [--out <report>]"
  allowedTools: Read, Bash
  category: documentation-quality
---

# Generated Docs Audit

Run the CI-friendly local auditor:

```bash
npm run docs:discoverability:audit -- --root <generated-site> --json
```

Use a reviewed `aiwg.docs-discoverability/v1` source graph. Treat failed crawl, index, or AI-discoverability controls as release blockers; review warnings for orphan, thin, stale, near-duplicate, and doorway-shaped output.

Do not present a local pass as hosted or multi-site governance. See `docs/guides/generated-docs-discoverability-audit.md` for the graph schema, severity rules, and public/enterprise boundary.
