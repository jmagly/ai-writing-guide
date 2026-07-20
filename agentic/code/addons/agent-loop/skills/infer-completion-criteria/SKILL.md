---
namespace: aiwg
name: infer-completion-criteria
aliases: [agent-loop-infer-completion, al-infer-completion, ralph-infer-completion]
platforms: [all]
description: Infer measurable completion criteria for an agent-loop task from project docs, code, and AIWG standards when the user has not supplied --completion explicitly
commandHint:
  argumentHint: '"<task description>" [--task-type code|test|docs|refactor] [--non-interactive]'
  allowedTools: "Read, Glob, Grep, Bash"
  model: haiku
  category: automation
  modelRole: efficiency
  modelTier: economy
---

# Infer Completion Criteria

## Purpose

When a user starts an `agent-loop` task without supplying `--completion`, this skill derives a measurable, verifiable completion criterion from project state. The output must satisfy the `vague-discretion` rule: a concrete shell command or file-inspection check that returns pass/fail unambiguously.

Iteration is only as good as its gate. A loop with a vague gate ("until it's done") runs forever or exits prematurely. This skill is what turns "agent-loop this" into "agent-loop this until `<measurable thing>`."

The canonical name for the iterative-loop addon is **agent-loop**. `ralph` is the legacy name for the executor skill, retained as an alias; `al` is a short form. The detection/routing skill is `agent-loop` (which delegates to this skill when criteria are missing); the executor is `ralph` (canonical name forthcoming). Everywhere this skill says "agent-loop" you can read "ralph" as the legacy equivalent.

## When This Skill Runs

This skill is invoked by:

- The `agent-loop` detection-and-routing skill when it parses a user request without explicit completion criteria
- The `ralph` executor skill during Phase 1 initialization when `--completion` is omitted
- The `agent-loop-ext` external-loop launcher during pre-launch resolution when `--completion` is omitted
- Direct invocation via `aiwg discover "infer completion"` → `aiwg show skill infer-completion-criteria` when a user wants to preview the inferred criterion before committing to a loop

This skill does **not** run when `--completion` is explicit. The user's word is authoritative.

## Inference Pipeline

The skill is a deterministic walk through five evidence layers, plus one synthesis step. Each layer contributes candidate criteria; the synthesis picks the strongest measurable one and explains the chain of evidence.

### Layer 1 — The task verb

Parse the user's task description for an intent verb. Map to a default criterion class:

| Verb / phrase | Criterion class |
|---|---|
| "fix tests", "make tests pass", "test failure" | Test suite passes (exit 0) |
| "add tests", "increase coverage", "test coverage" | Coverage threshold met |
| "fix types", "type errors", "migrate to typescript" | Type checker exits 0 |
| "fix lint", "clean up warnings", "style" | Linter exits 0 |
| "build", "make it compile" | Build command exits 0 |
| "refactor", "extract", "rename" | Tests still pass AND build still passes (regression gate) |
| "implement <X>", "add feature <X>" | Tests for the new code exist and pass |
| "document", "add docs", "JSDoc" | Coverage check on docstrings/JSDoc presence |
| "fix bug", "resolve issue #N" | Specific test for that bug passes AND existing suite still green |
| "migrate", "upgrade" | Build + test + lint all green (no regression) |

If the verb is ambiguous, the skill falls back to "regression gate" (build + test + lint all green) as the safest default.

### Layer 2 — Project conventions in CLAUDE.md / AGENTS.md / AIWG.md

Read the project's context files. AIWG-managed projects often declare commands directly:

```bash
# Run tests
npm test

# Type check
npx tsc --noEmit

# Lint markdown
npm exec markdownlint-cli2 "**/*.md"
```

Extract these as the canonical commands for their respective domains. The Development section of `CLAUDE.md` is the highest-trust source here — it's what the project's maintainers run.

Also scan for explicit completion-criterion conventions. Some projects state "a commit is not finished until CI passes" — that signals the CI command (or equivalent local invocation) is the gate.

### Layer 3 — Package manifests and config

