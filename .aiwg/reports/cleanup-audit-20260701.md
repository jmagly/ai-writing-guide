# Cleanup Audit Report

Generated: 2026-07-01T18:47:30Z
Scope: `src/`, `tools/`, `agentic/`, `test/`, package manifests, docs collection, package contents
Issue: #1681

## Summary

| Type | High | Medium | Low | Total |
|------|------|--------|-----|-------|
| Unused exports/files | 0 | 0 | 0 | 0 |
| Unused dependencies | 0 | 0 | 0 | 0 |
| Stale manifests/package contents | 1 | 2 | 0 | 3 |
| Stale docs/links | 0 | 0 | 0 | 0 |
| Generated output tracking | 0 | 0 | 0 | 0 |
| **Total** | **1** | **2** | **0** | **3** |

Auto-fixable high-confidence findings applied: 1.

## High Confidence Findings

### Stale Package Allowlist

`npm run lint:tarball` failed because `ci/expected-tarball-top-level.txt`
still listed the removed root `plugins` entry.

Evidence:
- `package.json` `files` includes `agentic/`, not root `plugins/`.
- Current plugin source is under `agentic/code/plugins/**`.
- `npm pack --dry-run --json` did not include a top-level `plugins` entry.

Action:
- Removed `plugins` from `ci/expected-tarball-top-level.txt`.
- Re-ran `npm run lint:tarball`; it passed with 11 top-level entries scanned.

## Medium Confidence Findings

### Package Size Budget

`npm run check:budgets` fails in `check:install-size`:

| Metric | Current | Budget |
|--------|---------|--------|
| Packed size | 27412.0 KB | 12000 KB |
| Unpacked size | 87.54 MB | 39.0625 MB |
| File count | 6808 | 4000 |

`npm run check:dep-budget` passes with 11 direct runtime dependencies against
the budget of 15.

Disposition:
- Retained for a focused package-size cleanup because fixing it safely requires
  package-content decisions outside this allowlist drift batch.
- Follow-up: #1682.

### Manifest Drift Checker Scope

`node tools/manifest/check-manifests.mjs` exits non-zero, but the current output
mixes actionable drift with scanner limitations:

- It scans ignored/generated directories such as `.rlm-prep/`, `dist/`, and
  `node_modules/`.
- It treats every `manifest.json` as a directory file-list manifest, while AIWG
  has several structured component manifest formats.
- It emits false-positive rows such as `[object Object]` for structured template
  manifest entries.

Disposition:
- Not applied in this batch. The checker needs scope/schema work before it can
  serve as a reliable stale-manifest cleanup gate.
- Follow-up: #1683.

## Validation Commands

Passed:

- `npm run lint:tarball`
- `npm run lint:dep-sources`
- `npm run check:dep-budget`
- `npm run lint:generated-artifacts`
- `npm run lint:schemas`
- `npm run docs:collect:dry`
- `aiwg validate-metadata agentic/code`
- `node tools/plugin/package-plugins.mjs --all --dry-run`
- `git diff --check -- .aiwg/README.md docs/generated-output-policy.md`

Failed with tracked follow-up:

- `npm run check:budgets` -> #1682
- `node tools/manifest/check-manifests.mjs` -> #1683

## Notes

`cleanup-audit` and `link-check` are instructional skills in this checkout, not
direct executable CLI commands. This audit followed their documented
read-only-first process and used the repository's available validation scripts
for package, dependency, docs, generated-output, and plugin packaging checks.
