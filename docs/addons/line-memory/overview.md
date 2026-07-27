---
title: Line Memory
description: Bounded recency-retained plain-text memory for small durable project facts.
---

# Line Memory

Line Memory retains short project facts in one plain-text file. Each nonblank
line is one memory. The oldest line is least recent; the last line is newest.
Adding, listing, searching, or touching an entry can move it to the newest
position, so frequently reused facts survive retention pruning.

## When to use it

Use line memory when you need a small, inspectable set of facts such as a
canonical tracker, a stable command convention, or a project-specific testing
constraint.

Use `llm-wiki` or `semantic-memory` instead when you need multiple pages,
citations, cross-references, contradiction handling, entity profiles, or
semantic retrieval. Line memory has no embeddings, knowledge graph, or
automatic ingestion.

## Install and verify

```bash
aiwg use line-memory
aiwg line-memory --help
aiwg line-memory config get
```

The same manifest-declared CLI contract works for bundled addons and
project-local addon/plugin payloads. A project-local bundle declares the
`cli_commands` block in its manifest; a plugin wrapper can point at an addon
payload whose manifest declares the block.

## Bounded retrieval and recency

```bash
aiwg line-memory list --limit 20
aiwg line-memory search "tracker" --limit 5
```

Results are newest-first. Only the selected slice is printed. Returned entries
are moved to the end of the file while preserving their relative recency.
Pass `--no-touch` to inspect without changing order. Search is
case-insensitive unless `--case-sensitive` is supplied.

## Adding, touching, and pruning

```bash
aiwg line-memory add "Project uses Gitea as the canonical tracker."
aiwg line-memory touch "Project uses Gitea as the canonical tracker."
aiwg line-memory prune
```

With `dedupe: true`, adding an exact duplicate removes older identical entries
and appends one newest copy. Pruning removes the oldest nonblank memories first.
Adding and reducing `maxLines` prune automatically.

## Configuration

Configuration is stored in `.aiwg/memory/line-memory.config.json`:

```json
{
  "path": ".aiwg/memory/line-memory.txt",
  "maxLines": 200,
  "dedupe": true,
  "trimBlankLines": true
}
```

```bash
aiwg line-memory config get maxLines
aiwg line-memory config set maxLines 100
aiwg line-memory config set dedupe false
aiwg line-memory config set path .aiwg/memory/team-facts.txt
```

Paths must remain inside the project. Missing or malformed configuration uses
safe defaults and emits a diagnostic. `config set` writes a valid replacement.

## Security and context discipline

Never store secrets, credentials, access tokens, private keys, authentication
cookies, or sensitive personal data in line memory. It is ordinary project
data and may be committed or inspected like any other project file.

The addon never adds the backing file to provider startup files. Agents and
skills should use bounded `list --limit` or `search --limit` calls instead of
reading the complete file.
