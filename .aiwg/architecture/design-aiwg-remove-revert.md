# Design: `aiwg remove` revert semantics for project-local artifacts

## Status

**PROPOSED** — required by [#1037](../../../../issues/1037); resolves [#1048](../../../../issues/1048)

## Date

2026-05-02

## Context

`aiwg use` deploys a project-local bundle's artifacts to provider paths under `.claude/`, `.cursor/`, `.factory/`, etc. (see `deployProjectLocalBundles` in `src/cli/handlers/use.ts`). `aiwg remove <name>` must reverse that operation. The current `removeHandler` in `src/cli/handlers/subcommands.ts` delegates to `tools/plugin/plugin-uninstaller-cli.mjs`, which is plugin-aware but **not** project-local-aware.

The complication is that the deployed files at provider paths are not under our exclusive control between deploy and remove. The operator may edit them, delete them, or another `aiwg use` may have overwritten them. The remove operation has to make a deterministic, predictable choice in each case without surprising the operator with silent data loss.

### Load-bearing constraints

1. **Source preservation invariant** — `aiwg remove` MUST NEVER delete the bundle source under `.aiwg/<type>/<name>/`. The operator authored that content; only an explicit `rm -rf` (outside the AIWG CLI) removes it. `--force` does not change this.
2. **Identical-form portability** ([ADR #1038](adr-identical-form-portability.md)) — the deployed file at a provider path is byte-identical to the bundle's source artifact. We can detect mutation by hashing.
3. **Activity log** — every revert decision must produce a single-line entry per [`activity-log` rule](../../agentic/code/addons/aiwg-utils/rules/activity-log.md), including refusals.
4. **Multi-provider** — a bundle may have been deployed to several providers; revert must handle each independently.

## Decision: per-case behavior table

`aiwg remove <name>` walks each provider in `aiwg.config.installed[<name>].deployedTo`, then for each artifact the bundle contributed, applies the case below.

| # | Case | Detection | Default behavior | `--force` behavior |
|---|------|-----------|------------------|--------------------|
| 1 | Pristine deployed file | SHA-256(deployed) == SHA-256(bundle source) | Delete deployed file. Remove `installed[<name>][<provider>]` entry on success. | Same. |
| 2 | Mutated deployed file | hashes differ; file is still owned by this bundle (frontmatter id matches) | **Warn and prompt** ("local edits detected at <path> — overwrite revert? [y/N]"). Default: abort that artifact, leave file intact, **continue** with other artifacts. Exit nonzero overall but do not unwind already-reverted artifacts. | Skip prompt; revert (delete) the file. Log the overridden mutation hash to activity log. |
| 3 | Missing deployed file | `lstat` ENOENT | Silent success — already in the post-revert state. Log to activity. Remove registry entry. | Same. |
| 4 | Replaced by another bundle's artifact | hashes differ; frontmatter id does not match this bundle's artifact id, or some other bundle's `installed[].deployedTo` claims this path | **Refuse** that artifact: do not delete (we'd destroy the other bundle's content). Print which bundle now owns the path. **Continue** with other artifacts. Exit nonzero overall. | **Still refuses.** `--force` does not authorize destroying another bundle's deploy. To take ownership, the operator must `aiwg remove <other-bundle>` first. |
| 5 | Multi-provider — one provider path is read-only | EACCES / EROFS on unlink | Partial revert: revert what you can, warn about the failed providers, leave registry entries for the failed providers, remove registry entries for the successful ones. Exit nonzero. | Same — `--force` does not bypass filesystem permissions. |
| 6 | Source under `.aiwg/<type>/<name>/` deleted before remove | bundle dir absent on discovery | Revert deployed files anyway (we have hashes from `installed[]`), then remove the registry entry. Print a note that the source was already gone. **Do not** attempt to recreate the source. | Same. |
| 7 | Bundle id matches **upstream** addon, not project-local | discovery has no project-local match; upstream registry has match | Out of scope for this design — falls through to existing `removeHandler` (plugin uninstaller) path. Print a one-liner clarifying which path was taken. | Same. |

### `--force` invariants

`--force` is narrowly scoped:

- ✅ Skip case-2 mutation prompt; revert the file.
- ❌ Does not delete the source under `.aiwg/<type>/<name>/`.
- ❌ Does not destroy another bundle's deploy (case 4).
- ❌ Does not bypass OS permission errors (case 5).

The asymmetry is intentional: `--force` is for "I know about my own edits, just do it"; it is not "I authorize you to delete arbitrary content".

### Hash storage and detection

`installed[<name>][<provider>]` already stores `manifestHash` (the source manifest's SHA-256). For revert we additionally need per-artifact deployed-content hashes. **Decision**: extend the registry entry shape with `artifactHashes: Record<string, string>` recorded at deploy time, keyed by the deployed file's relative path under the provider root. This enables case-1 vs case-2 vs case-4 detection without a re-deploy step at remove time.

Schema addition (compat-additive — existing entries without `artifactHashes` fall back to "case-2 always-prompt" until next `aiwg use` re-records them):

```jsonc
{
  "installed": {
    "my-bundle": {
      "version": "1.0.0",
      "source": "project-local",
      "deployedTo": {
        "claude": {
          "agents": 0, "commands": 0, "skills": 1, "rules": 1,
          "artifactHashes": {
            "rules/my-rule.md": "sha256:abc…",
            "skills/my-skill/SKILL.md": "sha256:def…"
          }
        }
      }
    }
  }
}
```

## CLI surface

```text
aiwg remove <name>                    Default: prompt on mutated, refuse case 4
aiwg remove <name> --force            Skip case-2 prompt only (see invariants)
aiwg remove <name> --provider <p>     Limit revert to one provider's deploy
aiwg remove <name> --dry-run          Print plan; no filesystem changes
aiwg remove <name> --keep-registry    Revert files but leave registry entry (advanced)
```

`aiwg remove` for project-local bundles is the second branch in `removeHandler` — discovery decides whether to delegate to plugin-uninstaller-cli (existing behavior) or take this path.

## Activity log entries

Per the [`activity-log` rule](../../agentic/code/addons/aiwg-utils/rules/activity-log.md), one line per `aiwg remove` invocation summarizing the cohort, plus per-artifact lines for non-default outcomes.

```text
## [2026-05-02 19:45] remove | my-bundle:extension | claude=2 reverted, cursor=1 mutated-skipped
## [2026-05-02 19:45] remove-mutated | my-bundle:extension | claude:rules/my-rule.md skipped (operator edits)
## [2026-05-02 19:45] remove-conflict | my-bundle:extension | cursor:skills/x/SKILL.md owned by other-bundle
## [2026-05-02 19:45] remove-force | my-bundle:extension | claude=3 reverted (1 mutation overridden)
```

## Test matrix mapping

The cases here are the test-matrix rows in [`.aiwg/testing/test-strategy-project-local.md`](../testing/test-strategy-project-local.md):

| Case | Strategy doc row |
|------|------------------|
| 1 (pristine) | R-1 |
| 3 (missing) | R-2 |
| Source preserved | R-3 |
| 2 (mutated) | R-4 (deferred until this design lands; will be added by #1037) |
| 4 (replaced) | R-5 (deferred until this design lands; will be added by #1037) |

Cases 5–7 are additional tests that #1037 will add when implementing the handler.

## Out of scope

- `aiwg promote` and `aiwg doctor` — covered by sibling design [`design-doctor-log-promote.md`](design-doctor-log-promote.md)
- Cross-project revert (removing a bundle's deploy from a different working directory) — manual `cd && aiwg remove`
- Undoing a remove — operator can re-run `aiwg use <name>`

## Open questions

None blocking. Future revision may add `--interactive` for case-4 ("show me the conflict; let me pick"), but the safer default-and-`--force`-doesn't-help-you semantics are what #1037 implements first.
