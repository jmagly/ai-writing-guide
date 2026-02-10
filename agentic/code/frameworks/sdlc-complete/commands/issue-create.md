---
description: Create a new ticket/issue with configurable backend (Gitea, GitHub, Jira, Linear, or local files)
category: project-management
argument-hint: <title> [description] [--provider NAME --labels "label1,label2" --assignee USER --check-regression]
allowed-tools: Read, Write, Glob, Bash, mcp__gitea__create_issue
model: sonnet
---

# Issue Create

## Purpose

Create a new ticket/issue for tracking work items, bugs, features, or tasks. Automatically uses the configured ticketing provider (Gitea, GitHub, Jira, Linear) or falls back to local file-based tracking.

## Task

Given a ticket title and optional description:

1. **Load configuration** from `.aiwg/config.yaml` or project `CLAUDE.md`
2. **Validate configuration** and authenticate with provider
3. **Check for regressions** (if bug report with `--check-regression`)
4. **Create ticket** using appropriate backend (MCP, CLI, or local file)
5. **Return ticket reference** (issue number, URL, or file path)

## Parameters

- **`<title>`** (required): Short, descriptive title for the ticket
- **`[description]`** (optional): Detailed description of the work item
- **`--provider NAME`** (optional): Override configured provider (gitea|github|jira|linear|local)
- **`--labels "label1,label2"`** (optional): Comma-separated labels/tags
- **`--assignee USER`** (optional): Assign to specific user
- **`--priority LEVEL`** (optional): Priority level (low|medium|high|critical)
- **`--milestone NAME`** (optional): Associate with milestone (provider-dependent)
- **`--check-regression`** (optional): Run regression check for bug reports (auto-runs if labels include "bug" or "regression")

## Inputs

**Configuration sources** (checked in order):
1. `.aiwg/config.yaml` - Project-level configuration
2. `CLAUDE.md` - User-level configuration
3. Default: `local` provider

**Required for Gitea**:
- Provider: `gitea`
- URL: Base URL (e.g., `https://git.integrolabs.net`)
- Owner: User or organization name
- Repo: Repository name
- Token: `~/.config/gitea/token` (or configured path)

**Required for GitHub**:
- Provider: `github`
- Owner: User or organization name
- Repo: Repository name
- Auth: `gh` CLI authenticated

**Required for Jira**:
- Provider: `jira`
- URL: Jira instance URL
- Owner: Project key
- Auth: `JIRA_API_TOKEN` environment variable

**Required for Linear**:
- Provider: `linear`
- URL: `https://api.linear.app`
- Owner: Team ID
- Auth: `LINEAR_API_TOKEN` environment variable

**Required for Local**:
- Provider: `local`
- Directory: `.aiwg/issues/` (created if missing)

## Outputs

**Gitea/GitHub/Jira/Linear**:
- Issue created on remote system
- Issue number returned
- URL to view ticket

**Local**:
- File created: `.aiwg/issues/ISSUE-{num}.md`
- Issue number returned
- File path returned

## Workflow

### Step 1: Parse Parameters

Extract from command invocation:

```bash
# Basic usage
/issue-create "Implement user auth"

# With description
/issue-create "Fix navigation bug" "Nav menu not showing on mobile devices"

# With labels
/issue-create "Add dark mode" "Implement theme toggle" --labels "feature,ui"

# With assignee
/issue-create "Security audit" "Run penetration test" --assignee "security-team" --priority high

# Bug report with regression check
/issue-create "Login broken after deployment" "Users can't login" --labels "bug,critical" --check-regression

# Override provider
/issue-create "Local task" "Quick reminder" --provider local
```

**Parameter extraction**:
- Title: First quoted argument (required)
- Description: Second quoted argument (optional, default: empty)
- Flags: Parse `--flag value` pairs

### Step 2: Load Configuration

**Check locations in order**:

1. `.aiwg/config.yaml` (if exists):
   ```yaml
   ticketing:
     provider: gitea
     url: https://git.integrolabs.net
     owner: roctinam
     repo: ai-writing-guide
     auth:
       token_file: ~/.config/gitea/token
   ```

