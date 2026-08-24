# Experimental UHP client

AIWG can connect to a remote Unified Harness Protocol (UHP) endpoint as an
experimental client transport. UHP is not an AIWG provider, an A2A fallback,
or an MCP tool surface. AIWG does not expose a UHP server and does not claim
server conformance.

The client is pinned to UHP `2026-08-11`. It never negotiates down to another
version.

## Configure a profile

Profiles live in project or user-resolved `aiwg.config` data. Store only a
secret reference; never put a bearer value in the file.

```json
{
  "uhp": {
    "enabled": true,
    "profiles": {
      "research": {
        "endpoint": "https://harness.example.com",
        "version": "2026-08-11",
        "credential": { "source": "env", "name": "AIWG_UHP_RESEARCH_TOKEN" },
        "defaultHarness": "chrn_research",
        "defaultModel": "example-model",
        "experimental": true,
        "trust": {
          "allowedHosts": ["harness.example.com"],
          "allowPrivateNetwork": false,
          "allowInsecureLoopback": false,
          "allowRedirects": false
        },
        "limits": {
          "requestTimeoutMs": 600000,
          "inactivityTimeoutMs": 45000,
          "maxTaskSeconds": 3600,
          "maxUploadBytes": 52428800,
          "maxArtifactBytes": 104857600,
          "maxArtifactCount": 100,
          "maxRetries": 3
        }
      }
    }
  }
}
```

Set the referenced variable in the process environment through the operator's
approved secret-injection mechanism. The CLI intentionally has no bearer-token
flag.

Plain HTTP is rejected. Loopback development requires both a loopback address
and `allowInsecureLoopback: true`. Private-network endpoints, redirects, and
hosts outside `allowedHosts` are rejected unless the profile explicitly permits
the applicable boundary.

## Inspect and run

Every operation requires an explicit profile:

```bash
aiwg uhp discover --profile research
aiwg uhp harnesses --profile research
aiwg uhp models --profile research
aiwg uhp models --profile research --harness chrn_research
aiwg uhp run --profile research --harness chrn_research --input "Summarize the workspace"
aiwg uhp run --profile research --harness chrn_research --input "Run the checks" --stream
```

`discover` calls unauthenticated `GET /v1/uhp`. All other operations resolve the
credential only when the request is sent. `runtime-info --transports` and
`steward transports` report UHP separately from provider-native capabilities.

## Lifecycle behavior

- Identical tasks use the same request digest and idempotency key. Reusing a
  key with changed content fails locally.
- A stream must begin with `response.created`, use sequence numbers starting at
  zero without gaps, and end with exactly one terminal event.
- Unknown additive event and output types are retained or ignored without
  invalidating an otherwise valid stream.
- A disconnect, inactivity timeout, or ambiguous submit leaves remote state
  `unknown`. It never implies cancellation. A stored-response read is the
  authoritative reconciliation path.
- Cancellation is a request. Only a stored response or terminal event reporting
  `cancelled` proves the remote work stopped.
- `incomplete` remains distinct from `failed`, including when a task exhausts a
  step or time budget.

## Artifacts

Downloads are hostile bytes. The client requires
`X-Content-Type-Options: nosniff`, validates UHP container and file identifiers,
decodes hostile filename variants, confines writes to an approved non-symlink
directory, caps bytes/counts, and writes with restrictive permissions.

## Protocol source

- [UHP `2026-08-11` specification](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11)
- [UHP machine-readable schema](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/schema/uhp-2026-08-11.schema.json)
- [AIWG UHP architecture decision](architecture/adr-uhp-remote-harness-transport.md)
- [AIWG UHP client threat model](security/uhp-client-threat-model.md)

