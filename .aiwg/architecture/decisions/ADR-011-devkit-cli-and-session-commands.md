# ADR-011: CLI and In-Session Commands for Scaffolding

**Status**: Proposed
**Date**: 2025-12-10
**Deciders**: Architecture Designer, Project Owner
**Context**: AIWG Development Kit Implementation

---

## Context and Problem Statement

Scaffolding new addons, frameworks, extensions, and components requires creating files and directories. Users may want to:
- Quickly scaffold from command line without an active Claude session
- Get AI-assisted guidance during creation within a session

Options considered:
1. **Claude-only** (in-session commands create all files)
2. **CLI-only** (bash commands only)
3. **Both** (CLI for quick scaffold, Claude for interactive)

## Decision Drivers

- **Speed**: Quick operations shouldn't require AI session
- **Intelligence**: Complex decisions benefit from AI guidance
- **Accessibility**: Both terminal-native and AI-assisted workflows
- **Consistency**: Same outcomes regardless of method

## Decision

Provide **both CLI commands and in-session commands** for scaffolding:

| Operation | CLI Command | In-Session Command |
|-----------|-------------|-------------------|
| Create addon | `aiwg scaffold-addon <name>` | `/devkit-create-addon <name>` |
| Create framework | `aiwg scaffold-framework <name>` | `/devkit-create-framework <name>` |
| Create extension | `aiwg scaffold-extension <name> --for <framework>` | `/devkit-create-extension <name>` |
| Add agent | `aiwg add-agent <name> --to <target>` | `/devkit-create-agent <name>` |
| Add command | `aiwg add-command <name> --to <target>` | `/devkit-create-command <name>` |
| Add skill | `aiwg add-skill <name> --to <target>` | `/devkit-create-skill <name>` |
| Validate | `aiwg validate <path>` | `/devkit-validate <path>` |

## Rationale

1. **Different use cases**: Quick scaffold vs. thoughtful design
2. **CLI doesn't require session**: Users can scaffold without Claude
3. **AI adds intelligence**: Can suggest initial agents, validate purpose, catch issues
4. **Shared templates**: Both methods use same template files
5. **Consistent output**: CLI is authoritative for structure, Claude adds guidance

## Consequences

### Positive

- Users choose workflow that fits their needs
- CLI enables automation and scripting
- AI guidance reduces errors and improves quality
- Both methods produce identical structure

### Negative

- Two codepaths to maintain (Node.js CLI + command markdown)
- Must keep both in sync when patterns change
- Documentation must cover both approaches

### Risks

**Risk: CLI/in-session divergence** (MEDIUM)
- **Mitigation**: Share template files, automated tests for both paths
- **Acceptance**: Regular sync checks, shared template source

## Implementation Pattern

**CLI Flow:**
```bash
aiwg scaffold-addon my-utils --description "Custom utilities"
# 1. Load template from aiwg-utils/templates/devkit/
# 2. Substitute placeholders
# 3. Create directory structure
# 4. Write files
# 5. Report success
```

**In-Session Flow:**
```
/devkit-create-addon my-utils --interactive
# 1. AI asks clarifying questions
# 2. AI determines appropriate template
# 3. AI customizes based on responses
# 4. Uses same template files as CLI
# 5. Validates result
# 6. Reports success with recommendations
```

## Alternatives Considered

### Alternative 1: Claude-Only

All scaffolding through in-session commands.

**Rejected because**: Requires active AI session for simple operations, can't script/automate.

### Alternative 2: CLI-Only

All scaffolding through bash commands.

**Rejected because**: Loses AI guidance benefits, users must know all options upfront.

## References

- **ADR-009**: Devkit extends aiwg-utils
- **ADR-010**: Templates in aiwg-utils/templates/devkit/
- **install.sh**: CLI registration point
- **AIWG Development Kit Plan**: `.aiwg/planning/aiwg-devkit-plan.md`

---

**Last Updated**: 2025-12-10
**Author**: Claude (Orchestrator)
**Reviewers**: Project Owner (pending)
