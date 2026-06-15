# Few-Shot Examples Rules

**Enforcement Level**: MEDIUM
**Scope**: Agent system prompts and definitions
**Research Basis**: REF-019 Toolformer
**Issue**: #193

## Overview

These rules require 2-3 concrete examples to be *reachable* for every agent — at most **one** compact example inline in the agent definition, with the rest in the discoverable example catalog. Few-shot coverage improves output quality; inline bloat breaks subagent dispatch (#1587). Both constraints are satisfied by externalizing examples.

## Research Foundation

From REF-019 Toolformer (Schick et al., 2023):
- Few-shot prompting dramatically improves task performance
- 2-5 examples sufficient for most tasks
- Examples should show both input and desired output
- Diverse examples better than similar ones

The examples must be *available* to the model — they do not all have to live inline in the system prompt. A compact inline anchor plus a referenced catalog delivers the same few-shot benefit without inflating the definition.

## Agent Definition Size Ceiling (#1587)

Agent definitions are loaded **verbatim as the subagent system prompt**. Stacked with a rule-heavy host context (`CLAUDE.md` + the full `.claude/rules/*` set in AIWG-managed repos), an oversized definition overflows the prompt budget and the dispatch fails with `Prompt is too long` at 0 tokens — before the agent does any work. This is not theoretical: it was observed blocking the Requirements Analyst (24 KB def) twice while the lean Security Architect (8.7 KB) dispatched cleanly.

| Threshold | Bytes | Action |
|-----------|-------|--------|
| Target | ≤ 12 KB | Healthy lean definition |
| Warning | 12–16 KB | Trim toward target |
| **Ceiling** | **> 16 KB** | **Must externalize examples / reference rules; `aiwg doctor` flags it** |

The single largest, safest cut is to move worked examples out of the definition into the catalog (this rule, Rule 1) and to **reference** the shared protocol rules (`thought-protocol`, `reasoning-sections`, `tao-loop`) rather than restating them inline.

## Mandatory Rules

### Rule 1: Examples Are Referenced, Not Inlined

**REQUIRED**:
Every agent's few-shot coverage MUST be reachable, with **at most one** compact example inline. The remaining 2-3 worked examples live in the discoverable example catalog at `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/agent-examples.md` (reachable via `aiwg discover` / `aiwg show`), or in a per-agent example file. The inline example is an anchor; the catalog carries the diversity.

```markdown
# Agent: [Name]

## Role
[Agent role description]

## Example (anchor — one compact, complete example)

**Input:**
[User request]

**Output:**
```[format]
[Complete expected output — compact but not truncated]
```

> Additional worked examples (moderate + complex scenarios): see
> `agent-examples.md` → "[Agent Name]" — or `aiwg show` the example catalog.

## Your Tasks
[Standard agent instructions]
```

**FORBIDDEN**:
- More than one inline worked example in an agent definition.
- An agent definition over the 16 KB ceiling because examples or restated rule boilerplate were inlined.
- Dropping below the 2-3 few-shot floor: the examples must still *exist*, just in the catalog rather than inline.

### Rule 2: Example Diversity

**REQUIRED**:
Examples MUST cover different complexity levels:

| Level | Description | Purpose |
|-------|-------------|---------|
| Simple | Minimal complexity, happy path | Baseline understanding |
| Moderate | Realistic production scenario | Standard expectations |
| Complex | Edge cases, error handling, integrations | Robustness |

### Rule 3: Example Completeness

**REQUIRED**:
Each example MUST include:

1. **Input**: Clear description of user request/task
2. **Context**: Any relevant project state (if needed)
3. **Output**: Complete, formatted output (not truncated)
4. **Quality Annotation**: Why this is a good example (optional but encouraged)

**FORBIDDEN**:
- Truncated outputs: `[... rest of document]`
- Placeholders: `[Insert details here]`
- Trivial examples: "User: Hello" → "Hello back"

### Rule 4: Domain-Appropriate Examples

**REQUIRED**:
Examples MUST use realistic domain scenarios:

| Agent | Good Examples | Bad Examples |
|-------|---------------|--------------|
| Requirements Analyst | "Authentication for fintech app" | "Login for app" |
| Test Engineer | "Integration tests for payment processing" | "Test the button" |
| Security Auditor | "OWASP compliance for API endpoints" | "Check security" |

### Rule 5: Output Format Consistency

**REQUIRED**:
Example outputs MUST match the agent's actual deliverable format:

```markdown
### Example: Requirements Analyst

**Output:**
```markdown
# User Story: Secure Password Reset

**As a** registered user who forgot their password
**I want to** reset my password via email verification
**So that** I can regain access to my account securely

## Acceptance Criteria

- [ ] User can request password reset from login page
- [ ] System sends reset link to registered email
- [ ] Reset link expires after 1 hour
- [ ] User must create password meeting security requirements
- [ ] Old sessions are invalidated after password change

## Non-Functional Requirements

- Reset email sent within 30 seconds
- Link is single-use and cryptographically secure
- Failed attempts logged for security monitoring
```
```

## Example Templates by Agent

### Requirements Analyst

```markdown
### Example 1: User Story Creation

**Input:**
Create a user story for login functionality in our healthcare portal.

**Output:**
```markdown
# User Story: Healthcare Portal Login

**As a** healthcare provider
**I want to** log in with my NPI number and password
**So that** I can access patient records securely

## Acceptance Criteria

- [ ] Provider can enter NPI number and password
- [ ] System validates NPI against registry
- [ ] MFA required for all logins
- [ ] Session timeout after 15 minutes of inactivity
- [ ] Failed attempts trigger account lockout after 5 tries

## Non-Functional Requirements

- HIPAA-compliant audit logging
- Login must complete within 3 seconds
- Support for SSO via SAML 2.0
```

**Why This Is Good:**
- Uses domain-specific terminology (NPI, HIPAA)
- Includes security requirements appropriate for healthcare
- Acceptance criteria are testable and specific
```

### Test Engineer

```markdown
### Example 1: Unit Test Generation

**Input:**
Write unit tests for the password validation function.

**Output:**
```typescript
describe('validatePassword', () => {
  describe('length requirements', () => {
    it('should reject passwords shorter than 8 characters', () => {
      expect(validatePassword('Short1!')).toEqual({
        valid: false,
        errors: ['Password must be at least 8 characters']
      });
    });

    it('should accept passwords of exactly 8 characters', () => {
      expect(validatePassword('Valid1!a')).toEqual({
        valid: true,
        errors: []
      });
    });
  });

  describe('complexity requirements', () => {
    it('should require at least one uppercase letter', () => {
      expect(validatePassword('lowercase1!')).toEqual({
        valid: false,
        errors: ['Password must contain at least one uppercase letter']
      });
    });

    it('should require at least one special character', () => {
      expect(validatePassword('NoSpecial1')).toEqual({
        valid: false,
        errors: ['Password must contain at least one special character']
      });
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(validatePassword('')).toEqual({
        valid: false,
        errors: ['Password must be at least 8 characters']
      });
    });

    it('should handle unicode characters', () => {
      expect(validatePassword('Valid1!日本語')).toEqual({
        valid: true,
        errors: []
      });
    });
  });
});
```

**Why This Is Good:**
- Organized by test category
- Covers happy path, validation rules, and edge cases
- Uses clear, descriptive test names
- Shows expected output structure
```

### Security Auditor

```markdown
### Example 1: Threat Model

**Input:**
Create a threat model for the user authentication API.

**Output:**
```markdown
# Threat Model: Authentication API

## Assets

| Asset | Sensitivity | Description |
|-------|-------------|-------------|
| User Credentials | Critical | Passwords, MFA tokens |
| Session Tokens | High | JWT access/refresh tokens |
| User Profile Data | Medium | Email, preferences |

## Trust Boundaries

1. Client (Browser/Mobile) → API Gateway
2. API Gateway → Auth Service
3. Auth Service → Database

## Threats (STRIDE)

### Spoofing

| Threat | Risk | Mitigation |
|--------|------|------------|
| Credential stuffing | High | Rate limiting, CAPTCHA, breached password check |
| Session hijacking | High | Secure cookies, token rotation, IP binding |

### Tampering

| Threat | Risk | Mitigation |
|--------|------|------------|
| JWT manipulation | Medium | Asymmetric signing (RS256), short expiry |
| Parameter tampering | Medium | Input validation, HMAC signatures |

### Repudiation

| Threat | Risk | Mitigation |
|--------|------|------------|
| Denied login attempts | Low | Comprehensive audit logging |

### Information Disclosure

| Threat | Risk | Mitigation |
|--------|------|------------|
| Credential leakage | Critical | TLS 1.3, no passwords in logs |
| Timing attacks | Medium | Constant-time comparison |

### Denial of Service

| Threat | Risk | Mitigation |
|--------|------|------------|
| Login flood | High | Rate limiting, account lockout |

### Elevation of Privilege

| Threat | Risk | Mitigation |
|--------|------|------------|
| Role manipulation | Critical | Server-side role verification |

## Security Controls

1. **Authentication**: Bcrypt (cost 12), MFA via TOTP
2. **Authorization**: JWT with 15-minute expiry
3. **Monitoring**: Failed login alerts, anomaly detection
```

**Why This Is Good:**
- Uses STRIDE framework systematically
- Quantifies risk levels
- Provides specific, actionable mitigations
- Covers all trust boundaries
```

## Agent Example Requirements

| Agent | Example Count | Required Scenarios |
|-------|---------------|-------------------|
| Requirements Analyst | 3 | User story, Use case, NFR analysis |
| Test Engineer | 3 | Unit test, Integration test, E2E test |
| Security Auditor | 3 | Threat model, Security review, Mitigation plan |
| API Designer | 3 | REST endpoint, Error handling, Versioning |
| Software Architect | 3 | Component design, ADR, System integration |
| Code Reviewer | 3 | Bug detection, Performance issue, Security flaw |
| Technical Writer | 3 | API docs, User guide, Changelog |
| DevOps Engineer | 3 | CI/CD pipeline, Deployment config, Monitoring |

## Implementation Priority

**Phase 1: Core Agents**
1. Orchestrator
2. Requirements Analyst
3. Test Engineer
4. API Designer

**Phase 2: Specialized Agents**
5. Security Auditor
6. Software Architect
7. Code Reviewer
8. Technical Writer

**Phase 3: Remaining Agents**
9-20. All other agents

## Validation Checklist

Before finalizing an agent definition:

- [ ] At most ONE compact example inline; the rest in the catalog
- [ ] Definition is ≤ 16 KB (target ≤ 12 KB) — verified with `aiwg doctor`
- [ ] 2-3 examples reachable total (inline anchor + catalog entry)
- [ ] Examples cover simple/moderate/complex scenarios (across inline + catalog)
- [ ] All outputs are complete (no truncation)
- [ ] Examples use realistic domain scenarios
- [ ] Output format matches agent deliverables
- [ ] Shared protocols (thought-protocol, reasoning-sections, tao-loop) referenced, not restated inline
- [ ] No placeholders or TODOs in examples

## Example Quality Review

When reviewing agent examples:

| Criterion | Check |
|-----------|-------|
| Completeness | Is output fully rendered? |
| Realism | Would this occur in production? |
| Format | Does it match agent's actual output? |
| Diversity | Are scenarios sufficiently different? |
| Quality | Would you accept this output? |

## References

- @.aiwg/research/findings/REF-019-toolformer.md - Research foundation
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/ - Agent definitions
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/agent-examples.md - Example catalog
- #193 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
