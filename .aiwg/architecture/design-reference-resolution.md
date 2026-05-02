# Design: `@-Reference` Resolution and Rewriting on Graduation/Demotion

## Status

**PROPOSED** — companion to [#1038](../../../../issues/1038) (E2/E3 exceptions); required by [#1049](../../../../issues/1049)

## Date

2026-05-01

## Context

### Trigger

The identical-form portability invariant ([#1038](../../../../issues/1038)) permits two specific exceptions related to `@-mention` references:

- **E2**: project-local artifacts MAY reference `@.aiwg/...` paths (their own project corpus).
- **E3**: upstream artifacts MAY reference `@$AIWG_ROOT/...` paths.

These exceptions exist because they are unavoidable — a project-local skill that tailors a resume needs to reach `@.aiwg/data/voice-corpus.md`, and an upstream agent that loads a template needs `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/...`. The invariant cannot demand byte-equivalence here without breaking the use cases.

But the exceptions create a pair of operational questions:

1. **At runtime**: a project-local skill is deployed to `.claude/skills/foo/SKILL.md`. The skill body contains `@.aiwg/data/voice-corpus.md`. From WHERE does that reference resolve? Relative to the deployed location (`.claude/skills/foo/`), or relative to the project root, or somewhere else?
2. **On graduation** (project-local → upstream / corpus): the skill moves to `agentic/code/addons/foo/skills/<name>/`. The `@.aiwg/data/voice-corpus.md` reference no longer resolves — there is no `.aiwg/` in the upstream tree. What happens?
3. **On demotion** (upstream → project-local): an upstream skill referencing `@$AIWG_ROOT/...` moves to `.aiwg/extensions/foo/`. Does the reference still resolve? Should it be rewritten?

This design document defines the answers.

### Scope boundary

This design defines:
- Runtime resolution rules (where references resolve from)
- Graduation rewriting / refusal rules
- Demotion rewriting / preservation rules
- Lints for unresolvable references
- Operator-facing CLI surface for handling references

It does NOT:
- Implement the rewriter (that lives in [#1049](../../../../issues/1049) `aiwg promote`)
- Define the manifest schema (that's [#1044](../../../../issues/1044))
- Define `@-mention` syntax itself — that's an existing AIWG convention; this doc only governs how references survive lifecycle transitions

### Existing `@-mention` convention

AIWG documents (skills, agents, rules, templates) routinely contain references like:

```
@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/...
@.aiwg/requirements/UC-001.md
@docs/cli-reference.md
@./relative-sibling.md
```

The current convention (per existing usage in the corpus) is:
- `@$AIWG_ROOT/...` → resolves relative to the AIWG installation root
- `@.aiwg/...` → resolves relative to the **project root** (the directory containing `.aiwg/`)
- `@docs/...`, `@src/...`, etc. → relative to project root
- `@./...`, `@../...` → relative to the file containing the reference

These are the load-bearing patterns; this design preserves them as-is for runtime and adds rules for lifecycle transitions.

## Design

### 1. Runtime Resolution Rules

A `@-reference` in a deployed artifact is resolved at runtime as follows:

| Pattern | Resolves from | Notes |
|---------|---------------|-------|
| `@$AIWG_ROOT/<path>` | `$AIWG_ROOT` env var (or detected install path) | Stable across deploy targets |
| `@.aiwg/<path>` | The project root (cwd containing `.aiwg/` directory) | Operator's project, NOT the deployed location |
| `@<top-level-dir>/<path>` (e.g., `@docs/`, `@src/`, `@agentic/`) | Project root | Same as `@.aiwg/` resolution semantics |
| `@./<path>` or `@../<path>` | Directory of the file containing the reference | Provider-dependent — file system path of the deployed copy |

**Critical clarification**: a project-local skill at `.aiwg/extensions/foo/skills/bar/SKILL.md` deploys to `.claude/skills/bar/SKILL.md`. Its `@.aiwg/data/x.md` reference is resolved at agent runtime relative to **the project root**, NOT relative to `.claude/skills/bar/` and NOT relative to the original `.aiwg/extensions/foo/skills/bar/`. Both source and deployed copy resolve to the same project-relative path.

This is what makes E2 work — the deployed copy is byte-identical to the source body, and the runtime resolution makes the reference target the same file from either location.

### 2. Graduation Rules (Project-Local → Upstream / Corpus)

When `aiwg promote <name> --to {upstream|corpus <path>}` runs, it scans the bundle's text content for references and applies the following rules:

| Reference pattern in source | Action on graduation | Rationale |
|-----------------------------|---------------------|-----------|
| `@$AIWG_ROOT/...` | Preserve verbatim | Upstream/corpus tree contains these paths; reference resolves correctly post-graduation |
| `@docs/...`, `@agentic/...`, `@src/...`, etc. (project-root paths that exist in upstream) | Preserve verbatim | Path exists in both project and upstream; resolves correctly |
| `@.aiwg/<path>` | **Refuse graduation by default**; explicit operator action required | Upstream/corpus tree has no `.aiwg/` dir; reference would break |
| `@./<path>` or `@../<path>` (relative) | Preserve verbatim **if the target is also being graduated**; refuse otherwise | Relative refs survive co-located graduation; refuse if pointing outside the bundle |
| `@<provider-specific>/...` (e.g., `@.claude/...`) | Refuse graduation | Provider-specific paths are deployment artifacts, not source |

#### Handling `@.aiwg/` references on graduation

Three operator-selectable modes, exposed as flags on `aiwg promote`:

1. **`--refuse-aiwg-refs` (default)**: graduation aborts and reports each `@.aiwg/...` reference with file path, line number, and the offending reference. Operator must edit the source to remove the reference (or use one of the other modes).

2. **`--strip-aiwg-refs`**: the reference and its surrounding line are removed from the graduated copy. A warning is emitted per stripped line. The original project-local source is unmodified. This mode is appropriate for skills that gracefully degrade without project-local data.

3. **`--rewrite-aiwg-refs <mapping-file>`**: operator provides a JSON file mapping `.aiwg/...` paths to upstream paths (e.g., `{".aiwg/templates/foo.md": "agentic/code/frameworks/.../foo.md"}`). The rewriter substitutes mapped paths and refuses any `@.aiwg/...` reference that has no mapping. Useful when the project-local data has an upstream equivalent.

There is intentionally no "`auto-rewrite`" mode. Automated rewriting of reference targets has too high a chance of producing semantically-wrong results (the upstream file at the rewritten path might look syntactically similar but mean something different). Operator-supplied mapping is the only sanctioned rewrite path.

### 3. Demotion Rules (Upstream → Project-Local)

When an operator copies an upstream artifact into `.aiwg/<type>/<name>/` (manually or via a future `aiwg demote` command), references behave as follows:

| Reference pattern in source | Action on demotion | Rationale |
|-----------------------------|---------------------|-----------|
| `@$AIWG_ROOT/...` | Preserve verbatim | `$AIWG_ROOT` resolves at runtime regardless of artifact location; reference still works |
| `@docs/...`, `@agentic/...`, `@src/...`, etc. | Preserve verbatim | Paths still exist in the project (since the project also has `agentic/`, `docs/`, etc. when this is the AIWG repo itself; for downstream projects, may not — see "Resolution failures") |
| `@.aiwg/<path>` | **Cannot occur** (upstream artifacts cannot reference `.aiwg/` per [#1038](../../../../issues/1038) E2 direction) | The invariant only permits `.aiwg/` refs in the project-local form |
| `@./<path>`, `@../<path>` | Preserve verbatim | Resolves relative to the new location; works if relative target also demoted |

Demotion is conservative: no rewriting happens by default. The operator is moving an artifact INTO their project; if a reference doesn't resolve in the new location, that's a project-setup issue, not an artifact issue.

#### Resolution failures in downstream projects

A common case: an operator clones a downstream project (not the AIWG repo) and the project has demoted an upstream skill referencing `@agentic/code/frameworks/.../template.md`. The path doesn't exist in the downstream project (no `agentic/` tree).

The resolution is:

- `$AIWG_ROOT` references continue to work (they resolve via the env var to the AIWG installation, not the project tree).
- Project-root-relative references (`@docs/`, `@agentic/`, etc.) DO NOT resolve.
- The operator must either: (a) resolve the reference manually to a project-local target and rewrite the demoted copy, or (b) leave the reference as a soft documentation pointer that won't load at runtime but is human-readable.

`aiwg validate-metadata` lints unresolvable references (§5).

### 4. Cross-Project Portability

The invariant explicitly supports project-local ↔ project-local moves (operator copies `.aiwg/extensions/foo/` from project A to project B). For references:

- `@.aiwg/...` references resolve relative to project B's `.aiwg/`. If the target file exists in B, the reference works; otherwise, it doesn't.
- `@$AIWG_ROOT/...` references resolve to whatever `$AIWG_ROOT` is set to in B's environment.
- Project-root-relative references resolve relative to B's project root.

The operator is responsible for ensuring B has the expected target files. `aiwg validate-metadata` lints the bundle in B's context to surface unresolvable references after the copy.

### 5. Validation and Lints

`aiwg validate-metadata` (and by extension `aiwg doctor`) performs reference linting on every project-local artifact:

| Check | Severity | Action |
|-------|----------|--------|
| `@$AIWG_ROOT/<path>` resolves to existing file under the detected/configured `$AIWG_ROOT` | Warning | Surface, don't refuse |
| `@.aiwg/<path>` resolves to existing file under project root | Warning | Surface, don't refuse |
| `@<top-level>/<path>` (e.g., `@docs/`, `@src/`) resolves under project root | Warning | Surface, don't refuse |
| `@./<path>` or `@../<path>` resolves relative to file location | Warning | Surface, don't refuse |
| Reference matches a known pattern but target doesn't exist | Warning | Listed in doctor output |
| Reference uses an unsupported pattern (e.g., `@http://...`, `@/absolute/path`) | Error | Refused by manifest validation |

Severity rationale: unresolvable references are usually a project-setup issue (missing data file, wrong env var), not an artifact authoring issue. Surfacing as warnings rather than errors avoids blocking deploys when the operator is mid-development.

### 6. Operator-Facing CLI

Three CLI surfaces involve reference handling:

#### `aiwg validate-metadata`

Adds reference linting per §5. Reports each unresolvable reference with file path, line number, reference text, and resolution attempt details.

#### `aiwg promote <name> [flags]`

Adds the three reference-handling modes per §2:
- `--refuse-aiwg-refs` (default)
- `--strip-aiwg-refs`
- `--rewrite-aiwg-refs <mapping.json>`

`--dry-run` reports what would happen without writing.

#### `aiwg doctor`

Per-artifact reference health: count of resolved/unresolved/error references; flag artifacts that would refuse graduation. Helps operators catch reference debt early.

### 7. What This Design Does Not Define

- **`@-mention` syntax itself**: no change to existing usage patterns; this design only governs lifecycle transitions.
- **Cross-platform path normalization**: Windows path separators are out of scope (AIWG is Linux/macOS-first; cross-platform is a separate design concern).
- **Symlinked target resolution**: references are resolved by path string, not by following symlinks. If an operator wants `@.aiwg/data/x.md` to point to a symlinked location, they manage the symlink; AIWG does not follow it during validation.

## Decision Drivers

1. **No silent rewriting**: automated rewrite of reference targets is the most dangerous failure mode imaginable for a graduated artifact (looks like it works, points to wrong content). Refusing graduation by default forces the operator to make a conscious choice.
2. **Preserve operator intent**: demotion is conservative; copying an artifact into a project should not silently mutate it.
3. **Match existing convention**: runtime resolution rules in §1 codify what AIWG already does today; this design does not invent new resolution semantics, only documents them.
4. **Lint-driven hygiene**: surfacing reference problems via `aiwg doctor` makes them visible without blocking development.

## Decision Matrix (Graduation Modes)

| Alternative | Safety | Operator effort | Throughput | Score |
|-------------|--------|------------------|------------|-------|
| **Refuse-by-default with explicit modes (SELECTED)** | 5 | 3 | 4 | **4.0** |
| Auto-rewrite using heuristic | 1 (silent semantic drift) | 5 | 5 | 3.7 — disqualified on safety |
| Always strip `@.aiwg/` refs silently | 2 | 5 | 5 | 4.0 — but breaks artifacts that actually need the refs |
| Refuse always; no overrides | 5 | 1 (operator must edit source first) | 2 | 2.7 |

## Consequences

### Positive

- Graduation is reliable: an operator who runs `aiwg promote` knows the result is either a clean upstream-shaped artifact or a clear refusal with line-by-line rationale.
- Demotion preserves operator intent: no accidental rewriting of upstream content.
- Lints surface reference debt without blocking development.
- The three explicit graduation modes give operators agency without enabling silent failures.

### Negative

- Operators with project-local skills that reference `@.aiwg/` data must do work to graduate them (write a mapping file, or edit the skill to remove project-local refs). This is by design but is friction.
- The `--strip-aiwg-refs` mode can produce skills that no longer make sense (data they relied on is gone). This is operator's responsibility to verify post-graduation.

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Operator uses `--strip-aiwg-refs` without verifying the result | Medium | Medium | Mode emits per-line warnings; doctor flags graduated artifacts that have suspicious empty sections |
| Operator's mapping file has incorrect rewrites | Medium | High | `aiwg promote --dry-run` shows resolved targets; operator reviews before committing |
| Reference pattern not covered by the four canonical patterns | Low | Low | Lint reports as "unsupported pattern"; treat as ad-hoc text and don't process |

## Implementation Sequence

1. Lint logic in `aiwg validate-metadata` (§5)
2. Reference scanner shared with `aiwg promote` (§2 implementation)
3. Three graduation modes in `aiwg promote --refuse-aiwg-refs`/`--strip-aiwg-refs`/`--rewrite-aiwg-refs` (§6)
4. Doctor integration (§6)

These all live in [#1049](../../../../issues/1049) implementation scope.

## References

- Epic [#1033](../../../../issues/1033)
- [#1038](../../../../issues/1038) — Identical-form invariant (defines E2/E3 this design operationalizes)
- [#1042](../../../../issues/1042) — Threat model (I2: reference exfiltration is out-of-scope here, in-scope there)
- [#1044](../../../../issues/1044) — Manifest schema (§5 unsupported-pattern errors live here)
- [#1049](../../../../issues/1049) — Doctor + activity-log + `aiwg promote` (consumes this design)
- [#1050](../../../../issues/1050) — Scaffolding CLI (templates teach the four reference patterns)
- [#1051](../../../../issues/1051) — Management documentation (graduation guide explains the three modes)
- Existing AIWG `@-mention` convention as documented in `CLAUDE.md` and various skill bodies
