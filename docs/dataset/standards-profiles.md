# Dataset standards profiles

AIWG standards profiles are governed adapters around the canonical dataset
contracts and run ledger. They are not alternate identity authorities. Callers
must select a standard and exact version; `latest`, compatible-version fallback,
and silent upgrades are deliberately unsupported.

## Supported profiles

| Profile | Direction | Tested coverage | Deliberate boundary |
|---|---|---|---|
| `w3c-prov-json/20130430` | round trip | Entity, Activity, Agent, derivation, generation, usage, attribution, association, and correction (`alternateOf`) | PROV-JSON core subset only; bundles and qualified relations are not claimed |
| `openlineage/1.0.0` | round trip | Job, Run, Dataset inputs/outputs, lifecycle time/state, failure facet recognition, and column-lineage facet recognition | One RunEvent at a time; arbitrary facets are reported rather than claimed as mapped |
| `dcat/3.0` | descriptor only | none | Discovery use case recorded; no adapter or conformance claim |
| `croissant/1.0` | descriptor only | none | ML dataset metadata use case recorded; no adapter or conformance claim |
| `data-package/2.0` | descriptor only | none | Tabular packaging use case recorded; no adapter or conformance claim |
| `ro-crate/1.1` | descriptor only | none | Research-object packaging use case recorded; no adapter or conformance claim |

Descriptor-only entries make future demand visible without implying that AIWG
can import, export, or validate those formats. Each must acquire its own schema,
golden fixtures, adapter, loss policy, and tests before its maturity changes.

## Library use

```ts
import { importStandard, exportStandard } from 'aiwg'

const imported = importStandard('openlineage', '1.0.0', runEvent)
const exported = exportStandard('w3c-prov-json', '2013-04-30', imported.value)
```

Every conversion returns the selected profile identity, converted value, a
SHA-256 binding to the canonicalized source, and a loss report. Loss items use
one of five categories: `mapped`, `omitted`, `synthesized`, `unsupported`, or
`extension-carried`. Counts are included for automation. Imported relationships
always have `basis: imported`; external claims can never become observed AIWG
execution evidence merely by being imported.

Unsupported versions and capabilities are stable typed diagnostics:
`DATASET_STANDARD_UNSUPPORTED_VERSION` and
`DATASET_STANDARD_UNSUPPORTED_CAPABILITY`. Invalid input/output, reserved
namespace collisions, and identity conflicts have distinct codes as well.

## Extensions and policy fields

Each descriptor owns an immutable HTTPS namespace below
`https://aiwg.io/ns/dataset-standards/`. The PROV and OpenLineage profiles report
unknown extensions outside their
coverage. A document using another profile's reserved AIWG namespace is
rejected. Security classification, rights, licensing, retention, and privacy are
never silently downgraded into an external representation: they are explicitly
omitted/reported and remain policy decisions.

## Conformance

The checked-in external fixtures validate against the governed profile schemas,
and round-trip tests cover only the fields advertised by each descriptor.
These schemas define AIWG's supported, version-specific subset; they are not a
claim of complete conformance to every construct in the upstream standards.
Local tests provide no live Fortemi Server evidence. Any cross-repository live
cell must bind AIWG and Fortemi commits, package/profile/schema versions, and
fixture digests in its receipt, and remains gated by the infrastructure and
authorization controls tracked separately.
