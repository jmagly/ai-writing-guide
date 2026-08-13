# Generated Docs Discoverability Audit

The local generated-docs auditor compares every published URL class against one reviewed source graph. It detects drift across human HTML, Markdown exports, crawler controls, search indexing, model-readable documentation, structured data, and API specifications before publication.

## Run locally or in CI

Place `docs-discoverability.json` in the generated site root, then run:

```bash
npm run docs:discoverability:audit -- \
  --root ./dist/site \
  --json \
  --out ./test-results/docs-discoverability.json
```

The command exits `1` when any check fails and `2` for invalid input or execution errors. Warnings do not fail the command. Use `--no-fail` only for an explicit report-only pass, and `--now <ISO-8601>` for reproducible freshness tests.

## Source graph

The source graph declares artifacts, URL classes, generated files, publication expectations, and drift thresholds:

```json
{
  "schema": "aiwg.docs-discoverability/v1",
  "baseUrl": "https://docs.example.com/",
  "artifacts": {
    "llms": "llms.txt",
    "llmsFull": "llms-full.txt",
    "sitemap": "sitemap.xml",
    "robots": "robots.txt"
  },
  "thresholds": {
    "thinWords": 80,
    "staleDays": 90,
    "nearDuplicate": 0.82,
    "doorwayMinPages": 3,
    "doorwaySimilarity": 0.75
  },
  "pages": [
    {
      "url": "/api/",
      "urlClass": "api",
      "html": "api/index.html",
      "markdown": "api/index.md",
      "generatedAt": "2026-08-13T00:00:00Z",
      "expected": {
        "crawl": true,
        "index": true,
        "ai": true,
        "structuredData": true,
        "apiSpec": true
      }
    }
  ]
}
```

URLs are site-relative and file paths are relative to `--root`. Canonical URLs are derived from `baseUrl` plus each declared URL. Pages that set `structuredData` or `apiSpec` to `false` receive a `not-applicable` result for that check.

## Checks and severity

The auditor validates:

- HTML and Markdown exports;
- `sitemap.xml` membership against crawl expectations;
- canonical tags;
- `robots.txt` and per-page `noindex` behavior;
- both `llms.txt` and `llms-full.txt`, including undeclared links;
- JSON-LD structured data;
- linked OpenAPI 3 specifications;
- internal-link orphans;
- thin, stale, and near-duplicate pages; and
- doorway-shaped URL classes with many highly similar pages.

Missing or contradictory publication controls are `fail`. Quality and drift risks such as orphans, thin pages, stale output, near-duplicates, and doorway sets are `warn`. Satisfied checks are `pass`; checks outside a URL's declared role are `not-applicable`.

The report includes a crawl, index, and AI-discoverability status for every URL class plus individual evidence-bearing findings.

## Scope boundary

This public core utility audits a local static site and writes a local matrix. It does not crawl hosted sites, publish private API documentation, manage search or AI crawler policy, or coordinate governance across multiple sites. Those are separate enterprise governance candidates and are not implied by a local pass.
