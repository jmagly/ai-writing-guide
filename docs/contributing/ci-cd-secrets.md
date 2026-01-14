# CI/CD Secrets Configuration

**Version:** 1.0
**Last Updated:** 2026-01-14
**Target Audience:** Repository maintainers and administrators

## Overview

This document describes the secrets required for CI/CD workflows in the AIWG repository. Secrets are used for authentication with package registries and external services.

## Required Secrets

### NPM_TOKEN

**Purpose:** Authenticate with Gitea's npm package registry for publishing.

**Required Scopes:**
- `package:write` - Required to publish packages
- `package:read` - Required to verify published packages

**Used In:**
- `.gitea/workflows/npm-publish.yml` - Publishing to Gitea npm registry
- Creating Gitea releases via API

### Setting Up NPM_TOKEN

#### Step 1: Create a Gitea Access Token

1. Log in to [git.integrolabs.net](https://git.integrolabs.net)
2. Navigate to **Settings** → **Applications** → **Access Tokens**
   - Direct URL: https://git.integrolabs.net/user/settings/applications
3. Create a new token with:
   - **Token Name:** `ci-npm-publish` (or descriptive name)
   - **Select Scopes:**
     - ✅ `write:package` (includes read:package)
     - ✅ `read:repository` (for checkout operations)
   - **Expiration:** Set according to your security policy (recommend 1 year max)
4. Click **Generate Token**
5. **IMPORTANT:** Copy the token immediately - it won't be shown again

#### Step 2: Add Secret to Gitea Repository

1. Navigate to the repository: https://git.integrolabs.net/roctinam/ai-writing-guide
2. Go to **Settings** → **Actions** → **Secrets**
3. Click **Add Secret**
4. Configure:
   - **Name:** `NPM_TOKEN`
   - **Value:** Paste the token from Step 1
5. Click **Add Secret**

#### Step 3: Verify Configuration

Trigger a manual workflow run to verify:

```bash
# Push a test tag (can be deleted after)
git tag v9999.99.99-test
git push origin v9999.99.99-test

# Watch the workflow at:
# https://git.integrolabs.net/roctinam/ai-writing-guide/actions

# Clean up test tag
git tag -d v9999.99.99-test
git push origin :refs/tags/v9999.99.99-test
```

Or use the workflow dispatch with dry_run enabled.

## Troubleshooting

### Error: 401 Unauthorized

```
npm error code E401
npm error 401 Unauthorized - PUT https://git.integrolabs.net/api/packages/roctinam/npm/aiwg
```

**Causes:**
1. **Token expired** - Create a new token and update the secret
2. **Token missing** - Verify NPM_TOKEN secret exists in repository settings
3. **Wrong scopes** - Token must have `write:package` scope
4. **Token revoked** - Check if token still exists in user settings

**Resolution:**
1. Go to https://git.integrolabs.net/user/settings/applications
2. Check if the token exists and hasn't expired
3. If expired/missing, create a new token with `write:package` scope
4. Update the repository secret with the new token

### Error: 403 Forbidden

**Causes:**
1. Token belongs to user without package write permissions
2. Repository doesn't allow package publishing

**Resolution:**
1. Ensure token owner has write access to the repository
2. Check organization/repository package settings

### Token Not Being Used

If the workflow isn't picking up the secret:

1. Verify secret name is exactly `NPM_TOKEN` (case-sensitive)
2. Check workflow file references `${{ secrets.NPM_TOKEN }}`
3. Ensure workflow has appropriate permissions in `permissions:` block

## Security Best Practices

### Token Management

- **Rotation:** Rotate tokens annually or when team members leave
- **Scope:** Use minimum required scopes (write:package, read:repository)
- **Naming:** Use descriptive names like `ci-npm-publish-2026`
- **Audit:** Periodically review active tokens

### Secret Storage

- Never commit tokens to the repository
- Use repository/organization secrets, not environment variables in code
- Don't echo or log token values in workflows

### Workflow Security

```yaml
# Good: Token passed via secrets
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

# Bad: Token hardcoded or echoed
run: echo ${{ secrets.NPM_TOKEN }}  # NEVER do this
```

## Workflow Architecture

### npm-publish.yml Flow

```
[Tag Push v*] → [Checkout] → [Configure npm] → [Build] → [Publish to Gitea] → [Verify]
                                   ↓
                            Uses NPM_TOKEN for:
                            - .npmrc authentication
                            - npm publish command
                            - Gitea release API
```

### Secret Usage in Workflow

```yaml
# .npmrc configuration (line 55-56)
//git.integrolabs.net/api/packages/roctinam/npm/:_authToken=${{ secrets.NPM_TOKEN }}

# Publish command (line 107-109)
npm publish --registry=${{ env.GITEA_NPM_REGISTRY }}
env:
  NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

# Release creation (line 137)
-H "Authorization: token ${{ secrets.NPM_TOKEN }}"
```

## Additional Secrets (Optional)

### NPMJS_TOKEN (for public npm)

If publishing to public npmjs.org:

1. Create token at https://www.npmjs.com/settings/tokens
2. Select "Automation" token type
3. Add as secret named `NPMJS_TOKEN`
4. Update workflow to use separate token for public registry

### GITHUB_TOKEN (for GitHub mirror)

For GitHub Actions (`.github/workflows/`):

- Automatically provided by GitHub Actions
- No manual configuration needed
- Used for GitHub Releases and npm publish to GitHub Packages

## References

- [Gitea Package Registry Documentation](https://docs.gitea.com/usage/packages/npm)
- [Gitea Actions Secrets](https://docs.gitea.com/usage/actions/secrets)
- [npm Authentication](https://docs.npmjs.com/using-private-packages-in-a-ci-cd-workflow)
- @.gitea/workflows/npm-publish.yml - Main publish workflow
- @.claude/rules/token-security.md - Token security rules
