# Network analysis construction security gate

- Status: Ready for operator approval
- Version: 1.0
- Date: 2026-09-05
- Governing issue: #2279
- Parent: #2269

Approval of this gate permits construction against the controls below. It does
not authorize live packet capture, payload disclosure, or provider transfer.
Each such operation still needs the corresponding machine-enforceable record.

## Required evidence

| Gate | Pass condition | Evidence | Status |
| --- | --- | --- | --- |
| G1 Threat coverage | Threat model covers unauthorized interception, elevation, injection, malicious capture/dissectors, leakage, deanonymization, tampering, and denial of service | `docs/security/network-analysis-threat-model.md` NA-T01–NA-T09 | Ready |
| G2 Classification | Raw capture/payload is Restricted and metadata privacy risk is documented | Threat model data-classification table | Ready |
| G3 Live authority | Interface, BPF filter, duration, byte/file bounds, destination, retention, actors, issuance and expiry are mandatory and exact | governance schema plus `assertLiveCaptureAuthorized` | Ready |
| G4 Safe execution | Absolute executable and argument array are required; shell is false; filter types remain distinct | `safeProcessSpec`, `tsharkFilterArgs`, NA-ST03 | Ready |
| G5 Disclosure defaults | Offline, metadata-only, payload-deny and provider-deny defaults are executable | `DEFAULT_NETWORK_ANALYSIS_POLICY`, NA-ST01/NA-ST04 | Ready |
| G6 Provider decision | Transfer requires a separate digest/provider/purpose/content/field/actor/expiry decision | governance schema plus `assertProviderTransferAllowed` | Ready |
| G7 Evidence integrity | Source is regular/non-symlink, hashed and re-verifiable; derivatives are independently hashed | `hashEvidenceFile`, `verifyEvidenceFile`, NA-ST05 | Ready |
| G8 Resource bounds | Probe/analyzer/capture apply time, byte, file and output bounds and fail closed | probe tests; analyzer must satisfy NA-ST07 | Ready for analyzer enforcement |
| G9 Tool trust | Trusted absolute path, actual version/capabilities and isolated config are recorded | #2271 probe report and tests | Ready |
| G10 Verification | Schema lint, focused tests, typecheck, build, secret/diff review and CI pass | #2279 issue delivery evidence | Local checks ready; CI pending commit |

## Mandatory use by implementation issue

| Issue | Required gates before closure |
| --- | --- |
| #2272 addon scaffold | G4, G5, G8, G9; expose policy entry points without live capture |
| #2280 authorization and audit | G2–G7; serialize decisions and preserve actors/timestamps |
| #2273 offline analyzer | G4–G9; re-verify source and hash every derivative |
| #2274 recipe catalog | G2, G4, G5, G8; safe fields and metadata-only defaults |
| #2275 Termshark handoff | G2, G4, G5; no TUI scraping or implicit payload display |
| #2276 framework adapters | G2, G5–G7; propagate citations, sensitivity, redaction, and disclosure |
| #2277 onboarding/docs | G1–G9; no unsafe quick-start or implicit capture instructions |
| #2278 release/CI | G1–G10; all tests and package checks pass |
| #2281 fixtures/validation | G2, G7, G8, G10; synthetic sanitized captures and deterministic failures |

## Approval record

The operator must approve this exact version after G10 has evidence. Record the
approver, timestamp, document digest, and decision on #2279. Any material change
to a gate resets the status to Proposed and requires a new approval.
