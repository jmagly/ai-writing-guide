# AIWG Contributor Quickstart Guide

**Version:** 0.1 (Draft)
**Last Updated:** 2025-10-17
**Target Audience:** First-time AIWG contributors

## Overview

Contributing to AIWG is different from typical open source projects. You'll use AIWG's own SDLC framework to develop your feature - creating a dogfooding feedback loop that improves both your contribution and the framework itself.

**What makes this unique:**

- Work directly in your AIWG installation (`~/.local/share/ai-writing-guide`)
- Use AIWG's SDLC agents and commands to build your feature
- Automated quality validation ensures maintainability
- Recovery is simple: `aiwg -reinstall` cleans and reclones

**Time to first PR:** ~30 minutes (for simple integrations)

## Prerequisites

Before starting, ensure you have:

### Required Tools

- **GitHub CLI (`gh`)** - Version 2.0 or higher

  ```bash
  # Install
  brew install gh                    # macOS
  sudo apt install gh                # Ubuntu/Debian
  winget install GitHub.cli          # Windows

  # Authenticate
  gh auth login
  ```

- **Node.js** - Version 18.20.8 or higher

  ```bash
  # Check version
  node --version
  # Should output: v18.20.8 or higher
  ```

- **Git** - Version 2.0 or higher

  ```bash
  # Check version
  git --version

  # Configure if needed
  git config --global user.name "Your Name"
  git config --global user.email "your.email@example.com"
  ```

### Recommended Tools

- **Claude Code** or **Warp Terminal** - For interactive SDLC workflows
  - Claude Code: https://claude.ai/code
  - Warp: https://warp.dev

- **VS Code** or **Cursor** - For code editing
  - VS Code: https://code.visualstudio.com
  - Cursor: https://cursor.com

### Verify Prerequisites

```bash
# Check all required tools
gh --version         # Should output: gh version 2.x.x
node --version       # Should output: v18.20.8+
git --version        # Should output: git version 2.x.x

# Verify GitHub authentication
gh auth status
# Should output: Logged in to github.com as <username>
```

> **Important:** All commands must pass before proceeding. If any fail, install the missing tool and try again.

## Quick Start Workflow

### Step 1: Fork and Initialize

Start a new contribution with a single command:

```bash
aiwg -contribute-start cursor-integration
```

**What this does:**

1. Forks `jmagly/ai-writing-guide` to your GitHub account
2. Clones your fork to `~/.local/share/ai-writing-guide`
3. Adds remotes: `origin` (your fork), `upstream` (main repo)
4. Creates feature branch: `contrib/<username>/cursor-integration`
5. Deploys SDLC agents/commands to your fork
6. Creates workspace: `.aiwg/contrib/cursor-integration/`
7. Generates intake form for your feature

**Expected output:**

```text
Starting contribution workflow...
✓ Forked jmagly/ai-writing-guide → yourname/ai-writing-guide
✓ Added remotes (origin=fork, upstream=main)
✓ Created branch: contrib/yourname/cursor-integration
✓ Deployed SDLC agents to fork
✓ Created workspace: .aiwg/contrib/cursor-integration/

Next steps:
1. Open in Claude/Warp: claude ~/.local/share/ai-writing-guide
2. Complete intake: "Complete intake for cursor-integration feature"
3. Start development: "Start Inception phase for cursor-integration"
```

> **Note:** If you already have a fork, the command will detect it and add it as `origin` instead of creating a new fork.

### Step 2: Complete Intake (Using Claude/Warp)

Open your AIWG installation in Claude Code or Warp:

```bash
# Claude Code
claude ~/.local/share/ai-writing-guide

# Or Warp
cd ~/.local/share/ai-working-guide
warp
```

**Natural language prompt to Claude/Warp:**

```text
Complete intake for cursor-integration feature.

Feature description: Add native Cursor Editor support with single-file .cursor/rules integration. This includes:
- Setup command: aiwg -setup-cursor
- Agent deployment to .cursor/rules
- Quick-start documentation

Priority: Medium
Complexity: Low
Timeline: 1 week
```

**What happens:**

- Claude/Warp uses AIWG's intake-wizard command
- Generates `.aiwg/contrib/cursor-integration/intake.md`
- Asks strategic questions about your feature
- Creates initial implementation plan

**Example intake output:**

