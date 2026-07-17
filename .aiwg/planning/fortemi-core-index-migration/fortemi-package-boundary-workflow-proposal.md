---
title: Fortemi Package Boundary Workflow Proposal
date: 2026-07-02
status: proposed
---

# Fortemi Package Boundary Workflow Proposal

AIWG CI safety rules require explicit human authorization before adding,
editing, or removing files in `.gitea/workflows/`. This proposal captures the
optional Fortemi package-boundary workflow for review. After approval, copy the
YAML body into:

```text
.gitea/workflows/fortemi-package-boundary.yml
```

The workflow is intentionally separate from required CI. It verifies AIWG's
direct v2 export validation and query behavior against the published
`@fortemi/core@2026.7.7` AIWG index validator without changing `package.json` or
`package-lock.json`.

Passing this optional package-boundary workflow does not switch defaults. It is
one input to the later default-backend switch issue, which must still prove
remote CI parity for both default Fortemi behavior and `--backend local` rollback
behavior before any default changes.

## npm Release-Age Override Record

The workflow uses a one-command `--min-release-age=0` override because
`@fortemi/core@2026.7.7` was freshly released during the migration and the
package boundary itself is the subject under test.

Override details:

- Package and version: `@fortemi/core@2026.7.7`.
- Reason waiting is not acceptable: the #1664 migration needs current-package
  evidence before maintainers can rely on direct v2 package validation as the
  active package boundary.
- Approval required: explicit human approval before copying this proposal into
  `.gitea/workflows/`; PR execution is also label-gated with
  `fortemi:package-boundary`.
- Approval record to fill before copying:
  - Approver: `<human maintainer name or handle>`
  - Approved at: `<UTC timestamp>`
  - Reason approved: `<why current-package evidence cannot wait for the normal release-age window>`
  - Additional verification reviewed: local smoke output, package export check,
    and this proposal's CI supply-chain audit notes.
- Additional verification: lifecycle scripts are disabled with
  `--ignore-scripts`, no dependency manifests are changed
  (`--no-save --package-lock=false`), `AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1`
  makes the package validator mandatory, and `npm ci` restores the lockfile
  dependency set after local smoke validation.

## CI Supply-Chain Audit Notes

- This proposal is not an active workflow and must not be copied into
  `.gitea/workflows/` without explicit authorization.
- Third-party actions and containers in the proposed YAML are pinned:
  `actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5` and
  `node:20@sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5`.
- The PR trigger is label-gated with `fortemi:package-boundary`, matching the
  optional-gate pattern used by `.gitea/workflows/conformance.yml`.
- The job does not reference `secrets.*`; the fresh-package install is
  dependency-manifest-neutral and lifecycle-script-disabled.
- The only release-age bypass is the single documented
  `npm install --no-save --package-lock=false --ignore-scripts --min-release-age=0 @fortemi/core@2026.7.7`
  command.

## Proposed Workflow

```yaml
# Fortemi Package Boundary
#
# Verifies AIWG's direct v2 export validation and query behavior against the
# published @fortemi/core AIWG index validator. This is intentionally separate from the
# required CI workflow: the migration must not make normal CI depend on a fresh
# optional Fortemi package release, but maintainers need a reproducible remote
# gate before relying on the package boundary or closing #1691.

name: Fortemi Package Boundary

on:
  workflow_dispatch:
  pull_request:
    branches: [main, develop]

concurrency:
  group: fortemi-package-boundary-${{ gitea.head_ref || gitea.ref }}
  cancel-in-progress: true

jobs:
  fortemi-package-boundary:
    name: "@fortemi/core@2026.7.7 AIWG Index Contract"
    runs-on: ubuntu-latest
    container: node:20@sha256:8f693eaa7e0a8e71560c9a82b55fd54c2ae920a2ba5d2cde28bac7d1c01c9ba5 # node 20.20.2 (see ci/digests.txt)
    timeout-minutes: 10

    # PRs only run this optional package-boundary gate when explicitly opted in.
    # The default CI path stays deterministic and package-lock based.
    if: |
      github.event_name != 'pull_request' ||
      contains(github.event.pull_request.labels.*.name, 'fortemi:package-boundary')

    steps:
      - name: Checkout code
        uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1

      - name: Install npm 11 release-age support
        # The node:20.20.2 image carries npm 10.x. Use npm 11.5+ so the
        # release-age override is explicit and auditable instead of ignored.
        run: npm install -g npm@^11.5

      - name: Install locked AIWG dependencies
        run: npm ci

      - name: Install Fortemi package boundary dependency
        # This is a narrow, documented override for the freshly released
        # @fortemi/core@2026.7.7 package. It does not update package.json or
        # package-lock.json, and lifecycle scripts are disabled for this
        # package-boundary smoke test.
        run: npm install --no-save --package-lock=false --ignore-scripts --min-release-age=0 @fortemi/core@2026.7.7

      - name: Validate AIWG Fortemi direct v2 package contract
        env:
          AIWG_FORTEMI_CORE_PACKAGE_REQUIRED: "1"
        run: npm test -- --run test/unit/artifacts/browser-export.test.ts
```

## Local Validation

The workflow command sequence was updated for the current package boundary on 2026-07-17:

```bash
npm install --no-save --package-lock=false --ignore-scripts --min-release-age=0 @fortemi/core@2026.7.7
AIWG_FORTEMI_CORE_PACKAGE_REQUIRED=1 npm test -- --run test/unit/artifacts/browser-export.test.ts
npm ci
```

Result: the required package-boundary test passed, and `npm ci`
restored the lockfile dependency set afterward.
