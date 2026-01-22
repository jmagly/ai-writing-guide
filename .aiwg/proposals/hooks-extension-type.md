# Proposal: Hooks as First-Class Extension Type

**Status**: Draft
**Author**: AIWG Team
**Date**: 2026-01-22
**Issue**: TBD

## Executive Summary

Add `hooks` as a first-class extension type in AIWG alongside `agents`, `commands`, `skills`, and `templates`. This enables proper discovery, deployment, and settings.json generation for Claude Code lifecycle hooks.

## Background

### Current State

AIWG currently treats hooks as secondary artifacts within addons:

```
agentic/code/addons/ralph/hooks/
├── ralph-loop.js      # Not deployed to settings.json
└── ralph-commit.js    # Manual installation required

agentic/code/addons/aiwg-hooks/hooks/
├── aiwg-trace.js      # Users must manually configure
├── aiwg-permissions.js
└── aiwg-session.js
```

**Problems**:
1. Hooks aren't deployed to `.claude/settings.json` or `~/.claude/settings.json`
2. No automatic discovery during `aiwg use`
3. No standardized hook schema or validation
4. No multi-provider support (hooks are Claude Code specific, but the pattern could extend)

### Claude Code Hook Events (v2.1.0+)

| Event | Purpose | Can Block |
|-------|---------|-----------|
| `PreToolUse` | Validate before tool execution | Yes |
| `PostToolUse` | Feedback after tool succeeds | Indirect |
| `PostToolUseFailure` | Handle tool failures | No |
| `PermissionRequest` | Auto-approve/deny permissions | Yes |
| `UserPromptSubmit` | Add context before processing | Yes |
| `Stop` | When Claude finishes responding | Yes |
| `SubagentStart` | When spawning subagent | No |
| `SubagentStop` | When subagent finishes | Yes |
| `SessionStart` | Session init/resume | No |
| `SessionEnd` | Session cleanup | No |
| `Notification` | Customize notifications | No |
| `PreCompact` | Before context compaction | No |

### Hook Types

1. **Command hooks** (`type: "command"`) - Shell scripts, deterministic
2. **Prompt hooks** (`type: "prompt"`) - LLM-based, intelligent decisions

## Proposal

### 1. Hook Extension Schema

```yaml
# hooks/my-hook.yaml (or .json)
---
id: my-hook
name: My Custom Hook
version: 1.0.0
description: Does something useful
events:
  - PreToolUse
  - PostToolUse
matchers:
  - "Edit|Write"       # Tool pattern
  - "Bash"
type: command          # command | prompt
entry: ./my-hook.js    # Executable path
timeout: 60            # seconds
environment:
  MY_VAR: value
```

### 2. Directory Structure

```
agentic/code/
├── addons/
│   └── my-addon/
│       └── hooks/
│           ├── my-hook.yaml      # Hook definition
│           └── my-hook.js        # Hook executable
├── hooks/                        # Standalone hooks
│   ├── code-quality/
│   │   ├── hook.yaml
│   │   └── prettier-on-save.js
│   └── security/
│       ├── hook.yaml
│       └── block-env-files.js
```

### 3. Deployment Output

When `aiwg use sdlc` runs, hooks get deployed to settings:

```json
// .claude/settings.json (project)
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/prettier-on-save.js",
            "timeout": 30
          }
        ]
      }
    ],
    "SubagentStart": [
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/aiwg-trace.js start"
          }
        ]
      }
    ]
  }
}
```

### 4. Hook Categories

Organize hooks by purpose:

| Category | Hooks | Purpose |
|----------|-------|---------|
| **observability** | aiwg-trace, ralph-loop | Workflow tracing, iteration tracking |
| **code-quality** | prettier-on-save, lint-on-edit | Auto-formatting, validation |
| **security** | block-env-files, redact-secrets | Protect sensitive files |
| **permissions** | auto-approve-safe, deny-dangerous | Permission management |
| **workflow** | ralph-commit, session-context | Workflow automation |

### 5. CLI Commands

