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
```

`list` and `search` return bounded slices and refresh the recency of returned
entries. Use `--no-touch` for read-only inspection.

## Storage

Defaults:

```json
{
  "path": ".aiwg/memory/line-memory.txt",
  "maxLines": 200,
  "dedupe": true,
  "trimBlankLines": true
}
```

Configuration lives at `.aiwg/memory/line-memory.config.json`. Invalid or
missing configuration recovers to safe defaults; `config set` repairs a
corrupt configuration file.

Do not store secrets, credentials, tokens, private keys, or sensitive personal
data. Line memory is ordinary project data, not a secret store.

See [the operator guide](docs/overview.md) for retention details, deployment
options, and guidance on choosing line memory versus wiki or semantic memory.
