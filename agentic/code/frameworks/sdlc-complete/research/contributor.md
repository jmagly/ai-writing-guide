---
kind: research
domain: SDLC artifacts
description: Validates SAD, ADRs, use cases, and NFRs against current architectural and engineering practice
detect:
  glob:
    - ".aiwg/architecture/*.md"
    - ".aiwg/architecture/decisions/ADR-*.md"
    - ".aiwg/requirements/UC-*.md"
    - ".aiwg/requirements/NFR-*.md"
  minCount: 1
focus_areas:
  - architecture
  - security
  - performance
  - api-design
  - testing
  - observability
  - scalability
sources:
  preferred:
    - ietf
    - w3c
    - owasp
    - cloud-vendor-docs
    - conference-talks
    - academic
  exclude:
    - seo-spam
    - ai-content-farms
recency_default_months: 18
---

# SDLC Research Contributor

When the SDLC framework is in use (detected via the presence of architecture
documents, ADRs, use cases, or NFRs), `best-practices-audit` should weight
its research toward sources that have authority on architectural and
engineering decisions.

## What This Contributor Configures

### Focus Areas

The seven focus areas above represent the typical decision domains in
SDLC artifacts:

| Area | Typical artifact |
|------|------------------|
| `architecture` | SAD, component diagrams, deployment views |
| `security` | threat models, security gates, ADRs touching auth/encryption |
| `performance` | NFRs, performance test plans, capacity ADRs |
| `api-design` | OpenAPI/AsyncAPI specs, contract tests |
| `testing` | test strategy, master test plan, coverage reports |
| `observability` | tracing/logging/metrics ADRs |
| `scalability` | NFRs, load test reports, scaling ADRs |

When the user passes `--focus <area>`, the audit intersects that with this
list. If `--focus` is omitted, all seven are in scope.

### Source Preferences

**Preferred** (high-trust for SDLC):

- `ietf` — RFCs for protocols and interop
- `w3c` — web standards for frontends and APIs
- `owasp` — security best practices, ASVS, threat modeling
- `cloud-vendor-docs` — AWS/GCP/Azure/etc. architecture guides; vendor docs
  are authoritative for their own services
- `conference-talks` — recorded sessions from peer-reviewed venues
  (KubeCon, P99 Conf, RustConf, ...)
- `academic` — peer-reviewed papers when the topic is researchable

**Excluded**:

- `seo-spam` — content-farm articles optimized for search rather than
  technical accuracy
- `ai-content-farms` — sites that auto-generate "tutorials" with hallucinated
  code examples

### Recency Default

18 months. Architecture practice moves slowly enough that a 12-month window
loses important signal (e.g. recent practitioner consolidation), but a
36-month window pulls in advice that may be obsolete on fast-moving
substrates (CDK, GraphQL gateways, runtime updates).

For ADRs touching specific dependency versions, the audit should tighten
to 6–12 months automatically — but that's an audit-time decision, not a
contributor configuration.

## Anti-Pattern Reminders

- Do not collapse all SDLC research into one focus area. The audit's
  per-area fan-out produces better signal-to-noise than one giant query.
- Do not include framework-specific sources here. If a project uses
  React or Postgres, that's a `--framework` flag at audit time, not a
  contributor configuration.
- Do not surface dissent by default — only when the user passes
  `--dissent`. Surfacing dissent in every audit creates report noise.
