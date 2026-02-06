# Progressive Disclosure Rules

**Enforcement Level**: MEDIUM
**Scope**: SDLC templates and artifact generation
**Research Basis**: REF-006 Cognitive Load Theory
**Issues**: #188, #189

## Overview

These rules implement progressive disclosure in SDLC templates to reduce cognitive load by revealing artifact sections incrementally and providing worked examples.

## Research Foundation

From REF-006 Cognitive Load Theory (Sweller et al., 1998):
- Progressive disclosure reduces extraneous cognitive load
- Intrinsic complexity should be introduced gradually
- Scaffolding helps novices while not hindering experts
- Worked examples reduce problem-solving load
- Learning by example more efficient than discovery

## Progressive Disclosure Patterns

### Phase Labels

All SDLC templates MUST use phase labels:

| Label | Meaning | When to Complete |
|-------|---------|------------------|
| `ESSENTIAL` | Must complete immediately | Initial creation |
| `EXPAND WHEN READY` | Complete during elaboration | When requirements stable |
| `ADVANCED` | Technical details | During construction |
| `OPTIONAL` | Nice-to-have | As needed |

### Template Structure

**REQUIRED** template format:

```markdown
# [Artifact Type]: [Name]

## Phase 1: Core (ESSENTIAL)

[Always-visible essential fields]

## Phase 2: Details (EXPAND WHEN READY)

<details>
<summary>Click to expand detailed information</summary>

[Detailed fields revealed on click]

</details>

## Phase 3: Technical (ADVANCED)

<details>
<summary>Click to expand technical details</summary>

[Implementation-specific details]

</details>
```

## Use Case Template Example

```markdown
# Use Case: [Name]

## Phase 1: Core (ESSENTIAL)

**Actor:** [Primary actor performing this action]

<!-- EXAMPLE: Registered User -->

**Goal:** [What the actor wants to achieve]

<!-- EXAMPLE: Securely access their personalized dashboard -->

**Preconditions:**
- [Required starting state]

<!-- EXAMPLE:
- User has registered account
- User is not currently logged in
- System is operational
-->

## Phase 2: Flow (EXPAND WHEN READY)

<details>
<summary>Click to expand main flow and alternatives</summary>

### Main Success Scenario
1. [Step]
2. [Step]

<!-- EXAMPLE:
1. User navigates to login page
2. User enters email and password
3. System validates credentials
4. System creates session token
5. System redirects to dashboard
-->

### Alternative Flows

**[Alternative Name]:**
- [Trigger condition]
- [Steps]

<!-- EXAMPLE:
**Invalid Credentials:**
- User enters incorrect password
- System shows error message
- System increments failed attempt counter
- User can retry (max 5 attempts)
-->

### Exception Flows

**[Exception Name]:**
- [Error condition]
- [Recovery steps]

</details>

## Phase 3: Technical (ADVANCED)

<details>
<summary>Click to expand implementation details</summary>

### Postconditions
- [State after success]

<!-- EXAMPLE:
- User session created
- Last login timestamp updated
- Failed attempt counter reset
-->

### Acceptance Criteria
- [ ] [Testable criterion]

<!-- EXAMPLE:
- [ ] User can log in with valid email/password
- [ ] Invalid credentials show clear error message
- [ ] Account locks after 5 failed attempts
- [ ] Login completes within 2 seconds
-->

### Non-Functional Requirements
- [NFR related to this use case]

<!-- EXAMPLE:
- Response time < 2 seconds
- Passwords hashed with bcrypt
- Session expires after 24 hours of inactivity
-->

</details>
```

## Worked Examples Rules

### Rule 1: Every Template Has Examples

**REQUIRED**:
Every template section MUST include at least one inline example.

```markdown
**Actor:** [Description of primary actor]

<!-- EXAMPLE: Registered User attempting to access premium content -->
```

### Rule 2: Example Quality Criteria

