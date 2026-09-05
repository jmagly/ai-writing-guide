# Dataset Intelligence conformance

Dataset Intelligence uses one versioned matrix and one receipt vocabulary for
fast repository-local tests, pinned AIWG/Fortemi interoperability, and
separately authorized live qualification. A missing environment is never a
passing or skipped cell: the result is `pending` with a stable diagnostic.

## Trust boundary

The conformance manifest binds each cell to a fixture revision and digest, its
required capabilities, source and runtime classes, resource envelope, maturity
implication, and evidence kinds. The receipt binds the exact AIWG and optional
Fortemi commits, package and schema digests, fixture set, configuration, and
observed results. Observation timestamps remain in the receipt but are excluded
from the canonical result digest.

Fixtures contain only synthetic data. Tests must not enumerate environment
variables, resolve real credentials, contact public SSRF targets, or record
credential material. Controlled HTTP cases use injected fetch and DNS behavior.
Fortemi Server recovery and load cells require the independent authorization,
isolated tenant, endpoint, server version, and resource envelope tracked by
#2194.

## Maturity rules

- Stable adapter/backend claims require a real-source or runtime cell; mocks
  alone cannot qualify them.
- Required capability mismatch fails closed. Optional fallback is acceptable
  only when the degradation is visible in both the plan and receipt.
- Every qualified or stable cell must pass before `stableEligible` is true.
  Experimental prior-version and live-server cells may remain pending, but are
  reported rather than omitted.
- Native evidence-bearing lineage is compared before any legacy dependency
  graph projection. Any projection loss requires a loss receipt.

## Commands

```bash
npm run test:conformance:dataset
npm run qualify:dataset -- --mode local \
  --manifest test/fixtures/dataset-intelligence/v1/manifest.json \
  --report test-results/dataset-conformance.json
npm run verify:dataset-conformance -- \
  --manifest test/fixtures/dataset-intelligence/v1/manifest.json \
  --verify test-results/dataset-conformance.json
```

Cross-repository qualification requires an exact clean Fortemi checkout:

```bash
npm run qualify:dataset -- --mode cross-repo \
  --fortemi-checkout /path/to/fortemi-react \
  --fortemi-commit <40-hex-commit> \
  --report test-results/dataset-cross-repo.json
```

Live Fortemi Server work begins with the read-only contract preflight:

```bash
npm run qualify:dataset:fortemi-live
```

The durable execution procedure and Community/Enterprise boundary are defined
in the [Fortemi live dataset UAT plan](uat/fortemi-live-dataset-uat-plan.md).
Until the authority contract tracked by Fortemi Server issue #1128 is
available, the live dataset cell remains pending rather than passing or being
skipped.

The repository-local cells execute the canonical Dataset Orchestration Service
for capability negotiation, replay, checkpoint boundaries, verified offline
cache behavior, and provenance. Cross-repository mode executes the focused
Fortemi capability, ingest, lineage, and materialization suites from an exact
clean commit and binds that commit and lockfile digest into the receipt.
Prior-version migration remains pending until a stable predecessor exists, and
Fortemi Server remains pending without the separately authorized execution
window and controlled infrastructure. Neither pending cell is silently skipped.
