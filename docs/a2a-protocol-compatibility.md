# A2A protocol compatibility

AIWG supports the A2A 0.3 compatibility surface and the A2A 1.0 HTTP+JSON
binding through one normalized mission model. Protocol selection is explicit;
route names containing `v1` are never treated as protocol evidence.

These three version namespaces are independent:

| Namespace | Meaning | Example |
|---|---|---|
| A2A protocol | The upstream agent interaction wire contract | `A2A-Version: 1.0`, or headerless 0.3 compatibility |
| AIWG executor contract | The local registration, dispatch, and mission lifecycle API | `/api/v1/executors`, `spec_version: 1.0.0` |
| AIWG/sandbox extensions | Independently versioned extension contracts | `https://agentic-sandbox.aiwg.io/extensions/runtime/v1` |

An executor registered with `spec_version: 1.0.0`, or an endpoint whose path
contains `/v1`, does not thereby support A2A 1.0.

## Selection and fallback

`aiwg serve` accepts:

```text
--a2a-protocol <0.3|1.0|auto>
--a2a-protocol-fallback
--no-a2a-protocol-fallback
--a2a-legacy-executor-fallback
--no-a2a-legacy-executor-fallback
```

The equivalent environment variables are:

```text
AIWG_A2A_PROTOCOL_POLICY=0.3|1.0|auto
AIWG_A2A_PROTOCOL_FALLBACK=true|false
AIWG_A2A_LEGACY_EXECUTOR_FALLBACK=true|false
```

The default remains explicit 0.3 compatibility. `auto` prefers a compatible
1.0 interface in AgentCard order. It may downgrade to 0.3 only when protocol
fallback is enabled and the server returns the standard
`VersionNotSupportedError`. Authentication, authorization, application,
transport, timeout, and not-found errors do not cause protocol downgrade.

Strict `1.0` mode overrides all fallback settings: it never selects 0.3 and
never falls through to the separate legacy executor `/dispatch` API.

Cockpit uses the parallel settings
`AIWG_COCKPIT_A2A_PROTOCOL_POLICY=0.3|1.0|auto` and
`AIWG_COCKPIT_A2A_PROTOCOL_FALLBACK=1|0`. Its health and inventory projections
report the policy, selected version, binding, and interface URL.

## Wire behavior

For 1.0 HTTP+JSON, AIWG sends `A2A-Version: 1.0` and uses
`application/a2a+json`. It maps the selected interface URL to the singular
1.0 operations such as `/message:send` and `/tasks/{id}:subscribe`. The 1.0
codec validates role/state enums, Part oneofs, raw bytes, URLs, data,
timestamps, extensions, and `StreamResponse` wrapper members at runtime.

The 0.3 adapter intentionally omits `A2A-Version`, uses `application/json`,
and preserves the deployed legacy route and shape contract. Both adapters
produce the same normalized `Message`, `Task`, `Artifact`, and stream event
types for mission, HITL, telemetry, and terminal-state logic.

SSE and signed push notifications use the same ownership, ordering,
deduplication, and terminal-transition reconciler. Push signatures are checked
over the raw body before JSON parsing. Idempotency scope includes the config,
protocol version, and event ID, so 0.3 and 1.0 deliveries cannot collide.

## AgentCard requirements

AIWG accepts legacy 0.3 cards and 1.0 cards with ordered
`supportedInterfaces`. A 1.0 interface must declare its own `url`,
`protocolBinding`, and `protocolVersion`. A card that claims top-level 1.0
while providing only legacy `transport` fields is rejected. Interface cache
keys include version, binding, and URL, and executor re-registration clears
the previously selected interface.

The behavior follows the upstream [A2A 1.0 versioning rules](https://a2a-protocol.org/v1.0.0/specification/#36-versioning),
[1.0 migration notes](https://a2a-protocol.org/latest/whats-new-v1/), and
[A2A v1.0.1 release](https://github.com/a2aproject/A2A/releases/tag/v1.0.1).

## Qualification evidence

The repository keeps evidence types separate:

- `test/fixtures/a2a/` and unit tests are offline codec/contract evidence.
- `apps/cockpit/mock-executor/src/smoke.mjs` is mock interoperability evidence;
  it runs truthful 0.3 and 1.0 modes and rejects mismatched headers/shapes.
- `npm run uat:serve-live` is live AIWG-to-agentic-sandbox evidence. Set
  `AIWG_A2A_LIVE_DISPATCH=1` to exercise each advertised interface and
  `AIWG_A2A_LIVE_REQUIRE_BOTH=1` when a qualification run must prove both 0.3
  and 1.0 rather than the subset advertised by the target.

Mock evidence must not be reported as live interoperability evidence.
