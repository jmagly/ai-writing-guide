# ADR-023: Contributor Discovery Convention

## Metadata

- **ADR ID**: ADR-023
- **Status**: Proposed
- **Date**: 2026-04-27
- **Author(s)**: Joseph Magly
- **Reviewers**: Architecture Review Board

## Phase 1: Core Decision

### Title

Adopt a Per-Consumer Contributor Convention for Cross-Framework Aggregation

### Status

**Current Status**: Proposed

**Decision Date**: 2026-04-27

**Supersedes**: None

### Context

**Problem**: Two open issues — Gitea #928 (`project-status` cross-framework aggregator) and Gitea #929 (`best-practices-audit` research-grounded validator) — both need a way for installed frameworks, addons, and extensions to opt into a shared cross-framework command. Each issue independently proposes its own discovery mechanism. Designing the convention twice would lock in inconsistencies and double the surface area future consumers (security, compliance, performance) would have to learn.

A single discovery convention, scoped generically and validated against the two known consumers, lets future cross-framework commands plug in without re-litigating the basics.

**Constraints**:

- Must coexist with the existing extension types (agents, skills, commands, rules, templates) — not replace them
- Must work across all 10 supported providers without per-provider deployment changes (contributors are framework source, not provider artifacts)
- Must support project-local overrides without forking a framework (parity with how rules and skills already support project-local additions)
- Must not require code execution at discovery time (sandboxing and audit cost are too high)
- Must validate strictly enough to catch drift at deploy time, not at the user's first invocation

**Stakeholders**:

- AIWG core: owns the discovery loop and validation
- Framework authors: ship contributors for their domains
- Project users: get unified cross-framework reporting without manual integration
- Future consumer authors: want one well-documented convention, not N

### Source Verification & Claim Tracking

| Claim | Source | Verified | Date |
|-------|--------|----------|------|
| `project-status` is currently SDLC-specific | `agentic/code/frameworks/sdlc-complete/skills/project-status/SKILL.md` exists; no equivalent in other frameworks | ✅ Yes | 2026-04-27 |
| AIWG already supports project-local overrides for rules/skills | `aiwg use` source-of-truth conventions | ⬜ No | — |
| The two known consumers (status + research) have meaningfully different frontmatter needs | Issue bodies #928 and #929 | ✅ Yes | 2026-04-27 |
| Markdown + YAML frontmatter is the established AIWG convention for skills/agents/commands | Skills, agents, commands all use this format | ✅ Yes | 2026-04-27 |

**Unverified claims** (must be resolved before L2 — Reviewed):
- [ ] Verify project-local override pattern for rules/skills against current `aiwg use` implementation

## Phase 2: Decision & Alternatives

<details>
<summary>Decision rationale and alternatives considered</summary>

### Decision

**What we are deciding to do:**

Adopt a generic **per-consumer contributor convention** for cross-framework aggregation. Frameworks, addons, and extensions opt into a cross-framework command by shipping a contributor file at a well-known path; project-local custom contributors are also discovered. The aggregator validates each contributor against the consumer's published JSON schema and skips invalid ones with a warning.

**Conventions:**

- **File format**: Markdown with YAML frontmatter (matches skills/agents/commands)
- **Layout**: One directory per consumer kind, named after the consumer
  - `agentic/code/frameworks/<name>/status/contributor.md`
  - `agentic/code/frameworks/<name>/research/contributor.md`
  - Same pattern under `agentic/code/addons/<name>/...` and `agentic/code/extensions/<name>/...`
- **Filename**: Always `contributor.md` (singular, fixed name; one contributor per consumer per framework)
- **Detection**: Declarative globs and counts in frontmatter — no script execution
- **Output voice**: Descriptive only — contributors emit observed state; the aggregator does not surface prescriptive next-action arrays
- **Schema location**: Each consumer publishes its frontmatter JSON schema next to its skill (e.g. `agentic/code/addons/aiwg-utils/skills/project-status/contributor.schema.json`)
- **Schema validation**: Strict — `aiwg validate-metadata` rejects malformed contributors at deploy time
- **Caching**: None — always re-scan; revisit only if measurement shows scans are expensive
- **Failure mode**: A contributor that fails validation, or whose detection throws, is skipped and logged; aggregation continues with the rest
- **Project-local discovery**: In addition to the framework registry, the aggregator scans `.aiwg/contributors/<kind>/*.md` so project-specific contributors do not require forking a framework

**Reference contributor frontmatter (status kind):**

```markdown
---
kind: status
domain: SDLC
description: SDLC phase, iteration progress, open risks, next actions
detect:
  glob:
    - .aiwg/requirements/*.md
    - .aiwg/architecture/*.md
  minCount: 1
fields:
  phase: { type: string, source: ".aiwg/planning/current-phase.md", regex: "^Phase: (.+)$" }
  iteration: { type: number, source: ".aiwg/planning/iteration.md", regex: "^Iteration: (\\d+)$" }
  open_risks: { type: number, source: ".aiwg/risks/register.md", count: "^- " }
---

# SDLC Status Contributor

[Human-readable description of what this contributor reports and how to interpret it.]
```