2. `CLAUDE.md` (if `.aiwg/config.yaml` not found):
   ```markdown
   ## Issueing Configuration

   - **Provider**: gitea
   - **URL**: https://git.integrolabs.net
   - **Owner**: roctinam
   - **Repo**: ai-writing-guide
   - **Token File**: ~/.config/gitea/token
   ```

3. Default (if no config found):
   ```yaml
   ticketing:
     provider: local
   ```

**Override with flags**:
- If `--provider` specified, use that instead of configured provider
- Warning if override differs from config: "⚠️ Using --provider local (configured: gitea)"

### Step 3: Regression Detection (for Bug Reports)

**Trigger conditions**:
- Explicit: `--check-regression` flag provided
- Automatic: `--labels` contains "bug" OR "regression"
- Type: Issue is categorized as bug/defect

**Regression check process**:

```bash
# Detect if regression check should run
if [[ "$LABELS" == *"bug"* ]] || [[ "$LABELS" == *"regression"* ]] || [[ "$CHECK_REGRESSION" == "true" ]]; then
  echo "⏳ Running regression check..."

  # Run regression check against main branch
  /regression-check --baseline main --scope changed-files --format summary > /tmp/regression-results.md

  # Parse results
  REGRESSION_DETECTED=$(grep "REGRESSIONS DETECTED" /tmp/regression-results.md)

  if [ -n "$REGRESSION_DETECTED" ]; then
    # Escalate priority and add labels
    PRIORITY="critical"
    LABELS="${LABELS},regression-confirmed"

    # Extract regression details for issue body
    REGRESSION_SUMMARY=$(sed -n '/### Critical Regressions/,/###/p' /tmp/regression-results.md)

    # Append to description
    DESCRIPTION="${DESCRIPTION}

---

## Regression Analysis

${REGRESSION_SUMMARY}

**Full Report**: See attached regression-results.md"
  else
    # No regression detected
    LABELS="${LABELS},no-regression"
  fi
fi
```

**Impact on issue creation**:

| Regression Status | Priority | Labels | Action |
|-------------------|----------|--------|--------|
| REGRESSION DETECTED | Critical | bug, regression-confirmed | Escalate, include analysis |
| NO REGRESSION | Original | bug, no-regression | Standard bug workflow |
| CHECK FAILED | Original | bug, regression-check-failed | Create issue, note failure |

### Step 4: Validate Configuration

**For each provider, validate required fields**:

**Gitea**:
- [ ] `url` present and valid URL
- [ ] `owner` present
- [ ] `repo` present
- [ ] Token file exists and readable

**GitHub**:
- [ ] `owner` present
- [ ] `repo` present
- [ ] `gh` CLI installed (`which gh`)
- [ ] `gh` authenticated (`gh auth status`)

**Jira**:
- [ ] `url` present and valid URL
- [ ] `owner` (project key) present
- [ ] `JIRA_API_TOKEN` environment variable set

**Linear**:
- [ ] `url` present (default: `https://api.linear.app`)
- [ ] `owner` (team ID) present
- [ ] `LINEAR_API_TOKEN` environment variable set

**Local**:
- [ ] `.aiwg/issues/` directory exists or can be created
- [ ] Directory is writable

**Error handling**:
- If validation fails, report error and suggest fix
- Optionally fall back to `local` provider with warning

### Step 5: Create Issue (Provider-Specific)

#### Gitea

Use MCP tool `mcp__gitea__create_issue`:

```bash
# Load configuration
TOKEN=$(cat ~/.config/gitea/token)
URL="https://git.integrolabs.net"
OWNER="roctinam"
REPO="ai-writing-guide"

# Prepare issue body
BODY="${description}"

# Add metadata section if labels/assignee/priority specified
if [ -n "$LABELS" ] || [ -n "$ASSIGNEE" ] || [ -n "$PRIORITY" ]; then
  BODY="${BODY}\n\n---\n\n"
  [ -n "$LABELS" ] && BODY="${BODY}**Labels**: ${LABELS}\n"
  [ -n "$ASSIGNEE" ] && BODY="${BODY}**Assignee**: @${ASSIGNEE}\n"
  [ -n "$PRIORITY" ] && BODY="${BODY}**Priority**: ${PRIORITY}\n"
fi

# Create issue via MCP
# Note: Use actual MCP tool invocation here
```