```markdown
# Feature Intake: Cursor Integration

## Feature Overview
- **Feature ID:** cursor-integration
- **Priority:** Medium
- **Complexity:** Low
- **Timeline:** 1 week

## Description
Add native Cursor Editor support with single-file .cursor/rules integration.

## Deliverables
- Setup command: aiwg -setup-cursor
- Agent deployment script
- Quick-start documentation

## Dependencies
- Cursor Editor 0.40+
- Node.js 18.20.8+

## Success Criteria
- Users can deploy agents with one command
- Documentation is clear and complete
- Works on macOS, Linux, Windows
```

### Step 3: Develop Your Feature

**Natural language prompt to Claude/Warp:**

```text
Start Inception phase for cursor-integration.

Guidance: Focus on simplicity. Follow the pattern from warp integration (tools/warp/setup-warp.mjs). Priority is single-command deployment.
```

**What happens:**

- Claude/Warp orchestrates SDLC workflows
- Creates architecture sketch
- Identifies risks
- Generates implementation plan
- Starts Construction phase

**Example development session:**

```text
You: "Implement cursor integration setup command"

Claude: I'll create the setup command following the Warp integration pattern.
        Creating: tools/cursor/setup-cursor.mjs
        ✓ Setup command implemented (250 lines)
        ✓ Unit tests created
        Next: Update install.sh routing

You: "Update install.sh to route --setup-cursor"

Claude: Adding cursor routing to install.sh...
        ✓ Added --setup-cursor case
        ✓ Follows existing pattern
        Next: Create documentation

You: "Create quick-start documentation"

Claude: Creating docs/integrations/cursor-quickstart.md...
        ✓ Quick-start guide created
        ✓ Prerequisites listed
        ✓ Example walkthrough included
        Next: Run quality validation
```

> **Pro Tip:** Use natural language throughout. Claude/Warp understands AIWG's SDLC terminology and will orchestrate the right workflows automatically.

### Step 4: Validate Quality

Before creating a PR, validate your contribution meets quality standards:

```bash
aiwg -contribute-test cursor-integration
```

**What this checks:**

1. **Markdown Lint:** All `.md` files follow formatting rules
2. **Manifest Sync:** Manifest files are up-to-date
3. **Documentation:** README, quick-start, integration docs present
4. **Breaking Changes:** Documented if present
5. **Quality Score:** Calculated based on completeness

**Expected output (passing):**

```text
Running quality validation for cursor-integration...

✓ Markdown lint: PASSED (0 errors, 0 warnings)
✓ Manifest sync: PASSED (all manifests current)
✓ Documentation: COMPLETE
  - README.md updated ✓
  - Quick-start guide present ✓
  - Integration doc present ✓
✓ Breaking changes: NONE
✓ Tool validation: PASSED

Quality Score: 95/100

✅ Ready for PR creation
```

**Expected output (failing):**

```text
Running quality validation for cursor-integration...

✓ Markdown lint: PASSED
⚠ Manifest sync: NEEDS UPDATE (run: aiwg -sync-manifests)
✗ Documentation: INCOMPLETE
  - README.md not updated ✗
  - Quick-start guide present ✓
  - Integration doc present ✓
✓ Breaking changes: NONE
✓ Tool validation: PASSED

Quality Score: 72/100

❌ Quality score below minimum (80). Fix issues before PR creation.

Issues to fix:
1. Update README.md to mention cursor integration
2. Run manifest sync: aiwg -sync-manifests --write

Fix command: aiwg -contribute-test cursor-integration --verbose
```

> **Important:** Minimum quality score is 80-90%. If your score is below this, fix the issues listed and re-run validation.

### Step 5: Create Pull Request

Once validation passes, create your PR:

```bash
aiwg -contribute-pr cursor-integration
```

**Interactive prompts:**

```text
PR Title: Add Cursor Editor platform integration

PR Type:
[1] feature (new functionality)
[2] bugfix (fix existing issue)
[3] docs (documentation only)
[4] refactor (code improvement, no behavior change)

Choice: 1

Breaking Changes: no

Generating PR description...
```

**Generated PR description:**

