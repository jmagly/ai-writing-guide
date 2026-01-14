# Token Security Rules

**Enforcement Level**: CRITICAL
**Scope**: All agents, commands, and generated code
**Version**: 1.0.0

## Overview

These rules enforce secure token handling across all AIWG operations, agent definitions, and generated code. Violations of these rules constitute security vulnerabilities.

## Mandatory Rules

### Rule 1: Never Hard-Code Tokens

**FORBIDDEN**:
```bash
# NEVER do this
GITEA_TOKEN="abc123def456..."
curl -H "Authorization: token abc123..." "..."
```

**REQUIRED**:
```bash
# Load from secure file
curl -H "Authorization: token $(cat ~/.config/gitea/token)" "..."

# OR from environment variable
curl -H "Authorization: token ${GITEA_TOKEN}" "..."
```

### Rule 2: Never Pass Tokens as Command Arguments

**FORBIDDEN**:
```bash
# NEVER do this (visible in process list)
./script.sh --token "abc123..."
my-command --api-key "xyz789..."
```

**REQUIRED**:
```bash
# Pass via environment variable
GITEA_TOKEN=$(cat ~/.config/gitea/token) ./script.sh

# OR load within script
# Inside script.sh:
TOKEN=$(cat ~/.config/gitea/token)
```

### Rule 3: Never Echo or Log Token Values

**FORBIDDEN**:
```bash
# NEVER do this
TOKEN=$(cat ~/.config/gitea/token)
echo "Using token: ${TOKEN}"
echo "Token loaded: ${TOKEN}" >> logfile.txt
printf "Token: %s\n" "${TOKEN}"
```

**REQUIRED**:
```bash
# Log only operation status
echo "Token loaded successfully"
echo "API call completed with status ${HTTP_CODE}"
```

### Rule 4: Use Heredoc for Multi-Line Operations

**FORBIDDEN**:
```bash
# NEVER do this (token persists in shell)
TOKEN=$(cat ~/.config/gitea/token)
RESULT=$(curl -H "Authorization: token ${TOKEN}" "...")
echo "${RESULT}" | jq .
# Token still in environment here
```

**REQUIRED**:
```bash
# Use heredoc to scope token lifetime
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
RESULT=$(curl -H "Authorization: token ${TOKEN}" "...")
echo "${RESULT}" | jq .
# Token discarded when heredoc exits
EOF
```

### Rule 5: Never Commit Tokens to Version Control

**FORBIDDEN**:
```bash
# NEVER do this
echo "GITEA_TOKEN=abc123..." >> .env
git add .env

# Or in any tracked file
API_KEY="xyz789..."
```

**REQUIRED**:
```bash
# Use .env.example with placeholders
echo "GITEA_TOKEN=your_token_here" >> .env.example

# Keep actual .env in .gitignore
echo ".env" >> .gitignore
```

### Rule 6: Enforce File Permissions

**FORBIDDEN**:
```bash
# NEVER leave tokens with open permissions
-rw-rw-r-- 1 user user 40 Jan 13 12:00 token  # mode 664, readable by group
-rw-r--r-- 1 user user 40 Jan 13 12:00 token  # mode 644, readable by all
```

**REQUIRED**:
```bash
# Always set mode 600 (owner read/write only)
chmod 600 ~/.config/gitea/token
# Results in: -rw------- 1 user user ...
```

### Rule 7: Load Tokens at Point of Use

**FORBIDDEN**:
```bash
# NEVER load early and keep in environment
export GITEA_TOKEN=$(cat ~/.config/gitea/token)
# ... many lines of code ...
curl -H "Authorization: token ${GITEA_TOKEN}" "..."
# Token exposed throughout entire script
```

**REQUIRED**:
```bash
# Load inline for single operations
curl -H "Authorization: token $(cat ~/.config/gitea/token)" "..."

# OR use heredoc for multiple operations
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
# Use token only within this scope
EOF
```

## Agent Definition Requirements

When creating agent definitions that require API access:

### Required Elements

1. **Example usage MUST use heredoc pattern**:
   ```markdown
   ## Example Usage

   ```bash
   bash <<'EOF'
   TOKEN=$(cat ~/.config/gitea/token)
   curl -s -H "Authorization: token ${TOKEN}" \
     "https://git.integrolabs.net/api/v1/user" | jq .
   EOF
   ```
   ```

