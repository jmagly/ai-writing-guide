# Security Addon

**Version**: 1.0.0
**Status**: Active
**Last Updated**: 2026-01-13

## Overview

The Security addon provides patterns, documentation, and enforcement rules for secure operations in AIWG projects. This includes token handling, secrets management, and secure API authentication.

## Contents

### Documentation

| File | Purpose | Audience |
|------|---------|----------|
| `secure-token-load.md` | Token loading patterns and examples | Developers, DevOps |

### Related Documentation

| Location | Purpose |
|----------|---------|
| `@agentic/code/frameworks/sdlc-complete/docs/token-security.md` | Comprehensive token security guide |
| `@.claude/rules/token-security.md` | Enforcement rules for agents |
| `@~/.claude/CLAUDE.md` | Global token configuration |

## Key Patterns

### Single-Line Token Load

```bash
curl -s -H "Authorization: token $(cat ~/.config/gitea/token)" \
  "https://api.example.com/endpoint"
```

### Multi-Line Token Load (Heredoc)

```bash
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" "..."
EOF
```

### Environment Variable (CI/CD)

```bash
curl -s -H "Authorization: token ${GITEA_TOKEN}" \
  "https://api.example.com/endpoint"
```

## Security Principles

1. **Never hard-code tokens** in any tracked file
2. **Load at point of use** to minimize exposure window
3. **Use heredoc** for multi-line operations to scope token lifetime
4. **Enforce file permissions** (mode 600) for token files
5. **Never log token values** in any output

## Token File Locations

Standard locations for development tokens:

```
~/.config/
├── gitea/
│   ├── token          # Standard automation (roctibot)
│   └── admin-token    # Admin operations (roctinam)
├── github/
│   └── token
└── gitlab/
    └── token
```

All token files MUST have mode 600 (owner read/write only).

## Usage in Agents

When creating agents that require API access:

1. **Include security notes** in agent definition
2. **Use heredoc pattern** in all examples
3. **Reference security documentation** in References section
4. **Never include actual token values** in examples

Example:

```markdown
## Example Usage

```bash
bash <<'EOF'
TOKEN=$(cat ~/.config/gitea/token)
curl -s -H "Authorization: token ${TOKEN}" \
  "https://git.integrolabs.net/api/v1/user" | jq .
EOF
```

## Security Notes

- Token loaded within heredoc scope only
- Never exposed in logs or command history
- Automatically cleaned up after execution

## References

- @agentic/code/frameworks/sdlc-complete/docs/token-security.md
- @agentic/code/addons/security/secure-token-load.md
```

## Validation

Before deploying any code that uses tokens:

- [ ] Token loaded from secure file or environment variable
- [ ] No tokens in command-line arguments
- [ ] No tokens in log output
- [ ] Heredoc used for multi-line operations
- [ ] Token files have mode 600 permissions
- [ ] No tokens committed to version control

## Future Enhancements

Planned additions to this addon:

- Vault integration patterns (HashiCorp Vault, AWS Secrets Manager)
- Certificate-based authentication
- OAuth flow patterns
- OIDC integration
- Secret scanning pre-commit hooks
- Automated token rotation

## References

- @agentic/code/frameworks/sdlc-complete/docs/token-security.md - Full documentation
- @.claude/rules/token-security.md - Enforcement rules
- [OWASP API Security Top 10](https://owasp.org/www-project-api-security/)
- [NIST 800-63B Digital Identity Guidelines](https://pages.nist.gov/800-63-3/sp800-63b.html)

## Support

For security questions or to report vulnerabilities:

- **Documentation**: @agentic/code/frameworks/sdlc-complete/docs/token-security.md
- **Issues**: https://github.com/jmagly/aiwg/issues
- **Security**: security@integrolabs.net (for vulnerability reports)

---

**Addon Status**

| Aspect | Status |
|--------|--------|
| Documentation | Complete |
| Patterns | Complete |
| Enforcement | Active |
| Testing | Pending |
| CI/CD Integration | Pending |
