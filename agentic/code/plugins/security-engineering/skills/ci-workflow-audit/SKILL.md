---
namespace: aiwg
name: ci-workflow-audit
platforms: [all]
description: Audit CI workflow files for supply-chain risk — unpinned actions, unpinned container images, pull_request-triggered jobs with secret access, curl-pipe-shell installers, and bare :latest tags. Produces a structured markdown report with file:line refs.
triggers:
  - "help with CI builds or deployment"
  - "help me make the build or deployment path safer"
  - "start with pipeline safety or release readiness"
  - "pipeline safety ci"
---

# ci-workflow-audit

Use this skill when a user wants a one-shot scan of their CI workflows
for the supply-chain attack surface that the [ci-action-pinning rule](../../rules/ci-action-pinning.md)
defines as forbidden. The rule is the gate (blocks new violations
post-deployment); this skill is the discovery tool (surfaces existing
violations in a user repo).

Pairs with `npm-supply-chain-audit` (npm-ecosystem audit) — together
they cover most of the user-side risk surface that AIWG's own
supply-chain hardening (`v2026.5.3`) addresses on the AIWG side.

## Triggers

- "audit workflow pinning"
- "ci workflow audit"
- "are my actions pinned"
- "check container image pins"
- "scan workflows for secrets"
- "supply chain risk in CI"

## Scope

Audits the following workflow file locations (all supported in parallel):

| Platform | Path |
|---|---|
| GitHub Actions | `.github/workflows/*.yml`, `.github/workflows/*.yaml` |
| Gitea Actions | `.gitea/workflows/*.yml`, `.gitea/workflows/*.yaml` |
| GitLab CI | `.gitlab-ci.yml`, `.gitlab/*.yml` (where applicable) |
| Reusable workflows | `uses: ./.github/workflows/*` references (transitive) |

Read-only. No mutations.

## Audit sequence

### 1. Inventory workflow files

```bash
find .github/workflows .gitea/workflows -type f \( -name "*.yml" -o -name "*.yaml" \) 2>/dev/null
test -f .gitlab-ci.yml && echo ".gitlab-ci.yml"
```

Record the count. Each subsequent check iterates over this set.

### 2. Action-pin audit — fail on tag-pinned `uses:`

```bash
# Detect floating tags (semver tags, branches, latest)
grep -rnHE '^\s*-\s*uses:\s*[a-zA-Z0-9._-]+/[a-zA-Z0-9._-]+@(v?[0-9]+(\.[0-9]+)*|main|master|latest)\s*(#.*)?$' \
  .github/workflows/ .gitea/workflows/ 2>/dev/null
```

