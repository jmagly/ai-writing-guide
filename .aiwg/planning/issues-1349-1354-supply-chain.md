# Issue Batch 1349-1354

Date: 2026-05-14

Scope:
- Expand `lint:dep-sources` to cover the npm package-spec git forms that still allow `prepare` execution.
- Fix `.github/workflows/npm-publish.yml` so manual retries resolve and verify the requested release tag instead of the branch ref.
- Refresh supply-chain docs to reflect npm's current trusted-publishing provider matrix and AIWG's production linter guidance.
- Add a known-affected package scanner for the canonical CSV feed at `/mnt/ops/users/roctinam/Downloads/22-packages.csv`, plus raw-URL support for publishable gist automation.
- Update security-engineering skills to include the new feed-driven scan and evidence-preservation steps.

Verification targets:
- `npm run test -- --run test/unit/tools/dep-source.test.ts test/unit/tools/affected-packages.test.ts`
- `npm run lint:dep-sources`
- `npm run lint:affected-packages`
