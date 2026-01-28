# SDLC Template Examples

This directory contains complete, production-ready examples demonstrating how to fill out SDLC templates with realistic content.

## Purpose

These examples serve multiple purposes:

1. **Learning by Example**: Show what "good" looks like for each artifact type
2. **Reduce Cognitive Load**: Provide concrete starting points instead of blank templates
3. **Establish Quality Bar**: Demonstrate level of detail and rigor expected
4. **Enable Copy-Paste**: Allow teams to adapt examples for their own projects

## Research Foundation

Based on REF-006 (Cognitive Load Theory):
- Worked examples reduce problem-solving load by 30-50%
- Learning by example is more efficient than discovery learning
- Progressive disclosure of complexity improves comprehension
- Domain-appropriate examples transfer better than abstract ones

## Example Categories

### Simple Examples
Baseline understanding with minimal complexity (happy path only).

**Use when**:
- Learning a template for the first time
- Creating low-risk artifacts
- Prototyping or proof-of-concept work

### Moderate Examples (Recommended Default)
Realistic production scenarios with typical complexity.

**Use when**:
- Most production development
- Standard feature development
- Typical business workflows

### Complex Examples
Edge cases, integrations, high-security scenarios.

**Use when**:
- Mission-critical systems
- Security-sensitive features
- Complex integrations
- Regulated industries (healthcare, finance)

---

## Available Examples

### Requirements

| Example | Type | Complexity | Use Case |
|---------|------|------------|----------|
| [`requirements/use-case-authentication-complete.md`](requirements/use-case-authentication-complete.md) | Use Case | Complex | E-commerce user authentication with MFA, account lockout, security |
| [`requirements/user-story-password-reset-complete.md`](requirements/user-story-password-reset-complete.md) | User Story | Moderate | Self-service password reset with security considerations |

### Governance

| Example | Type | Complexity | Use Case |
|---------|------|------------|----------|
| [`governance/adr-jwt-vs-session-complete.md`](governance/adr-jwt-vs-session-complete.md) | ADR | Complex | Architectural decision for authentication mechanism with 4 alternatives |

### Test

| Example | Type | Complexity | Use Case |
|---------|------|------------|----------|
| *Coming soon* | Test Case | Moderate | Integration test for authentication flow |

### Management

| Example | Type | Complexity | Use Case |
|---------|------|------------|----------|
| *Coming soon* | Risk Card | Simple | Technical risk with mitigation |

### Security

| Example | Type | Complexity | Use Case |
|---------|------|------------|----------|
| *Coming soon* | Threat Model | Complex | Authentication service threat model |

---

## How to Use These Examples

### 1. Choose the Right Example

Match example complexity to your needs:

```
Low risk, simple feature → Simple example
Typical production work → Moderate example
High stakes, compliance → Complex example
```

### 2. Copy and Adapt

```bash
# Copy example as starting point
cp templates/examples/requirements/user-story-password-reset-complete.md \
   .aiwg/requirements/user-stories/US-MYPROJECT-042.md

# Adapt to your context:
# 1. Change IDs, names, dates
# 2. Adjust business context
# 3. Modify technical details
# 4. Remove irrelevant sections
# 5. Add project-specific requirements
```

### 3. Learn the Patterns

Study examples to understand:
- **Structure**: How sections flow logically
- **Detail Level**: Appropriate granularity for each section
- **Language**: Specific, testable, actionable phrasing
- **Traceability**: How @-mentions wire references
- **Quality Markers**: What distinguishes good examples

### 4. Compare Your Work

Use examples as quality checklist:
- [ ] Is my artifact as detailed as the example?
- [ ] Have I covered all the sections in the example?
- [ ] Are my acceptance criteria as testable?
- [ ] Have I wired traceability like the example?
- [ ] Does my rationale explain "why" like the example?

---

## Example Highlights

### Use Case: User Authentication

**File**: `requirements/use-case-authentication-complete.md`

**What makes it good**:
- 16-step main flow with actor interactions
- 3 alternate flows (Remember Me, Forgot Password, MFA)
- 8 exception flows covering errors and edge cases
- Security-appropriate (addresses timing attacks, account enumeration)
- Quantified NFRs (2s latency, 1000 concurrent users)
- 15 traceability references

**Use for**:
- Authentication/authorization features
- Security-sensitive workflows
- Multi-step user interactions
- Complex error handling scenarios

---

### User Story: Password Reset

**File**: `requirements/user-story-password-reset-complete.md`

**What makes it good**:
- 11 detailed acceptance criteria (Gherkin format)
- Quantified business value ($170K/year)
- Task breakdown (32 hours, matches 5 story points)
- Security NFRs (token expiry, rate limiting)
- Risk identification with mitigations
- Complete Definition of Ready and Done

**Use for**:
- Agile user stories
- Self-service features
- Security-sensitive user flows
- Stories requiring detailed estimation

---

### ADR: JWT vs Server-Side Sessions

**File**: `governance/adr-jwt-vs-session-complete.md`

**What makes it good**:
- Comprehensive context (business drivers, constraints, forces)
- 4 alternatives evaluated with specific rejection reasons
- Quantified consequences (7ms latency, $150/month cost)
- Hybrid solution balancing trade-offs
- Implementation plan (6 weeks, 4 phases)
- Security threat model with mitigations

