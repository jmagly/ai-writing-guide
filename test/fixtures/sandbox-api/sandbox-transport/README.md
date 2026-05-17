# Sandbox transport contract fixtures

These fixtures freeze the current AIWG-side sandbox transport HTTP contract used by
`tools/daemon/sandbox-transport.mjs`.

The historic tier-2 issue text mentions older sandbox endpoints such as `/register`,
`/instances`, direct VM/container lifecycle calls, PTY allocation, and a WebSocket
event stream. The current implementation does not call those endpoints from
`SandboxTransport`; it consumes the management REST task API instead:

- `POST /api/v1/tasks`
- `GET /api/v1/tasks/:taskId`
- `PATCH /api/v1/tasks/:taskId`
- `DELETE /api/v1/tasks/:taskId`
- `GET /api/v1/tasks/:taskId/logs?offset=:offset`
- `GET /api/v1/tasks?state=running`

Each JSON file stores one request/response pair. Contract tests replay these
fixtures through a strict in-process fetch mock, with no network access in CI.

## Recording

Live recording is manual and gated:

```bash
AIWG_SANDBOX_ENDPOINT=http://127.0.0.1:8122 node tools/scripts/record-sandbox-api.mjs --diff
AIWG_SANDBOX_ENDPOINT=http://127.0.0.1:8122 node tools/scripts/record-sandbox-api.mjs --write
```

`--diff` compares live captures to committed fixtures. `--write` replaces the
fixtures after a deliberate contract refresh. Do not run either mode from CI.

Volatile values such as task IDs and timestamps are normalized before writing.
