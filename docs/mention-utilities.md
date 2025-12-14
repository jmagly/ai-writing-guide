# @-Mention Utilities

Manage traceability through @-mention references in code and documentation. @-mentions create bidirectional links between requirements, architecture, code, and tests.

---

## Commands

| Command | Description |
|---------|-------------|
| `/mention-wire` | Inject @-mentions based on codebase analysis |
| `/mention-validate` | Validate @-mentions resolve to existing files |
| `/mention-lint` | Lint @-mentions for style consistency |
| `/mention-report` | Generate traceability report |
| `/mention-conventions` | Display naming conventions |

---

## Wiring @-Mentions

Analyze your codebase and automatically inject @-mentions for traceability.

```text
/mention-wire                    # Analyze current directory
/mention-wire --dry-run          # Preview changes
/mention-wire --interactive      # Approve each mention
/mention-wire --auto             # Apply high-confidence mentions
/mention-wire --confidence 90    # Set threshold (default: 80)
```

The wiring process:
1. Scans source, test, and SDLC artifact files
2. Detects relationships using heuristics
3. Generates suggestions with confidence scores
4. Applies changes based on mode

---

## Naming Conventions

### Requirements

```text
@.aiwg/requirements/UC-{NNN}-{slug}.md      # Use cases (UC-001-user-auth.md)
@.aiwg/requirements/NFR-{CAT}-{NNN}.md      # Non-functional (NFR-SEC-001.md)
@.aiwg/requirements/user-stories.md         # User story collection
```

NFR categories: `SEC`, `PERF`, `SCAL`, `AVAIL`, `MAINT`, `USAB`

### Architecture

```text
@.aiwg/architecture/adrs/ADR-{NNN}-{slug}.md    # Decision records
@.aiwg/architecture/components/{name}.md        # Component specs
@.aiwg/architecture/software-architecture-doc.md # Main SAD
```

### Security

```text
@.aiwg/security/threat-model.md             # Main threat model
@.aiwg/security/TM-{NNN}.md                 # Individual threats
@.aiwg/security/controls/{control-id}.md    # Security controls
```

### Code References

```text
@src/{path/to/file}     # Source files
@test/{path/to/file}    # Test files
@docs/{path/to/file}    # Documentation
```

---

## Placement Rules

### In Code Files (TypeScript/JavaScript)

```typescript
/**
 * @file Authentication Service
 * @implements @.aiwg/requirements/UC-003-user-auth.md
 * @architecture @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md
 * @tests @test/integration/auth.test.ts
 */
export class AuthService {
  // ...
}
```

### In Python Files

```python
"""
Authentication Service

@implements: @.aiwg/requirements/UC-003-user-auth.md
@architecture: @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md
@tests: @test/integration/test_auth.py
"""
```

### In Markdown Documents

```markdown
## References

- @.aiwg/requirements/user-stories.md - Functional requirements
- @.aiwg/architecture/software-architecture-doc.md - Architecture
- @.aiwg/security/threat-model.md - Security considerations
```

### Inline Comments

```typescript
// Per @.aiwg/security/controls/authn-001.md - validate token expiry
if (token.exp < Date.now()) {
  throw new AuthError('Token expired');
}
```

---

## ID Format Rules

| Type | Format | Example |
|------|--------|---------|
| Use Case | UC-NNN | UC-001, UC-042 |
| NFR | NFR-CAT-NNN | NFR-SEC-001 |
| ADR | ADR-NNN | ADR-001, ADR-015 |
| Threat | TM-NNN | TM-001, TM-023 |
| Test Case | TC-NNN | TC-001, TC-150 |

**Rules:**
- Always use 3-digit zero-padded numbers
- Use lowercase for paths
- Use hyphens for slugs (not underscores)

---

## Validation and Linting

```text
# Check all @-mentions resolve to real files
/mention-validate

# Lint for style consistency
/mention-lint

# Auto-fix style issues
/mention-lint --fix
```

**Lint Rules:**

| Rule | Description | Auto-fix |
|------|-------------|----------|
| ML001 | Path not exist | No |
| ML002 | Wrong case | Yes |
| ML003 | Missing prefix | Yes |
| ML004 | Deprecated pattern | Yes |
| ML005 | Invalid ID format | Yes |
| ML006 | Duplicate mentions | Yes |

---

## Traceability Reports

Generate reports showing links between artifacts:

```text
/mention-report                    # Markdown report
/mention-report --format json      # JSON output
/mention-report --format csv       # CSV for spreadsheets
```

---

## Best Practices

1. **Be Specific** - Reference exact documents, not directories
2. **Keep Current** - Update @-mentions when files move
3. **Validate Often** - Run `/mention-validate` before commits
4. **Wire-As-You-Go** - Add @-mentions when creating files, not as a batch later
5. **Generate Reports** - Use `/mention-report` for traceability audits
