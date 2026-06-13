# ADR: Marketplace UX-Agent Sourcing — Adoption Gate + AIWG UX Team First

**Status**: Proposed
**Phase**: Elaboration
**Related**: @.aiwg/ux/cockpit-ux-design.md, @.aiwg/security/cockpit-threat-model.md (E3, I5, T3), @.aiwg/risks/cockpit-risk-register.md (X4), rules: browser-control-safety (precedent), dependency-source-policy, ci-action-pinning, respect-repo-access-manifest

## Reasoning

1. **Context analysis**: The brief calls for locating and pulling in good UX-based agents from the Claude agent marketplace to help build the interface — but external agent code is a supply-chain + privilege surface (threat-model E3/I5/T3).
2. **Force identification**: leverage best-in-class external UX agents vs. license/quality/security liability; speed vs. trust.
3. **Option evaluation**: below.
4. **Decision justification**: prefer AIWG's own UX team where parity exists; admit external marketplace agents only through an explicit adoption gate; sandbox all UX agents to display/interaction scope.
5. **Consequence assessment**: a small process cost per adopted agent, far cheaper than a compromised UX-agent incident.

## Context

AIWG already ships UX agents: **Product Designer, UX Lead, Frontend Specialist, Accessibility Specialist, Art Director**. The Claude agent marketplace offers additional UX/design agents of varying quality and provenance.

## Decision

1. **AIWG UX team first**: use AIWG's own UX agents for the core design work (IA, screens, a11y, frontend patterns). They are already vetted and in-scope.
2. **External marketplace agents pass an Adoption Gate before integration** — documented per candidate:
   - **License** compatible with AIWG distribution.
   - **Quality** review (does it produce usable, on-brand UX guidance?).
   - **Security** review: static analysis of any code/permissions; the agent is **sandboxed to display/interaction scope** (cannot reach dispatch/core endpoints — E3); strict CSP `connect-src 'self'` blocks exfiltration (I5); `respect-repo-access-manifest` enforced.
   - **Supply-chain pinning**: content-hash pin per `dependency-source-policy` + `ci-action-pinning`; any hash change re-triggers the gate (T3).
3. **Provenance**: any action taken by an adopted agent is audit-tagged `agent:<name>@<hash>` (NFR-08 / threat-model R2), never attributed to the operator.

## Options considered

| Option | Verdict |
|---|---|
| A. Pull marketplace UX agents freely | ✗ License/quality/security liability (X4); supply-chain risk (T3) |
| B. **AIWG UX team first; external agents only via Adoption Gate + sandbox + pinning** | ✓ **Chosen** — value with bounded trust surface |
| C. No external agents at all | ~ Safe but forgoes the brief's "locate good UX agents" intent |

## Consequences

- **Positive**: leverages both AIWG's vetted UX team and the marketplace, with a defensible trust boundary (mirrors `browser-control-safety` precedent for external code + local UI surface).
- **Negative / accepted**: per-agent adoption overhead; some attractive marketplace agents may be rejected on license/security grounds. The first external-agent adoption is a tracked Elaboration deliverable (X4).
