---
enforcement: high
paths: ["src/**", "schemas/**", "agentic/code/**", ".aiwg/requirements/**", ".aiwg/architecture/**"]
---

# Schema-First Data Contracts

When work introduces or changes persistent, exchanged, configured, queued,
evented, imported/exported, or structured user-authored data, define or evolve a
governed schema by default. A TypeScript interface, prose table, example JSON,
or handwritten validator alone does not satisfy this requirement.

Required evidence: schema brief, one canonical authority, catalog identity and
owner, consumers, valid/invalid fixtures, compatibility disposition, and
projection verification. An opt-out must name the ephemeral internal boundary,
owner, rationale, and review date. Ambiguity selects schema creation, not opt-out.
