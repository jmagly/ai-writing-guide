---
namespace: aiwg
name: release-publication-verify
platforms: [all]
description: Post-tag release publication verifier — given a tag, verify the published release surfaces (Gitea/GitHub release assets, SHA256SUMS and native package checksums, GHCR container images, installer dry-run from the real release URL) and emit issue-comment-ready evidence, distinguishing missing proof from failed proof, before closing release-completion issues
triggers:
  - "verify the release publication"
  - "post-tag release asset verifier"
  - "check GHCR images and release assets for a tag"
  - "prove the release published before closing issues"
  - "release publication proof for issue close"
  - "verify release assets checksums installer GHCR packages"
commandHint:
  argumentHint: '<tag> [--repo <owner/name>] [--mirror <owner/name>] [--config <path>] [--json]'
  allowedTools: 'Read, Write, Edit, Bash, Glob, Grep, mcp__git-gitea__*'
  model: opus
  category: sdlc-orchestration
  orchestration: false
---

# Release Publication Verifier (post-tag)

You verify that a release **actually published** — turning a tag into concrete,
auditable proof across every release surface — so release-completion issues are
closed with evidence, not assumption. This runs **after** `flow-release` cuts and
pushes the tag (the `release` gate) and **before** the `post-release` close-outs.

This is native release-engineering verification (Rust crates, `.deb`/`.rpm`,
container images, GHCR, release-asset checksums, installer URLs) — not plugin
packaging. For plugin archives use `package-all-plugins`; for the release
sequence itself use `flow-release`.

## When to use

- After a tag is pushed and the release workflows (`gitea-release.yml`,
  `npm-publish.yml`, `github-mirror.yml`, container build) have run.
- Before closing release-completion issues — paste the emitted evidence summary
  into the close comment.
- As the verification step `flow-release` points to after its `release` gate.

## Inputs

- **tag** (required) — e.g. `v2026.6.2`. The verification context.
- **--repo `<owner/name>`** — primary tracker repo (default: `remotes.issue_tracker`
  resolved from `.aiwg/aiwg.config`).
- **--mirror `<owner/name>`** — public mirror (default: `remotes.secondary[]` with
  `purpose: public-mirror`, or `project.mirror_url` from `.aiwg/release.config`).
- **--config `<path>`** — release config (default `.aiwg/release.config`).
- **--json** — emit the evidence as JSON instead of the markdown summary.

## Repo-local configuration

Read the optional `publication_verify` block from `.aiwg/release.config`. It
declares what "published" means for THIS project — required asset globs, the
checksum manifest, the GHCR image matrix, the installer URL, and platform smoke
jobs. When the block is absent, run the universal checks (release exists +
assets present + checksums) and record everything else as **MISSING (not
configured)** rather than failing.

```yaml
# .aiwg/release.config  (optional block)
publication_verify:
  release_assets:                      # globs that MUST be attached to the release
    - "aiwg-{version}.tgz"
    - "*.deb"
    - "*.rpm"
    - "install.sh"
  checksums:
    manifest: "SHA256SUMS"             # manifest asset name
    must_cover: ["*.tgz", "*.deb", "*.rpm", "install.sh"]  # globs the manifest must list
  ghcr_images:                         # container images that MUST exist + run
    - image: "ghcr.io/{owner}/aiwg"
      tags: ["{version}", "latest"]
      smoke: "--version"               # documented command that must succeed
    - image: "ghcr.io/{owner}/aiwg-agent-client"
      tags: ["{version}"]
      smoke: "--version"
  installer:
    url: "https://github.com/{mirror}/releases/download/{tag}/install.sh"
    dry_run: "sh install.sh --dry-run"  # must succeed against the real release URL
  platform_jobs:                       # platform-specific evidence (e.g. host-direct smoke)
    - name: "mutsu-apple-silicon-smoke"
      evidence: "ci-run or log path proving the platform job ran green"
```

`{version}` is the tag without the `v`; `{tag}` is the full tag; `{owner}` /
`{mirror}` come from the resolved repos.

## Verification surfaces

Run each surface that applies. Use `mcp__git-gitea__*` for Gitea, `gh` for
GitHub, `curl`/`oras`/`docker`/`skopeo` for GHCR, `sha256sum -c` for checksums.
Never print tokens — load from env/file per the `token-security` rule.

1. **Gitea release exists + assets** — the release for `tag` exists and every
   `release_assets` glob matches at least one attached asset.
