# Socket post-publish audit

AIWG captures Socket package-analysis evidence after npm trusted publishing succeeds. This is a separate, fail-closed evidence workflow: it does not weaken or replace npm provenance, release signatures, or any pre-publish gate.

## What is evaluated

The workflow evaluates both published entry points, `aiwg` and `@aiwg/cli`, at the exact release version. It builds a lockfile from those published packages, queries every resolved package version, and records findings in two groups:

- **direct** — alerts and category scores on the two AIWG packages;
- **transitive** — alerts on packages reached through their runtime dependency tree.

Category scores are compared independently with [`ci/socket-score-baseline.json`](../../ci/socket-score-baseline.json). A score drop of 0.10 or greater triggers review. Scanner scoring models can evolve, so a score change is evidence to investigate—not authorization to remove or degrade a supported capability.

Intentional capability alerts require a review record containing a rationale, owner, review date, expiry date, and a condition that triggers early revalidation. Expired records fail the audit. Unreviewed high or critical alerts also fail.

## Failure and unavailable states

The workflow never converts missing evidence into a clean result. Missing credentials, HTTP errors, rate limits after bounded retries, malformed responses, delayed scans, `pendingScan`, `notFound`, and missing requested packages produce an `unavailable` report and a failed workflow.

Every run uploads JSON and Markdown reports even when evaluation fails. Reports contain alert metadata but never include the API token.

## Repository configuration

Configure these values in the GitHub repository:

- secret `SOCKET_API_TOKEN`, restricted to Socket's `packages:list` scope;
- variable `SOCKET_ORG_SLUG`, containing the Socket organization slug.

The workflow uses Socket's organization-scoped batch PURL endpoint with polling enabled. Maintainers can rerun it manually for a published version after service recovery or review remediation.

## Local fixture or operator run

```bash
SOCKET_API_TOKEN=... SOCKET_ORG_SLUG=... \
node tools/release/socket-post-publish-audit.mjs \
  --version 2026.8.8 \
  --dependency-lock /path/to/published-tree/package-lock.json
```

Use `--input path/to/results.ndjson` instead of credentials for deterministic fixture evaluation. A passing result exits 0, a policy failure exits 1, and unavailable evidence exits 2.
