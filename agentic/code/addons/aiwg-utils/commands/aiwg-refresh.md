---
name: aiwg-refresh
description: Update AIWG CLI and redeploy frameworks/tools to current project without leaving the session
args: "[--update-cli] [--all] [--sdlc] [--marketing] [--utils] [--provider <claude|factory|openai|cursor|warp>] [--force] [--dry-run]"
---

# Refresh AIWG Deployment

Update the AIWG CLI and/or redeploy frameworks, agents, commands, and tools to the current project without leaving the agentic session.

## Use Cases

- **After AIWG updates**: Get latest framework features without restarting
- **After switching branches**: Ensure deployed content matches expectations
- **After manual edits**: Restore canonical AIWG content
- **Provider switch**: Redeploy for different platform (Claude → Factory)

## Parameters

| Flag | Description |
|------|-------------|
| `--update-cli` | Update AIWG CLI to latest version before redeploying |
| `--all` | Redeploy all installed frameworks |
| `--sdlc` | Redeploy SDLC framework only |
| `--marketing` | Redeploy Marketing framework only |
| `--utils` | Redeploy aiwg-utils addon only |
| `--provider <name>` | Target platform: claude, factory, openai, cursor, warp (default: auto-detect) |
| `--force` | Force redeploy even if already up-to-date |
| `--dry-run` | Show what would be done without executing |

## Execution Steps

### Step 1: Show Current Status

Run status check and report current state:

```bash
aiwg -status
```

Report:
```
AIWG Refresh - Current Status
==============================

CLI Version: 1.2.3 (stable channel)
Workspace: /path/to/project/.aiwg

Installed Frameworks:
  - sdlc-complete v1.0.0 (58 agents, 48 commands)
  - aiwg-utils v1.0.0 (3 agents, 25 commands)

Platform: Claude Code (.claude/)
  - Agents: 61 deployed
  - Commands: 73 deployed
```

### Step 2: Update CLI (if --update-cli)

If `--update-cli` flag is set:

```bash
aiwg -update
```

Report update status:
```
Checking for updates...
  Current: 1.2.3
  Latest:  1.2.5

Updating AIWG CLI...
✓ Updated to v1.2.5

Changes in v1.2.5:
  - New mutation-analyst agent
  - Testing-quality addon
  - Bug fixes
```

If already up-to-date:
```
AIWG CLI is up-to-date (v1.2.3)
```

### Step 3: Determine What to Redeploy

Based on flags, determine scope:

| Flags | Action |
|-------|--------|
| No flags | Show status only, prompt for action |
| `--all` | Redeploy all installed frameworks |
| `--sdlc` | Redeploy sdlc-complete only |
| `--marketing` | Redeploy media-marketing-kit only |
| `--utils` | Redeploy aiwg-utils addon only |
| Multiple | Redeploy specified frameworks |

If no framework flags and not `--dry-run`, ask user:

```
What would you like to refresh?

[1] All frameworks (sdlc-complete, aiwg-utils)
[2] SDLC framework only
[3] Utils addon only
[4] Just show status (no changes)

Choice:
```

### Step 4: Detect Target Platform

If `--provider` not specified, auto-detect:

1. Check existing deployments:
   - `.claude/agents/` exists → claude
   - `.factory/droids/` exists → factory
   - `.codex/agents/` exists → openai
   - `.cursor/rules/` exists → cursor

2. If multiple detected, ask user:
   ```
   Multiple platforms detected:
   [1] Claude Code (.claude/)
   [2] Factory AI (.factory/)

   Which platform to refresh?
   ```

3. If none detected, default to claude

Report:
```
Target platform: Claude Code
Deployment paths:
  - Agents: .claude/agents/
  - Commands: .claude/commands/
```

### Step 5: Execute Redeploy

For each framework to deploy:

```bash
# SDLC Framework
aiwg use sdlc --provider <platform> --force

# Marketing Framework
aiwg use marketing --provider <platform> --force

# Utils (included with sdlc)
# No separate command needed
```

**If `--dry-run`:**
Show commands without executing:

```
Dry Run - Would execute:
========================

1. aiwg use sdlc --provider claude --force
   → Deploy 58 agents to .claude/agents/
   → Deploy 48 commands to .claude/commands/

2. aiwg use marketing --provider claude --force
   → Deploy 37 agents to .claude/agents/
   → Deploy 20 commands to .claude/commands/

No changes made (dry run mode)
```

**Progress Reporting:**

```
Refreshing AIWG Deployment
==========================

[1/2] Deploying sdlc-complete...
  → Copying 58 agents...
  → Copying 48 commands...
  → Copying 12 templates...
  ✓ sdlc-complete deployed

[2/2] Deploying aiwg-utils...
  → Copying 3 agents...
  → Copying 25 commands...
  ✓ aiwg-utils deployed
```

### Step 6: Verify Deployment

After deployment, verify:

```bash
# Count deployed assets
ls .claude/agents/*.md 2>/dev/null | wc -l
ls .claude/commands/*.md 2>/dev/null | wc -l
```

Report:
```
Verification
============

Deployed Assets:
  - Agents: 95 files
  - Commands: 93 files

Platform Files:
  - CLAUDE.md: Present
  - .claude/settings.local.json: Present

All assets deployed successfully!
```

### Step 7: Summary Report

```
AIWG Refresh Complete
=====================

CLI:
  Version: 1.2.5 (updated from 1.2.3)

Frameworks Deployed:
  ✓ sdlc-complete v1.0.0 (58 agents, 48 commands)
  ✓ aiwg-utils v1.0.0 (3 agents, 25 commands)

Platform: Claude Code
  - .claude/agents/: 61 files
  - .claude/commands/: 73 files

New capabilities available:
  - /setup-tdd - TDD enforcement setup
  - /flow-test-strategy-execution - Test execution workflow
  - mutation-analyst agent - Test quality analysis

Session ready - new features are now available!
```

## Examples

```bash
# Check status only
/aiwg-refresh

# Update CLI and redeploy everything
/aiwg-refresh --update-cli --all

# Just redeploy SDLC framework
/aiwg-refresh --sdlc

# Switch to Factory AI deployment
/aiwg-refresh --all --provider factory

# Preview what would happen
/aiwg-refresh --all --dry-run

# Force refresh even if up-to-date
/aiwg-refresh --all --force
```

## Natural Language Triggers

This command should activate when user says:
- "refresh aiwg" / "update aiwg"
- "redeploy frameworks" / "redeploy agents"
- "get latest aiwg features"
- "update my aiwg tools"
- "sync aiwg deployment"

## Error Handling

| Condition | Action |
|-----------|--------|
| AIWG CLI not found | Error: "AIWG CLI not installed. Run: curl -fsSL ... \| bash" |
| Network error on update | Warn and continue with existing version |
| Framework not installed | Offer to install: "SDLC not installed. Install now? [y/N]" |
| Permission denied | Error with specific file/directory that failed |
| Invalid provider | Error listing valid providers |

## Post-Refresh Recommendations

After refresh, suggest:

```
Recommended next steps:
1. Review new features: aiwg -help
2. Check framework docs: /aiwg-kb sdlc
3. Run health check: aiwg doctor
```

## References

- @docs/development/file-placement-guide.md - Correct file placement workflow
- @agentic/code/addons/aiwg-utils/commands/aiwg-regenerate.md - Context file regeneration
- @docs/CLI_USAGE.md - Full CLI documentation
