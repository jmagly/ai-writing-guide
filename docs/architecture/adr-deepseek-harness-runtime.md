# ADR: DeepSeek Harness runtime boundary

- Status: Accepted
- Date: 2026-09-05
- Issues: #2160, #2162, #2163, #2164, #2165, #2166, #2167, #2290

## Context

The inspected Harness baseline exposes headless, SDK JSON-RPC, ACP, TypeScript
SDK, and Python SDK surfaces. The product is a developer preview, the profiles
have different authority and lifecycle contracts, and the standalone
`sdk-minimal` example grants `danger-full-access`. AIWG needs deterministic
automation without making one preview transport look stable or allowing an LLM
route name to become the AIWG provider identity.

## Decision

AIWG integrates DeepSeek Harness as an experimental exact-version-gated
provider. One-shot work uses the `headless` profile; programmatic work uses the
newline JSON-RPC `sdk` profile. Both receive the checked-in safe project patch
plus a separate ephemeral provider-route patch.

The SDK path validates the three request responses, retains the four native
notification families, exposes normalized lifecycle summaries, and settles
only after the root agent is idle and every observed in-process child is
finished. Harness has no JSON-RPC cancellation request in this baseline;
cancellation and timeouts therefore terminate the owned subprocess, escalating
from SIGTERM to SIGKILL if required. JSON-RPC stdout and diagnostic stderr stay
separate.

AIWG owns only `AGENTS.md`, `.agents/skills`, and
`.dsh/aiwg.cordis.patch.yml`. It does not mutate user settings, managed
credentials, or profile patches. Credential references and context projection
are separate change surfaces. Runtime credential values enter an allowlisted
child environment, never arguments, files, provenance, or session fixtures.

Native v2 session import accepts bounded raw JSONL only and redacts request,
tool, reasoning, and unknown-plugin payloads. Compressed histories require a
reviewed raw export.

## Rejected alternatives

- `sdk-minimal` was rejected because its example policy grants unrestricted
  filesystem authority.
- ACP was not selected because AIWG needs Harness-specific session-tree and
  provider/model provenance that the narrower editor interoperability boundary
  does not expose directly.
- The Python SDK was not selected as a second production implementation because
  it speaks the same runtime protocol and would double lifecycle and packaging
  maintenance without adding a capability.
- Direct TypeScript SDK dependency was deferred because the qualified Harness
  prereleases are not an AIWG dependency. The bounded line client preserves the
  reviewed wire contract without silently upgrading it.
- TUI or Web output scraping was rejected because it mixes presentation with
  protocol state and cannot provide deterministic settlement.

## Consequences

This preserves upstream profile behavior, supports deterministic headless and
SDK automation, and makes OpenRouter testing possible without persisting its
token. It also means the integration must be requalified for a new Harness
version or JSON-RPC/session schema, and MCP configuration remains outside
AIWG's mutation boundary until a merge-safe Cordis adapter is available.

The pinned keyless fixture covers prompt, question, tool, workflow, background
job, child-agent, final response, idle settlement, CRLF framing, cancellation,
timeout, malformed frames, and output bounds. The separate OpenRouter smoke is
network-off by default, creates disposable home/workspace roots, records the
exact supported Harness version, and scans both output channels for the
injected credential value.
