# AIWG Flows Metalanguage (core primitive)

`apiVersion: flow.aiwg.io/v1` (forward) — `workflow.aiwg.io/v1` accepted for back-compat

> **Naming (#1536):** this declarative spec defines **Flows** (pre-established,
> authored sequences). The complementary **dynamic** orchestration concept is a
> **Mission** (`mc` mission-control). "Workflow" was the original name and
> collides with provider `/workflow` commands, so AIWG uses **Flows + Missions**.
> Wire identifiers are dual-recognized — `flow.aiwg.io/v1` + `Flow*` kinds are
> the forward spelling; `workflow.aiwg.io/v1` + `Workflow*` remain valid (mirrors
> the existing `ops.aiwg.io/v1` alias). No authored document breaks; the
> `workflow.*` spelling is deprecated for removal no earlier than the release
> after this alias ships. See `.aiwg/architecture/adr-workflow-naming.md`.

A declarative YAML spec for composing automation work. Any AIWG framework, addon, or extension can author workflows in this language and route them through the shared executor. The metalanguage is a **core utility primitive** — it ships in `aiwg-utils` so every install has access to it, regardless of which frameworks are deployed.

## What this replaces

This metalanguage was originally authored as `ops.aiwg.io/v1` under `ops-complete`. The shape — capability + playbook + inventory + target + gate — is generic; the `Ops` label was a packaging artifact. Lifting the spec to `aiwg-utils` makes it usable by any domain (release validation, content production, research orchestration, CI/CD) without forcing the consumer to depend on ops-complete.

`ops.aiwg.io/v1` documents still parse via apiVersion alias (see `docs/migration-from-ops.md`); no existing playbook breaks.

## The 7 kinds

| Kind | Purpose | Schema |
|---|---|---|
| **WorkflowCapability** | A reusable named verb with declared inputs, outputs, verification command, and executor agent | [schemas/workflow-capability.schema.json](schemas/workflow-capability.schema.json) |
| **WorkflowPlaybook** | A DAG of capability invocations against a target inventory, with retry / depends_on / gates | [schemas/workflow-playbook.schema.json](schemas/workflow-playbook.schema.json) |
| **WorkflowInventory** | Declarative target set (hosts, providers, environments, anything addressable) | [schemas/workflow-inventory.schema.json](schemas/workflow-inventory.schema.json) |
| **WorkflowTarget** | A single addressable resource referenced from inventory | [schemas/workflow-target.schema.json](schemas/workflow-target.schema.json) |
| **WorkflowGate** | A pause point for human-in-the-loop authorization or judgment | [schemas/workflow-gate.schema.json](schemas/workflow-gate.schema.json) |
| **WorkflowRole** | A bundle of capabilities scoped to a role identity for permission boundaries | [schemas/workflow-role.schema.json](schemas/workflow-role.schema.json) |
| **WorkflowExtension** | A domain-specific extension declaring its own apiVersion namespace, kinds, and capability bundle | [schemas/workflow-extension.schema.json](schemas/workflow-extension.schema.json) |

## Authoring model

Three layers from most reusable to most specific:

```
[ core metalanguage ]   apiVersion: workflow.aiwg.io/v1     ← lives in aiwg-utils (this spec)
        ↑
[ domain extension ]    apiVersion: <domain>.workflow.aiwg.io/v1   ← e.g. ops, validation, research
        ↑
[ user instance  ]      a specific Capability or Playbook in a project    ← lives in .aiwg/workflow/
```

The core metalanguage defines the *shape* of capabilities, playbooks, inventories, etc. A domain extension declares its own `apiVersion` namespace and contributes its own capability library. A user instance is a single capability or playbook file in a project's `.aiwg/workflow/` directory.

## Where files live

| Layer | Location |
|---|---|
| Core schemas (this addon) | `agentic/code/addons/aiwg-utils/workflow/schemas/` |
| Core docs | `agentic/code/addons/aiwg-utils/workflow/docs/` |
| Domain extension (e.g. `ops`) | `agentic/code/frameworks/ops-complete/capabilities/` |
| Domain extension (e.g. `validation`) | `agentic/code/frameworks/validation-complete/capabilities/` |
| User instance (per project) | `.aiwg/workflow/capabilities/` and `.aiwg/workflow/playbooks/` |

## Executor contract

A single agent satisfies the executor contract for every workflow kind, regardless of domain. Today that agent is `ops-runbook-executor` (under ops-complete) — it will be renamed/lifted to `workflow-executor` as part of the lift (see migration plan).

The contract:

1. **Resolve**: load the playbook, resolve every `capability:` reference, validate each capability against its schema.
2. **Plan**: build the step DAG from `depends_on` edges; reject cycles.
3. **Bind**: bind playbook `vars` and per-step `inputs` into capability inputs; resolve `from: <step-id>.<output>` references after step completion.
4. **Execute**: for each ready step, dispatch to the capability's `agent`. Capture stdout/stderr/exit-status. If `verification.command` is present, run it and compare against `verification.expect`.
5. **Gate**: when a `kind: gate` step is reached, pause; surface the gate's `description` and `inputs` to the human; resume when the gate is acknowledged.
6. **Retry**: respect each step's `retry.limit` and `retry.on` policy.
7. **Audit**: append every step outcome (start, end, verification result, outputs, gate decisions) to `.aiwg/workflow/runs/<run-id>/audit.jsonl`.
8. **Report**: at playbook completion, emit a structured report to `.aiwg/workflow/runs/<run-id>/report.md`.

The executor MUST NOT mutate the playbook or its capabilities. It MUST honor `idempotent: true` (re-runs against the same target produce the same outcome). It MUST refuse to execute capabilities whose `target_requirements` are unmet (missing OS, missing binary, missing access).

## Apiversion aliasing

For backward compatibility, the executor accepts the following apiVersion equivalences:

| Legacy | Resolves to |
|---|---|
| `ops.aiwg.io/v1` | `workflow.aiwg.io/v1` |
| `sys.ops.aiwg.io/v1` | `sys.workflow.aiwg.io/v1` |
| `it.ops.aiwg.io/v1` | `it.workflow.aiwg.io/v1` |
| `dev.ops.aiwg.io/v1` | `dev.workflow.aiwg.io/v1` |
| `stream.ops.aiwg.io/v1` | `stream.workflow.aiwg.io/v1` |

Equivalence is bidirectional for the v1 line. The aliasing layer is removed when `ops` and its extensions are migrated to native `workflow.*` apiVersions (target: release after the lift ships).

## Why this lives in aiwg-utils

- **Universal**: every AIWG install carries `aiwg-utils`; the workflow metalanguage is available without installing a domain framework first.
- **No domain bias**: the schemas describe shape only — they say nothing about hosts, services, certs, or providers. Domain semantics live in domain extensions.
- **One executor, many domains**: ops, validation, and any future domain share the same DAG runner, the same audit format, the same gate semantics.

## What's NOT in scope

- The executor implementation. The agent that runs playbooks lives outside the spec (currently `ops-runbook-executor`, lifted later).
- Domain-specific capability libraries. Each domain authors its own. This addon ships zero capabilities — only the spec.
- Per-language SDKs / bindings. The spec is the authoritative contract; bindings can be written but aren't required.

## See also

- `docs/overview.md` — narrative tour of the metalanguage with worked examples
- `docs/migration-from-ops.md` — how existing `ops.aiwg.io/v1` documents migrate
- `examples/` — minimal authored examples for each kind
- ops-complete (`agentic/code/frameworks/ops-complete/`) — the first domain consumer; will be migrated to native `workflow.*` apiVersion in a follow-up
