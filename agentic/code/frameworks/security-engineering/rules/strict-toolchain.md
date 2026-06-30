---
enforcement: high
id: strict-toolchain
severity: HIGH
applies_to: [all-agents, test-engineer, security-auditor, code-reviewer]
tags: [compiler-warnings, ci, toolchain, static-analysis]
---

# Strict Toolchain

**Enforcement Level**: HIGH
**Scope**: Build, lint, typecheck, and CI configuration
**Framework**: security-engineering

## Rule

Projects MUST define a minimum strictness floor for every primary language and run it in CI. Sanitizers and fuzzing add runtime coverage; they do not replace warning-as-error, typechecking, static analysis, or compiler diagnostics.

Minimum floor:

- C/C++: `-Wall -Wextra -Werror -pedantic`, plus `-Wshadow -Wpointer-arith -Wcast-qual`; recommended `-Wformat=2` and `-Wstrict-prototypes` for C.
- Rust: `cargo clippy -- -D warnings`; crates may use `#![deny(warnings)]` for release builds.
- Go: `go vet ./...` and `staticcheck ./...` exit non-zero in CI.
- Python: `ruff check` and strict or progressively strict `mypy`.
- TypeScript: `strict: true` and `noUncheckedIndexedAccess: true` for new code.

Legacy projects may adopt this with a baseline file, but new warnings MUST fail the build.

## Detection

Use `strict-toolchain-audit` to inspect build configs and report missing flags or non-failing warning paths.

## References

- `.aiwg/security/curl-checklist-gap-analysis.md` row 2, Practice 13
- `agentic/code/frameworks/security-engineering/skills/strict-toolchain-audit/SKILL.md`

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-23
