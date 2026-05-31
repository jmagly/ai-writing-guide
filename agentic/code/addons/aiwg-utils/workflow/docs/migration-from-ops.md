# Migration: `ops.aiwg.io/v1` → `workflow.aiwg.io/v1`

The workflow metalanguage (this addon) is the lifted form of what shipped originally as `ops.aiwg.io/v1` under `ops-complete`. Existing playbooks and capabilities continue to work via apiVersion aliasing. This doc describes the migration path for consumers who want to author against the new namespace directly.

## What changed

| Aspect | Before | After |
|---|---|---|
| Where the spec lives | `agentic/code/frameworks/ops-complete/schemas/metalanguage/` | `agentic/code/addons/aiwg-utils/workflow/schemas/` |
| Schema names | `ops-capability.schema.json`, etc. | `workflow-capability.schema.json`, etc. |
| `apiVersion` | `ops.aiwg.io/v1` (and `<ext>.ops.aiwg.io/v1` for extensions) | `workflow.aiwg.io/v1` (and `<ext>.workflow.aiwg.io/v1`) |
| `kind` | `OpsCapability`, `OpsPlaybook`, … | `WorkflowCapability`, `WorkflowPlaybook`, … |
| Schema `$id` URL | `https://aiwg.io/schemas/ops/v1/ops-X.schema.json` | `https://aiwg.io/schemas/workflow/v1/workflow-X.schema.json` |
| Executor agent | `ops-runbook-executor` | `workflow-executor` (alias of the same agent during the migration window) |
| Carrying addon | `ops-complete` (heavyweight) | `aiwg-utils` (universal core) |

What did NOT change:

- Field names within each kind's `spec` block (same `inputs`, `outputs`, `verification`, `target_requirements`, `depends_on`, `gate.description`, …).
- Capability semantics. A `verify-tls-expiry` capability authored against the ops apiVersion behaves identically when migrated.
- Inventory/target structure.
- Audit trail format.

The lift is a rename pass and a relocation. No field-level semantics change.

## Apiversion aliasing (transitional)

While both apiVersions exist, the executor accepts these equivalences for the v1 line:

| Legacy apiVersion | Resolves to |
|---|---|
| `ops.aiwg.io/v1` | `workflow.aiwg.io/v1` |
| `sys.ops.aiwg.io/v1` | `sys.workflow.aiwg.io/v1` |
| `it.ops.aiwg.io/v1` | `it.workflow.aiwg.io/v1` |
| `dev.ops.aiwg.io/v1` | `dev.workflow.aiwg.io/v1` |
| `stream.ops.aiwg.io/v1` | `stream.workflow.aiwg.io/v1` |

A document carrying the legacy apiVersion validates against the legacy schema and is normalized to the workflow apiVersion before execution. Outputs and audit-trail entries carry the workflow apiVersion regardless of input.

The legacy schemas continue to live under `ops-complete` for the v1 line's lifetime. When the v2 line ships, only `workflow.aiwg.io/v2` exists and `ops.aiwg.io/v1` documents will need explicit migration to v2.

## Migrating an existing capability

Mechanical rewrite:

```diff
- apiVersion: ops.aiwg.io/v1
- kind: OpsCapability
+ apiVersion: workflow.aiwg.io/v1
+ kind: WorkflowCapability
  metadata:
    name: check-tls-expiry
    labels:
      category: pki
  spec:
    description: Check a TLS certificate's expiry date
    version: "1.0.0"
    inputs:
      - name: hostname
        type: string
        required: true
    # ... rest unchanged
    agent: cert-lifecycle-monitor
    idempotent: true
    verification:
      command: "openssl s_client -connect {{ hostname }}:443 </dev/null | openssl x509 -noout -dates"
      expect: "notAfter="
```

Two lines change. The rest of the document is untouched.

If the capability lives inside a domain extension (`<ext>.ops.aiwg.io/v1`), the migration is:

```diff
- apiVersion: sys.ops.aiwg.io/v1
- kind: OpsCapability
+ apiVersion: sys.workflow.aiwg.io/v1
+ kind: WorkflowCapability
```

## Migrating an existing playbook

Same shape — change the apiVersion line and the kind line. Step references to capabilities continue to resolve by name; the executor looks across all registered extension namespaces.

```diff
- apiVersion: ops.aiwg.io/v1
- kind: OpsPlaybook
+ apiVersion: workflow.aiwg.io/v1
+ kind: WorkflowPlaybook
  metadata:
    name: rotate-tls-cert
  spec:
    inventory: production-web-tier
    targets:
      groups: [edge]
    steps:
      - id: pre-check
        capability: check-tls-expiry           # still resolves by capability name
        # ... rest unchanged
```

## Migrating an inventory / target / gate / role / extension

Pattern repeats — change apiVersion and kind, nothing else.

| Legacy kind | New kind |
|---|---|
| `OpsCapability` | `WorkflowCapability` |
| `OpsPlaybook` | `WorkflowPlaybook` |
| `OpsInventory` | `WorkflowInventory` |
| `OpsTarget` | `WorkflowTarget` |
| `OpsGate` | `WorkflowGate` |
| `OpsRole` | `WorkflowRole` |
| `OpsExtension` | `WorkflowExtension` |

## When to migrate

- **New work**: author against `workflow.aiwg.io/v1` directly. No reason to use the legacy apiVersion for new capabilities or playbooks.
- **Existing ops-complete capabilities**: stay on `ops.aiwg.io/v1` until the next routine touch (capability update, schema change, new extension version). Aliasing means there's no urgency.
- **`ops-complete` itself**: a single coordinated migration PR renames the apiVersion across all capabilities/playbooks and updates `manifest.json`. Plan to do this once ahead of the v2 schema work, not piecemeal.

## Validation

To validate a migrated document against the new schemas:

```bash
# Using ajv or any JSON Schema validator
ajv validate \
  -s agentic/code/addons/aiwg-utils/workflow/schemas/workflow-capability.schema.json \
  -d path/to/your-capability.yaml
```

`aiwg validate-metadata` includes the workflow schemas in its corpus and will flag capability/playbook documents that fail validation.

## Tracking

- Spec lift (this work): authored under `agentic/code/addons/aiwg-utils/workflow/`. Schemas, README, overview, this doc.
- Executor alias (`workflow-executor` → `ops-runbook-executor`): follow-up.
- `ops-complete` migration to native `workflow.*` apiVersion: follow-up after the executor alias lands.
- `sdlc-complete/flows/` consolidation onto the workflow metalanguage: follow-up; not part of the initial lift.

Track via the planning issue (see release-validation epic comments).
