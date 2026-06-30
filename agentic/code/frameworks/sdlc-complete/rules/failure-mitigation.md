---
enforcement: high
---

# Failure Archetype Mitigation Rules

**Enforcement Level**: HIGH
**Scope**: All agent operations and content generation
**Research Basis**: REF-002 Failures in Deployed LLM Systems
**Issue**: #140

## Overview

Agents MUST apply the per-type mitigations below for each LLM failure archetype. Match claim strength and response severity to evidence; never present low-quality output as authoritative.

## Archetypes and Mitigations

### 1. Hallucination

| Type | Mitigation |
|------|-----------|
| Fabricated citations | Verify REF-XXX exist before citing |
| Made-up statistics | Require a source for all numeric claims |
| False attributions | Cross-check author/source claims |
| Invented APIs | Validate against real docs |
| Phantom requirements | Verify UC-XXX/US-XXX exist before referencing |

### 2. Context Handling

| Type | Mitigation |
|------|-----------|
| Context truncation | Summarize long contexts; preserve key facts |
| Context confusion | Separate distinct contexts cleanly |
| Lost constraints | Re-state constraints in output |
| Scope drift | Explicitly bound the scope |
| Ignored instructions | Echo back key instructions |

### 3. Instruction Following

| Type | Mitigation |
|------|-----------|
| Partial execution | Checklist all requested items |
| Misinterpretation | Confirm understanding before execution |
| Overriding preferences | Respect explicit preferences |
| Unrequested features | Generate only what was asked |
| Ignoring constraints | Track + apply all stated constraints |

### 4. Safety and Bias

| Type | Mitigation |
|------|-----------|
| Harmful content | Apply content safety filters |
| Bias amplification | Use diverse examples/perspectives |
| Privacy violations | Redact PII; keep confidentiality |
| Security vulnerabilities | Security-check generated code |
| Ethical violations | Apply ethical guidelines |

### 5. Technical Errors

| Type | Mitigation |
|------|-----------|
| Syntax errors | Validate syntax before output |
| Logic errors | Test the logic |
| Version mismatches | Check current versions |
| Dependency issues | Verify packages exist |
| Platform incompatibility | Check platform reqs |

### 6. Consistency

| Type | Mitigation |
|------|-----------|
| Self-contradiction | Track claims; check conflicts |
| Style inconsistency | Apply consistent voice/style |
| Format inconsistency | Use templates |
| Naming inconsistency | Maintain naming conventions |
| Temporal inconsistency | Track + validate timelines |

## Detection Strategies

- **Pre-generation** — flag risk conditions (context >50k tokens, complex multi-part request, unfamiliar domain, conflicting constraints); mitigate by summarizing, sub-tasking, clarifying, surfacing conflicts.
- **During-generation** — on any warning sign (unknown references, instruction deviation, self-contradiction, scope creep): pause and verify, backtrack, request clarification.
- **Post-generation** — validate: refs exist, links valid, stats sourced; no self-contradictions; style/format consistent; instructions/constraints applied; no truncation.

Wire these checks into HITL gates per phase: inception (scope/constraint/requirement clarity), elaboration (hallucinations, consistency, completeness), construction (technical errors, security, code consistency), transition (doc accuracy, test coverage, deploy readiness).

## Severity Classification

| Severity | Impact | Response |
|----------|--------|----------|
| Critical | Data loss, security breach, harmful output | Block; require human review |
| High | Incorrect functionality, significant misinformation | Block; auto-fix; flag for review |
| Medium | Minor errors, style issues | Warn; suggest fixes |
| Low | Cosmetic issues | Log for improvement |

## Agent Protocol — Every Agent MUST

1. **Before generation**: load relevant validation context.
2. **During generation**: monitor for warning signs.
3. **After generation**: run failure detection checks.
4. **On detection**: classify (archetype + severity), then apply the severity-appropriate response above.
5. **Report**: log all detected issues (record + track patterns); track failure rates to catch regressions.

## References

- @.aiwg/research/findings/REF-002-failures-in-deployed-llm.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/research/hallucination-detection.yaml
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/hitl-gates.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml
- #140

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
