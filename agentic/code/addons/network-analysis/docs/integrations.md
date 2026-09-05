# Network analysis integration index

The `PacketEvidenceBundle` is the provider-neutral handoff. It carries source
and derived digests, analyzer and recipe provenance, explicit sensitivity and
disclosure state, errors and limitations, and stable frame or context-bound
stream locators. Integrations consume that contract; they do not reinterpret
raw capture bytes or bypass addon policy.

| Framework | Canonical guide | Ownership boundary |
| --- | --- | --- |
| Research Complete | `agentic/code/frameworks/research-complete/docs/packet-evidence.md` | Inducts a non-scholarly observational source with digest-bound locators; GRADE is not applied to raw packet evidence. |
| Forensics Complete | `agentic/code/frameworks/forensics-complete/docs/packet-evidence-integration.md` | Adds custody/provenance and hands observations to the existing Network Analyst for investigative judgment. |
| Security Engineering | `agentic/code/frameworks/security-engineering/docs/network-control-review.md` | Maps curated observations to review contexts while keeping control findings and ATT&CK claims explicit. |
| SDLC Complete | `agentic/code/frameworks/sdlc-complete/templates/test/packet-evidence-test-plan.md` | Plans reproducible network verification with comparable environments and non-causal wording. |
| Ops Complete | `agentic/code/frameworks/ops-complete/docs/packet-verification.md` | Uses evidence in runbooks, change verification, and audit trails with partial/incomparable states preserved. |

Only sanitized derived evidence may enter a framework. Raw captures and payload
remain excluded unless an exact local authorization and policy allow them;
provider transfer always requires a separate disclosure decision. Each handoff
retains retention, redaction, cleanup, authority, and limitation fields.