**MCP Tool Parameters**:
- `owner`: Organization/user name
- `repo`: Repository name
- `title`: Issue title
- `body`: Issue description (markdown)
- `assignee`: Username (optional)
- `labels`: Array of label names (optional)

**Return format**:
```
✅ Issue created: ISSUE-42

View at: https://git.integrolabs.net/roctinam/ai-writing-guide/issues/42

Title: Implement user auth
Status: open
Labels: feature, high-priority
```

#### GitHub

Use `gh` CLI:

```bash
# Basic creation
gh issue create \
  --repo "${OWNER}/${REPO}" \
  --title "${TITLE}" \
  --body "${DESCRIPTION}"

# With labels
gh issue create \
  --repo "${OWNER}/${REPO}" \
  --title "${TITLE}" \
  --body "${DESCRIPTION}" \
  --label "${LABELS}"

# With assignee
gh issue create \
  --repo "${OWNER}/${REPO}" \
  --title "${TITLE}" \
  --body "${DESCRIPTION}" \
  --assignee "${ASSIGNEE}"

# With milestone
gh issue create \
  --repo "${OWNER}/${REPO}" \
  --title "${TITLE}" \
  --body "${DESCRIPTION}" \
  --milestone "${MILESTONE}"
```

**Return format**:
```
✅ Issue created: #42

View at: https://github.com/jmagly/aiwg/issues/42

Title: Implement user auth
Status: open
Labels: feature, high-priority
```

#### Jira

Use Jira REST API v3:

```bash
# Prepare JSON payload
cat > /tmp/jira-issue.json <<EOF
{
  "fields": {
    "project": {
      "key": "${PROJECT_KEY}"
    },
    "summary": "${TITLE}",
    "description": {
      "type": "doc",
      "version": 1,
      "content": [
        {
          "type": "paragraph",
          "content": [
            {
              "type": "text",
              "text": "${DESCRIPTION}"
            }
          ]
        }
      ]
    },
    "issuetype": {
      "name": "Task"
    },
    "priority": {
      "name": "${PRIORITY:-Medium}"
    }
  }
}
EOF

# Create issue
curl -X POST "${JIRA_URL}/rest/api/3/issue" \
  -u "${JIRA_EMAIL}:${JIRA_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/jira-issue.json
```

**Return format**:
```
✅ Issue created: PROJECT-42

View at: https://yourcompany.atlassian.net/browse/PROJECT-42

Title: Implement user auth
Status: To Do
Priority: High
```

#### Linear

Use Linear GraphQL API:

```bash
# Prepare GraphQL mutation
cat > /tmp/linear-mutation.json <<EOF
{
  "query": "mutation IssueCreate(\$teamId: String!, \$title: String!, \$description: String) { issueCreate(input: { teamId: \$teamId, title: \$title, description: \$description }) { success issue { id identifier url } } }",
  "variables": {
    "teamId": "${TEAM_ID}",
    "title": "${TITLE}",
    "description": "${DESCRIPTION}"
  }
}
EOF

# Create issue
curl -X POST https://api.linear.app/graphql \
  -H "Authorization: ${LINEAR_API_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @/tmp/linear-mutation.json
```

**Return format**:
```
✅ Issue created: ENG-42

View at: https://linear.app/team/issue/ENG-42

Title: Implement user auth
Status: Backlog
Priority: High
```

#### Local

Create markdown file in `.aiwg/issues/`:

