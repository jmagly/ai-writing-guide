# CI Workflow Audit

**Generated**: 2026-07-02T04:33:10-04:00
**Repo**: /home/roctinam/dev/aiwg
**Workflow files scanned**: 14

## Findings

### CRITICAL - Bare :latest tags

- None in workflow YAML files.

Note: `.gitea/workflows/README.md:3` and `.gitea/workflows/README.md:11`
mention `:latest` only while documenting the repository pinning policy. They
are not workflow execution references.

### CRITICAL - PR-triggered jobs reference secrets

- None involving user-defined secrets in PR-triggered workflow jobs.

Reviewed nuance:

- `.gitea/workflows/skill-lint-pr.yml:124` uses
  `${{ secrets.GITHUB_TOKEN }}` on a `pull_request` workflow. The file documents
  this as the auto-issued Gitea token, not a user-defined secret, and scopes it
  to `pull-requests: write` plus `contents: read` at
  `.gitea/workflows/skill-lint-pr.yml:46`. The workflow comments at
  `.gitea/workflows/skill-lint-pr.yml:8` through
  `.gitea/workflows/skill-lint-pr.yml:24` and the policy at
  `.gitea/workflows/README.md:29` through `.gitea/workflows/README.md:67`
  document the fork-PR secret handling disposition.

### HIGH - Unpinned actions (tag-pinned uses:)

- None found. Workflow `uses:` references are pinned to commit SHAs or are not
  external action references.

Examples reviewed:

- `.gitea/workflows/ci.yml:27` uses
  `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5`.
- `.gitea/workflows/conformance.yml:233` uses
  `actions/upload-artifact@ea165f8d65b6e75b540449e92b4886f43607fa02`.
- `.github/workflows/npm-publish.yml:113` uses
  `actions/checkout@93cb6efe18208431cddfb8368fd83d5badbf9bfd`.

### HIGH - Unpinned container images

- None found. Workflow container images are digest-pinned.

Examples reviewed:

- `.gitea/workflows/ci.yml:22` uses
  `node:20@sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5`.
- `.gitea/workflows/conformance.yml:83` uses the same digest-pinned Node 20
  container.
- `.github/workflows/npm-publish.yml:105` uses
  `node:24@sha256:050bf2bbe33c1d6754e060bec89378a79ed831f04a7bb1a53fe45e997df7b3bb`.

### HIGH - curl|sh without hash check

- None found in workflow files.

### MEDIUM - curl|sh with hash check

- None found in workflow files.

### MEDIUM - No pin manifest

- Clean: `ci/digests.txt` exists and is referenced by workflow comments and
  `.gitea/workflows/README.md`.

### INFO - Local reusable workflows (transitive check)

- None found.

### INFO - PR jobs guarded against fork access

- `.gitea/workflows/conformance.yml:88` gates the conformance job so PR runs
  require the `conformance:full` label. This limits optional heavy conformance
  execution rather than guarding a user-defined secret.
- `.gitea/workflows/README.md:35` through `.gitea/workflows/README.md:63`
  defines the reusable step-level guard pattern for future secret-bearing
  PR-triggered steps.

## Clean Checks

- Workflow inventory completed for `.github/workflows/*.yml` and
  `.gitea/workflows/*.yml`.
- No tag-pinned third-party action references were found.
- No undigested workflow container image references were found.
- No executable workflow `:latest` tags were found.
- No workflow `curl | sh` installer pattern was found.
- The main Fortemi-relevant CI path in `.gitea/workflows/ci.yml` runs
  `npm run build:cli` at line 73 and `npm run test:ci` at line 102. It does not
  set `AIWG_FORTEMI_CORE_LIVE` or `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED`, so the
  required CI path remains a static/offline Fortemi Core parity gate.
- The optional package-boundary workflow remains only a proposal under
  `.aiwg/planning/fortemi-core-index-migration/` and is not installed in
  `.gitea/workflows/`.

## Remediation Plan

No immediate CI workflow remediation is required from this scan.

Keep the existing controls in place:

1. Preserve digest pins and commit-SHA action pins when the Fortemi migration
   branch is prepared for review.
2. Continue updating `ci/digests.txt` with any future workflow pin changes.
3. Do not add the package-boundary workflow under `.gitea/workflows/` without
   explicit human authorization.
4. Re-run this audit after any workflow edit, especially before installing the
   optional `@fortemi/core` package-boundary smoke workflow.

## Follow-up Issues

None required from this local scan.

## References

- `.gitea/workflows/README.md` - CI pinning and PR-trigger hardening policy.
- `ci/digests.txt` - pin manifest.
- `.aiwg/planning/fortemi-core-index-migration/fortemi-package-boundary-workflow-proposal.md`
  - optional Fortemi package-boundary CI proposal.
