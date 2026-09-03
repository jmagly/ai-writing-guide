# Authoring and Evolving Schemas

1. Choose a stable logical name, semantic version, owner, and canonical path.
2. For JSON Schema, use draft 2020-12, a unique
   `https://aiwg.io/schemas/...` `$id`, and strict-compatible keywords.
3. Run `npm run schema:catalog`; inspect the generated domain manifest rather
   than editing it by hand.
4. Declare consumers, dependencies, fixtures, compatibility policy, and any
   generated/copy paths as projections in the owning domain manifest.
5. Run `npm run lint:schemas`, focused fixture/parity tests, and `npm run typecheck`.

Use `aiwg schema list|show|graph|policy` for discovery and `aiwg schema validate`,
`lint`, `check-refs`, `diff`, `compatibility`, `generate`, and
`verify-projections` for control-plane operations. Results use versioned JSON
envelopes suitable for CI.

Never reuse an identifier for a different contract, hand-edit a projection, or
add a remote `$ref`. Narrowing accepted values, adding required properties,
removing properties/enum members, or forbidding previously allowed properties is
breaking and requires a new version plus migration guidance. An `unknown`
compatibility result requires maintainer review.

Temporary strict-mode exceptions belong in
`schemas/policy/strict-exceptions.json`; every entry needs scoped rationale,
ownership, approval, and an expiry date. Expiry is a remediation deadline, not a
permanent waiver.
