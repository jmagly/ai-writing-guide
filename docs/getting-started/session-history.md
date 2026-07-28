# Import AI session history

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes AIWG is already installed and connected to this project.

Use the session catalog when you want one privacy-aware timeline across
multiple AI providers.

From the project root, preview discovery first:

```sh
aiwg sessions discover --workspace "$PWD" --dry-run
```

Claude, Cursor, and Factory histories are discovered only below workspace-keyed
provider roots. Codex keeps sessions in a shared root, so authorize it
explicitly:

```sh
aiwg sessions discover \
  --workspace "$PWD" \
  --codex-root ~/.codex/sessions \
  --json
```

The command reports every provider, including unavailable and manual-export
providers, and saves an immutable manifest unless `--dry-run` is present.
Review it, preview the exact batch, then confirm:

```sh
aiwg sessions import-discovered --workspace "$PWD" --dry-run
aiwg sessions import-discovered --workspace "$PWD" --confirm
```

For non-interactive automation, `--yes` is equivalent to `--confirm`. Imports
are resumable and idempotent:

```sh
aiwg sessions import-discovered --workspace "$PWD" --resume --yes
```

Read commands infer an unambiguous current project, so the normal follow-up is:

```sh
aiwg sessions list
aiwg sessions timeline --gap 30m
aiwg sessions search "decision" --control-events exclude
```

Both list and timeline report whether coverage is complete, partial, stale, or
unknown. Use `--min-coverage 0.95` when an audit should fail below a threshold.
If inference reports multiple workspace candidates, rerun with the exact
`--workspace` shown in the diagnostic.

The catalog contains normalized AIWG copies. Discovery and import never modify
provider histories, and source paths are redacted from public command output.
See [Session Catalog CLI](../sessions/cli.md) for manifest, locking, coverage,
timeline, deletion, and JSON contracts.
