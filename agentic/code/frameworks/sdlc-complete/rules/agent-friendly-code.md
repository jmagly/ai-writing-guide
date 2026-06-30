---
enforcement: high
---

# Agent-Friendly Code Standards

**Enforcement Level**: HIGH
**Scope**: All code-generating agents
**Research Basis**: Codified Context (Vasilopoulos 2026), Long-Running AI Agents (Zylos 2026), Context Engineering (Fowler 2025)
**Issue**: #402

## Overview

Code that agents generate must remain consumable by agents in future sessions. Without explicit standards, agent-generated codebases grow into large, complex files that exceed context windows and degrade agent performance. This rule defines quantitative thresholds and qualitative patterns for agent-processable code.

Existing context-management rules (context-budget, subagent-scoping, rlm-context-management) govern agent behavior. This rule governs the **code agents produce** — ensuring it stays within manageable limits.

## Thresholds

### Quantitative Limits

| Metric | Warning | Error | Rationale |
|--------|---------|-------|-----------|
| File length (LOC) | 300 | 500 | Fits in context window with room for instructions and output |
| Function/method length | 30 lines | 50 lines | Reviewable in single read without scrolling |
| Nesting depth | 3 levels | 4 levels | Reduces cognitive and token complexity |
| Function parameters | 4 | 6 | Limits interface complexity |
| Cyclomatic complexity | 10 | 15 | Matches industry standards for maintainability |
| Module exports | 10 | 20 | Keeps module surfaces greppable |

### Configuring Thresholds

Thresholds are configurable via a CLAUDE.md directive:

```markdown
<!-- AIWG_CODE_THRESHOLDS: loc_warn=300 loc_error=500 func_warn=30 func_error=50 -->
```

Or via `.aiwg/config.yaml`:

```yaml
agent_friendly_code:
  thresholds:
    file_loc:
      warning: 300
      error: 500
    function_lines:
      warning: 30
      error: 50
    nesting_depth:
      warning: 3
      error: 4
    parameters:
      warning: 4
      error: 6
    cyclomatic_complexity:
      warning: 10
      error: 15
    module_exports:
      warning: 10
      error: 20
```

## Mandatory Rules

### Rule 1: Single Responsibility Per File

Each source file should address one concern. A file that handles both authentication and email sending should be two files.

**FORBIDDEN**:
```typescript
// user-service.ts (450 lines)
export class UserService {
  async authenticate(credentials) { /* 80 lines */ }
  async sendWelcomeEmail(user) { /* 60 lines */ }
  async syncToExternalCRM(user) { /* 90 lines */ }
  async generateReport(filters) { /* 120 lines */ }
  async processPayment(user, amount) { /* 100 lines */ }
}
```

**REQUIRED**:
```typescript
// auth-service.ts (~100 lines)
export class AuthService {
  async authenticate(credentials) { /* ... */ }
  async validateToken(token) { /* ... */ }
}

// email-service.ts (~80 lines)
export class EmailService {
  async sendWelcomeEmail(user) { /* ... */ }
}

// user-crm-sync.ts (~90 lines)
export class UserCrmSync {
  async syncToExternalCRM(user) { /* ... */ }
}
```

**Detection Patterns**:
- Files with more than 3 unrelated export groups
- Class names containing "and" or handling multiple domains
- Files requiring more than 5 import groups from different domains

### Rule 2: Descriptive, Greppable Names

File and function names must be specific enough to find with grep. Avoid generic names that match hundreds of results.

**FORBIDDEN**:
```
src/utils.ts
src/helpers.ts
src/misc.ts
src/common.ts
src/index.ts  (as a catch-all)
```

```typescript
function handle(data) { /* ... */ }
function process(input) { /* ... */ }
function doStuff(items) { /* ... */ }
```

**REQUIRED**:
```
src/auth/token-validator.ts
src/email/template-renderer.ts
src/billing/invoice-calculator.ts
```

```typescript
function validateAuthToken(token: string) { /* ... */ }
function renderEmailTemplate(template: Template, vars: Record<string, string>) { /* ... */ }
function calculateInvoiceTotal(lineItems: LineItem[]) { /* ... */ }
```

**Detection Patterns**:
- File names matching: `utils`, `helpers`, `misc`, `common`, `stuff`, `handler`
- Function names matching: `handle`, `process`, `do`, `run`, `execute` (without qualifier)

### Rule 3: Explicit Exports Over Barrel Files

Barrel files (`index.ts` that re-exports everything from a directory) hide structure from glob and grep. Agents lose the ability to navigate by file name.

**FORBIDDEN**:
```typescript
// src/services/index.ts — barrel file hiding 15 modules
export * from './auth';
export * from './email';
export * from './billing';
export * from './notification';
export * from './reporting';
// ... 10 more re-exports
```

