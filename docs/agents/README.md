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

Immutable signed release manifest:
`https://releases.aiwg.io/resources/<version>/manifest.json`

Immutable reference bundle:
`https://releases.aiwg.io/resources/<version>/bundles/reference.tar.zst`

The corpus is stored at `docs/agents/` and `docs/cli/` inside that bundle. The
manifest records the bundle filename, byte size, SHA-256 digest, and the `docs`
source path.
Agents must verify the signed manifest and bundle digest before using the
contents; they must not construct an unsigned per-file URL.

The signed `stable` channel resolves `<version>`. Agents should resolve the
channel through AIWG's resource client rather than constructing a “latest” URL:

```bash
aiwg versions show stable
```

The release pipeline's `reference` bundle includes the complete `docs/` tree,
so these paths are byte-identical to the installed npm package. A newly merged
reference becomes available on the release host when its signed AIWG version
is published; a mutable branch URL is not a release artifact.

Agents should use `aiwg discover "<need>"` to select a capability and `aiwg
show <type> <name>` to retrieve executable artifact guidance. Use this corpus
when the task needs CLI flags, structured output, automation, diagnostics, or
recovery details that do not belong in the conversational user journey.

## Index

| Stable ID | Document | Purpose |
|---|---|---|
| `aiwg.agent-reference.cli` | [CLI reference](../cli/reference.md) | Commands, flags, and examples |
| `aiwg.agent-reference.cli-usage` | [CLI usage guide](../cli/agent-usage.md) | Operational workflows and command sequencing |
| `aiwg.agent-reference.discovery` | [Discovery and retrieval](../cli/discovery-and-retrieval.md) | Deterministic capability search and asset-loading contract |
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
