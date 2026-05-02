# ADR: Override / Shadowing Policy and Safety-Critical Denylist

## Status

**PROPOSED** — companion to [#1038](../../../../issues/1038); blocked by [#1042](../../../../issues/1042); required by [#1036](../../../../issues/1036)

## Date

2026-05-01

## Context

### Trigger

Project-local artifacts can have the same `id` as an upstream artifact, in which case one wins on deploy. The original [#1033](../../../../issues/1033) spec said "project-local wins" — which is correct as a default (it is the override semantic operators expect) but also describes precisely the supply-chain shadowing pattern that AIWG's safety-critical rules are designed to defend against. The threat model ([#1042](../../../../issues/1042)) called out shadow-of-safety as a CRITICAL surface: a checked-in project-local rule could silently shadow upstream `human-authorization`, `no-attribution`, `citation-policy`, or any other safety-critical rule, producing an agent loop that does not enforce the safeguard.

This ADR defines the policy that allows operators to legitimately override upstream artifacts while making safety-critical shadowing impossible to do silently.

### What "shadow" means

A shadow occurs when two artifacts share the same `id` but live at different sources. Example: upstream ships `agentic/code/addons/aiwg-utils/rules/human-authorization.md` (id: `human-authorization`); a project drops `.aiwg/extensions/foo/rules/human-authorization.md` (id: `human-authorization`). On `aiwg use`, only one of them deploys to `.claude/rules/human-authorization.md`. Whichever wins is the one the agent runtime actually sees.

### Threat model anchor

[#1042](../../../../issues/1042) §T1 (shadow-of-safety) is the load-bearing threat for this ADR. The mitigation chain there has four steps; this ADR defines steps 1–3 in detail (step 4, cryptographic signing, is out of scope future hardening).

### Scope boundary

This ADR defines:
- Default precedence chain on collision
- The data-driven safety-critical denylist mechanism
- The `overrides:` manifest field and its validation rules
- Failure modes (what `aiwg use` does when each rule fires)

It does NOT:
- Implement the resolver (that is [#1036](../../../../issues/1036))
- Define the `safety-critical` and `overrides` fields in the manifest schema in detail (that is [#1044](../../../../issues/1044) — this ADR specifies their semantics, [#1044](../../../../issues/1044) specifies their wire format)

## Decision

### 1. Default Precedence Chain

When two or more artifacts share the same `id`, the resolver picks a winner using this strict ordering:

```
project-local  >  git-installed  >  cache  >  bundled
```

Where:

- **project-local**: `.aiwg/<type>/<name>/` with `source: 'project-local'` (per [#1040](../../../../issues/1040))
- **git-installed**: `~/.cache/aiwg/packages/...` from `aiwg install owner/repo`, with `source: 'cache'`
- **cache**: same physical mechanism as git-installed but registered with a `cache` source for any non-git pipeline; today this overlaps git-installed
- **bundled**: came from the npm package, with `source: 'bundled'`

Operators expect their project's intent to win over what they pulled from the network or what shipped with the CLI. This default is the operator's authority over their own machine.

### 2. Safety-Critical Denylist — Data-Driven Mechanism

Some upstream artifacts must NOT be silently shadowed. The denylist is **data-driven**, not a hard-coded list, so future safety-critical artifacts can be added without code changes.

#### How upstream declares "safety-critical"

An upstream artifact's `manifest.json` (or, for an artifact whose entire bundle is safety-critical, the bundle's top-level manifest) sets:

```json
{
  "id": "human-authorization",
  "type": "rule",
  "safety-critical": true,
  ...
}
```

When `safety-critical: true` is set, the artifact is on the denylist. Default is `false` — most artifacts are not safety-critical.

#### Initial seed list

The following upstream artifacts are flagged `safety-critical: true` as part of this ADR's adoption:

| Artifact | Path | Why |
|----------|------|-----|
| `human-authorization` rule | `agentic/code/addons/aiwg-utils/rules/human-authorization.md` | Gates irreversible / high-stakes actions |
| `no-attribution` rule | (Core enforcement; `CLAUDE.md` Core Enforcement Rules) | Identity / brand enforcement |
| `token-security` rule | (Core enforcement) | Prevents credential leaks |
| `citation-policy` rule | (Core enforcement) | Prevents fabricated citations |
| `anti-laziness` rule | (Core enforcement) | Prevents test/feature deletion as a shortcut |
| `ci-green-before-done` rule | (Core enforcement) | Release gate |
| `executable-feedback` rule | (Core enforcement) | Test-execution gate |
| `uat-before-release` rule | (Core enforcement) | Release gate |
| `failure-mitigation` rule | (Core enforcement) | Failure-archetype mitigations |

The seed list is initial; future audits or threat-model amendments may add or remove entries by toggling the `safety-critical` flag in the upstream manifest. This ADR does NOT lock the seed list — it locks the mechanism.

The Core Enforcement Rules currently live as documentation in `CLAUDE.md`. Migrating them into rule artifacts with `safety-critical: true` is a separate workstream (call it [#1041](../../../../issues/1041)-extension); for the initial implementation of the denylist mechanism, only `human-authorization` (which already exists as a rule artifact) is enforced.

### 3. The `overrides:` Manifest Field

Project-local artifacts that intend to shadow an upstream artifact MUST declare the intent via the `overrides:` field in their manifest:

```json
{
  "id": "human-authorization",
  "type": "rule",
  "overrides": ["human-authorization"],
  ...
}
```

`overrides:` is an array of upstream `id`s the project-local artifact intentionally shadows. Validation rules:

- Each entry must match an actual upstream `id` (no phantom overrides — surfaced by [#1044](../../../../issues/1044) validation against the upstream registry).
- Maximum 20 entries per manifest (DoS limit).
- Upstream artifacts MUST NOT declare `overrides:` (per [#1038](../../../../issues/1038) E5 — this is one of the asymmetries between project-local and upstream forms).

### 4. Resolver Failure Modes

When `aiwg use` (or `aiwg refresh`) processes a collision, the resolver applies these rules in order:

| Case | Resolver action | Operator-visible signal |
|------|-----------------|--------------------------|
| 1. No collision | Deploy normally | None |
| 2. Collision; project-local wins; **non-safety-critical** upstream | Deploy project-local; emit warning | Warning: `Shadow: <id> — project-local artifact at <localPath> overrides <source-precedence-rank> at <upstream-path>` |
| 3. Collision; project-local wins; **safety-critical** upstream; project-local manifest declares `overrides: [<id>]` | Deploy project-local; emit prominent warning; activity-log entry | **Prominent warning** (multi-line, red in TTY): `SAFETY-CRITICAL SHADOW: <id> overridden by <localPath>. Acknowledge: this disables upstream safeguard <description>. Use 'aiwg doctor' to review all active shadows.` |
| 4. Collision; project-local wins; **safety-critical** upstream; project-local manifest does NOT declare `overrides:` | **Refuse deploy** of the project-local artifact; deploy upstream instead | **Error**: `Refused to shadow safety-critical upstream <id>. Add 'overrides: ["<id>"]' to <localPath>/manifest.json to authorize the override.` |
| 5. `overrides:` declared but no matching upstream `id` exists | **Refuse deploy**; phantom override | Error: `Phantom override: <id> declared in <localPath>/manifest.json but no upstream artifact has that id.` |
| 6. Two project-local artifacts with the same `id` | **Refuse deploy** of both (ambiguity); abort | Error: `Duplicate project-local id: <id> at <pathA> and <pathB>.` |
| 7. `aiwg install owner/repo` brings a git-installed artifact that collides with project-local | Project-local wins per §1; behaves as case 2/3/4 against git-installed | Warning includes git source URL |

### 5. The `--allow-unsafe-shadow` Escape Hatch (Out of Scope for This Iteration)

A future hardening track may add `aiwg use --allow-unsafe-shadow=<id>` for one-off operator approval of safety-critical shadows that could not be expressed via `overrides:` (e.g., shadowing during incident response). This ADR explicitly does NOT add such a flag now; the only path to override a safety-critical artifact is the explicit manifest `overrides:` declaration. If the use case becomes real, it can be added without breaking this ADR's policy.

### 6. Doctor and List Surface

`aiwg doctor` reports for every active shadow:

- `id` of the shadow
- Source paths of project-local and shadowed upstream
- `safety-critical` flag of the shadowed upstream
- Whether the project-local manifest declared the override

`aiwg list --shadows` filters to only artifacts that are currently shadowing something.

### 7. What Is NOT Being Decided Here

- **Cryptographic signing** of safety-critical artifacts: out of scope; threat-model future hardening track.
- **Allowlist of trusted project sources** (auto-trust of certain repos): out of scope.
- **Hash-pinning** of project-local artifacts in `aiwg.config`: out of scope; covered as future hardening in [#1042](../../../../issues/1042).
- **Migrating Core Enforcement Rules** from `CLAUDE.md` documentation into rule artifacts with `safety-critical: true`: separate work; this ADR's mechanism applies as those migrations land.

## Decision Drivers

1. **The default must respect operator authority** — anything that requires operators to fight the tool to override their own machine's behavior will be circumvented. Project-local-wins is the right default.
2. **Safety-critical must require explicit acknowledgment** — silent shadow-of-safety is the documented critical threat ([#1042](../../../../issues/1042) T1). The only way to prevent it without breaking the override use case is making the override explicit.
3. **Data-driven denylist** — hard-coding a list creates a maintenance burden and a moving target as new safety-critical rules emerge. A `safety-critical: true` flag in upstream manifests scales naturally.
4. **Refuse, don't warn** for unauthorized safety-critical shadows — a warning is too easy to ignore in CI logs. Refusal forces the operator to make a conscious choice (add `overrides:` or accept upstream).

## Decision Matrix

| Alternative | Default UX | Safety | Operator agency | Score |
|-------------|------------|--------|-----------------|-------|
| **Project-local wins; explicit `overrides:` for safety-critical (SELECTED)** | 5 | 5 | 5 | **5.0** |
| Project-local always wins (silent shadow) | 5 | 1 | 5 | 3.7 — disqualified on safety |
| Upstream always wins | 1 | 5 | 1 | 2.3 — defeats the override use case |
| Manual operator confirmation per shadow at deploy time | 3 (interactive prompts) | 5 | 3 (annoying) | 3.7 |
| Hard-coded denylist instead of `safety-critical: true` flag | 5 | 4 (drift between code and reality) | 5 | 4.7 |

## Consequences

### Positive

- Operators can override anything they want; they only have to acknowledge safety-critical overrides
- Adding new safety-critical artifacts requires no code change — flip the flag in the upstream manifest
- The mechanism extends to git-installed sources (a malicious git package shadowing safety-critical content faces the same refusal)
- Compatible with future hardening (signing, allowlists, hash-pinning) without breaking the policy

### Negative

- One more required field on upstream safety-critical manifests (`safety-critical: true`)
- Initial seed list is small (only `human-authorization` is currently a rule artifact); fully realizing the mechanism requires migrating Core Enforcement Rules from `CLAUDE.md` documentation into rule artifacts (separate workstream)
- Operators who legitimately want to shadow a safety-critical rule must edit two places: the manifest (add `overrides:`) and accept the prominent warning. This is by design.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Operator approves prominent safety-critical warning without reading | Medium | High | UX work in [#1051](../../../../issues/1051) (multi-line warnings, color in TTY); future hardening (signing) |
| Future safety-critical artifact added but not flagged | Medium | High | Audit checklist as part of every release; doctor tracks "no `safety-critical` rules at all" as a suspicious anomaly worth flagging |
| `overrides:` validation against upstream registry is slow | Low | Low | Upstream registry is in-memory after CLI startup; lookup is O(1) |
| Operator copies a manifest from another project that already declared `overrides:` and unintentionally shadows | Low | Medium | `aiwg validate-metadata` lints on copy; `aiwg list --shadows` surfaces |

## Implementation Sequence

1. This ADR accepted
2. [#1044](../../../../issues/1044) manifest schema adds `safety-critical: boolean` and `overrides: string[]` fields with validation rules from §3
3. Flag `agentic/code/addons/aiwg-utils/rules/human-authorization.md` with `safety-critical: true` (this is the only existing rule artifact in the seed list; CLAUDE.md-resident rules require their own migration)
4. [#1036](../../../../issues/1036) implements the resolver per §4 failure-mode table
5. [#1037](../../../../issues/1037) doctor surfaces shadows per §6

## References

- Epic [#1033](../../../../issues/1033)
- [#1038](../../../../issues/1038) — Identical-form invariant (E5: `safety-critical` and `overrides` fields are permitted asymmetries)
- [#1040](../../../../issues/1040) — Unified registry (provides `source` discriminator for §1 precedence)
- [#1042](../../../../issues/1042) — Threat model (T1 is this ADR's load-bearing threat)
- [#1044](../../../../issues/1044) — Manifest schema (defines field wire format)
- [#1036](../../../../issues/1036) — Override / shadow resolver implementation (consumes this ADR)
- [#1037](../../../../issues/1037) — Doctor + activity log (consumes this ADR)
- `agentic/code/addons/aiwg-utils/rules/human-authorization.md` — first denylist member
- `CLAUDE.md` "Core Enforcement Rules" section — rules that warrant `safety-critical: true` migration
