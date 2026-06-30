---
enforcement: medium
---

# @-Mention Wiring Rules

**Enforcement Level**: MEDIUM
These rules apply when generating ANY artifact (documents, code, agents, commands, skills).

## Wire-As-You-Go Pattern

**All artifact generators MUST include @-mentions during creation, not as a separate step.**

The specialized `/mention-wire` command exists for bulk cleanup and auditing - it should NOT be the primary method of wiring traceability.

## When to Add @-Mentions

### Creating Code Files

When generating source files, include header references:

```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-XXX-feature.md
 * @architecture @.aiwg/architecture/software-architecture-doc.md
 * @tests @test/unit/path/to/test.ts
 */
```

### Creating Test Files

When generating tests, back-reference the source:

```typescript
/**
 * @source @$AIWG_ROOT/src/path/to/implementation.ts
 * @requirement @.aiwg/requirements/use-cases/UC-XXX.md
 */
```

### Creating SDLC Artifacts

When generating requirements, architecture, or other SDLC docs, include References section:

```markdown
## References

- @.aiwg/requirements/user-stories.md - Source requirements
- @$AIWG_ROOT/src/module/implementation.ts - Implementation
- @test/unit/module.test.ts - Test coverage
```

### Creating Agent Definitions

When generating agent definitions, include References section:

```markdown
## References

- @.aiwg/requirements/use-cases/UC-XXX.md - Primary use case
- @$AIWG_ROOT/src/relevant/module.ts - Implementation this agent works with
- @$AIWG_ROOT/agentic/code/.../skills/related-skill/SKILL.md - Related skill
```

### Creating Commands/Skills

When generating commands or skills, include References section:

```markdown
## References

- @.aiwg/requirements/use-cases/UC-XXX.md - Use case this implements
- @$AIWG_ROOT/agentic/code/.../agents/related-agent.md - Agent that uses this skill
```

## Reference Categories

Use semantic tags to indicate relationship type:

| Tag | Meaning | Example |
|-----|---------|---------|
| `@implements` | Code implements this requirement | `@implements @.aiwg/requirements/UC-001.md` |
| `@architecture` | Architectural context | `@architecture @.aiwg/architecture/sad.md` |
| `@nfr` | Non-functional requirement | `@nfr @.aiwg/requirements/nfr-modules/security.md` |
| `@tests` | Test coverage location | `@tests @test/unit/module.test.ts` |
| `@source` | Source code for this test | `@source @$AIWG_ROOT/src/module.ts` |
| `@depends` | Dependencies | `@depends @$AIWG_ROOT/src/utils/helper.ts` |
| `@agent` | Related agent | `@agent @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/test-engineer.md` |
| `@command` | Related command | `@command @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/skills/generate-tests/SKILL.md` |

## Bidirectional Linking

When creating references, add the reverse link when practical:

**Forward**: Source → Test
```typescript
// src/auth/login.ts
/** @tests @test/unit/auth/login.test.ts */
```

**Backward**: Test → Source
```typescript
// test/unit/auth/login.test.ts
/** @source @$AIWG_ROOT/src/auth/login.ts */
```

## Validation

Before completing any artifact generation:

1. Verify all @-mentions point to existing files
2. Use relative paths from project root (not absolute)
3. Prefer specific files over directories
4. Include section anchors when referencing large docs: `@.aiwg/architecture/sad.md#section-5`

## Bulk Operations

Use `/mention-wire` for:
- Initial wiring of existing codebase
- Periodic audits and gap filling
- After major refactoring

Do NOT rely on `/mention-wire` as the primary traceability mechanism.