```bash
# Determine next ticket number
mkdir -p .aiwg/issues
NEXT_NUM=$(ls .aiwg/issues/ISSUE-*.md 2>/dev/null | wc -l)
NEXT_NUM=$((NEXT_NUM + 1))
TICKET_ID=$(printf "ISSUE-%03d" $NEXT_NUM)
TICKET_FILE=".aiwg/issues/${TICKET_ID}.md"

# Create ticket file
cat > "${TICKET_FILE}" <<EOF
---
id: ${TICKET_ID}
title: ${TITLE}
status: open
created: $(date +%Y-%m-%d)
updated: $(date +%Y-%m-%d)
assignee: ${ASSIGNEE:-unassigned}
labels: ${LABELS:-none}
priority: ${PRIORITY:-medium}
---

# ${TICKET_ID}: ${TITLE}

**Status**: open
**Created**: $(date +%Y-%m-%d)
**Updated**: $(date +%Y-%m-%d)
**Assignee**: ${ASSIGNEE:-unassigned}
**Priority**: ${PRIORITY:-medium}

## Description

${DESCRIPTION}

## Acceptance Criteria

- [ ] (Add acceptance criteria here)

## Comments

### $(date +%Y-%m-%d\ %H:%M)

Issue created.
EOF
```

**Return format**:
```
✅ Issue created: ISSUE-001

File: .aiwg/issues/ISSUE-001.md

Title: Implement user auth
Status: open
Priority: medium
```

### Step 6: Attach Regression Report (if applicable)

If regression check was run and regression detected:

```bash
# Save regression report alongside issue
if [ -f /tmp/regression-results.md ]; then
  cp /tmp/regression-results.md ".aiwg/issues/${TICKET_ID}-regression-report.md"

  # Add reference to issue body (provider-specific)
  # For local: already included in DESCRIPTION above
  # For Gitea/GitHub: attach as comment or file
fi
```

### Step 7: Return Issue Reference

**Output format** (consistent across providers):

```markdown
✅ Issue created: {ticket-id}

{view-url-or-file-path}

**Title**: {title}
**Status**: {status}
**Priority**: {priority}
**Labels**: {labels}
**Assignee**: {assignee}

{If regression detected:}
⚠️ **Regression Detected**: Critical regressions found and documented in issue

## Next Steps

- View ticket: {url-or-command}
- Update status: `/issue-update {ticket-id} --status in_progress`
- Add comment: `/issue-update {ticket-id} --comment "Working on implementation"`
- List tickets: `/issue-list`
```

## Examples

### Example 1: Create Feature Request (Gitea)

**Command**:
```bash
/issue-create "Add dark mode" "Implement theme toggle for light/dark mode preferences" --labels "feature,ui" --priority high
```

**Config** (`.aiwg/config.yaml`):
```yaml
ticketing:
  provider: gitea
  url: https://git.integrolabs.net
  owner: roctinam
  repo: ai-writing-guide
```

**Output**:
```
✅ Issue created: ISSUE-42

View at: https://git.integrolabs.net/roctinam/ai-writing-guide/issues/42

**Title**: Add dark mode
**Status**: open
**Priority**: high
**Labels**: feature, ui
**Assignee**: unassigned

## Next Steps

- View ticket: https://git.integrolabs.net/roctinam/ai-writing-guide/issues/42
- Update status: `/issue-update ISSUE-42 --status in_progress`
- Add comment: `/issue-update ISSUE-42 --comment "Started implementation"`
- List tickets: `/issue-list --label feature`
```

### Example 2: Create Bug Report with Regression Check (Local)

**Command**:
```bash
/issue-create "Login broken after deployment" "Users unable to authenticate since v2.1.4 deployment" --labels "bug,critical" --check-regression
```

**Output**:
```
⏳ Running regression check...
✓ Regression analysis complete: 2 critical regressions detected

✅ Issue created: ISSUE-003

File: .aiwg/issues/ISSUE-003.md

**Title**: Login broken after deployment
**Status**: open
**Priority**: critical
**Labels**: bug, critical, regression-confirmed
**Assignee**: unassigned

⚠️ **Regression Detected**: 2 critical regressions found
   - Authentication validation failing at token refresh
   - Session state not persisting across requests

**Regression Report**: .aiwg/issues/ISSUE-003-regression-report.md

## Next Steps

- View ticket: cat .aiwg/issues/ISSUE-003.md
- View regression details: cat .aiwg/issues/ISSUE-003-regression-report.md
- Update status: `/issue-update ISSUE-003 --status in_progress`
- Run regression analysis: `/regression-check --baseline v2.1.3 --format detailed`
- List regression issues: `/issue-list --label regression-confirmed`
```

