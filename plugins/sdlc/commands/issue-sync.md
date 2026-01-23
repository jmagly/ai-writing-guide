---
description: Automatically detect and update linked issues based on commits, artifacts, and task events
category: project-management
argument-hint: [--commit <sha>] [--scan-recent <count>] [--artifact <path>] [--dry-run]
allowed-tools: Bash(git *, gh *), Read, Glob, mcp__gitea__*
model: sonnet
---

# Issue Sync

You are an Issue Tracking Specialist responsible for maintaining accurate issue status by detecting references in commits, artifacts, and code, then automatically updating linked issues.

## Your Task

Automatically synchronize issue status based on:
1. Git commit messages (detect issue references)
2. AIWG artifacts (@-mentions of issues in documentation)
3. Code comments and TODOs
4. Recent work activity

## Input Modes

### Scan Specific Commit
```bash
/issue-sync --commit abc123
```
Scans the specified commit for issue references and updates accordingly.

### Scan Recent Commits
```bash
/issue-sync --scan-recent 10
```
Scans the last 10 commits for issue references.

### Scan Artifact
```bash
/issue-sync --artifact .aiwg/requirements/use-cases/UC-001.md
```
Scans the specified artifact for issue references in @-mentions or metadata.

### Auto-Detect (Default)
```bash
/issue-sync
```
Scans the most recent commit (HEAD) for issue references.

### Dry Run
```bash
/issue-sync --dry-run
```
Shows what would be updated without making changes.

## Workflow

### Step 1: Detect Repository Type

Determine if using GitHub or Gitea:

```bash
# Check remotes
git remote -v
```

**Detection Logic**:
- Contains `github.com` → Use `gh` CLI
- Contains `git.integrolabs.net` or other Gitea → Use MCP `mcp__gitea__*` tools
- Both present → Check which is `origin`, prefer that one

### Step 2: Parse Issue References

Scan commit messages, code, and artifacts for issue references.

**Standard Patterns**:

| Pattern | Action | Example |
|---------|--------|---------|
| `Fixes #123` | Close issue with completion comment | `git commit -m "Fixes #123: Add auth"` |
| `Closes #123` | Close issue with completion comment | `git commit -m "Closes #123"` |
| `Resolves #123` | Close issue with completion comment | `git commit -m "Resolves #123"` |
| `Implements #123` | Add progress comment, keep open | `git commit -m "Implements #123 partially"` |
| `Addresses #123` | Add progress comment, keep open | `git commit -m "Addresses #123"` |
| `Related to #123` | Add reference comment, keep open | `git commit -m "Related to #123"` |
| `Refs #123` | Add reference comment, keep open | `git commit -m "Refs #123"` |
| `See #123` | Add reference comment, keep open | `git commit -m "See #123"` |
| `Part of #123` | Add progress comment, keep open | `git commit -m "Part of #123"` |
| `Blocks #123` | Add blocker comment to #123 | `git commit -m "Blocks #123"` |
| `Blocked by #123` | Add blocker comment to current | `git commit -m "Blocked by #123"` |

**Multiple Issues**:
```bash
git commit -m "Fixes #123, Closes #456, Addresses #789"
```
Processes each issue separately.

**Cross-Repository References**:
```bash
git commit -m "Fixes owner/repo#123"
```
Updates issue in the specified repository.

### Step 3: Parse Artifact References

Scan AIWG artifacts for issue references in:

**Metadata Sections**:
```markdown
## References

- @issues/17 - Issue tracking automation
- Related: #17, #18
```

**Comment References**:
```markdown
<!-- Issue: #17 -->
<!-- Implements: #17 - Auto-update issues -->
```

**Inline Mentions**:
```markdown
This feature addresses issue #17 by providing automatic synchronization.
```

### Step 4: Gather Context

For each detected issue reference, collect:

**Commit Context**:
- Commit SHA (short and full)
- Commit message (full)
- Author name and email
- Timestamp
- Files changed (count and key files)
- Lines added/removed

**Artifact Context**:
- Artifact path
- Artifact type (requirements, architecture, test, etc.)
- Section where issue is mentioned
- Related artifacts

**Code Context**:
- File paths where issue is referenced
- Code sections (function/class names)
- Comments or TODOs

### Step 5: Determine Update Action

Based on the reference pattern and context, determine what to do:

| Reference Type | Issue Action | Comment Type |
|----------------|--------------|--------------|
| `Fixes/Closes/Resolves` | Close issue | `task-completed.md` |
| `Implements/Addresses` (partial) | Keep open, add comment | `progress-update.md` |
| `Refs/See/Related` | Keep open, add comment | `progress-update.md` |
| `Blocks/Blocked by` | Keep open, add comment | `blocker-found.md` |
| Artifact @-mention | Keep open, add comment | `progress-update.md` |

### Step 6: Generate Comment

Using appropriate template from `templates/issue-comments/`, generate a comment with:

**For Completion (task-completed.md)**:
```markdown
## Task Completed

**Status**: Completed
**Completed by**: {author}
**Completion date**: {timestamp}

## Summary of Work

{commit_message}

## Changes Made

### Files Modified
{file_list}

## Commit Details

- Commit: {sha}
- Branch: {branch}
- Files changed: {count}
- Lines: +{added} -{removed}

## Verification

- [x] Code committed
- [ ] Tests passing (verify in CI)
- [ ] Ready for review

## Related Items

- Commit: {repo}@{sha}

---

*This task has been marked as complete by commit {sha}. Please review and close if satisfactory.*
```

**For Progress (progress-update.md)**:
```markdown
## Progress Update

**Status**: In Progress
**Updated by**: {author}
**Update date**: {timestamp}

## Work Completed

{commit_message}

### Changes in This Update
- Files modified: {file_list}
- Lines changed: +{added} -{removed}

## Commit Reference

- Commit: {repo}@{sha}
- Branch: {branch}

---

*Automated progress update from commit {sha}.*
```

**For Blocker (blocker-found.md)**:
```markdown
## Blocker Alert

**Status**: Blocked
**Reported by**: {author}
**Reported date**: {timestamp}

## Blocker Description

{commit_message}

## Context

Related commit: {repo}@{sha}

{additional_context_from_commit}

---

*Automated blocker notification from commit {sha}.*
```

### Step 7: Update Issue via API

**GitHub (using `gh` CLI)**:

```bash
# Add comment
gh issue comment {issue_number} --body "{comment_body}"

# Close issue if needed
gh issue close {issue_number} --comment "{completion_comment}"
```

**Gitea (using MCP tools)**:

```bash
# Add comment (use MCP tool)
mcp__gitea__create_issue_comment \
  --owner {owner} \
  --repo {repo} \
  --issue_number {number} \
  --body "{comment_body}"

# Close issue if needed (use MCP tool)
mcp__gitea__edit_issue \
  --owner {owner} \
  --repo {repo} \
  --issue_number {number} \
  --state closed

# Then add completion comment
mcp__gitea__create_issue_comment \
  --owner {owner} \
  --repo {repo} \
  --issue_number {number} \
  --body "{completion_comment}"
```

### Step 8: Report Results

Generate summary of actions taken:

```markdown
## Issue Sync Report

**Scan mode**: {mode}
**Commits scanned**: {count}
**Issues detected**: {count}
**Issues updated**: {count}

### Updates Applied

#### Closed Issues
- #123 - "Add authentication" (Fixes in commit abc123)
- #456 - "Update docs" (Closes in commit def456)

#### Progress Updates
- #789 - "Refactor API" (Addresses in commit ghi789)
- #012 - "Performance improvements" (Part of in commit jkl012)

#### Blockers Reported
- #345 - "Deploy pipeline" (Blocked by #678)

### Dry Run (No Changes Made)
{if --dry-run}
The following updates would be applied:
- Issue #123: Close with completion comment
- Issue #456: Add progress update
```

## Detection Heuristics

### Commit Message Analysis

**High-Confidence Patterns** (definitely update):
- Starts with keyword: `Fixes #123: description`
- Contains keyword + colon: `This commit Closes: #123`
- GitHub auto-link style: `Fixes #123`

**Medium-Confidence Patterns** (add progress comment):
- Contains issue number: `Updated feature for #123`
- Contains "issue" + number: `Related to issue #123`

**Low-Confidence Patterns** (skip, too vague):
- Number without context: `Updated 123 things`
- Version numbers: `Release 1.2.3`

### Artifact Analysis

**References Section**:
```markdown
## References

- @issues/17 - Primary issue
- Related: #18, #19
```
High confidence, extract all issue numbers.

**Metadata**:
```markdown
---
issue: 17
related_issues: [18, 19]
---
```
High confidence, parse YAML/frontmatter.

**Inline Mentions**:
```markdown
This implements issue #17 by adding...
```
Medium confidence, extract issue number.

### Code Analysis

**TODO Comments**:
```typescript
// TODO(#123): Refactor this function
// FIXME: Issue #456 - Handle edge case
```
Add reference comment, track technical debt.

**Issue Comments**:
```typescript
/**
 * @issue #123
 * @implements @.aiwg/requirements/UC-001.md
 */
```
High confidence, link issue to implementation.

## Configuration

### `.aiwg/config.yaml`

```yaml
issue_sync:
  enabled: true
  auto_update_on_commit: true
  platforms:
    - github
    - gitea
  patterns:
    close: ["Fixes", "Closes", "Resolves"]
    progress: ["Implements", "Addresses", "Part of"]
    reference: ["Refs", "See", "Related to"]
    blocker: ["Blocks", "Blocked by"]
  auto_close: true  # Automatically close issues on "Fixes"
  require_review: false  # If true, mark as ready-to-close instead
  dry_run: false  # Global dry-run mode
```

## Safety Features

### Prevent False Positives

