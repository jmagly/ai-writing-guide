# Factory/Droid session acquisition

AIWG supports Factory under canonical provider `factory`.

The always-available local surface is the documented, project-grouped transcript
referenced by Droid hooks (`~/.factory/projects/.../<session-id>.jsonl`). Authorize
the relevant projects root and import an explicit file:

```sh
aiwg sessions import ~/.factory/projects/<project>/<session>.jsonl \
  --provider factory --source-id factory-session
```

The adapter preserves text, reasoning, tool calls and results, image descriptors,
settings, native IDs, product/schema versions, workspace classification, and additive
unknown fields. Active files and incomplete mutable tails remain provisional so a later
quiescent import can retry the final record. Terminal, archived, and deleted evidence
remains distinct.

## Optional transports

Factory's organization Sessions API is enabled only for selected organizations, and
`droid exec` is a separately configured streaming surface. AIWG never assumes either
is available. A caller must supply a matching transport and explicitly authorize:

- an account plus network operation `factory.sessions.read` for the Sessions API;
- an account plus network operation `factory.exec.stream` for Droid Exec.

Without both negotiation and authorization the adapter fails closed. The standard CLI
command imports local JSONL only and does not read credentials or initiate network
operations.

## Version, safety, and deletion

- Adapter/source schema tested: `1.0.0`.
- Unknown major schemas and mixed versions fail before normalized state is written.
- Bounded readers enforce file authorization, regular-file policy, size, record, and
  nesting limits.
- Importing or deleting AIWG's normalized copy never mutates Droid transcripts, Factory
  web sessions, API sessions, or organization data.
- Provider deletion guarantees are not inferred from local file removal; users should
  follow their organization's Factory retention policy.

## Evidence

Verified 2026-07-27 against:

- [Factory hooks reference](https://docs.factory.ai/reference/hooks-reference)
- [Factory settings](https://docs.factory.ai/cli/configuration/settings)
- [Factory Sessions API: get messages](https://docs.factory.ai/api-reference/sessions/get-session-messages)
- [Factory CLI reference](https://docs.factory.ai/reference/cli-reference)
- [Factory release notes](https://docs.factory.ai/changelog/release-notes)

All tests use synthetic fixtures covering structured content, settings, unknown records,
mutable tails, malformed input, unknown-major drift, redaction, replay, and deletion
limitations.