**Reference contributor frontmatter (research kind):**

```markdown
---
kind: research
domain: SDLC artifacts
description: Validates SAD, ADR, and use case claims against current practice
detect:
  glob:
    - .aiwg/architecture/software-architecture-doc.md
    - .aiwg/architecture/decisions/ADR-*.md
  minCount: 1
sources:
  preferred: [ietf, w3c, owasp, vendor-docs]
  exclude: [seo-spam, ai-content-farms]
focus_areas: [security, performance, api-design, testing]
recency_default_months: 18
---

# SDLC Research Contributor

[Human-readable description of what this contributor researches and which sources it weighs.]
```

### Alternatives Considered

#### Alternative A: Single `contributors/` directory with typed entries

A single `agentic/code/.../contributors/status.md` and `contributors/research.md` per framework, distinguished by `kind:` frontmatter.

- **Pros**: One discovery loop covers all consumer kinds; easier to scan and lint
- **Cons**: Couples unrelated consumers in one directory; harder to grant a future addon to "ship status only" cleanly; conflict potential when multiple authors touch the same dir
- **Why rejected**: Stakeholder preference for explicit per-consumer ownership

#### Alternative B: Inline in `manifest.json`

Frameworks declare both contributors directly in their manifest under a `contributors:` key.

- **Pros**: No new files; everything in one manifest
- **Cons**: Manifests grow unbounded; loses the markdown-frontmatter pattern that makes skills/agents/commands hand-editable; harder to override project-locally
- **Why rejected**: Inconsistent with the rest of AIWG's source layout

#### Alternative C: Pure script-based detection

Contributors ship `detect.mjs` that returns confidence scores.

- **Pros**: Maximum flexibility (e.g. parsing `package.json` to detect a JS project)
- **Cons**: Requires a sandbox, slows discovery, expands the audit surface, opens supply-chain risk
- **Why rejected**: Declarative globs cover 95% of detection needs; an opt-in script escape hatch can be added later if measurement shows it's needed

#### Alternative D: Scope the convention to just status + research

Document only the two known cases without claiming a general mechanism.

- **Pros**: No risk of over-design
- **Cons**: When the third consumer arrives (security, compliance, performance), the convention has to be re-litigated; existing two contributors likely need backwards-incompatible updates
- **Why rejected**: The two known consumers already have meaningfully different frontmatter needs, so a generic mechanism is the cheapest design that handles both

</details>

## Phase 3: Impact & Implementation

<details>
<summary>Implementation sketch, concurrency, testing, definition of done</summary>

### Implementation Sketch

#### Key Type Definitions

```ts
// src/contributors/types.ts

export type ContributorKind = 'status' | 'research' | string; // open string for future kinds

export interface ContributorBase {
  kind: ContributorKind;
  domain: string;
  description: string;
  detect: DetectionSpec;
}

export interface DetectionSpec {
  glob: string[];          // glob patterns relative to project root
  minCount?: number;       // minimum matched files for "in use" (default 1)
  conditions?: Record<string, string>; // future: regex match against file content
}

// Per-kind extension via JSON schema lives next to each consumer skill.
// Consumers extend ContributorBase with kind-specific frontmatter fields.
```

#### Discovery Algorithm

```ts
// src/contributors/discover.ts (high level)

export async function discoverContributors(kind: ContributorKind, projectRoot: string) {
  const sources: ContributorSource[] = [];

  // 1. Walk installed frameworks/addons/extensions from .aiwg/frameworks/registry.json
  const installed = await readRegistry(projectRoot);
  for (const entry of installed) {
    const path = join(entry.sourcePath, kind, 'contributor.md');
    if (existsSync(path)) sources.push({ origin: entry.name, path });
  }

  // 2. Walk project-local contributors
  const localDir = join(projectRoot, '.aiwg/contributors', kind);
  for (const file of await glob(`${localDir}/*.md`)) {
    sources.push({ origin: 'project-local', path: file });
  }

  // 3. Parse, validate against the consumer's JSON schema, run detection
  const valid: ContributorRecord[] = [];
  for (const src of sources) {
    try {
      const parsed = await parseContributor(src.path);
      validateAgainstSchema(parsed, kind);  // throws on schema violation
      const inUse = await runDetection(parsed.detect, projectRoot);
      if (inUse) valid.push({ ...parsed, origin: src.origin });
    } catch (err) {
      logSkip(src, err);                    // skip + warn, do not abort
    }
  }
  return valid;
}
```

#### Integration Points

- **`src/contributors/discover.ts`** — new module; re-exported from `src/cli/handlers/project-status.ts` (#928) and `src/cli/handlers/best-practices-audit.ts` (#929)
- **`aiwg validate-metadata`** — extended to walk every `*/contributor.md` it can find, validate against the matching consumer's `contributor.schema.json`, and report failures non-zero
- **`agentic/code/addons/aiwg-utils/skills/project-status/`** — gains `contributor.schema.json` plus an embedded `status/contributor.md` so SDLC-only projects keep working without other contributors installed

#### Error Types

```ts
export class ContributorValidationError extends Error {
  constructor(public path: string, public details: SchemaError[]) { super(...); }
}

