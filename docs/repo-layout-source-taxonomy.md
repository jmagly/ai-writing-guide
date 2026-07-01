# Repository Source Taxonomy

AIWG has several source-like directory families. This document records the
source-of-truth boundary for the root `templates/`, `schemas/`, and `config/`
directories so future layout work does not move active product inputs into
framework, addon, generated, or project-local homes by mistake.

## Directory Classes

| Path | Classification | Canonical Use | Move Rule |
| --- | --- | --- | --- |
| `agentic/code/frameworks/` | Framework source | Framework-owned skills, agents, rules, schemas, templates, config, and docs. | Framework-specific artifacts live here, not at the repository root. |
| `agentic/code/addons/` | Addon source | Addon-owned deployable capability bundles. | Addon-specific artifacts live here. |
| `agentic/code/extensions/` | Extension source | Provider-neutral extension bundles. | Extension-specific artifacts live here. |
| `agentic/code/plugins/` | Plugin bundle source | Marketplace-ready plugin bundles. | Plugin source lives here; top-level `plugins/` is not canonical. |
| `.aiwg/` | Project records and project-local state | Architecture records, requirements, reports, research, testing artifacts, and project-local bundles. | Do not use `.aiwg/` for upstream framework/addon/plugin source. |
| Provider outputs such as `.agents/`, `.claude/`, `.codex/`, `.opencode/` | Generated provider exports | Deployed runtime surfaces for a local checkout. | Generated from canonical source; do not edit as upstream source. |

## Root `config/`

Root `config/` is product source for repository-level test-runner
configuration. Today it contains only Vitest entrypoint configs:

- `config/vitest.config.js`
- `config/vitest.conformance.config.js`
- `config/vitest.contract.config.js`
- `config/vitest.integration.config.js`
- `config/vitest.uat*.config.js`

These files remain at the repository root because `package.json`, CI, and
developer commands call them directly with `vitest --config config/...`.

Do not put framework or addon configuration here. Framework defaults belong in
`agentic/code/frameworks/<id>/config/`; addon defaults belong in
`agentic/code/addons/<id>/config/`; project/operator config belongs under
`.aiwg/config/` or the documented user config directory.

## Root `schemas/`

Root `schemas/` is product source for public, repository-level contracts that
are referenced by docs, tests, and CI:

- `schemas/executor-v1.json` is the executor contract schema used by
  conformance fixtures, docs, and `npm run lint:schemas`.
- `schemas/aiwg-fortemi-index-export.json` is the Fortemi index export
  envelope schema referenced by the integration docs.

Framework, addon, and plugin schemas should stay with their owning bundle under
`agentic/code/**/schemas/`. Project-local schemas belong under `.aiwg/` only
when they describe project records rather than AIWG product contracts.

## Root `templates/`

Root `templates/` is a small product template library for repository-level
commands and shipped helper workflows:

- `templates/agent-scaffolding/` provides generic agent definition starter
  templates.
- `templates/contrib/` provides contributor intake, checklist, and PR templates
  used by contribution tooling.
- `templates/deploy/` provides generic Docker and Kubernetes starter templates
  used by deploy-generation guidance.

Root templates are included in the npm package via `package.json` `files`.
They are not SDLC framework artifact templates. Framework phase templates live
under `agentic/code/frameworks/sdlc-complete/templates/`; addon templates live
under their owning addon; project-local overrides live under `.aiwg/templates/`
only when the operator owns the override.

## Adding New Files

Use this placement rule before adding a new template, schema, or config file:

1. If it is owned by a framework, put it under
   `agentic/code/frameworks/<id>/`.
2. If it is owned by an addon, put it under `agentic/code/addons/<id>/`.
3. If it is owned by a plugin bundle, put it under
   `agentic/code/plugins/<id>/`.
4. If it is a public AIWG product contract or repository test/build config,
   root `schemas/` or `config/` is acceptable.
5. If it is operator/project-local state, put it under `.aiwg/` and document
   whether it is tracked source, generated state, cache, report, or archive.

When moving any existing path, update package allowlists, docs, CI workflows,
generated provider context, and path-sensitive tests in the same change.
