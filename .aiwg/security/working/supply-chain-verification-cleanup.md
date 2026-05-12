# Supply-Chain Planning Verification Cleanup

**Document ID**: VERIFY-001-SUPPLY-CHAIN-CLEANUP
**Created**: 2026-05-12
**Status**: Planning verification pass
**Scope**: Public-source verification and gap pass for #1278 and sub-issues #1279-#1294.

## Sources Verified

| Source | What was verified | Result |
|--------|-------------------|--------|
| Aikido, "Mini Shai-Hulud Is Back: npm Worm Hits over 160 Packages, including Mistral and Tanstack" (2026-05-12) | 169 package names / 373 package-version entries; optional `@tanstack/setup` GitHub dependency; `prepare` script running `bun run tanstack_runner.js && exit 1`; payload targets npm/GitHub/OIDC/cloud/Kubernetes/Vault secrets | Confirms trigger details and IOCs used in the existing threat model. |
| npm trusted publishing docs (`https://docs.npmjs.com/trusted-publishers`) | Supported provider set and runtime requirements | Corrects plan: trusted publishing currently requires npm CLI 11.5.1+ and Node 22.14.0+ and supports selected cloud-hosted providers. Gitea Actions/self-hosted runners are not listed. |
| npm provenance docs (`https://docs.npmjs.com/generating-provenance-statements`) | Provenance limitations and `npm audit signatures` verification | Confirms provenance is an origin/build-link signal, not a safety proof; supports `npm audit signatures` gate. |
| Gitea Actions comparison docs (`https://docs.gitea.com/usage/actions/comparison`) | Gitea workflow compatibility | Corrects plan: `jobs.<job_id>.environment` is ignored in current docs; do not depend on Gitea environment protection for release secrets. |
| npm config docs (`https://docs.npmjs.com/cli/v11/using-npm/config#min-release-age`) | `min-release-age` syntax | Confirms npm value is a number of days. |
| pnpm settings docs (`https://pnpm.io/settings#minimumreleaseage`) | `minimumReleaseAge` syntax and config location | Corrects plan: pnpm dependency-resolution settings belong in `pnpm-workspace.yaml` or pnpm global config, not `.npmrc`; also adds `blockExoticSubdeps` as relevant to the incident path. |
| Yarn security/config docs (`https://yarnpkg.com/features/security`, `https://yarnpkg.com/configuration/yarnrc#npmMinimalAgeGate`) | `npmMinimalAgeGate` | Confirms Yarn 4.12+ age gate and `.yarnrc.yml` key. |
| Bun install/bunfig docs (`https://bun.com/docs/cli/install`, `https://bun.com/docs/runtime/bunfig#installminimumreleaseage`) | `minimumReleaseAge` seconds | Confirms Bun age-gate value is seconds in `bunfig.toml`. |

## Corrections Made

1. `supply-chain-defenses-brief.md`
   - Corrected npm trusted publishing from "verify Gitea parity" to "not supported for Gitea Actions today."
   - Corrected Node/npm requirement for trusted publishing.
   - Corrected pnpm release-age config location and key.
   - Added C22 for git/tarball/exotic dependency-source controls.
   - Updated Gitea Actions section from speculative parity language to current documented limitations.

2. `supply-chain-hardening-plan.md`
   - Reframed A5 as a release-path decision rather than an in-place Gitea OIDC task.
   - Reframed A10 away from Gitea `environment:` toward compensating controls.
   - Added A20 for dependency-source policy in AIWG CI.
   - Corrected B2 scaffolding targets for pnpm and updated cooldown baseline from 5 days to 7 days, with 10 days as the high-sensitivity profile.
   - Added B13 for user-facing dependency-source policy.

3. `publish-pipeline-audit.md`
   - Updated F2, F3, and F6 recommendations with current npm/Gitea constraints.
   - Added F15 for dependency-source policy because the incident path used a GitHub-hosted optional dependency.

## Remaining Gaps To File Or Link

| Gap | Recommended tracker action |
|-----|----------------------------|
| npmjs.org trusted publishing cannot happen inside the current Gitea workflow | Add a spike/decision issue under #1278; comment on #1283. |
| Gitea `environment:` is ignored, so #1286 as written cannot be implemented literally | Comment on #1286 and retitle/update acceptance criteria or file a replacement issue. |
| pnpm config in #1292/B2 is wrong if it uses `.npmrc` or a 5-day default | Comment on #1292 with corrected config locations and 7/10-day defaults. |
| No issue exists for B4 lifecycle-script policy or B13 dependency-source policy | File one or two Track B issues; B13 is the incident-specific gap. |
| No Track A issue exists for A20 dependency-source lint | File a Phase 2/Top-10-adjacent issue because it directly addresses the `github:` optional dependency path. |
| No issue exists for replacing npm install/build/test workflows with pnpm | File a spike because the repo currently has multiple npm lockfiles and no `pnpm-lock.yaml`/`pnpm-workspace.yaml`. |

## Planning Judgment

The original plan is directionally sound but optimistic about Gitea Actions parity. The highest-value cleanup is to split "public npm trusted publishing" from "Gitea registry publishing":

- public npmjs.org: use a supported cloud-hosted trusted publisher if AIWG wants tokenless publishing/provenance now;
- Gitea registry: keep a scoped token, minimize exposure, and isolate the runner until Gitea/npm support a comparable trusted-publishing path;
- both paths: add dependency-source lint and 7-day release-age gates so the install-time route is covered from both publish and consume sides;
- strongly consider pnpm as the install/build/test baseline because `minimumReleaseAge` and `blockExoticSubdeps` can be enforced in one workspace-level policy, while npm remains necessary for the final `npm publish` operation.