export class ContributorDetectionError extends Error {
  constructor(public path: string, public cause: unknown) { super(...); }
}
```

Both are caught at the discovery boundary and logged; never propagated to the user as a hard failure.

### Concurrency and Shared State Model

**Shared state**: None. Each contributor is read independently; results are accumulated into a single in-memory array per aggregator invocation.

**Clone semantics**: N/A — discovery returns plain data (`ContributorRecord[]`) with no shared references.

**Thread safety**: All discovery is single-threaded I/O. If a future implementation parallelizes file reads, contributors must not mutate shared state — the contract is "read frontmatter, run globs, return a record."

**Lock contention**: None expected. If detection ever grows expensive enough to parallelize, a per-contributor concurrency cap is preferable to file-level locking.

### Testing Strategy

**Mock boundaries**:
- File system: real (use a temp-dir fixture per test) — globs against mocked FS hide real-world bugs
- Network: N/A
- Schema validation: real (use the actual JSON schema)

**Key test patterns**:

1. **Discovery + validation happy path**: scaffold a fake framework with a valid `status/contributor.md`, run `discoverContributors('status', fixture)`, assert one record returned with parsed frontmatter intact.
2. **Schema rejection**: write a contributor with a missing required field, run discovery, assert the contributor is skipped, the warning is logged, and the rest of discovery continues.
3. **Detection negative**: contributor declares `glob: ['nonexistent/**']`, assert the contributor is silently filtered out (not in-use, no warning).
4. **Project-local override**: scaffold `.aiwg/contributors/status/local.md`, assert it appears in the result with `origin: 'project-local'`.
5. **Multiple frameworks**: install two frameworks each shipping a status contributor, assert both are returned in registry order.

**Regression indicators**:

| Symptom | Catching test |
|---------|---------------|
| Schema drift silently breaks contributors | Schema rejection test fails |
| Project-local discovery breaks after registry refactor | Project-local override test fails |
| Detection-throw aborts the whole aggregator | Detection-throw test asserts `valid.length > 0` after a thrower contributor |

### Definition of Done

| Level | Criteria |
|-------|----------|
| **L1 — Proposed** | This ADR exists; both consumers (#928, #929) link to it; alternatives are documented; no code yet |
| **L2 — Reviewed** | All unverified claims resolved; one reviewer beyond the author has signed off; the two reference contributor frontmatter blocks have been validated against draft JSON schemas |
| **L3 — Accepted** | A working SDLC `status/contributor.md` is shipped with `aiwg-utils/skills/project-status/`; `aiwg validate-metadata` enforces the schema; the discovery module passes all five test patterns above |
| **L4 — Implemented** | The aggregator (#928) consumes contributors end-to-end with at least 3 framework contributors landed (SDLC, research-complete, media-curator); project-local discovery proven on a real project |
| **L5 — Verified** | `best-practices-audit` (#929) reuses the same discovery module without modification; no additional contributor pattern is introduced |

## Consequences

**Positive**:

- One convention serves all current and future cross-framework aggregators
- Frameworks opt in with a single file; no central registry edit required
- Strict schema validation catches drift at deploy time, not at user invocation
- Project-local overrides without forking
- No script execution keeps the audit and supply-chain surface flat

**Negative**:

- Adds a new directory convention (`<framework>/<kind>/contributor.md`) that framework authors must learn
- Per-consumer JSON schema means the schema lives separately from contributor authors' files; a stale schema can mismask drift
- Declarative-only detection cannot handle every conceivable "is this in use" question; consumers may eventually want a script escape hatch

**Risks**:

- **Convention spread without discipline**: future consumer authors might invent ad-hoc frontmatter without publishing a schema. Mitigation: `aiwg validate-metadata` refuses to load contributors for a kind whose schema is missing.
- **Project-local supply-chain**: a malicious project-local contributor cannot execute code, but its detection globs and reported state could mislead the aggregator. Mitigation: the aggregator stamps `origin:` on every result so reports always show whether a finding came from a framework or from project-local content.

</details>

## References

- Gitea #928 — Expand `project-status` into cross-framework status aggregator (consumer of this ADR)
- Gitea #929 — `best-practices-audit` research-grounded validator (consumer of this ADR)
- `agentic/code/frameworks/sdlc-complete/templates/governance/adr-template.md` — template used here
- Existing AIWG conventions: skills/agents/commands all use markdown + YAML frontmatter
