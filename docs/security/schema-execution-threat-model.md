# Schema execution threat model

## Scope and trust boundaries

Schemas, catalog records, fixtures, dependency locks, generated validators, and
projections are executable supply-chain inputs. Repository review is the trust
boundary for canonical schemas and policy. Runtime validators may consume
untrusted instances, but must not retrieve schemas from the network.

## Threats and controls

| Threat | Failure mode | Required control | Verification |
|---|---|---|---|
| Reference substitution | A remote `$ref` changes after review | Resolve only cataloged local resources or digest-locked dependencies; deny ambient network loading | Missing refs fail `lint:schemas`; dependency lock entries require URI, dialect, source, version, and SHA-256 |
| Namespace collision | Two authorities claim one `$id` | Enforce unique IDs; classify intentional copies as projections | Duplicate-ID diagnostic |
| Malicious regex or format | Catastrophic backtracking or unsafe custom code | Use reviewed formats only; prohibit executable custom formats in catalog policy; bound validation time at runtime | Strict unknown-format diagnostic and adversarial runtime tests |
| Resource exhaustion | Deep, large, cyclic schemas or instances consume CPU/memory | Bound schema bytes, reference depth, instance depth, and error count at runtime | Limit fixtures and runtime tests |
| Diagnostic leakage | Values, secrets, or filesystem locations appear in errors | Emit stable codes and paths, never instance values; redact boundary context | Diagnostic snapshot tests |
| Projection tampering | A generated mirror diverges from its authority | Declare every projection and verify its source and output digests before publication | Projection-integrity gate |
| Undeclared-schema bypass | A contract is added outside governed discovery | Compare repository inventory with catalog records and fail unregistered canonical resources | Inventory-completeness diagnostic and JSON report |
| Exception persistence | A temporary relaxation becomes permanent | Require exact resource/rule, owner, rationale, approver, and expiry | Invalid or expired exceptions fail lint |

## Security invariants

- Network reference resolution is denied in lint, build, publication, and runtime paths.
- Dependency identities include URI, dialect, source, version, and digest.
- `$id` values identify one authority; copies are projections, not authorities.
- Strict validation is the default. Relaxations are narrow and expire.
- Publication must verify canonical, dependency, and projection digests.
- Resource limits apply before compilation and instance validation.

## Incident response

On suspected substitution or projection drift, stop publication, preserve the
catalog and lockfile digests, identify affected consumers from the catalog,
invalidate generated outputs, and rebuild projections from the reviewed
authority. A changed dependency digest requires an explicit lock update and
review; it is never accepted through automatic network refresh.