Each match is a finding. Severity: **HIGH** (workflow runs arbitrary
third-party code with workflow's secret access).

Acceptable exception: `uses: ./` references (local reusable workflows
in the same repo) — these pin to the calling commit. Flag separately
as INFO and recurse into them to check their `uses:` references too.

### 3. Container-image-pin audit — fail on tag-pinned `container:`/`image:`

```bash
grep -rnHE '^\s*(container|image):\s*[a-zA-Z0-9._/-]+:[a-zA-Z0-9._-]+\s*(#.*)?$' \
  .github/workflows/ .gitea/workflows/ 2>/dev/null \
  | grep -v 'sha256:'
```

Each match without `@sha256:` is a finding. Severity: **HIGH** (same
attack surface as actions; container provides the execution
environment for every step).

### 4. Bare `:latest` audit

```bash
grep -rnHE ':latest\b' .github/workflows/ .gitea/workflows/ 2>/dev/null
```

Each match is a finding. Severity: **CRITICAL** (`:latest` is the
canonical anti-pattern — captures both digest absence AND the most
volatile possible tag).

### 5. PR-secret-exposure audit

For each workflow file, check whether any job triggered by
`pull_request` references `secrets.*`:

```bash
# Identify pull_request-triggered jobs
for f in $(find .github/workflows .gitea/workflows -name "*.yml" -o -name "*.yaml" 2>/dev/null); do
  # Extract jobs that run on pull_request and check for secret references
  awk '/^on:/,/^[a-z]/ { print }' "$f" | grep -q 'pull_request' || continue
  if grep -nE '\${{\s*secrets\.' "$f" >/dev/null 2>&1; then
    echo "POTENTIAL SECRET EXPOSURE in $f"
    grep -nE '\${{\s*secrets\.' "$f"
  fi
done
```

Each match is a finding. Severity: **CRITICAL** (a contributor PR
from a fork can read repo secrets via the workflow's environment;
classic supply-chain attack vector documented in the Shai-Hulud
campaign).

Acceptable exception: jobs gated with `if: github.event.pull_request.head.repo.full_name == github.repository`
(only trusted maintainer PRs). Flag as INFO and verify the guard.

### 6. Curl-pipe-shell installer audit

```bash
grep -rnHE 'curl[^|]+\|\s*(bash|sh)' .github/workflows/ .gitea/workflows/ 2>/dev/null
```

Each `curl | sh` pattern is a finding. Severity: **MEDIUM** unless
the surrounding context includes a content-hash check (look for
`sha256sum`, `OBSERVED_SHA`, `EXPECTED_INSTALL_SHA`) — if no hash
check is present, severity is **HIGH**.

The recommended fix pattern (strict-mode opt-in) is documented in the
[`ci-action-pinning` rule](../../rules/ci-action-pinning.md) section
"Standalone tools pinned by version + checksum".

### 7. Pin-manifest presence audit

```bash
test -f ci/digests.txt || test -f .ci/digests.txt || test -f docs/ci/digests.txt
```

If no pin manifest exists, finding: **MEDIUM** (without a manifest,
diffs that change pinned references are not auditable).

## Output format

Produce a markdown report at `.aiwg/security/working/ci-workflow-audit.md`
with the structure below. If the working directory doesn't exist,
create it.

```markdown
# CI Workflow Audit

**Generated**: <ISO timestamp>
**Repo**: <repo path or URL>
**Workflow files scanned**: <count>

## Findings

### CRITICAL — Bare :latest tags

- `<file>:<line>` — `<matching line>`

### CRITICAL — PR-triggered jobs reference secrets

- `<file>:<line>` — `<matching line>`
  Mitigation: Gate the job with `if: github.event.pull_request.head.repo.full_name == github.repository`
  OR move the secret-using step to a separate `workflow_run`-triggered workflow.

### HIGH — Unpinned actions (tag-pinned uses:)

- `<file>:<line>` — `<matching line>`
  Resolve the pin: `git ls-remote https://github.com/<owner>/<repo> refs/tags/<tag>`
  Replace `@<tag>` with `@<40-char-sha>` and add a trailing `# <version>` comment.

### HIGH — Unpinned container images

- `<file>:<line>` — `<matching line>`
  Resolve the digest: `docker pull <image>:<tag>` then `docker inspect <image>:<tag> --format='{{.Id}}'`
  Replace with `<image>:<tag>@sha256:<digest>`.

### HIGH — curl|sh without hash check

- `<file>:<line>` — `<matching line>`
  Add observed-SHA logging and strict-mode opt-in per ci-action-pinning rule §
  "Standalone tools pinned by version + checksum".

### MEDIUM — curl|sh with hash check (acceptable, audit annually)

- `<file>:<line>` — `<matching line>`

### MEDIUM — No pin manifest

- No `ci/digests.txt` (or equivalent) found. Create one before applying any pinning fixes
  — the manifest is the source of truth for diff review of future pin bumps.

### INFO — Local reusable workflows (transitive check)

- `<file>:<line>` — `<matching line>`
  Recursive check result: <clean | findings nested below>

### INFO — PR jobs guarded against fork access

- `<file>:<line>` — guard present: `<the if: expression>`

## Clean Checks

- All workflow files have at least one signed-tag verification step (or none required).
- No unpinned references found in `<file>` family.
- ...

## Remediation Plan

Suggested order:

1. Resolve and apply digest pins for CRITICAL findings first (largest blast radius).
2. Establish or update `ci/digests.txt` to reflect the resolved pins.
3. Move PR-secret-exposure findings out of `pull_request`-triggered workflows.
4. Add observed-SHA logging to all `curl|sh` installers (HIGH → MEDIUM).
5. Re-run this audit. Iterate until clean.

## Follow-up Issues

If findings exceed a one-PR fix scope, file follow-ups for each finding category:

- `ci-pin-actions` — bulk-pin all `uses:` references
- `ci-pin-containers` — bulk-pin all container images
- `ci-pr-secret-isolation` — restructure PR-triggered workflows that reference secrets
- `ci-installer-hardening` — add content-hash checks to all `curl|sh` installers

## References

- [`ci-action-pinning` rule](../../rules/ci-action-pinning.md) — the enforcement gate
- AIWG's own [`ci/digests.txt`](https://git.integrolabs.net/roctinam/aiwg/src/branch/main/ci/digests.txt) — pin-manifest reference
- [`npm-supply-chain-audit` skill](../npm-supply-chain-audit/SKILL.md) — npm-ecosystem complement
```

## Incident-response trigger

If the audit surfaces a `pull_request`-triggered job with `secrets.*`
references that has been merged to the default branch within the past
90 days, treat it as an incident-response candidate:

1. Check the workflow run history for that file via `gh run list --workflow=<file>` (GitHub) or `mcp__git-gitea__actions_run_read` (Gitea)
2. Inventory any external contributor PRs that triggered the workflow during the exposure window
3. Rotate any secrets the workflow could have read

The other audit findings are configuration-hardening, not active
incidents — fix and move on.

## Completion criteria

The skill is "done" when:

- All seven audit checks have produced findings (or a `Clean Check` note)
- A markdown report is written to `.aiwg/security/working/ci-workflow-audit.md`
- The report's Remediation Plan section lists every finding in suggested fix order
- If any CRITICAL finding is present, the user has been explicitly notified before the skill exits

## See Also

- [`npm-supply-chain-audit` skill](../npm-supply-chain-audit/SKILL.md)
- [`supply-chain-hardening-quickstart` skill](../supply-chain-hardening-quickstart/SKILL.md)
- [`ci-action-pinning` rule](../../rules/ci-action-pinning.md)
- [`supply-chain-trust` skill](../supply-chain-trust/SKILL.md) — broader trust-chain design

## References

- AIWG supply-chain hardening post-mortem 2026-05 (Shai-Hulud campaign response)
- GitHub Actions documentation: pinning third-party actions to commit SHAs
- npm trusted publishers documentation
- Sigstore / cosign documentation
