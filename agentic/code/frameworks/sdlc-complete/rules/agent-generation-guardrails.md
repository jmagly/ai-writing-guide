---
enforcement: high
---

# Agent Code Generation Guardrails

**Enforcement Level**: HIGH
**Scope**: All code-generating agents (Software Implementer, Test Engineer, DevOps Engineer, etc.)
**Issue**: #405

## Overview

Agents generating code do not check whether the file they are writing to is already too large. An agent will write a 400-line function into an already 300-line file, creating a 700-line monolith. Future agent sessions then struggle to process this file, creating a vicious cycle.

The agent-friendly-code rule defines thresholds. This rule is the **runtime companion** that enforces those thresholds during code generation itself.

## Mandatory Rules

### Rule 1: Check File Size Before Writing

Before writing to an existing file, check its current size. If the combined size would exceed thresholds, split.

**FORBIDDEN**:
```typescript
// Agent appends 150 lines to a 400-line file without checking
// Result: 550-line file exceeding the 500-line error threshold
```

**REQUIRED**:
```
Before writing:
1. Current file: 400 lines
2. New content: 150 lines
3. Combined: 550 lines → EXCEEDS error threshold (500)
4. ACTION: Extract new functionality to a separate file
```

**Decision Flow**:
```
┌─────────────────────────────────────────────────────────┐
│ Agent wants to write to file X                          │
├─────────────────────────────────────────────────────────┤
│ 1. Check current LOC of file X                          │
│ 2. Estimate LOC of new content                          │
│                                                         │
│ IF current + new < 300 (warning)                        │
│   → Write normally                                      │
│                                                         │
│ IF current + new >= 300 AND < 500 (warning zone)        │
│   → Write, but log warning:                             │
│     "File X is at Y lines, approaching agent-friendly   │
│      limit of 500"                                      │
│                                                         │
│ IF current + new >= 500 (error zone)                    │
│   → MUST split: extract new content to a new file       │
│   → Import from the new file                            │
│   → Do NOT write a 500+ line file                       │
└─────────────────────────────────────────────────────────┘
```

### Rule 2: Split New Files Proactively

When creating new files, do not generate content that exceeds the warning threshold.

**FORBIDDEN**:
```typescript
// Agent generates a single 450-line file
// src/services/payment-processor.ts (450 lines)
export class PaymentProcessor {
  async processCard() { /* 80 lines */ }
  async processBank() { /* 90 lines */ }
  async handleRefund() { /* 70 lines */ }
  async generateInvoice() { /* 100 lines */ }
  async reconcilePayments() { /* 110 lines */ }
}
```

**REQUIRED**:
```typescript
// Agent splits into focused modules
// src/services/card-payment.ts (80 lines)
export async function processCard() { /* ... */ }

// src/services/bank-payment.ts (90 lines)
export async function processBank() { /* ... */ }

// src/services/refund-handler.ts (70 lines)
export async function handleRefund() { /* ... */ }

// src/services/invoice-generator.ts (100 lines)
export async function generateInvoice() { /* ... */ }

// src/services/payment-reconciler.ts (110 lines)
export async function reconcilePayments() { /* ... */ }
```

### Rule 3: Use Descriptive File Names

Never create files with generic names. Every file name must indicate its specific purpose.

**FORBIDDEN**:
```
src/utils.ts
src/helpers.ts
src/common.ts
src/misc.ts
src/types.ts      (catch-all)
src/constants.ts  (catch-all)
```

**REQUIRED**:
```
src/auth/token-utils.ts
src/email/template-helpers.ts
src/billing/currency-types.ts
src/api/rate-limit-constants.ts
```

### Rule 4: Do Not Enlarge Files Already Over Limits

When modifying a file that already exceeds thresholds, do not make it worse.

**FORBIDDEN**:
```
File src/legacy/monolith.ts is currently 620 lines.
Agent adds 80 more lines of new functionality.
Result: 700 lines — made worse.
```

**REQUIRED**:
```
File src/legacy/monolith.ts is currently 620 lines.
Agent creates src/legacy/new-feature.ts (80 lines) for the new functionality.
Agent adds import statement to monolith.ts (+1 line).
Result: monolith.ts at 621 lines (not significantly worse), new code in focused file.
```

