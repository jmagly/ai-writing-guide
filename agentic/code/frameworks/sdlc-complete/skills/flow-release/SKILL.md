---
namespace: aiwg
name: flow-release
platforms: [all]
description: Config-driven release orchestration — reads .aiwg/release.config and walks the project's declared gates (local build, CI green, doc-sync, changelog/announcement, README, release entry, post-release housekeeping)
triggers:
  - "help with CI builds or deployment"
  - "help me make the build or deployment path safer"
  - "start with pipeline safety or release readiness"
  - "pipeline safety ci"
  - "release flow"
  - "flow release"
  - "flow-release"
  - "run the release flow"
  - "run release flow"
commandHint:
  argumentHint: '<version> [--channel <stable|rc|beta|alpha|nightly>] [--dry-run] [--skip-uat] [--no-mirror] [--config <path>] [--guidance "text"]'
  allowedTools: 'Task, Read, Write, Edit, Bash, Glob, Grep, mcp__git-gitea__*'
  model: opus
  category: sdlc-orchestration
  orchestration: true
---

# Release Orchestration Flow (config-driven)

> **Declarative Flow source of truth (#1539):** the release gate sequence is
> defined as a YAML Flow at
> [`agentic/code/frameworks/sdlc-complete/flows/flow-release.playbook.yaml`](../../flows/flow-release.playbook.yaml)
> (with release capabilities under `flows/capabilities/`). This skill is the
> human-readable **wrapper** over that Flow — it stays for discoverability and
> operator guidance, and is a candidate for retirement once discovery surfaces
> YAML Flows directly (#1540). Per-gate config still lives in
> `.aiwg/release.config`; the Flow encodes the gate sequence and dependencies.

**You are the Core Orchestrator** for the project's release sequence.

## Your role

You walk the gates declared in `.aiwg/release.config`, in order, enforcing `hard_stop` semantics. You do not hard-code which gates exist or what they do — the config does. This is what makes the skill portable across projects with different release policies (a CalVer + npm project like AIWG vs. a SemVer + container-only project will share this skill body but differ entirely in their config).

When the user requests a release:

1. **Read `.aiwg/release.config`** (or the path passed via `--config`). If absent, scaffold a starter copy from the schema at `agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml` and ask the operator to review before continuing.
2. **Resolve the target channel** from `--channel` (default: `stable`).
3. **Validate the version** against `version_policy.format` and the `versioning` rule (CalVer no-leading-zeros, semver, etc.).
4. **Walk the `gates` array in order.** For each gate:
   - Skip if `required_for_channels` is present and the target channel isn't in it.
   - Execute the gate's body (steps, invoke_skill, artifacts, review_diff, actions).
   - On failure: if `hard_stop: true`, **halt and report**. If false, log a warning and continue.
5. **Report** with the release tag URL, CI run URL, and tracker actions taken.

## Natural language triggers

- "release v2026.5.2"
- "release flow"
- "flow release"
- "flow-release"
- "run the release flow"
- "cut a release"
- "promote to stable"
- "ship it"
- "tag a nightly"

## Config-driven gate semantics

The config schema (`release-config.yaml`) defines five gate shapes. Each gate has exactly one shape:

### Shape 1: `steps`

Sequential shell commands. Each step has an `id`, a `run` template (supports `{version}`, `{tag}`, `{channel}` placeholders), and an `expect_exit` (default 0).

```yaml
- name: local-build-test
  hard_stop: true
  steps:
    - id: typecheck
      run: npx tsc --noEmit
    - id: unit-tests
      run: npm test
      tolerate_pre_existing_flakes: [test/integration/cli-perf.test.ts]
```

Execution: run each step in order. Capture stdout/stderr. Compare exit code to `expect_exit`. If `tolerate_pre_existing_flakes` is set, treat failures in those test files as warnings (not gate failures) — useful for known-flaky perf tests.

Steps may carry:
- `required_for_channels` (skip when channel not listed)
- `skip_when_flag` (skip when the named CLI flag is present)
- `depends_on_channel` (per-channel variant of the `run` command)

### Shape 2: `invoke_skill`

Dispatch another AIWG skill via the Task tool. Pass `args` as input.

```yaml
- name: doc-sync
  hard_stop: true
  invoke_skill: doc-sync
  args:
    direction: code-to-docs
    guidance: |
      <prose explaining the doc-sync intent>
    dry_run_first: true
```

Execution: spawn a sub-agent invoking the named skill with `args`. Wait for completion. On failure, apply the gate's `hard_stop` policy.

### Shape 3: `tracker` (CI poll)

Poll an issue/CI tracker until the workflows referenced complete.

```yaml
- name: ci-green
  hard_stop: true
  tracker: gitea
  owner: roctinam
  repo: aiwg
  timeout_seconds: 600
  poll_interval_seconds: 30
  required_workflows: [ci.yml, validate.yml]
```

Execution: list recent action runs for the release commit. For each `required_workflows` entry, wait for `status: completed` and assert `conclusion: success`. Fail the gate on timeout or any non-success conclusion.

For Gitea, use `mcp__git-gitea__actions_run_read` if available. For GitHub, use `gh run list/view`.

### Shape 4: `artifacts`

Assert release-time files exist (and optionally contain a section).

```yaml
- name: changelog-and-announcement
  hard_stop: true
  required_for_channels: [stable]
  artifacts:
    - path: CHANGELOG.md
      section_pattern: '## [{version}]'
    - path: 'docs/releases/v{version}-announcement.md'
      must_exist: true
```

Execution: for each artifact, check `must_exist` (default true) and, if `section_pattern` is provided, grep the file for the pattern (with `{version}` interpolated).

### Shape 5: `review_diff`

Surface a diff and prompt the operator.

```yaml
- name: readme-freshness
  hard_stop: false
  review_diff:
    path: README.md
    since_tag: latest-stable
    prompt: 'Has the README been reviewed for changes shipping in this release?'
```

Execution: run `git diff <since_tag>..HEAD -- <path>` and present to the operator. Wait for explicit acknowledgment before proceeding. With `hard_stop: false`, a "no" response logs a warning and continues; with `hard_stop: true`, it halts.

### Shape 6: `actions` (post-release)

Declarative actions for post-release housekeeping.

```yaml
- name: post-release
  hard_stop: false
  actions:
    - close_imported_issues_with_thanks: true
    - update_release_entry: gitea
    - update_release_entry: github
      skip_when_flag: '--no-mirror'
```

Each action is interpreted by the skill:

- `close_imported_issues_with_thanks: true` — find issues with the `imported` label closed by commits in this release, post a thank-you comment on the source tracker, then close on both sides. Mirrors the May-2026 jmagly→roctinam sweep pattern.
- `update_release_entry: <tracker>` — create or update the release entry (Gitea/GitHub) with the announcement body.

> **Verify publication before closing release-completion issues.** After the
> `release` gate pushes the tag and the release workflows run, invoke the
> `release-publication-verify` skill with the tag *before* the `post-release`
> close-outs. It turns the tag into concrete proof — Gitea/GitHub release assets,
> `SHA256SUMS` + native package checksums, GHCR images, and installer dry-run —
> and emits an issue-comment-ready evidence summary distinguishing MISSING from
> FAILED proof. Do not close a release-completion issue on assumption; paste the
> verifier's evidence into the close comment. Configure what "published" means
> via the optional `publication_verify` block in `.aiwg/release.config`.

## Policy enforcement

The config's `policy` block applies at every gate:

- `no_ai_attribution`: scan commit message / tag message / announcement body for AI-tool branding. Fail if found.
- `ci_green_before_done`: enforced via the CI gate; never finalize a release on a red CI run.
- `preserve_pre_release_announcements`: false by default — pre-release tags do NOT get announcements (per CLAUDE.md release-channels guidance).
- `thank_external_reporters`: enforced in the `post-release` action above.

## Failure handling

- **Pre-tag failures**: revert any version-bump commits, restart after fixing the issue.
- **Post-tag failures**: never delete pushed tags. Increment patch and re-run the flow.
- **Gate failures with `hard_stop: true`**: halt immediately, surface the failure log, do not advance.
- **Gate failures with `hard_stop: false`**: log a warning, continue.
- **Supply-chain gate (signed-tag verify) failure**: this is the recovery exception to "never delete pushed tags." If `tools/ci/verify-signed-tag.sh` rejects the tag (wrong signing key, expired key, missing-from-maintainers.asc), no artifacts are emitted by `npm-publish.yml` / `gitea-release.yml` / `github-mirror.yml` — the bad tag is an empty shell. Recovery: `git tag -d <tag>`, push delete to both remotes (`git push origin :refs/tags/<tag>` and `git push github :refs/tags/<tag>`), then re-cut via `tools/release/cut-tag.sh <version>` which forces the release key. Document the incident in `docs/contributing/versioning.md` for the next release.

Apply the `anti-laziness` recovery protocol (PAUSE→DIAGNOSE→ADAPT→RETRY→ESCALATE) when a gate fails — do not silently bypass with destructive shortcuts like skipping tests or stripping rules.

## Tag-cutting must use the wrapper

**`git tag -a` and `git tag -s` are NOT to be used directly by this skill.** The maintainer's global git config typically has `tag.gpgsign=true` and `user.signingkey=<personal-commit-signing-key>`, which causes plain `git tag` invocations to sign with the **wrong key** — the personal key, not the release key. The supply-chain gate will reject the tag and no artifacts will ship.

Always use `tools/release/cut-tag.sh <version>` for the tag step. The wrapper:

1. Runs 10 pre-tag sanity checks (CalVer shape, package.json + marketplace.json lockstep, CHANGELOG entry, announcement file present, release-signing key present locally AND published in `.gitea/keys/maintainers.asc`)
2. Signs with `-u <RELEASE_KEY_FINGERPRINT>` (defaults to the AIWG release key; override via `AIWG_RELEASE_KEY_FINGERPRINT` env var for forks)
3. Verifies the local signature via `git tag -v` before declaring success
4. Does NOT push automatically — push is left to the operator so a final sanity step can run

This is the canonical path. Any release config that templates a raw `git tag -s` is incorrect and must be migrated to call the wrapper.

## Defaults when no config exists

If `.aiwg/release.config` is missing, scaffold one from the schema and ask the operator to review before continuing. The AIWG repo's own config is the reference implementation; new projects can copy it as a starting point.

## Owner

Canonical owner: **Deployment Manager** (`agentic/code/frameworks/sdlc-complete/agents/deployment-manager.md`).

May delegate to:
- **Reliability Engineer** — SLO validation in pre-release gates
- **Security Architect** — for security-sensitive releases
- **Technical Writer** — for the announcement body

## AIWG-specific reference

This repository's `.aiwg/release.config` declares the gates AIWG uses today:

1. **local-build-test** (typecheck, unit tests, build, UAT for stable)
2. **ci-green** (Gitea workflows on the release commit)
3. **doc-sync** (code-to-docs sync with agentic/ + docs/ scope)
4. **changelog-and-announcement** (CHANGELOG.md + docs/releases/ for stable)
5. **readme-freshness** (diff prompt for stable)
6. **release** (tag, push, mirror, npm dist-tag)
7. **post-release** (tracker close-outs + reporter thanks)

That config IS the AIWG release checklist — what was previously prose in CLAUDE.md is now an executable spec.

## Related

- Schema: `agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml`
- Config: `.aiwg/release.config` (per project)
- Rules: `versioning`, `no-attribution`, `ci-green-before-done`, `delivery-policy`, `anti-laziness`
- Skills: `doc-sync` (called by gate 3), `release-publication-verify` (post-tag proof before closing release issues), `aiwg-pr` (when delivery.mode is pr-required for release prep), `aiwg-issue` (filing release-blocker issues)
- Doc: CLAUDE.md "Release Documentation Requirements" + "Release Checklist"

## Acceptance criteria

- [ ] `.aiwg/release.config` validated against the schema
- [ ] Every gate in `gates` either executed or skipped per `required_for_channels`
- [ ] All `hard_stop: true` gates green before tag push
- [ ] CI green on the tag commit
- [ ] No AI attribution in commits, tags, or announcement
- [ ] Original reporters thanked (if release closes imported issues)
- [ ] Release entry created on Gitea (and GitHub mirror for stable)
- [ ] npm dist-tag updated correctly per channel
