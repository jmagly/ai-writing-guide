# Session Catalog CLI

`aiwg session` remains the provider launcher. Catalog management uses the
plural `aiwg sessions` namespace.

## Catalog location

The default catalog is `.aiwg/sessions/catalog.sqlite` in the current
workspace. Override it with `--db <path>`. The catalog requires the optional
`better-sqlite3` peer dependency; `aiwg sessions doctor --json` reports
`CATALOG_UNAVAILABLE` when it is absent.

## Commands

```text
aiwg sessions sources [--json]
aiwg sessions import <file> --source-id <id> [--workspace <id>] [--dry-run] [--json]
aiwg sessions list [--provider <id>] [--workspace <id>] [--tag <tag>]
                   [--limit <1..500>] [--cursor <offset>] [--json]
aiwg sessions show <session-id> [--json]
aiwg sessions tag <session-id> <tag> [--dry-run] [--json]
aiwg sessions relocate <source-id> <file> [--dry-run] [--json]
aiwg sessions reindex [--dry-run] [--json]
aiwg sessions delete <session-id> [--confirm] [--dry-run] [--json]
aiwg sessions doctor [--json]
```

Generic imports accept only the declared, versioned AIWG interchange. Provider
logs are never modified. `delete` previews by default and only tombstones the
AIWG-owned normalized session after `--confirm`.

## JSON contract

Every `--json` response has the same versioned top-level shape:

```json
{
  "contractVersion": "1.0.0",
  "command": "sessions.list",
  "status": "ok",
  "data": {},
  "error": null
}
```

Fields may be added within major version 1, but existing fields retain their
meaning. List order is stable and pagination uses a deterministic numeric
cursor. Unsupported providers return `UNSUPPORTED_OPERATION`; this is distinct
from a successful query with an empty `items` array.

Exit codes are stable within major version 1:

| Code | Meaning |
|---:|---|
| 0 | Success or preview |
| 2 | Invalid command or arguments |
| 3 | Unsupported operation |
| 4 | Requested catalog object unavailable |
| 5 | Source or contract validation failure |
| 6 | Catalog/storage unavailable |
