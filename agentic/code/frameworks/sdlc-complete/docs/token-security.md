# Token Security Best Practices

**Version**: 1.0.0
**Last Updated**: 2026-01-13

## Overview

This document defines secure token handling patterns for AIWG and projects using AIWG frameworks. These patterns prevent token exposure in logs, session history, and prompts while maintaining operational flexibility.

## Critical Security Rules

1. **NEVER hard-code tokens** in any file committed to version control
2. **NEVER pass tokens as command-line arguments** (visible in process lists)
3. **NEVER echo or log token values** in any output
4. **NEVER store tokens in variables** that persist across commands
5. **ALWAYS load tokens at point of use** from secure sources

## Token Loading Priority

When implementing API calls or authenticated operations, follow this priority:

### 1. Environment Variables (Preferred for CI/CD)

```bash
# Load from environment
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://git.integrolabs.net/api/v1/user"
```

**Advantages**:
- Standard CI/CD pattern
- No file system dependencies
- Easy to rotate
- Process-scoped lifetime

**Use cases**:
- CI/CD pipelines
- Container deployments
- Temporary operations

### 2. Secure Token Files (Preferred for Development)

```bash
# Load from secure file at point of use
curl -s -H "Authorization: token $(cat ~/.config/gitea/token)" \
  "https://git.integrolabs.net/api/v1/user"
```

**Advantages**:
- Persistent across sessions
- File permissions enforce security
- Multiple tokens per service
- Easy to audit

**Use cases**:
- Development environments
- User workstations
- Long-running services

**File structure**:
```
~/.config/
├── gitea/
│   ├── token          # mode 600, roctibot standard automation
│   ├── admin-token    # mode 600, roctinam admin operations
│   └── read-token     # mode 600, read-only operations
├── github/
│   └── token          # mode 600
└── gitlab/
    └── token          # mode 600
```

### 3. Vault Integration (Future)

Reserved for enterprise deployments with HashiCorp Vault or similar.

```bash
# Future pattern (not yet implemented)
TOKEN=$(vault kv get -field=token secret/gitea/roctibot)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/user"
```

## Secure Patterns

### Single-Line API Call

```bash
# Good: Token loaded at point of use
curl -s -H "Authorization: token $(cat ~/.config/gitea/token)" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues"
```

```bash
# Bad: Token stored in variable (visible in history)
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues"
```

### Multi-Line Operations (Heredoc Pattern)

For complex operations requiring multiple API calls, use heredoc with inline token loading:

```bash
bash <<'EOF'
# Token loaded once within heredoc scope
TOKEN=$(cat ~/.config/gitea/token)

# Multiple operations using scoped token
REPOS=$(curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/users/roctinam/repos")

# Process results
echo "${REPOS}" | jq -r '.[].full_name'

# Token automatically discarded when heredoc exits
EOF
```

**Why heredoc?**
- Token variable scoped to heredoc execution
- Not visible in shell history
- Not visible in process list
- Automatically cleaned up after execution
- Can include complex logic

### Testing Token Validity

```bash
# Test token without exposing value
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
RESULT=$(curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/user")

if echo "${RESULT}" | grep -q '"login"'; then
  echo "Token is valid"
else
  echo "Token is invalid or expired"
fi
EOF
```

### Admin vs Standard Tokens

Different operations require different privilege levels:

```bash
# Standard operations (use roctibot token)
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues"
EOF
```

```bash
# Admin operations (use roctinam admin token)
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/admin-token)
curl -s -X POST -H "Authorization: token ${TOKEN}" \
  -H "Content-Type: application/json" \
  "https://git.integrolabs.net/api/v1/user/repos" \
  -d '{"name": "new-repo", "private": false}'
EOF
```

## Anti-Patterns to Avoid

### 1. Token in Shell Variable (Persistent)

```bash
# BAD: Token persists in shell session
export GITEA_TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://git.integrolabs.net/api/v1/user"

# Token still in environment after command completes
```

### 2. Token in Command History

