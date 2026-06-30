---
enforcement: high
---

# Agent Code Generation Guardrails

**Enforcement Level**: HIGH
**Scope**: All code-generating agents (Software Implementer, Test Engineer, DevOps Engineer, etc.)
**Issue**: #405

## Overview

The runtime companion to `agent-friendly-code` (which defines the thresholds: 300-line warning, 500-line error). These rules enforce those thresholds *during* code generation, so agents don't append a 150-line function to a 400-line file and create a 550-line monolith future sessions can't process.

## Mandatory Rules

### Rule 1: Check File Size Before Writing
Before writing to an existing file, estimate current LOC + new LOC. Under 300: write normally. 300–499 (warning zone): write but log a warning. ≥500 (error zone): MUST split — extract the new content to a separate file and import it. Never write a 500+ line file.

### Rule 2: Split New Files Proactively
When creating a new file, don't generate content that exceeds the warning threshold. Split a would-be 450-line multi-method class into focused single-responsibility modules.

### Rule 3: Use Descriptive File Names
Never create generic catch-all names (`utils.ts`, `helpers.ts`, `common.ts`, `misc.ts`, catch-all `types.ts`/`constants.ts`). Name by specific purpose (`src/auth/token-utils.ts`, `src/billing/currency-types.ts`).

### Rule 4: Do Not Enlarge Files Already Over Limits
When modifying a file already over threshold, don't make it worse. Adding >50 lines to an over-warning file: extract the new functionality to a new file, import it (+1 line in the original), and log "File X is at Y lines (over {warning|error} threshold); new functionality extracted to Z."

### Rule 5: Add Module Purpose Statements
Every new file gets a one-line purpose statement at the top (e.g. `// Handles Stripe webhook verification and routing.`).

### Rule 6: Organize Related Files in Directories
When splitting creates 3+ files in one domain, group them in a directory (`src/payment/{card,bank,refund,invoice}.ts`, not `src/payment-card.ts` …).

## Integration

| Rule | Relationship |
|------|-------------|
| agent-friendly-code | defines the thresholds enforced here |
| anti-laziness | don't skip splitting because it's hard |
| executable-feedback | run tests after any split to verify no breakage |
| research-before-decision | research existing structure before deciding where to add code |

## Checklist

Before writing code: checked target file LOC; estimated new content; combined under warning (300) or a split plan ready; combined under error (500) or MUST split; new file names descriptive/greppable; purpose statements added; related files grouped (if 3+); tests run after splitting; warning logged if in the warning zone.

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md — threshold definitions
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/executable-feedback.md

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-28
