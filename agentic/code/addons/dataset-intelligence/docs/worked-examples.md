# Dataset worked examples

These examples use the shipped lifecycle surface. Confirm the installed
surface with `aiwg dataset --help`.

## Local file or directory

Ask: “Make `./records/` searchable, cite the file and revision for every
result, keep processing local, and preview no more than 20 records.” The source
assessment should reject traversal outside the declared root, enumerate
symlink policy, propose a schema, and separate canonical files from the
regenerable index.

## CSV and JSONL

For `events.csv`, bind header names, delimiter, encoding, null rules, and a
stable record identity. For `events.jsonl`, bind one JSON value per line,
maximum line size, malformed-record policy, and the record schema. A preview
must report rejected rows without silently changing their shape.

## Authenticated API

Use an opaque locator such as `env:DATASET_API_TOKEN`; never place the token in
the source definition, plan, logs, preview, fixture, or receipt. Declare the
host allowlist, pagination and rate limits, retry policy, TLS requirements, and
checkpoint semantics. This guide deliberately provides no live-network command
or credential value.

## Incremental update

Bind the adapter version, source schema, plan digest, prior committed receipt,
and opaque cursor. Changed schema or plan identity requires a new reviewed
plan. Missing records are not deletions unless the approved source contract
defines tombstones.

## Offline operation

Require `network: offline` and a local adapter. A warm, verified cache may
answer a query for its bound revision. A cold, stale, corrupt, wrong-revision,
or unverifiable cache must not be presented as current. See [offline
states](offline-troubleshooting.md#offline-cache-states).

## Backend migration or rebuild

Preserve canonical sources and receipts, inventory derived artifacts, preview
the mapping and loss report, build the replacement beside the old backend, and
verify equivalent bounded queries before switching. Roll back by restoring the
old selection; do not copy a cache and call it canonical data.
