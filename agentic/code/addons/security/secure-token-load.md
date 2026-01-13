# Secure Token Load

**Type**: Security Pattern
**Category**: API Authentication
**Version**: 1.0.0

## Purpose

Provides secure patterns for loading authentication tokens from environment variables or secure files without exposing token values in logs, history, or process lists.

## When to Use

Use this pattern whenever you need to:
- Authenticate API requests to Gitea, GitHub, GitLab, etc.
- Access tokens stored in `~/.config/` or environment variables
- Execute multiple authenticated operations in sequence
- Generate agent definitions or commands that require API access

## Pattern Overview

**Priority Order**:
1. Environment variable (CI/CD, containers)
2. Secure file with restricted permissions (development)
3. Vault integration (future/enterprise)

**Key Principle**: Load tokens at point of use, never store in persistent variables.

## Single-Line Pattern

For single API calls, load token inline:

```bash
# Pattern
curl -s -H "Authorization: token $(cat ~/.config/SERVICE/token)" \
  "https://api.example.com/endpoint"

# Gitea example
curl -s -H "Authorization: token $(cat ~/.config/gitea/token)" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues?state=open"

# GitHub example
curl -s -H "Authorization: token $(cat ~/.config/github/token)" \
  "https://api.github.com/user/repos"

# Environment variable alternative
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://git.integrolabs.net/api/v1/user"
```

## Multi-Line Pattern (Heredoc)

For operations requiring multiple API calls or complex logic, use heredoc:

```bash
bash <<'EOF'
# Load token once within heredoc scope
TOKEN=$(cat ~/.config/gitea/token)

# Multiple API operations
REPOS=$(curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/users/roctinam/repos")

ISSUES=$(curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues")

# Process results
echo "Repositories:"
echo "${REPOS}" | jq -r '.[].full_name'

echo "Issues:"
echo "${ISSUES}" | jq -r '.[] | "\(.number): \(.title)"'

# Token automatically discarded when heredoc exits
EOF
```

## Environment Variable Pattern

For CI/CD or container environments:

```bash
# Set in CI/CD secrets, then use directly
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://git.integrolabs.net/api/v1/user"
```

**GitHub Actions**:
```yaml
jobs:
  deploy:
    steps:
      - name: API Call
        env:
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
        run: |
          curl -s -H "Authorization: token ${GITEA_TOKEN}" \
            "https://git.integrolabs.net/api/v1/user"
```

**GitLab CI**:
```yaml
script:
  - |
    curl -s -H "Authorization: token ${GITEA_TOKEN}" \
      "https://git.integrolabs.net/api/v1/user"
```

## Token Validation Pattern

Test token validity without exposing value:

```bash
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/user")

case ${STATUS} in
  200) echo "✓ Token is valid" ;;
  401) echo "✗ Token is invalid or expired" ;;
  403) echo "✗ Token lacks required permissions" ;;
  *) echo "✗ Unexpected status: ${STATUS}" ;;
esac
EOF
```

## Admin vs Standard Token Selection

Different operations require different privilege levels:

```bash
# Standard operations (roctibot)
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
# ... standard API calls ...
EOF

# Admin operations (roctinam)
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/admin-token)
# ... admin API calls (create repos, manage users, etc.) ...
EOF
```

## Token File Setup

First-time setup of token files:

```bash
# Create directory with correct permissions
mkdir -p ~/.config/gitea
chmod 700 ~/.config/gitea

# Create token file (replace TOKEN_VALUE with actual token)
echo "TOKEN_VALUE" > ~/.config/gitea/token
chmod 600 ~/.config/gitea/token

# Verify permissions
ls -la ~/.config/gitea/
# Should show: -rw------- 1 user user ... token
```

## Error Handling Pattern

Check for token file existence and permissions:

```bash
bash <<'EOF'
TOKEN_FILE=~/.config/gitea/token

# Check if file exists
if [ ! -f "${TOKEN_FILE}" ]; then
  echo "Error: Token file not found at ${TOKEN_FILE}"
  echo "Create token at: https://git.integrolabs.net/user/settings/applications"
  exit 1
fi

# Check permissions
PERMS=$(stat -c "%a" "${TOKEN_FILE}")
if [ "${PERMS}" != "600" ]; then
  echo "Warning: Insecure permissions on ${TOKEN_FILE}"
  echo "Fixing permissions..."
  chmod 600 "${TOKEN_FILE}"
fi

# Use token
TOKEN=$(cat "${TOKEN_FILE}")
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/user" | jq .
EOF
```

## JSON POST with Token

Secure pattern for API POST requests:

```bash
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)

curl -s -X POST \
  -H "Authorization: token ${TOKEN}" \
  -H "Content-Type: application/json" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues" \
  -d '{
    "title": "New Issue",
    "body": "Issue description..."
  }' | jq .
EOF
```

## Anti-Patterns (AVOID)

### DON'T: Store in Persistent Variable

```bash
# BAD: Token persists in shell environment
export GITEA_TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${GITEA_TOKEN}" "..."
# Token still accessible after command
```

### DON'T: Echo Token Value

```bash
# BAD: Token exposed in output
TOKEN=$(cat ~/.config/gitea/token)
echo "Token: ${TOKEN}"  # NEVER DO THIS
```

### DON'T: Pass as Command Argument

```bash
# BAD: Token visible in process list
./script.sh --token "abc123..."  # Visible in 'ps aux'
```

### DON'T: Hard-Code in Files

```bash
# BAD: Token committed to git
GITEA_TOKEN="abc123..."  # NEVER COMMIT TOKENS
```

## Integration with Agents

When documenting API usage in agent definitions:

```markdown
## Example: List Repository Issues

```bash
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues?state=all" \
  | jq -r '.[] | "\(.number): \(.title)"'
EOF
```

**Security Notes**:
- Token loaded within heredoc scope only
- Never exposed in logs or history
- Automatically cleaned up after execution
```

## Token Rotation

Secure token replacement procedure:

```bash
# 1. Generate new token via web UI
# 2. Test new token before replacing

bash <<'EOF'
# Test new token (paste actual value temporarily)
NEW_TOKEN="paste_new_token_here"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${NEW_TOKEN}" \
  "https://git.integrolabs.net/api/v1/user")

if [ ${STATUS} -eq 200 ]; then
  echo "New token is valid"
else
  echo "New token failed with status ${STATUS}"
  exit 1
fi
EOF

# 3. If valid, update token file atomically
bash <<'EOF'
echo "paste_new_token_here" > ~/.config/gitea/token.new
chmod 600 ~/.config/gitea/token.new
mv ~/.config/gitea/token.new ~/.config/gitea/token
echo "Token updated successfully"
EOF

# 4. Revoke old token via web UI
```

## Quick Reference

| Use Case | Pattern |
|----------|---------|
| Single API call | `$(cat ~/.config/SERVICE/token)` inline |
| Multiple calls | Heredoc with scoped `TOKEN` variable |
| CI/CD | `${SERVICE_TOKEN}` environment variable |
| Test validity | Heredoc with status code check |
| Admin operations | Use `admin-token` file instead of `token` |
| Setup new token | Create file with mode 600 |

## Security Checklist

Before using tokens in any automation:

- [ ] Token loaded from secure file or environment variable
- [ ] No tokens in command-line arguments
- [ ] No tokens echoed or logged
- [ ] Token files have mode 600 permissions
- [ ] Heredoc used for multi-line operations
- [ ] No tokens in git-tracked files
- [ ] Token validation tested before deployment

## References

- @agentic/code/frameworks/sdlc-complete/docs/token-security.md - Comprehensive security documentation
- @~/.claude/CLAUDE.md - Token file locations and conventions
- @.claude/rules/token-security.md - Enforcement rules
- [Gitea API Docs](https://docs.gitea.io/en-us/api-usage/)
- [GitHub Token Best Practices](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure)

---

**Version History**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-13 | Initial pattern for Issue #18 |
