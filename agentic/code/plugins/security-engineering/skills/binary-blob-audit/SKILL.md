---
namespace: aiwg
name: binary-blob-audit
platforms: [all]
description: Scan tracked repository files for committed binary blobs and report reviewability/provenance exceptions
requires:
  - git: repository with tracked files
  - file: file(1) utility for MIME classification
ensures:
  - report: binary files listed with MIME type, size, exception class, and last touched commit
  - exit-code: non-zero when violations found and --fail-on-violation is set
errors:
  - not-git-repo: current directory is not a git repository
  - file-missing: file(1) utility unavailable
invariants:
  - never deletes files
  - acceptable binary exceptions are reported, not silently ignored
commandHint:
  argumentHint: "[--fail-on-violation] [--max-fixture-bytes N] [--format text|json]"
  allowedTools: Read, Bash, Grep
  model: sonnet
  category: security
  orchestration: false
---

# Binary Blob Audit

Scan source repositories for committed binary blobs. This enforces the `no-binary-blobs` rule and maps curl Practice 6 into an AIWG security-engineering control.

## Execution Flow

1. Run `git ls-files -z` to enumerate tracked files.
2. For each file, collect size, MIME classification, and last touched commit.
3. Flag binary MIME types and extension-blocklisted files: `.so`, `.dll`, `.dylib`, `.exe`, `.bin`, `.dat`, `.o`, `.a`, `.jar`, `.war`.
4. Classify exceptions:
   - `test/fixtures/**` and `tests/fixtures/**` under the configured size cap.
   - `assets/**` images under the configured size cap.
   - SBOM/attestation files with a signature or provenance note.
5. Emit a report with violations and allowed exceptions.

## Output

Each finding includes path, MIME type, byte size, last touched commit, exception status, and remediation.

## CI

Run in report-only mode first:

```bash
aiwg run skill binary-blob-audit
```

Gate new violations after baselining:

```bash
aiwg run skill binary-blob-audit -- --fail-on-violation
```

## References

- `agentic/code/frameworks/security-engineering/rules/no-binary-blobs.md`
- `.aiwg/security/curl-checklist-gap-analysis.md` row 1, Practice 6
