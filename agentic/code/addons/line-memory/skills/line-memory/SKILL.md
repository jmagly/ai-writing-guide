---
namespace: aiwg
name: line-memory
platforms: [all]
description: Retain and retrieve small durable project facts through a bounded, recency-ordered plain-text memory
requires:
  - addon: line-memory deployed with `aiwg use line-memory`
ensures:
  - bounded-retrieval: memory queries return only the requested slice
  - recency-retention: referenced memories move to the newest position
invariants:
  - never store secrets, credentials, tokens, or sensitive personal data
  - never inject the complete memory file into provider startup context
  - use line-memory CLI commands instead of directly reading the complete backing file
commandHint:
  argumentHint: add|list|search|touch|prune|config
  allowedTools: Bash
  category: memory
  orchestration: false
---

# Line Memory

Use line memory for a small set of durable project facts that benefit from
least-recently-used retention but do not need wiki pages, semantic search,
citations, or a knowledge graph.

## Retrieval

Always retrieve a bounded slice:

```bash
aiwg line-memory search "canonical tracker" --limit 5
aiwg line-memory list --limit 20
```

`list` and `search` refresh the returned entries by moving them to the newest
position. Pass `--no-touch` only for inspection that must not change recency.
Never read the complete backing file into startup context.

## Mutation

```bash
aiwg line-memory add "Project uses Gitea as the canonical tracker."
aiwg line-memory touch "Project uses Gitea as the canonical tracker."
aiwg line-memory prune
aiwg line-memory list --limit 20 --json
aiwg line-memory import "Reviewed fact" --source-ref wiki:path --reviewer operator --confirm
```

Store one concise, non-sensitive fact per entry. Do not store secrets,
credentials, access tokens, private keys, or sensitive personal data.

Use stable handles from `--json` for governed archive/remove/supersede
operations. These mutations require `--confirm`; reviewed imports additionally
require `--source-ref` and `--reviewer` so provenance is not lost.

## Configuration

```bash
aiwg line-memory config get maxLines
aiwg line-memory config set maxLines 100
```

The default memory file is `.aiwg/memory/line-memory.txt`; configuration is
stored in `.aiwg/memory/line-memory.config.json`.
