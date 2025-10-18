# ADR-002: Plugin Isolation Strategy

**Status**: Accepted
**Date**: 2025-10-18
**Deciders**: Architecture Designer, Security Architect, Test Architect
**Context**: AIWG SDLC Framework - Plugin System Architecture

## Context and Problem Statement

Plugins must operate within strict security boundaries to prevent malicious code execution and protect user systems. The original architecture included lifecycle hooks for plugin installation/update/removal, creating a contradiction with the "no arbitrary code execution" security principle. We need a clear isolation strategy that enables plugin functionality while maintaining security.

## Decision Drivers

- **Security-first approach**: Prevent arbitrary code execution and system compromise
- **Simplicity**: Avoid complex sandboxing mechanisms that add overhead
- **File-based operations**: Plugins primarily provide templates, agents, and commands (static content)
- **User trust**: Minimize attack surface from untrusted plugins
- **Maintainability**: Solo maintainer requires simple, auditable security model

## Considered Options

1. **Filesystem-based isolation** - Restrict plugins to file operations only, no code execution
2. **WebAssembly sandboxing** - Run plugin code in WASM isolation with strict capabilities
3. **V8 isolates** - JavaScript execution in isolated contexts with permission model
4. **Process sandboxing** - Run plugins in separate processes with restricted syscalls
5. **Docker containers** - Full containerization for complete isolation

## Decision Outcome

**Chosen option**: "Filesystem-based isolation with no code execution"

**Rationale**: Since plugins primarily provide static content (templates, agents, commands), filesystem isolation is sufficient and eliminates entire classes of security vulnerabilities. Removing lifecycle hooks completely prevents arbitrary code execution while maintaining all essential plugin functionality. This approach is simple to implement, audit, and maintain.

## Consequences

### Positive

- Eliminates arbitrary code execution vulnerabilities entirely
- Simple security model easy to understand and audit
- Low performance overhead (no sandboxing complexity)
- Clear permission boundaries (read/write paths)
- Reduces attack surface significantly
- No complex sandbox escape scenarios

### Negative

- Cannot support plugins requiring runtime execution
- Limited to file-based operations only
- No automated setup/migration capabilities
- Manual configuration required for complex plugins
- Future dynamic plugins would require architecture change

### Risks

- Path traversal attacks (mitigated by PathValidator)
- CLAUDE.md poisoning (mitigated by InjectionValidator)
- Dependency chain attacks (mitigated by hash verification)
- Symlink escapes (mitigated by symlink detection)

## Implementation Notes

**Security Boundaries Enforced**:

Read-Allowed Paths:
- Plugin root directory (`.aiwg-plugins/{plugin-name}/`)
- AIWG core templates (read-only)
- Project `.aiwg/` directory (read-only for dependency checks)

Write-Allowed Paths:
- `.aiwg-plugins/` (plugin installation)
- `.aiwg/contrib/` (contributor workspaces)
- `.aiwg/plugins/` (runtime data)
- `.claude/agents/` (agent deployment)
- `.claude/commands/` (command deployment)
- `CLAUDE.md` (with validation and approval)

Forbidden Paths (Blacklist):
- `/etc/`, `/root/`, `~/.ssh/`, `~/.aws/`
- `.env` files, `.git/`, `node_modules/`
- Any system configuration or credential files

**Migration Strategy**: Plugins with existing lifecycle hooks must convert to manual setup instructions in MANUAL_SETUP.md. Users explicitly execute setup scripts if needed (informed consent model).

**Future Consideration**: Phase 2 could introduce Deno runtime with strict permissions for plugins requiring code execution.

## Related Decisions

- ADR-001: Plugin Manifest Format (removed lifecycle hooks from schema)
- ADR-006: Plugin Rollback Strategy (operates within filesystem boundaries)
- SAD Section 4.6: Security View (comprehensive threat model)

## References

- SAD v1.0: `/home/manitcor/dev/ai-writing-guide/.aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md`
- Security Implementation Roadmap: Section 11.2 of SAD
- OWASP A03:2021 (Injection), A08:2021 (Software Integrity)
- CWE-22 (Path Traversal), CWE-502 (Deserialization)