**When adding > 50 lines of new functionality to any file already over warning threshold**:
1. Extract the new functionality to a new file
2. Import and call from the existing file
3. Log: "File X is at Y lines (over {warning|error} threshold). New functionality extracted to Z."

### Rule 5: Add Module Purpose Statements

Every new file must include a one-line purpose statement at the top.

**REQUIRED**:
```typescript
// Handles Stripe webhook event verification and routing to internal handlers.

import Stripe from 'stripe';
// ... rest of file
```

```python
"""Validates API request payloads against OpenAPI schema definitions."""

from jsonschema import validate
# ... rest of file
```

### Rule 6: Organize Related Files in Directories

When splitting creates 3+ files in the same domain, group them in a directory.

**FORBIDDEN**:
```
src/payment-card.ts
src/payment-bank.ts
src/payment-refund.ts
src/payment-invoice.ts
src/payment-reconcile.ts
```

**REQUIRED**:
```
src/payment/
  card.ts
  bank.ts
  refund.ts
  invoice.ts
  reconcile.ts
```

## Few-Shot Examples

### Example 1: Guardrail Triggers on Append

**Scenario**: Agent is asked to add pagination to an API module.

```
Agent reads src/api/routes.ts → 280 lines
Agent estimates pagination code → ~60 lines
Combined: 340 lines → EXCEEDS warning threshold (300)

Agent decision: Extract pagination to src/api/pagination.ts
  - src/api/pagination.ts (60 lines) — new file
  - src/api/routes.ts (285 lines) — adds import + 5 lines of wiring

Both files under warning threshold. ✓
```

### Example 2: Guardrail Blocks Large File Creation

**Scenario**: Agent is asked to implement a complete authentication system.

```
Agent estimates total code → ~380 lines
Single file would exceed warning threshold (300)

Agent decision: Split by responsibility
  - src/auth/password-auth.ts (90 lines)
  - src/auth/oauth-provider.ts (120 lines)
  - src/auth/session-manager.ts (85 lines)
  - src/auth/auth-middleware.ts (85 lines)

All files under warning threshold. ✓
```

### Example 3: Existing Large File

**Scenario**: Agent needs to add a method to a 450-line file.

```
Agent reads src/services/user-service.ts → 450 lines (in warning zone)
Agent needs to add getUserPreferences() → ~40 lines
Combined: 490 lines → still under error threshold but deep in warning zone

Agent decision: Extract to separate file
  - src/services/user-preferences.ts (40 lines) — new file
  - src/services/user-service.ts (452 lines) — adds import + 2 lines

New functionality is isolated; existing file not significantly enlarged. ✓
Log: "File user-service.ts is at 450 lines, approaching agent-friendly limit of 500.
      New functionality extracted to user-preferences.ts."
```

## Warning Messages

Agents should emit warnings when approaching or exceeding thresholds:

```
⚠ File src/api/routes.ts is at 285 lines, approaching agent-friendly limit of 300.
  Consider extracting new functionality to a separate module.

⚠ File src/services/user-service.ts is at 450 lines, in agent-friendly warning zone (300-500).
  New functionality extracted to src/services/user-preferences.ts.

🚫 File src/legacy/monolith.ts is at 620 lines, exceeding agent-friendly error threshold (500).
  MUST extract new code to a separate file. Do not enlarge this file.
```

## Integration Points

| Rule | Relationship |
|------|-------------|
| agent-friendly-code | Defines the thresholds this rule enforces at runtime |
| anti-laziness | Do not skip splitting because it is hard — follow through |
| executable-feedback | Run tests after any file splitting to verify no breakage |
| research-before-decision | Research existing file structure before deciding where to add code |

## Checklist

Before writing any code:

- [ ] Checked target file size (LOC)
- [ ] Estimated new content size
- [ ] Combined size is under warning threshold (300) — or split plan ready
- [ ] Combined size is under error threshold (500) — or MUST split
- [ ] New file names are descriptive and greppable
- [ ] New files have purpose statements
- [ ] Related files grouped in directories (if 3+)
- [ ] Tests run after any splitting
- [ ] Warning logged if file is in warning zone

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-friendly-code.md — Threshold definitions
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md — Don't skip the hard work
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/executable-feedback.md — Test after splitting

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-28
