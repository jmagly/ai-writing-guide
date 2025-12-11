---
name: pr-reviewer
description: Review GitHub pull requests for code quality, security, and best practices. Use for automated PR feedback and approval workflows.
tools: Read, Write, Bash, Glob, Grep
---

# PR Reviewer Skill

## Purpose

Single responsibility: Review GitHub pull requests for quality, security, and adherence to project standards. (BP-4)

## Grounding Checkpoint (Archetype 1 Mitigation)

Before executing, VERIFY:

- [ ] gh CLI is installed and authenticated
- [ ] PR number or URL is valid
- [ ] Repository has review permissions
- [ ] Review criteria are defined

**DO NOT submit reviews without understanding the full diff.**

## Uncertainty Escalation (Archetype 2 Mitigation)

ASK USER instead of guessing when:

- Review scope unclear (security only vs full review)
- Approval authority undefined
- Conflicting with existing reviews
- Breaking changes detected

**NEVER approve PRs automatically without user confirmation.**

## Context Scope (Archetype 3 Mitigation)

| Context Type | Included | Excluded |
|--------------|----------|----------|
| RELEVANT | PR diff, commit messages, linked issues | Unrelated files |
| PERIPHERAL | Project standards, CI status | Other PRs |
| DISTRACTOR | Historical PRs | Fork activity |

## Workflow Steps

### Step 1: Fetch PR Details (Grounding)

```bash
# Get PR information
gh pr view <number> --json title,body,author,files,additions,deletions,commits,reviews

# Get diff
gh pr diff <number>

# Check CI status
gh pr checks <number>
```

### Step 2: Analyze Changes

```bash
# List changed files
gh pr view <number> --json files --jq '.files[].path'

# Get diff stats
gh pr view <number> --json additions,deletions --jq '"\(.additions) additions, \(.deletions) deletions"'

# Check for sensitive files
gh pr diff <number> | grep -E "(\.env|password|secret|key)" && echo "⚠️ Sensitive patterns detected"
```

### Step 3: Review Categories

**Code Quality:**
```bash
# Check for common issues
gh pr diff <number> | grep -E "(console\.log|debugger|TODO|FIXME)" | head -20
```

**Security:**
```bash
# Security patterns
gh pr diff <number> | grep -E "(eval\(|innerHTML|dangerouslySetInnerHTML|exec\()" | head -10
```

**Tests:**
```bash
# Check test coverage
gh pr view <number> --json files --jq '.files[] | select(.path | test("test|spec")) | .path'
```

### Step 4: Submit Review

**Comment only:**
```bash
gh pr review <number> --comment --body "$(cat <<'EOF'
## Code Review

### Summary
[Overview of changes]

### Observations
- Point 1
- Point 2

### Questions
- Question 1?
EOF
)"
```

**Request changes:**
```bash
gh pr review <number> --request-changes --body "Changes needed: [reason]"
```

**Approve:**
```bash
gh pr review <number> --approve --body "LGTM! ✅"
```

## Recovery Protocol (Archetype 4 Mitigation)

On error:

1. **PAUSE** - Don't submit partial reviews
2. **DIAGNOSE** - Check error type:
   - `Not found` → Verify PR number
   - `Permission denied` → Check repo access
   - `Review already exists` → Update existing
   - `CI pending` → Wait or note in review
3. **ADAPT** - Adjust review scope
4. **RETRY** - With corrected parameters (max 3 attempts)
5. **ESCALATE** - Report issues to user

## Checkpoint Support

State saved to: `.aiwg/working/checkpoints/pr-reviewer/`

```
checkpoints/pr-reviewer/
├── pr_details.json          # PR metadata
├── diff_analysis.json       # Change analysis
├── security_scan.json       # Security findings
└── review_draft.md          # Draft review
```

## Review Template

```markdown
## Code Review: PR #<number>

### Summary
<Brief overview of the PR purpose and changes>

### Review Checklist
- [ ] Code follows project style guide
- [ ] Tests added/updated for changes
- [ ] Documentation updated if needed
- [ ] No security vulnerabilities introduced
- [ ] CI checks passing

### Observations

#### ✅ Strengths
- Point 1
- Point 2

#### ⚠️ Concerns
- Concern 1 (file:line)
- Concern 2 (file:line)

#### ❓ Questions
- Question about design choice?

### Recommendation
- [ ] Approve
- [ ] Request changes
- [ ] Comment only

### Line Comments
| File | Line | Comment |
|------|------|---------|
| src/foo.ts | 42 | Consider using const |
```

## Common Commands

| Command | Purpose |
|---------|---------|
| `gh pr view <n>` | View PR details |
| `gh pr diff <n>` | View diff |
| `gh pr checks <n>` | CI status |
| `gh pr review <n>` | Submit review |
| `gh pr comment <n>` | Add comment |
| `gh pr merge <n>` | Merge PR |

## References

- GitHub CLI PR commands: https://cli.github.com/manual/gh_pr
- REF-001: Production-Grade Agentic Workflows (BP-4)
- REF-002: LLM Failure Modes (Archetype 2 over-helpfulness)
