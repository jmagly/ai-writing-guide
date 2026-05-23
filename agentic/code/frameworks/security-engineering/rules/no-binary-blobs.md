---
id: no-binary-blobs
severity: MEDIUM
applies_to: [all-agents, security-auditor, code-reviewer]
tags: [binary-blobs, reviewability, provenance, repository-hygiene]
---

# No Binary Blobs

**Enforcement Level**: MEDIUM
**Scope**: Source repositories and release branches
**Framework**: security-engineering

## Rule

Repositories SHOULD NOT contain committed binary blobs unless the file is covered by a documented exception. Binary content is unauditable in code review, can hide payloads, and cannot be diff-reviewed in a meaningful way.

Acceptable exceptions:

- Test fixtures under `test/fixtures/**` or `tests/fixtures/**`, with a short provenance note and size cap.
- Small product assets under `assets/**`, with human-reviewable source or generation provenance.
- Signed SBOMs or attestations when the signature and producer are recorded.
- Vendored upstream files only when governed by `dependency-source-policy`.

## Detection

Use the companion `binary-blob-audit` skill. The audit combines file-extension blocklists with `git ls-files` and `file --mime` classification, then reports the path, MIME type, size, and last touched commit.

## References

- `.aiwg/security/curl-checklist-gap-analysis.md` row 1, Practice 6
- `agentic/code/frameworks/security-engineering/skills/binary-blob-audit/SKILL.md`

**Rule Status**: ACTIVE
**Last Updated**: 2026-05-23