**Skip if**:
- Issue number is in a URL: `https://example.com/issues/123`
- Issue number is in a version: `v1.2.3`
- Issue number is in a code block (unless TODO)
- Commit message contains `[skip-issue-sync]`

**Validate Before Close**:
- Check issue exists
- Check issue is currently open
- Check current user has permission to close
- Confirm no blockers or dependencies

### Rollback Support

If automated update was incorrect:

```bash
# Reopen issue
gh issue reopen {issue_number}

# Or via Gitea MCP
mcp__gitea__edit_issue --state open
```

Add comment explaining the revert.

## Integration Points

### Post-Commit Hook

Add to `.git/hooks/post-commit`:

```bash
#!/bin/bash
# Auto-sync issues after commit
aiwg issue-sync --commit HEAD
```

### CI/CD Integration

In GitHub Actions or GitLab CI:

```yaml
- name: Sync Issues
  run: |
    aiwg issue-sync --scan-recent 1
```

### Manual Invocation

After bulk work or retroactive cleanup:

```bash
# Scan last 20 commits
/issue-sync --scan-recent 20

# Scan all AIWG artifacts
/issue-sync --artifact .aiwg/**/*.md

# Dry run first
/issue-sync --scan-recent 50 --dry-run
```

## Error Handling

### Issue Not Found

```markdown
Warning: Issue #123 referenced in commit abc123 does not exist.
Action: Skip update, log warning.
```

### Permission Denied

```markdown
Error: Cannot update issue #123 - insufficient permissions.
Action: Skip update, suggest manual review.
```

### API Rate Limit

```markdown
Warning: GitHub/Gitea API rate limit reached.
Action: Queue updates for retry after rate limit reset.
```

### Ambiguous Reference

```markdown
Warning: Commit abc123 references both "Fixes #123" and "Blocked by #123".
Action: Prioritize close action, add blocker note in comment.
```

## Best Practices

### Commit Message Conventions

**Recommended Style**:
```bash
git commit -m "feat: Add authentication (Fixes #123)"
git commit -m "fix: Resolve race condition (Closes #456)"
git commit -m "docs: Update API guide (Addresses #789)"
```

**Multi-Issue Commits**:
```bash
git commit -m "refactor: Consolidate auth logic

This refactoring addresses multiple issues:
- Fixes #123: Duplicate code in auth handlers
- Addresses #124: Performance bottleneck in token validation
- Related to #125: Preparation for OAuth support"
```

### Artifact Linking

**Requirements**:
```markdown
## References

- Primary issue: #17
- Related work: #18, #19
- Blocks: #20
- @.aiwg/architecture/sad.md
```

**Architecture**:
```markdown
## Traceability

- Implements: @.aiwg/requirements/UC-001.md
- Related issue: #17 - Issue sync automation
- ADR: @.aiwg/architecture/adr-017-issue-automation.md
```

### Code Comments

**TODO with Issue**:
```typescript
// TODO(#17): Add retry logic for failed API calls
// FIXME(#18): Handle edge case when issue is already closed
```

**Implementation Reference**:
```typescript
/**
 * @implements @.aiwg/requirements/UC-017.md
 * @issue #17
 * @tests @test/unit/issue-sync.test.ts
 */
export class IssueSync {
  // ...
}
```

## Advanced Features

### Issue Templates Integration

Detect and apply structured data from issue templates:

```markdown
### Acceptance Criteria
- [ ] Feature implemented
- [ ] Tests added
- [ ] Documentation updated

### Definition of Done
- [ ] Code reviewed
- [ ] Tests passing
- [ ] Deployed to staging
```

When closing, verify checklist completion and include in comment.

### Dependency Tracking

Track issue dependencies:

```markdown
## Dependencies

Depends on:
- #15 - Database schema update
- #16 - API endpoint creation

Blocks:
- #18 - Frontend integration
- #19 - End-to-end testing
```

Auto-update dependent issues when this issue closes.

### Milestone Progress

Update milestone progress when issues are closed:

```bash
# Check milestone status
gh issue list --milestone "v2.0" --state open

# Report in milestone
"Issue #17 completed. Milestone 'v2.0' now 60% complete (6/10 issues)."
```

## References

- Templates: @agentic/code/frameworks/sdlc-complete/templates/issue-comments/
- Related commands: @agentic/code/frameworks/sdlc-complete/commands/issue-close.md, @agentic/code/frameworks/sdlc-complete/commands/issue-comment.md
- Configuration: @.aiwg/config.yaml
- MCP tools: Gitea issue management
- Git hooks: Post-commit integration

## Success Criteria

This command succeeds when:

- [x] Correctly detects issue references in commits
- [x] Correctly detects issue references in artifacts
- [x] Generates appropriate comments based on context
- [x] Updates issues via GitHub or Gitea API
- [x] Handles both close and progress update cases
- [x] Validates before closing issues
- [x] Prevents false positives
- [x] Provides clear summary report
- [x] Supports dry-run mode
- [x] Gracefully handles errors (missing issues, permissions)
