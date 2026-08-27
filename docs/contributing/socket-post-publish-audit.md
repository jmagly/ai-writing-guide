# Socket post-publish audit

AIWG captures Socket package-analysis evidence after npm trusted publishing succeeds. This is a separate, fail-closed evidence workflow: it does not weaken or replace npm provenance, release signatures, or any pre-publish gate.

## What is evaluated

The workflow evaluates both published entry points, `aiwg` and `@aiwg/cli`, at the exact release version. It inventories the published dependency tree plus every explicitly configured npm and Cargo lockfile, queries every resolved package version, and records findings in two groups:

- **direct** — alerts and category scores on the two AIWG packages;
- **transitive** — alerts on packages reached through their runtime dependency tree.

Category scores are compared independently with [`ci/socket-score-baseline.json`](../../ci/socket-score-baseline.json). A score drop of 0.10 or greater triggers review. Scanner scoring models can evolve, so a score change is evidence to investigate—not authorization to remove or degrade a supported capability.

Intentional capability alerts require a review record containing a rationale, owner, review date, expiry date, and a condition that triggers early revalidation. Expired records fail the audit. Unreviewed high or critical alerts also fail.

## Failure and unavailable states

The workflow never converts missing evidence into a clean result. Missing credentials, HTTP errors, rate limits after bounded retries, malformed responses, delayed scans, `pendingScan`, `notFound`, and missing requested packages produce an `unavailable` report and a failed workflow.

Every run uploads JSON and Markdown reports even when evaluation fails. Reports contain alert metadata but never include the API token.

Each finding is bound to the scanned commit and carries one provenance record per matching workspace: manifest path, lockfile path, SHA-256 lock digest, package ecosystem, and dependency path. Repeated package/artifact/rule findings collapse into one record with all affected paths. Because the query is derived from current locks, removed packages disappear on the next successful scan instead of surviving as stale root findings.

Behavioral findings fail closed unless the scanner supplies the artifact hash, file location, detector/rule identifier, an excerpt or behavior trace, and a confidence rationale. Code-shape-only obfuscation is informational unless provenance or behavior evidence establishes security impact. Accept-risk reviews require a rationale and the exact artifact hash; a materially different artifact is therefore reviewed again.

Export validation rejects duplicate finding IDs, CVE findings without advisory identifiers, vulnerability findings without advisory URLs, and patched-version guidance that points outside the observed major release line. The configured organization name is rendered in the report rather than a hard-coded label.

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
  --dependency-lock /path/to/published-tree/package-lock.json \
  --dependency-lock package-lock.json \
  --dependency-lock tools/eval/package-lock.json \
  --dependency-lock apps/cockpit/desktop/src-tauri/Cargo.lock \
  --commit "$(git rev-parse HEAD)" \
  --organization "Integro Labs"
```

Use `--input path/to/results.ndjson` instead of credentials for deterministic fixture evaluation. A passing result exits 0, a policy failure exits 1, and unavailable evidence exits 2.
