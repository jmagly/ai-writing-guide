---
namespace: aiwg
name: flow-release
platforms: [all]
description: Orchestrate full release sequence — pre-release validation, version bump, changelog, announcement, UAT gate, tag, push, CI green verification, optional GitHub mirror
commandHint:
  argumentHint: '<version> [--channel <stable|rc|beta|alpha|nightly>] [--dry-run] [--skip-uat] [--no-mirror] [--guidance "text"]'
  allowedTools: 'Task, Read, Write, Edit, Bash, Glob, Grep, mcp__git-gitea__*'
  model: opus
  category: sdlc-orchestration
  orchestration: true
---

# Release Orchestration Flow

**You are the Core Orchestrator** for AIWG release workflows.

## Your Role

You orchestrate the release sequence, delegating specific tasks to the **Deployment Manager** agent (canonical owner per `agentic/code/frameworks/sdlc-complete/agents/deployment-manager.md`) and validation agents. You do NOT execute the release commands yourself when a focused agent is more appropriate.

When the user requests this flow:

1. Interpret the request, confirm the target version and channel
2. Read this skill as the orchestration guide
3. Delegate gate checks via the Task tool
4. Synthesize results and ensure each gate is satisfied
5. Stop at any failed gate and report — never push past a red gate
6. Report completion with the release tag URL + CI run URL

## Release Overview

**Purpose**: Safe, repeatable release sequence with documented gates and audit trail.

**Key activities**:
- Version validation (CalVer, no leading zeros — per `versioning` rule)
- CHANGELOG + announcement docs (per CLAUDE.md release documentation requirements)
- Test + UAT gates (per `UAT Before Release` HIGH rule)
- Tag creation, push to origin, optional GitHub mirror push
- CI green verification (per `ci-green-before-done` rule)
- Gitea/GitHub release creation
- npm dist-tag promotion (stable → `latest`, pre-release → `next` or `nightly`)

**Expected duration**: 15–45 minutes wall-clock (mostly gate waits, especially CI ~2 min)

## Natural Language Triggers

- "release v2026.5.2"
- "cut a release"
- "promote to stable"
- "release candidate for the next version"
- "tag a nightly"
- "ship it"

## Pre-Flight Validation (gate 1)

Before any version-bumping action, confirm:

1. **Repository state**
   - Working tree clean (`git status --porcelain` is empty)
   - On `default_branch` (typically `main`) per `delivery-policy`
   - Up to date with `origin/main` (no unpulled commits)

2. **Version format** — per the `versioning` CRITICAL rule
   - CalVer: `YYYY.M.PATCH` (e.g., `2026.5.2`)
   - No leading zeros: `2026.1.5` not `2026.01.5`
   - Pre-release tags use canonical suffixes: `-nightly.YYYYMMDD`, `-alpha.N`, `-beta.N`, `-rc.N`
   - Tag prefix is `v`: `v2026.5.2`

3. **CI status on the release commit**
   - Last push to `main` produced a green CI run
   - No outstanding `release-blocker` labeled issues

4. **Delivery policy**
   - Read `.aiwg/aiwg.config` `delivery.mode`. Release operations always commit
     directly to `main` regardless of `mode` (the version-bump commit + the
     announcement + tag push are by convention treated as a release sequence).
     If `mode` is not `direct`, surface this and confirm with the operator.

**Hard stop on any failure.** Do not proceed.

## Version Bump (gate 2)

If pre-release stage (alpha/beta/RC/nightly), skip CHANGELOG entry creation — pre-release tags are internal pipeline checkpoints per CLAUDE.md's Release Channels section. Only update `package.json`.

If stable release:

1. **Update `package.json`** — bump `version` to the target. No leading zeros.
2. **Update `CHANGELOG.md`** — add new section with:
   - Highlights table (What changed | Why you care)
   - Detailed Added/Changed/Fixed sections
   - Link to previous version
3. **Create `docs/releases/v{version}-announcement.md`** — full feature documentation, code examples, migration notes
4. **Commit** with conventional message:

```
chore(release): bump version to v{version}

[brief summary of what's in the release]

Refs (any tracking issues)
```

## UAT Gate (gate 3)

**REQUIRED for stable releases** per the `UAT Before Release` HIGH rule:

```bash
npm run uat
```

All 9 UAT tests must pass. UAT validates the external agent loop end-to-end with a stub provider and catches runtime failures that unit tests cannot detect.

Skip only when `--skip-uat` is passed AND the operator has explicitly acknowledged the risk in the release record. Pre-release tags (alpha/beta/RC/nightly) may skip UAT but should run it when possible.

**Hard stop on UAT failure.** Fix the underlying issue and re-run UAT before tagging.

## Test Gate (gate 4)

Even for pre-release tags:

```bash
npm test
npx tsc --noEmit
```

