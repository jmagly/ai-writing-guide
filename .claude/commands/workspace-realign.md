---
name: workspace-realign
description: Reorganize and update .aiwg/ documentation to reflect current project reality
args: "[project-directory] [--archive-stale] [--delete-stale] [--dry-run] [--since <commit>] [--interactive] [--guidance "text"]"
---

# Workspace Realign

Analyze and reorganize documentation in `.aiwg/` to ensure it accurately reflects the current project state, plans, and reality. Uses git commit history to understand changes since documentation was last updated.

## Parameters

| Flag | Description |
|------|-------------|
| `project-directory` | Project root (default: `.`) |
| `--archive-stale` | Move stale documents to `.aiwg/archive/` instead of deleting |
| `--delete-stale` | Delete stale documents (requires confirmation) |
| `--dry-run` | Preview changes without modifying files |
| `--since <commit>` | Analyze changes since specific commit (default: last doc update) |
| `--interactive` | Prompt for each decision |

## Execution Steps

### Step 1: Analyze Current State

Scan `.aiwg/` directory structure:

```bash
# Count documents by category
find .aiwg -name "*.md" -type f | wc -l

# Get last modification times
find .aiwg -name "*.md" -type f -exec stat -c '%Y %n' {} \; | sort -rn
```

Report current state:
```
Workspace Analysis
==================
Total documents: 47
Categories:
  - requirements/    12 docs
  - architecture/     8 docs
  - planning/         6 docs
  - risks/            4 docs
  - testing/          5 docs
  - security/         3 docs
  - working/          9 docs (temporary)
```

### Step 2: Identify Last Documentation Alignment

Find when documentation was last synchronized with code:

1. **Check for alignment marker:**
   ```bash
   cat .aiwg/.last-alignment 2>/dev/null
   ```

2. **Check git log for doc commits:**
   ```bash
   git log --oneline --since="30 days ago" -- .aiwg/
   ```

3. **Find most recent doc update:**
   ```bash
   git log -1 --format="%H %ci" -- .aiwg/
   ```

Report:
```
Last Alignment
==============
Last doc commit: abc1234 (2025-12-01)
Current HEAD:    def5678
Commits since:   23 commits
Days since:      8 days
```

### Step 3: Analyze Code Changes Since Last Alignment

Compare code changes vs documentation:

```bash
# Get changed files since last alignment
git diff --name-only <last-alignment-commit>..HEAD

# Categorize changes
git diff --stat <last-alignment-commit>..HEAD
```

**Change Categories:**

| Change Type | Doc Impact |
|-------------|------------|
| New features | Requires new requirements/arch docs |
| Refactoring | May invalidate architecture docs |
| API changes | API docs need update |
| Test changes | Test strategy may need update |
| Security changes | Security docs may be stale |
| Deleted code | Related docs may be obsolete |

Report:
```
Code Changes Analysis
=====================
Since: abc1234 (2025-12-01)

Feature Changes (5):
  + src/auth/oauth.ts (new)
  + src/auth/jwt.ts (new)
  ~ src/api/endpoints.ts (modified)
  ~ src/models/user.ts (modified)
  - src/legacy/old-auth.ts (deleted)

Impacted Documentation:
  - .aiwg/requirements/user-stories.md (user auth stories)
  - .aiwg/architecture/api-design.md (endpoint changes)
  - .aiwg/security/auth-strategy.md (new auth methods)
  - .aiwg/architecture/legacy-support.md (deleted code)
```

### Step 4: Identify Stale Documents

Documents are considered stale if:

1. **References deleted code/features:**
   - Mentions files that no longer exist
   - References APIs that were removed

2. **Contradicts current implementation:**
   - Architecture describes different structure
   - Requirements don't match actual behavior

3. **Outdated planning artifacts:**
   - Completed iteration plans
   - Resolved risk items
   - Closed decision records

4. **Superseded documents:**
   - Earlier versions of refined docs
   - Draft documents that became final

**Stale Detection Heuristics:**

```bash
# Find docs referencing deleted files
for doc in .aiwg/**/*.md; do
  # Extract file references from doc
  grep -oE 'src/[a-zA-Z0-9_/.-]+' "$doc" | while read ref; do
    [ ! -e "$ref" ] && echo "STALE: $doc references missing $ref"
  done
done

# Find docs with old terminology
grep -r "deprecated_feature" .aiwg/

# Find completed iteration plans
grep -l "Status: Completed" .aiwg/planning/iteration-*.md
```

Report:
```
Stale Document Analysis
=======================

DEFINITELY STALE (3):
  .aiwg/architecture/legacy-support.md
    - References deleted: src/legacy/old-auth.ts
    - Last updated: 45 days ago
    Recommendation: ARCHIVE or DELETE

  .aiwg/planning/iteration-3-plan.md
    - Status: Completed
    - All items delivered
    Recommendation: ARCHIVE

  .aiwg/requirements/feature-x-draft.md
    - Superseded by: feature-x-final.md
    Recommendation: DELETE

POSSIBLY STALE (2):
  .aiwg/architecture/api-design.md
    - References modified: src/api/endpoints.ts
    - May need update
    Recommendation: REVIEW

  .aiwg/risks/performance-spike.md
    - Linked PoC completed
    - Risk may be retired
    Recommendation: REVIEW
```