```markdown
## Summary

Adds native Cursor Editor support with single-file .cursor/rules integration.

## Changes

- Created tools/cursor/setup-cursor.mjs (250 lines)
- Added --setup-cursor flag to install.sh
- Updated README.md with Cursor integration mention
- Created docs/integrations/cursor-quickstart.md

## Testing

✓ Markdown lint passed
✓ Documentation complete
✓ Tested on Cursor 0.40+
✓ Quality score: 95/100

## Checklist

- [x] Documentation updated
- [x] Tests passing
- [x] Breaking changes documented (N/A)
- [x] Manifests synced

---

🤖 Generated using AIWG contributor workflow
```

**Command output:**

```text
Creating pull request...
✓ All changes committed
✓ Pushed to origin: contrib/yourname/cursor-integration
✓ PR created: https://github.com/jmagly/ai-writing-guide/pull/123

Next steps:
- Monitor PR: aiwg -contribute-monitor cursor-integration
- Respond to reviews: aiwg -contribute-respond cursor-integration
```

> **Note:** The PR will automatically include quality validation results and AIWG contributor workflow attribution.

## Working with PR Feedback

### Monitor PR Status

Check your PR status at any time:

```bash
aiwg -contribute-monitor cursor-integration
```

**Expected output:**

```text
PR #123: Add Cursor Editor platform integration
Status: Changes Requested
CI: ✓ Passed

Reviews:
@jmagly (Maintainer) - Changes Requested (2 hours ago)
  - "Please add --mode flag support for cursor integration"
    File: tools/cursor/setup-cursor.mjs:45
  - "Update install.sh to route --platform cursor"
    File: tools/install/install.sh:245

Next steps:
1. Address feedback: aiwg -contribute-respond cursor-integration
2. Or discuss: gh pr comment 123 --body "..."
```

### Respond to Feedback

Address reviewer comments using AIWG's interactive response workflow:

```bash
aiwg -contribute-respond cursor-integration
```

**Interactive session:**

```text
Found 2 requested changes:

Change 1/2: Add --mode flag support
File: tools/cursor/setup-cursor.mjs:45
Comment: "Please add --mode flag support for cursor integration"

Options:
[1] Open in editor
[2] Use AIWG agent to implement
[3] Skip for now
[4] Add comment/question

Choice: 2

Launching Software Implementer agent...
Reading file: tools/cursor/setup-cursor.mjs
Analyzing change request...
Implementing --mode flag support...

✓ Added --mode parameter to setup-cursor.mjs
✓ Added validation for --mode values
✓ Updated help text
✓ Unit tests updated

Change implemented. Continue? [y/n]: y

Change 2/2: Update install.sh routing
File: tools/install/install.sh:245
Comment: "Update install.sh to route --platform cursor"

Options:
[1] Open in editor
[2] Use AIWG agent to implement
[3] Skip for now
[4] Add comment/question

Choice: 2

Launching Software Implementer agent...
Reading file: tools/install/install.sh
Implementing --platform cursor routing...

✓ Added --platform cursor case
✓ Routes to setup-cursor.mjs
✓ Follows existing pattern

All changes addressed.

Re-running quality validation...
✓ Quality score: 93/100

Committing changes and pushing...
✓ Committed: "Address PR feedback: Add --mode flag and platform routing"
✓ Pushed to origin

Posting PR comment...
✓ Comment posted: "All requested changes addressed. Re-ran validation (93/100)."

PR updated: https://github.com/jmagly/ai-writing-guide/pull/123
```

> **Pro Tip:** Option 2 (Use AIWG agent) is fastest for straightforward changes. For complex changes requiring discussion, use option 4 to add a comment first.

### Discuss Changes

If you need clarification or want to discuss an approach:

```bash
# Add comment to PR
gh pr comment 123 --body "Should --mode support 'both' or require explicit sdlc|general choice?"

# Or use interactive mode
aiwg -contribute-respond cursor-integration
# Choose option 4: Add comment/question
```

## Keeping Your Fork Updated

### Sync with Upstream

Regularly sync your fork with the main repository:

```bash
aiwg -contribute-sync cursor-integration
```

**Expected output (no conflicts):**

```text
Checking for upstream changes...
Upstream changes detected:
- 5 new commits on main
- No conflicts detected

Sync strategy:
[1] Rebase (recommended - clean history)
[2] Merge (preserves all commits)

Choice: 1

Rebasing contrib/yourname/cursor-integration onto upstream/main...
✓ Rebased successfully
✓ Pushed to origin (force-with-lease)

Your branch is now up-to-date with upstream/main
```

