# Cockpit Trust & Security

Cockpit's security model has two independent layers: **local shell↔Bridge
auth** (who may drive Cockpit) and **transport posture visibility** (how much
to trust each instance's link to the executor). Keeping them separate is
deliberate — a green local session tells you nothing about a degraded
instance transport, and vice versa.

## Local auth: token, CSRF, origin

Every Bridge launch mints a fresh random bearer token. All `/api` requests
must pass, in order:

1. **Origin check** — browser requests must originate from the Bridge's own
   loopback origin.
2. **Bearer token** — `Authorization: Bearer …` (or `?token=` for
   EventSource), compared constant-time.
3. **CSRF** — mutating verbs with an Origin must echo the token in an
   `x-cockpit-csrf` header (the served app receives it via a
   `SameSite=Strict` cookie).
4. **Real-executor assertion** — requests are refused when the upstream looks
   like the test mock, unless a test harness explicitly allows it.

The UI receives the token by injection into the served page
(`window.__COCKPIT_TOKEN__`); shells receive it through the runtime handshake
below.

## Executor identity and PTY custody

A protected agentic-sandbox executor uses a distinct upstream operator bearer.
Set `AIWG_COCKPIT_EXECUTOR_TOKEN_FILE` to a regular file that contains exactly
one token and is inaccessible to group/other users (mode 600 on POSIX). The
Bridge reads that file for each upstream operation, so an atomic replacement
rotates the credential without a restart. Missing, malformed, or over-broad
files fail closed; upstream 401/403 responses remain explicit authorization
errors.

The executor bearer never enters HTML, browser state, WebSocket URLs, Cockpit
audit JSON, or process arguments. REST/A2A calls receive the header inside the
Bridge. PTY sockets also terminate at the Bridge: the browser presents only the
per-launch Cockpit token as a private WebSocket subprotocol, which the Bridge
removes before adding the executor bearer to the upstream upgrade. Attach
targets are opaque, in-memory, same-executor mappings restricted to the formal
`/agents/:id/sessions/:id/attach` shape.

## Sandbox CA and mTLS readiness

Cockpit reads agentic-sandbox
`GET /api/v2/admin/bootstrap/readiness` through the Bridge and projects only
client-safe refs: CA provider ref, trust-bundle ref, client identity ref,
rotation state, expiry/freshness, missing-material codes, and recovery text.
It does not persist PEM bodies, private keys, CSRs, bearer tokens, or raw
filesystem credential paths in browser state or registry summaries.

Default local development remains visible as `plaintext-dev`/`disabled` when
the sandbox readiness endpoint is absent or reports no CA provider. Set
`AIWG_COCKPIT_REQUIRE_SANDBOX_MTLS=1` for operator runs that must fail closed:
all `/api/*` Bridge calls return `503 executor_trust_required` until sandbox
readiness is `secure` and required CA/bootstrap material is present.

Rotation/reload recovery is intentionally stable for UI and runbook use:
refresh the sandbox CA/bootstrap readiness, rotate stale trust material, then
reload Cockpit. Replacing the executor bearer file remains separate from CA
rotation; both can change without exposing secret values to the web app.

Sandbox MCP discovery is treated as display-safe metadata: tool names,
resource/template descriptors, protocol version, transport posture, scopes,
and principal hints. Calling the sandbox MCP endpoint through Cockpit is a
separate proxy path and requires `AIWG_COCKPIT_MCP_TOKEN_FILE`, so the browser
never receives the MCP principal bearer.

## Token custody

`aiwg cockpit` writes `~/.aiwg/cockpit/runtime/bridge.json` (file mode 600,
directory 700) containing the port and either the token or — preferred — a
**keychain reference**. Backends: macOS Keychain (`security`), Windows
Credential Manager (`cmdkey`), libsecret (`secret-tool`), and opt-in KWallet.

Strictness knobs:

- `AIWG_COCKPIT_KEYCHAIN_STRICT=1` — never leave a plaintext token in the
  runtime file when a keychain ref exists, and refuse to launch if the
  keychain fails; shell-core likewise refuses runtime files that carry only a
  plaintext token.
- `AIWG_COCKPIT_REQUIRE_KEYCHAIN=1` — fail launch on keychain store failure.
- `AIWG_COCKPIT_KEYCHAIN_DISABLED=1` — skip the keychain (plaintext runtime
  file only; for constrained environments).

## Posture badges (what the UI is telling you)

### Runtime isolation

Each instance reports a runtime kind; Cockpit renders the executor-reported
tier rather than assuming:

| Kind | Isolation badge |
|---|---|
| `host` | `least` — full host access; the host-runtime daemon's own status is shown separately |
| `container` / `docker` | `shared-kernel` |
| `vm` / `qemu` / `kvm` | `strong` — hardware boundary |
| anything else | `opaque` / `unknown` — degraded display, not a broken UI |

### Transport trust

A separate badge for the instance↔executor link:
`secure` (e.g. mTLS local CA) · `local` (e.g. UDS, vsock, loopback) ·
`compatibility` (legacy shared-secret, TOFU) · `degraded` · `unknown`, plus
the concrete mode string and a staleness flag. Legacy paths deliberately
render as compatibility/degraded — never default-green. Agentic-sandbox owns
transport provisioning and peer identity; Cockpit owns visibility and audit
presentation, and stores no executor tokens, keys, CSRs, or bearer material in
UI state, logs, or activity payloads.

The inventory view also shows sandbox bootstrap trust above the table:
`Sandbox mTLS ready`, `Sandbox trust degraded`, or `Plaintext dev mode` /
`Sandbox trust disabled`. These states are executor-wide bootstrap posture,
not proof that every individual agent transport is healthy.

### Host daemon

For host-runtime targets the daemon status renders independently of the
Bridge: `available`, `stopped`, `permission_denied`, `degraded`, `detected`,
`unavailable`, `unknown`. When operator action is needed, Cockpit shows the
documented command — it never silently installs or starts the daemon.

### Health

A running runtime whose agent registration has vanished renders
**`agent unreachable`** (and stays listed) rather than disappearing — the
entry point to [Recovery](./recovery.md).

## Sessions: observe-first authority

Attach starts as **observer** with stdin disabled; taking control is an
explicit, visible role upgrade. Approval decisions in the Approvals tab are
operator authorization, posted through the gated Bridge. See
[Sessions](./sessions.md).

## Audit log

Operator decisions are recorded locally at
`~/.aiwg/cockpit/audit/events.jsonl` (file 600, dir 700): instance lifecycle,
launches, reconnects, destroys, task cancels, session creates, approval
responses, index rebuilds, and action injections (recorded as operator
intents by the UI). Fast-start requests and MCP proxy events are recorded with
opaque refs and redacted metadata. Entries are **redacted before write** — secret-looking
keys and values (tokens, API keys, bearer/`sk-`/GitHub-token shapes) never
land on disk. The full event list is in
[Bridge API → Audit events](./bridge-api.md#audit-events).

## Library boundary

The Library holds operator-owned copies under `~/.aiwg/cockpit/library`.
Catalog access is read-only; **AIWG install files are never written or
overwritten** by any library operation, and library paths are sandboxed
against traversal.

## Standing security proofs

Two proof-of-concept gates run in CI with every Cockpit check
(`npm run poc`): a Bridge kill-isolation proof (killing the Bridge leaves
executor sessions alive — control plane and data plane genuinely separate)
and a security-checks suite (auth, origin, injection surfaces). The mock
executor these use is test-only ([Development](./development.md#the-mock-boundary)).