All tests pass. Document any pre-existing flaky tests that aren't release-blockers (e.g., the cli-perf cold-start flake noted in `6500e167` history).

## Tag + Push (gate 5)

After all earlier gates pass:

```bash
git tag -a v{version} -m "v{version}"
git push origin main --tags
```

Verify the tag appears on the remote:

```bash
git ls-remote --tags origin v{version}
```

For projects mirroring to a public GitHub remote, also push to GitHub unless `--no-mirror`:

```bash
git push github main --tags
```

## CI Green Verification (gate 6)

Per `ci-green-before-done` HIGH rule, the release is not done until CI on the tag commit is green.

- Poll the Gitea Actions API for the run triggered by the tag push
- Wait for completion (AIWG CI takes ~2 minutes)
- If the run fails, surface the failure log and **stop the release**. Do not create the Gitea/GitHub release entry on a failed CI run.

## Release Entry Creation (gate 7)

After CI green:

1. **Gitea Release**: typically auto-created on tag push. Verify it exists at `https://git.integrolabs.net/{owner}/{repo}/releases/tag/v{version}`. Edit the body to include the announcement content if Gitea didn't pick it up.

2. **GitHub Release** (for mirrored projects): manual via `gh release create v{version}` with the announcement body. Per CLAUDE.md, do NOT create GitHub releases for pre-release tags — those are internal pipeline checkpoints only.

3. **npm dist-tag promotion** (for AIWG-style npm releases):
   - Stable → `latest` (automatic via `npm publish` if release pipeline is configured)
   - Pre-release → `next` (alpha/beta/rc) or `nightly`
   - Verify with `npm dist-tag ls aiwg`

## Post-Release (gate 8)

1. Update any tracker issues that referenced the release version
2. Post the release announcement (Discord, Telegram, blog, etc. per project conventions)
3. If a tester report originated the work in this release, **thank the original reporter** on the source tracker — same pattern used for the jmagly→roctinam sweep (May 2026)
4. Update `.aiwg/aiwg.config` if the release changed deployed framework versions

## Anti-Patterns to Flag

- **AI attribution in release commits or tag messages** — universal rule, never. Per `no-attribution`.
- **Skipping the UAT gate without explicit operator acknowledgment** — UAT is the only way to catch runtime mismatches that unit tests can't.
- **Pushing tags before CI on the release commit is green** — invites a permanently-broken release tag.
- **Creating a Gitea/GitHub release on a failed CI run** — release artifacts must be tied to a green build.
- **Editing CHANGELOG.md retroactively after release** — append-only history.
- **Mixing release prep with feature work** — release commits should only touch `package.json`, `CHANGELOG.md`, and announcement docs.

## Failure Recovery

If a gate fails partway through:

- **Pre-tag failures**: revert version-bump commits (`git reset --hard HEAD~N`), fix the issue, restart.
- **Post-tag failures**: never delete a pushed tag. Tag forward with a patch increment (`v{version}` → `v{version+1}`) and document the skipped tag in the announcement.
- **Failed npm publish**: do not retry blindly. npm rejects re-publishing the same version. Bump patch and re-run.

## Owner

Canonical owner: **Deployment Manager** (`agentic/code/frameworks/sdlc-complete/agents/deployment-manager.md`).

The flow may also delegate to:
- **Reliability Engineer** — for SLO validation pre-release
- **Security Architect** — when the release includes security-sensitive changes
- **Technical Writer** — for the announcement doc

## Related

- Rule: `versioning` (CalVer format, no leading zeros)
- Rule: `no-attribution` (universal across release artifacts)
- Rule: `ci-green-before-done` (no done without CI green)
- Rule: `delivery-policy` (direct mode for release commits)
- Rule: `anti-laziness` (no destructive shortcuts when a gate fails)
- Skill: `dev-release-coordinate` (extensions/dev — generic tag/build/promote pattern this skill wraps with AIWG-specific gates)
- Skill: `aiwg-pr` (for the release-prep PR workflow if `delivery.mode` is `pr-required`)
- Skill: `aiwg-issue` (for filing release blockers)
- Doc: CLAUDE.md "Release Documentation Requirements" + "Release Checklist"
- Doc: `docs/contributing/versioning.md`

## Acceptance criteria

- [ ] Version validates per CalVer rule (no leading zeros)
- [ ] CHANGELOG.md has the new section (stable only)
- [ ] `docs/releases/v{version}-announcement.md` exists (stable only)
- [ ] UAT passes (or explicitly skipped with operator acknowledgment)
- [ ] `npm test` and `npx tsc --noEmit` pass
- [ ] Tag pushed to origin and (if applicable) GitHub
- [ ] CI green on the tag commit
- [ ] Gitea release exists with the announcement body
- [ ] No AI attribution anywhere in the commit/tag/announcement
- [ ] Original reporter thanked (if release closes imported issues)