### Step 5: Identify Missing Documentation

Based on code changes, identify gaps:

```bash
# New features without docs
for feature in $(git diff --name-only --diff-filter=A <since>..HEAD | grep -E '^src/'); do
  # Check if any doc references this file
  grep -l "$feature" .aiwg/**/*.md 2>/dev/null || echo "UNDOCUMENTED: $feature"
done
```

Report:
```
Documentation Gaps
==================

New Code Without Documentation:
  src/auth/oauth.ts
    - No architecture doc
    - No security review
    Recommendation: Create .aiwg/architecture/oauth-integration.md

  src/auth/jwt.ts
    - No architecture doc
    Recommendation: Add to .aiwg/security/auth-strategy.md

Modified APIs Without Doc Updates:
  src/api/endpoints.ts (47 lines changed)
    - .aiwg/architecture/api-design.md not updated since changes
    Recommendation: Update API documentation
```

### Step 6: Generate Update Plan

Create prioritized action plan:

```
Workspace Realignment Plan
==========================

IMMEDIATE ACTIONS (blocking accuracy):

1. UPDATE: .aiwg/architecture/api-design.md
   Reason: API endpoints changed significantly
   Changes: Add new endpoints, remove deprecated ones

2. UPDATE: .aiwg/security/auth-strategy.md
   Reason: New OAuth/JWT implementation
   Changes: Document new auth flows

3. ARCHIVE: .aiwg/architecture/legacy-support.md
   Reason: Legacy code deleted
   Target: .aiwg/archive/architecture/

4. ARCHIVE: .aiwg/planning/iteration-3-plan.md
   Reason: Iteration completed
   Target: .aiwg/archive/planning/

RECOMMENDED ACTIONS (quality improvement):

5. CREATE: .aiwg/architecture/oauth-integration.md
   Reason: New feature without documentation

6. REVIEW: .aiwg/risks/performance-spike.md
   Reason: May be resolved

7. DELETE: .aiwg/requirements/feature-x-draft.md
   Reason: Superseded by final version
```

### Step 7: Execute Actions

**If `--dry-run`:** Display plan and exit.

**If `--interactive`:** Prompt for each action.

**Otherwise:** Execute with specified flags.

#### Archive Operations

```bash
# Create archive directories
mkdir -p .aiwg/archive/{requirements,architecture,planning,risks,testing,security}

# Move with timestamp
mv .aiwg/architecture/legacy-support.md \
   .aiwg/archive/architecture/legacy-support-20251209.md

# Add archive index entry
echo "| 2025-12-09 | legacy-support.md | Deleted legacy code | architecture/ |" \
  >> .aiwg/archive/INDEX.md
```

#### Delete Operations

```bash
# Only with --delete-stale and confirmation
rm .aiwg/requirements/feature-x-draft.md
```

#### Update Operations

For documents needing updates, launch appropriate agent:

```
Launching documentation update agents...

Task(technical-writer):
  Target: .aiwg/architecture/api-design.md
  Context: src/api/endpoints.ts changes
  Action: Update API documentation with new endpoints

Task(security-architect):
  Target: .aiwg/security/auth-strategy.md
  Context: src/auth/ new implementation
  Action: Document OAuth/JWT authentication flows
```

### Step 8: Record Alignment

Create alignment marker for future reference:

```bash
# Record current HEAD as aligned
echo "$(git rev-parse HEAD) $(date -Iseconds)" > .aiwg/.last-alignment

# Create alignment log entry
cat >> .aiwg/.alignment-log <<EOF
---
date: $(date -Iseconds)
commit: $(git rev-parse HEAD)
actions:
  - archived: 2
  - updated: 2
  - created: 1
  - deleted: 1
  - reviewed: 1
EOF
```

### Step 9: Report Summary

```
Workspace Realignment Complete
==============================

Actions Taken:
  Archived:  2 documents
  Updated:   2 documents (agents launched)
  Created:   1 document (agent launched)
  Deleted:   1 document
  Reviewed:  1 document (marked for review)

Alignment Recorded:
  Commit: def5678
  Time:   2025-12-09T10:23:45

Next Steps:
  - Review agent-generated updates
  - Check .aiwg/archive/INDEX.md for archived docs
  - Address reviewed items in next session

Run '/workspace-realign --dry-run' periodically to check alignment.
```

## Examples

```bash
# Preview what would change
/workspace-realign --dry-run

# Archive stale docs, don't delete
/workspace-realign --archive-stale

# Interactive mode - decide each document
/workspace-realign --interactive

# Check changes since specific commit
/workspace-realign --since abc1234

# Full cleanup with deletions
/workspace-realign --archive-stale --delete-stale
```

## Error Handling

| Condition | Action |
|-----------|--------|
| No .aiwg/ directory | Error: "No .aiwg/ directory found. Initialize with /intake-wizard" |
| No git repository | Warning: "Not a git repo. Skipping change analysis." |
| No docs found | Info: "No documentation to realign. Workspace is empty." |
| Agent launch fails | Continue with next action, report failures at end |
| Archive exists | Append timestamp suffix to avoid overwrite |

## Related Commands

- `/workspace-prune-working` - Clean up .aiwg/working/ directory
- `/workspace-reset` - Wipe .aiwg/ and start fresh
- `/project-status` - View current project state
