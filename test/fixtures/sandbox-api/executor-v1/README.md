# Executor v1 wire fixtures (agentic-sandbox seam)

These fixtures freeze the canonical JSON shapes for the **AIWG ↔ agentic-sandbox executor contract v1**, as
implemented in agentic-sandbox `effdb43` (issue [#193](https://git.integrolabs.net/roctinam/agentic-sandbox/issues/193))
and consumed by AIWG `aiwg serve` via the executor registry routes (issue [#1180](https://git.integrolabs.net/roctinam/aiwg/issues/1180)).

## Source of truth

The shapes here mirror `~/dev/agentic-sandbox/docs/aiwg-executor.md` (spec_version `1.0.0`). When the sandbox
contract ships a new wire shape, update *both* the spec doc on the sandbox side and the fixture file here,
in the same PR pair.

## Layout

```
executor-v1/
├── registration/
│   ├── register-request.json     POST /api/v1/executors/register (sandbox → AIWG)
│   ├── register-response.json    202 Accepted; issues bearer token
│   └── deregister-request.json   DELETE /api/v1/executors/:id (sandbox → AIWG)
├── dispatch/
│   ├── dispatch-request.json     POST /api/v1/sessions/:id/dispatch (AIWG → sandbox)
│   ├── dispatch-response.json    202 Accepted
│   └── dispatch-errors.json      401 / 404 / 503 / 500 envelopes
├── events/
│   ├── mission-assigned.json     mission.assigned (sandbox → AIWG)
│   ├── mission-started.json
│   ├── mission-progress.json
│   ├── mission-hitl-required.json
│   ├── mission-hitl-responded.json   AIWG → sandbox (inbound)
│   ├── mission-suspended.json
│   ├── mission-reconnected.json
│   ├── mission-resumed.json
│   ├── mission-completed.json
│   ├── mission-failed.json
│   └── mission-aborted.json
└── resync/
    └── executor-resync.json      First WS frame on every reconnect
```

## How fixtures are used

1. **Contract tests** (Tier 2 of `.aiwg/testing/test-strategy-daemon-serve-sandbox.md`) assert that AIWG's
   schema-validation layer accepts these and rejects shape-shifted negatives.
2. **Recorder workflow** (`test-strategy` §5.2) — when the sandbox contract ships a real change, replace these
   files from a live capture; the diff IS the contract diff.
3. **Integration tests** (Tier 3) replay these to drive AIWG-side parsers/dispatchers without needing a live
   sandbox.

## Recording from a live sandbox

```bash
# Bring up sandbox + AIWG
cd ~/dev/agentic-sandbox/management && cargo run -- --aiwg-serve http://localhost:7337 &
cd ~/dev/aiwg && aiwg serve --port 7337 &

# Tap the WS stream (one approach)
websocat ws://localhost:7337/ws/executors/<executor_id>?token=<bearer> > /tmp/exec-events.jsonl

# Trigger a dispatch
aiwg mc dispatch <session> "echo hello"

# Replay each event type from /tmp/exec-events.jsonl into the corresponding fixture file
```

Always strip volatile fields (timestamps, UUIDs, host-local paths) and replace with the placeholders below
before committing.

## Placeholder conventions

| Placeholder | Means |
|-------------|-------|
| `<UUID>` | RFC 4122 UUID — opaque identifier |
| `<RFC3339>` | RFC 3339 timestamp with millisecond precision (UTC) |
| `<bearer>` | Opaque bearer token issued at registration |
| `<host>:<port>` | Network endpoint (placeholder; tests substitute test-server addresses) |

## Spec version

Fixtures track `spec_version: "1.0.0"`. When the sandbox bumps the spec, file a follow-up issue and bump the
`SPEC_VERSION` constant in any consuming test alongside the fixture refresh.
