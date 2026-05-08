# Executor Conformance Test Suite

The executor conformance suite validates any executor implementation against the
`executor.aiwg.io/v1` contract specification. It runs in two modes — **fixture mode**
(default, zero network I/O) and **live mode** (against a real executor process) — using
the same test bodies for both.

**Related:**
- Contract spec: [`docs/contracts/executor.v1.md`](executor.v1.md)
- JSON schema: [`schemas/executor-v1.json`](../../schemas/executor-v1.json)
- Registry implementation: [`src/serve/executor-registry.ts`](../../src/serve/executor-registry.ts)
- Epic: [#1177](https://git.integrolabs.net/roctinam/aiwg/issues/1177)
- Implementation issue: [#1183](https://git.integrolabs.net/roctinam/aiwg/issues/1183)

---

## What the suite does

The suite exercises the AIWG-side dispatch path (the `ExecutorRegistry` state machine and
event router) against every event type defined in the v1 contract. It verifies:

1. **Shape compliance** — every request payload and event envelope matches the JSON schema.
2. **State machine correctness** — executor and mission states transition correctly
   (`assigned → running → done`, `running → suspended → running → done`, etc.).
3. **Capability tier gating** — HITL and Resumable tests only run when the executor
   advertises the corresponding capability.
4. **Fixture drift detection** — a SHA-256 hash is pinned at the top of each test file.
   If a fixture is mutated without updating the hash, tests fail immediately.
5. **Push-to-executor fidelity** — `pushToExecutor()` calls are verified via a
   `FakeWsConn` that records every `send()` call.

The suite is **not** a black-box HTTP test harness. In fixture mode it drives
`ExecutorRegistry` directly (loaded from `dist/src/serve/executor-registry.js`) so there
is no HTTP overhead and no dependency on a live `aiwg serve` process.

---

## Test categories

| Category | Directory | Tier | Fixtures used |
|----------|-----------|------|---------------|
| Register | `register/` | Core | `register-happy.json` |
| Dispatch | `dispatch/` | Core | `dispatch-happy.json`, `dispatch-failed.json`, `dispatch-aborted.json` |
| Lifecycle | `lifecycle/` | Core | `dispatch-happy.json`, `dispatch-failed.json`, `dispatch-aborted.json` |
| Events | `events/` | Core | all 5 non-auth/non-hitl/non-resumable fixtures |
| Auth | `auth/` | Core | `auth-token-rotation.json` |
| HITL | `hitl/` | HITL (`hitl` capability) | `hitl-roundtrip.json` |
| Resumable | `resumable/` | Resumable (`resumable` capability) | `resumable-suspend-resume.json` |

**Core tier** — always runs.  
**HITL tier** — runs when the executor (or fixture) advertises the `hitl` capability.  
**Resumable tier** — runs when the executor (or fixture) advertises the `resumable` capability.

---

## Running the suite

### Fixture mode (CI default)

```bash
npm run test:conformance
```

No environment variables required. No network I/O. Deterministic. Runs in `~5 s`.

The fixtures in `test/conformance/executor-v1/fixtures/` are replayed directly against
an in-process `ExecutorRegistry`. This is the mode that runs in CI.

### Live mode (against a real executor)

```bash
AIWG_CONFORMANCE_LIVE=1 \
AIWG_CONFORMANCE_EXECUTOR_ID=<executor-id> \
AIWG_CONFORMANCE_BASE_URL=http://127.0.0.1:8122 \
npm run test:conformance
```

| Variable | Required | Description |
|----------|----------|-------------|
| `AIWG_CONFORMANCE_LIVE` | Yes (set to `1`) | Switches to live mode |
| `AIWG_CONFORMANCE_EXECUTOR_ID` | Yes | The `executor_id` of the running executor |
| `AIWG_CONFORMANCE_BASE_URL` | Optional | Base URL for the REST transport (default: `http://127.0.0.1:8122`) |

The live executor must already be registered with `aiwg serve` before the suite runs.
Live mode exercises the HTTP endpoints (`POST /api/v1/executors/register`, etc.) and
the WebSocket transport (`ws://.../ws/executors/:id`) using `globalThis.fetch` and the
`ws` package.

**Tip:** `AIWG_CONFORMANCE_EXECUTOR_ID` can also be passed on the command line:

```bash
AIWG_CONFORMANCE_LIVE=1 npm run test:conformance -- --executor my-executor-id
```

---

## Adding a new conformance test

### Decide which category it belongs to

| If the assertion validates... | Put it in |
|-------------------------------|-----------|
| Executor registration, deregistration, or re-registration | `register/` |
| Mission dispatch: filter resolution, capability matching, isolation policy | `dispatch/` |
| Mission state machine transitions | `lifecycle/` |
| Envelope shape, `ts` format, event type enum, `data` schemas | `events/` |
| Token issuance, authentication, rotation | `auth/` |
| Human-in-the-loop pause/respond flow | `hitl/` |
| Suspend, resync, resume, and checkpoint identity | `resumable/` |
| A new capability tier not listed above | Create a new subdirectory |

### Write the test

Test files use `.test.mjs` extension (vitest picks them up via the conformance config).
Import helpers from `../client.mjs`:

```js
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadFixture,
  hashFixture,
  validateSchema,
  createRegistryForTest,
  FakeWsConn,
} from '../client.mjs';
```

Start every new test file with a drift guard:

```js
const FIXTURE_HASH = hashFixture('my-fixture-name');

describe('[Category] My feature — fixture integrity', () => {
  it('my-fixture-name fixture hash is stable (drift guard)', () => {
    expect(hashFixture('my-fixture-name')).toBe(FIXTURE_HASH);
  });
});
```

Use `createRegistryForTest()` to get a fresh `ExecutorRegistry` per describe block. Call
`registry.shutdown()` in `afterAll`.

### Schema assertion pattern

```js
it('my_event data validates against schema', () => {
  const { valid, errors } = validateSchema(
    'executor.aiwg.io/v1#/$defs/data_my_event',
    eventData
  );
  expect(valid, `Schema errors: ${errors}`).toBe(true);
});
```

The `$defs` names mirror the JSON schema at `schemas/executor-v1.json`. Check that file
for the exact definition name.

---

## Recording fixtures

Fixtures are hand-authored JSON files that document the exact wire format for a complete
scenario. There is no automated recorder yet. To add a new fixture:

1. Study the contract spec (`docs/contracts/executor.v1.md`) and schema
   (`schemas/executor-v1.json`) for the scenario you want to cover.
2. Copy the closest existing fixture as a starting point.
3. Edit it to represent the new scenario. Every event in `event_sequence` should include
   `_step` (human-readable label), `_validates_as` (the `$defs` key from the schema), and
   the full envelope fields (`event`, `executor_id`, `mission_id`, `ts`, `data`).
4. Strip `_step` and `_validates_as` annotations before passing envelopes to
   `registry.handleEvent()` — the test files already do this with a destructure pattern:
   ```js
   const { _step, _validates_as, ...envelope } = step;
   registry.handleEvent(envelope);
   ```
5. Run `npm run test:conformance` locally to confirm your tests pass.
6. The SHA-256 hash in the test file's drift guard will capture any future accidental
   mutations.

For scenarios that require a live executor trace, capture the exchange with a network
proxy or the executor's own debug logging, then translate to the fixture format.

---

## Fixture file format

Each fixture is a JSON object. The top-level keys describe the scenario:

```json
{
  "scenario": "Short human-readable description",
  "preconditions": {
    "executor_registered": {
      "executor_id": "...",
      "capabilities": ["resumable", "hitl"],
      ...
    },
    "mission_running": { "mission_id": "..." }
  },
  "event_sequence": [
    {
      "_step": "1 — executor emits mission.hitl_required",
      "_validates_as": "data_mission_hitl_required",
      "event": "mission.hitl_required",
      "executor_id": "...",
      "mission_id": "...",
      "ts": "2025-01-15T10:05:00Z",
      "data": { ... }
    }
  ]
}
```

Phase-based fixtures (resumable) split the sequence into named phase keys
(`phase_1_before_suspend`, `phase_2_suspend`, etc.) instead of a flat `event_sequence`.

---

## Vitest configuration

The conformance suite uses a dedicated config at `config/vitest.conformance.config.js`:

```js
pool: 'forks',
poolOptions: { forks: { singleFork: true } },
testTimeout: 60000,
include: ['test/conformance/executor-v1/**/*.test.mjs'],
```

`singleFork: true` prevents socket-level conflicts with the main test suite's registry
tests (`#1179`). The 60-second timeout accommodates live-mode I/O.

---

## CI integration

The conformance suite runs as a dedicated step in `.gitea/workflows/ci.yml`, after
`lint:schemas` and before `Run tests`:

```yaml
- name: Run conformance suite (fixture mode)
  run: npm run test:conformance
```

Live mode (`AIWG_CONFORMANCE_LIVE=1`) is excluded from CI. It is intended for
pre-release validation against real executor implementations.

---

## Cross-references

| Document | What it defines |
|----------|----------------|
| [`executor.v1.md`](executor.v1.md) | Full contract specification: registration, dispatch, lifecycle, events, auth, HITL, Resumable |
| [`../../schemas/executor-v1.json`](../../schemas/executor-v1.json) | JSON Schema (draft-2020-12) for all payloads, responses, and event `data` shapes |
| [`../../src/serve/executor-registry.ts`](../../src/serve/executor-registry.ts) | AIWG-side registry implementation under test |
| [`../../src/cli/handlers/serve.ts`](../../src/cli/handlers/serve.ts) | HTTP/WS server that wraps the registry |
| [`#1177`](https://git.integrolabs.net/roctinam/aiwg/issues/1177) | Executor contract epic |
| [`#1183`](https://git.integrolabs.net/roctinam/aiwg/issues/1183) | This suite implementation issue |
