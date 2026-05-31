# Workflow Metalanguage Overview

A narrative tour of `apiVersion: workflow.aiwg.io/v1`. For the spec contract see the parent `README.md`.

## Motivation

AIWG accumulates declarative work all over its surface — operational runbooks under `ops-complete`, SDLC phase flows under `sdlc-complete/flows/`, agentic UAT validation across providers, content production pipelines. Without a shared spec, each domain reinvents the same primitives: a unit of work with inputs/outputs, a DAG composer, a way to declare targets, a human-gate, an audit trail.

The workflow metalanguage is the shared spec. One YAML grammar, one executor contract, one audit format. Every domain authors its own *capabilities*; the *executor* is universal.

## The 7 kinds, in plain terms

### WorkflowCapability — a reusable verb

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowCapability
metadata:
  name: check-tls-expiry
  labels:
    category: pki
spec:
  description: Check a TLS certificate's expiry and chain validity
  version: "1.0.0"
  inputs:
    - { name: hostname, type: string, required: true }
    - { name: port, type: integer, required: false, default: 443 }
  outputs:
    - { name: days_remaining, type: integer }
    - { name: chain_valid, type: boolean }
  agent: tls-monitor                # which agent executes this
  idempotent: true
  verification:
    command: "openssl s_client -connect {{ hostname }}:{{ port }} </dev/null | openssl x509 -noout -dates"
    expect: "notAfter="
```

A capability is the smallest authored unit. It declares its inputs, outputs, the executor agent, and (optionally) a verification command that proves the work landed.

### WorkflowPlaybook — a DAG of capability invocations

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowPlaybook
metadata:
  name: rotate-tls-cert
spec:
  inventory: production-web-tier
  targets: { groups: [edge] }
  steps:
    - id: pre-check
      capability: check-tls-expiry
      inputs:
        - { name: hostname, value: "{{ target.fqdn }}" }
    - id: issue
      capability: issue-new-cert
      depends_on: [pre-check]
      inputs:
        - { name: hostname, value: "{{ target.fqdn }}" }
      outputs: [{ name: cert_path }]
    - id: deploy
      capability: deploy-cert
      depends_on: [issue]
      inputs:
        - { name: cert_path, from: issue.cert_path }
    - id: approve-restart
      kind: gate
      description: TLS cert deployed. Restart nginx now?
      depends_on: [deploy]
    - id: restart
      capability: restart-nginx
      depends_on: [approve-restart]
    - id: post-check
      capability: check-tls-expiry
      depends_on: [restart]
```

A playbook composes capabilities into a DAG. Each step either invokes a capability or is a `kind: gate` (human-in-the-loop). `depends_on` is the only ordering primitive — there's no implicit sequence. Outputs from one step flow into inputs of downstream steps via `from: <step-id>.<output-name>`.

### WorkflowInventory — what we're operating against

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowInventory
metadata:
  name: production-web-tier
spec:
  groups:
    edge: { hosts: [edge-01, edge-02, edge-03] }
    origin: { hosts: [origin-01, origin-02] }
  hosts:
    edge-01: { fqdn: edge-01.prod.example.com, role: cdn }
    edge-02: { fqdn: edge-02.prod.example.com, role: cdn }
    edge-03: { fqdn: edge-03.prod.example.com, role: cdn }
```

Inventory declares the targets a playbook can address. For ops the targets are hosts; for release validation they're providers; for content production they could be channels. The shape is domain-agnostic.

### WorkflowTarget — one addressable resource

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowTarget
metadata:
  name: edge-01
spec:
  fqdn: edge-01.prod.example.com
  os: { distribution: ubuntu, version: "24.04" }
  capabilities: [openssl, nginx, systemctl]
```

A target is rarely authored standalone — it's usually inlined in an inventory. The standalone kind exists for cases where a target is shared across multiple inventories or carries enough metadata to deserve its own file.

### WorkflowGate — pause for a human decision

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowGate
metadata:
  name: production-deploy-approval
spec:
  description: Confirm production deploy of {{ artifact_name }} at {{ artifact_version }}
  prompt: "Type CONFIRM to proceed, ABORT to cancel"
  required_role: release-manager
  audit:
    capture_response: true
    require_reason_on_abort: true
```

A gate is a first-class pause. It's the right primitive when the next step requires human authorization, judgment, or external coordination. Inline gates (`kind: gate` directly in a playbook step) are the common case; standalone `WorkflowGate` files exist when a gate is reused across playbooks.

### WorkflowRole — capability-scoped identity

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowRole
metadata:
  name: release-manager
spec:
  description: Cuts and publishes stable releases
  allows:
    capabilities:
      - cut-tag
      - publish-npm
      - publish-github-release
    gates:
      - production-deploy-approval
  denies:
    capabilities:
      - rollback-published-release      # explicitly off-limits
```

Roles scope which capabilities and gates an identity may use. The executor enforces this — if a role-bound run attempts an out-of-allows capability, it fails.

