---
name: sessions
description: Use aiwg sessions to manage the normalized session catalog, imports, analytics, and authorized forensic evidence with versioned JSON
triggers:
  - session catalog
  - list sessions
  - import sessions
  - sessions doctor
argument-hint: "<command> [options]"
allowed-tools: Bash
---

# Session Catalog Command

Run `aiwg sessions <command> [options]` for the normalized session catalog.
Use `aiwg sessions --help` for the current subcommands and options.

Examples:

```bash
aiwg sessions sources --json
aiwg sessions list --json
aiwg sessions import <file> --source-id <id> --json
aiwg sessions doctor --json
```

Use only authorized workspace histories and import sources. Mutation previews,
confirmation requirements, workspace authorization, and the versioned JSON
contract are enforced by the sessions CLI. Follow its diagnostics before
confirming a persistent change.

The singular `aiwg session` command launches provider sessions; `aiwg sessions`
manages the normalized catalog.
