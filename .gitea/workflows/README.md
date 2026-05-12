# `.gitea/workflows/` — CI Pinning Policy

All container images and external actions referenced in this directory are pinned by immutable identifier — `@sha256:<digest>` for container images, `@<40-char-commit-SHA>` for GitHub Actions. **No mutable tags (`@v4`, `:latest`, `:20`) anywhere.** A trailing inline comment on each pinned line shows the resolved version (`# v4.3.1`, `# node 20.20.2`) so workflow diffs remain readable.

The pin manifest is at [`ci/digests.txt`](../../ci/digests.txt). Every active pin has a row there with the resolved version, the date the pin was set, and the rationale for the most recent update. Treat any digest/SHA change in a workflow file without a corresponding row update in that manifest as a red flag.

## Why pin

Mutable tags are a silent supply-chain attack surface. A compromised action maintainer or a tag-repoint by an upstream registry can replace the runtime code without any commit landing in this repo. SHA/digest pinning makes upstream changes a reviewable diff in our own history.

Source rules: [`.claude/rules/dev-idempotent-builds.md`](../../.claude/rules/dev-idempotent-builds.md) (rule 2 forbids `:latest`, rule 4 requires lockfiles). Originating epic: [#1278](https://git.integrolabs.net/roctinam/aiwg/issues/1278) (Mini Shai-Hulud response, Wave 2 audit findings F3 + F5).

## Updating a pin

The full procedure lives in [`ci/digests.txt`](../../ci/digests.txt) under "Update process." Short version:

1. File an issue describing why the bump is wanted.
2. Resolve the new pin (`docker pull` for containers, `git ls-remote` for actions).
3. Update all workflow occurrences in one commit. Verify with `grep -rn <pinned-thing> .gitea/workflows/`.
4. Append a row to `ci/digests.txt`.
5. Verify CI is green on the bump commit before declaring done.

Pins are not bumped on a fixed schedule. A bump is triggered by an advisory against the current pin, a needed feature in a newer release, or an explicit audit decision.

## Dependabot / equivalent automation

Gitea Actions does not currently have first-party Dependabot. Automated PR-filing for pin bumps is a follow-on; until that lands, bumps are operator-initiated per the manual process above.
