# Agentic Sandbox activity v1 contracts

AIWG mirrors the Agentic Sandbox activity contracts so Cockpit, MCP clients,
and downstream conformance consumers validate the same evidence shape without
network access. Agentic Sandbox owns the canonical schemas; AIWG owns the
Cockpit boundary policy that admits metadata-only, exactly scoped events.

The declared upstream revision is recorded in
`schemas/activity/upstream-contract.json`. For `v2026.8.3`, the exact source is
commit `201221e5a26f7f0cc719ab584520ce3164065825`:

- `docs/schemas/activity-event-v1.schema.json`
- `docs/schemas/activity-operational-evidence-v1.schema.json`

## Updating the mirror

1. Select an immutable Agentic Sandbox tag and resolve its commit.
2. Copy both schema files byte-for-byte into `schemas/activity/` and
   `apps/cockpit/bridge/contracts/`.
3. Update the tag, commit, source paths, and SHA-256 values in
   `schemas/activity/upstream-contract.json`.
4. Bring valid and invalid fixtures forward when the contract changes. Never
   copy credentials, terminal content, environment values, or bearer material
   into fixtures.
5. Run `npm run test:conformance -- test/conformance/activity-v1/schema.test.mjs`,
   the Cockpit Bridge integration tests, and an npm pack inventory check.

The parity test fails if either checked-in copy changes without a reviewed
manifest update. Cockpit validates every timeline/export event against the
runtime schema copy, then applies correlation-scope and restricted-field
policy. Additive fields may appear on response envelopes, but event fields
remain governed by the upstream schema revision.
