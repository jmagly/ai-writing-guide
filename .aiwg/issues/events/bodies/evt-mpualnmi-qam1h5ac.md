## Summary

`aiwg discover "address-issues"` returns no results even though the command is deployed at `.opencode/command/address-issues.md` and exists in the source framework at `agentic/code/frameworks/sdlc-complete/commands/address-issues.md`.

## Reproduction

```bash
$ aiwg discover "address-issues"
No discovery matches for "address-issues" in types: skill,agent,command,rule.

$ aiwg discover "address-issues" --type command
No discovery matches for "address-issues" in types: command.

$ ls .opencode/command/address-issues.md
.opencode/command/address-issues.md
```

## Expected Behavior

`aiwg discover` should return the `address-issues` command with a relevance score, allowing agents to find and invoke it via the skill-discovery protocol.

## Actual Behavior

Discovery returns zero results across all artifact types (skill, agent, command, rule).

## Impact

This breaks the discover-first protocol defined in the skill-discovery rule. When a user issues a directive like "address-issues #1234", the agent:
1. Runs `aiwg discover "address-issues"` per Rule 0/1
2. Gets no results
3. Falls back to improvisation or declines the request
4. Violates the mandatory discovery discipline

## Environment

- Provider: opencode
- Index stats: 891 project artifacts, 1115 codebase artifacts
- Command deployed: Yes (`.opencode/command/address-issues.md`)
- Index fresh: Yes (rebuilt with `aiwg index build`)

## Root Cause Analysis

The index contains command-type artifacts (11 commands per `aiwg index stats`), but `aiwg discover` with type filter "command" returns nothing for "address-issues". This suggests either:
1. The command is not indexed in the discoverable corpus
2. The search algorithm doesn't match on command names
3. The type filter is broken for commands
4. Commands are indexed but not searchable via `discover`