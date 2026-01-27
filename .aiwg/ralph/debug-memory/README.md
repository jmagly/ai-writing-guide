# Debug Memory

Persistent storage for executable feedback loop sessions, enabling pattern learning across iterations.

## Structure

```
debug-memory/
├── sessions/          # Individual execution session records
│   └── session-*.yaml # Per-session YAML files
├── patterns/          # Learned fix patterns
│   └── learned-patterns.yaml
├── archive/           # Archived old sessions
└── README.md          # This file
```

## Schema

All sessions conform to @.aiwg/ralph/schemas/debug-memory.yaml

## Usage

- Sessions created automatically by `/execute-feedback` command
- Patterns extracted by `auto-test-execution` skill
- Query via `/debug-memory query [keyword]`
- View statistics via `/debug-memory stats`

## References

- @.claude/rules/executable-feedback.md - Rules
- @.aiwg/ralph/schemas/debug-memory.yaml - Schema
- @.aiwg/ralph/docs/executable-feedback-guide.md - Guide
