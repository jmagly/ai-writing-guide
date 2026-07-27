---
audience: agent-operator
publication: agent-reference
stable_id: aiwg.agent-reference.index
---

# AIWG Agent and Operator Reference

This corpus is the deterministic execution reference for agents and advanced
operators. It is shipped in AIWG release artifacts and published through the
release corpus, but it is intentionally excluded from the end-user site at
`docs.aiwg.io`.

## Retrieval contract

Stable source root: `docs/agents/`

Installed package root: `$AIWG_ROOT/docs/agents/`

Immutable release path:
`https://releases.aiwg.io/resources/<version>/raw/docs/agents/`

The signed `stable` channel resolves `<version>`. Agents should resolve the
channel through AIWG's resource client rather than constructing a “latest” URL:

```bash
aiwg versions show stable
```

The release pipeline's `reference` bundle includes the complete `docs/` tree,
so these paths are byte-identical to the installed npm package.

Agents should use `aiwg discover "<need>"` to select a capability and `aiwg
show <type> <name>` to retrieve executable artifact guidance. Use this corpus
when the task needs CLI flags, structured output, automation, diagnostics, or
recovery details that do not belong in the conversational user journey.

## Index

| Stable ID | Document | Purpose |
|---|---|---|
| `aiwg.agent-reference.cli` | [CLI reference](cli-reference.md) | Commands, flags, and examples |
| `aiwg.agent-reference.cli-usage` | [CLI usage guide](CLI_USAGE.md) | Operational workflows and command sequencing |
| `aiwg.agent-reference.discovery` | [Discovery and retrieval](discovery-and-retrieval.md) | Deterministic `discover`/`show` contract |
| `aiwg.agent-reference.onboarding` | [Agent-run onboarding](onboarding.md) | Setup, verification, recovery, and reporting |
| `aiwg.agent-reference.node-installation` | [Node toolchain installation](node-toolchain-installation.md) | Safe OS-specific Node/npm preflight and setup |
| `aiwg.agent-reference.provider.*` | [Provider operational references](providers/README.md) | Provider-specific deployment, configuration, diagnostics, and recovery |

## Authoring contract

Every document in this directory must declare:

- `audience: agent-operator`
- `publication: agent-reference`
- a unique, durable `stable_id`

Write preconditions, exact commands and flags, observable outputs, failure
handling, and structured examples. Do not assume the end user will type these
commands.
