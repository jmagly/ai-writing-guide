---
namespace: aiwg
name: strict-toolchain-audit
platforms: [all]
description: Check build and CI configuration for warning-as-error, strict typechecking, and language-specific compiler/linter floors
requires:
  - project-files: build files or CI workflows for at least one supported language
ensures:
  - report: strictness gaps per language and remediation commands
  - exit-code: non-zero when --fail-on-missing is set and required strictness is absent
errors:
  - no-supported-language: no supported language/build signal detected
invariants:
  - gradual-adoption baselines are allowed only when new warnings still fail
  - sanitizer jobs do not count as replacement for strict compiler/linter gates
commandHint:
  argumentHint: "[--language c|cpp|rust|go|python|typescript|auto] [--fail-on-missing] [--format text|json]"
  allowedTools: Read, Bash, Grep
  model: sonnet
  category: security
  orchestration: false
---

# Strict Toolchain Audit

Inspect build and CI configuration for the `strict-toolchain` rule. This maps curl Practice 13 into a reusable AIWG security-engineering audit.

## Checks

- C/C++: compiler flags include `-Wall`, `-Wextra`, `-Werror`, `-pedantic`; recommended hardening flags are reported when absent.
- Rust: `cargo clippy -- -D warnings` or equivalent CI gate.
- Go: `go vet ./...` and `staticcheck ./...` fail CI.
- Python: `ruff check` and `mypy` strictness are configured.
- TypeScript: `strict: true` and `noUncheckedIndexedAccess: true`.

## Gradual Adoption

Legacy projects may keep a baseline, but the audit must confirm that new warnings fail the build. A baseline without a ratchet is reported as a finding.

## References

- `agentic/code/frameworks/security-engineering/rules/strict-toolchain.md`
- `agentic/code/frameworks/security-engineering/skills/sanitizer-in-ci/SKILL.md`
