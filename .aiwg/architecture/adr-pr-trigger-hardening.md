# ADR: PR-Trigger Workflow Hardening

**Status**: Accepted
**Date**: 2026-05-12
**Issue**: [#1289](https://git.integrolabs.net/roctinam/aiwg/issues/1289) (A14, Wave 8 of supply-chain hardening epic [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278))

## Context

Audit finding **F7** (May 2026 Mini Shai-Hulud response, [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278)) called for an audit of every workflow under `.gitea/workflows/` that triggers on `pull_request`, with particular attention to how Gitea Actions handles fork-PR secret exposure. Threat model scenario **S2** (workflow injection / fork-PR secret extraction) covers the attack class: an attacker opens a PR from a fork whose modified workflow or modified install scripts exfiltrate user-defined secrets at run time.

Wave 2 already landed a fork-PR guard on `docsite-build.yml` ([#1284 / A6](https://git.integrolabs.net/roctinam/aiwg/issues/1284), commit `8a3d4086`) as defense-in-depth pending this audit. A14 closes the audit and documents the canonical hardening pattern.

### Gitea fork-PR secret-exposure default — primary-source finding

Reading the Gitea source code at [`models/secret/secret.go`](https://github.com/go-gitea/gitea/blob/main/models/secret/secret.go) (function `GetSecretsOfTask`, lines 160-165) settles the question:

```go
if task.Job.Run.IsForkPullRequest && task.Job.Run.TriggerEvent != actions_module.GithubEventPullRequestTarget {
    // ignore secrets for fork pull request, except GITHUB_TOKEN and GITEA_TOKEN which are automatically generated.
    // for the tasks triggered by pull_request_target event, they could access the secrets because they will run in the context of the base branch
    // see the documentation: https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#pull_request_target
    return secrets, nil
}
```

User-defined secrets (`NPM_TOKEN`, `NPMJS_TOKEN`, `GT_ACCESS_TOKEN`, etc.) are NOT exposed to fork PRs by default. Only the auto-issued `GITHUB_TOKEN` / `GITEA_TOKEN` per-run token is exposed, and that token is further clamped by [`models/actions/token_permissions.go`](https://github.com/go-gitea/gitea/blob/main/models/actions/token_permissions.go) `restrictCrossRepoAccess` (lines 52-57) which forces fork-PR tokens through `MakeRestrictedPermissions()`.

This means:
- The criticality of A14 is **informational + defense-in-depth**, not critical-priority. Gitea's runtime already does the right thing.
- Same-repo guards on secret-touching steps are still worth adding because (a) they make the secret-handling assumption local-and-visible in each workflow, (b) they survive runtime regressions in Gitea's secret-handling, and (c) they document intent for reviewers without forcing them to chase Gitea source.

Additionally relevant: [`services/actions/notifier_helper.go`](https://github.com/go-gitea/gitea/blob/main/services/actions/notifier_helper.go) `ifNeedApproval` (lines 401-422) ensures that fork PRs from non-write users require manual approval before the workflow runs at all — another layer above the secret clamp.

## Decision

**Audit the 5 PR-triggered workflows in `.gitea/workflows/`; add same-repo guards on user-secret-touching steps where needed; document the reusable guard pattern in `.gitea/workflows/README.md`.**

### Per-workflow disposition matrix

| Workflow | PR trigger | User secrets referenced | Action taken | Rationale |
|---|---|---|---|---|
| `docsite-build.yml` | `pull_request` on `docs/**` | `GT_ACCESS_TOKEN` (clone dbbuilder) | Fork-PR guard already in place from [#1284 / A6](https://git.integrolabs.net/roctinam/aiwg/issues/1284); comment updated to reference this audit | Step-level `if: ${{ gitea.event.pull_request.head.repo.fork != true }}` on the `Clone dbbuilder` step. The defense-in-depth is now load-bearing only on the Gitea runtime-regression scenario, since the primary control is Gitea's default fork-PR secret clamp. |
| `skill-lint-pr.yml` | `pull_request` on SKILL.md paths | `secrets.GITHUB_TOKEN` only (auto-issued per-run token, not a user secret) | Documentation comment added at top of file explaining the security analysis | The per-run token is scope-clamped (`pull-requests: write` + `contents: read`) and `restrictCrossRepoAccess` further clamps it on fork PRs. The residual surface is install-script execution from `npm ci`/`npm run build` against fork HEAD, which is mitigated by A15 (release-age gate) + A20 (dep-source lint). No code-level guard added; the security analysis is documented inline so future reviewers don't re-litigate it. |
| `metadata-validation.yml` | `pull_request` on framework/agentic paths | None (verified by `grep -n "secrets\." .gitea/workflows/metadata-validation.yml` returning empty) | Confirmed PR-safe; no code change needed | Workflow runs `npm ci --omit=optional` + `npm run build` + metadata validation. The install-script attack surface is mitigated by A15 + A20. No secrets to clamp. |
| `ci.yml` | `pull_request` on main/develop | None (verified by `grep -n "secrets\." .gitea/workflows/ci.yml` returning empty) | Confirmed PR-safe; no code change needed | Same install-script surface as metadata-validation; same A15+A20 mitigation. The `npm run lint:dep-sources` step (A20, #1300) itself runs on every PR and blocks exotic dep sources in fork-modified lockfiles before they reach a publish workflow. |
| `conformance.yml` | `pull_request` on main + label-gated | None for the gating logic; the conformance harness clones external repos but uses no user-defined secrets | Label-gate verified working: `if: github.event_name != 'pull_request' \|\| contains(github.event.pull_request.labels.*.name, 'conformance:full')` | The label-gate is a defense-in-depth control because the conformance gate provisions Docker containers and clones external sandbox+conformance repos — an expensive run that we don't want fork PRs initiating opportunistically. Only maintainers can apply labels on Gitea, so the gate functions as a manual opt-in. |

### Reusable guard snippet documentation

A new section "PR-trigger workflow hardening" in [`.gitea/workflows/README.md`](../../.gitea/workflows/README.md) documents two variants:

- **Variant A** — fork-PR guard: `if: ${{ gitea.event.pull_request.head.repo.fork != true }}` (simpler; used by `docsite-build.yml`)
- **Variant B** — same-repo guard: `if: ${{ github.event.pull_request.head.repo.full_name == github.repository }}` (stricter; canonical GitHub Actions form)

The README explains the trade-off, why step-level guards are preferred over job-level, and why `pull_request_target` is not the right answer for this codebase.

## Consequences

### Positive

- **Audit-trail completeness.** F7 closes with a primary-source citation to Gitea's secret-handling code, not a "we think it's safe" assertion.
- **Local-and-visible secret-handling intent.** The `docsite-build.yml` guard makes the secret-clamp behavior explicit in the workflow, so a reviewer who's never read Gitea source can still understand the security posture. The `skill-lint-pr.yml` comment provides the same explicit reasoning at the top of that file.
- **Runtime-regression resistance.** If a future Gitea version changes the fork-PR secret default (unlikely but possible), the guard on `docsite-build.yml` continues to block fork PRs from reaching the secret-bearing clone step. The other workflows don't reference user-defined secrets at all, so they're not exposed to this regression class.
- **Reusable pattern.** New workflows that need to touch user-defined secrets can copy the snippet from the README without re-litigating the audit.

### Negative

- **None material.** The work is documentation + one comment update; no logic changes.
- **One residual surface remains.** PR-triggered `npm ci` + `npm run build` on fork HEAD code is an install-script execution surface that A14 does not directly close. A15 (#1290 release-age gate) and A20 (#1300 dep-source lint) close the realistic attack paths against it. A14 documents this rather than adding new control surface.

### Neutral

- **Direct-mode delivery context.** AIWG is a single-developer project; fork PRs are unlikely in practice (no anonymous contributor flow). The hardening is still worth doing because (a) future contributors are possible, (b) public mirror PRs on `github.com/jmagly/aiwg` could appear, and (c) defense-in-depth posture matters for the supply-chain campaign's credibility.

## Alternatives Considered

### Alt 1 — Blanket "no PR-triggered workflows reference user secrets" rule

A simple rule: forbid any `pull_request`-triggered workflow from referencing a user-defined secret at all. Would obsolete the per-step guard pattern.

**Rejected** because `docsite-build.yml` legitimately needs to validate that the documentation site builds on PRs that modify docs, and the dbbuilder clone requires `GT_ACCESS_TOKEN`. Forbidding the secret reference would force a less-precise validation (e.g., a stubbed doc-site build that doesn't catch dbbuilder integration regressions, or no PR-time doc-site validation at all).

The right rule is "no PR-triggered workflow references user secrets in a step that runs on fork PRs," which is exactly what the same-repo guard achieves.

### Alt 2 — `pull_request_target` instead of `pull_request`

GitHub Actions documents `pull_request_target` as the trigger to use when you need fork PRs to access secrets — it runs in the context of the base branch (so the workflow YAML can't be modified by the fork) and explicitly grants secret access.

**Rejected** for three reasons:
1. Gitea's `pull_request_target` support is version-dependent. The audit's primary-source review confirmed Gitea recognizes the trigger (`services/actions/notifier_helper.go` line 312-318 distinguishes flow types and `models/secret/secret.go` line 160 exempts `pull_request_target` from the secret clamp), but the operator can't easily verify the running Gitea version implements it correctly.
2. `pull_request_target` is semantically the wrong choice here. The workflows that touch user secrets (only `docsite-build.yml` in the current set) want to validate the PR's content (the docs change), not to run a privileged base-branch operation against the PR. The same-repo guard is closer to the intent.
3. `pull_request_target` shifts the trust model: the workflow YAML is the base branch's, but the action runs after the PR merge would expose new code. For our use case (validate doc build), running on the head ref with a secret-guard is the right shape.

### Alt 3 — Require manual `/safe-to-test` label per PR

A maintainer applies a `safe-to-test` label after reviewing the PR's diff; only then do PR-triggered workflows run. This is the pattern Kubernetes and similar projects use.

**Rejected** as too high-friction for a single-developer direct-mode project. The conformance gate uses label-gating because the conformance run is expensive and rare; applying the same pattern to every CI workflow would block routine PR validation. If AIWG ever transitions to a multi-contributor model with fork PRs, this approach becomes worth revisiting.

### Alt 4 — Dedicated PR-runner pool isolated from publish runners

Provision a separate Gitea runner that only handles PR-triggered workflows and has no access to publish-related secrets at the runner level. Even if Gitea's secret clamp regressed, the runner physically can't see the secrets.

**Rejected for now** as out of scope for A14 — it's an operator-scheduling change, not a workflow-file change. The [Gitea release compensating controls ADR](adr-gitea-release-compensating-controls.md) ("Control 4 — Dedicated publish runner") already scoped this as a deferred follow-up. If/when the dedicated publish runner lands, the PR-trigger workflows can pin to a different runner pool without changing this ADR's per-workflow disposition.

## Verification

- Gitea source review: [`models/secret/secret.go`](https://github.com/go-gitea/gitea/blob/main/models/secret/secret.go) `GetSecretsOfTask` lines 152-175; [`models/actions/token_permissions.go`](https://github.com/go-gitea/gitea/blob/main/models/actions/token_permissions.go) `restrictCrossRepoAccess` lines 52-57; [`services/actions/notifier_helper.go`](https://github.com/go-gitea/gitea/blob/main/services/actions/notifier_helper.go) `ifNeedApproval` lines 401-422.
- YAML lint: `python3 -c 'import yaml,sys; [yaml.safe_load(open(f)) for f in sys.argv[1:]]' .gitea/workflows/*.yml` exits 0.
- Test suite: `npm test -- --run` 6422+ tests pass.
- Secret-reference inventory: `grep -n "secrets\." .gitea/workflows/*.yml` returns same surface as before this commit (no new secret references introduced).

## References

- [#1289](https://git.integrolabs.net/roctinam/aiwg/issues/1289) — A14 PR-trigger workflow audit (this ADR)
- [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) — Mini Shai-Hulud supply-chain hardening epic (parent)
- [#1284](https://git.integrolabs.net/roctinam/aiwg/issues/1284) — A6 docsite-build fork-PR guard (prior art)
- [#1290](https://git.integrolabs.net/roctinam/aiwg/issues/1290) — A15 release-age gate (companion control: blocks brand-new malicious publishes from entering lockfiles via PR)
- [#1300](https://git.integrolabs.net/roctinam/aiwg/issues/1300) — A20 dep-source lint (companion control: blocks exotic dep sources in PR-modified lockfiles)
- [`adr-gitea-release-compensating-controls.md`](adr-gitea-release-compensating-controls.md) — sibling ADR for the publish-side controls; dedicated-runner deferral is recorded there.
- Gitea source: [models/secret/secret.go](https://github.com/go-gitea/gitea/blob/main/models/secret/secret.go), [models/actions/token_permissions.go](https://github.com/go-gitea/gitea/blob/main/models/actions/token_permissions.go), [services/actions/notifier_helper.go](https://github.com/go-gitea/gitea/blob/main/services/actions/notifier_helper.go)
