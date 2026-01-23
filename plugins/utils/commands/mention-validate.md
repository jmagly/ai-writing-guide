---
name: mention-validate
description: Validate all @-mentions resolve to existing files
args: [--target <dir>] [--strict] [--output <file> --interactive --guidance "text"]
---

# @-Mention Validation

Validate that all @-mentions in codebase resolve to existing files.

## Usage

```bash
/mention-validate                    # Validate current directory
/mention-validate --strict           # Fail on any broken mention
/mention-validate --output report.md # Write report to file
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| --target | . | Directory to validate |
| --strict | false | Exit with error on broken mentions |
| --output | stdout | Write report to file |

## Process

1. **Scan** all files for @-mention patterns
2. **Extract** @-mention paths
3. **Resolve** paths relative to repo root
4. **Report** broken/valid mentions

## Output Format

```
@-Mention Validation Report
===========================

✓ Valid Mentions: 42
✗ Broken Mentions: 3

Broken Mentions:
  src/auth/login.ts:5
    @.aiwg/requirements/UC-999.md → NOT FOUND

  .aiwg/architecture/sad.md:23
    @.aiwg/requirements/NFR-PERF-005.md → NOT FOUND

  test/integration/api.test.ts:12
    @src/services/api-old.ts → NOT FOUND (deleted?)

Summary: 3 broken mentions in 3 files
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All mentions valid |
| 1 | Broken mentions found (with --strict) |

## CLI Equivalent

```bash
aiwg validate-mentions [--target <dir>] [--strict]
```

## Related Commands

- `/mention-wire` - Add @-mentions
- `/mention-lint` - Lint @-mention style
- `/mention-report` - Generate traceability report

Validate @-mentions for: $ARGUMENTS