**REQUIRED**:
```typescript
// Import directly from specific modules
import { AuthService } from './services/auth-service';
import { EmailService } from './services/email-service';
import { BillingService } from './services/billing-service';
```

**When Barrel Files Are Acceptable**:
- Public API boundaries (package entry point)
- Re-exporting a small, cohesive set (< 5 items)
- Framework convention requires it

### Rule 4: Module-Level Purpose Statement

Every file should have a one-line comment at the top stating its purpose. This enables context librarian indexing and helps agents decide whether to read the file.

**REQUIRED**:
```typescript
// Validates JWT tokens against the auth provider and manages token refresh cycles.

import { verify } from 'jsonwebtoken';
// ... rest of file
```

```python
"""Rate limiter using sliding window algorithm for API endpoint protection."""

from datetime import datetime
# ... rest of file
```

### Rule 5: Flat Directory Structure

Prefer shallow hierarchies over deeply nested directories. Deep nesting increases path length in context windows and makes glob patterns harder to write.

**FORBIDDEN**:
```
src/
  modules/
    user/
      services/
        auth/
          providers/
            oauth/
              google/
                handler.ts    # 7 levels deep
```

**REQUIRED**:
```
src/
  auth/
    google-oauth.ts           # 2 levels deep
    token-validator.ts
  user/
    user-service.ts
    user-repository.ts
```

**Guideline**: Maximum 3 directory levels from `src/` to any source file.

### Rule 6: Composition Over Inheritance

Deep inheritance hierarchies are harder for agents to trace than flat compositions. Agents must hold the entire chain in context to understand behavior.

**FORBIDDEN**:
```typescript
class BaseEntity { /* ... */ }
class TimestampedEntity extends BaseEntity { /* ... */ }
class SoftDeletableEntity extends TimestampedEntity { /* ... */ }
class AuditableEntity extends SoftDeletableEntity { /* ... */ }
class User extends AuditableEntity { /* ... */ }
// Agent must read 5 files to understand User
```

**REQUIRED**:
```typescript
class User {
  timestamps = new Timestamps();
  softDelete = new SoftDelete();
  audit = new AuditLog();
  // Agent reads 1 file to understand User, follows references as needed
}
```

## Few-Shot Examples

### Example 1: Good File Structure

```
src/auth/
  token-validator.ts      (85 lines)  — Validates JWT tokens
  session-manager.ts      (120 lines) — Creates and manages user sessions
  password-hasher.ts      (45 lines)  — Bcrypt password hashing
  auth-middleware.ts       (60 lines)  — Express middleware for auth checks
```

Each file is:
- Under 300 lines (well within warning threshold)
- Named descriptively (greppable)
- Single responsibility
- Has a purpose statement

### Example 2: Bad File Structure (Before)

```
src/
  auth.ts                 (680 lines) — Token validation, session management,
                                        password hashing, middleware, rate limiting,
                                        OAuth providers, error handling
```

This file exceeds the 500-line error threshold and mixes 7 concerns. An agent editing the rate limiter must load 680 lines of context, most of which is irrelevant.

### Example 3: Refactoring Decision

An agent is asked to add a new feature to `src/api/routes.ts` (290 lines). The new feature will add ~80 lines.

**Wrong**: Add 80 lines, creating a 370-line file (exceeds warning threshold).

**Right**: Extract the new feature into `src/api/feature-routes.ts` and import it. Both files stay under 300 lines.

## When This Rule Applies

| Context | Behavior |
|---------|----------|
| Code generation | Check output size before writing; split if exceeding warning threshold |
| Code review | Flag files exceeding thresholds |
| Refactoring | Use thresholds as target structure |
| Existing large files | Do not make them worse; extract new functionality to new files |

## Interaction with Other Rules

| Rule | Relationship |
|------|-------------|
| anti-laziness | Do not skip splitting because it is hard — follow through |
| executable-feedback | Run tests after any file splitting to verify no breakage |
| agent-generation-guardrails | Runtime enforcement companion to this rule |
| research-before-decision | Research existing file structure before deciding where to add code |

## Checklist

Before writing or modifying code:

- [ ] Target file is under 300 LOC (or action plan to keep it under)
- [ ] New functions are under 30 lines
- [ ] Nesting depth does not exceed 3 levels
- [ ] File name is descriptive and greppable
- [ ] File has a one-line purpose statement
- [ ] No barrel file re-exports added
- [ ] Directory depth from `src/` is 3 or fewer levels

## References

- Codified Context (Vasilopoulos, Feb 2026) — arxiv:2602.20478
- Long-Running AI Agents (Zylos, Jan 2026) — Task duration correlates with file size
- Context Engineering for Coding Agents (Fowler, 2025) — Structured context improves agent performance
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/anti-laziness.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/executable-feedback.md
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/agent-generation-guardrails.md

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-02-28
