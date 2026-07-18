# Operational Asset Discovery Gap Analysis

Date: 2026-07-17
Status: Filed for implementation planning
Related issue: #1792

## Summary

AIWG discovery is no longer only a skill/rule lookup surface. The framework
index already classifies operational assets beyond skills and rules, including
agents, commands, YAML flows, templates, and behaviors. Focused searches for
some of these types work when the caller supplies an explicit `--type` filter,
but broad discovery and the `discover -> show` loop are inconsistent.

The next implementation should make all agentic operational asset types
discoverable through one shared capability taxonomy, with focused type-scoped
searches and broad cross-type searches using the same code path.

## Current Evidence

Framework graph type counts from the current local index:

| Type | Count |
| --- | ---: |
| skill | 519 |
| flow | 423 |
| template | 413 |
| agent | 224 |
| rule | 124 |
| command | 24 |
| behavior | 9 |
| hook | 9 |

Current behavior observed on 2026-07-17:

- `aiwg discover "release flow" --type flow --json` returns YAML flow records.
- `aiwg discover "quiet bot" --type behavior --json` returns behavior records.
- `aiwg discover "config toml" --type template --json` returns template records.
- `aiwg discover "quiet bot" --json` does not include behavior results because
  the default type set is `skill,agent,command,rule,flow`.
- `aiwg index show behavior quiet-bot --json` fails because `show` only treats
  `skill,agent,command,rule` as positional types.
- `aiwg index show template config.toml --json` fails for the same reason and
  because template naming is not normalized enough for exact lookup.
- `aiwg index show flow flow-release --json` fails even though flow discovery
  returns `aiwg:flow:*` records.

Relevant implementation locations:

- `src/artifacts/index-builder.ts` classifies `agent`, `command`, `rule`,
  `template`, `behavior`, `hook`, and YAML `flow` records.
- `src/artifacts/query-engine.ts` defines `DEFAULT_DISCOVER_TYPES` as
  `skill,agent,command,rule,flow`.
- `src/artifacts/query-engine.ts` has discovery type ordering that already
  includes `behavior` and `template`, but the default discovery set does not.
- `src/artifacts/cli.ts` `show` help and type validation still list only
  `skill | agent | command | rule`.
- `src/artifacts/query-engine.ts` `findCorpusArtifact` scans templates but not
  behaviors or flows as first-class show targets.

## Product Requirement

Agents need two discovery modes:

1. Focused searches against a specific operational type, for example:
   - `aiwg discover "quiet bot" --type behavior`
   - `aiwg discover "config toml" --type template`
   - `aiwg discover "release flow" --type flow`
   - `aiwg discover "security auditor" --type agent`
2. Broad searches across all operational types, for example:
   - `aiwg discover "quiet bot"` should be allowed to surface a behavior.
   - `aiwg discover "config toml"` should be allowed to surface a template.
   - `aiwg discover "release flow"` should be allowed to surface both the skill
     wrapper and the YAML flow, ranked by relevance.

Broad discovery should include operational artifact types, not arbitrary project
documents. The default surface should be explicit and centrally defined.

## Design Direction

Refactor toward a single shared taxonomy instead of adding more local arrays:

- Define a central operational discovery type list, likely including:
  `skill`, `agent`, `command`, `rule`, `flow`, `template`, `behavior`.
- Decide whether `hook` is part of broad default discovery or opt-in only. Hooks
  are operational but can be lower-level than commands/flows/behaviors; they may
  need focused `--type hook` support without default broad surfacing.
- Reuse the shared type list in:
  - discovery defaults,
  - CLI help text,
  - show positional type validation,
  - show hints emitted by discovery,
  - corpus fallback scanning,
  - routing-doc tests,
  - Fortemi Core discovery/show parity tests.
- Keep `query` as the broader artifact/document search surface; do not make
  `discover` return every document type by default.
- Normalize names for non-skill assets so discovered items can be fetched by
  type/name and by stable id.

## Acceptance Criteria

- [ ] `aiwg discover "<phrase>"` broad mode searches `skill`, `agent`,
      `command`, `rule`, `flow`, `template`, and `behavior`.
- [ ] `aiwg discover "<phrase>" --type <kind>` supports at least `skill`,
      `agent`, `command`, `rule`, `flow`, `template`, and `behavior`.
- [ ] `aiwg show <type> <name-or-id>` works for every discoverable operational
      type returned by `discover`, including `flow`, `template`, and `behavior`.
- [ ] Discovery text and JSON output emit valid `show:` hints for every returned
      type.
- [ ] Fortemi Core and local backends preserve parity for broad and focused
      discovery across the expanded type set.
- [ ] Tests cover focused searches for `agent`, `command`, `rule`, `flow`,
      `template`, and `behavior`.
- [ ] Tests cover broad searches where the top relevant result is a template or
      behavior, proving those types are not hidden behind `--type`.
- [ ] CLI help, `aiwg-utils` quickrefs/rules, and routing docs describe the
      expanded operational discovery surface.
- [ ] The implementation removes duplicated hard-coded type lists or replaces
      them with a shared exported constant/module.

## Out of Scope

- Replacing `query` with `discover`.
- Making arbitrary documents, ADRs, requirements, reports, or source-code files
  part of default capability discovery.
- Changing provider deployment semantics for the assets themselves.
- Semantic embedding work for these types; lexical/Fortemi static discovery
  parity is the first milestone.

## Risks

- Adding too many low-level types to broad discovery could dilute rankings.
  Mitigation: keep the default operational set explicit, tune type ordering, and
  consider `hook` opt-in until there is a clear operator use case.
- More result types increase the chance of broken `show` hints. Mitigation:
  assert every discoverable type has a successful `show` round-trip in tests.
- Copying type arrays into more files will make the surface drift again.
  Mitigation: centralize operational discovery type constants and reuse them in
  CLI, query engine, adapters, tests, and docs.
