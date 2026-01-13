# Ticketing Configuration

## Purpose

Defines the backend provider for ticket/issue management across SDLC workflows. This allows teams to integrate with their preferred issue tracking system (Gitea, GitHub, Jira, Linear) or use local file-based tracking.

## Configuration Schema

### Location

Configuration can be defined in two places (checked in order):

1. **Project-level**: `.aiwg/config.yaml` (preferred for team consistency)
2. **User-level**: Project `CLAUDE.md` (fallback for ad-hoc configuration)

### Schema (YAML)

```yaml
ticketing:
  # Provider: gitea | github | jira | linear | local
  provider: gitea

  # Base URL for provider (not needed for 'local')
  url: https://git.integrolabs.net

  # Owner/organization name
  owner: roctinam

  # Repository name (for git-based providers)
  repo: ai-writing-guide

  # Authentication (optional - uses environment defaults if not specified)
  auth:
    # For gitea: token file path (default: ~/.config/gitea/token)
    token_file: ~/.config/gitea/token

    # For github: gh CLI is used (no explicit token needed)
    # For jira/linear: API token from environment variable
    token_env: JIRA_API_TOKEN
```

### Schema (Markdown in CLAUDE.md)

If using `CLAUDE.md` instead of `.aiwg/config.yaml`, add this section:

```markdown
## Ticketing Configuration

- **Provider**: gitea
- **URL**: https://git.integrolabs.net
- **Owner**: roctinam
- **Repo**: ai-writing-guide
- **Token File**: ~/.config/gitea/token
```

## Provider-Specific Configuration

### Gitea

```yaml
ticketing:
  provider: gitea
  url: https://git.integrolabs.net
  owner: roctinam
  repo: ai-writing-guide
  auth:
    token_file: ~/.config/gitea/token
```

**MCP Tools Used**:
- `mcp__gitea__create_issue` - Create new ticket
- `mcp__gitea__edit_issue` - Update ticket status/fields
- `mcp__gitea__create_issue_comment` - Add comments

**Token Setup**:
1. Generate token at `{url}/user/settings/applications`
2. Save to `~/.config/gitea/token` (mode 600)
3. Verify: `curl -H "Authorization: token $(cat ~/.config/gitea/token)" {url}/api/v1/user`

### GitHub

```yaml
ticketing:
  provider: github
  owner: jmagly
  repo: ai-writing-guide
  # No explicit URL needed (github.com assumed)
  # No explicit token needed (gh CLI handles auth)
```

**CLI Tools Used**:
- `gh issue create` - Create new ticket
- `gh issue edit` - Update ticket status/fields
- `gh issue comment` - Add comments

**Authentication**:
1. Install GitHub CLI: `brew install gh` (or platform equivalent)
2. Authenticate: `gh auth login`
3. Verify: `gh auth status`

### Jira

```yaml
ticketing:
  provider: jira
  url: https://yourcompany.atlassian.net
  owner: PROJECT_KEY  # Jira project key
  auth:
    token_env: JIRA_API_TOKEN
```

**API Usage**:
- REST API v3: `/rest/api/3/issue`
- Requires email + API token authentication
- Project key used instead of "owner"

**Token Setup**:
1. Generate token at `https://id.atlassian.com/manage-profile/security/api-tokens`
2. Set environment: `export JIRA_API_TOKEN=your_token`
3. Verify: `curl -u email@example.com:$JIRA_API_TOKEN {url}/rest/api/3/myself`

### Linear

```yaml
ticketing:
  provider: linear
  url: https://api.linear.app
  owner: TEAM_ID  # Linear team identifier
  auth:
    token_env: LINEAR_API_TOKEN
```

**API Usage**:
- GraphQL API: `https://api.linear.app/graphql`
- Requires API token authentication
- Team ID used instead of "owner"

**Token Setup**:
1. Generate token at `https://linear.app/settings/api`
2. Set environment: `export LINEAR_API_TOKEN=your_token`
3. Verify: `curl -H "Authorization: $LINEAR_API_TOKEN" -X POST https://api.linear.app/graphql -d '{"query":"{ viewer { id name } }"}'`

### Local (File-Based)

```yaml
ticketing:
  provider: local
  # No URL/owner/repo needed
```

**Storage Location**: `.aiwg/tickets/`

**File Format**: `TICKET-{num}.md`

```markdown
---
id: TICKET-001
title: Implement user authentication
status: open
created: 2026-01-13
updated: 2026-01-13
assignee: unassigned
labels: feature, high-priority
---

# TICKET-001: Implement user authentication

**Status**: open
**Created**: 2026-01-13
**Updated**: 2026-01-13

## Description

Implement user authentication with email/password login.

## Acceptance Criteria

- [ ] User can register with email/password
- [ ] User can login with credentials
- [ ] Password is hashed before storage
- [ ] JWT token issued on successful login

## Comments

### 2026-01-13 10:00 AM

Started implementation. Created auth module.

### 2026-01-13 2:00 PM

Completed registration endpoint. Working on login next.
```

