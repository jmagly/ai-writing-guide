# Network analysis maintainer guide

The addon separates schemas, runtime enforcement, source-distributed workflows,
framework handoffs, and conformance evidence so each boundary can evolve without
silently weakening another.

## Source map

| Surface | Canonical location |
| --- | --- |
| Runtime API | `src/network-analysis/` and `src/network-analysis/index.ts` |
| Public exports | `src/index.ts` and generated `dist/src/network-analysis/` declarations |
| Contracts | `schemas/network-analysis/*.schema.json` |
| Schema catalog | `schemas/catalog/domains/network-analysis.json` |
| Addon workflow | `agentic/code/addons/network-analysis/` |
| Framework handoffs | `agentic/code/frameworks/*/docs/` and templates |
| Synthetic corpus | `test/fixtures/network-analysis/` |
| Release conformance | `test/conformance/network-analysis-v1/` |
| Architecture and controls | `docs/architecture/network-analysis.md`, `docs/security/network-analysis-*` |

The runtime exports probing, recipe compilation, bounded offline analysis,
evidence serialization/citations, Termshark handoff, research induction,
forensic mapping, and SDLC/Ops comparison helpers. Keep subprocess calls on
absolute executable paths, argument arrays, `shell: false`, isolated config,
and explicit bounds.

## Recipe maintenance

Every recipe is a complete `network-analysis.analysis-recipe/v1` document.
When adding or changing one:

1. use only fields present in a checked probe inventory;
2. state direct observations separately from heuristics and list false-positive
   conditions;
3. keep metadata-only limits and stable locator requirements explicit;
4. define optional-field behavior and fail closed for a missing required field
   or unsupported major;
5. add a deterministic synthetic fixture or excerpt only when it proves new
   behavior without importing sensitive traffic;
6. update the catalog, unit tests, conformance report, and operator docs.

Reserved Zeek and Suricata extension points do not authorize an adapter.
Adapters must produce the existing evidence contract, preserve source/tool
identity, and pass the same disclosure, retention, and conformance gates.

## Schema and API compatibility

The v1 JSON Schemas are additive contracts. Optional properties and enum values
may be added only after consumer tests show unknown-value handling. Removing or
renaming a property, changing meaning, weakening a bound, or making an optional
property required needs a new schema identity and migration guide.

Runtime exports follow the repository CalVer release. A proposed removal must:

- ship a documented replacement first;
- add an explicit deprecation notice and migration example;
- remain supported through at least two stable releases and 90 days;
- retain fixture and consumer coverage during the window;
- record the removal release in both this addon's changelog and root changelog.

Tool compatibility is feature-detected. Do not extend a version range from a
version string alone. Qualify required formats, statistics, fields, synthetic
read behavior, and resource limits on every declared maintained line. Update
the dated [compatibility matrix](https://github.com/jmagly/aiwg/blob/main/docs/network-analysis/compatibility.md)
and fixture provenance together.

## Fixture authoring

Run the deterministic generator and the dedicated conformance target:

```bash
node test/fixtures/network-analysis/generate-fixtures.mjs
npm run test:conformance:network-analysis
```

Review `manifest.v1.json` for source license, purpose, expected classification,
size, and SHA-256. Confirm regeneration produces no diff. Fixtures must be
synthetic, tiny, redistributable, and free of real identifiers, secrets, or
payloads. Invalid-format fixtures should isolate one failure mode.

Installed-TShark qualification remains an explicit conditional test and must
report a skip when the executable is absent. It must never start live capture.

## Documentation and integration maintenance

Keep the addon README, operator guide, compatibility matrix, schema index,
recipe catalog, integration index, public addon page, root addon catalog, and
third-party notices aligned. Examples must be exercised by a test or generated
from the deterministic fixture corpus. At every disclosure or viewer step,
place privacy, retention, and cleanup guidance beside the action.

Framework ownership remains stable: research owns source quality and synthesis;
the existing forensics network analyst owns investigative conclusions; security
owns control findings; SDLC and Ops own verification and change decisions. The
[integration index](integrations.md) maps these contracts.

## Package and release gate

Before release, complete [the release checklist](release-checklist.md). The
integration suite round-trips representative project-scoped deployments and
the provider conformance suite covers the user-scoped adapters named by the manifest.
The package smoke test parses `npm pack --dry-run --json` and verifies the addon,
runtime JavaScript, public declarations, schemas, compatibility docs, framework
handoffs, notices, and conformance report are present while packet-tool binaries
and raw captures are absent.