**Use for**:
- Technical architecture decisions
- Technology selection (database, framework, service)
- Decisions with multiple viable alternatives
- Decisions requiring cost/benefit analysis

---

## Quality Annotations

Each example includes annotations explaining:

### Why This is Good
Highlights what makes the example effective:
- Completeness (all sections filled)
- Specificity (concrete examples, quantified metrics)
- Traceability (wired references)
- Testability (clear pass/fail criteria)

### Anti-Patterns to Avoid
Shows bad examples with corrections:
- ❌ Vague: "User logs in"
- ✅ Specific: "User enters email, password, clicks 'Sign In', system validates credentials, generates JWT, redirects to dashboard"

### Domain Appropriateness
Explains why the example fits the context:
- Authentication example uses security-appropriate language
- E-commerce example includes business metrics (cart value, conversion)
- Compliance example references specific regulations (GDPR, PCI DSS)

---

## Contributing New Examples

When adding new examples:

### 1. Choose a Representative Scenario

Pick scenarios that:
- Are common across projects (authentication, payment, reporting)
- Demonstrate template features well
- Show realistic complexity
- Have clear quality markers

**Good choices**:
- Authentication/authorization
- Payment processing
- User profile management
- Search functionality
- Reporting/analytics

**Avoid**:
- Toy examples ("Hello World", "Add two numbers")
- Overly domain-specific (niche industry jargon)
- Trivial features (simple getters/setters)

### 2. Fill Out Completely

Every section of the template must be filled:
- No "[TODO]" or "[TBD]" placeholders
- No empty sections
- Realistic data throughout
- Proper @-mention wiring

### 3. Add Quality Annotations

Include these sections:
- **Why This Example is Effective**: Highlights quality markers
- **Anti-Patterns to Avoid**: Shows what NOT to do
- **Domain Appropriateness**: Explains context fit

### 4. Provide Multiple Complexity Levels

For key templates, create 3 variations:
- **Simple**: 100-200 lines, happy path only
- **Moderate**: 300-500 lines, happy + error paths
- **Complex**: 800-1500 lines, comprehensive coverage

### 5. Name Files Descriptively

```
{template-type}-{scenario}-{complexity}.md

Examples:
- use-case-authentication-complete.md
- user-story-password-reset-moderate.md
- adr-database-selection-simple.md
- test-case-payment-processing-complex.md
```

---

## Example Template

When creating new examples, follow this structure:

```markdown
# [Artifact Type]: [Scenario Name] (Complete Example)

## Why This Example

Brief explanation of what this example demonstrates and when to use it.

**Why this is a good example:**
- [Quality marker 1]
- [Quality marker 2]

---

## [Template Section 1]

[Fully filled out content with realistic data]

<!-- EXAMPLE comments showing key patterns -->

---

## [Template Section 2]

[Continue for all template sections]

---

## Why This Example is Effective

### [Quality Dimension 1]
Explanation of what makes this effective

### [Quality Dimension 2]
...

---

## Anti-Patterns to Avoid

### ❌ [Anti-Pattern Name]
**Bad**: [Example of bad practice]
**Good**: [Corrected version]
**Why**: [Explanation]

---

**Example Author**: [Role]
**Last Updated**: [Date]
**Quality Review**: [Reviewers]
```

---

## Testing Your Examples

Before adding an example, verify:

- [ ] All template sections completed (no blanks)
- [ ] Realistic data throughout (no toy examples)
- [ ] Proper @-mention wiring
- [ ] Quality annotations included
- [ ] Anti-patterns section present
- [ ] File naming follows convention
- [ ] Added to this README index
- [ ] Peer reviewed by 2+ team members

---

## Maintenance

### Review Cadence

Examples should be reviewed:
- **Quarterly**: Check for outdated practices or technologies
- **After Template Changes**: Update examples to match new template structure
- **When Quality Issues Found**: If teams produce low-quality artifacts, enhance examples

### Update Triggers

Update examples when:
- Template structure changes
- New best practices emerge
- Technology stack changes (e.g., new framework version)
- Compliance requirements change (GDPR, PCI DSS updates)
- Team feedback indicates examples are confusing

### Deprecation

Remove or archive examples when:
- Technology is obsolete (e.g., examples for deprecated frameworks)
- Scenario is no longer relevant
- Better examples available
- Quality issues cannot be easily fixed

---

## Feedback

Have suggestions for new examples or improvements?

1. Create an issue in the repository describing:
   - What example you need
   - What complexity level (simple/moderate/complex)
   - What scenario/domain
   - Why existing examples don't cover it

2. Contribute examples via pull request:
   - Follow the contribution guidelines above
   - Include quality annotations
   - Request review from 2+ team members

---

## References

- @.claude/rules/progressive-disclosure.md - Progressive disclosure principles
- @.claude/rules/few-shot-examples.md - Few-shot learning research
- @.aiwg/research/findings/REF-006-cognitive-load-theory.md - Cognitive load research
- @CLAUDE.md - AIWG development guide

---

**README Version**: 1.0
**Last Updated**: 2026-01-28
**Maintainer**: Requirements Analyst + Technical Writer