2. **Security notes MUST be included**:
   ```markdown
   ## Security Notes

   - Token loaded within heredoc scope only
   - Never exposed in logs or command history
   - Automatically cleaned up after execution
   - See @agentic/code/frameworks/sdlc-complete/docs/token-security.md
   ```

3. **References MUST include security documentation**:
   ```markdown
   ## References

   - @agentic/code/frameworks/sdlc-complete/docs/token-security.md
   - @agentic/code/addons/security/secure-token-load.md
   ```

## Command/Skill Requirements

When creating commands or skills that use tokens:

1. **MUST check for token file existence**:
   ```bash
   if [ ! -f ~/.config/gitea/token ]; then
     echo "Error: Token file not found"
     echo "Create at: https://git.integrolabs.net/user/settings/applications"
     exit 1
   fi
   ```

2. **MUST validate token permissions**:
   ```bash
   PERMS=$(stat -c "%a" ~/.config/gitea/token)
   if [ "${PERMS}" != "600" ]; then
     echo "Warning: Insecure permissions, fixing..."
     chmod 600 ~/.config/gitea/token
   fi
   ```

3. **MUST use heredoc for token operations**:
   ```bash
   bash <<'EOF'
   TOKEN=$(cat ~/.config/gitea/token)
   # ... operations ...
   EOF
   ```

## Code Generation Requirements

When generating any code that performs API authentication:

### For Development/Scripts

```bash
# Template for single API call
curl -s -H "Authorization: token $(cat ~/.config/SERVICE/token)" \
  "https://api.example.com/endpoint"

# Template for multiple API calls
bash <<'EOF'
TOKEN=$(cat ~/.config/SERVICE/token)

# API call 1
curl -s -H "Authorization: token ${TOKEN}" "..."

# API call 2
curl -s -H "Authorization: token ${TOKEN}" "..."
EOF
```

### For CI/CD

```yaml
# GitHub Actions
env:
  GITEA_TOKEN: ${{ secrets.GITEA_TOKEN }}
run: |
  curl -s -H "Authorization: token ${GITEA_TOKEN}" "..."

# GitLab CI
script:
  - curl -s -H "Authorization: token ${GITEA_TOKEN}" "..."
```

### For Application Code

```typescript
// Load from environment
const token = process.env.GITEA_TOKEN;
if (!token) {
  throw new Error('GITEA_TOKEN environment variable not set');
}

// Never log token value
logger.info('API authentication configured');

// Use in API client
const client = new GiteaClient({ token });
```

## Validation Checklist

Before completing any task that involves tokens:

- [ ] No hard-coded token values in any file
- [ ] No tokens passed as command-line arguments
- [ ] No tokens echoed, printed, or logged
- [ ] Heredoc pattern used for multi-line operations
- [ ] Token files have mode 600 permissions
- [ ] No token files tracked in git (.gitignore updated)
- [ ] Environment variables used for CI/CD contexts
- [ ] Security documentation referenced in agent definitions
- [ ] Token validation/error handling included
- [ ] Admin vs standard token selection appropriate

## Remediation

If you identify token security violations:

1. **Immediate**: Remove any hard-coded tokens from files
2. **Immediate**: Update .gitignore if token files are tracked
3. **Immediate**: Rotate any exposed tokens via web UI
4. **Prompt**: Rewrite code to use secure patterns
5. **Prompt**: Add security notes to documentation
6. **Follow-up**: Audit entire codebase for similar violations

## Enforcement

These rules are enforced:

1. **At agent creation time** - All new agents must follow patterns
2. **At command creation time** - All new commands must follow patterns
3. **At code generation time** - All generated code must follow patterns
4. **At review time** - Pull requests checked for violations
5. **At audit time** - Periodic security audits of codebase

## Exceptions

There are NO exceptions to these rules. All token handling must follow secure patterns.

## References

- @agentic/code/frameworks/sdlc-complete/docs/token-security.md - Comprehensive security documentation
- @agentic/code/addons/security/secure-token-load.md - Pattern library
- @~/.claude/CLAUDE.md - Token file locations and API patterns

## Questions

If unsure about token security:

1. Consult @agentic/code/frameworks/sdlc-complete/docs/token-security.md
2. Use @agentic/code/addons/security/secure-token-load.md patterns
3. Default to most restrictive pattern (heredoc with inline load)
4. When in doubt, ask before implementing

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-13
**Issue**: #18