**REQUIRED** for all examples:
- Realistic (not toy examples like "foo" or "test")
- Domain-appropriate (security, e-commerce, etc.)
- Complete (shows all required elements)
- Annotated (explains why it's good when helpful)

**FORBIDDEN**:
- Placeholder examples: "Lorem ipsum", "[TODO]", "Example here"
- Trivial examples: "User clicks button"
- Incomplete examples: Missing required fields

### Rule 3: Diverse Example Categories

Each template MUST have examples from multiple categories:

| Category | Purpose | Example |
|----------|---------|---------|
| Simple | Baseline understanding | Basic login flow |
| Moderate | Realistic complexity | Multi-step checkout |
| Complex | Edge cases, integrations | Cross-system authentication |

### Rule 4: Anti-Pattern Examples

**REQUIRED**:
Include anti-pattern examples to show what NOT to do:

```markdown
<!-- ANTI-PATTERN: Too vague -->
**Goal:** User logs in

<!-- BETTER: Specific and testable -->
**Goal:** Securely authenticate using email/password to access personalized dashboard

<!-- WHY: Vague goals are untestable and lead to scope creep -->
```

## Experience-Based Variants

### Three Template Levels

```
templates/
├── use-case/
│   ├── minimal.md        # Novice: Essential fields only
│   ├── standard.md       # Intermediate: Balanced detail
│   └── comprehensive.md  # Expert: All sections visible
```

### Selection Criteria

| Level | When to Use |
|-------|-------------|
| Minimal | First-time users, quick prototypes |
| Standard | Most projects (default) |
| Comprehensive | Regulated industries, complex systems |

### Command Integration

```bash
# Use minimal template
aiwg template new use-case --level minimal

# Use standard (default)
aiwg template new use-case

# Use comprehensive
aiwg template new use-case --level comprehensive

# Expand existing artifact
aiwg template expand .aiwg/requirements/UC-001.md --to standard
```

## Agent Behavior

### Phase-Aware Prompting

Agents MUST respect current project phase:

```yaml
phase_awareness:
  inception:
    prompt_for: [ESSENTIAL]
    hide: [EXPAND WHEN READY, ADVANCED]

  elaboration:
    prompt_for: [ESSENTIAL, EXPAND WHEN READY]
    suggest_expansion: true

  construction:
    prompt_for: [ESSENTIAL, EXPAND WHEN READY, ADVANCED]
    all_visible: true
```

### Example Injection

When generating artifacts, agents SHOULD:

1. Include inline examples in generated content
2. Use domain-appropriate examples
3. Mark examples clearly with `<!-- EXAMPLE: -->`
4. Include anti-patterns when relevant

## Template Catalog

### Templates Requiring Progressive Disclosure

| Template | Essential | Expand When Ready | Advanced |
|----------|-----------|-------------------|----------|
| Use Case | Actor, Goal, Preconditions | Main Flow, Alternatives | Acceptance Criteria, NFRs |
| User Story | As/I want/So that | Acceptance Criteria | Technical Notes |
| ADR | Title, Status, Context | Decision, Consequences | Implementation Notes |
| Risk Entry | ID, Description, Impact | Mitigation Strategy | Monitoring Plan |
| Test Plan | Scope, Approach | Test Cases | Automation Details |

### Example Counts

Each template SHOULD have:

| Section Type | Inline Examples | Separate Files |
|--------------|-----------------|----------------|
| Essential | 1 per field | 2-3 complete examples |
| Expand When Ready | 1 per section | 1-2 moderate examples |
| Advanced | As needed | 1 complex example |

## Validation Checklist

Before releasing a template:

- [ ] All sections have phase labels
- [ ] Collapsible sections use `<details>` tags
- [ ] Every field has at least one inline example
- [ ] Examples are realistic, not trivial
- [ ] Anti-pattern examples included
- [ ] Three experience levels available
- [ ] Agent prompts respect phase awareness
- [ ] Commands support expansion/collapse

## References

- @.aiwg/research/findings/REF-006-cognitive-load-theory.md - Research foundation
- @agentic/code/frameworks/sdlc-complete/templates/ - Template location
- @.aiwg/planning/current-phase.txt - Current phase detection
- #188 - Phase-based revelation issue
- #189 - Worked examples issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