### Example 3: Create Task with Assignee (GitHub)

**Command**:
```bash
/issue-create "Security audit" "Run penetration test on authentication endpoints" --assignee security-team --labels "security,high-priority" --milestone "Q1-2026"
```

**Config** (`CLAUDE.md`):
```markdown
## Issueing Configuration

- **Provider**: github
- **Owner**: jmagly
- **Repo**: ai-writing-guide
```

**Output**:
```
✅ Issue created: #128

View at: https://github.com/jmagly/aiwg/issues/128

**Title**: Security audit
**Status**: open
**Priority**: medium (default)
**Labels**: security, high-priority
**Assignee**: @security-team
**Milestone**: Q1-2026

## Next Steps

- View ticket: gh issue view 128
- Update status: `/issue-update 128 --status in_progress`
- Add comment: `/issue-update 128 --comment "Starting audit tomorrow"`
- List tickets: `/issue-list --label security`
```

### Example 4: Bug Report with Auto-Detected Regression Check

**Command**:
```bash
/issue-create "Payment calculation incorrect" "Discount not applying for orders > $1000" --labels "bug,payments"
```

**Output**:
```
ℹ️ Bug report detected, running automatic regression check...
⏳ Running regression check against baseline main...
✓ Regression confirmed: Introduced in commit abc1234

✅ Issue created: ISSUE-025

**Title**: Payment calculation incorrect
**Status**: open
**Priority**: critical (escalated due to regression)
**Labels**: bug, payments, regression-confirmed
**Assignee**: unassigned

⚠️ **Regression Confirmed**:
   - Introduced in: commit abc1234 (2026-01-15)
   - Root cause: Integer division in discount calculation
   - Blast radius: 12 unit tests, 3 integration tests affected

**Actions**:
   - Priority escalated to CRITICAL
   - Regression analyst assigned
   - Full report attached

**Regression Report**: .aiwg/issues/ISSUE-025-regression-report.md

## Next Steps

- View regression analysis: cat .aiwg/issues/ISSUE-025-regression-report.md
- Assign to developer: `/issue-update ISSUE-025 --assignee developer-name`
- Review introducing commit: git show abc1234
- Run targeted regression tests: npm test -- --grep "discount calculation"
```

## Error Handling

### No Configuration Found

```
⚠️ No ticketing configuration found.

Using default: local file-based tracking (.aiwg/issues/)

To configure a provider, create .aiwg/config.yaml:

ticketing:
  provider: gitea
  url: https://git.integrolabs.net
  owner: roctinam
  repo: ai-writing-guide

Or add to CLAUDE.md:

## Issueing Configuration

- **Provider**: gitea
- **URL**: https://git.integrolabs.net
- **Owner**: roctinam
- **Repo**: ai-writing-guide

Proceeding with local provider...
```

### Invalid Configuration

```
❌ Invalid ticketing configuration:

Issues:
- provider 'gitehub' not recognized (must be: gitea, github, jira, linear, local)
- missing required field: url
- missing required field: repo

Fix configuration in .aiwg/config.yaml or CLAUDE.md

Cannot create ticket without valid configuration.
```

### Authentication Failed

```
❌ Failed to authenticate with Gitea:

Issues:
- Token file not found: ~/.config/gitea/token
- Create token at https://git.integrolabs.net/user/settings/applications
- Save to ~/.config/gitea/token (mode 600)

Falling back to local file-based tracking.

To retry with Gitea:
1. Create token at https://git.integrolabs.net/user/settings/applications
2. Save to ~/.config/gitea/token
3. Run command again

Proceeding with local provider...
```

### Regression Check Failed

```
⚠️ Regression check failed to complete:

Error: Baseline branch 'main' not found
Possible causes:
- Fresh repository without baseline
- Branch name incorrect

Creating issue without regression analysis.
Use `/regression-check` manually after issue creation to verify.
```

### Missing Title