```bash
# Deploy hooks
aiwg use sdlc              # Includes hook deployment
aiwg hooks deploy          # Deploy hooks only

# List available hooks
aiwg hooks list
aiwg hooks list --installed

# Install specific hook
aiwg hooks install code-quality/prettier-on-save

# Configure hooks
aiwg hooks configure       # Interactive setup
aiwg hooks configure --event PreToolUse

# Test hooks
aiwg hooks test my-hook    # Dry run with sample input
```

### 6. Hook Discovery

During `aiwg use`, discover hooks from:

1. Framework hooks (`frameworks/*/hooks/`)
2. Addon hooks (`addons/*/hooks/`)
3. User hooks (`~/.aiwg/hooks/`)
4. Project hooks (`.aiwg/hooks/`)

Merge into single settings.json with conflict resolution.

### 7. Manifest Updates

Update addon/framework manifests:

```json
{
  "id": "ralph",
  "type": "addon",
  "entry": {
    "hooks": "hooks/"
  },
  "hooks": [
    {
      "id": "ralph-loop",
      "events": ["Stop", "SubagentStop"],
      "type": "command"
    },
    {
      "id": "ralph-commit",
      "events": ["PostToolUse"],
      "matchers": ["Edit", "Write"],
      "type": "command"
    }
  ]
}
```

### 8. Popular Hook Patterns (Excitement!)

Based on community adoption and best practices:

#### Auto-Format on Save
```javascript
// PostToolUse for Edit|Write
// Runs prettier/eslint --fix on modified files
```

#### Protected Files
```javascript
// PreToolUse for Edit|Write|Bash
// Blocks .env, credentials, package-lock.json
// Exit code 2 = block with reason
```

#### Smart Auto-Approve
```javascript
// PermissionRequest
// Auto-allow safe operations (read, glob, grep)
// Deny dangerous (rm -rf, force push)
```

#### Session Context Loader
```javascript
// SessionStart
// Loads project context, recent issues, team notes
// Writes to CLAUDE_ENV_FILE for session
```

#### Audit Logger
```javascript
// All tool events
// JSONL log of all actions for compliance
```

#### Task Continuation (Ralph)
```javascript
// Stop hook with prompt type
// "Evaluate if task is complete, if not continue"
```

#### Notification Customization
```javascript
// Notification hook
// Desktop notifications, Slack, email
```

### 9. Security Considerations

1. **Hook Review**: Warn users when installing hooks from external sources
2. **Sandboxing**: Document that hooks run with user credentials
3. **Input Validation**: Provide utilities for safe JSON parsing
4. **Timeout Enforcement**: Respect timeout limits
5. **No Secrets in Hooks**: Follow token security patterns

### 10. Implementation Phases

#### Phase 1: Foundation
- Hook schema definition
- Basic deployment to settings.json
- `aiwg hooks list` command

#### Phase 2: Core Hooks
- Migrate existing aiwg-hooks and ralph hooks
- Add code-quality hooks (prettier, lint)
- Add security hooks (block-env)

#### Phase 3: Advanced Features
- `aiwg hooks test` dry-run
- Hook composition (chain multiple hooks)
- Prompt-type hooks for intelligent decisions
- Cross-provider abstraction (future)

## Related Work

### claude-role (sysops)

The `claude-role` script from sysops isn't a hook but a useful MCP role launcher:

```bash
claude-role dev    # Launch with dev MCPs (gitea, hound, memory)
claude-role ops    # Launch with ops MCPs
claude-role minimal # Launch with minimal MCPs
```

**Recommendation**: Keep this separate as an "MCP Profiles" feature, not part of hooks. Could be integrated into `aiwg launch --profile dev`.

## Decision Questions

1. Should hooks be provider-specific (Claude only) or abstractable?
2. Should we support prompt-type hooks out of the gate?
3. How to handle hook conflicts between framework and addon?
4. Should hooks have their own `devkit-create-hook` scaffolder?

## Success Metrics

- Hooks deployed automatically with `aiwg use`
- At least 5 production-ready hooks in core
- Documentation and examples for custom hooks
- Community contributions of useful hooks

## References

- [Claude Code Hooks Guide](https://code.claude.com/docs/en/hooks-guide.md)
- [Claude Code Hooks Reference](https://code.claude.com/docs/en/hooks.md)
- @agentic/code/addons/aiwg-hooks/README.md
- @agentic/code/addons/ralph/hooks/