2. **GitHub mirror release + assets** — same against the mirror (skip with a
   recorded MISSING if no mirror is configured, or if the tag is a pre-release
   that intentionally skips the mirror per `flow-release` policy).
3. **SHA256SUMS present + covers** — the `checksums.manifest` asset exists and
   lists an entry for every `must_cover` glob. Download the manifest and the
   covered assets; `sha256sum -c` must pass for each downloaded file.
4. **Native package checksums** — for each `.deb`/`.rpm`/installer asset, verify
   its recorded checksum matches the downloaded file (FAILED on mismatch).
5. **GHCR images exist + smoke** — for each `ghcr_images` entry and tag, confirm
   the image manifest exists (`docker manifest inspect` / `skopeo inspect` /
   `oras manifest fetch`), then run the documented `smoke` command and assert
   exit 0.
6. **Installer dry-run from the real URL** — fetch `installer.url` for the tag
   and run `installer.dry_run`; assert exit 0. This proves the published
   installer is reachable and parses, not just that a file exists.
7. **Platform jobs** — for each `platform_jobs` entry, confirm the referenced CI
   run / log evidence shows the platform-specific job ran green (e.g. mutsu
   Apple-Silicon host-direct smoke).

## Missing vs failed (record them distinctly)

Every check resolves to exactly one verdict:

| Verdict | Meaning | Example |
|---------|---------|---------|
| **PASS** | Proof found and correct | `aiwg-2026.6.2.tgz` attached; checksum matches |
| **FAIL** | Proof found but wrong | SHA256SUMS lists the tarball but the hash mismatches |
| **MISSING** | Proof not found | No `.deb` asset attached; or GHCR image tag absent |
| **N/A (not configured)** | The project didn't declare this surface | No `ghcr_images` block → skip, don't fail |

`FAIL` and `MISSING` are different problems: `FAIL` means the release is corrupt
and must be re-cut; `MISSING` means a surface didn't publish (workflow didn't run,
asset not uploaded) — investigate the pipeline. Never collapse the two into a
single "not green" bucket; the close comment must show which is which.

## Output schema

Default output is an **issue-comment-ready** markdown block. With `--json`, emit
the same data as `{ tag, repo, mirror, checks: [{ surface, target, verdict,
detail }], summary: { pass, fail, missing, na }, publishable: <bool> }`.
`publishable` is true only when there are zero `FAIL` and zero unexpected
`MISSING` (configured-but-absent) checks.

Markdown template to paste into the release-completion issue:

```markdown
## Release publication verification — {tag}

| Surface | Target | Verdict | Detail |
|---------|--------|---------|--------|
| Gitea release | {repo} | PASS | release present, 4/4 asset globs matched |
| GitHub mirror | {mirror} | PASS | release present, 4/4 asset globs matched |
| SHA256SUMS | SHA256SUMS | PASS | covers tgz/deb/rpm/install.sh; `sha256sum -c` OK |
| Native pkg checksums | *.deb, *.rpm | PASS | hashes match |
| GHCR images | aiwg:{version},latest | PASS | manifests exist; `--version` exits 0 |
| Installer dry-run | install.sh@{tag} | PASS | `--dry-run` exits 0 from release URL |
| Platform job | mutsu-apple-silicon-smoke | MISSING | no CI evidence found — investigate |

**Summary:** 6 PASS · 0 FAIL · 1 MISSING · 0 N/A → **not fully published**
(missing: mutsu Apple-Silicon smoke evidence).
```

## Acceptance criteria

- [ ] Accepts a `tag` and repo target (and optional mirror/config).
- [ ] Verifies Gitea + GitHub release assets, the checksum manifest, native
      package checksums, GHCR image existence + smoke, and installer dry-run
      when configured.
- [ ] Records **MISSING** distinctly from **FAIL** (and **N/A** for
      not-configured surfaces).
- [ ] Emits a concise issue-comment-ready evidence summary (and `--json`).
- [ ] Discoverable via `aiwg discover "post tag release asset verifier GHCR packages installer"`.

## Related

- `flow-release` — the release sequence; points here after its `release` gate,
  before `post-release` close-outs.
- Schema: `agentic/code/frameworks/sdlc-complete/schemas/flows/release-config.yaml`
  (`publication_verify` block).
- Rules: `token-security`, `ci-green-before-done`, `delivery-policy`,
  `citation-policy` (evidence must be real, never fabricated).
- Config: `.aiwg/release.config` per project.
