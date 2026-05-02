# ADR: Identical-Form Portability Invariant for Project-Local Artifacts

## Status

**PROPOSED** — root decision for epic [#1033](../../../../issues/1033)

## Date

2026-05-01

## Context

### Trigger

Epic #1033 introduces project-local artifact discovery from `.aiwg/{extensions,addons,frameworks,plugins}/<name>/`. The load-bearing design constraint is that operators must be able to **graduate** a project-local artifact to upstream AIWG (or to a company's private corpus) and **demote** an upstream artifact to project-local for customization, without rewriting the artifact body. Without this invariant, project-local artifacts become a divergent dialect of AIWG content — the entire "frameworks + your own customization" positioning collapses into another fork-only workflow.

### Current state

AIWG ships four artifact-bundle types — `extension`, `addon`, `framework`, `plugin` — with overlapping shapes:

| Type | Source location | Deploy target | Manifest schema |
|------|-----------------|---------------|-----------------|
| Addon | `agentic/code/addons/<name>/` | provider-specific (`.claude/skills/`, `.claude/agents/`, etc.) | `manifest.json` (id, type, version, entry, agents[], skills[], rules[], templates[], commands[]) — see `agentic/code/addons/aiwg-utils/manifest.json` |
| Framework | `agentic/code/frameworks/<name>/` | provider-specific + context contributions | `manifest.json` (name, path, contextContributions, consolidation, memory) — see `agentic/code/frameworks/sdlc-complete/manifest.json` |
| Extension | `src/extensions/` (TypeScript) | bundled into CLI | TypeScript `Extension` type from `src/extensions/types.ts` |
| Plugin | distributed via marketplace / `aiwg install owner/repo` | unpacks to addon or framework form | varies (delivery wrapper) |

Upstream artifact bodies (skills, agents, rules, templates) are **already uniform** across types — a `SKILL.md` is a `SKILL.md` whether it lives under an addon or a framework. The divergence is at the **bundle manifest** level, not the inner artifact level. The CLI extension type system in `src/extensions/types.ts` already treats agents, skills, commands, rules, templates as uniform `Extension` records with type-specific metadata.

### What changed

Issue #1033 makes the four bundle types operator-authorable from `.aiwg/<type>/<name>/`. Once operators write project-local bundles, the question of whether `.aiwg/addons/foo/` and `agentic/code/addons/foo/` are interchangeable becomes load-bearing. Today, no rule states they must be. This ADR establishes that rule.

### Scope boundary

This ADR defines the **invariant** and its **machine-checkable form**. It does NOT:

- Define the four `.aiwg/<type>/` directory layout (deferred to [#1039](../../../../issues/1039))
- Define the unified registry shape (deferred to [#1040](../../../../issues/1040))
- Define override / shadowing policy (deferred to [#1041](../../../../issues/1041))
- Define the manifest schema in detail (deferred to [#1044](../../../../issues/1044))
- Define `@-reference` rewriting rules (deferred to [#1043](../../../../issues/1043) — the largest single exception class to this invariant)

## Decision

### 1. The Invariant

> **A project-local artifact at `.aiwg/<type>/<name>/` MUST be byte-equivalent to the same artifact at the corresponding upstream path (`agentic/code/<addons|frameworks>/<name>/`), modulo the explicitly enumerated exceptions in §2.**

"Byte-equivalent" means: running `diff -r` between the project-local directory and a hypothetical upstream copy of the same artifact, after applying the §2 exceptions, MUST produce zero output.

The invariant applies in **both directions**:

- **Graduation** (project-local → upstream / corpus): copy `.aiwg/<type>/<name>/` to the upstream tree. The result must be a valid upstream artifact with no transformation beyond the §2 exceptions.
- **Demotion** (upstream → project-local): copy `agentic/code/<addons|frameworks>/<name>/` to `.aiwg/<type>/<name>/`. The result must be a valid project-local artifact with no transformation beyond the §2 exceptions.

### 2. Permitted Exceptions

The following differences between project-local and upstream forms are permitted; nothing else is.

| # | Exception | Where it lives | Rationale |
|---|-----------|----------------|-----------|
| E1 | Registry source label | `aiwg.config.json.installed.<id>.installedFrom` | Registry is metadata about the artifact, not part of the artifact body. Differs by design — `'project-local'` vs `'builtin'` vs `'git'`. Never written into the artifact directory. |
| E2 | Reference paths into `.aiwg/` | Skill / agent body, manifest `entry` paths | A project-local artifact MAY reference `@.aiwg/data/foo.md` (its own project corpus). On graduation, the operator must rewrite or remove these references — see [#1043](../../../../issues/1043) for the full rewriting rule. The invariant does NOT require these references to be valid in the upstream tree; it requires them to be **resolvable in their current location** and to be detected and reported on graduation. |
| E3 | Reference paths into `$AIWG_ROOT` / upstream-only locations | Skill / agent body | An upstream artifact MAY reference `@$AIWG_ROOT/agentic/code/...`. On demotion, these references continue to resolve as long as `$AIWG_ROOT` is set. Demotion does NOT require rewriting them. |
| E4 | Manifest `version` field | `manifest.json` | Project-local versioning is operator-controlled and may diverge from upstream. The `id` and `name` must match between project-local and upstream forms; the `version` may not. |
| E5 | Manifest `safety-critical` and `overrides` fields | `manifest.json` | These are project-local override declarations (see [#1041](../../../../issues/1041)). Upstream artifacts MAY declare `safety-critical: true`; project-local artifacts MAY declare `overrides: ["<upstream-id>"]`. Upstream artifacts MUST NOT declare `overrides:`. |
| E6 | Trailing whitespace, line-ending normalization | Any text file | Tools (editors, git autocrlf) routinely normalize whitespace. The invariant treats files as byte-equivalent after a normalization pass: `\r\n` → `\n`, trim trailing spaces, single trailing newline. |

Any field, file, or content not enumerated above MUST be byte-identical between project-local and upstream forms.

### 3. Machine-Checkable Form

The invariant is enforceable by `aiwg promote --dry-run` and `aiwg validate-metadata` via the following procedure:

```
identicalForm(localDir, upstreamDir) :=
  for each file F in localDir ∪ upstreamDir:
    if F ∈ ALLOWED_DIVERGENCE_PATHS: continue
    if F not in both: FAIL ("missing file: " + F)
    if normalize(localDir/F) ≠ normalize(upstreamDir/F):
      if F == "manifest.json":
        diff = diff_json(localDir/F, upstreamDir/F)
        if diff.changedKeys ⊆ {"version", "safety-critical", "overrides"}:
          continue
        FAIL ("manifest diverges in non-permitted keys: " + diff.changedKeys)
      else:
        FAIL ("file diverges: " + F)
  PASS
```

Where `normalize` applies E6 (line-ending + trailing-whitespace normalization), and `ALLOWED_DIVERGENCE_PATHS` is empty by default — every file in either directory must be accounted for.

This procedure is implemented as part of the `aiwg promote` validator ([#1049](../../../../issues/1049)) and reused by `aiwg validate-metadata` to lint a project-local artifact against an existing upstream sibling.

### 4. What This Implies for Existing Artifact Types

**Skills** (`SKILL.md` + optional `references/`, `scripts/`):
- Already uniform. The `SKILL.md` body, frontmatter, and supporting directories are identical regardless of whether the skill lives in an addon, framework, or `.aiwg/extensions/`.
- Compliant with the invariant out of the box.

**Agents** (`*.md` with YAML frontmatter):
- Already uniform.
- Compliant.

**Rules** (`*.md` files referenced by `RULES-INDEX.md`):
- Already uniform.
- Compliant.

**Templates** (`*.md` template files):
- Already uniform.
- Compliant.

**Addon manifest.json** (`id`, `type`, `version`, `entry`, `agents[]`, `skills[]`, ...):
- Already structured; compliant if §2 exceptions are honored.

**Framework manifest.json** (`name`, `path`, `contextContributions`, `consolidation`, `memory`):
- Currently differs in shape from addon manifest. This is an existing asymmetry, not caused by #1033, but it means a project-local framework's `manifest.json` and a project-local addon's `manifest.json` are NOT mutually interchangeable.
- **Required reshaping** ([#1044](../../../../issues/1044)): the manifest schema MUST converge so the discriminator is `type: 'addon' | 'framework' | 'extension' | 'plugin'` and bundle-specific fields nest under a `frameworkConfig: { ... }` / `addonConfig: { ... }` block. This convergence is in scope for the manifest schema issue, not this ADR; this ADR only declares that convergence is **required** for the invariant to hold.

**Plugin** (marketplace/git delivery wrapper):
- Plugins are a delivery mechanism, not a content type. A plugin unpacks to an addon or framework form. The invariant applies to the unpacked form.

### 5. Cross-Project / Cross-Corpus Portability

The invariant guarantees more than upstream graduation:

- **Project A → Project B**: an operator copies `.aiwg/extensions/foo/` from one project to another. The artifact works in the destination project IF it has no E2 (`.aiwg/`-relative) references that don't resolve there. The invariant does not require cross-project references to resolve; it requires unresolvable references to be **detected and reported** by `aiwg validate-metadata` and `aiwg doctor`.
- **Project → Corpus**: a company's private corpus is structurally identical to upstream AIWG (just hosted privately). The same `aiwg promote --to corpus <path>` mechanism applies.
- **Corpus → Project**: demotion from a private corpus works identically to demotion from upstream.

The invariant therefore underpins a four-way mobility matrix: project-local ↔ upstream ↔ corpus, plus project-local ↔ project-local.

## Decision Drivers

1. **The "frameworks + your own customization" positioning is fork-only without this invariant.** Without identical-form, project-local artifacts become a parallel dialect, and the entire #1033 motivation evaporates.
2. **Existing artifact bodies are already uniform.** The invariant codifies an existing reality (skills, agents, rules, templates are already shape-uniform) and forces the bundle-manifest layer to converge to match.
3. **Machine-checkability is non-negotiable.** Without a `diff -r`-style validator, "identical" becomes aspirational. The validator runs before every `aiwg promote` and is the operational guarantee.
4. **Permitted exceptions must be enumerated, not discretionary.** §2 lists six. Any future exception requires an ADR amendment.

## Decision Matrix

| Alternative | Portability | Validator complexity | Migration cost | Score |
|-------------|-------------|----------------------|----------------|-------|
| **Identical-form invariant with enumerated exceptions (SELECTED)** | 5 | 3 (validator is real but simple) | 3 (forces manifest convergence in #1044) | **3.7** |
| Loose "best-effort" portability (no machine check) | 3 | 5 (no validator needed) | 5 (no migration) | 4.3 surface — but breaks under maintenance because divergence accretes silently |
| Strict bit-identical (zero exceptions) | 5 | 5 | 1 (impossible — registry must differ) | 3.7 — fails on E1 alone |
| No portability claim (project-local is its own dialect) | 1 | 5 | 5 | 3.7 — defeats #1033 |

The "loose" alternative scores higher on surface metrics but loses the load-bearing property. Identical-form with enumerated exceptions is the only option that keeps the property and is checkable.

## Consequences

### Positive

- `aiwg promote` becomes a reliable, testable operation rather than aspirational tooling
- Project-local artifacts are first-class corpus contributors — operators can graduate without restructuring
- Manifest convergence ([#1044](../../../../issues/1044)) becomes a hard requirement, eliminating a long-standing addon-vs-framework asymmetry
- A company's private corpus uses the exact same shape as upstream — no custom corpus tooling needed

### Negative

- Forces convergence of addon and framework manifest schemas, which has costs in [#1044](../../../../issues/1044) and downstream consumers of `manifest.json`
- Validator must be authored and maintained
- Operators authoring project-local artifacts must learn the §2 exception list (mitigated by scaffolding CLI [#1050](../../../../issues/1050))

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Future feature needs an exception not in §2 | Medium | Medium | Treat new exceptions as ADR amendments; require explicit acceptance |
| Validator misses a subtle divergence (e.g., file ordering, hidden files) | Medium | Low | Validator covers `find <dir> -type f` exhaustively; tests assert false-negative cases |
| `@-reference` rewriting on graduation introduces silent semantic drift | High | Medium | [#1043](../../../../issues/1043) defines reference rewriting with explicit operator confirmation; no silent rewrite |
| Manifest schema convergence in #1044 breaks existing addon/framework consumers | Medium | High | #1044 ships a migration path with backward-compat reads; existing consumers updated in lockstep |

## Implementation Sequence

1. **This ADR accepted** — pre-condition for everything else
2. **Manifest schema convergence** ([#1044](../../../../issues/1044)) — required for the invariant to hold across the bundle layer
3. **Validator implementation** as part of `aiwg promote` ([#1049](../../../../issues/1049))
4. **`@-reference` resolution and rewriting rules** ([#1043](../../../../issues/1043))
5. **Validator wiring into `aiwg validate-metadata`** so project-local artifacts can be linted against upstream siblings before graduation

## References

- Epic [#1033](../../../../issues/1033) — Project-local artifact discovery
- [#1039](../../../../issues/1039) — `.aiwg/` directory layout (consumer of this invariant)
- [#1040](../../../../issues/1040) — Unified registry shape (defines E1)
- [#1041](../../../../issues/1041) — Override / shadowing policy (defines E5 semantics)
- [#1043](../../../../issues/1043) — `@-reference` resolution (defines E2/E3 rewriting)
- [#1044](../../../../issues/1044) — Manifest schema (forced into convergence by §4)
- [#1049](../../../../issues/1049) — `aiwg promote` (consumes the validator)
- `agentic/code/addons/aiwg-utils/manifest.json` — current addon manifest example
- `agentic/code/frameworks/sdlc-complete/manifest.json` — current framework manifest example
- `src/extensions/types.ts` — existing unified Extension type system
- `adr-skills-canonical-extension-type.md` — companion ADR establishing skills as the canonical authoring format
- `adr-universal-provider-deployment.md` — universal deployment strategy these artifacts target
