---
artifact_type: use_case
id: UC-NUA-002
study: novice-user-adoption
workstream: B
status: baselined
phase: elaboration
created: 2026-05-14
voice: technical-authority
---

# UC-NUA-002: User runs `aiwg use` for the first time and gets project-isolation guidance

## Reasoning

1. **Problem analysis** — Users run `aiwg use sdlc` in `$HOME` or other unsuitable directories, deploying AIWG to global paths that bleed across all subsequent sessions. The user has no feedback that this is incorrect.
2. **Constraint identification** — Project-scope is the default AIWG deployment target. The current code path accepts any `cwd` without validation. Must add detection without blocking — power users running in unusual paths intentionally should not be impeded.
3. **Alternative consideration** — Options: (a) block on no-project-detected, (b) warn and offer to continue, (c) warn-and-continue (non-blocking). Chose (c) — least surprising, least disruptive.
4. **Decision rationale** — Warning-and-continue matches the "default UX unchanged" constraint. Information surfaces at the moment it's most actionable.
5. **Risk assessment** — Risk: warning fatigue if shown too often. Mitigation: only trigger when `cwd` is `$HOME`, `/`, or has no project signals — not on every non-git directory.

## Primary Actor

Novice User (subset of UC-NUA-001 actor)

## Goal

Receive clear feedback when running `aiwg use` outside a project directory, so the user understands they should `cd` into a project root first — without being blocked from continuing if intentional.

## Preconditions

- AIWG is installed
- User opens a terminal (typical default location: `$HOME`)
- User has read or been told to run `aiwg use sdlc`

## Main Success Scenario

1. User opens a terminal (defaults to `$HOME`)
2. User runs `aiwg use sdlc`
3. AIWG detects `cwd` is `$HOME` and has no project signals (`.git/`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, `pom.xml`, etc.)
4. AIWG emits a non-blocking warning: "No project detected here. AIWG will deploy to the current directory. To associate AIWG with a specific project, run this from your project root. Continuing in 3 seconds — press Ctrl-C to cancel."
5. User reads the warning, either cancels and `cd`s into a project, OR allows continuation
6. AIWG completes deployment

## Alternative Flows

**A1 — User confirms intentional global install**
- 5a. User has set `AIWG_GLOBAL_INSTALL=1` environment variable (or equivalent flag)
- 5b. Warning is suppressed; deployment proceeds without delay
- 6. Continues at step 6

**A2 — User cancels deployment**
- 5a. User presses Ctrl-C during the warning delay
- 5b. AIWG exits without writing artifacts
- 5c. User `cd`s into a project root and re-runs

## Postconditions

- User understands `aiwg use` should typically run from a project root
- If the user proceeded intentionally, no friction was added beyond the warning
- If the user cancelled, no artifacts are written to `$HOME`

## Acceptance Criteria

- [ ] Warning fires when `cwd` is `$HOME`, `/`, or `/tmp` (and similar) AND no project signals are detected
- [ ] Warning does NOT fire when `cwd` is inside a project (any of `.git/`, `package.json`, `pyproject.toml`, `Cargo.toml`, `go.mod`, or `pom.xml` present)
- [ ] Warning includes a 3-second delay during which the user can Ctrl-C
- [ ] Warning is suppressed when `AIWG_GLOBAL_INSTALL=1` (or equivalent opt-in flag)
- [ ] Warning text identifies which directory AIWG would deploy to
- [ ] Cognitive Walkthrough confirms novice users correctly interpret the warning

## References

- Workstream B
- Parent: UC-NUA-001
- Research: research-papers #607 (Krug, error prevention), #608 (Nielsen heuristic #5)
