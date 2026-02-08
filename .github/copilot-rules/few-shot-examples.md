# Few-Shot Examples Rules

**Enforcement Level**: MEDIUM
**Scope**: Agent system prompts and definitions
**Research Basis**: REF-019 Toolformer
**Issue**: #193

## Overview

These rules require 2-3 concrete examples in every agent system prompt to improve output quality through few-shot learning.

## Research Foundation

From REF-019 Toolformer (Schick et al., 2023):
- Few-shot prompting dramatically improves task performance
- 2-5 examples sufficient for most tasks
- Examples should show both input and desired output
- Diverse examples better than similar ones

## Mandatory Rules

### Rule 1: Every Agent Has Examples

**REQUIRED**:
Every agent definition MUST include 2-3 examples in its system prompt.

```markdown
# Agent: [Name]

## Role
[Agent role description]

## Examples

### Example 1: [Simple Scenario]

**Input:**
[User request]

**Output:**
```[format]
[Complete expected output]
```

### Example 2: [Moderate Scenario]

**Input:**
[More complex request]

**Output:**
```[format]
[Complete expected output]
```

### Example 3: [Complex Scenario]

**Input:**
[Edge case or integration scenario]

**Output:**
```[format]
[Complete expected output]
```

## Your Tasks
[Standard agent instructions]
```

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

- [ ] 2-3 examples included
- [ ] Examples cover simple/moderate/complex scenarios
- [ ] All outputs are complete (no truncation)
- [ ] Examples use realistic domain scenarios
- [ ] Output format matches agent deliverables
- [ ] Quality annotations explain what makes examples good
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
- @agentic/code/frameworks/sdlc-complete/agents/ - Agent definitions
- @agentic/code/frameworks/sdlc-complete/docs/agent-examples.md - Example catalog
- #193 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
