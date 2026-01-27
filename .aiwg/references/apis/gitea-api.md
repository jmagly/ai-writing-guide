# Gitea API Reference

> REST API for Gitea/Forgejo self-hosted git forges.

**Last Updated**: 2026-01-26
**Status**: Stub - Needs expansion
**Maintainer**: AIWG Team

---

## Quick Reference

| Resource | Link |
|----------|------|
| API Docs | https://docs.gitea.com/api |
| Swagger UI | `<instance>/api/swagger` |
| MCP Server | `@anthropics/mcp-server-gitea` |

---

## Authentication

### Token-Based (Recommended)

```bash
# Create token at: <instance>/user/settings/applications

# Use in requests
curl -H "Authorization: token <TOKEN>" \
  "https://git.example.com/api/v1/user"
```

### Token Storage Convention

```
~/.config/gitea/token       # Standard automation (roctibot)
~/.config/gitea/admin-token # Admin operations (roctinam)
```

**Security**: Always mode 600 (`chmod 600 ~/.config/gitea/token`)

---

## Common Endpoints

### User

```bash
# Get current user
GET /api/v1/user

# List user repos
GET /api/v1/users/{username}/repos
```

### Repositories

```bash
# List repos
GET /api/v1/repos/{owner}/{repo}

# Create repo
POST /api/v1/user/repos
{ "name": "repo-name", "private": false }

# Delete repo
DELETE /api/v1/repos/{owner}/{repo}
```

### Issues

```bash
# List issues
GET /api/v1/repos/{owner}/{repo}/issues?state=open

# Create issue
POST /api/v1/repos/{owner}/{repo}/issues
{ "title": "Issue title", "body": "Description" }

# Update issue
PATCH /api/v1/repos/{owner}/{repo}/issues/{index}
{ "state": "closed" }

# Add comment
POST /api/v1/repos/{owner}/{repo}/issues/{index}/comments
{ "body": "Comment text" }

# Add labels
POST /api/v1/repos/{owner}/{repo}/issues/{index}/labels
{ "labels": [123, 456] }
```

### Labels

```bash
# List labels
GET /api/v1/repos/{owner}/{repo}/labels

# Create label
POST /api/v1/repos/{owner}/{repo}/labels
{ "name": "label-name", "color": "ff0000" }
```

### Pull Requests

```bash
# List PRs
GET /api/v1/repos/{owner}/{repo}/pulls?state=open

# Create PR
POST /api/v1/repos/{owner}/{repo}/pulls
{
  "title": "PR Title",
  "body": "Description",
  "head": "feature-branch",
  "base": "main"
}

# Merge PR
POST /api/v1/repos/{owner}/{repo}/pulls/{index}/merge
{ "do": "merge" }
```

### Branches

```bash
# List branches
GET /api/v1/repos/{owner}/{repo}/branches

# Create branch
POST /api/v1/repos/{owner}/{repo}/branches
{ "new_branch_name": "feature", "old_ref_name": "main" }
```

### Releases

```bash
# List releases
GET /api/v1/repos/{owner}/{repo}/releases

# Create release
POST /api/v1/repos/{owner}/{repo}/releases
{
  "tag_name": "v1.0.0",
  "name": "Release 1.0.0",
  "body": "Release notes",
  "draft": false,
  "prerelease": false
}
```

---

## MCP Server Integration

### Configuration

```json
{
  "mcpServers": {
    "gitea": {
      "command": "npx",
      "args": ["-y", "@anthropics/mcp-server-gitea"],
      "env": {
        "GITEA_TOKEN": "${GITEA_TOKEN}",
        "GITEA_URL": "https://git.integrolabs.net"
      }
    }
  }
}
```

### Available Tools

| Tool | Description |
|------|-------------|
| `list_repo_issues` | List repository issues |
| `get_issue_by_index` | Get specific issue |
| `create_issue` | Create new issue |
| `edit_issue` | Update issue |
| `create_issue_comment` | Add comment |
| `add_issue_labels` | Add labels to issue |
| `list_repo_labels` | List repository labels |
| `create_repo_label` | Create new label |
| `list_repo_pull_requests` | List PRs |
| `create_pull_request` | Create PR |
| `list_branches` | List branches |
| `create_branch` | Create branch |
| `list_releases` | List releases |
| `create_release` | Create release |
| `get_file_content` | Read file from repo |
| `create_file` | Create file in repo |
| `update_file` | Update file in repo |

---

## AIWG Usage Patterns

### Issue Management

```bash
# AIWG uses Gitea for issue tracking
# See: @~/.claude/CLAUDE.md for token patterns

# Create issue via MCP
mcp__gitea__create_issue(
  owner="roctinam",
  repo="ai-writing-guide",
  title="Issue title",
  body="Description"
)

# Add labels
mcp__gitea__add_issue_labels(
  owner="roctinam",
  repo="ai-writing-guide",
  index=123,
  labels=[155]  # requires-code label
)
```

### Release Management

```bash
# Create release
mcp__gitea__create_release(
  owner="roctinam",
  repo="ai-writing-guide",
  tag_name="v2026.1.5",
  title="v2026.1.5 - Release Name",
  body="Release notes..."
)
```

---

## Pagination

Most list endpoints support pagination:

```bash
GET /api/v1/repos/{owner}/{repo}/issues?page=1&limit=50
```

| Param | Default | Max |
|-------|---------|-----|
| `page` | 1 | - |
| `limit` | 30 | 100 |

---

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad request |
| 401 | Unauthorized (bad token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not found |
| 422 | Validation error |

---

## TODO: Expand This Reference

- [ ] Add webhook configuration
- [ ] Document Actions/CI integration
- [ ] Add organization management
- [ ] Include team permissions
- [ ] Add file operations details

---

## References

- @~/.claude/CLAUDE.md - Token patterns and API examples
- @.aiwg/references/protocols/mcp.md - MCP protocol
- https://docs.gitea.com/api - Official API documentation