```
❌ Issue title is required.

Usage: /issue-create <title> [description] [options]

Examples:
- /issue-create "Implement user auth"
- /issue-create "Fix bug" "Nav menu broken on mobile"
- /issue-create "Add feature" "Dark mode toggle" --labels "feature,ui"
```

### Provider-Specific Errors

**Gitea MCP Error**:
```
❌ Failed to create Gitea issue:

Error: 401 Unauthorized
- Token may be invalid or expired
- Verify token at https://git.integrolabs.net/user/settings/applications
- Check token file: ~/.config/gitea/token

Falling back to local provider...
```

**GitHub CLI Error**:
```
❌ Failed to create GitHub issue:

Error: gh: command not found
- Install GitHub CLI: brew install gh (or platform equivalent)
- Authenticate: gh auth login

Or use local provider: /issue-create "title" --provider local
```

**Jira API Error**:
```
❌ Failed to create Jira issue:

Error: 400 Bad Request - Invalid project key
- Verify project key: ${PROJECT_KEY}
- Check Jira URL: ${JIRA_URL}
- Verify API token: echo $JIRA_API_TOKEN

Falling back to local provider...
```

**Local Filesystem Error**:
```
❌ Failed to create local ticket file:

Error: Permission denied - .aiwg/issues/
- Check directory permissions: ls -la .aiwg/
- Ensure writable: chmod 755 .aiwg/issues/

Cannot create ticket.
```

## Best Practices

1. **Use project-level config** (`.aiwg/config.yaml`) for team consistency
2. **Provide detailed descriptions** - Include context, acceptance criteria, and steps to reproduce (for bugs)
3. **Use labels consistently** - Establish team conventions (e.g., `feature`, `bug`, `tech-debt`)
4. **Set priorities appropriately** - Reserve `critical` for urgent production issues
5. **Assign tickets early** - Use `--assignee` to clarify ownership
6. **Link to artifacts** - Reference related files (`@.aiwg/requirements/UC-001.md`)
7. **Use milestones** - Group related work with `--milestone`
8. **Test authentication** - Verify provider connectivity before creating many tickets
9. **Enable regression checks** - Use `--check-regression` for bug reports to detect regressions early
10. **Review regression reports** - Always examine attached regression analysis before starting work

## Integration with SDLC Workflows

**Requirements Phase**:
```bash
# Create tickets from use cases
/issue-create "Implement UC-001: User Login" "See @.aiwg/requirements/use-cases/UC-001-login.md" --labels "requirement,feature"
```

**Architecture Phase**:
```bash
# Create tickets from ADR decisions
/issue-create "Implement ADR-003: Use PostgreSQL" "Migrate from SQLite to PostgreSQL per @.aiwg/architecture/adrs/003-use-postgresql.md" --labels "architecture,database"
```

**Testing Phase**:
```bash
# Create tickets from test failures with regression check
/issue-create "Fix failing test: auth.test.ts" "Test failure in authentication module" --priority high --labels "bug,testing" --check-regression
```

**Security Review**:
```bash
# Create tickets from security audit findings
/issue-create "Fix SQL injection vulnerability" "Parameterize queries in auth module" --priority critical --labels "security,vulnerability"
```

**Retrospectives**:
```bash
# Create tickets from retro action items
/issue-create "Improve CI/CD pipeline" "Reduce build time from 10min to 5min" --labels "process-improvement,devops"
```

**Regression Detection**:
```bash
# Create issue from detected regression
/issue-create "Performance regression in API" "p99 latency increased from 200ms to 450ms" --labels "bug,performance,regression" --check-regression
```

## References

- @agentic/code/frameworks/sdlc-complete/config/issueing-config.md - Configuration schema
- @agentic/code/frameworks/sdlc-complete/commands/issue-update.md - Update ticket command
- @agentic/code/frameworks/sdlc-complete/commands/issue-list.md - List tickets command
- @agentic/code/frameworks/sdlc-complete/commands/regression-check.md - Regression detection command
- @agentic/code/frameworks/sdlc-complete/agents/regression-analyst.md - Regression analysis agent
- @.aiwg/config.yaml - Project ticketing configuration
- @CLAUDE.md - User ticketing configuration