Inspect the project's manifest files to discover scripts and tools:

| Manifest | Where to look |
|---|---|
| `package.json` | `scripts.test`, `scripts.lint`, `scripts.build`, `scripts.coverage`, `scripts.typecheck` |
| `Cargo.toml` | implies `cargo test`, `cargo build`, `cargo clippy` |
| `pyproject.toml` | `[tool.pytest]`, `[tool.ruff]`, `[tool.mypy]`, `scripts.*` |
| `go.mod` | implies `go test ./...`, `go vet ./...`, `go build ./...` |
| `Gemfile` | implies `bundle exec rspec`, `bundle exec rubocop` |
| `pom.xml` / `build.gradle` | `mvn test`, `mvn verify`, `gradle test` |
| `.tool-versions` / `mise.toml` | language version pins inform which tool is canonical |

When multiple scripts exist (e.g. `test`, `test:unit`, `test:integration`), prefer the script the project's own docs reference. If the docs don't reference any, prefer the most specific match to the task verb (e.g. for "fix integration test" → `test:integration`).

### Layer 4 — CI configuration

CI files encode the team's actual definition of "passes":

| CI system | Scan |
|---|---|
| GitHub Actions | `.github/workflows/*.yml` — extract `run:` steps from non-deploy jobs |
| Gitea Actions | `.gitea/workflows/*.yml` — same |
| GitLab CI | `.gitlab-ci.yml` — extract `script:` from test/lint jobs |
| CircleCI | `.circleci/config.yml` |
| Jenkins | `Jenkinsfile` |

The first non-trivial verification step in the primary workflow is the team's canonical "done" gate. If CI runs `npm test && npm run lint && npm run typecheck` in order, the inferred criterion is "all three exit 0."

### Layer 5 — AIWG artifacts

If the project has a `.aiwg/` directory, scan for relevant context:

- `.aiwg/testing/test-strategy.md` — declared verification approach
- `.aiwg/architecture/software-architecture-doc.md` — architectural quality gates
- `.aiwg/security/security-gates.md` — security-related criteria
- `.aiwg/quality/code-review-guide.md` — code quality bars
- `.aiwg/activity.log` — recent operations that may indicate what "done" looked like for similar past tasks
- `.aiwg/working/<related-progress-files>.md` — prior task progress files; mine the "Completion criteria" sections

If the project has a related use case (`.aiwg/requirements/UC-*.md`) whose ID is in the task description, pull that use case's acceptance criteria — those ARE the completion criteria.

### Synthesis step

Combine the layers into a single proposed criterion. The decision logic:

1. If a use case in `.aiwg/requirements/` matches the task, use its acceptance criteria verbatim. Done.
2. Otherwise, take the verb-class default from Layer 1 and instantiate it using the canonical command from Layer 2 (CLAUDE.md) > Layer 4 (CI) > Layer 3 (manifest).
3. If the task is in the "regression gate" class, AND the project's CI runs more than one verification, combine them: `command-A passes AND command-B passes AND command-C passes`.
4. If no canonical command is found in any layer (unusual — typically only on empty-scaffold projects), fall back to:
   - `<file or change exists in git diff against HEAD~1>` — pure structural check
   - And inform the user that a substantive verification command should be added.

### Apply AIWG standards (vague-discretion)

Validate the proposal against the `vague-discretion` rule:

- Criterion must be expressible as a shell command (or shell pipeline) that exits 0 on pass, non-zero on fail.
- Criterion must NOT use the words "good enough", "thorough", "comprehensive", "complete" without a measurable suffix.
- Criterion must NOT be self-referential ("the agent is satisfied" — no).
- Criterion must have an implicit or explicit `max-iterations` cap (ralph's default 10 is the floor; very large refactors may need 20).

If the proposal fails any of these, regenerate. If after two regenerations the proposal still fails, surface the problem to the user with the diagnostic ("could not find a measurable verification command — please supply one explicitly").

## Output Contract

The skill emits a single block of structured output for the calling skill (`agent-loop` router, `ralph` executor, or `agent-loop-ext` launcher) to consume:

```yaml
proposed_completion:
  criterion: "npm test passes AND npx tsc --noEmit exits 0"
  verification_command: "npm test && npx tsc --noEmit"
  rationale:
    - "Task verb 'refactor' triggers regression gate (Layer 1)"
    - "package.json scripts.test = 'jest --coverage' (Layer 3)"
    - "CLAUDE.md Development section references both npm test and npx tsc --noEmit (Layer 2)"
    - ".github/workflows/ci.yml runs both as required checks (Layer 4)"
  confidence: high  # high | medium | low
  alternatives_considered:
    - criterion: "npm run lint exits 0"
      rejected_because: "Lint is not in CI required checks for this repo"
  max_iterations_suggestion: 10
  needs_human_confirmation: false  # true if confidence == low OR criterion is unusual
```

When the skill runs in non-interactive mode (via `aiwg al --auto-criteria` or the equivalent on `agent-loop` / `agent-loop-ext`), `needs_human_confirmation: false` proceeds directly. Otherwise the consuming skill (the `agent-loop` router or the `ralph` / `agent-loop-ext` executor) shows the proposal to the user and confirms.

## Interaction With The User

In interactive mode, after running the pipeline, present the proposal:

```
No --completion criteria was provided. I inferred:

  Criterion: npm test passes AND npx tsc --noEmit exits 0
  Verification: `npm test && npx tsc --noEmit`

Evidence:
  - Task verb "refactor" → regression gate
  - package.json scripts.test = jest --coverage
  - CLAUDE.md Development section references both checks
  - .github/workflows/ci.yml requires both

Proceed with this criterion? [Y/n/edit]
```

User options:
- `Y` (default): start the loop with the inferred criterion
- `n`: abort and request the user supply `--completion` explicitly
- `edit`: accept a manual edit to the criterion before proceeding

Use the platform's native interaction tool when available (per `native-ux-tools` rule). On Claude Code, that means `AskUserQuestion`.

## When Inference Should NOT Run

- `--completion` is explicit → use the user's criterion, don't second-guess
- `--no-infer-completion` flag is passed → fail fast with a helpful error if `--completion` is also missing
- The task description is itself a criterion (e.g. "make `npx tsc --noEmit` pass") → extract the command from the task, don't re-infer

## Edge Cases

| Case | Handling |
|---|---|
| No `package.json`, no manifest, no CI | Scan project root for any executable test runner (`pytest`, `go test`, `cargo test`, `make test`, `Makefile` target `test`). Fall back to the structural check if none found. |
| Multiple test commands (`test:unit`, `test:integration`, `test:e2e`) | Prefer the one nearest to the task scope. If task mentions "unit", use `test:unit`. If the task is broad, prefer the union via `&&`. |
| CI runs tests on multiple OS/Node versions | Use the local invocation (`npm test`), not the matrix runner. The matrix is a deploy concern. |
| Monorepo with multiple packages | Detect from `pnpm-workspace.yaml` / `lerna.json` / `turbo.json` / workspaces field. If the task scope is one package, infer that package's commands. If the task spans the monorepo, use the top-level `test` script. |
| Project has no tests at all | This is a finding. The inferred criterion should be "tests exist for the new code AND those tests pass." Surface to the user that the project lacks a baseline test suite — that's important context for the loop's expectations. |
| Project's tests are currently broken (the task IS to fix them) | Set the criterion to the passing condition. The whole point of the loop is to get from current red state to green. |
| Conflict between layers (CLAUDE.md says X, CI says Y) | Prefer CLAUDE.md (closer to the maintainer's intent). Note the discrepancy in the rationale. |

## Interaction With Other AIWG Rules

| Rule | How this skill respects it |
|---|---|
| `vague-discretion` | The whole point — produces measurable, command-form criteria |
| `instruction-comprehension` | Reads the task description carefully; doesn't override explicit user instructions |
| `research-before-decision` | Layer-walk IS research; doesn't propose criteria without evidence |
| `human-authorization` | Confirms with user before starting loop (unless `--auto-criteria` explicitly granted) |
| `auto-compact-continue` | The inferred criterion IS what the loop continues toward; no "should I keep working" prompts |
| `cli-secondary` | Uses `aiwg discover` to find related skills if the task verb is unusual |

## Examples

### Example 1: Simple test task on a TypeScript project

```
$ agent-loop "fix the failing auth tests"   # or: aiwg al / aiwg ralph (legacy)

Inferring completion criteria...
  Layer 1 verb: "fix tests" → test-pass class
  Layer 2 CLAUDE.md: "npm test" is the canonical test command
  Layer 3 package.json: scripts.test = "jest"
  Layer 4 CI: .github/workflows/ci.yml runs `npm test`
  Layer 5: no related use case found

Proposed criterion: npm test passes (exit 0)
Verification: `npm test`
Confidence: high

Proceed? [Y/n/edit]
```

### Example 2: Refactor with no tests

```
$ agent-loop "extract auth logic into a separate module"

Inferring completion criteria...
  Layer 1 verb: "extract" → regression gate
  Layer 2 CLAUDE.md: no Development section
  Layer 3 package.json: scripts.test = "echo 'no tests'" (degenerate)
  Layer 4 CI: no workflows found
  Layer 5: no related use case found

Warning: project has no functional test suite or CI configuration.
Falling back to structural verification.

Proposed criterion: The new module exists, the original code references it,
                    AND `npx tsc --noEmit` still exits 0
Verification: `test -f src/auth/index.ts && grep -q 'from.*src/auth' src/main.ts && npx tsc --noEmit`
Confidence: low

This is a weak gate. Consider supplying --completion explicitly
or adding a test suite first.

Proceed? [Y/n/edit]
```

### Example 3: Task with an explicit use case reference

```
$ agent-loop "implement UC-AUTH-001"

Inferring completion criteria...
  Layer 1 verb: "implement" → tests-exist class
  Layer 5: found .aiwg/requirements/UC-AUTH-001-user-login.md

Using acceptance criteria from UC-AUTH-001:
  - [ ] User can log in with valid email/password
  - [ ] Invalid credentials show clear error message
  - [ ] Account locks after 5 failed attempts
  - [ ] Login completes within 2 seconds

Proposed criterion: All acceptance criteria from UC-AUTH-001 verified by tests,
                    AND `npm test -- --testPathPattern=auth` passes
Verification: `npm test -- --testPathPattern=auth`
Confidence: high (acceptance criteria are explicit)

Proceed? [Y/n/edit]
```

### Example 4: Refusal case

```
$ agent-loop "make the code better"

Inferring completion criteria...
  Layer 1 verb: "make better" → AMBIGUOUS, no clear criterion class
  Layer 5: no related use case

Cannot infer measurable criteria for this task.

"Make the code better" is vague (per AIWG vague-discretion rule).
A loop with no measurable gate runs forever or exits prematurely.

Please supply --completion with a concrete check, e.g.:
  --completion "npm test passes AND npm run lint exits 0"
  --completion "all functions in src/utils/ have JSDoc"
  --completion "complexity score from eslint < 10 for all files"

Or rephrase the task with a concrete intent:
  agent-loop "reduce cyclomatic complexity in src/utils/"
  agent-loop "add JSDoc to all exported functions in src/api/"
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Measurable criteria requirement
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Layer-walk research pattern
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Don't override explicit user criteria
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/auto-compact-continue.md — Criterion IS what the loop continues toward
- @$AIWG_ROOT/agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md — The detection/routing skill that delegates here when `--completion` is missing
- @$AIWG_ROOT/agentic/code/addons/agent-loop/skills/ralph/SKILL.md — The legacy executor skill that consumes this output (`ralph` is legacy for `agent-loop`'s executor)
- @$AIWG_ROOT/agentic/code/addons/agent-loop/skills/agent-loop-ext/SKILL.md — The crash-resilient external loop, same delegation pattern
- @$AIWG_ROOT/agentic/code/addons/agent-loop/agents/ralph-verifier.md — Runs the verification command this skill proposes