**Expected output (with conflicts):**

```text
Checking for upstream changes...
Upstream changes detected:
- 5 new commits on main
- Potential conflicts in: install.sh

Sync strategy:
[1] Rebase (recommended)
[2] Merge

Choice: 1

Rebasing...
❌ Conflict detected in install.sh (line 245)

Conflict preview:
<<<<<<< HEAD (your changes)
  --setup-cursor)
    node "$INSTALL_DIR/tools/cursor/setup-cursor.mjs" "${@:2}"
=======
  --setup-windsurf)
    node "$INSTALL_DIR/tools/windsurf/setup-windsurf.mjs" "${@:2}"
>>>>>>> upstream/main (incoming changes)

Options:
[1] Open in editor to resolve manually
[2] Use AIWG agent to resolve conflict
[3] Accept your version
[4] Accept upstream version
[5] Abort rebase

Choice: 2

Launching Conflict Resolver agent...
Analyzing conflict...
✓ Conflict resolved: Kept both cursor and windsurf cases
✓ Validated syntax

Continuing rebase...
✓ Rebase complete
✓ Pushed to origin (force-with-lease)

Your branch is now up-to-date with upstream/main
```

> **Important:** Run sync before creating PRs and weekly during long-running contributions.

## Abort and Recovery

### Abort Current Contribution

If you need to abandon a contribution or start fresh:

```bash
aiwg -contribute-abort cursor-integration
```

**What this does:**

1. Switches to main branch
2. Deletes feature branch locally and remotely
3. Removes `.aiwg/contrib/cursor-integration/` workspace
4. Optionally deletes fork (asks for confirmation)

**Expected output:**

```text
Aborting contribution: cursor-integration

⚠ Warning: This will delete:
- Local branch: contrib/yourname/cursor-integration
- Remote branch: origin/contrib/yourname/cursor-integration
- Workspace: .aiwg/contrib/cursor-integration/

Your fork (yourname/ai-writing-guide) will be preserved.

Continue? [y/n]: y

✓ Switched to main branch
✓ Deleted local branch: contrib/yourname/cursor-integration
✓ Deleted remote branch: origin/contrib/yourname/cursor-integration
✓ Removed workspace: .aiwg/contrib/cursor-integration/

Contribution aborted. Your fork is still available at:
https://github.com/yourname/ai-writing-guide

To start a new contribution:
aiwg -contribute-start <feature-name>
```

### Fresh Start (Reinstall AIWG)

If your AIWG installation is corrupted or you want a completely clean slate:

```bash
aiwg -reinstall
```

**What this does:**

1. Backs up custom configuration (if any)
2. Deletes `~/.local/share/ai-writing-guide`
3. Clones fresh copy from upstream
4. Restores configuration
5. Re-registers `aiwg` CLI

**Expected output:**

```text
⚠ Warning: This will delete your entire AIWG installation.

Your fork and remote branches will be preserved.
Custom configuration will be backed up.

Continue? [y/n]: y

Creating backup...
✓ Backed up: ~/.local/share/ai-writing-guide.backup/

Removing installation...
✓ Deleted: ~/.local/share/ai-writing-guide

Cloning fresh copy...
✓ Cloned: jmagly/ai-writing-guide → ~/.local/share/ai-writing-guide

Restoring configuration...
✓ Restored: .aiwg/config.json

Re-registering CLI...
✓ aiwg command registered

✅ Fresh installation complete

To resume your contribution:
1. aiwg -contribute-start cursor-integration
   (will detect existing fork and branch)
2. Continue where you left off
```

> **Note:** `aiwg -reinstall` is safe to run anytime. Your fork and remote branches are never deleted.

## Example Walkthrough: Adding Cursor Integration

Let's walk through a complete real-world example from start to finish.

### Step 1: Start Contribution

```bash
cd ~/.local/share/ai-writing-guide
aiwg -contribute-start cursor-integration
```

**Output:**

```text
✓ Forked jmagly/ai-writing-guide → yourname/ai-writing-guide
✓ Created branch: contrib/yourname/cursor-integration
✓ Created workspace: .aiwg/contrib/cursor-integration/
```

### Step 2: Open in Claude Code

```bash
claude ~/.local/share/ai-writing-guide
```

**Prompt to Claude:**

