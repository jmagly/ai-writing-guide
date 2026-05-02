# Design: Doctor extensions, activity-log entries, and `aiwg promote`

## Status

**PROPOSED** — required by [#1037](../../../../issues/1037); resolves [#1049](../../../../issues/1049)

## Date

2026-05-02

## Context

Three operational concerns share one design doc because they're all the user-visible surface for the project-local artifact lifecycle:

- **`aiwg doctor`** needs to surface project-local health (counts, validation errors, shadows, drift) so operators can see what's deployed and what's wrong.
- **`.aiwg/activity.log`** entries make the lifecycle auditable post-hoc; the [`activity-log` rule](../../agentic/code/addons/aiwg-utils/rules/activity-log.md) defines the format, this doc enumerates the events.
- **`aiwg promote`** operationalizes the [identical-form portability invariant](adr-identical-form-portability.md): a project-local bundle should graduate to upstream (or a private corpus) by byte-identical copy.

All three depend on the manifest schema ([#1044](design-manifest-schema.md)), the directory layout ([ADR #1039](adr-aiwg-directory-layout.md)), and the override/shadow policy ([ADR #1041](adr-override-shadow-policy.md)) — which have all landed.

## Part 1 — `aiwg doctor` extensions

`aiwg doctor` already exists as a general health check. Project-local artifacts get a new section in its output, gated behind discovery (skipped if no `.aiwg/{extensions,addons,frameworks,plugins}/` dirs are present).

### New section: "Project-local artifacts"

```text
── Project-local artifacts ────────────────────────────────────
  Discovered: 4 bundles
    extensions: 2  (my-ext, helper-ext)
    addons:     1  (my-addon)
    frameworks: 0
    plugins:    1  (my-plugin)

  Validation: ✓ all manifests valid

  Shadows (3):
    ⚠ my-ext :: rule/optional-rule    overrides bundled aiwg-utils
    ⚠ my-addon :: skill/some-skill    overrides git-installed pkg/some-skill
    !! my-ext :: rule/human-authorization  overrides safety-critical (acknowledged)

  Drift (1):
    ✗ my-ext :: rule/my-rule (deployed file at .claude/rules/my-rule.md
       differs from source — operator edit or external write)

  Denylist violations (0)

  Provider deployment matrix:
    bundle      claude  cursor  codex
    my-ext      ✓ 3     ✓ 3     -
    my-addon    ✓ 2     -       ✓ 2
    my-plugin   ✓ 1     -       -
```

### Section reporting rules

| Subsection | Source | Failure behavior |
|------------|--------|------------------|
| Discovered counts | `discoverProjectLocalBundles()` | List per-type counts; print "(none)" if zero across all types. |
| Validation | discovery `errors[]` | Print up to 10 inline; "+N more" summary if longer; `aiwg list --project-local` for full. |
| Shadows | `resolveShadows(bundles, upstream)` | `⚠` for `deploy-with-warning`, `!!` for `deploy-acknowledged`. Acknowledged still listed (not silent). |
| Denylist violations | `resolveShadows().resolutions.filter(r => r.verdict === 'refuse-unsafe' \|\| r.verdict === 'refuse-phantom')` | `✗` per row. |
| Drift | hash deployed file vs `installed[].deployedTo[provider].artifactHashes[path]` (see [#1048 design](design-aiwg-remove-revert.md)) | `✗` per drifted artifact. Skipped with a one-line note when `artifactHashes` not yet recorded for older deploys. |
| Provider matrix | `installed[<bundle>].deployedTo` keys | `✓ <count>` per cell; `-` for not deployed. |

`doctor` exits **0** when there are no validation errors, no denylist violations, and no drift. Shadows alone do not fail doctor (they're informational by design).

### Doctor flags

- `aiwg doctor --project-local` — show only the project-local section
- `aiwg doctor --quiet` — suppress informational subsections (counts, shadows); show only failures

## Part 2 — Activity log entries

`activity-log` rule defines the format `## [YYYY-MM-DD HH:MM] <op> | <summary>`. This design enumerates every project-local event and its summary shape.

| Event | Trigger | Format |
|-------|---------|--------|
| `discover` | First time `aiwg list --project-local` (or any cmd that runs discovery) sees a new manifest | `discover \| <name>:<type> \| <path>` |
| `deploy` | Successful project-local deploy to one provider | `deploy \| <name>:<type> \| <provider>: agents=N commands=N skills=N rules=N` |
| `deploy-failed` | Deploy step failed (non-zero exit from deploy-agents.mjs) | `deploy-failed \| <name>:<type> \| <provider>: exit <N>` |
| `conflict` | Shadow resolved (any non-`deploy` verdict) | `conflict \| <name>:<type> \| <verdict>: <artifact-id>` |
| `shadow-acknowledged` | `deploy-acknowledged` verdict produced (safety-critical with `overrides:`) | `shadow-acknowledged \| <name>:<type> \| <artifact-id> overrides upstream <upstream-source>` |
| `shadow-refused` | `refuse-unsafe` or `refuse-phantom` | `shadow-refused \| <name>:<type> \| <verdict>: <artifact-id>` |
| `remove` | `aiwg remove` aggregate per invocation | `remove \| <name>:<type> \| <provider>=<reverted> [..., <provider>=<reverted-mutated-skipped>]` |
| `remove-mutated` | Per-artifact case-2 mutation skip | `remove-mutated \| <name>:<type> \| <provider>:<rel-path> skipped` |
| `remove-conflict` | Per-artifact case-4 refusal (replaced) | `remove-conflict \| <name>:<type> \| <provider>:<rel-path> owned by <other-bundle>` |
| `remove-force` | `--force` invocation summary | `remove-force \| <name>:<type> \| <provider>=<reverted> (<N> mutations overridden)` |
| `promote` | Successful `aiwg promote` | `promote \| <name>:<type> \| <destination>` |
| `promote-failed` | Failed `aiwg promote` | `promote-failed \| <name>:<type> \| <reason>` |

### Append behavior

Reuses the existing `appendActivityLog()` helper. **All entries non-blocking** — log write failure must not fail the underlying operation; emit a single stderr warning ("activity log write failed: <err>") and continue.

### Discovery noise control

`discover` is the only event that fires from a read-only operation. To prevent log spam, dedupe by `(name, type, hash-of-manifest)`: only emit when the tuple is not already in the most recent 100 lines of `activity.log` for the `discover` op.

## Part 3 — `aiwg promote` design

Operationalizes the identical-form portability invariant ([ADR #1038](adr-identical-form-portability.md)). The promote step is "copy this directory to its upstream home — verify the copy is byte-identical".

### CLI surface

```text
aiwg promote <name> --to upstream
aiwg promote <name> --to corpus <path>
aiwg promote <name> --dry-run
aiwg promote <name> --cleanup           # remove .aiwg/<type>/<name>/ after copy
aiwg promote <name> --to upstream --force  # bypass conflict refusal (see below)
```

### Resolution and destination

| `--to` value | Destination path |
|--------------|------------------|
| `upstream` (default — addon, extension, plugin) | `agentic/code/addons/<name>/` |
| `upstream` for `type: framework` | `agentic/code/frameworks/<name>/` |
| `corpus <path>` | `<path>/<name>/` (path must exist; `<name>` must not pre-exist there) |

Bundle's `type` field selects which upstream subtree. Plugins go under `agentic/code/addons/` (per ADR #1038's convergence — plugins are addon-shaped).

### Pre-flight checks (in order)

1. **Bundle exists** — `.aiwg/<type>/<name>/` discovered with valid manifest. Exit nonzero if not.
2. **Manifest has no `safety-critical: true` shadow without explicit operator confirmation.** Print summary; require `--force` if the bundle would shadow upstream safety-critical artifacts at its new home.
3. **No `@-references` to project-local artifacts.** Promotion to upstream means the bundle leaves the project-local namespace; `@.aiwg/...` references would dangle. Refuse without `--force`. (Per [`design-reference-resolution.md`](design-reference-resolution.md).)
4. **Destination does not already exist** — promotion is a create, not an overwrite. Refuse if dir already exists; require explicit `aiwg remove` from upstream first.
5. **Identical-form invariant** — bundle directory layout matches the upstream conventions (manifest at root, expected subdirs). The manifest schema ([#1044](design-manifest-schema.md)) already enforces this; promote re-validates as a safety net.

### Copy step

`cp -R` semantics with explicit hash verification:

1. Snapshot SHA-256 of every file in the source.
2. Copy directory tree to destination.
3. Re-hash every file in the destination.
4. If any hash differs → roll back (delete destination), exit nonzero.

### Post-copy

- **Registry update**: `aiwg.config.installed[<name>].source` flips from `project-local` to `bundled` (for `--to upstream`) or `corpus` (for `--to corpus`). The next `aiwg refresh` will redeploy from the new source.
- **`--cleanup`**: delete `.aiwg/<type>/<name>/` source. Only after the copy + hash verification has succeeded; never delete on roll-back path.
- **Activity log**: emit one `promote` line.

### Dry-run behavior

`aiwg promote <name> --dry-run` prints:

```text
[dry-run] Would copy:
  .aiwg/extensions/my-ext/  →  agentic/code/addons/my-ext/  (12 files, 4.2 KB)

  Pre-flight: ✓ manifest valid  ✓ no project-local @-refs  ✓ destination clean
  Hash verification: skipped (dry-run)
  Registry update: source: project-local → bundled
  Cleanup: skipped (--cleanup not set)
```

No filesystem writes, no log entry.

## Acceptance mapping

| Issue AC | Section |
|----------|---------|
| Doctor section additions specified | Part 1 |
| Activity log schema entries enumerated | Part 2 (12 events) |
| `aiwg promote` CLI surface fully specified | Part 3 |
| Examples for each operation | Inline in each part |
| Design doc at this path | This file |

## Test matrix mapping

| Strategy doc row | Covered by |
|------------------|------------|
| DC-1 (doctor surfaces shadows, drift, validation errors) | Part 1 — #1037 will add tests when implementing |
| (new) PR-1..PR-5 (promote pre-flight, copy, dry-run, cleanup, identical-form roll-back) | Part 3 — #1037 will add to test-strategy-project-local.md |

## Out of scope

- Marketplace publishing (separate path via existing plugin tooling)
- Promoting *between* project-local types (extension → addon) — operator can `mv` then `aiwg refresh`
- Reverse promotion (`demote` from upstream back into `.aiwg/`) — not requested

## Open questions

None blocking. Future revision could add a `--target` flag that names a specific upstream framework subdirectory rather than always `agentic/code/addons/`.
