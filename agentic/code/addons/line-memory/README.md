# Line Memory

Line Memory is a small optional AIWG memory addon: one human-readable file,
one retained memory per nonblank line, a configurable retention limit, and
least-recently-used behavior implemented by moving referenced lines to the end.

## Install

```bash
aiwg use line-memory
```

Deployment registers the `aiwg line-memory` CLI namespace. The memory file is
not added to provider startup context.

## Commands

```bash
aiwg line-memory add "Project uses Gitea as the canonical tracker."
aiwg line-memory list --limit 20
aiwg line-memory search "canonical tracker" --limit 5
aiwg line-memory touch "Project uses Gitea as the canonical tracker."
aiwg line-memory prune
aiwg line-memory config get maxLines
aiwg line-memory config set maxLines 100
aiwg line-memory list --limit 20 --json
aiwg line-memory import "Reviewed project fact" --source-ref wiki:decisions/tracker --reviewer operator --confirm
aiwg line-memory archive lm_<uuid> --reviewer operator --reason "No longer active" --confirm
```

`list` and `search` return bounded slices and refresh the recency of returned
entries. Use `--no-touch` for read-only inspection.

## Storage

Defaults:

```json
{
  "path": ".aiwg/memory/line-memory.txt",
  "metadataPath": ".aiwg/memory/line-memory.meta.json",
  "maxLines": 200,
  "dedupe": true,
  "trimBlankLines": true
}
```

Configuration lives at `.aiwg/memory/line-memory.config.json`. Invalid or
missing configuration recovers to safe defaults; `config set` repairs a
corrupt configuration file.

Machine-readable provenance and lifecycle metadata lives in
`.aiwg/memory/line-memory.meta.json`. The sidecar gives each logical fact a
stable opaque handle while preserving the original one-fact-per-line file.
Governed import and lifecycle commands support `--dry-run --json` previews;
confirmation is required before either backing file changes.
Lifecycle operations retain audit tombstones in the sidecar; they never place
metadata in the human-readable memory file.

Do not store secrets, credentials, tokens, private keys, or sensitive personal
data. Line memory is ordinary project data, not a secret store.

See [the operator guide](docs/overview.md) for retention details, deployment
options, and guidance on choosing line memory versus wiki or semantic memory.
