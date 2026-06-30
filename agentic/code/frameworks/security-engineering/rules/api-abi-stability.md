---
enforcement: high
id: api-abi-stability
severity: HIGH
applies_to: [all-agents, architect, release-manager, code-reviewer]
tags: [api, abi, semver, deprecation, library-governance]
---

# API and ABI Stability

**Enforcement Level**: HIGH
**Scope**: Library and SDK projects that declare `project.kind: library` or equivalent
**Framework**: security-engineering

## Rule

Library and SDK projects MUST define stable and unstable API surfaces, maintain SemVer-compatible release behavior, and document deprecation before removal. ABI-breaking changes require a major release unless the surface is explicitly marked experimental.

Minimum policy:

- Additive compatible changes are minor releases.
- Bug fixes and non-surface changes are patch releases.
- ABI/API removals or incompatible type/signature changes are major releases.
- Stable APIs require at least two minor releases of deprecation notice before removal.
- Changelogs must call out deprecations, removals, and migration paths.

## Detection

Use `deprecation-policy` to compare two refs and flag API removals, ABI-impacting type changes, and missing deprecation notes.

## References

- `.aiwg/security/curl-checklist-gap-analysis.md` row 4, Practice 26
- curl ABI policy
- SemVer

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-23
