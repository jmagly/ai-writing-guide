# Storage Documentation

User-facing documentation for AIWG's pluggable storage adapter system (#934).

## Pages

- **[Overview](overview.md)** — what the storage system does, quick start, CLI surface, what's implemented vs deferred
- **[Security](security.md)** — credential handling, path traversal rejection, atomic writes, doctor validation
- **[Migration](migration.md)** — `aiwg storage migrate` command walkthrough

## Per-backend pages

| Backend       | Page                                | Status              |
| ------------- | ----------------------------------- | ------------------- |
| `fs`          | [backends/fs.md](backends/fs.md)    | READY (default)     |
| `obsidian`    | [backends/obsidian.md](backends/obsidian.md) | READY      |
| `logseq`      | [backends/logseq.md](backends/logseq.md)     | READY      |
| `fortemi`     | [backends/fortemi.md](backends/fortemi.md)   | READY (alpha) |
| `notion`      | [backends/notion.md](backends/notion.md)     | STUB (#959) |
| `anythingllm` | [backends/anythingllm.md](backends/anythingllm.md) | STUB (#960) |
| `s3`          | [backends/s3.md](backends/s3.md)             | STUB (#962) |
| `webdav`      | [backends/webdav.md](backends/webdav.md)     | STUB (#963) |

## Reference

- Full design: `.aiwg/architecture/storage-design.md`
- ADR: `.aiwg/architecture/adr-configurable-storage-backends.md`
- JSON Schema: `.aiwg/architecture/schemas/storage.config.v1.json`
- Research note: `.aiwg/architecture/research/storage-backends.md`
- Live backend status: `aiwg storage list-backends`