```text
Complete intake for cursor-integration feature.

Feature: Add native Cursor Editor support with single-file .cursor/rules integration.

Requirements:
- Setup command: aiwg -setup-cursor
- Deploy agents to .cursor/rules (single file)
- Support --mode flag (sdlc|general|both)
- Platform detection in install.sh
- Quick-start documentation

Priority: Medium
Complexity: Low
Timeline: 1 week
```

**Claude's response:**

```text
✓ Created intake: .aiwg/contrib/cursor-integration/intake.md
✓ Analyzed requirements
✓ Identified dependencies: Node.js 18.20.8+, Cursor 0.40+
✓ Created implementation plan

Next: Start Inception phase? [y/n]
```

Type: `y`

### Step 3: Implement Feature (Inception → Construction)

**Prompt to Claude:**

```text
Start Inception phase for cursor-integration.

Guidance: Follow warp integration pattern (tools/warp/setup-warp.mjs). Keep it simple. Single-file deployment is priority.
```

**Claude orchestrates workflow:**

```text
✓ Inception phase started
✓ Created architecture sketch
✓ Identified risks: None major (low complexity)
✓ Implementation plan ready

Starting Construction...

Creating tools/cursor/setup-cursor.mjs...
✓ Implemented setup command (275 lines)
✓ Added --mode flag support
✓ Added platform detection
✓ Created unit tests

Updating tools/install/install.sh...
✓ Added --setup-cursor routing
✓ Added --platform cursor detection

Creating documentation...
✓ Created docs/integrations/cursor-quickstart.md
✓ Updated README.md

Construction complete. Ready for testing.
```

### Step 4: Validate Quality

```bash
aiwg -contribute-test cursor-integration
```

**Output:**

```text
Running quality validation...

✓ Markdown lint: PASSED
⚠ Manifest sync: NEEDS UPDATE

Quality Score: 78/100 (below minimum)

Fix: aiwg -sync-manifests --write
```

**Fix manifests:**

```bash
aiwg -sync-manifests --write
```

**Re-run validation:**

```bash
aiwg -contribute-test cursor-integration
```

**Output:**

```text
✓ Markdown lint: PASSED
✓ Manifest sync: PASSED
✓ Documentation: COMPLETE
✓ Breaking changes: NONE
✓ Tool validation: PASSED

Quality Score: 92/100

✅ Ready for PR creation
```

### Step 5: Create PR

```bash
aiwg -contribute-pr cursor-integration
```

**Interactive:**

```text
PR Title: Add Cursor Editor platform integration
PR Type: [1] feature
Breaking Changes: no

Creating PR...
✓ PR created: https://github.com/jmagly/ai-writing-guide/pull/124
```

### Step 6: Monitor and Respond

**Check status:**

```bash
aiwg -contribute-monitor cursor-integration
```

**Output:**

```text
PR #124: Add Cursor Editor platform integration
Status: Changes Requested

Review from @jmagly:
- "Add example .cursor/rules output to quickstart"
  File: docs/integrations/cursor-quickstart.md:45
```

**Address feedback:**

```bash
aiwg -contribute-respond cursor-integration
```

**Interactive:**

```text
Change 1/1: Add example .cursor/rules output

Options:
[1] Open in editor
[2] Use AIWG agent
[3] Skip
[4] Comment

Choice: 2

Launching Documentation Writer agent...
✓ Added example .cursor/rules output
✓ Included explanation

✓ Committed and pushed
✓ Posted PR comment

All changes addressed.
```

### Step 7: Approval and Merge

**Monitor again:**

```bash
aiwg -contribute-monitor cursor-integration
```

**Output:**

```text
PR #124: Add Cursor Editor platform integration
Status: ✅ Approved
CI: ✓ Passed

@jmagly approved: "Great work! Merging now."

Your PR has been merged! 🎉

Cleanup:
aiwg -contribute-abort cursor-integration
```

**Cleanup:**

```bash
aiwg -contribute-abort cursor-integration
```

**Done!** Your contribution is now part of AIWG.

## Quality Standards

### Minimum Requirements

To create a PR, your contribution must meet:

1. **Quality Score:** 80-90% minimum

   - Calculated automatically by `aiwg -contribute-test`
   - Based on documentation, linting, completeness

2. **Documentation:**

   - README.md mentions feature
   - Quick-start guide exists (`docs/integrations/<feature>-quickstart.md`)
   - Integration doc complete (if applicable)

