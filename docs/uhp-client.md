# Experimental UHP client

AIWG can connect to a remote Unified Harness Protocol (UHP) endpoint as an
experimental client transport. The client is pinned to UHP `2026-08-11`; it
does not negotiate down or silently retry with another version.

AIWG does not expose a UHP server and does not claim UHP server conformance.
Its qualification reports demonstrate only that this client interoperates with
the tested endpoint, image, harness, and model.

## Choose the correct protocol boundary

These surfaces are complementary, not aliases or automatic fallbacks:

| Surface | Role | What it selects |
|---|---|---|
| AIWG provider | Deploys AIWG agents, skills, rules, and context into a local provider toolchain | Claude Code, Codex, Copilot, and other provider formats |
| UHP | Runs a task through a remote harness server | Endpoint profile, configured harness, and optional model |
| A2A | Delegates work to an agent using A2A task and AgentCard semantics | A routable A2A agent instance |
| MCP | Exposes tools, resources, prompts, and interactions to an MCP host | MCP server and tool/resource |
| OpenAI Responses | Request/response shape for model-oriented execution | Model and response; UHP `2026-08-11` deliberately resembles parts of this surface but adds harness, session, file, and protocol semantics |

Selecting UHP never makes it a provider, MCP tool, or A2A route. There is no
implicit UHP-to-A2A fallback. An ambiguous submission must be reconciled on the
same UHP endpoint before another transport is considered, or duplicate work may
result.

