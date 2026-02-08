# Qualified Cross-Reference Rules

**Enforcement Level**: MEDIUM
**Scope**: All @-mention generation and wiring
**Research Basis**: REF-056 FAIR Principles (I3 - Qualified References)
**Issue**: #116

## Overview

These rules extend @-mentions with relationship qualifiers to enable semantic navigation and validation. Current @-mentions indicate links but not relationship types.

## Research Foundation

| Finding | Impact |
|---------|--------|
| FAIR I3 Principle | References must include semantic relationship type |
| Traceability gaps | 40% of links lack bidirectional consistency |
| Query limitations | Cannot answer "what implements UC-001?" |

## Relationship Vocabulary

### Implementation Relationships

| Qualifier | Meaning | Direction |
|-----------|---------|-----------|
| `@implements` | Code implements requirement | Code → Requirement |
| `@implemented-by` | Requirement implemented by | Requirement → Code |
| `@tests` | Tests for source code | Test → Source |
| `@tested-by` | Source tested by | Source → Test |

### Structural Relationships

| Qualifier | Meaning | Direction |
|-----------|---------|-----------|
| `@extends` | Extends/inherits from | Child → Parent |
| `@extended-by` | Extended by | Parent → Child |
| `@depends` | Depends on | Consumer → Provider |
| `@dependency-of` | Is dependency of | Provider → Consumer |

### Derivation Relationships

| Qualifier | Meaning | Direction |
|-----------|---------|-----------|
| `@derives-from` | Derived from source | Derived → Source |
| `@source-of` | Source for derivation | Source → Derived |
| `@references` | References (informational) | Any |
| `@related` | Related (weak link) | Bidirectional |

### Semantic Relationships

| Qualifier | Meaning | Use Case |
|-----------|---------|----------|
| `@contradicts` | Conflicts with | Research disagreement |
| `@supersedes` | Replaces older version | Document evolution |
| `@superseded-by` | Replaced by newer | Document evolution |
| `@validates` | Validates claims of | Quality assurance |

## Mandatory Rules

### Rule 1: Use Qualifiers for Non-Obvious Relationships

**OPTIONAL** (informational):
```markdown
## References
- @path/to/related-file.md
```

**RECOMMENDED** (semantic):
```markdown
## References
- @implements @.aiwg/requirements/use-cases/UC-001.md
- @tests @src/auth/login.ts
- @depends @src/utils/helpers.ts
```

### Rule 2: Maintain Bidirectional Consistency

When creating a qualified reference, the inverse should exist:

**Source file** (`src/auth/login.ts`):
```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-AUTH-001.md
 * @tested-by @test/unit/auth/login.test.ts
 */
```

**Requirement** (`.aiwg/requirements/use-cases/UC-AUTH-001.md`):
```markdown
## Implementation
- @implemented-by @src/auth/login.ts
```

**Test** (`test/unit/auth/login.test.ts`):
```typescript
/**
 * @tests @src/auth/login.ts
 */
```

### Rule 3: Qualifier Syntax

**Format**: `@qualifier @path/to/file.md`

```markdown
# Valid formats
@implements @src/module.ts
@tests @src/auth/login.ts:42      # With line number
@depends @src/utils/helpers.ts#function  # With anchor

# Invalid
@implements src/module.ts         # Missing @
implements @src/module.ts         # Missing @ on qualifier
```

### Rule 4: Query Patterns

Qualified references enable semantic queries:

```
# Find all implementations of a requirement
grep -r "@implements @.aiwg/requirements/UC-001" src/

# Find all tests for a file
grep -r "@tests @src/auth/login.ts" test/

# Find all dependencies
grep -r "@depends @src/utils/" src/
```

## Agent Integration

### When Creating Code

Agents SHOULD add qualified references:

```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-XXX.md
 * @depends @src/utils/validation.ts
 */
export function validateInput(input: unknown): boolean {
  // ...
}
```

### When Creating Tests

Agents SHOULD reference source:

```typescript
/**
 * @tests @src/auth/validate.ts
 * @requirement @.aiwg/requirements/use-cases/UC-AUTH-001.md
 */
describe('validateInput', () => {
  // ...
});
```

### When Creating Requirements

Agents SHOULD track implementations:

```markdown
## Implementation Status

| Component | Status | Reference |
|-----------|--------|-----------|
| Backend | Complete | @implemented-by @src/auth/login.ts |
| Frontend | Pending | - |
```

## /mention-wire Integration

The `/mention-wire` command SHOULD:

1. Detect existing qualified references
2. Suggest qualifiers for unqualified @-mentions
3. Check bidirectional consistency
4. Report missing inverse references

## Validation

Before committing:

- [ ] New @-mentions have appropriate qualifiers
- [ ] Bidirectional references are consistent
- [ ] Qualifiers use valid vocabulary
- [ ] Inverse references exist where required

## Migration

Existing @-mentions without qualifiers remain valid but are candidates for enhancement. Use `/mention-wire --qualify` to suggest qualifiers.

## References

- @.aiwg/research/findings/REF-056-fair-principles.md - FAIR research
- @.claude/rules/mention-wiring.md - Base mention rules
- @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml - PROV integration
- #116 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
