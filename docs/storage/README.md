# Storage Documentation

AIWG stores project artifacts on the local filesystem by default. These pages
explain when to keep that default, when to route a subsystem to another backend,
and how to verify storage behavior before relying on it.

Start with [Overview](overview.md) if you are choosing a backend. Use
[Security](security.md) before adding external services or credential-backed
configuration.

## Pages

- **[Overview](overview.md)** — what the storage system does, quick start, CLI surface, what's implemented vs deferred
- **[Security](security.md)** — credential handling, path traversal rejection, atomic writes, doctor validation
- **[Migration](migration.md)** — `aiwg storage migrate` command walkthrough
- **[Direct PostgreSQL](backends/postgres.md)** — advanced canonical backend, roles, TLS, migration, and qualification
- **[PostgreSQL through PostgREST](backends/postgrest.md)** — optional HTTP transport, RPC boundaries, RLS, and limits
- **[Scalable backend contract](backend-contract.md)** — versioned capabilities,
  data classes, consistency, and backend maturity
- **[Scalable migration protocol](migration-protocol.md)** — checksum-backed
  offline/online migration, approval, cutover, and rollback
- **[Qualification evidence](qualification.md)** — correctness-first concurrency, fault, recovery, and benchmark reports

## Per-backend pages

| Backend       | Page                                | Status              |
| ------------- | ----------------------------------- | ------------------- |
| `fs`          | [backends/fs.md](backends/fs.md)    | READY (default)     |
| `obsidian`    | [backends/obsidian.md](backends/obsidian.md) | READY      |
| `logseq`      | [backends/logseq.md](backends/logseq.md)     | READY      |
| `fortemi`     | [backends/fortemi.md](backends/fortemi.md)   | READY (alpha; legacy for search) |
| `notion`      | [backends/notion.md](backends/notion.md)     | STUB (#959) |
| `anythingllm` | [backends/anythingllm.md](backends/anythingllm.md) | STUB (#960) |
| `s3`          | [backends/s3.md](backends/s3.md)             | STUB (#962) |
| `webdav`      | [backends/webdav.md](backends/webdav.md)     | STUB (#963) |

## Reference

- Live backend status: `aiwg storage list-backends`
- Fortemi Core index/search packaging: [Fortemi Core prebuilt indices](../fortemi-core-prebuilt-indices.md)
