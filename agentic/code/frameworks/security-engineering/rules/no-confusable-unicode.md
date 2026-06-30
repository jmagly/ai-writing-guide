---
enforcement: high
id: no-confusable-unicode
severity: HIGH
applies_to: [all-agents, security-auditor, code-reviewer]
tags: [unicode, trojan-source, homoglyph, reviewability]
---

# No Confusable Unicode

**Enforcement Level**: HIGH
**Scope**: Source code, dependency names, release metadata, and commit/PR text
**Framework**: security-engineering

## Rule

Source and release metadata MUST NOT contain Unicode bidirectional controls, zero-width characters, or mixed-script identifiers unless explicitly allowlisted. Non-ASCII identifiers are allowed only when the project maintains a local allowlist that explains why the spelling is intentional.

Forbidden by default:

- Bidirectional controls U+202A through U+202E and U+2066 through U+2069.
- Zero-width characters U+200B through U+200F and U+FEFF.
- Mixed-script identifiers that visually resemble ASCII identifiers.
- Dependency names or package names containing confusable characters.

## Detection

Use the companion `confusable-unicode-audit` skill. Projects with legitimate non-ASCII text declare exceptions in `.aiwg/security/confusable-unicode-allowlist.yaml`.

## References

- `.aiwg/security/curl-checklist-gap-analysis.md` row 2, Practice 8
- Trojan Source / CVE-2021-42574
- Unicode TR39

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-23
