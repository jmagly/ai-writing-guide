---
name: mention-wire
description: Analyze codebase and inject @-mentions for traceability
args: [--target <dir>] [--dry-run] [--interactive] [--auto] [--confidence <threshold> --guidance "text"]
---

# @-Mention Wiring

Analyze codebase relationships and inject @-mentions for traceability.

## Research Foundation

- **REF-001**: BP-9 - Traceability from requirements to code to tests
- Claude Code 2.0.43: @-mention fixes for reliable nested loading

## Usage

```bash
/mention-wire                           # Analyze current directory
/mention-wire --dry-run                 # Show what would be added
/mention-wire --interactive             # Approve each mention
/mention-wire --auto                    # Apply high-confidence mentions
/mention-wire --confidence 90           # Set confidence threshold
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --target | . | Directory to analyze |
| --dry-run | false | Show proposed changes without applying |
| --interactive | false | Prompt for approval per file |
| --auto | false | Apply mentions above confidence threshold |
| --confidence | 80 | Minimum confidence % for auto mode |

## Process

### 1. Scan Directory

Identify files and their types:
- Source code (`.ts`, `.js`, `.py`, `.go`, etc.)
- Test files (`*.test.*`, `*.spec.*`, `test_*`)
- SDLC artifacts (`.aiwg/**/*.md`)
- Documentation (`docs/**/*.md`)

### 2. Analyze Relationships

Detect relationships using heuristics:

| Pattern | Inferred @-mention | Confidence |
|---------|-------------------|------------|
| File in `src/auth/` | `@.aiwg/requirements/UC-*-auth*.md` | 85% |
| File named `*test*.ts` | `@src/{corresponding-source}.ts` | 92% |
| Comment `// UC-001` | `@.aiwg/requirements/UC-001.md` | 95% |
| Comment `// ADR-005` | `@.aiwg/architecture/adrs/ADR-005*.md` | 90% |
| JSDoc `@implements` | Parse and validate | 98% |
| Import statement | `@{imported-file}` | 88% |

### 3. Generate Suggestions

Output format:
```
src/services/auth/login.ts (confidence: 85%)
  + @.aiwg/requirements/UC-003-user-auth.md (name match)
  + @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md (comment: "JWT")

test/integration/auth.test.ts (confidence: 92%)
  + @src/services/auth/login.ts (test-to-source)
  + @.aiwg/requirements/UC-003-user-auth.md (inherited from source)
```

### 4. Apply Changes

Depending on mode:
- `--dry-run`: Display only
- `--interactive`: Prompt per file
- `--auto`: Apply above threshold

## Placement Rules

### Code Files

Add @-mentions to file header:

```typescript
/**
 * @file Authentication Service
 * @implements @.aiwg/requirements/UC-003-user-auth.md
 * @architecture @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md
 * @security @.aiwg/security/controls/authn-001.md
 * @tests @test/integration/auth.test.ts
 */
```

### Markdown Files

Add to References section:

```markdown
## References

- @.aiwg/requirements/user-stories.md - Functional requirements
- @.aiwg/architecture/software-architecture-doc.md - Architecture
```

## Examples

```bash
# Preview what would be wired
/mention-wire --dry-run

# Wire with interactive approval
/mention-wire --interactive

# Auto-wire high confidence (>80%)
/mention-wire --auto

# Auto-wire with higher threshold
/mention-wire --auto --confidence 90
```

## CLI Equivalent

```bash
aiwg wire-mentions [--target <dir>] [--dry-run] [--interactive] [--auto]
```

## Related Commands

- `/mention-validate` - Validate @-mentions resolve
- `/mention-lint` - Lint @-mention style
- `/mention-report` - Generate traceability report
- `/mention-conventions` - Display conventions

Wire @-mentions for: $ARGUMENTS