**Ticket Numbering**: Auto-incremented based on existing ticket count

## Configuration Precedence

1. **Explicit flag** (highest priority): `--provider gitea --url https://...`
2. **Project config**: `.aiwg/config.yaml`
3. **User config**: `CLAUDE.md` in project root
4. **Default**: `local` (lowest priority)

## Examples

### Team Using Gitea (Project Config)

Create `.aiwg/config.yaml`:

```yaml
ticketing:
  provider: gitea
  url: https://git.integrolabs.net
  owner: roctinam
  repo: ai-writing-guide
  auth:
    token_file: ~/.config/gitea/token
```

Commands will automatically use Gitea:

```bash
/ticket-create "Implement user auth" "Need login/logout functionality"
# → Creates issue on Gitea

/ticket-list
# → Lists issues from Gitea

/ticket-update TICKET-001 --status in_progress --comment "Started implementation"
# → Updates issue on Gitea
```

### Solo Developer Using Local Files (User Config)

Add to project `CLAUDE.md`:

```markdown
## Ticketing Configuration

- **Provider**: local
```

Commands will use local files:

```bash
/ticket-create "Fix navigation bug" "Nav menu not showing on mobile"
# → Creates .aiwg/tickets/TICKET-001.md

/ticket-list
# → Lists files from .aiwg/tickets/

/ticket-update TICKET-001 --status closed --comment "Fixed in commit abc123"
# → Updates .aiwg/tickets/TICKET-001.md
```

### Multi-Repo Team Using GitHub (User Config)

Add to project `CLAUDE.md`:

```markdown
## Ticketing Configuration

- **Provider**: github
- **Owner**: jmagly
- **Repo**: ai-writing-guide
```

Commands will use GitHub:

```bash
/ticket-create "Add dark mode" "Implement dark mode theme toggle"
# → Creates GitHub issue

/ticket-list --label feature
# → Lists GitHub issues with 'feature' label

/ticket-update 42 --status closed --comment "Merged in PR #43"
# → Closes GitHub issue #42
```

## Validation

When loading configuration, validate:

1. **Provider valid**: Must be one of `gitea`, `github`, `jira`, `linear`, `local`
2. **Required fields present**:
   - `gitea`: `url`, `owner`, `repo`
   - `github`: `owner`, `repo`
   - `jira`: `url`, `owner` (project key)
   - `linear`: `url`, `owner` (team ID)
   - `local`: (no required fields)
3. **Authentication available**:
   - `gitea`: Token file exists and is readable
   - `github`: `gh` CLI installed and authenticated
   - `jira`: Environment variable set
   - `linear`: Environment variable set
   - `local`: `.aiwg/tickets/` directory writable

## Error Handling

### Missing Configuration

If no configuration found:

```
⚠️ No ticketing configuration found.

Using default: local file-based tracking (.aiwg/tickets/)

To configure a provider, create .aiwg/config.yaml or add to CLAUDE.md:

ticketing:
  provider: gitea
  url: https://git.integrolabs.net
  owner: roctinam
  repo: ai-writing-guide
```

### Invalid Configuration

If configuration invalid:

```
❌ Invalid ticketing configuration:
- provider 'gitehub' not recognized (must be: gitea, github, jira, linear, local)
- missing required field: url

Fix configuration in .aiwg/config.yaml or CLAUDE.md
```

### Authentication Failed

If authentication fails:

```
❌ Failed to authenticate with Gitea:
- Token file not found: ~/.config/gitea/token
- Create token at https://git.integrolabs.net/user/settings/applications
- Save to ~/.config/gitea/token (mode 600)

Falling back to local file-based tracking.
```

## Migration Between Providers

### From Local to Gitea

```bash
# Export local tickets to Gitea
aiwg ticket-migrate --from local --to gitea

# Reads .aiwg/tickets/*.md
# Creates issues on Gitea
# Preserves ticket numbers as issue references
```

### From GitHub to Jira

```bash
# Export GitHub issues to Jira
aiwg ticket-migrate --from github --to jira

# Reads GitHub issues via gh CLI
# Creates Jira issues via API
# Maintains traceability mapping
```

## References

- @agentic/code/frameworks/sdlc-complete/commands/ticket-create.md - Create ticket command
- @agentic/code/frameworks/sdlc-complete/commands/ticket-update.md - Update ticket command
- @agentic/code/frameworks/sdlc-complete/commands/ticket-list.md - List tickets command
- @~/.config/gitea/token - Gitea authentication token (user-specific)
