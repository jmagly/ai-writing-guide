# Dataset source adapter SDK

AIWG source adapters observe datasets. They do not select an index, persistence backend, embedding model, or canonical storage policy. The control plane retains ownership of dataset identity, reviewed schemas, processing plans, policy decisions, run evidence, and commit receipts.

## Contract and lifecycle

Every adapter publishes an `aiwg.dataset.adapter/v1` manifest with an immutable identity and version, package digest, source kinds, contract compatibility range, governed configuration/record/checkpoint schemas, declared limits, maturity, publisher and trust state, permissions, and incremental semantics. Loading is allowlist-driven through `AdapterRegistry`; untrusted packages are denied unless the embedding application deliberately enables its isolation path.

The lifecycle is `describe → configure → check → discover → preview → read`:

- `describe` returns only immutable metadata.
- `configure` validates data and returns a digest-bound copy. Secret-like keys accept locator objects only; no operation resolves environment variables or credential material.
- `check`, `discover`, and `preview` are cancellation-aware, bounded observations. They never emit or advance a checkpoint.
- `discover` labels schema claims as declared, observed, or inferred and reports estimates, privacy/license signals, identity stability, checkpoint support, and limitations. Inference is never promoted to reviewed authority.
- `read` is an async iterable. It emits deterministic record identities and only emits a checkpoint after the bounded stream completes. An incompatible checkpoint fails before the first record.

Diagnostics use stable `ADAPTER_*` codes. Messages deliberately exclude raw configuration, response bodies, credentials, and exception details.

## Built-in adapters

| Adapter | Source | Boundary |
|---|---|---|
| `aiwg.adapter.file` | one regular UTF-8 file | explicit root; byte and record limits |
| `aiwg.adapter.directory` | deterministic lexical traversal | no traversal, symlinks, or special files; depth/count/byte limits |
| `aiwg.adapter.jsonl` | one JSON value per non-empty line | malformed records fail with schema-drift diagnostics |
| `aiwg.adapter.csv` | line-oriented CSV with quoted commas and doubled quotes | bounded line streaming and stable ordinals; multiline fields require a specialized adapter |
| `aiwg.adapter.http` | one bounded HTTPS response | exact host allowlist, private-address denial, redirect revalidation, timeout and response limits, explicit offline refusal |

Local adapters require `allowedRoot` and reject lexical and physical scope escape. HTTP access is deny-by-default: the caller must disable offline mode and supply exact allowed hosts. URL credentials, secret-valued headers, loopback/private/link-local addresses, and redirect escape are refused.

## Checkpoints and changes

Reference adapters order records by ascending ordinal and use the logical record digest as the deterministic tie. A checkpoint binds the exact adapter ID/version, source identity, and checkpoint schema ID/version/digest. A source revision or incompatible adapter/schema version is rejected before reads. Reference adapters do not infer tombstones; a source format must carry explicit delete semantics or a specialized adapter must declare them.

## Qualification

Run the executable qualification kit:

```bash
npx tsx tools/qualification/dataset-source-adapters.ts
```

The report binds adapter version and package digest, schema bindings, fixture revision, cells, and evidence. Required cells cover configuration/schema agreement, preview purity, deterministic reads, stable errors, cancellation, checkpoints, upgrades, and secret leakage. `stableEligible` remains false unless all required cells pass and at least one native, real-source cell passes; mocks alone cannot establish stable maturity.

The canonical schema is `schemas/dataset/source-adapter.v1.schema.json`. Integrators should import the public API from `aiwg`; private `dist/` paths are not supported.