3. **Linting:**

   - All markdown files pass `markdownlint-cli2`
   - No formatting errors

4. **Manifests:**

   - All `manifest.json` files synced
   - No missing files

5. **Breaking Changes:**

   - Documented if present
   - Migration guide provided

### Quality Score Breakdown

```text
Base Score: 100 points

Deductions:
- Missing README update: -20
- Missing quick-start: -20
- Missing integration doc: -10
- Lint errors: -5 per error
- Manifest out of sync: -10
- Breaking changes undocumented: -30
- Missing tests: -10
```

**Example calculation:**

```text
Base: 100
- Missing README update: -20
- 2 lint errors: -10
Total: 70/100 (FAIL - below 80 minimum)
```

### What Maintainers Look For

Even with 100% quality score, maintainers may request changes for:

1. **Code Quality:**

   - Follows existing patterns
   - Well-commented
   - Efficient implementation

2. **User Experience:**

   - Clear error messages
   - Helpful documentation
   - Intuitive commands

3. **Maintainability:**

   - No hardcoded paths
   - Testable code
   - Extensible design

4. **Consistency:**

   - Matches existing style
   - Uses established conventions
   - Integrates smoothly

> **Remember:** Quality gates catch obvious issues. Maintainer review ensures long-term maintainability.

## Troubleshooting

### Common Issues

#### Issue: GitHub CLI not authenticated

**Error:**

```text
Error: gh not authenticated
Run: gh auth login
```

**Fix:**

```bash
gh auth login
# Follow interactive prompts
```

#### Issue: Fork already exists

**Error:**

```text
Error: Fork already exists at yourname/ai-writing-guide
```

**Fix:**

```bash
# Check existing contributions
aiwg -contribute-status

# Or start contribution anyway (will use existing fork)
aiwg -contribute-start <feature-name>
```

#### Issue: Quality score too low

**Error:**

```text
Error: Quality score too low (65/100)

Issues:
- Markdown lint: 3 errors
- Documentation: README.md not updated
```

**Fix:**

```bash
# View detailed issues
aiwg -contribute-test <feature-name> --verbose

# Fix markdown lint errors
npm exec markdownlint-cli2-fix "**/*.md"

# Update README
# (open in editor and add feature mention)

# Re-run validation
aiwg -contribute-test <feature-name>
```

#### Issue: Merge conflict

**Error:**

```text
Error: Merge conflict in install.sh

Options:
1. Open in editor
2. Use AIWG agent
3. Abort
```

**Fix (Option 1 - Manual):**

```bash
# Open conflicted file
code install.sh

# Resolve conflict markers (<<<<<<, =======, >>>>>>>)
# Save file

# Continue rebase
git rebase --continue

# Push
git push origin <branch> --force-with-lease
```

**Fix (Option 2 - Agent):**

```bash
# In aiwg -contribute-sync session:
Choice: 2  # Use AIWG agent to resolve conflict

# Agent analyzes and resolves automatically
```

#### Issue: PR creation fails

**Error:**

```text
Error: Cannot create PR. Uncommitted changes detected.

Uncommitted files:
- tools/cursor/setup-cursor.mjs
- docs/integrations/cursor-quickstart.md
```

**Fix:**

```bash
# Commit changes
git add .
git commit -m "Complete cursor integration implementation"

# Try PR creation again
aiwg -contribute-pr <feature-name>
```

#### Issue: Outdated fork

**Error:**

```text
Error: Your branch is 15 commits behind upstream/main

Run: aiwg -contribute-sync <feature-name>
```

**Fix:**

```bash
aiwg -contribute-sync <feature-name>
# Choose: [1] Rebase (recommended)
```

### Getting Help

If you encounter issues not covered here:

1. **Check documentation:**

   - [CONTRIBUTING.md](../../CONTRIBUTING.md)
   - [PR Guidelines](pr-guidelines.md)
   - [Using AIWG for Contributions](using-aiwg-for-contributions.md)

2. **Search existing issues:**

   ```bash
   gh issue list --repo jmagly/ai-writing-guide --search "your error"
   ```

3. **Ask in discussions:**

   ```bash
   gh discussion create --repo jmagly/ai-writing-guide \
     --title "Question: <your topic>" \
     --body "Your question"
   ```

