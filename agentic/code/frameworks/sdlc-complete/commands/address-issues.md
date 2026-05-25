---
description: Address selected issues; local provider mode prepares bounded .aiwg/issues/ slices
category: project-management
argument-hint: "<issue-id...> [--provider local] [--all-open] [--limit N] [--json]"
allowed-tools: Bash, Read, Write, Edit
model: claude-sonnet-4-6
---

# Address Issues

Use the `address-issues` skill for the full issue-driven implementation loop.
When the project issue backend is local, the CLI entrypoint supports:

```bash
aiwg address-issues LOCAL-0001 --provider local
aiwg address-issues --all-open --provider local --limit 3
```

Local provider mode loads only the selected bounded issue slice from
`.aiwg/issues/`, runs `address-issues-threat-assess` before implementation
work, and appends an AL cycle status event for safe issues.
