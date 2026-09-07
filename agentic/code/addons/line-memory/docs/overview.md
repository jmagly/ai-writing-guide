---
title: Line Memory
description: Bounded recency-retained plain-text memory for small durable project facts.
---

# Line Memory

Line Memory retains short project facts in one plain-text file. Each nonblank
line is one memory. The oldest line is least recent; the last line is newest.
Adding, listing, searching, or touching an entry can move it to the newest
position, so frequently reused facts survive retention pruning.

## Common Use Cases

- Record a canonical tracker, deployment convention, or test command that agents should find quickly.
- Keep a bounded set of current project facts without building a wiki.
- Import reviewed session-intelligence candidates as concise facts.
- Search or list only the needed slice during an AI session.

## When to use it

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

Pass `--json` to receive machine-readable entries with stable handles,
content digests, recency, access counts, lifecycle state, and provenance. JSON
retrieval touches only the entries actually returned unless `--no-touch` is
also supplied.

## Adding, touching, and pruning

```bash
aiwg line-memory add "Project uses Gitea as the canonical tracker."
aiwg line-memory touch "Project uses Gitea as the canonical tracker."
aiwg line-memory prune
```

With `dedupe: true`, adding an exact duplicate removes older identical entries
and appends one newest copy. Pruning removes the oldest nonblank memories first.
Adding and reducing `maxLines` prune automatically.

## Reviewed imports and lifecycle

```bash
aiwg line-memory import "Project uses Gitea" \
  --source-ref wiki:decisions/tracker --reviewer operator --confirm --json
aiwg line-memory archive lm_<uuid> --reviewer operator --reason "inactive" --confirm
aiwg line-memory supersede lm_<uuid> --by wiki:decisions/new-tracker --reviewer operator --confirm
aiwg line-memory remove lm_<uuid> --reviewer operator --reason "invalid" --confirm
```

Reviewed imports require a source reference, reviewer, and explicit
confirmation. Archive, remove, and supersede operations also require
confirmation and remove the active fact from the text file while retaining a
sidecar tombstone. Supersession additionally requires a replacement handle or
reference. Repeating an already-applied lifecycle command is safe to detect
through its JSON result and retained metadata.

Use `--dry-run --json` instead of `--confirm` on import, archive, remove, or
supersede to receive a non-mutating preview with the proposed mutation counts
and confirmation requirement. Handles identify normalized logical facts; if a
legacy `dedupe: false` store contains repeated physical lines, disposition by
handle removes every occurrence and retains one audit tombstone.

Accepted session-intelligence candidates may target `--consumer line-memory`.
That route uses the same lock, transaction journal, text file, and provenance
sidecar as the CLI; it does not create a wiki-style Markdown page. Candidate
review and security acknowledgement remain mandatory in the sessions gateway.
If the originating session is later purged, its explicit retain, revoke,
supersede, origin-unavailable, or delete disposition is applied to the stable
line-memory handle and recorded in both the session journal and sidecar.

## Configuration

Configuration is stored in `.aiwg/memory/line-memory.config.json`:

```json
{
  "path": ".aiwg/memory/line-memory.txt",
  "metadataPath": ".aiwg/memory/line-memory.meta.json",
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
aiwg line-memory config set metadataPath .aiwg/memory/team-facts.meta.json
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
