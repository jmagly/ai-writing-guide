# Threat-assessment signal crosswalk

This crosswalk is design inspiration and traceability. It is not a claim of
NIST, OWASP, or AgentSpec conformance.

| AIWG signal | Likelihood / impact intent | OWASP agentic mapping | NIST-informed control concern | Default enforcement |
|---|---|---|---|---|
| `instruction-override` | High likelihood and impact when requested behavior attempts to replace authority | ASI01 goal hijack; ASI09 trust exploitation | Map untrusted channels; protect instruction/authorization boundaries; measure injection cases | authorization; reject in dangerous combinations |
| `sensitive-file-target` | Moderate alone; higher when combined with execution or credentials | ASI03 privilege abuse; ASI04 supply chain; ASI05 execution | Access control, configuration management, secure development, audit | flag/authorization by profile |
| `third-party-execution` | High likelihood and impact at an action boundary | ASI02 tool misuse; ASI04 supply chain; ASI05 execution | Supplier provenance, secure development, pre-action gate | authorization; mandatory rejection in unsafe combinations |
| `floating-version` | Moderate; raises supply-chain uncertainty | ASI04 supply chain | Component integrity, approved sources, reproducible builds | flag; combination may reject |
| `credential-or-env-probing` | High severity; critical impact potential | ASI03 identity/privilege; ASI09 trust exploitation | Least privilege, secret handling, audit, data minimization | authorization alone; reject with execution/override/sensitive targeting |
| `pressure-without-evidence` | Low alone; useful trust-manipulation evidence | ASI09 trust exploitation | Calibrated reliance; evidence-based prioritization | record/flag by profile |
| `unverifiable-authority-claim` | Low alone; raises provenance uncertainty | ASI01 goal hijack; ASI09 trust exploitation | Source provenance and evidence validation | record/flag by profile |
| `security-framing-conflict` | Moderate signal that claimed purpose conflicts with requested mechanics | ASI04 supply chain; ASI09 trust exploitation | Govern purpose vs process; verify secure-development path | flag; combination may reject |

## Risk vocabulary

AIWG uses stable severities:

- `informational`: trace evidence with no expected interruption;
- `low`: weak or contextual concern;
- `moderate`: meaningful concern that stricter projects may gate;
- `high`: explicit authorization is appropriate under balanced policy;
- `critical`: unacceptable standalone risk under balanced policy.

Likelihood and impact use integers 1–5. The engine exposes their product and an
aggregate score for evaluation, but profiles and mandatory rules select the
action. This follows NIST's risk-informed tailoring model without presenting
the mapping as a NIST-prescribed formula.

## OWASP coverage boundary

The current content classifier directly covers:

- ASI01 goal hijack;
- ASI02 tool misuse;
- ASI03 identity and privilege abuse;
- ASI04 agentic supply chain;
- ASI05 unexpected code execution;
- ASI09 human-agent trust exploitation.

ASI06 memory/context poisoning is addressed when poisoned content enters one
of the declared surfaces. ASI07, ASI08, and ASI10 require additional runtime,
identity, containment, and monitoring controls and must not be claimed as
solved by text assessment.

## Research sources

- REF-1915: NIST AI RMF 1.0 and Generative AI Profile
- REF-1917: NIST cyber/privacy/SSDF/AML control baselines
- REF-1919: OWASP Top 10 for Agentic Applications
- REF-1619: AgentSpec
- REF-1514: Reason Less, Verify More
- REF-1517: From Prompts to Contracts
- REF-1412: Trust in Automation
- REF-1012: Indirect Prompt Injection