HarnessRouter is one UHP implementation and qualification target, not an AIWG
dependency. Its Community Edition is a self-hosted container using the
operator's infrastructure, data, and provider keys. HarnessRouter also offers a
hosted Cloud service; promotion from a local configured harness to Cloud is a
HarnessRouter product workflow, not an AIWG routing operation. Verify current
editions and terms in the [HarnessRouter repository](https://github.com/HarnessRouter/harnessrouter)
before deployment.

## Configure a named profile

Add UHP configuration to the project artifact-root `aiwg.config` (normally
`.aiwg/aiwg.config`). Store only a secret locator. Never put a bearer value in
the config, a command argument, a committed file, a transcript, or a shell
assignment that will be retained in history.

```json
{
  "uhp": {
    "enabled": true,
    "profiles": {
      "research": {
        "endpoint": "https://harness.example.com",
        "version": "2026-08-11",
        "credential": {
          "source": "env",
          "name": "AIWG_UHP_RESEARCH_TOKEN"
        },
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

Arrange for the named variable to be injected into the `aiwg` process by the
operator-approved secret manager or process supervisor. The CLI intentionally
has no bearer-token flag. Do not add a token argument or assign a literal value
in an interactive shell: either can expose the value through shell history,
process inspection, logs, or copied transcripts.

Every operation requires `--profile`. A caller cannot override the endpoint on
an individual request. HTTPS is mandatory except for an explicitly trusted
loopback development profile. Private-network endpoints, redirects, and hosts
outside `allowedHosts` fail closed unless the named profile permits the exact
boundary. An authenticated redirect may not cross origins even when redirects
are enabled.

## Discover and select a harness or model

Discovery is unauthenticated; catalogue and task requests resolve the credential
only when the request is sent.

```bash
aiwg uhp discover --profile research
aiwg uhp harnesses --profile research
aiwg uhp models --profile research
aiwg uhp models --profile research --harness chrn_research
```

Inspect discovery before first use and after an endpoint upgrade. Confirm that
the endpoint advertises `2026-08-11`, that its conformance class agrees with its
capabilities, and that the requested harness and model are available. A server
may substitute a model or harness under its own policy; AIWG preserves both the
requested and actual identities plus any substitution reason in Mission
evidence. Treat an unexplained substitution as an operational review event.

`aiwg runtime-info --transports` and `aiwg steward transports` report UHP
separately from provider-native capabilities.

## Run tasks

The CLI exposes deliberate inspection and smoke-test operations:

```bash
aiwg uhp run \
  --profile research \
  --harness chrn_research \
  --model example-model \
  --input "Summarize the workspace"

aiwg uhp run \
  --profile research \
  --harness chrn_research \
  --input "Run the checks" \
  --stream
```

JSON output includes the native UHP response or events, normalized UHP evidence,
and the canonical `mission.aiwg.io/v1` projection. Unknown additive event and
output-item types are retained or ignored without invalidating an otherwise
valid stream.

The CLI does not currently expose continuation, cancellation, stored reads,
uploads, or artifact downloads as flags. Automation needing those operations
uses the supported package API. The following excerpt assumes `profile` is the
validated non-secret profile object shown above; `UhpClient` resolves its
credential locator at request time.

```ts
import { UhpClient } from 'aiwg';

const client = new UhpClient('research', profile);

const first = await client.createResponse({
  input: 'Draft the report',
  metadata: { harness_id: 'chrn_research' },
  timeout_seconds: 1800,
});

for await (const event of client.streamResponse({ input: 'Run the checks' })) {
  // Persist only reviewed event fields; a missing terminal event is unknown.
  console.log(event.type, event.sequence_number);
}

const continued = await client.continueResponse(first.id, {
  input: 'Add a risk register and preserve the existing session context',
});

const cancellationReceipt = await client.cancelResponse(continued.id);
const authoritative = await client.readResponse(cancellationReceipt.id);
```

`continueResponse` first reads the stored response and preserves its harness
identity. A requested harness mismatch fails locally. A cancellation receipt is
not proof that work stopped: only a stored response or terminal stream event
whose state is `cancelled` is authoritative. For bounded polling, pass
`{ wait: true }`, then still inspect the returned status.

## Upload and retrieve files

Input files and returned artifacts retain file/container identifiers, name,
media type, digest when supplied, and transport-native source metadata.

```ts
const uploaded = await client.uploadFile('/approved/input/brief.pdf');

const response = await client.createResponse({
  input: [{
    role: 'user',
    content: [{
      type: 'input_file',
      file_id: uploaded.id,
      filename: uploaded.filename,
    }],
  }],
});

const sessionId = response.metadata.session_id;
if (!sessionId) throw new Error('The response did not identify a session');

const artifacts = await client.listArtifacts(sessionId);
for (const artifact of artifacts) {
  if (!artifact.container_id) continue;
  await client.downloadArtifact(
    artifact.container_id,
    artifact.id,
    '/approved/output/uhp-artifacts',
    artifact.filename,
  );
}
```

Treat every download as hostile bytes. The destination must be an approved,
non-symlink directory. AIWG requires `X-Content-Type-Options: nosniff`, confines
decoded filenames to that directory, caps count and bytes, creates files with
restrictive permissions, never overwrites an existing target, and never
executes or previews content. Scan and review artifacts under the destination's
own policy before opening or publishing them.

## Long-running work and recovery

- `requestTimeoutMs` bounds an individual HTTP exchange;
  `inactivityTimeoutMs` bounds silence in an SSE stream; and `maxTaskSeconds`
  caps a requested server task budget. Increase only the limit that the
  qualified endpoint and workload require.
- A request timeout, dropped stream, missing terminal event, or ambiguous POST
  leaves the observation state `unknown`; it does not mean failed or cancelled.
  Preserve the response id and call `reconcileUnknownResponse(responseId)` (an
  alias of the authoritative stored-response read).
- A stream must start with `response.created`, use gapless sequence numbers from
  zero, and end with exactly one terminal event. Gaps, malformed events, and
  duplicate/missing terminals are diagnostics; reconcile rather than inventing
  a terminal state.
- Submissions use a canonical request digest as the idempotency key. Automatic
  retries reuse that key only for retryable ambiguous failures. Reusing a key
  with changed content fails locally.
- `session_busy` is retryable information but is never blindly resubmitted.
  Wait for or read the existing response, then decide under a bounded operator
  policy.
- `incomplete` is terminal but is neither success nor failure. Preserve partial
  output and `incomplete_details`, adjust a budget only after review, and submit
  a deliberate continuation when appropriate.
- When the actual model or harness differs from the request, retain the
  substitution evidence. Do not assume pricing, tools, data handling, or model
  behavior remained equivalent.

## Security and retention responsibilities

The endpoint, discovery document, events, errors, harness output, filenames,
and artifact bytes are all untrusted. Keep remote endpoints behind deployment
egress controls; use least-privilege endpoint credentials; restrict harness
tools and workspaces server-side; and never treat model output as instructions
that can change AIWG policy.

AIWG redacts known bearer values and does not include them in Mission, activity,
or audit evidence. It cannot prove that a remote server isolates provider
credentials, enforces object ownership, deletes transcripts, or follows a
particular retention schedule. Obtain those guarantees from the endpoint
operator and qualify them independently. See the
[UHP client threat model](security/uhp-client-threat-model.md) for the complete
boundary and residual risks.

## `2026-08-11` limitations and deliberate compromises

- The version is date-pinned and has no negotiation. This avoids silent
  semantic drift but makes an endpoint supporting only a newer or older version
  unavailable until AIWG is upgraded.
- AIWG is a client subset, not a server or a UHP conformance suite. The CLI is
  intentionally smaller than the typed client API.
- Disconnect recovery depends on a known response id and server-side stored
  responses. An ambiguous submission with no recoverable id remains unknown.
- Cancellation is eventually observed; a cancel request alone is not terminal.
- Capability discovery is necessary but cannot prove honest behavior from a
  malicious or broken server.
- Application URL checks reduce SSRF risk but do not replace proxy, DNS-rebinding,
  firewall, and workload-isolation controls.
- Default CI uses deterministic offline qualification. Two-principal object
  isolation, endpoint retention, and provider-credential isolation require an
  explicitly authorized live environment.
- UHP's OpenAI Responses-compatible concepts do not make arbitrary OpenAI
  Responses endpoints UHP servers; UHP version, discovery, harness, session,
  event, and file rules still apply.

## Upgrade procedure

1. Read the new UHP specification, schema, versioning notes, and conformance
   changes. Compare lifecycle states, errors, event order, identifiers, files,
   and capability classes with `2026-08-11`.
2. Add the new date as a separate adapter/schema version. Do not replace the
   existing constant or weaken response-header validation in place.
3. Update typed codecs, Mission mappings, fixtures, hostile-input cases, and
   contract-diff baselines. Classify every semantic loss or breaking change.
4. Run `npm run test:uhp:offline` and the repository test/build gates.
5. Qualify against an immutable HarnessRouter image digest or another explicitly
   identified UHP implementation with `npm run test:uhp:live`; cost-bearing
   task execution remains separately opt-in.
6. Review credentials, endpoint trust, retention, artifact handling, and
   rollback before enabling the new version in a named profile. Keep the old
   adapter available for its declared compatibility window.

## Protocol and implementation sources

- [UHP `2026-08-11` specification](https://github.com/HarnessRouter/harnessrouter/tree/main/protocol/versions/2026-08-11)
- [UHP machine-readable schema](https://github.com/HarnessRouter/harnessrouter/blob/main/protocol/schema/uhp-2026-08-11.schema.json)
- [HarnessRouter Community Edition](https://github.com/HarnessRouter/harnessrouter)
- [AIWG UHP architecture decision](https://github.com/jmagly/aiwg/blob/main/docs/architecture/adr-uhp-remote-harness-transport.md)
- [AIWG UHP client threat model](security/uhp-client-threat-model.md)
- [Canonical Mission Protocol decision](https://github.com/jmagly/aiwg/blob/main/docs/architecture/adr-mission-protocol-v1.md)