```bash
# BAD: Token visible in history
curl -s -H "Authorization: token ghp_abc123def456..." \
  "https://api.github.com/user"
```

### 3. Token Logged to File

```bash
# BAD: Token written to log
TOKEN=$(cat ~/.config/gitea/token)
echo "Using token: ${TOKEN}" >> operation.log  # NEVER DO THIS
```

### 4. Token in Process Arguments

```bash
# BAD: Token visible in process list (ps aux)
./script.sh --token ghp_abc123def456...
```

### 5. Token in Git Commit

```bash
# BAD: Token committed to repository
echo "GITEA_TOKEN=abc123..." >> .env
git add .env  # NEVER COMMIT TOKENS
```

## File Permissions

Token files MUST have restrictive permissions:

```bash
# Set correct permissions (owner read/write only)
chmod 600 ~/.config/gitea/token
chmod 600 ~/.config/gitea/admin-token

# Verify permissions
ls -la ~/.config/gitea/
# Should show: -rw------- 1 user user ...
```

## Token Rotation

Best practices for rotating tokens:

1. **Create new token** via web UI
2. **Test new token** in non-production environment
3. **Update token file** atomically:
   ```bash
   # Atomic update (prevents race conditions)
   echo "new_token_value" > ~/.config/gitea/token.new
   chmod 600 ~/.config/gitea/token.new
   mv ~/.config/gitea/token.new ~/.config/gitea/token
   ```
4. **Verify operations** using new token
5. **Revoke old token** via web UI

## Agent Integration

When generating agent definitions that require API access:

```markdown
## Example Usage

To list issues for a repository:

```bash
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/repos/roctinam/sysops/issues?state=all" \
  | jq -r '.[] | "\(.number): \(.title)"'
EOF
```

**Never** include actual token values in examples.
```

## CI/CD Integration

For automated pipelines:

```yaml
# GitHub Actions example
jobs:
  deploy:
    steps:
      - name: Call API
        env:
          GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
        run: |
          curl -s -H "Authorization: token ${GITEA_TOKEN}" \
            "https://git.integrolabs.net/api/v1/user"
```

```yaml
# GitLab CI example
deploy:
  script:
    - |
      curl -s -H "Authorization: token ${GITEA_TOKEN}" \
        "https://git.integrolabs.net/api/v1/user"
  variables:
    GITEA_TOKEN: ${CI_GITEA_TOKEN}
```

## Troubleshooting

### Token Not Found

```bash
# Check if token file exists
if [ -f ~/.config/gitea/token ]; then
  echo "Token file exists"
else
  echo "Token file not found. Create at:"
  echo "https://git.integrolabs.net/user/settings/applications"
fi
```

### Permission Denied

```bash
# Check and fix permissions
ls -la ~/.config/gitea/token
chmod 600 ~/.config/gitea/token
```

### Invalid Token

```bash
# Validate token (without exposing value)
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
  -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/user")

case ${STATUS} in
  200) echo "Token is valid" ;;
  401) echo "Token is invalid or expired" ;;
  403) echo "Token lacks required permissions" ;;
  *) echo "Unexpected status: ${STATUS}" ;;
esac
EOF
```

## Compliance Checklist

Before deploying any automation that uses tokens:

- [ ] Tokens loaded from environment variables or secure files only
- [ ] No tokens in command-line arguments
- [ ] No tokens in log output
- [ ] No tokens in shell history
- [ ] No tokens committed to version control
- [ ] Token files have mode 600 permissions
- [ ] Heredoc pattern used for multi-line operations
- [ ] Token rotation procedure documented
- [ ] Token validation tested

## References

- @~/.claude/CLAUDE.md - Global token configuration
- @agentic/code/addons/security/secure-token-load.md - Token loading skill
- @.claude/rules/token-security.md - Enforcement rules
- [Gitea API Documentation](https://docs.gitea.io/en-us/api-usage/)
- [GitHub Token Security](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-authentication-to-github)

---

**Document Control**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-13 | Initial documentation for Issue #18 |
