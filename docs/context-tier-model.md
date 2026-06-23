# AIWG Context Tier Model

AIWG provider context is generated as a three-tier loading model so default agent startup context stays small while preserving reliable routing.

## Tier 1: Always-Loaded Orientation

Tier 1 is the provider-facing bridge: `AGENTS.md`, `WARP.md`, `.hermes.md`, `.github/copilot-instructions.md`, root `AIWG.md` hooks, and the normalized `.aiwg/AIWG.md` finalization block.

Tier 1 may contain:

- The current workspace snapshot.
- The Discover-First Protocol.
- The Tier 1 / Tier 2 / Tier 3 loading contract.
- Pointers to `aiwg discover` and `aiwg show`.
- Very small provider-specific caveats.

Tier 1 must not contain:

- Full skill, rule, agent, behavior, or framework bodies.
- Long duplicated rule indexes.
- Worked examples except short routing examples.
- Provider directory traversal instructions as the primary lookup path.

## Tier 2: Quickref Routing Summary

Tier 2 is a compact quickref-style summary that an agent can keep in context while deciding what to load next.

Each Tier 2 entry follows this schema:

- Purpose.
- When to use.
- When not to use.
- Curated `aiwg discover` phrases.
- Deep-load target using `aiwg show <type> <name>`.
- Acceptance or verification cue.

Tier 2 summaries may include bounded counts and a small sample of deployed IDs. They must not inline provider file paths or copied long-form bodies. The generated provider bridge emits this summary from the deployed `agents`, `rules`, `skills`, and `behaviors` sections.

## Tier 3: Deep Reference

Tier 3 is the full body of the relevant skill, rule, agent, behavior, framework documentation, examples, or reference material.

Tier 3 is loaded only when:

- `aiwg discover "<intent>"` identifies a matching capability and `aiwg show <type> <name>` fetches it.
- A user explicitly invokes a named skill or command.
- A loaded Tier 2 quickref points to a named deep-load target.

Do not remove Tier 3 material to reduce default context size. Externalize it and make the route to it precise.

## Regeneration Guidance

Generated provider context should prefer maps, anchors, and curated discovery phrases over copied content. When adding new generated context:

- Put cross-cutting orientation in Tier 1 only when every provider turn needs it.
- Put routing decisions and discover phrases in Tier 2.
- Put procedures, examples, and domain-specific detail in Tier 3.
- Add a regression test or `tools/lint/context-size-guard.mjs` measurement when the generated bridge grows.
- Preserve direct lookup through `aiwg discover` / `aiwg show`; do not require agents to enumerate provider directories from memory.

Existing framework quickrefs such as `aiwg-utils-quickref`, `sdlc-quickref`, `research-quickref`, and `ops-quickref` are the model for Tier 2 content: small enough to keep loaded, specific enough to route, and explicit about when to load deeper material.
