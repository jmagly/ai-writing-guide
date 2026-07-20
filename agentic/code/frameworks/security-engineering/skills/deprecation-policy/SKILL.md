---
namespace: aiwg
name: deprecation-policy
platforms: [all]
description: Compare API/ABI surfaces between refs, flag incompatible changes, and generate deprecation/changelog notes for library projects
requires:
  - refs: base and head git refs
  - project-kind: library or SDK project
ensures:
  - report: API additions, removals, ABI-impacting changes, and missing deprecation notices
  - changelog-notes: draft deprecation/removal notes when requested
errors:
  - unsupported-language: no supported public API extractor detected
invariants:
  - experimental APIs must be clearly marked before they are exempted
  - stable API removals require a major release or documented deprecation window
commandHint:
  argumentHint: "[--base <ref>] [--head <ref>] [--language c|cpp|rust|go|typescript|auto] [--emit-changelog]"
  allowedTools: Read, Bash, Grep
  model: haiku
  category: security
  orchestration: false
  modelRole: efficiency
  modelTier: economy
---

# Deprecation Policy

Compare public API/ABI surfaces and enforce the `api-abi-stability` rule for library and SDK projects. This maps curl Practice 26 into AIWG release governance.

## Language Strategies

- C/C++: compare exported headers, function prototypes, struct layout, and symbol lists.
- Rust: integrate `cargo public-api` where available; report removed exported items.
- Go: run `apidiff` from `golang.org/x/exp/cmd/apidiff`.
- TypeScript: use `api-extractor` or declaration-file diffs.

## Output

The report classifies changes as additive, compatible, deprecated, removal, ABI-breaking, or experimental. It also drafts changelog text for each deprecation or removal.

## Composition

Use with `flow-change-control` for request-level approval. This skill owns the API/ABI technical check and release-note evidence.

## References

- `agentic/code/frameworks/security-engineering/rules/api-abi-stability.md`
- SemVer
- curl ABI policy