4. **Open an issue:**

   ```bash
   gh issue create --repo jmagly/ai-writing-guide \
     --title "Bug: <description>" \
     --body "Detailed description and steps to reproduce"
   ```

## Next Steps

Now that you understand the contributor workflow:

1. **Identify a contribution:**

   - Platform integration (Cursor, Windsurf, Zed)
   - New SDLC agent
   - Documentation improvement
   - Bug fix

2. **Read detailed guides:**

   - [Using AIWG for Contributions](using-aiwg-for-contributions.md) - Deep dive into SDLC workflow
   - [PR Guidelines](pr-guidelines.md) - PR standards and conventions

3. **Start your first contribution:**

   ```bash
   aiwg -contribute-start <your-feature>
   ```

4. **Join the community:**

   - Star the repo: https://github.com/jmagly/ai-writing-guide
   - Watch for updates
   - Participate in discussions

## Command Reference

Quick reference for all contributor commands:

| Command | Purpose | Usage |
|---------|---------|-------|
| `aiwg -contribute-start [feature]` | Fork and initialize contribution | `aiwg -contribute-start cursor-integration` |
| `aiwg -contribute-status [feature]` | Show contribution status | `aiwg -contribute-status cursor-integration` |
| `aiwg -contribute-test [feature]` | Validate quality before PR | `aiwg -contribute-test cursor-integration` |
| `aiwg -contribute-pr [feature]` | Create pull request | `aiwg -contribute-pr cursor-integration` |
| `aiwg -contribute-monitor [feature]` | Monitor PR status and reviews | `aiwg -contribute-monitor cursor-integration` |
| `aiwg -contribute-respond [feature]` | Address PR feedback | `aiwg -contribute-respond cursor-integration` |
| `aiwg -contribute-sync [feature]` | Sync with upstream | `aiwg -contribute-sync cursor-integration` |
| `aiwg -contribute-abort [feature]` | Abort contribution | `aiwg -contribute-abort cursor-integration` |
| `aiwg -reinstall` | Fresh AIWG installation | `aiwg -reinstall` |

## FAQ

### Q: Can I work on multiple features simultaneously?

**A:** Yes. Use separate feature branches and workspaces:

```bash
aiwg -contribute-start cursor-integration
aiwg -contribute-start windsurf-integration
aiwg -contribute-start new-agent-feature
```

Each gets isolated workspace in `.aiwg/contrib/<feature>/`.

### Q: What if my quality score is 79%?

**A:** You need 80-90% minimum. Fix the issues listed by `aiwg -contribute-test --verbose` and re-run validation.

### Q: Can I use my own editor instead of Claude/Warp?

**A:** Yes. SDLC workflows are helpful but not required. You can:

```bash
# Use any editor
code ~/.local/share/ai-writing-guide

# Create PR manually
git commit -am "Add feature"
git push origin <branch>
gh pr create --title "..." --body "..."
```

But you'll need to ensure quality manually.

### Q: How long until my PR is reviewed?

**A:** Typically 1-3 days. Complex PRs may take longer. Monitor status:

```bash
aiwg -contribute-monitor <feature>
```

### Q: What if I disagree with requested changes?

**A:** Discuss in PR comments:

```bash
gh pr comment <pr-number> --body "I implemented X instead of Y because..."
```

Maintainers are open to alternative approaches if well-reasoned.

### Q: Can I contribute to other repos using these commands?

**A:** Yes! The contributor commands work with any GitHub repository:

```bash
# Fork and contribute to any repo
cd <some-repo>
aiwg -contribute-start <feature>
# ... same workflow
```

### Q: What happens if upstream changes conflict with my PR?

**A:** Sync your fork:

```bash
aiwg -contribute-sync <feature>
# Resolve conflicts
# Push updated branch
```

PR will automatically update.

### Q: Do I need AIWG installed to contribute?

**A:** Yes. The contributor workflow uses AIWG's installation directory and tooling. Install first:

```bash
curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/main/tools/install/install.sh | bash
```

---

**Ready to contribute?** Start now:

```bash
aiwg -contribute-start <your-feature-name>
```

**Questions?** Open a discussion: https://github.com/jmagly/ai-writing-guide/discussions

**Found a bug in this guide?** Open an issue: https://github.com/jmagly/ai-writing-guide/issues
