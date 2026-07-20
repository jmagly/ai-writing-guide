---
namespace: aiwg
name: confusable-unicode-audit
platforms: [all]
description: Detect bidi controls, zero-width characters, mixed-script identifiers, and homoglyph risks in source and release metadata
requires:
  - git: repository file enumeration
ensures:
  - report: suspicious Unicode occurrences with code point, context, and allowlist status
  - exit-code: non-zero when violations found and --fail-on-violation is set
errors:
  - allowlist-invalid: .aiwg/security/confusable-unicode-allowlist.yaml cannot be parsed
invariants:
  - exact code points are reported so reviewers do not need visual inspection
  - allowlisted non-ASCII is still included in the exceptions section
commandHint:
  argumentHint: "[--fail-on-violation] [--include-metadata] [--format text|json]"
  allowedTools: Read, Bash, Grep
  model: haiku
  category: security
  orchestration: false
  modelRole: efficiency
  modelTier: economy
---

# Confusable Unicode Audit

Detect Trojan Source and homoglyph risks in source files, dependency names, and release metadata. This enforces `no-confusable-unicode` and maps curl Practice 8 into an AIWG control.

## Detection Targets

- Bidirectional controls: U+202A through U+202E, U+2066 through U+2069.
- Zero-width characters: U+200B through U+200F, U+FEFF.
- Non-ASCII identifiers in source code.
- Mixed-script identifiers, especially Latin plus Cyrillic or Greek.
- Package/dependency names containing non-ASCII or confusable characters.
- Optional metadata scan: commit subject, PR titles, release notes.

## Allowlist

Legitimate non-ASCII is declared in `.aiwg/security/confusable-unicode-allowlist.yaml`:

```yaml
version: 1
allow:
  - path: "docs/i18n/**"
    reason: "localized documentation"
  - identifier: "naive_bayes"
    codepoints: ["U+00EF"]
    reason: "historical exported API spelling"
```

## Output

Reports show file, line, column, Unicode code point, character name, and remediation. Bidi and zero-width controls are always HIGH severity.

## References

- `agentic/code/frameworks/security-engineering/rules/no-confusable-unicode.md`
- Unicode TR39
- Trojan Source / CVE-2021-42574