### WorkflowExtension — domain-specific apiVersion namespace

```yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowExtension
metadata:
  name: ops
spec:
  apiVersion: ops.workflow.aiwg.io/v1
  description: Operational automation (hosts, services, infrastructure)
  contributes:
    capabilities: agentic/code/frameworks/ops-complete/capabilities/
    playbooks: agentic/code/frameworks/ops-complete/playbooks/
    additional_kinds:
      - HostProfile          # sys extension's per-host record
      - DisasterRecoveryRunbook   # it extension's DR doc
```

An extension declares "I contribute capabilities to the workflow ecosystem under my own apiVersion namespace." Domain frameworks (ops, validation, eventually research) author one of these to register.

## How a domain extension authors capabilities

1. Declare the extension's apiVersion namespace: `<domain>.workflow.aiwg.io/v1`.
2. Author capabilities in `<framework>/capabilities/`. Each capability uses the domain apiVersion in its file, e.g. `apiVersion: validation.workflow.aiwg.io/v1`.
3. Author playbooks in `<framework>/playbooks/`. Playbooks reference capabilities by name; the executor resolves which extension's library to look in.
4. Optionally author `<framework>/inventories/` for domain-typical target sets.
5. Register the extension with a `WorkflowExtension` document (one per domain).

Capabilities and playbooks within a domain use the domain's apiVersion. Core kinds (Capability, Playbook, etc.) keep the `workflow.aiwg.io/v1` apiVersion at the metadata level — the `kind: WorkflowCapability` is shared, the *apiVersion namespace* is the domain's.

## A worked example: release validation extension

The agentic live-verification UAT (see issue #1529) authors a domain extension:

```yaml
# agentic/code/frameworks/validation-complete/extension.yaml
apiVersion: workflow.aiwg.io/v1
kind: WorkflowExtension
metadata:
  name: validation
spec:
  apiVersion: validation.workflow.aiwg.io/v1
  description: Live-verification UAT across supported agentic stacks
  contributes:
    capabilities: agentic/code/frameworks/validation-complete/capabilities/
    playbooks: agentic/code/frameworks/validation-complete/playbooks/
    inventories: agentic/code/frameworks/validation-complete/inventories/
```

Inside that framework:

```yaml
# capabilities/verify-claude-cjs-hooks.yaml
apiVersion: validation.workflow.aiwg.io/v1
kind: WorkflowCapability
metadata:
  name: verify-claude-cjs-hooks
spec:
  description: Verify .claude/settings.json hooks reference .cjs scripts
  inputs:
    - { name: project_path, type: path, required: true }
  outputs:
    - { name: ends_with_cjs, type: boolean }
  agent: workflow-executor
  idempotent: true
  verification:
    command: 'jq -r ".hooks.SessionStart[0].hooks[0].command" {{ project_path }}/.claude/settings.json'
    expect: '\.cjs$'
```

```yaml
# playbooks/validate-claude-code.yaml
apiVersion: validation.workflow.aiwg.io/v1
kind: WorkflowPlaybook
metadata:
  name: validate-claude-code
spec:
  inventory: validation-providers
  targets: { hosts: [claude-code] }
  steps:
    - id: pre-flight
      capability: aiwg-version-check
    - id: deploy
      capability: aiwg-use-deploy
      depends_on: [pre-flight]
    - id: cjs-hooks
      capability: verify-claude-cjs-hooks
      depends_on: [deploy]
    - id: open-session-discovery
      kind: gate
      description: |
        Open Claude Code in the deployed project. Type the verbatim prompt
        "Find an AIWG skill that handles intake forms" and capture verdict.
      depends_on: [deploy]
```

The shell-verifiable steps (`pre-flight`, `deploy`, `cjs-hooks`) run automatically; the session-interaction step is a gate. One executor handles both modes.

## Runtime artifact: a run directory

When the executor runs a playbook, it writes:

```
.aiwg/workflow/runs/<run-id>/
├── playbook.yaml                 # frozen copy of the playbook as executed
├── inventory.yaml                # frozen copy of inventory
├── audit.jsonl                   # one line per step start/end/verification/gate
├── outputs.json                  # captured outputs from each step
├── gates/
│   ├── open-session-discovery.response.md   # human verdict for each gate
│   └── ...
└── report.md                     # human-readable summary at completion
```

The run-id is deterministic from the playbook + inventory + targets hash + timestamp, so re-running a playbook against the same target set produces a deterministic per-run audit trail.

## Where to go next

- Migrate an existing `ops.aiwg.io/v1` capability → see `docs/migration-from-ops.md`.
- Author a new domain extension → start with the `WorkflowExtension` example above; pick a domain apiVersion namespace; add capabilities one at a time.
- Browse real capabilities → `agentic/code/frameworks/ops-complete/capabilities/` is the most mature library; it migrates to native `workflow.*` apiVersion in a follow-up but is structurally identical today.
