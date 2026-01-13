# issue-auto-sync

Automatically detect and update linked issues after commits or artifact changes.

## Triggers

- "sync issues"
- "update linked issues"
- "check issue references in commits"
- "auto-update issues"
- "post-commit issue sync"
- After git commit (if configured)
- After artifact creation/update

## Purpose

This skill maintains issue tracker synchronization by:
- Detecting issue references in commit messages
- Scanning AIWG artifacts for issue mentions
- Automatically updating issues with progress
- Closing issues when work is completed
- Notifying blocked/dependent issues

## Behavior

When triggered, this skill:

1. **Detects issue references**:
   - Parse recent commit messages for patterns like "Fixes #123", "Addresses #45"
   - Scan AIWG artifacts for issue mentions in metadata or references sections
   - Check code comments for TODO(#123) or @issue #123 patterns

2. **Classifies reference type**:
   - **Completion**: `Fixes`, `Closes`, `Resolves` → Close issue
   - **Progress**: `Implements`, `Addresses`, `Part of` → Add progress comment
   - **Reference**: `Refs`, `See`, `Related to` → Add reference comment
   - **Blocker**: `Blocks`, `Blocked by` → Add blocker notification

3. **Gathers context**:
   - Extract commit SHA, message, author, timestamp
   - List changed files and line counts
   - Find related artifacts and test files
   - Check CI/CD status if available

4. **Generates appropriate comment**:
   - Use `task-completed.md` template for closure
   - Use `progress-update.md` template for progress
   - Use `blocker-found.md` template for blockers
   - Include commit details, file changes, and context

5. **Updates issues via API**:
   - Post comment to GitHub (using `gh` CLI) or Gitea (using MCP tools)
   - Close issue if completion pattern detected
   - Add appropriate labels (in-progress, blocked, completed)
   - Update dependent/blocking issues

6. **Reports results**:
   - List issues detected and updated
   - Show actions taken (commented, closed, labeled)
   - Highlight any errors or skipped updates

## Reference Detection Patterns

### Commit Message Patterns

| Pattern | Action | Example |
|---------|--------|---------|
| `Fixes #N` | Close issue | `git commit -m "Fixes #17: Add auth"` |
| `Closes #N` | Close issue | `git commit -m "Closes #17"` |
| `Resolves #N` | Close issue | `git commit -m "Resolves #17"` |
| `Implements #N` | Progress update | `git commit -m "Implements #17 partially"` |
| `Addresses #N` | Progress update | `git commit -m "Addresses #17"` |
| `Part of #N` | Progress update | `git commit -m "Part of #17"` |
| `Related to #N` | Reference comment | `git commit -m "Related to #17"` |
| `Refs #N` | Reference comment | `git commit -m "Refs #17"` |
| `See #N` | Reference comment | `git commit -m "See #17"` |
| `Blocks #N` | Blocker notification | `git commit -m "Blocks #17"` |
| `Blocked by #N` | Blocker notification | `git commit -m "Blocked by #17"` |

**Multi-issue support**:
```bash
git commit -m "Fixes #17, Closes #18, Addresses #19"
```
Each issue is processed separately.

**Cross-repository**:
```bash
git commit -m "Fixes owner/repo#123"
```
Updates issue in the specified repository.

### Artifact Reference Patterns

**Metadata section**:
```markdown
## References

- Primary issue: #17
- Related: #18, #19
- Blocks: #20
```

**Frontmatter**:
```yaml
---
issue: 17
related_issues: [18, 19]
blocked_by: 16
---
```

**Inline mentions**:
```markdown
This feature addresses issue #17 by implementing automatic synchronization.
```

### Code Reference Patterns

**TODO comments**:
```typescript
// TODO(#17): Add retry logic
// FIXME(#17): Handle edge case
```

**Documentation comments**:
```typescript
/**
 * @issue #17
 * @implements @.aiwg/requirements/UC-017.md
 */
export class IssueSync {}
```

**Test descriptions**:
```typescript
describe('Issue #17: Auto-sync', () => {
  it('should detect issue references', () => {});
});
```

## Context Gathering

For each detected issue, collect:

**Commit Information**:
- SHA (short and full)
- Message (full text)
- Author name and email
- Timestamp
- Branch name
- Parent commit(s)

**Change Statistics**:
- Files changed (count)
- Lines added
- Lines removed
- Key files (categorize as code, test, docs, config)

**Artifact Context**:
- Path to artifact
- Artifact type (requirements, architecture, test plan, etc.)
- Section where issue is mentioned
- Related artifacts

**Build/Test Context**:
- CI/CD pipeline status (if available)
- Test results (passing/failing)
- Code coverage changes

## Comment Generation

### Completion Comment (Fixes/Closes/Resolves)

```markdown
## Task Completed

**Status**: Completed
**Completed by**: {author_name}
**Completion date**: {commit_timestamp}

## Summary of Work

{commit_message}

## Changes Made

### Files Modified
{list_of_changed_files_with_categorization}

**Code Changes**:
- `{file_path}` (+{lines} -{lines})

**Tests Added**:
- `{test_file_path}` (+{lines} -{lines})

**Documentation**:
- `{doc_file_path}` (+{lines} -{lines})

### Statistics
- Total files changed: {count}
- Lines added: {count}
- Lines removed: {count}

## Commit Details

- **Commit**: {repo}@{short_sha}
- **Branch**: {branch_name}
- **Full SHA**: {full_sha}
- **View**: {commit_url}

## Verification

- [x] Code committed and pushed
- [ ] CI/CD pipeline (check: {ci_url})
- [ ] Code review (if required)
- [ ] Ready for deployment

## Related Items

- Commit: {repo}@{sha}
{if_applicable}
- Related PR: #{pr_number}
- Related issues: #{issue_numbers}
- Artifacts: {artifact_paths}

---

*Automated completion notice from commit {short_sha}. Please review and verify.*
```

### Progress Comment (Implements/Addresses/Part of)

```markdown
## Progress Update

**Status**: In Progress
**Updated by**: {author_name}
**Update date**: {commit_timestamp}
**Progress**: {estimate}% complete

## Work Completed

{commit_message}

### Changes in This Update

**Files modified**: {count}
{key_file_list}

**Lines changed**: +{added} -{removed}

### Commits in This Update
- {short_sha}: {message}

## Current Status

{infer_from_commit_and_files}

## Commit Reference

- **Commit**: {repo}@{short_sha}
- **Branch**: {branch_name}
- **View**: {commit_url}

---

*Automated progress update from commit {short_sha}.*
```

### Blocker Comment (Blocks/Blocked by)

```markdown
## Blocker Alert

**Status**: Blocked
**Reported by**: {author_name}
**Reported date**: {commit_timestamp}
**Severity**: {infer_from_context}

## Blocker Description

{commit_message}

## Context

Related commit: {repo}@{short_sha}

{additional_context_from_changed_files}

## Impact

{analyze_blocking_relationship}

## Commit Reference

- **Commit**: {repo}@{short_sha}
- **Branch**: {branch_name}
- **View**: {commit_url}

---

*Automated blocker notification from commit {short_sha}. Please address this blocking issue.*
```

## API Integration

### GitHub (via `gh` CLI)

```bash
# Add comment
gh issue comment {issue_number} --body "{comment_body}"

# Close issue
gh issue close {issue_number} --comment "{completion_comment}"

# Add label
gh issue edit {issue_number} --add-label "completed"
```

### Gitea (via MCP tools)

```bash
# Add comment
mcp__gitea__create_issue_comment \
  --owner {owner} \
  --repo {repo} \
  --issue_number {number} \
  --body "{comment_body}"

# Close issue
mcp__gitea__edit_issue \
  --owner {owner} \
  --repo {repo} \
  --issue_number {number} \
  --state closed

# Then add completion comment
```

### Repository Detection

```bash
# Check remotes to determine platform
git remote -v

# If github.com → Use gh CLI
# If git.integrolabs.net or other Gitea → Use MCP tools
# Prefer origin remote if multiple remotes present
```

## Safety and Validation

### Skip Updates If:

- Issue number in URL: `https://example.com/issues/123`
- Issue number is version: `v1.2.3`
- Commit message contains `[skip-issue-sync]`
- Issue doesn't exist
- Issue is already closed (for non-completion actions)
- User lacks permission to update issue

### Validate Before Close:

- Issue exists and is currently open
- User has permission to close
- No other open blockers referenced
- CI/CD passing (if configured to check)

### Error Handling:

**Issue not found**:
```
Warning: Issue #123 not found. Skipping update.
```

**Permission denied**:
```
Warning: Cannot update issue #123 - insufficient permissions. Manual update required.
```

**API rate limit**:
```
Warning: API rate limit reached. Queuing updates for retry.
```

## Configuration

### `.aiwg/config.yaml`

```yaml
issue_auto_sync:
  enabled: true
  platforms:
    - github
    - gitea

  # When to run
  triggers:
    post_commit: true
    artifact_update: true
    manual: true

  # Detection patterns
  patterns:
    close: ["Fixes", "Closes", "Resolves"]
    progress: ["Implements", "Addresses", "Part of"]
    reference: ["Refs", "See", "Related to"]
    blocker: ["Blocks", "Blocked by"]

  # Behavior
  auto_close: true
  auto_label: true
  notify_dependencies: true

  # Safety
  skip_patterns:
    - "\\[skip-issue-sync\\]"
    - "https?://.*/issues/\\d+"
    - "v\\d+\\.\\d+\\.\\d+"

  # Scanning
  scan_commits: 1  # Number of commits to scan
  scan_artifacts: true
  scan_code_comments: false  # Disable for performance
```

### Git Hooks Integration

**Post-commit hook** (`.git/hooks/post-commit`):

```bash
#!/bin/bash
# Auto-sync issues after commit

# Check if skill is enabled
if grep -q "issue_auto_sync: enabled: true" .aiwg/config.yaml 2>/dev/null; then
  # Run issue sync skill
  aiwg skill run issue-auto-sync
fi
```

**Pre-push hook** (bulk sync before push):

```bash
#!/bin/bash
# Sync all commits in push

# Get commits being pushed
commits=$(git log origin/main..HEAD --pretty=format:"%H")

# Run sync for each
for commit in $commits; do
  aiwg issue-sync --commit $commit
done
```

## Usage Examples

### After Commit

```bash
# Commit references issue
git commit -m "Fixes #17: Add issue sync automation"
git push

# Skill automatically runs (if post-commit hook enabled)
# Or manually trigger
aiwg skill run issue-auto-sync

Output:
"Issue Auto-Sync Complete

Commits scanned: 1
Issues detected: 1

Updated Issues:
✅ #17 - Closed with completion comment
   Commit: abc123
   Action: Closed issue with task-completed template

No errors."
```

### Scan Recent Commits

```bash
# Scan last 5 commits
aiwg issue-sync --scan-recent 5

Output:
"Issue Auto-Sync Complete

Commits scanned: 5
Issues detected: 3

Updated Issues:
✅ #17 - Closed
✅ #18 - Progress update added
✅ #19 - Reference comment added

Skipped:
⚠️  #20 - Already closed
⚠️  #21 - Issue not found"
```

### Artifact Update Trigger

```markdown
When .aiwg/requirements/UC-017.md is updated with:

## References
- Primary issue: #17
- Related: #18

Skill detects reference and adds comment to #17:
"Referenced in artifact: .aiwg/requirements/UC-017.md
This issue is now documented in requirements."
```

## Integration with Other Skills

### Works With:

- **traceability-check**: Links issues to requirements and code
- **project-awareness**: Understands repository structure
- **artifact-metadata**: Extracts issue references from AIWG artifacts

### Triggers From:

- **git-workflow**: After commit, push, merge
- **artifact-orchestration**: After artifact creation/update
- **sdlc-phase-transitions**: When moving between phases

## Report Format

```markdown
## Issue Auto-Sync Report

**Run time**: {timestamp}
**Trigger**: {post-commit|manual|artifact-update}
**Scope**: {commit_range_or_artifacts}

### Summary

- Commits scanned: {count}
- Artifacts scanned: {count}
- Issues detected: {count}
- Issues updated: {count}
- Errors: {count}

### Actions Taken

#### Closed Issues ({count})
- #17 - "Add issue sync automation"
  - Commit: abc123
  - Comment: task-completed.md
  - Label added: completed

#### Progress Updates ({count})
- #18 - "Update documentation"
  - Commit: def456
  - Comment: progress-update.md
  - Label added: in-progress

#### Reference Comments ({count})
- #19 - "Refactor API"
  - Commit: ghi789
  - Comment: reference

#### Blocker Notifications ({count})
- #20 - "Deploy pipeline"
  - Blocked by: #21
  - Notified in commit jkl012

### Skipped ({count})

- #22 - Already closed
- #23 - Issue not found
- #24 - Permission denied

### Errors ({count})

{if_any}
- API rate limit reached (queued for retry)
- Connection timeout for issue #25

### Next Actions

{if_applicable}
- Review closed issues: #{numbers}
- Address permission issues: #{numbers}
- Retry failed updates: #{numbers}
```

## Best Practices

### Commit Message Conventions

**Clear intent**:
```bash
✅ Good: "Fixes #17: Add automatic issue synchronization"
❌ Bad: "Fixed stuff"
```

**Multiple issues**:
```bash
✅ Good: "Fixes #17, Addresses #18, Related to #19"
❌ Bad: "Fixes 17 18 19" (ambiguous)
```

**Descriptive context**:
```bash
✅ Good: "Implements #17: Add commit message parsing and API integration"
❌ Bad: "Implements #17" (no context)
```

### Artifact References

**Explicit in metadata**:
```markdown
## References

- Primary: #17 - Issue sync automation
- Related: #18 - Documentation updates
- Blocks: #20 - Until API integration complete
```

**Clear in descriptions**:
```markdown
This feature implements issue #17 by adding automatic synchronization
between git commits and issue trackers.
```

## Output Locations

- Sync reports: `.aiwg/reports/issue-sync-{timestamp}.md`
- Error logs: `.aiwg/logs/issue-sync-errors.log`
- Update history: `.aiwg/logs/issue-updates.json`

## References

- Commands: @agentic/code/frameworks/sdlc-complete/commands/issue-sync.md, @agentic/code/frameworks/sdlc-complete/commands/issue-close.md
- Templates: @agentic/code/frameworks/sdlc-complete/templates/issue-comments/
- Configuration: @.aiwg/config.yaml
- MCP tools: Gitea issue management
